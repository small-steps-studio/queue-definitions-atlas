'use strict';
// Queue Definitions Atlas core: definitions export summary, queues, exchanges and bindings, topology check and security review.

const esc = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/([\\`*_{}\[\]()#+!|<>~&$])/g, '\\$1')
  .split('://').join('\\:\\/\\/').replace(/(^|[^A-Za-z0-9])www\./gi, (m, pre) => pre + m.slice(pre.length, pre.length + 3) + '\\.');
const cell = (s) => { s = String(s == null ? '' : s); return s === '' ? '-' : esc(s); };
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v.filter(isObj) : []);
const str = (v) => (typeof v === 'string' ? v : '');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const SECTIONS = ['users', 'vhosts', 'permissions', 'topic_permissions', 'parameters', 'global_parameters', 'policies', 'queues', 'exchanges', 'bindings'];
const DEFAULT_EXCHANGES = new Set(['', 'amq.direct', 'amq.fanout', 'amq.topic', 'amq.headers', 'amq.match', 'amq.rabbitmq.trace', 'amq.rabbitmq.log']);

function load(text) {
  let j;
  try { j = JSON.parse(String(text == null ? '' : text).replace(/^﻿/, '')); } catch (e) { return { err: 'the text is not JSON' }; }
  if (!isObj(j) || !SECTIONS.some((s) => Array.isArray(j[s]))) return { err: 'it has none of the sections users, vhosts, permissions, policies, queues, exchanges, bindings' };
  return { j };
}
const BAD = (h, err) => '# ' + h + '\n\nThis file is not a definitions export: ' + err + '.';
const vh = (x) => (typeof x.vhost === 'string' ? x.vhost : '/');
// Queue type: arguments x-queue-type (classic, quorum, stream), else classic.
const qtype = (q) => (isObj(q.arguments) && typeof q.arguments['x-queue-type'] === 'string' ? q.arguments['x-queue-type'] : 'classic');
const json = (v) => { try { return JSON.stringify(v); } catch (e) { return '(nested too deeply to show)'; } };
const argText = (a) => (isObj(a) ? Object.keys(a).sort().map((k) => k + '=' + (typeof a[k] === 'object' ? json(a[k]) : String(a[k]))).join(', ') : '');
// A policy pattern is only evaluated when it is short and has no nested quantifier such as (a+)+, which could take
// exponential time on a long name (the broker itself uses another regex engine).
const SAFE_PATTERN = (p) => p.length <= 300 && !/\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*[+*{]/.test(p);
const yn = (v) => (v === true ? 'yes' : v === false ? 'no' : '-');

function reportSummary(text) {
  const L = load(text); const H = 'Definitions Summary'; if (L.err) return BAD(H, L.err); const j = L.j;
  let md = '# ' + H + '\n\n' + (typeof j.rabbit_version === 'string' || typeof j.rabbitmq_version === 'string' ? 'Exported from version ' + esc(str(j.rabbitmq_version) || str(j.rabbit_version)) + '.' : 'No version in the file.');
  md += '\n\n| Section | Entries |\n| --- | ---: |\n' + SECTIONS.filter((s) => Array.isArray(j[s])).map((s) => '| ' + s + ' | ' + j[s].length + ' |').join('\n');
  const vhosts = new Map(); const add = (v, k) => { if (!vhosts.has(v)) vhosts.set(v, { queues: 0, exchanges: 0, bindings: 0, policies: 0 }); vhosts.get(v)[k]++; };
  arr(j.vhosts).forEach((v) => { if (typeof v.name === 'string' && !vhosts.has(v.name)) vhosts.set(v.name, { queues: 0, exchanges: 0, bindings: 0, policies: 0 }); });
  arr(j.queues).forEach((q) => add(vh(q), 'queues')); arr(j.exchanges).forEach((e) => add(vh(e), 'exchanges')); arr(j.bindings).forEach((b) => add(vh(b), 'bindings')); arr(j.policies).forEach((p) => add(vh(p), 'policies'));
  if (vhosts.size) md += '\n\n| Vhost | Queues | Exchanges | Bindings | Policies |\n| --- | ---: | ---: | ---: | ---: |\n' + [...vhosts.entries()].sort((a, b) => byText(a[0], b[0])).map(([v, c]) => '| ' + cell(v) + ' | ' + c.queues + ' | ' + c.exchanges + ' | ' + c.bindings + ' | ' + c.policies + ' |').join('\n');
  return md;
}

function reportQueues(text) {
  const L = load(text); const H = 'Queues'; if (L.err) return BAD(H, L.err);
  const qs = arr(L.j.queues);
  if (!qs.length) return '# ' + H + '\n\nNo queues.';
  const types = new Map(); qs.forEach((q) => types.set(qtype(q), (types.get(qtype(q)) || 0) + 1));
  return '# ' + H + '\n\n' + pl(qs.length, 'queue') + ': ' + [...types.entries()].sort((a, b) => byText(a[0], b[0])).map(([t, n]) => n + ' ' + esc(t)).join(', ') + '.\n\n' +
    '| Vhost | Queue | Type | Durable | Auto-delete | Arguments |\n| --- | --- | --- | --- | --- | --- |\n' +
    qs.slice().sort((a, b) => byText(vh(a), vh(b)) || byText(str(a.name), str(b.name))).map((q) => '| ' + cell(vh(q)) + ' | ' + cell(str(q.name)) + ' | ' + cell(qtype(q)) + ' | ' + yn(q.durable) + ' | ' + yn(q.auto_delete) + ' | ' + cell(argText(q.arguments)) + ' |').join('\n');
}

function reportExchanges(text) {
  const L = load(text); const H = 'Exchanges and Bindings'; if (L.err) return BAD(H, L.err);
  const ex = arr(L.j.exchanges), bs = arr(L.j.bindings);
  const out = new Map(); bs.forEach((b) => { const k = vh(b) + '\u0000' + str(b.source); out.set(k, (out.get(k) || 0) + 1); });
  let md = '# ' + H;
  md += '\n\n## Exchanges\n\n' + (ex.length ? '| Vhost | Exchange | Type | Durable | Internal | Bindings |\n| --- | --- | --- | --- | --- | ---: |\n' +
    ex.slice().sort((a, b) => byText(vh(a), vh(b)) || byText(str(a.name), str(b.name))).map((e) => '| ' + cell(vh(e)) + ' | ' + cell(str(e.name)) + ' | ' + cell(str(e.type)) + ' | ' + yn(e.durable) + ' | ' + yn(e.internal) + ' | ' + (out.get(vh(e) + '\u0000' + str(e.name)) || 0) + ' |').join('\n') : 'No exchanges.');
  md += '\n\n## Bindings\n\n' + (bs.length ? '| Vhost | Source | Destination | Kind | Routing key |\n| --- | --- | --- | --- | --- |\n' +
    bs.map((b) => '| ' + cell(vh(b)) + ' | ' + cell(str(b.source) || '(default)') + ' | ' + cell(str(b.destination)) + ' | ' + cell(str(b.destination_type)) + ' | ' + cell(str(b.routing_key)) + ' |').join('\n') : 'No bindings.');
  return md;
}

function reportTopology(text) {
  const L = load(text); const H = 'Topology Check'; if (L.err) return BAD(H, L.err); const j = L.j; const f = [];
  const exSet = new Set(arr(j.exchanges).map((e) => vh(e) + '\u0000' + str(e.name)));
  const qSet = new Set(arr(j.queues).map((q) => vh(q) + '\u0000' + str(q.name)));
  const hasEx = (v, n) => DEFAULT_EXCHANGES.has(n) || exSet.has(v + '\u0000' + n);
  arr(j.bindings).forEach((b) => {
    const v = vh(b), src = str(b.source), dst = str(b.destination), kind = str(b.destination_type);
    if (!hasEx(v, src)) f.push([v, 'binding', 'missing_source', 'binding from ' + src + ' to ' + dst + ': the source exchange is not defined']);
    if (kind === 'queue' && !qSet.has(v + '\u0000' + dst)) f.push([v, 'binding', 'missing_destination', 'binding from ' + (src || '(default)') + ' to queue ' + dst + ': the queue is not defined']);
    if (kind === 'exchange' && !hasEx(v, dst)) f.push([v, 'binding', 'missing_destination', 'binding from ' + (src || '(default)') + ' to exchange ' + dst + ': the exchange is not defined']);
  });
  const bound = new Set(arr(j.bindings).filter((b) => str(b.destination_type) === 'queue').map((b) => vh(b) + '\u0000' + str(b.destination)));
  arr(j.queues).forEach((q) => {
    const v = vh(q), n = str(q.name);
    if (!bound.has(v + '\u0000' + n)) f.push([v, 'queue ' + n, 'unbound_queue', 'no binding: messages reach it only through the default exchange (routing key = queue name)']);
    const dlx = isObj(q.arguments) ? q.arguments['x-dead-letter-exchange'] : undefined;
    if (typeof dlx === 'string' && !hasEx(v, dlx)) f.push([v, 'queue ' + n, 'missing_dead_letter_exchange', 'x-dead-letter-exchange ' + dlx + ' is not defined']);
    if (q.durable === false && qtype(q) === 'classic') f.push([v, 'queue ' + n, 'transient_queue', 'the queue is not durable and is lost when the broker restarts']);
  });
  const unusedEx = arr(j.exchanges).filter((e) => !DEFAULT_EXCHANGES.has(str(e.name)) && !arr(j.bindings).some((b) => vh(b) === vh(e) && (str(b.source) === str(e.name) || (str(b.destination_type) === 'exchange' && str(b.destination) === str(e.name)))));
  unusedEx.forEach((e) => f.push([vh(e), 'exchange ' + str(e.name), 'unused_exchange', 'no binding uses this exchange; messages published to it are dropped']));
  arr(j.policies).forEach((p) => {
    const v = vh(p), n = str(p.name), def = isObj(p.definition) ? p.definition : {};
    let re = null; try { re = new RegExp(str(p.pattern)); } catch (e) { f.push([v, 'policy ' + n, 'bad_pattern', 'pattern ' + str(p.pattern) + ' is not a valid regular expression']); }
    if (re && !SAFE_PATTERN(str(p.pattern))) re = null;
    if (re) {
      const to = str(p['apply-to']) || 'all';
      const names = [].concat(to === 'exchanges' ? [] : arr(j.queues).filter((q) => vh(q) === v).map((q) => str(q.name)), to === 'queues' ? [] : arr(j.exchanges).filter((e) => vh(e) === v).map((e) => str(e.name)));
      if (!names.some((x) => re.test(x))) f.push([v, 'policy ' + n, 'policy_matches_nothing', 'pattern ' + str(p.pattern) + ' matches no ' + (to === 'all' ? 'queue or exchange' : to.replace(/s$/, '')) + ' in this export']);
    }
    if ('ha-mode' in def) f.push([v, 'policy ' + n, 'classic_mirroring', 'ha-mode (classic queue mirroring) was removed in RabbitMQ 4.0; use quorum queues']);
  });
  if (!f.length) return '# ' + H + '\n\nNo findings.';
  return '# ' + H + '\n\n' + pl(f.length, 'finding') + '.\n\n| Vhost | Object | Check | Finding |\n| --- | --- | --- | --- |\n' + f.map((x) => '| ' + cell(x[0]) + ' | ' + cell(x[1]) + ' | ' + x[2] + ' | ' + cell(x[3]) + ' |').join('\n');
}

function reportSecurity(text) {
  const L = load(text); const H = 'Security Review'; if (L.err) return BAD(H, L.err); const j = L.j; const f = [];
  const tagsOf = (u) => (Array.isArray(u.tags) ? u.tags.map(String) : str(u.tags).split(',').map((x) => x.trim()).filter(Boolean));
  const admins = new Set();
  arr(j.users).forEach((u) => {
    const n = str(u.name), tags = tagsOf(u);
    if (n === 'guest') f.push(['user ' + n, 'guest_user', 'the default guest user exists; delete it or give it a strong password and no remote access']);
    if (tags.includes('administrator')) { admins.add(n); f.push(['user ' + n, 'administrator', 'has the administrator tag (full control of the broker)']); }
    if (!str(u.password_hash) && !tags.includes('impersonator')) f.push(['user ' + n, 'no_password', 'no password hash: the user can only log in with another mechanism, or not at all']);
    if (/md5/i.test(str(u.hashing_algorithm))) f.push(['user ' + n, 'weak_hash', 'the password hash uses MD5; re-create the user to hash it with SHA-256']);
  });
  arr(j.permissions).forEach((p) => {
    const u = str(p.user);
    if (!admins.has(u) && str(p.configure) === '.*' && str(p.write) === '.*' && str(p.read) === '.*') f.push(['user ' + u, 'full_permissions', 'configure, write and read .* on vhost ' + vh(p) + ': every resource of the vhost']);
  });
  const permitted = new Set(arr(j.permissions).map((p) => vh(p)));
  arr(j.vhosts).forEach((v) => { if (typeof v.name === 'string' && !permitted.has(v.name)) f.push(['vhost ' + v.name, 'no_permissions', 'no user has permissions on this vhost']); });
  if (!f.length) return '# ' + H + '\n\nNo findings.';
  return '# ' + H + '\n\n' + pl(f.length, 'finding') + '.\n\n| Object | Check | Finding |\n| --- | --- | --- |\n' + f.map((x) => '| ' + cell(x[0]) + ' | ' + x[1] + ' | ' + cell(x[2]) + ' |').join('\n');
}

module.exports = { queueType: (q) => (isObj(q) ? qtype(q) : 'classic'), argumentsText: argText, reportSummary, reportQueues, reportExchanges, reportTopology, reportSecurity };

// Caps every Markdown table of a report at 500 rows and says how many there were.
function capTables(md) {
  if (typeof md !== 'string') return md;
  const lines = md.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].startsWith('|') && /^\|[ :-]+\|/.test(lines[i + 1] || '')) {
      out.push(lines[++i]);
      let n = 0;
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) { i++; n++; if (n <= 500) out.push(lines[i]); }
      if (n > 500) { out.push(''); out.push('Showing the first 500 of ' + n + ' rows.'); }
    }
  }
  return out.join('\n');
}
for (const k of Object.keys(module.exports)) {
  if (k.startsWith('report')) { const f = module.exports[k]; module.exports[k] = function (text) { return capTables(f(text)); }; }
}
