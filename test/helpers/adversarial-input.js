'use strict';
// Hostile and odd definitions exports for the adversarial test (invented; payloads must come out as plain escaped text).
const PAY = ['x|y', '<b>y</b>', '[link](https://evil.test)', '<img src=https://evil.test/i.png>', '*b*', '_i_', '$x$', 'www.evil.test', '`code`'];
const cases = [];
PAY.forEach((p, i) => {
  cases.push({ name: 'payload ' + i, text: JSON.stringify({ rabbit_version: p, users: [{ name: p, password_hash: '', hashing_algorithm: p, tags: [p, 'administrator'] }], vhosts: [{ name: p }],
    permissions: [{ user: p, vhost: p, configure: '.*', write: '.*', read: '.*' }], policies: [{ vhost: p, name: p, pattern: p, definition: { 'ha-mode': p } }],
    queues: [{ name: p, vhost: p, durable: false, arguments: { [p]: p, 'x-dead-letter-exchange': p, 'x-queue-type': p } }], exchanges: [{ name: p, vhost: p, type: p }], bindings: [{ source: p, vhost: p, destination: p, destination_type: 'queue', routing_key: p }] }) });
});
cases.push({ name: 'prototype names', text: JSON.stringify({ users: [{ name: '__proto__' }, { name: 'constructor', tags: ['administrator'] }], vhosts: [{ name: '__proto__' }, { name: 'toString' }],
  queues: [{ name: 'hasOwnProperty', vhost: '__proto__' }], exchanges: [{ name: 'constructor', vhost: '__proto__' }], bindings: [{ source: 'constructor', vhost: '__proto__', destination: 'valueOf', destination_type: 'exchange' }], policies: [{ vhost: '__proto__', name: 'x', pattern: 'constructor' }] }) });
cases.push({ name: 'catastrophic pattern', text: JSON.stringify({ policies: [{ vhost: '/', name: 'slow', pattern: '^(a+)+$', 'apply-to': 'queues', definition: {} }], queues: [{ name: 'a'.repeat(28) + '!', vhost: '/' }] }) });
cases.push({ name: 'deep arguments', text: '{"queues":[{"name":"q","arguments":' + '{"a":'.repeat(20000) + '1' + '}'.repeat(20000) + '}]}' });
module.exports = { cases };
