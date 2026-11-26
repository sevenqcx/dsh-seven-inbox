import assert from 'node:assert/strict';
import test from 'node:test';
import {
  invertWorkspaceFilterIds,
  normalizeWorkspaceFilterIds,
  pruneWorkspaceFilterIds,
  toggleWorkspaceFilterId,
  workspaceFilterBadgeState,
} from '../lib/workspace-filter.js';

const ALL = ['ws-a', 'ws-b', 'ws-c'];

test('normalizeWorkspaceFilterIds deduplicates and collapses selecting all to empty array', () => {
  assert.deepEqual(normalizeWorkspaceFilterIds(['ws-a', 'ws-a', '', null], ALL), ['ws-a']);
  assert.deepEqual(normalizeWorkspaceFilterIds(['ws-a', 'ws-b', 'ws-c'], ALL), []);
  assert.deepEqual(normalizeWorkspaceFilterIds(['ws-c', 'ws-a', 'ws-b'], ALL), []);
});

test('toggleWorkspaceFilterId toggles multi-select and collapses when last unselected is added', () => {
  let sel = toggleWorkspaceFilterId([], 'ws-a', ALL);
  assert.deepEqual(sel, ['ws-a']);

  sel = toggleWorkspaceFilterId(sel, 'ws-b', ALL);
  assert.deepEqual(sel, ['ws-a', 'ws-b']);

  // Adding the final workspace collapses back to All projects ([])
  assert.deepEqual(toggleWorkspaceFilterId(sel, 'ws-c', ALL), []);

  // Removing an existing workspace keeps the remaining ones
  assert.deepEqual(toggleWorkspaceFilterId(sel, 'ws-a', ALL), ['ws-b']);
});

test('invertWorkspaceFilterIds quickly excludes currently selected workspaces', () => {
  assert.deepEqual(invertWorkspaceFilterIds(['ws-a'], ALL), ['ws-b', 'ws-c']);
  assert.deepEqual(invertWorkspaceFilterIds(['ws-a', 'ws-c'], ALL), ['ws-b']);
  assert.deepEqual(invertWorkspaceFilterIds([], ALL), []);
  assert.deepEqual(invertWorkspaceFilterIds(['ws-a'], ['ws-a']), []);
});

test('pruneWorkspaceFilterIds drops removed workspaces and collapses if all live workspaces remain', () => {
  assert.deepEqual(pruneWorkspaceFilterIds(['ws-a', 'ws-deleted'], ALL), ['ws-a']);
  assert.deepEqual(pruneWorkspaceFilterIds(['ws-deleted'], ALL), []);
  assert.deepEqual(pruneWorkspaceFilterIds(['ws-a', 'ws-b', 'ws-deleted'], ['ws-a', 'ws-b']), []);
});

test('workspaceFilterBadgeState computes empty, single, and multi badge modes', () => {
  assert.deepEqual(workspaceFilterBadgeState([], 5), { mode: '', text: '' });
  assert.deepEqual(workspaceFilterBadgeState(['ws-a'], 5), { mode: 'single', text: '' });
  assert.deepEqual(workspaceFilterBadgeState(['ws-a', 'ws-b'], 5), { mode: 'multi', text: '2/5' });
  assert.deepEqual(workspaceFilterBadgeState(['ws-a', 'ws-b'], 0), { mode: 'multi', text: '2' });
});
