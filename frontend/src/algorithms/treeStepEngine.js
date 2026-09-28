/**
 * frontend/src/algorithms/treeStepEngine.js
 *
 * A real Binary Search Tree: nodes have actual left/right children and every
 * operation walks the actual tree, recursively/iteratively comparing against
 * node.value - this replaces the old "Tree" visualizer, which just kept a sorted
 * flat array and rendered it as a grid (no parent/child structure existed at all).
 *
 * Each operation returns { root, steps }. Every step is a full tree snapshot plus
 * which node is currently being compared, so the debugger can scrub through real
 * algorithm behavior one comparison at a time - same pattern as graphStepEngine.js.
 *
 * A "step" looks like:
 * {
 *   tree: Node | null,       // full snapshot of the tree at this instant
 *   activeId: number|null,   // node currently being compared/visited
 *   visitedIds: number[],    // for traversals: nodes visited so far, in order
 *   message: string,
 * }
 */

let uid = 1;
export function makeNode(value) {
  return { id: uid++, value, left: null, right: null };
}

function cloneTree(node) {
  if (!node) return null;
  return { id: node.id, value: node.value, left: cloneTree(node.left), right: cloneTree(node.right) };
}

export function treeToValues(root) {
  const values = [];
  const walk = (node) => {
    if (!node) return;
    walk(node.left);
    values.push(node.value);
    walk(node.right);
  };
  walk(root);
  return values;
}

export function buildTreeFromValues(values) {
  let root = null;
  values.forEach((v) => {
    const { root: next } = insertSteps(root, v);
    root = next;
  });
  return root;
}

export function insertSteps(root, value) {
  const steps = [];
  const workingRoot = cloneTree(root);

  if (!workingRoot) {
    const created = makeNode(value);
    steps.push({ tree: cloneTree(created), activeId: created.id, visitedIds: [], message: `Tree was empty. ${value} becomes the root.` });
    return { root: created, steps };
  }

  steps.push({ tree: cloneTree(workingRoot), activeId: workingRoot.id, visitedIds: [], message: `Starting at root (${workingRoot.value}). Comparing ${value}.` });

  let node = workingRoot;
  while (true) {
    if (value === node.value) {
      steps.push({ tree: cloneTree(workingRoot), activeId: node.id, visitedIds: [], message: `${value} already exists at this node. BSTs don't store duplicates - insert skipped.` });
      return { root: workingRoot, steps };
    }

    if (value < node.value) {
      if (!node.left) {
        const created = makeNode(value);
        node.left = created;
        steps.push({ tree: cloneTree(workingRoot), activeId: created.id, visitedIds: [], message: `${value} < ${node.value}, and there's no left child - inserted ${value} as the left child of ${node.value}.` });
        return { root: workingRoot, steps };
      }
      steps.push({ tree: cloneTree(workingRoot), activeId: node.left.id, visitedIds: [], message: `${value} < ${node.value} - moving to left child (${node.left.value}).` });
      node = node.left;
    } else {
      if (!node.right) {
        const created = makeNode(value);
        node.right = created;
        steps.push({ tree: cloneTree(workingRoot), activeId: created.id, visitedIds: [], message: `${value} > ${node.value}, and there's no right child - inserted ${value} as the right child of ${node.value}.` });
        return { root: workingRoot, steps };
      }
      steps.push({ tree: cloneTree(workingRoot), activeId: node.right.id, visitedIds: [], message: `${value} > ${node.value} - moving to right child (${node.right.value}).` });
      node = node.right;
    }
  }
}

export function searchSteps(root, value) {
  const steps = [];
  let node = root;

  if (!node) {
    steps.push({ tree: null, activeId: null, visitedIds: [], message: `Tree is empty. ${value} not found.` });
    return { found: false, steps };
  }

  while (node) {
    steps.push({ tree: cloneTree(root), activeId: node.id, visitedIds: [], message: `Comparing ${value} with node ${node.value}.` });

    if (value === node.value) {
      steps.push({ tree: cloneTree(root), activeId: node.id, visitedIds: [], message: `Found ${value}.` });
      return { found: true, steps };
    }

    if (value < node.value) {
      if (!node.left) {
        steps.push({ tree: cloneTree(root), activeId: node.id, visitedIds: [], message: `${value} < ${node.value} and there's no left child - ${value} is not in the tree.` });
        return { found: false, steps };
      }
      node = node.left;
    } else {
      if (!node.right) {
        steps.push({ tree: cloneTree(root), activeId: node.id, visitedIds: [], message: `${value} > ${node.value} and there's no right child - ${value} is not in the tree.` });
        return { found: false, steps };
      }
      node = node.right;
    }
  }

  steps.push({ tree: cloneTree(root), activeId: null, visitedIds: [], message: `${value} not found.` });
  return { found: false, steps };
}

// Standard BST delete: leaf -> just remove; one child -> splice child up;
// two children -> replace value with the inorder successor (smallest node in the
// right subtree), then delete that successor node from the right subtree.
export function deleteSteps(root, value) {
  const steps = [];
  const workingRoot = cloneTree(root);

  const findMin = (node) => {
    let cur = node;
    while (cur.left) cur = cur.left;
    return cur;
  };

  // Deletes by identity: first walks down comparing against `value`, and once
  // the target node is found in the two-children case, re-invokes itself with
  // the successor's own value so the successor (not the original node) is what
  // actually gets unlinked from the tree.
  function removeEntry(node, parent, isLeft, targetValue) {
    if (!node) {
      steps.push({ tree: cloneTree(workingRoot), activeId: null, visitedIds: [], message: `${targetValue} not found in the tree - nothing to delete.` });
      return workingRoot;
    }
    if (targetValue < node.value) return removeEntry(node.left, node, true, targetValue);
    if (targetValue > node.value) return removeEntry(node.right, node, false, targetValue);

    if (!node.left && !node.right) {
      if (parent) parent[isLeft ? "left" : "right"] = null;
      else return null;
    } else if (!node.left || !node.right) {
      const child = node.left || node.right;
      if (parent) parent[isLeft ? "left" : "right"] = child;
      else return child;
    } else {
      const successor = findMin(node.right);
      steps.push({ tree: cloneTree(workingRoot), activeId: successor.id, visitedIds: [], message: `${targetValue} has two children - copying inorder successor ${successor.value} up, then deleting the successor node.` });
      node.value = successor.value;
      removeEntry(node.right, node, false, successor.value);
    }
    return workingRoot;
  }

  if (!workingRoot) {
    steps.push({ tree: null, activeId: null, visitedIds: [], message: `Tree is empty. Nothing to delete.` });
    return { root: null, steps };
  }

  const finalRoot = removeEntry(workingRoot, null, false, value);
  steps.push({ tree: cloneTree(finalRoot), activeId: null, visitedIds: [], message: `Delete complete.` });
  return { root: finalRoot, steps };
}

export function traverseSteps(root, type) {
  const steps = [];
  const visited = [];
  const order = [];

  function inorder(node) { if (!node) return; inorder(node.left); order.push(node); inorder(node.right); }
  function preorder(node) { if (!node) return; order.push(node); preorder(node.left); preorder(node.right); }
  function postorder(node) { if (!node) return; postorder(node.left); postorder(node.right); order.push(node); }
  function levelorder(node) {
    if (!node) return;
    // Head-index queue instead of Array.shift() (O(n) per call).
    const queue = [node];
    let head = 0;
    while (head < queue.length) {
      const n = queue[head];
      head += 1;
      order.push(n);
      if (n.left) queue.push(n.left);
      if (n.right) queue.push(n.right);
    }
  }

  if (!root) {
    steps.push({ tree: null, activeId: null, visitedIds: [], message: `Tree is empty - nothing to traverse.` });
    return steps;
  }

  if (type === "inorder") inorder(root);
  else if (type === "preorder") preorder(root);
  else if (type === "postorder") postorder(root);
  else levelorder(root);

  // Track "order so far" as a values array built up alongside `visited`, instead
  // of re-filtering the full `order` list with an .includes() check on every
  // single step (that was O(n) work per step, O(n^2) for the whole traversal).
  const visitedValues = [];
  order.forEach((node) => {
    visited.push(node.id);
    visitedValues.push(node.value);
    steps.push({
      tree: cloneTree(root),
      activeId: node.id,
      visitedIds: [...visited],
      message: `${type.toUpperCase()} visit: ${node.value} (order so far: ${visitedValues.join(", ")})`,
    });
  });

  return steps;
}

// Positions every node for SVG rendering: x from inorder rank (spreads leaves out
// evenly left-to-right, matching BST ordering), y from depth.
export function treeLayout(root, width = 640, levelHeight = 90) {
  if (!root) return { nodes: [], edges: [], height: 160 };

  const inorderNodes = [];
  let maxDepth = 0;
  const walk = (node, depth) => {
    if (!node) return;
    walk(node.left, depth + 1);
    inorderNodes.push({ node, depth });
    maxDepth = Math.max(maxDepth, depth);
    walk(node.right, depth + 1);
  };
  walk(root, 0);

  const count = inorderNodes.length;
  const spacing = count > 1 ? width / (count + 1) : width / 2;
  const positions = new Map();
  inorderNodes.forEach(({ node, depth }, i) => {
    positions.set(node.id, { x: spacing * (i + 1), y: 50 + depth * levelHeight, value: node.value, id: node.id });
  });

  const edges = [];
  const collectEdges = (node) => {
    if (!node) return;
    if (node.left) {
      edges.push({ from: positions.get(node.id), to: positions.get(node.left.id) });
      collectEdges(node.left);
    }
    if (node.right) {
      edges.push({ from: positions.get(node.id), to: positions.get(node.right.id) });
      collectEdges(node.right);
    }
  };
  collectEdges(root);

  return {
    nodes: Array.from(positions.values()),
    edges,
    height: 50 + (maxDepth + 1) * levelHeight,
  };
}
