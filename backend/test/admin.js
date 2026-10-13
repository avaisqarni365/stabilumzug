/* Runs backend/admin-script/Admin.js against the mocked sheet.  Usage: node backend/test/admin.js */
const assert = require('assert');
const M = require('./mock');
const {ctx, sheets} = M;

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

// access
ctx.doGet(); assert.strictEqual(shown.pop(), 'Index');
user = 'stranger@example.com';
ctx.doGet(); assert.strictEqual(shown.pop(), 'NoAccess');
assert.throws(() => ctx.api_bootstrap(), /Kein Zugriff/);
user = 'info.stabilumzug@gmail.com';   // the owner always gets in
ctx.doGet(); assert.strictEqual(shown.pop(), 'Index');
user = 'office@test';
console.log('ok access: editors and owner in, others get the no-access page');

// list
const boot = JSON.parse(JSON.stringify(ctx.api_bootstrap()));
assert.strictEqual(boot.leads.length, 2);
assert.strictEqual(boot.leads[0].id, quick.id, 'newest first');
assert.deepStrictEqual(boot.statuses, ['Neu', 'In Arbeit', 'Angebot raus', 'Gebucht', 'Erledigt', 'Verloren']);
const pl = boot.leads.find(l => l.id === planner.id);
assert.strictEqual(pl.service, 'Umzug (Planer)');
assert.strictEqual(pl.date, '2026-11-07');
assert.strictEqual(boot.leads[0].service, 'Entrümpelung (Kurzformular)');
console.log('ok list:', boot.leads.map(l => l.id + ' ' + l.service + ' ' + l.status).join(' | '));

// detail with suggested quote
let d = JSON.parse(JSON.stringify(ctx.api_lead(planner.id)));
assert(!d.quote.saved && d.quote.lines.length === 8 && d.items.length === 2);
assert.strictEqual(d.quote.lines[5][0], 'Halteverbotszone');
const dq = JSON.parse(JSON.stringify(ctx.api_lead(quick.id)));
assert.strictEqual(dq.quote.lines[0][0], 'Arbeit');
assert.strictEqual(dq.quote.lines[0][2], 0, 'short form: quantities to fill in');
console.log('ok detail: planner suggestion', d.quote.lines.length, 'lines, range ±' + d.quote.range + ' %; short form gets placeholders');

// status, owner, notes (+ audit, formula guard)
const auditBefore = sheets['Protokoll'].data.length;
const up = ctx.api_update(planner.id, {status: 'In Arbeit', owner: 'Ibo', notes: '=Klavier im 3. OG', bogus: 'x'});
assert.strictEqual(up.status, 'In Arbeit'); assert.strictEqual(up.owner, 'Ibo'); assert.strictEqual(up.notes, "'=Klavier im 3. OG");
assert.strictEqual(sheets['Protokoll'].data.length - auditBefore, 3);
ctx.api_update(planner.id, {status: 'Unsinn'});
assert.strictEqual(ctx.api_lead(planner.id).lead.status, 'In Arbeit', 'unknown status ignored');
console.log('ok update: status/owner/notes saved, 3 audit rows');

// save quote
const lines = d.quote.lines.map(l => l.slice()); lines[0][2] = 10; lines.push(['Klavier', 'Pauschale', 1, 'Stk.', 150]);
const saved = ctx.api_saveQuote(planner.id, lines);
const expect = Math.max(390, Math.round(lines.reduce((a, l) => a + l[2] * l[4], 0) * 100) / 100);
assert.strictEqual(saved.version, 1); assert.strictEqual(saved.total, expect);
d = JSON.parse(JSON.stringify(ctx.api_lead(planner.id)));
assert(d.quote.saved && d.quote.version === 1 && d.quote.lines.length === 9 && d.lead.total === expect);
assert.strictEqual(ctx.api_saveQuote(planner.id, lines).version, 2);
assert.throws(() => ctx.api_saveQuote(planner.id, []), /Ungültige/);
console.log('ok quote: v1 total', saved.total, '€, v2 saved, empty rejected');

// customer link + send
const link = ctx.api_customerLink(planner.id);
assert(/^https:\/\/www\.stabilumzug\.de\/mein-umzug\/\?id=A-\d+&k=[0-9a-f]{32}$/.test(link), link);
assert.strictEqual(ctx.api_customerLink(planner.id), link, 'same link every time');
const sent = ctx.api_sendQuote(planner.id, 'Hallo Fam. Yilmaz,\nIhr Angebot: 900 €', 'wa');
assert(sent.wa.startsWith('https://wa.me/49201123456?text=Hallo%20Fam.%20Yilmaz%2C%0AIhr'), sent.wa);
assert(sent.mail.startsWith('mailto:y@example.de?subject='));
const after = ctx.api_lead(planner.id).lead;
assert.strictEqual(after.status, 'Angebot raus'); assert(after.quoteSent);
assert(ctx.api_sendQuote(quick.id, 'x', 'wa').wa.startsWith('https://wa.me/491715550000?'), '+49 number');
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
const mailsBefore = M.mails.length;
assert.strictEqual(postA({action: 'accept', id: planner.id, k: tok, confirm: true}).status, 'Gebucht');
assert.strictEqual(ctx.api_lead(planner.id).lead.status, 'Gebucht');
assert.strictEqual(M.mails.length, mailsBefore + 1, 'office notified');
assert(postA({action: 'accept', id: planner.id, k: tok, confirm: true}).already);
console.log('ok portal: token-protected view without notes, accept needs confirmation, booked once, office mailed');
const m0 = M.mails.length;
assert(postA({action: 'resend', email: 'Y@Example.de'}).ok);
assert.strictEqual(M.mails.length, m0 + 1); assert(M.mails[M.mails.length - 1].body.includes('k=' + tok));
assert(postA({action: 'resend', email: 'y@example.de'}).ok); assert.strictEqual(M.mails.length, m0 + 1, 'throttled');
assert(postA({action: 'resend', email: 'nobody@example.de'}).ok); assert.strictEqual(M.mails.length, m0 + 1, 'unknown: no mail, same answer');
assert.strictEqual(postA({action: 'resend', email: 'nope'}).error, 'email');
console.log('ok resend: link mailed once per 10 min, unknown address gets the same answer');
console.log('ALL OK');
