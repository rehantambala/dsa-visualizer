import { describe, it, expect } from 'vitest';
import { insertSteps, deleteSteps, searchSteps, traverseSteps, treeToValues, treeLayout } from './treeStepEngine.js';

function buildTree(values) {
  let root = null;
  values.forEach((v) => {
    root = insertSteps(root, v).root;
  });
  return root;
}

describe('treeStepEngine', () => {
  it('inserts values in real BST order (left < node < right)', () => {
    const root = buildTree([50, 30, 70, 20, 40, 60, 80]);
    expect(treeToValues(root)).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(root.value).toBe(50);
    expect(root.left.value).toBe(30);
    expect(root.right.value).toBe(70);
  });

  it('does not insert duplicate values', () => {
    const root = buildTree([10, 5, 15, 10]);
    expect(treeToValues(root)).toEqual([5, 10, 15]);
  });

  it('search finds an existing value and reports not-found for a missing one', () => {
    const root = buildTree([50, 30, 70]);
    expect(searchSteps(root, 30).found).toBe(true);
    expect(searchSteps(root, 999).found).toBe(false);
  });

  it('deletes a leaf node directly', () => {
    const root = buildTree([50, 30, 70, 20]);
    const { root: next } = deleteSteps(root, 20);
    expect(treeToValues(next)).toEqual([30, 50, 70]);
  });

  it('deletes a one-child node by splicing the child up', () => {
    const root = buildTree([50, 30, 70, 20]);
    const { root: next } = deleteSteps(root, 30);
    expect(treeToValues(next)).toEqual([20, 50, 70]);
  });

  it('deletes a two-children node via inorder successor', () => {
    const root = buildTree([50, 30, 70, 20, 40, 60, 80]);
    const { root: next } = deleteSteps(root, 50);
    // successor of 50 (smallest in right subtree) is 60
    expect(next.value).toBe(60);
    expect(treeToValues(next)).toEqual([20, 30, 40, 60, 70, 80]);
  });

  it('traverses in the correct order for each traversal type', () => {
    const root = buildTree([50, 30, 70, 20, 40]);
    const orderOf = (type) => {
      const steps = traverseSteps(root, type);
      return steps[steps.length - 1].visitedIds.map((id) => {
        const find = (n) => (!n ? null : n.id === id ? n.value : find(n.left) || find(n.right));
        return find(root);
      });
    };
    expect(orderOf('inorder')).toEqual([20, 30, 40, 50, 70]);
    expect(orderOf('preorder')).toEqual([50, 30, 20, 40, 70]);
    expect(orderOf('postorder')).toEqual([20, 40, 30, 70, 50]);
  });

  it('layout positions every node and draws an edge per parent-child link', () => {
    const root = buildTree([50, 30, 70]);
    const { nodes, edges } = treeLayout(root);
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2); // root->30, root->70
  });

  it('handles an empty tree gracefully', () => {
    expect(treeToValues(null)).toEqual([]);
    expect(searchSteps(null, 5).found).toBe(false);
    expect(treeLayout(null).nodes).toEqual([]);
  });
});
