import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { classifyCard, filterActiveQueue } from '../lib/model.js';

const baseProgress = (sessionId = 'sess-1') => ({
  sessionId,
  latestHumanInput: { seq: 1, time: 1000 },
  latestResult: { seq: 2, time: 2000 },
  latestWork: { seq: 2, time: 2000 },
  turn: { seq: 1, start: 1000, end: 2000 },
});

test('filterActiveQueue ignores passive placement:context items while keeping real queued turns', () => {
  assert.equal(filterActiveQueue(null), null);
  assert.deepEqual(filterActiveQueue([]), []);
  assert.deepEqual(
    filterActiveQueue([
      { id: 'ctx-1', placement: 'context', text: 'ReMe passive memory' },
      { id: 'ctx-2', placement: 'context', text: 'Auto-context note' },
    ]),
    [],
  );
  assert.deepEqual(
    filterActiveQueue([
      { id: 'ctx-1', placement: 'context' },
      { id: 'turn-1', placement: 'turn', text: 'Run tests' },
      { id: 'turn-2', text: 'Follow up' },
    ]).map((item) => item.id),
    ['turn-1', 'turn-2'],
  );
});

test('classifyCard does not mark idle session with only passive context queue as working', () => {
  const result = classifyCard({
    enrolled: true,
    createdAt: 1000,
    progress: baseProgress(),
    runtime: {
      running: false,
      queue: [{ id: 'reme-1', placement: 'context' }],
      completeness: 'complete',
    },
    pending: [],
  });

  assert.equal(result.running, false);
  assert.equal(result.section, 'active');
  assert.equal(result.canSettle, true);
  assert.equal(result.canSnooze, true);
});

test('classifyCard marks session with active non-context queue item as working', () => {
  const result = classifyCard({
    enrolled: true,
    createdAt: 1000,
    progress: baseProgress(),
    runtime: {
      running: false,
      queue: [
        { id: 'reme-1', placement: 'context' },
        { id: 'msg-1', placement: 'turn' },
      ],
      completeness: 'complete',
    },
    pending: [],
  });

  assert.equal(result.running, true);
  assert.equal(result.section, 'working');
  assert.equal(result.canSnooze, false);
});

test('index.js filters runtime.queue via filterActiveQueue', () => {
  const indexSrc = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  assert.ok(indexSrc.includes('queue: coldIdle ? [] : filterActiveQueue(state.queue)'));
});
