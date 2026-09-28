const express = require("express");
const router = express.Router();
const { runCode } = require("../controllers/executionController");

router.post("/", runCode);

module.exports = router;
