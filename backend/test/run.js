/* Runs backend/apps-script/Code.js + Estimator.js in Node with mocked Apps Script services.  Usage: node backend/test/run.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const REPO = process.argv[2] || path.resolve(__dirname, '../..');
const chain = () => new Proxy(function () {}, {get: (t, k) => k === 'build' ? () => ({}) : () => chain(), apply: () => chain()});

const sheets = {};
function Sheet(name) {
  this.name = name; this.data = [];
  this.getName = () => name;
  this.appendRow = r => { this.data.push(r.slice()); };
  this.getLastRow = () => this.data.length;
  this.getMaxRows = () => 1000;
  this.getRange = (r, c, nr, nc) => {
    if (typeof r === 'string') return new Range(this, 2, 3, 1, 1);
    return new Range(this, r, c, nr || 1, nc || 1);
  };
  this.getDataRange = () => new Range(this, 1, 1, this.data.length, Math.max(1, ...this.data.map(x => x.length)));
  this.getActiveRange = () => new Range(this, ACTIVE_ROW, 1, 1, 1);
  ['setFrozenRows', 'setColumnWidth', 'hideColumns', 'setConditionalFormatRules', 'deleteRow'].forEach(k => this[k] = (i) => { if (k === 'deleteRow') this.data.splice(i - 1, 1); });
}
function Range(sh, r, c, nr, nc) {
  let P;
  const row = i => { while (sh.data.length < r + i) sh.data.push([]); return sh.data[r - 1 + i]; };
  this.getRow = () => r;
  this.getValues = () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => { const x = (sh.data[r - 1 + i] || [])[c - 1 + j]; return x === undefined ? '' : x; }));
  this.getValue = () => { const v = this.getValues()[0][0]; return typeof v === 'string' && v.startsWith('=MAX(') ? FORMULA_RESULT(sh, v) : v; };
  this.setValues = vals => { vals.forEach((vr, i) => { const rr = row(i); vr.forEach((v, j) => { rr[c - 1 + j] = v; }); }); return P; };
  this.setValue = v => this.setValues([[v]]);
  this.setFormula = f => this.setValue(f);
  this.setFormulasR1C1 = fs => { fs.forEach((f, i) => { row(i)[c - 1] = '=Q*R'; }); return P; };
  this.getA1Notation = () => 'R' + r + 'C' + c;
  this.getSheet = () => sh;
  P = new Proxy(this, {get: (t, k) => k in t ? t[k] : () => P});
  return P;
}
function FORMULA_RESULT(sh, f) {
  const m = f.match(/^=MAX\((\d+(?:\.\d+)?),SUM\(J(\d+):J(\d+)\)\)$/); assert(m, 'formula format ' + f);
  let sum = 0; for (let i = +m[2]; i <= +m[3]; i++) { const r = sh.data[i - 1]; sum += (Number(r[6]) || 0) * (Number(r[8]) || 0); }
  return Math.max(+m[1], sum);
}
let ACTIVE_ROW = 2, ACTIVE_SHEET = null;
const ss = {
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = new Sheet(n)),
  getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST',
};
const alerts = [], mails = [], puts = [];
const cache = {}, props = {GITHUB_REPO: 'owner/repo', GITHUB_TOKEN: 'x'};
const ctx = {
  console,
  SpreadsheetApp: {
    getActive: () => ss, getActiveSheet: () => ACTIVE_SHEET, flush: () => {},
    newDataValidation: chain, newConditionalFormatRule: chain,
    getUi: () => ({alert: (...a) => alerts.push(a.join(' | ')), createMenu: chain, ButtonSet: {OK: 1}}),
  },
  CacheService: {getScriptCache: () => ({get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; }})},
  PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }})},
  LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
  Utilities: {
    base64EncodeWebSafe: b => Buffer.from(b).toString('base64url'), computeDigest: (a, s) => [...require('crypto').createHash('md5').update(s).digest()],
    DigestAlgorithm: {MD5: 1}, getUuid: () => require('crypto').randomUUID(), formatDate: () => '2026.10.11-1200',
    base64Encode: s => Buffer.from(s, 'utf8').toString('base64'), Charset: {UTF_8: 1},
  },
  Maps: {DirectionFinder: {Mode: {DRIVING: 'd'}}, newDirectionFinder: () => { const o = {}; ['setOrigin', 'setDestination', 'setMode', 'setRegion', 'setLanguage'].forEach(k => o[k] = () => o); o.getDirections = () => ({routes: [{legs: [{distance: {value: 23400}, duration: {value: 1680}}]}]}); return o; }},
  MailApp: {sendEmail: o => mails.push(o)},
  Session: {getEffectiveUser: () => ({getEmail: () => 'info.stabilumzug@gmail.com'}), getActiveUser: () => ({getEmail: () => 'office@test'})},
  UrlFetchApp: {fetch: (url, opt) => {
    if (url.startsWith('https://api.github.com/')) {
      if (opt && opt.method === 'put') { puts.push({url, body: JSON.parse(opt.payload)}); return {getResponseCode: () => 201, getContentText: () => '{}'}; }
      return {getResponseCode: () => 404, getContentText: () => '{}'};
    }
    if (url.endsWith('/data/master.json')) return {getContentText: () => fs.readFileSync(path.join(REPO, 'data/master.json'), 'utf8')};
    throw new Error('unexpected fetch ' + url);
  }},
  ScriptApp: {getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: chain},
  ContentService: {createTextOutput: s => ({setMimeType: () => JSON.parse(s)}), MimeType: {JSON: 1}},
};
vm.createContext(ctx);
for (const f of ['Estimator.js', 'Code.js']) vm.runInContext(fs.readFileSync(path.join(REPO, 'backend/apps-script', f), 'utf8'), ctx, {filename: f});

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
ACTIVE_SHEET = sheets['Anfragen']; ACTIVE_ROW = 2;
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

// 6. rate limit
for (let i = 0; i < 70; i++) post({action: 'route', from: 'Essen Hbf', to: 'Bochum Hbf'});
console.log('ok rate limit:', post({action: 'route', from: 'a b c d', to: 'e f g h'}).error);
console.log('ALL OK');
