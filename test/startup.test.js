import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { classifyCard, snoozeStatus } from '../lib/model.js';
import { snapshot as snapshotSchema } from '../lib/schemas.js';
import { readGitInfo } from '../lib/git-branch.js';

// Run the Host service methods with in-memory facilities. Hold the actual card
// hydration step open to reproduce an inbox whose history takes a long time to read.
const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const serviceSource = source.slice(source.indexOf('const DOMAIN =')).replace('export default class', 'class');
const Inbox = runInNewContext(`${serviceSource}\nSevenInboxService`, {
  AbortController, structuredClone, performance, setTimeout, clearTimeout, randomUUID,
  Service: { init: Symbol('init') }, TypertRemoteService: class {},
  z: { strictObject() {}, number: () => ({ int: () => ({ nonnegative() {} }) }) }, presetsSchema: {},
  classifyCard, snoozeStatus, readGitInfo,
});

test('first connection and reconnects can receive inbox rows during history loading', async () => {
  const rows = [{ sessionId: 'first', cwd: '/example', createdAt: 1, updatedAt: 2 }];
  const service = new Inbox();
  service.requireOwner = () => {};
  service.refreshGatewayPendingSeeds = () => {};
  service.readSnoozeSettings = () => ({ revision: 0, presets: [], error: null });
  service.domain = { table: () => new Map() };
  service.ctx = {
    sessionController: { list: async () => ({ items: rows }) },
    workspaceRegistry: { list: () => [] },
  };
  const { promise, resolve } = Promise.withResolvers();
  service.buildCard = () => promise;
  const refresh = service.requestRefresh();
  const signal = AbortSignal.timeout(500);
  const follow = service.follow({}, signal);
  try {
    const deadline = new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Inbox withheld the first rows until history loaded')), { once: true });
    });
    await new Promise(setImmediate);
    const snapshot = await Promise.race([service.snapshot({}, signal), deadline]);
    assert.equal(snapshot.phase, 'building');
    assert.equal(snapshot.cards[0]?.sessionId, 'first');
    assert.equal(snapshot.cards[0]?.context, null);
    const first = await Promise.race([follow.next(), deadline]);
    assert.equal(first.value?.cards[0]?.sessionId, 'first');
    const update = service.requestSessionRefresh('first');
    assert.equal(service.refreshAgain, false);
    resolve({ sessionId: 'first', members: [] });
    await Promise.all([refresh, update]);
    const ready = await Promise.race([follow.next(), deadline]);
    assert.equal(ready.value?.phase, 'ready');
    assert.equal(ready.value?.cards[0]?.sessionId, 'first');
  } finally {
    resolve({ sessionId: 'first', members: [] });
    await refresh;
    await follow.return();
  }
});

test('a new session and its state publish while unrelated history is blocked', async () => {
  const service = new Inbox();
  const older = { sessionId: 'old', members: [], revision: 0 };
  const incoming = { sessionId: 'new', origin: 'local', blank: false, running: true };
  service.publishSnapshot({ ...service.currentSnapshot, cards: [older] });
  service.rootSummaries.set('old', older);
  service.domain = { table: () => new Map() };
  service.readSnoozeSettings = () => ({ revision: 0, presets: [], error: null });
  service.ctx = { workspaceRegistry: { list: () => [] } };
  const history = Promise.withResolvers();
  service.buildSnapshot = () => history.promise;
  service.buildCard = async (summary) => ({ sessionId: summary.sessionId, members: [], revision: 0, running: summary.running });
  const refresh = service.requestRefresh();
  await new Promise(setImmediate);
  try {
    await Promise.race([service.acceptSessionSummary(incoming), new Promise(setImmediate)]);
    assert.equal(service.currentSnapshot.cards.find((card) => card.sessionId === 'new')?.running, true);
    await service.acceptSessionSummary({ ...incoming, running: false });
    assert.equal(service.currentSnapshot.cards.find((card) => card.sessionId === 'new')?.running, false);
    assert.equal(service.refreshAgain, false);
  } finally {
    history.resolve({ ...service.currentSnapshot, phase: 'ready', cards: [older] });
    await refresh;
  }
  assert.equal(service.currentSnapshot.cards.find((card) => card.sessionId === 'new')?.running, false);
});

test('live status is visible before the same session finishes reading its history', async () => {
  const service = new Inbox();
  const summary = { sessionId: 'live', origin: 'local', blank: false, running: true, cwd: '/example' };
  const progress = { sessionId: 'live', turn: { start: { time: 10 }, end: null } };
  service.memberCache.set('live', { progress });
  service.domain = { table: () => new Map() };
  service.readSnoozeSettings = () => ({ revision: 0, presets: [], error: null });
  service.ctx = { workspaceRegistry: { list: () => [] } };
  const history = Promise.withResolvers();
  service.buildCard = () => history.promise;
  const update = service.acceptSessionSummary(summary);
  try {
    assert.equal(service.currentSnapshot.cards[0]?.section, 'working');
    assert.equal(service.currentSnapshot.cards[0]?.context, null);
    snapshotSchema.parse(service.currentSnapshot);
    service.handleSessionStatus('live', false);
    assert.equal(service.currentSnapshot.cards[0]?.running, false);
    assert.equal(progress.turn.end, null);
  } finally {
    history.resolve({ sessionId: 'live', members: [], revision: 0, running: false });
    await update;
  }
});

test('unloading the plugin closes an idle subscription so the client can reconnect', async () => {
  const service = new Inbox();
  service.requireOwner = () => {};
  const controller = new AbortController();
  const subscription = service.follow({}, controller.signal);
  try {
    await subscription.next();
    const pending = subscription.next();
    service.lifetime.abort();
    assert.equal((await Promise.race([pending, new Promise(setImmediate)]))?.done, true);
    assert.equal(service.followers.size, 0);
  } finally {
    controller.abort();
    await subscription.return();
  }
});

test('a reconnect can read the previous verified list during a full refresh', async () => {
  const service = new Inbox();
  service.requireOwner = () => {};
  service.ctx = {};
  const ready = { ...service.currentSnapshot, phase: 'ready', cards: [{ sessionId: 'first' }] };
  service.publishSnapshot(ready);
  const { promise, resolve } = Promise.withResolvers();
  service.buildSnapshot = () => promise;
  const refresh = service.requestRefresh();
  const controller = new AbortController();
  const follow = service.follow({}, controller.signal);
  try {
    const response = service.snapshot({}, controller.signal);
    const first = await Promise.race([response, new Promise(setImmediate)]);
    assert.equal(first?.cards[0]?.sessionId, 'first');
    const streamed = await follow.next();
    assert.equal(streamed.value?.cards[0]?.sessionId, 'first');
    assert.equal(service.refreshAgain, false);
  } finally {
    resolve(ready);
    controller.abort();
    await refresh;
    await follow.return();
  }
});
