import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));

test('the browser entry registers under the package name', () => {
  const entryUrl = new URL(manifest.exports['./client'], root);
  const registeredIds = [];

  runInNewContext(readFileSync(entryUrl, 'utf8'), {
    window: { __ModuleLoader__: { load: ({ id }) => registeredIds.push(id) } },
  });

  assert.deepEqual(registeredIds, [manifest.name], 'Update the browser module ID when renaming the package');
});

test('cordis.patch.yml and typert.js match manifest name with no stale namespace leaks', () => {
  const patch = readFileSync(new URL('cordis.patch.yml', root), 'utf8');
  assert.match(patch, new RegExp(`id:\\s*${manifest.name}`));
  assert.match(patch, new RegExp(`name:\\s*${manifest.name}`));

  const typert = readFileSync(new URL('typert.js', root), 'utf8');
  assert.match(typert, new RegExp(`package:\\s*'${manifest.name}'`));
  assert.match(typert, /key:\s*'sevenInbox'/);

  for (const rel of ['package.json', 'cordis.patch.yml', 'typert.js', 'index.js', 'client.js']) {
    const content = readFileSync(new URL(rel, root), 'utf8');
    assert.ok(!content.includes('@local/dsh-inbox'), `${rel} must not contain @local/dsh-inbox`);
    assert.ok(!content.includes('remote.t3Inbox'), `${rel} must not contain remote.t3Inbox`);
  }
});
