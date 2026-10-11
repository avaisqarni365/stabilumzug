/* Runs backend/apps-script (Code.js + Shared.js + Estimator.js) in Node with mocked Apps Script services.  Usage: node backend/test/run.js */
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const M = require('./mock');
const {ctx, sheets, alerts, mails, puts, REPO} = M;
M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js']);
// 1. setup seeds catalogue + rules from master.json
ctx.setup();
const master = JSON.parse(fs.readFileSync(path.join(REPO, 'data/master.json'), 'utf8'));
const fromSheet = JSON.parse(JSON.stringify(ctx.masterFromSheet_()));
const norm = m => JSON.parse(JSON.stringify(m.items.map(it => { const x = Object.assign({dis: 0, asm: 0}, it); return x; })));
assert.deepStrictEqual(norm(fromSheet), norm(master), 'catalogue round trip');
assert.deepStrictEqual(fromSheet.presets, master.presets); assert.deepStrictEqual(fromSheet.guess, master.guess);
assert.deepStrictEqual(fromSheet.rules, master.rules, 'rules round trip');
console.log('ok setup + master round trip:', fromSheet.items.length, 'items, rates rows', sheets['Preise'].data.length - 1);

// 2. lead
const state = {ref: 'SU-TEST1', f1: {from: 'Rüttenscheider Str. 12, Essen', to: 'Alleestr. 4, Bochum', km: '', dateMode: 'fixed', date: '2026-11-07', hh: 1},
  acc: {old: {floor: 2, lift: 0, park: 3}, 'new': {floor: 0, lift: 3, park: 0}}, hvz: true,
  rooms: [{r: 'living', sqm: '24'}, {r: 'bedroom', sqm: ''}],
  inv: {sofa: {vi: 1, by: {pick: 1, list: 1}}, carton: {vi: 0, by: {preset: 30}}, 'wardrobe-l': {vi: 0, by: {pick: 1}}},
  customs: [{name: '=Klavier', n: 1, l: 150, b: 60, h: 120, v: 1.08}], src: {utm_source: 'google', utm_medium: 'cpc'}};
const post = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});
assert.strictEqual(post({action: 'lead', state, consent: true, t: 1000, contact: {name: 'A', phone: '1'}}).error, 'too_fast');
assert.strictEqual(post({action: 'lead', state, consent: false, t: 9000, contact: {name: 'A', phone: '1'}}).error, 'consent');
assert.strictEqual(post({action: 'lead', state, consent: true, t: 9000, contact: {name: 'A'}}).error, 'contact');
assert.strictEqual(post({action: 'lead', state, consent: true, t: 9000, hp: 'bot', contact: {name: 'A', phone: '1'}}).id, 'A-0000');
const r = post({action: 'lead', state, consent: true, t: 90000, lang: 'de', contact: {name: 'Fam. Yilmaz', phone: '0201 123', email: 'y@example.de', channel: 'whatsapp', note: '+Klavier im 3. OG'}});
assert(r.ok && r.id === 'A-2601' && r.km === 23, JSON.stringify(r));
const lead = sheets['Anfragen'].data[1];
console.log('ok lead', r.id, '| row:', lead.slice(0, 31).join(' ¦ '));
assert.strictEqual(lead[31], "'+Klavier im 3. OG", 'formula injection guarded');
const items = sheets['Gegenstände'].data.slice(1);
console.log('ok items rows:', items.map(x => x.slice(1, 6).join('/')).join('; '));
assert.strictEqual(items.find(x => x[1] === 'custom')[2], "'=Klavier");
assert.strictEqual(mails.length, 1); console.log('ok mail:', mails[0].subject);

// 3. route + drafts + health
console.log('ok route', JSON.stringify(post({action: 'route', from: 'Essen Hbf', to: 'Bochum Hbf'})));
const d = post({action: 'saveDraft', consent: true, state});
assert(d.ok && d.token);
const d2 = post({action: 'saveDraft', consent: true, token: d.token, state: Object.assign({}, state, {hvz: false})});
assert.strictEqual(d2.token, d.token); assert.strictEqual(sheets['Entwürfe'].data.length, 2, 'update in place');
const g = ctx.doGet({parameter: {action: 'draft', ref: 'SU-TEST1', token: d.token}});
assert(g.ok && g.state.hvz === false);
assert.strictEqual(ctx.doGet({parameter: {action: 'draft', ref: 'SU-TEST1', token: 'nope'}}).error, 'not_found');
console.log('ok drafts; health', JSON.stringify(ctx.doGet({parameter: {action: 'health'}})));

// 4. quote for the lead row
M.setActive(sheets['Anfragen'], 2);
ctx.quoteSelectedLead();
console.log('ok quote:', alerts[alerts.length - 1].replace(/\n/g, ' '));
sheets['Angebote'].data.slice(1).forEach(x => console.log('   ', x.slice(4, 9).join(' | ')));
assert.strictEqual(sheets['Anfragen'].data[1][2], 'In Arbeit');

// 5. publish
ctx.publishCatalog();
assert.strictEqual(puts.length, 3);
const pub = JSON.parse(Buffer.from(puts[0].body.content, 'base64').toString('utf8'));
assert.deepStrictEqual(norm(pub), norm(master));
const js = Buffer.from(puts[2].body.content, 'base64').toString('utf8');
const w = {}; vm.runInNewContext(js, {window: w});
assert.strictEqual(w.FLOW_DATA.items.length, master.items.length);
console.log('ok publish:', puts.map(p => p.url.split('/contents/')[1]).join(', '), '| version', pub.version);

// 5b. short form
assert.strictEqual(post({action: 'quick', consent: true, t: 500, form: {name: 'A', phone: '1'}}).error, 'too_fast');
assert.strictEqual(post({action: 'quick', consent: true, t: 9000, form: {name: 'A'}}).error, 'contact');
const q = post({action: 'quick', consent: true, t: 9000, lang: 'de', src: {ref: 'google.com'},
  form: {service: 'clearance', name: 'Frau Test', phone: '0201 999', email: '', rooms: '3', from: 'Karlstraße 32, Essen', to: '', date: '2026-11-20', message: '=Keller und Dachboden'}});
assert(q.ok && /^A-\d+$/.test(q.id), JSON.stringify(q));
const L = sheets['Anfragen'].data, hdr = L[0], qr = L[L.length - 1];
const col = n => qr[hdr.indexOf(n)];
assert(['Leistung', 'Notizen', 'Kundentoken', 'Angebot gesendet'].every(h => hdr.includes(h)), 'new columns');
assert.strictEqual(col('Leistung'), 'Entrümpelung (Kurzformular)');
assert.strictEqual(col('Räume'), '3 Zimmer');
assert.strictEqual(col('Nachricht'), "'=Keller und Dachboden");
assert.strictEqual(sheets['Anfragen'].data[1][hdr.indexOf('Leistung')], 'Umzug (Planer)');
console.log('ok quick form', q.id, '|', col('Leistung'), '|', col('Quelle'));

// 6. rate limit
for (let i = 0; i < 70; i++) post({action: 'route', from: 'Essen Hbf', to: 'Bochum Hbf'});
console.log('ok rate limit:', post({action: 'route', from: 'a b c d', to: 'e f g h'}).error);
console.log('ALL OK');
