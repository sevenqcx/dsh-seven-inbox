import { z } from 'zod';
import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info';
import { actionRequest, actionResult, emptyRequest, pinRequest, prepareRequest, prepareResult, snapshot, saveSnoozeSettingsRequest, saveSnoozeSettingsResult } from './lib/schemas.js';

const codec = (name, schema) => ({
  mode: 'strict', typeSymbol: `dsh-seven-inbox#${name}`, create: () => schema,
});
const parameter = (name, schema) => ({
  name, wire: name, source: 'json', codec: codec(name, schema), strictCodec: codec(`${name}:strict`, schema),
});

const $remote = createTypertRemoteInfo({
  package: 'dsh-seven-inbox',
  methods: {
    'sevenInbox/snapshot': {
      service: 'sevenInbox', invocation: { kind: 'direct' },
      parameters: [parameter('request', emptyRequest)],
      cancellation: { parameter: 'signal' }, result: codec('Snapshot', snapshot),
    },
    'sevenInbox/follow': {
      service: 'sevenInbox', invocation: { kind: 'direct' }, mode: 'stream',
      parameters: [parameter('request', emptyRequest)],
      cancellation: { parameter: 'signal' }, result: codec('SnapshotStream', snapshot),
    },
    'sevenInbox/act': {
      service: 'sevenInbox', invocation: { kind: 'direct' },
      parameters: [parameter('request', actionRequest)],
      cancellation: { parameter: 'signal' }, result: codec('ActionResult', actionResult),
    },
    'sevenInbox/pin': {
      service: 'sevenInbox', invocation: { kind: 'direct' },
      parameters: [parameter('request', pinRequest)],
      cancellation: { parameter: 'signal' }, result: codec('PinResult', z.strictObject({ pinned: z.boolean() })),
    },
    'sevenInbox/prepare': {
      service: 'sevenInbox', invocation: { kind: 'direct' },
      parameters: [parameter('request', prepareRequest)],
      cancellation: { parameter: 'signal' }, result: codec('PrepareResult', prepareResult),
    },
    'sevenInbox/saveSnoozeSettings': {
      service: 'sevenInbox', invocation: { kind: 'direct' },
      parameters: [parameter('request', saveSnoozeSettingsRequest)],
      cancellation: { parameter: 'signal' }, result: codec('SnoozeSettingsResult', saveSnoozeSettingsResult),
    },
  },
}, z);

export const TYPERT = {
  package: 'dsh-seven-inbox', face: 'host', schemas: [],
  get invocations() { return $remote.descriptors; },
  model: {
    services: [{
      key: 'sevenInbox', exportName: 'default', tags: [],
      description: 'Owner-only Seven Inbox attention snapshots and durable Inbox mutations.',
      members: [
        { kind: 'method', name: 'snapshot', signature: 'snapshot(request, signal): Promise<InboxSnapshot>' },
        { kind: 'method', name: 'follow', signature: 'follow(request, signal): AsyncIterable<InboxSnapshot>' },
        { kind: 'method', name: 'act', signature: 'act(request, signal): Promise<InboxActionResult>' },
        { kind: 'method', name: 'pin', signature: 'pin(request, signal): Promise<{ pinned: boolean }>' },
        { kind: 'method', name: 'prepare', signature: 'prepare(request, signal): Promise<PrepareResult>' },
        { kind: 'method', name: 'saveSnoozeSettings', signature: 'saveSnoozeSettings(request, signal): Promise<SnoozeSettingsResult>' },
      ],
      types: [],
    }],
    events: [], objects: [],
  },
};
