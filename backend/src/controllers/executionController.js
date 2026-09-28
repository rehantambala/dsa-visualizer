// backend/src/controllers/executionController.js
//
// SECURITY NOTE (read this before adding a new data structure or "loosening" this file):
// This used to run submitted code through Node's `vm` module and call it a sandbox.
// It wasn't one. Node's own docs are explicit: "The vm module is not a security
// mechanism. Do not use it to execute untrusted code." Any host object/function handed
// into a vm context (like the old `console.log`) can be used to walk back up the
// prototype chain to the real `process`/`require` and run arbitrary code on the server.
//
// Since the only thing this endpoint actually needs to support is a handful of fixed
// method calls (append/prepend/delete on a mock LinkedList), we don't execute JavaScript
// at all anymore. We parse the submitted text against a strict, known grammar and turn
// it directly into operations. There is no eval, no vm, no code execution path here -
// invalid input just gets rejected with a syntax error.

const MAX_CODE_LENGTH = 2000;
const MAX_STATEMENTS = 200;

// dataStructure -> { initPattern, methods: { methodName: OPERATION_TYPE } }
const SUPPORTED_STRUCTURES = {
  LinkedList: {
    initPattern: /^(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*new\s+LinkedList\s*\(\s*\)$/,
    methods: {
      append: "APPEND",
      prepend: "PREPEND",
      delete: "DELETE",
    },
  },
};

const CALL_PATTERN =
  /^([a-zA-Z_$][\w$]*)\.([a-zA-Z_$][\w$]*)\s*\(\s*(-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')?\s*\)$/;

function parseValue(raw) {
  if (raw === undefined) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return raw.slice(1, -1); // strip quotes from a string literal
}

function stripComments(line) {
  const idx = line.indexOf("//");
  return idx === -1 ? line : line.slice(0, idx);
}

// @desc    Turn a small, fixed-grammar snippet into visualizer operations.
//          No code is executed - this is a parser, not an interpreter.
// @route   POST /api/execute
exports.runCode = async (req, res, next) => {
  try {
    const { code, dataStructure } = req.body;

    if (typeof code !== "string" || code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "No code provided",
        details: "Submit a snippet to execute.",
      });
    }

    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Code too long",
        details: `Submitted code must be under ${MAX_CODE_LENGTH} characters.`,
      });
    }

    const structure = SUPPORTED_STRUCTURES[dataStructure];
    if (!structure) {
      return res.status(400).json({
        success: false,
        message: "Unsupported data structure",
        details: `Execution is not configured for ${dataStructure || "this request"}.`,
      });
    }

    const statements = code
      .split(/;|\r?\n/)
      .map(stripComments)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (statements.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No statements found",
        details: "Submit at least one statement.",
      });
    }

    if (statements.length > MAX_STATEMENTS) {
      return res.status(400).json({
        success: false,
        message: "Too many statements",
        details: `Submit at most ${MAX_STATEMENTS} statements.`,
      });
    }

    const initMatch = statements[0].match(structure.initPattern);
    if (!initMatch) {
      return res.status(400).json({
        success: false,
        message: "Syntax error",
        details: `First statement must create the structure, e.g. "const list = new ${dataStructure}();".`,
      });
    }

    const varName = initMatch[1];
    const operations = [{ type: "INIT", value: null }];

    for (let i = 1; i < statements.length; i += 1) {
      const statement = statements[i];
      const callMatch = statement.match(CALL_PATTERN);

      if (!callMatch) {
        return res.status(400).json({
          success: false,
          message: "Syntax error",
          details: `Could not parse statement: "${statement}".`,
        });
      }

      const [, calledOn, methodName, rawValue] = callMatch;

      if (calledOn !== varName) {
        return res.status(400).json({
          success: false,
          message: "Unknown variable",
          details: `"${calledOn}" was never created. Did you mean "${varName}"?`,
        });
      }

      const opType = structure.methods[methodName];
      if (!opType) {
        return res.status(400).json({
          success: false,
          message: "Unknown method",
          details: `"${methodName}" is not supported on ${dataStructure}. Supported: ${Object.keys(
            structure.methods
          ).join(", ")}.`,
        });
      }

      operations.push({ type: opType, value: parseValue(rawValue) });
    }

    res.status(200).json({
      success: true,
      operations,
    });
  } catch (error) {
    console.error("Execution Parse Error:", error.message);
    res.status(400).json({
      success: false,
      message: "Syntax or Execution Error",
      details: error.message,
    });
  }
};
