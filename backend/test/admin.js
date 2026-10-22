/* Runs backend/admin-script/Admin.js against the mocked sheet.  Usage: node backend/test/admin.js */
const assert = require('assert');
const M = require('./mock');
const {ctx, sheets, cache} = M;

// sheet with two requests, created through the website API
M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js', 'Website.js']);
ctx.setup();
const post = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});
const planner = post({action: 'lead', lang: 'de', consent: true, t: 60000, contact: {name: 'Fam. Yilmaz', phone: '0201 123456', email: 'y@example.de', channel: 'whatsapp'},
  state: {ref: 'SU-A1', f1: {from: 'Karlstraße 32, Essen', to: 'Alleestr. 4, Bochum', km: '', dateMode: 'fixed', date: '2026-11-07', hh: 1},
    acc: {old: {floor: 2, lift: 0, park: 0}, 'new': {floor: 0, lift: 3, park: 0}}, hvz: true, rooms: [], inv: {sofa: {vi: 1, by: {pick: 1}}, carton: {vi: 0, by: {preset: 20}}}, customs: []}});
const quick = post({action: 'quick', lang: 'en', consent: true, t: 9000, form: {service: 'clearance', name: 'Ms Test', phone: '+49 171 5550000', rooms: '2', from: 'Essen', date: ''}});
assert(planner.ok && quick.ok);

// admin app on top of the same sheet
ctx.SHEET_ID = 'sheet';
ctx.PORTAL_URL = 'https://www.stabilumzug.de/mein-umzug/';
ctx.SITE_URL = 'https://www.stabilumzug.de';
ctx.SpreadsheetApp.openById = () => M.ss;
M.ss.getEditors = () => [{getEmail: () => 'office@test'}];
M.ss.getOwner = () => ({getEmail: () => 'info.stabilumzug@gmail.com'});
let user = 'office@test';
ctx.Session.getActiveUser = () => ({getEmail: () => user});
ctx.Utilities.formatDate = (d, tz, f) => f === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : '2026-10-11';
const shown = [];
ctx.HtmlService = {createTemplateFromFile: name => ({evaluate: () => { shown.push(name); const o = {setTitle: () => o, addMetaTag: () => o}; return o; }})};
M.load('admin-script', ['Admin.js']);

// access: login with username and password from the "Benutzer" tab, every call through api()
ctx.doGet(); assert.strictEqual(shown.pop(), 'Index');
assert.strictEqual(typeof ctx.api_bootstrap, 'undefined', 'admin functions are private');
assert.strictEqual(typeof ctx.api_bootstrap_, 'function');
const us = ctx.usersSheet_();
assert.strictEqual(us.getRange(1, 1, 1, 7).getValues()[0].join('|'), ctx.USER_COLS.join('|'));
us.appendRow(['office', 'Office Test', 'ja', 'geheim123', '', '', '']);
us.appendRow(['alt', 'Ehemalig', 'nein', 'geheim123', '', '', '']);
us.appendRow(['kurz', 'Kurz', 'ja', 'abc', '', '', '']);
assert.strictEqual(ctx.login('office', 'falsch1234').error, 'login');
let lg = ctx.login(' Office ', 'geheim123');
assert(lg.ok && /^[0-9a-f]{64}$/.test(lg.token) && lg.name === 'Office Test', JSON.stringify(lg));
let urow = us.getRange(2, 1, 1, 7).getValues()[0];
assert.strictEqual(urow[3], '', 'typed password cleared'); assert(urow[4].length > 20 && urow[5].length === 32, 'hash and salt stored');
assert(urow[4].indexOf('geheim') < 0);
assert(ctx.login('office', 'geheim123').ok, 'second login from the hash');
assert.strictEqual(ctx.login('alt', 'geheim123').error, 'login', 'inactive user');
assert.strictEqual(ctx.login('kurz', 'abc').error, 'login', 'too short password is not accepted');
assert.strictEqual(us.getRange(4, 4).getValue(), '', 'short password cleared too');
assert.strictEqual(ctx.login('niemand', 'geheim123').error, 'login', 'unknown user: same answer');
// lockout after 5 wrong tries
for (let i = 0; i < 4; i++) ctx.login('office', 'x' + i + 'xxxxxxx');
assert.strictEqual(ctx.login('office', 'falsch999').error, 'locked');
assert.strictEqual(ctx.login('office', 'geheim123').error, 'locked', 'locked even with the right password');
cache['admfail_office'] = undefined; delete cache['admfail_office'];
const ltok = lg.token;
const bootA = ctx.api(ltok, 'api_bootstrap', []);
assert.strictEqual(bootA.me, 'Office Test');
assert.throws(() => ctx.api('0'.repeat(64), 'api_bootstrap', []), /LOGIN/);
assert.throws(() => ctx.api('', 'api_bootstrap', []), /LOGIN/);
assert.throws(() => ctx.api(ltok, 'login', []), /Unbekannte/);
assert.throws(() => ctx.api(ltok, 'api_bootstrap_', []), /Unbekannte/);
assert.throws(() => ctx.api(ltok, 'constructor', []), /Unbekannte/);
assert.throws(() => ctx.api_bootstrap_(), /LOGIN/, 'private functions need a session too');
us.getRange(2, 3).setValue('nein');
ctx.CacheService.getScriptCache().remove('admok_office');   // the active check is cached for a minute
assert.throws(() => ctx.api(ltok, 'api_bootstrap', []), /LOGIN/, 'deactivated in the sheet: out within a minute');
us.getRange(2, 3).setValue('ja');
lg = ctx.login('office', 'geheim123'); assert(lg.ok);
ctx.logout(lg.token);
assert.throws(() => ctx.api(lg.token, 'api_bootstrap', []), /LOGIN/, 'logged out');
console.log('ok login: hashed passwords, inactive users, lockout, sessions, logout, only api() reaches the data');
ctx.CURRENT_ = {user: 'office', name: 'Office Test'};   // direct calls below act as the logged-in user

// list
const boot = JSON.parse(JSON.stringify(ctx.api_bootstrap_()));
assert.strictEqual(boot.leads.length, 2);
assert.strictEqual(boot.leads[0].id, quick.id, 'newest first');
assert.deepStrictEqual(boot.statuses, ['Neu', 'In Arbeit', 'Angebot raus', 'Gebucht', 'Erledigt', 'Verloren']);
const pl = boot.leads.find(l => l.id === planner.id);
assert.strictEqual(pl.service, 'Umzug (Planer)');
assert.strictEqual(pl.date, '2026-11-07');
assert.strictEqual(boot.leads[0].service, 'Entrümpelung (Kurzformular)');
console.log('ok list:', boot.leads.map(l => l.id + ' ' + l.service + ' ' + l.status).join(' | '));

// detail with suggested quote
let d = JSON.parse(JSON.stringify(ctx.api_lead_(planner.id)));
assert(!d.quote.saved && d.quote.lines.length === 8 && d.items.length === 2);
assert.strictEqual(d.quote.lines[5][0], 'Halteverbotszone');
const dq = JSON.parse(JSON.stringify(ctx.api_lead_(quick.id)));
assert.strictEqual(dq.quote.lines[0][0], 'Arbeit');
assert.strictEqual(dq.quote.lines[0][2], 0, 'short form: quantities to fill in');
console.log('ok detail: planner suggestion', d.quote.lines.length, 'lines, range ±' + d.quote.range + ' %; short form gets placeholders');

// status, owner, notes (+ audit, formula guard)
const auditBefore = sheets['Protokoll'].data.length;
const up = ctx.api_update_(planner.id, {status: 'In Arbeit', owner: 'Ibo', notes: '=Klavier im 3. OG', bogus: 'x'});
assert.strictEqual(up.status, 'In Arbeit'); assert.strictEqual(up.owner, 'Ibo'); assert.strictEqual(up.notes, "'=Klavier im 3. OG");
assert.strictEqual(sheets['Protokoll'].data.length - auditBefore, 3);
assert.strictEqual(ctx.api_lead_(planner.id).lead.status, 'In Arbeit', 'unknown status ignored');
const upHo = ctx.api_update_(planner.id, {handover: {hvz: true, truck: true, note: 'Hofparken'}});
assert.deepStrictEqual(JSON.parse(JSON.stringify(upHo.handover)), {hvz: true, truck: true, note: 'Hofparken'});
console.log('ok update: status/owner/notes and handover checklist saved');

// save quote
const lines = d.quote.lines.map(l => l.slice()); lines[0][2] = 10; lines.push(['Klavier', 'Pauschale', 1, 'Stk.', 150]);
const saved = ctx.api_saveQuote_(planner.id, lines);
const expect = Math.max(390, Math.round(lines.reduce((a, l) => a + l[2] * l[4], 0) * 100) / 100);
assert.strictEqual(saved.version, 1); assert.strictEqual(saved.total, expect);
d = JSON.parse(JSON.stringify(ctx.api_lead_(planner.id)));
assert(d.quote.saved && d.quote.version === 1 && d.quote.lines.length === 9 && d.lead.total === expect);
assert.strictEqual(ctx.api_saveQuote_(planner.id, lines).version, 2);
assert.throws(() => ctx.api_saveQuote_(planner.id, []), /Ungültige/);
console.log('ok quote: v1 total', saved.total, '€, v2 saved, empty rejected');

// customer link + send
const link = ctx.api_customerLink_(planner.id);
assert(/^https:\/\/www\.stabilumzug\.de\/mein-umzug\/\?id=A-\d+&k=[0-9a-f]{32}$/.test(link), link);
assert.strictEqual(ctx.api_customerLink_(planner.id), link, 'same link every time');
const sent = ctx.api_sendQuote_(planner.id, 'Hallo Fam. Yilmaz,\nIhr Angebot: 900 €', 'wa');
assert(sent.wa.startsWith('https://wa.me/49201123456?text=Hallo%20Fam.%20Yilmaz%2C%0AIhr'), sent.wa);
assert(sent.mail.startsWith('mailto:y@example.de?subject='));
const after = ctx.api_lead_(planner.id).lead;
assert.strictEqual(after.status, 'Angebot raus'); assert(after.quoteSent);
assert(ctx.api_sendQuote_(quick.id, 'x', 'wa').wa.startsWith('https://wa.me/491715550000?'), '+49 number');
console.log('ok send: WhatsApp/e-mail links, status Angebot raus, customer link', link.replace(/k=.*/, 'k=…'));
// customer area (website API; doGet is the admin's in this shared sandbox, so call portal_ directly)
const tok = link.split('k=')[1];
const pv = JSON.parse(JSON.stringify(ctx.portal_(planner.id, tok)));
assert(pv.ok && pv.quote && pv.quote.lines.length > 0 && pv.quote.total > 0, JSON.stringify(pv).slice(0, 200));
assert(!('notes' in pv) && !JSON.stringify(pv).includes('Klavier im 3. OG'), 'no internal notes');
assert.strictEqual(pv.date, '2026-11-07');
assert.strictEqual(ctx.portal_(planner.id, 'f'.repeat(32)).error, 'not_found');
assert.strictEqual(ctx.portal_(planner.id, 'x').error, 'not_found');
const postA = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok}).error, 'confirm');
assert.strictEqual(postA({action: 'accept', id: planner.id, k: 'f'.repeat(32), confirm: true}).error, 'not_found');
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok, confirm: true, sig: 'data:image/png;base64,' + 'A'.repeat(41000)}).error, 'sig', 'too large: refused before anything is written');
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok, confirm: true, sig: 'javascript:alert(1)'}).error, 'sig');
assert.notStrictEqual(ctx.api_lead_(planner.id).lead.status, 'Gebucht', 'a refused signature does not book');
const mailsBefore = M.mails.length;
// F9: moving day and payment are part of the booking
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok, confirm: true, sig: SIG, signer: 'Herr Yilmaz'}).error, 'payment', 'payment method required');
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok, confirm: true, sig: SIG, signer: 'Herr Yilmaz', payment: 'transfer', date: '2020-01-01'}).error, 'date_past');
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok, confirm: true, sig: SIG, signer: 'Herr Yilmaz', payment: 'gold'}).error, 'payment');
assert.notStrictEqual(ctx.api_lead_(planner.id).lead.status, 'Gebucht', 'refused bookings do not book');
const pv0 = ctx.portal_(planner.id, tok);
assert.strictEqual(pv0.dateMode, 'fixed'); assert.strictEqual(pv0.payer, false); assert.strictEqual(pv0.booking, null);
const acceptRes = postA({action: 'accept', id: planner.id, k: tok, confirm: true, sig: SIG, signer: 'Herr Yilmaz', payment: 'cash', date: '2026-11-10'});
assert.strictEqual(JSON.stringify(acceptRes.booking), JSON.stringify({date: '2026-11-10', payment: 'cash'}));
assert.strictEqual(ctx.api_lead_(planner.id).lead.date, '2026-11-10', 'the confirmed day is the job date');
assert(M.mails.some(m => /Umzugstag: 10\.11\.2026 \(vom Kunden geändert/.test(m.body)), 'office sees the changed day');
assert(M.mails.some(m => /Zahlung: Bar am Umzugstag/.test(m.body)), 'customer and office see the payment');
const pv1 = ctx.portal_(planner.id, tok);
assert.strictEqual(JSON.stringify(pv1.booking), JSON.stringify({date: '2026-11-10', payment: 'cash'})); assert(/^data:image/.test(pv1.signature), 'signature shown from its own tab');
assert.strictEqual(acceptRes.status, 'Gebucht');
assert.strictEqual(ctx.api_lead_(planner.id).lead.status, 'Gebucht');
assert.strictEqual(M.mails.length, mailsBefore + 2, 'office and customer notified');
assert(M.mails.some(m => m.subject.includes('digital signiert')));
assert(M.mails.some(m => m.subject.includes('Auftragsbestätigung')));
assert.strictEqual(ctx.api_lead_(planner.id).lead.contract.signed, true);
assert.strictEqual(ctx.api_lead_(planner.id).lead.contract.signer, 'Herr Yilmaz');
assert(sheets['Unterschriften'].data.some(r => r[0] === planner.id && /^data:image\/png/.test(r[3])), 'signature in its own tab');
assert(!('sigData' in ctx.api_lead_(planner.id).lead.contract) && ctx.api_lead_(planner.id).lead.contract.sigStored === true);
assert(postA({action: 'accept', id: planner.id, k: tok, confirm: true}).already);
console.log('ok portal: token-protected view without notes, accept needs confirmation, digital contract signed, booked once, office and customer mailed');
const m0 = M.mails.length;
assert(postA({action: 'resend', email: 'Y@Example.de'}).ok);
assert.strictEqual(M.mails.length, m0 + 1); assert(M.mails[M.mails.length - 1].body.includes('k=' + tok));
assert(postA({action: 'resend', email: 'y@example.de'}).ok); assert.strictEqual(M.mails.length, m0 + 1, 'throttled');
assert(postA({action: 'resend', email: 'nobody@example.de'}).ok); assert.strictEqual(M.mails.length, m0 + 1, 'unknown: no mail, same answer');
assert.strictEqual(postA({action: 'resend', email: 'nope'}).error, 'email');
console.log('ok resend: link mailed once per 10 min, unknown address gets the same answer');
// direct links: only safe values open a page
assert.strictEqual(ctx.startPage_({a: 'A-2603'}), 'a/A-2603');
assert.strictEqual(ctx.startPage_({b: 'AN-2026-0001'}), 'beleg/AN-2026-0001');
assert.strictEqual(ctx.startPage_({t: '1'}), 'termine');
assert.strictEqual(ctx.startPage_({p: '1'}), 'planer');
assert.strictEqual(ctx.startPage_({p: 'A-2601'}), 'planer?id=A-2601');
assert.strictEqual(ctx.startPage_({h: '1'}), 'hilfe');
assert.strictEqual(ctx.startPage_({a: '"><script>'}), '');
assert.strictEqual(ctx.startPage_({}), '');
console.log('ok direct links (?a= / ?b= / ?t= / ?p= / ?h=)');

// planner master and save
const pm = ctx.api_plannerMaster_();
assert(pm.master && pm.rates && pm.company && Array.isArray(pm.leads));
const pSave = ctx.api_plannerSave_({
  contact: {name: 'Test Kunde', phone: '0171 9999999', email: 'test@example.de'},
  f1: {from: 'Essen', to: 'Bochum', km: '20', date: '2026-12-01', dateMode: 'fixed', hh: 1},
  acc: {old: {floor: 1, lift: 0, park: 0}, 'new': {floor: 1, lift: 0, park: 0}},
  hvz: true,
  inv: {sofa: {vi: 0, by: {pick: 1}}, carton: {vi: 0, by: {pick: 10}}}
}, 'lead');
assert(pSave.ok && pSave.leadId && pSave.type === 'lead');
console.log('ok planner: master data and lead creation verified');

// 1-click publishing of catalog and master data from admin to GitHub Pages
const pubRes = ctx.api_publishWebsite_();
assert(pubRes.ok && pubRes.version && pubRes.count > 0);
console.log('ok admin publish: version', pubRes.version, '| items', pubRes.count);

// every file the admin page includes, and every script, is on the upload whitelist (.claspignore) – a missing one breaks the live admin
{ const fs = require('fs'), path = require('path'), dir = path.join(M.REPO, 'backend/admin-script'), ignore = fs.readFileSync(path.join(dir, '.claspignore'), 'utf8');
  const allowed = new Set(ignore.split(/\r?\n/).filter(l => l.startsWith('!')).map(l => l.slice(1).trim()));
  const inc = [...fs.readFileSync(path.join(dir, 'Index.html'), 'utf8').matchAll(/include_\('(\w+)'\)/g)].map(m => m[1] + '.html');
  const scripts = fs.readdirSync(dir).filter(f => /\.(js|html)$/.test(f) && f !== 'Config.js');
  const missing = [...new Set(inc.concat(scripts))].filter(f => !allowed.has(f));
  assert.deepStrictEqual(missing, [], 'not uploaded by clasp: ' + missing.join(', '));
  const wdir = path.join(M.REPO, 'backend/apps-script'), wign = fs.readFileSync(path.join(wdir, '.claspignore'), 'utf8');
  const wmissing = fs.readdirSync(wdir).filter(f => /\.js$/.test(f) && !wign.includes('!' + f));
  assert.deepStrictEqual(wmissing, [], 'website files not uploaded: ' + wmissing.join(', '));
  console.log('ok upload whitelist covers', inc.length, 'includes and', scripts.length, 'files'); }

// F9: a flexible request – the customer picks a day inside the wished window; a Jobcenter request needs no payment choice
{ const L = ctx.LEAD_COLS, row = (termin, meta) => L.map(c => c === 'Termin' ? termin : c === 'Daten (JSON)' ? JSON.stringify(meta) : '');
  const flex = {values: row('flexibel 03.12.2026–17.12.2026', {f1: {dateMode: 'flex', dateFrom: '2026-12-03', dateTo: '2026-12-17'}})};
  assert.strictEqual(ctx.bookingCheck_(flex, {payment: 'transfer'}).error, 'date', 'flexible: a day must be chosen');
  assert.strictEqual(ctx.bookingCheck_(flex, {payment: 'transfer', date: '2026-12-01'}).error, 'date_window');
  assert.strictEqual(ctx.bookingCheck_(flex, {payment: 'transfer', date: '2026-12-18'}).error, 'date_window');
  const okFlex = ctx.bookingCheck_(flex, {payment: 'transfer', date: '2026-12-10'});
  assert.strictEqual(okFlex.date + ' ' + okFlex.payment + ' ' + okFlex.moved, '2026-12-10 transfer false');
  const jc = {values: row('2026-12-05', {f1: {}, payer: {kind: 2, name: 'Jobcenter'}})};
  const okJc = ctx.bookingCheck_(jc, {});
  assert.strictEqual(okJc.date + ' ' + okJc.payment, '2026-12-05 payer', 'payer requests: paid by the payer, fixed day kept');
  console.log('ok booking: flexible window, payer, fixed day'); }

console.log('ALL OK');
