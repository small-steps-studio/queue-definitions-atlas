'use strict';
// Builds a definitions export of about `bytes` characters for the large-file test (invented broker).
function make(bytes) {
  const parts = ['{"rabbit_version":"3.13.7","vhosts":[{"name":"/"}],"exchanges":[{"name":"orders","vhost":"/","type":"topic","durable":true}],"queues":[']; let size = parts[0].length, i = 0;
  const q = []; const b = [];
  while (size < bytes) {
    const s = '{"name":"queue.' + i + '","vhost":"/","durable":true,"auto_delete":false,"arguments":{"x-queue-type":"quorum","x-max-length":' + (i % 9999) + '}}';
    const t = '{"source":"orders","vhost":"/","destination":"queue.' + i + '","destination_type":"queue","routing_key":"order.' + (i % 100) + '","arguments":{}}';
    q.push(s); b.push(t); size += s.length + t.length + 2; i++;
  }
  return parts[0] + q.join(',') + '],"bindings":[' + b.join(',') + ']}';
}
module.exports = { make };
