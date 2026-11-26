import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const clientSrc = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

test('client.js preserves native DSH sidebar chrome and never enables host shell takeover', () => {
  assert.ok(!clientSrc.includes("shellRoot.setAttribute('data-t3-inbox'"), 'Must not hijack html[data-t3-inbox]');
  assert.ok(!clientSrc.includes("shellRoot.setAttribute('data-t3-inbox-nav'"), 'Must not hijack html[data-t3-inbox-nav]');
});

test('client.js integrates persistent multi-workspace filter, invert/reset footer, and polished shelf cards', () => {
  assert.ok(clientSrc.includes("const WORKSPACE_FILTER_KEY = 'dsh-seven-inbox:workspace-filter';"));
  assert.ok(clientSrc.includes("'data-filter-mode':filterBadgeMode"));
  assert.ok(clientSrc.includes("'data-action':'invert'"));
  assert.ok(clientSrc.includes("'data-action':'reset'"));
  assert.ok(clientSrc.includes('--s7i-working-card:#ffffff;'));
  assert.ok(clientSrc.includes('--s7i-working-card:#222429;'));
  assert.ok(clientSrc.includes('.s7i-filter-foot'));
});

test('allWorkspaceIdsRef reads workspaces?.items before workspaceItems is declared', () => {
  const refIdx = clientSrc.indexOf('const allWorkspaceIdsRef = React.useRef([]);');
  const declIdx = clientSrc.indexOf('const workspaceItems = workspaces?.items ?? [];');
  assert.ok(refIdx > 0 && declIdx > refIdx, 'Expected allWorkspaceIdsRef before workspaceItems');
  const slice = clientSrc.slice(refIdx, declIdx);
  assert.ok(!slice.includes('workspaceItems.'), 'Must not access workspaceItems before initialization');
  assert.ok(slice.includes('(workspaces?.items ?? [])'), 'Should derive workspace IDs safely from workspaces?.items');
});
