/* Mocked Apps Script services (SpreadsheetApp, CacheService, …) for the backend tests. */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const REPO = path.resolve(__dirname, '../..');
const chain = () => new Proxy(function () {}, {get: (t, k) => k === 'build' ? () => ({}) : () => chain(), apply: () => chain()});

const sheets = {};
function Sheet(name) {
  this.name = name; this.data = [];
  this.getName = () => name;
  this.appendRow = r => { this.data.push(r.slice()); };
  this.getLastRow = () => this.data.length;
  this.getLastColumn = () => Math.max(0, ...this.data.map(r => r.length));
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
  this.getColumn = () => c; this.getLastColumn = () => c + nc - 1; this.getLastRow = () => r + nr - 1; this.setNote = n => { this.note = n; return this; };
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
  CacheService: {getScriptCache: () => ({get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; }, removeAll: ks => ks.forEach(k => { delete cache[k]; })})},
  PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }})},
  LockService: {getScriptLock: () => ({waitLock() {}, tryLock() { return true; }, releaseLock() {}})},
  Utilities: {
    base64EncodeWebSafe: b => Buffer.from(b).toString('base64url'), computeDigest: (a, s) => [...require('crypto').createHash('md5').update(s).digest()],
    DigestAlgorithm: {MD5: 1}, getUuid: () => require('crypto').randomUUID(), formatDate: () => '2026.10.11-1200',
    base64Encode: s => Buffer.from(s, 'utf8').toString('base64'), Charset: {UTF_8: 1},
    computeHmacSha256Signature: (v, k) => [...require('crypto').createHmac('sha256', Buffer.from(String(k))).update(Buffer.from(String(v))).digest()], sleep: () => {},
    base64Decode: s => { if (!/^[A-Za-z0-9+/=]+$/.test(s)) throw new Error('bad base64'); return [...Buffer.from(s, 'base64')]; },
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
vm.createContext(ctx);

/* Loads files from backend/<project> into the shared context. */
function load(project, files) { for (const f of files) vm.runInContext(fs.readFileSync(path.join(REPO, 'backend', project, f), 'utf8'), ctx, {filename: project + '/' + f}); }
const setActive = (sheet, row) => { ACTIVE_SHEET = sheet; ACTIVE_ROW = row; };
module.exports = {ctx, sheets, alerts, mails, puts, props, cache, REPO, load, setActive, ss};
