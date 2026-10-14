/* Local preview of the admin app: the real admin pages (Index.html, BelegeUi, TermineUi) and the real
   backend code (Admin.js, Belege.js, Termine.js, Code.js, Website.js) on the mocked sheet, with realistic
   test data. google.script.run is answered by this server. No Google account, no real e-mails (mails are
   only collected).  Usage: node backend/test/preview.js  →  http://localhost:8090  */
const http = require('http'), fs = require('fs'), path = require('path');
const M = require('./mock');
const {ctx, sheets, mails, REPO} = M;

// real date formatting (the mock's formatDate returns a constant)
const pad = n => String(n).padStart(2, '0');
ctx.Utilities.formatDate = (d, tz, f) => {
  d = new Date(d);
  return f.replace(/yyyy|MM|dd|HH|H|mm|ss|EEE/g, k => ({yyyy: d.getFullYear(), MM: pad(d.getMonth() + 1), dd: pad(d.getDate()), HH: pad(d.getHours()),
    H: d.getHours(), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()), EEE: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]})[k]);
};
ctx.Utilities.newBlob = (data, type, name) => blob(name, type);
const blob = (name, type) => ({name, type, setName(n) { this.name = n; return this; }, getAs() { return blob(this.name, 'application/pdf'); }, getBytes: () => [37, 80, 68, 70], getContentType: () => type});
ctx.HtmlService = {
  createHtmlOutput: html => ({getBlob: () => blob('x.html'), getContent: () => html}),
  createHtmlOutputFromFile: name => ({getContent: () => fs.readFileSync(path.join(REPO, 'backend/admin-script', name + '.html'), 'utf8')}),
  createTemplateFromFile: () => ({evaluate: () => ({setTitle() { return this; }, addMetaTag() { return this; }})})
};
const files = [];
const folder = {getId: () => 'F1', getFoldersByName: () => ({hasNext: () => false}), createFolder: () => folder,
  createFile: b => { files.push(b.name); return {getUrl: () => 'https://drive.google.com/file/' + files.length, getId: () => 'file' + files.length, getBlob: () => b}; }};
ctx.DriveApp = {createFolder: () => folder, getFolderById: () => folder, getFileById: () => ({getBlob: () => blob('stored.pdf')})};
const events = [];
ctx.CalendarApp = {getDefaultCalendar: () => ({createEvent: (t) => { events.push(t); return {getId: () => 'ev' + events.length}; },
  getEventById: () => ({deleteEvent() {}, setTime() {}})})};

// website side: creates the requests, bookings and visits
M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js', 'Website.js']);
ctx.setup();
const post = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});
const get = p => ctx.doGet({parameter: p});
const base = {ref: 'SU-P1', f1: {from: 'Rüttenscheider Str. 12, 45130 Essen', to: 'Alleestr. 4, 44793 Bochum', km: '', dateMode: 'fixed', date: '', hh: 1},
  acc: {old: {floor: 2, lift: 0, park: 1}, 'new': {floor: 0, lift: 2, park: 0}}, hvz: true, rooms: [{r: 'living', sqm: '24'}, {r: 'bedroom', sqm: ''}, {r: 'kitchen', sqm: ''}],
  inv: {sofa: {vi: 1, by: {pick: 1}}, 'wardrobe-l': {vi: 0, by: {pick: 1}}, carton: {vi: 0, by: {preset: 30}}, bed: {vi: 1, by: {pick: 1}}, washer: {vi: 0, by: {pick: 1}}},
  customs: [{name: 'Aquarium 200 l', n: 1, l: 100, b: 40, h: 50, v: 0.2}], src: {utm_source: 'google', utm_medium: 'cpc'}};
const day = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const lead = (name, extra, contact) => post({action: 'lead', lang: 'de', consent: true, t: 60000,
  contact: Object.assign({name, phone: '0170 ' + Math.floor(1e6 + Math.random() * 9e6), email: name.toLowerCase().replace(/[^a-z]/g, '') + '@example.de', channel: 'whatsapp', note: ''}, contact || {}),
  state: Object.assign(JSON.parse(JSON.stringify(base)), extra)});
const L1 = lead('Familie Yilmaz', {f1: Object.assign({}, base.f1, {dateMode: 'fixed', date: day(24)})}, {note: 'Klavier im Wohnzimmer, 3. Stock ohne Aufzug.'});
const L2 = lead('Herr Demir', {f1: Object.assign({}, base.f1, {from: 'Altenessener Str. 10, 45326 Essen', to: 'Hauptstr. 5, 45879 Gelsenkirchen', dateMode: 'flex', dateFrom: day(20), dateTo: day(34)}),
  payer: {kind: 2, name: 'Jobcenter Essen, Standort Altenessen', ref: '123A456789', email: 'jc@example.de'}, pre: true});
const L3 = lead('Anna Schmidt', {f1: Object.assign({}, base.f1, {dateMode: 'flex', dateFrom: day(40)})});
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
post({action: 'photos', id: L3.id, k: L3.up, note: 'Keller und Dachboden', images: [{type: 'image/jpeg', data: jpg}, {type: 'image/jpeg', data: jpg}, {type: 'image/jpeg', data: jpg}]});
const Q1 = post({action: 'quick', consent: true, t: 9000, lang: 'de', src: {ref: 'google.com'},
  form: {service: 'clearance', name: 'Frau Wagner', phone: '0201 555123', email: 'wagner@example.de', rooms: '3', from: 'Karlstraße 32, 45329 Essen', to: '', date: day(10), message: 'Keller und Dachboden entrümpeln, ca. 15 m³.'}});
post({action: 'quick', consent: true, t: 9000, lang: 'en', form: {service: 'moves', name: 'John Miller', phone: '+49 171 5550000', email: 'john@example.com', rooms: '2', from: 'Essen-Werden', to: 'Düsseldorf', date: '', message: 'Moving from a 2-room flat, flexible in November.'}});
// bookings on the next free working days
const S = get({action: 'slots', type: 'all'});
const free = t => S.types[t].days.filter(d => d.slots.length);
const book = (type, d, time, name, extra) => post(Object.assign({action: 'book', type, date: d.date, time, t: 20000, consent: true, lang: 'de', name, phone: '0171 1234567',
  email: name.toLowerCase().replace(/[^a-z]/g, '') + '@example.de', address: 'Kettwiger Str. 5, 45127 Essen', to: 'Mülheim', message: ''}, extra || {}));
book('visit', free('visit')[0], '10:00', 'Familie Kaya', {message: 'Bitte vorher kurz anrufen.'});
book('video', free('video')[1], '15:30', 'Herr Becker');
book('call', free('call')[2], '09:00', 'Frau Özdemir');
// visits for the traffic dashboard
[['/', 'Google', 'Handy'], ['/', 'direkt', 'Computer'], ['/umzuege/', 'WhatsApp', 'Handy'], ['/umzugsplaner/', 'Google', 'Handy'], ['/termin/', 'Google', 'Computer'], ['/kontakt/', 'direkt', 'Handy']]
  .forEach(([p, s, dv], i) => { for (let k = 0; k <= i; k++) post({action: 'hit', p, s, d: dv, l: 'de', e: 1}); });
ctx.flushHits();

// admin side
ctx.SHEET_ID = 'sheet'; ctx.PORTAL_URL = 'https://www.stabilumzug.de/mein-umzug/'; ctx.SITE_URL = 'https://www.stabilumzug.de';
ctx.SpreadsheetApp.openById = () => M.ss;
M.ss.getEditors = () => [{getEmail: () => 'office@stabilumzug.test'}];
M.ss.getOwner = () => ({getEmail: () => 'info.stabilumzug@gmail.com'});
M.ss.getUrl = () => 'https://docs.google.com/spreadsheets/d/preview';
M.load('admin-script', ['Admin.js', 'Belege.js', 'Termine.js']);
// local test user for the login screen (only in this preview, never in the real sheet)
const PREVIEW_USER = 'test', PREVIEW_PASS = 'preview-1234';
ctx.usersSheet_().appendRow([PREVIEW_USER, 'Test Büro', 'ja', PREVIEW_PASS, '', '', '']);
ctx.CURRENT_ = {user: PREVIEW_USER, name: 'Test Büro'};
ctx.api_bootstrap_();
// an offer to the Jobcenter (pre-agreement) and an issued invoice for the first family
const nr = ctx.api_docNew_('offer', L2.id);
ctx.api_docNew_('offer', L1.id);
ctx.CURRENT_ = null;
console.log('preview data:', sheets['Anfragen'].data.length - 1, 'requests,', (sheets['Termine'] || {data: [1]}).data.length - 1, 'appointments, offer', nr);

// the page: Index.html with the two includes, google.script.run answered by POST /api/<fn>
const dir = path.join(REPO, 'backend/admin-script');
const read = n => fs.readFileSync(path.join(dir, n), 'utf8');
const STUB = `<script>
window.google = {script: {history: {replace: (s, p) => { const q = new URLSearchParams(p || {}).toString(); history.replaceState(null, '', '/' + (q ? '?' + q : '') + location.hash); }},
  run: (function make(ok, bad) {
  return new Proxy({}, {get: (t, fn) => fn === 'withSuccessHandler' ? (f => make(f, bad)) : fn === 'withFailureHandler' ? (f => make(ok, f))
    : (...args) => fetch('/api/' + fn, {method: 'POST', body: JSON.stringify(args)}).then(r => r.json())
        .then(r => r.error ? (bad && bad(new Error(r.error))) : (ok && ok(r.result)), e => bad && bad(e))});
})()}};
</script>`;
function page(url) {
  const q = new URL(url, 'http://x').searchParams, p = {}; q.forEach((v, k) => { p[k] = v; });
  const start = ctx.startPage_(p);
  return read('Index.html').replace('<?!= JSON.stringify(start || \'\') ?>', JSON.stringify(start)).replace(/<\?= siteUrl \?>/g, 'https://www.stabilumzug.de')
    .replace(/<\?!= include_\('(\w+)'\) \?>/g, (m, n) => read(n + '.html')).replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1">' + STUB);
}
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/api/')) {
    let body = '';
    req.on('data', c => body += c).on('end', () => {
      const fn = req.url.slice(5);
      let out;
      try {
        if (['api', 'login', 'logout'].indexOf(fn) < 0) throw new Error('unknown ' + fn);   // like Apps Script: only public functions
        out = {result: JSON.parse(JSON.stringify(ctx[fn].apply(null, JSON.parse(body || '[]')) ?? null))};
      } catch (err) { out = {error: String(err && err.message || err)}; }
      res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(out));
    });
    return;
  }
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(page(req.url));
}).listen(8090, '127.0.0.1', () => console.log('admin preview on http://localhost:8090'));
