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

test('inbox header omits redundant compose button and filter popover hides native scrollbar', () => {
  assert.ok(!clientSrc.includes("icon:'compose'"), 'Inbox header must not render the redundant compose button');
  assert.ok(clientSrc.includes('.t3i-project-options::-webkit-scrollbar { display:none; }'), 'Filter popover must hide native scrollbar');
});

test('inbox header matches native workspace bar and switches views via unified view-options menu', () => {
  assert.ok(clientSrc.includes("className:'t3i-search-slot'"), 'Inbox header must use collapsible native search slot');
  assert.ok(clientSrc.includes("listClassName: 't3i-view-options-menu'"), 'Inbox header must render native view-options menu');
  assert.ok(clientSrc.includes("seven-inbox: native view-options inbox switch"), 'Native Workspaces view-options menu must include Inbox option');
  assert.ok(!clientSrc.includes("ctx.slots.inject('sidebar.panellist'"), 'Must not register a standalone sidebar.panellist switch entry');
  assert.ok(clientSrc.includes('height:19px; margin-top:1px;'), 'Multi-workspace filter pill must stay compact and optically aligned');
});

test('allWorkspaceIdsRef reads workspaces?.items before workspaceItems is declared', () => {
  const refIdx = clientSrc.indexOf('const allWorkspaceIdsRef = React.useRef([]);');
  const declIdx = clientSrc.indexOf('const workspaceItems = workspaces?.items ?? [];');
  assert.ok(refIdx > 0 && declIdx > refIdx, 'Expected allWorkspaceIdsRef before workspaceItems');
  const slice = clientSrc.slice(refIdx, declIdx);
  assert.ok(!slice.includes('workspaceItems.'), 'Must not access workspaceItems before initialization');
  assert.ok(slice.includes('(workspaces?.items ?? [])'), 'Should derive workspace IDs safely from workspaces?.items');
});
