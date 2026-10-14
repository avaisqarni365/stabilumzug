/* Runs backend/apps-script (Code.js + Shared.js + Estimator.js) in Node with mocked Apps Script services.  Usage: node backend/test/run.js */
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const M = require('./mock');
const {ctx, sheets, alerts, mails, puts, REPO} = M;
M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js', 'Website.js']);
ctx.Utilities.newBlob = (data, type, name) => ({data, type, name});
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

// 5c. photos after a request: token from the answer, one e-mail with the photos attached, note in the row
assert(/^[0-9a-f]{32}$/.test(q.up), 'upload token');
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]).toString('base64');
const photo = (extra) => Object.assign({action: 'photos', id: q.id, k: q.up, images: [{type: 'image/jpeg', data: jpg}, {type: 'image/png', data: jpg}]}, extra || {});
assert.strictEqual(post(photo({k: 'nope'})).error, 'token');
assert.strictEqual(post(photo({id: 'A-1'})).error, 'token');
assert.strictEqual(post(photo({images: []})).error, 'empty');
assert.strictEqual(post(photo({images: [{type: 'text/html', data: jpg}]})).error, 'file');
assert.strictEqual(post(photo({images: [{type: 'image/jpeg', data: '<script>'}]})).error, 'file');
mails.length = 0;
let ph = post(photo({note: 'Klavier im Keller'}));
assert(ph.ok && ph.n === 2, JSON.stringify(ph));
assert.strictEqual(mails.length, 1);
assert(/^Fotos zu Anfrage A-\d+ – Frau Test \(2\)$/.test(mails[0].subject), mails[0].subject);
assert.strictEqual(mails[0].attachments.map(a => a.name).join(), [q.id + '-foto-1.jpg', q.id + '-foto-2.png'].join());
assert(/Klavier im Keller/.test(mails[0].body));
const L2 = sheets['Anfragen'].data, qr2 = L2.find(r => r[0] === q.id);
assert(/Fotos: 2 per E-Mail/.test(qr2[hdr.indexOf('Notizen')]));
// more photos later with the same token, at most 10 in total
assert.strictEqual(post(photo({images: Array(9).fill({type: 'image/jpeg', data: jpg})})).error, 'too_many');
assert(post(photo()).n === 4);
// large bodies are only accepted for photos
assert.strictEqual(ctx.doPost({postData: {contents: JSON.stringify({action: 'quick', pad: 'x'.repeat(200000)})}}).error, 'too_large');
assert.strictEqual(ctx.doPost({postData: {contents: JSON.stringify({action: 'photos', id: q.id, k: q.up, pad: 'x'.repeat(200000), images: [{type: 'image/jpeg', data: jpg}]})}}).n, 5);
console.log('ok photos: token, types, limit 10, one e-mail with attachments, note in the row');

// 5d. wished moving date: fixed day, or flexible with an optional time window
const md = ctx.moveDate_;
assert.strictEqual(md({dateMode: 'fixed', date: '2026-11-07'}), '2026-11-07');
assert.strictEqual(md({dateMode: 'fixed', date: '2026-11-07'}, true), '07.11.2026');
assert.strictEqual(md({dateMode: 'flex'}), 'flexibel');
assert.strictEqual(md({dateMode: 'flex'}, true), 'flexibel, nach Absprache');
assert.strictEqual(md({dateMode: 'flex', dateFrom: '2026-11-15', dateTo: '2026-11-01'}), 'flexibel 01.11.2026–15.11.2026', 'reversed ends are swapped');
assert.strictEqual(md({dateMode: 'flex', dateFrom: '2026-11-01', dateTo: '2026-11-15'}, true), 'flexibel, zwischen 01.11.2026 und 15.11.2026');
assert.strictEqual(md({dateMode: 'flex', dateFrom: '2026-11-01'}), 'flexibel ab 01.11.2026');
assert.strictEqual(md({dateMode: 'flex', dateTo: '=1+1'}), 'flexibel', 'junk ignored');
const wl = post({action: 'lead', consent: true, t: 9000, lang: 'de', contact: {name: 'Fenster', phone: '0170 1'},
  state: Object.assign({}, state, {f1: Object.assign({}, state.f1, {dateMode: 'flex', date: '', dateFrom: '2026-11-01', dateTo: '2026-11-15'})})});
assert(wl.ok);
const LW = sheets['Anfragen'].data, rw = LW.find(r => r[0] === wl.id);
assert.strictEqual(rw[LW[0].indexOf('Termin')], 'flexibel 01.11.2026–15.11.2026');
console.log('ok wished date: fixed day, flexible window in the sheet');

// 5e. office e-mails carry a direct link into the admin
mails.length = 0;
const dl = post({action: 'quick', consent: true, t: 9000, lang: 'de', form: {service: 'moves', name: 'Link Test', phone: '0201 1', email: ''}});
assert(dl.ok && mails.some(m => m.body.indexOf('Im Admin öffnen: ' + ctx.ADMIN_URL + '?a=' + dl.id) >= 0), 'admin link in the office mail');
console.log('ok office mail links to the admin request');

// 6. rate limit
for (let i = 0; i < 70; i++) post({action: 'route', from: 'Essen Hbf', to: 'Bochum Hbf'});
console.log('ok rate limit:', post({action: 'route', from: 'a b c d', to: 'e f g h'}).error);
console.log('ALL OK');
