/* Offers and invoices (backend/admin-script/Belege.js) against the mocked sheet.  Usage: node backend/test/belege.js */
const assert = require('assert');
const M = require('./mock');
const {ctx, sheets, mails} = M;

// a request from the website, then the admin app on the same sheet
M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js', 'Website.js']);
ctx.setup();
const post = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});
const lead = post({action: 'lead', lang: 'de', consent: true, t: 60000, contact: {name: 'Fam. Yilmaz', phone: '0201 123456', email: 'y@example.de', channel: 'email'},
  state: {ref: 'SU-B1', f1: {from: 'Karlstraße 32, 45329 Essen', to: 'Alleestr. 4, 44793 Bochum', km: '', dateMode: 'fixed', date: '2026-11-07', hh: 1},
    acc: {old: {floor: 2, lift: 0, park: 0}, 'new': {floor: 0, lift: 3, park: 0}}, hvz: true, rooms: [], inv: {sofa: {vi: 1, by: {pick: 1}}, carton: {vi: 0, by: {preset: 20}}}, customs: []}});
assert(lead.ok);
const LEAD = lead.id;

ctx.SHEET_ID = 'sheet'; ctx.PORTAL_URL = ''; ctx.SITE_URL = 'https://www.stabilumzug.de';
ctx.SpreadsheetApp.openById = () => M.ss;
M.ss.getEditors = () => [{getEmail: () => 'office@test'}];
M.ss.getOwner = () => ({getEmail: () => 'info@stabilumzug.de'});
ctx.Session.getActiveUser = () => ({getEmail: () => 'office@test'});
ctx.Utilities.formatDate = (d, tz, f) => d.toISOString().slice(0, 10);
const blob = name => ({name, setName(n) { this.name = n; return this; }, getAs() { return blob(this.name); }, getBytes: () => [37, 80, 68, 70]});
const rendered = [];
ctx.HtmlService = {createHtmlOutput: html => { rendered.push(html); return {getBlob: () => blob('x.html')}; }, createTemplateFromFile: () => ({evaluate: () => ({setTitle() { return this; }, addMetaTag() { return this; }})})};
const files = [];
const folder = {getId: () => 'F1', getFoldersByName: () => ({hasNext: () => false}), createFolder: () => folder,
  createFile: b => { const f = {getUrl: () => 'https://drive.google.com/file/' + files.length, getId: () => 'file' + files.length, getBlob: () => b}; files.push(b.name); return f; }};
ctx.DriveApp = {createFolder: () => folder, getFolderById: () => folder, getFileById: () => ({getBlob: () => blob('stored.pdf')})};
M.load('admin-script', ['Admin.js', 'Belege.js']);
ctx.CURRENT_ = {user: 'office', name: 'office@test'};
ctx.api_bootstrap_();

const near = (a, b) => assert(Math.abs(a - b) < 0.005, a + ' != ' + b);

// --- totals: gross prices, 19 %, discount, deposit, labour share
let t = ctx.docTotals_({priceMode: 'gross', small: false, discount: {type: 'pct', value: 10}, deposit: 100,
  lines: [{qty: 2, price: 59.5, vat: 19, labour: true}, {qty: 1, price: 107, vat: 7}]});
near(t.lines, 226); near(t.discount, 22.6); near(t.gross, 203.4); near(t.toPay, 103.4);
near(t.groups[0].net + t.groups[0].vat, 107.1); near(t.groups[0].vat, 17.1); near(t.groups[1].vat, 6.3);
near(t.labour, 107.1); near(t.labourVat, 17.1);
t = ctx.docTotals_({priceMode: 'net', small: false, discount: {type: 'eur', value: 0}, lines: [{qty: 3, price: 33.33, vat: 19}]});
near(t.net, 99.99); near(t.vat, 19); near(t.gross, 118.99);
t = ctx.docTotals_({priceMode: 'net', small: true, discount: {}, lines: [{qty: 1, price: 500, vat: 19}]});
near(t.vat, 0); near(t.gross, 500);
console.log('ok totals: gross/net, VAT per rate, discount, deposit, § 35a labour, small business');

// --- offer from the request: customer, lines from the quote suggestion, validity
let nr = ctx.api_docNew_('offer', LEAD);
let r = ctx.api_doc_(nr);
assert.strictEqual(r.doc.status, 'Entwurf'); assert.strictEqual(r.doc.to.name, 'Fam. Yilmaz');
assert.strictEqual(r.doc.to.street, 'Alleestr. 4'); assert.strictEqual(r.doc.to.city, '44793 Bochum');
assert(r.doc.lines.length >= 3 && r.doc.lines.some(l => l.labour), 'lines from the quote, labour flagged');
assert.strictEqual(r.doc.serviceFrom, '2026-11-07'); assert(r.doc.validUntil > r.doc.date);
assert(/Guten Tag Fam\. Yilmaz/.test(r.doc.intro));
assert(sheets['Belege'] && sheets['Belege'].data[0][0] === 'Nr', 'Belege tab created');
console.log('ok new offer: customer, address, lines and date taken from the request');

// --- save draft (cleaning), preview shows ENTWURF
r.doc.lines.push({title: '=HYPERLINK("x")', detail: 'Test', qty: 1, unit: 'Stk.', price: 10, vat: 99, disc: 0, labour: false});
r = ctx.api_docSave_(r.doc);
const last = r.doc.lines[r.doc.lines.length - 1];
assert.strictEqual(last.vat, 19, 'unknown VAT rate falls back to the standard rate');
let html = ctx.api_docPreview_(r.doc);
assert(/ENTWURF/.test(html) && /Gültig bis/.test(html) && /§ 35a EStG/.test(html));
console.log('ok draft: saved, VAT rates limited to 19/7/0, preview marked ENTWURF');

// --- issue offer -> AN-2026-0001, PDF in Drive, frozen
r = ctx.api_docIssue_(r.doc);
const offerNr = r.doc.nr;
assert.strictEqual(offerNr, 'AN-' + r.doc.date.slice(0, 4) + '-0001');
assert(r.doc.pdf && files.length === 1);
assert.throws(() => ctx.api_docSave_(r.doc), /nicht geändert/);
assert.throws(() => ctx.api_docDelete_(offerNr), /Nur Entwürfe/);
console.log('ok offer issued: ' + offerNr + ', PDF stored, cannot be changed or deleted');

// --- send by e-mail with PDF -> request "Angebot raus"; accept -> "Gebucht"
r = ctx.api_docSend_(offerNr, {to: 'y@example.de', subject: 'Ihr Angebot', body: 'Hallo'});
const m = mails.pop();
assert.strictEqual(m.to, 'y@example.de'); assert.strictEqual(m.attachments.length, 1); assert(/\.pdf$/.test(m.attachments[0].name));
assert.strictEqual(r.doc.status, 'Gesendet');
assert.strictEqual(ctx.leadObj_(ctx.findLead_(LEAD).values).status, 'Angebot raus');
r = ctx.api_docOffer_(offerNr, true);
assert.strictEqual(r.doc.status, 'Angenommen'); assert.strictEqual(ctx.leadObj_(ctx.findLead_(LEAD).values).status, 'Gebucht');
console.log('ok offer sent with PDF, accepted, request booked');

// --- invoice from the offer: checks before issuing
nr = ctx.api_docCopy_(offerNr, 'invoice');
r = ctx.api_doc_(nr);
assert.strictEqual(r.doc.type, 'invoice'); assert.strictEqual(r.doc.ref, offerNr); assert(r.doc.due > r.doc.date);
assert(r.problems.some(p => /IBAN/.test(p)), 'IBAN required for bank transfer');
assert.throws(() => ctx.api_docIssue_(r.doc), /IBAN/);
ctx.api_companySave_({iban: 'DE02 1001 0010 0006 8201 01', bank: 'Testbank', bic: 'PBNKDEFF'});
r.doc.serviceFrom = '';
assert.throws(() => ctx.api_docIssue_(r.doc), /Leistungsdatum/);
r.doc.serviceFrom = '2026-11-07';
r = ctx.api_docIssue_(r.doc);
const invNr = r.doc.nr;
assert.strictEqual(invNr, 'RE-' + r.doc.date.slice(0, 4) + '-0001');
html = rendered[rendered.length - 1];
['Rechnungsnummer', invNr, 'Leistungsdatum', '07.11.2026', 'USt-IdNr. DE458214531', 'IBAN DE02 1001 0010 0006 8201 01', 'Umsatzsteuer 19 %', 'Zahlbar bis', 'Verwendungszweck: ' + invNr]
  .forEach(s => assert(html.indexOf(s) >= 0, 'invoice shows ' + s));
console.log('ok invoice: needs IBAN and date of service, issued as ' + invNr + ' with all § 14 UStG details');

// --- payments: partial, then full -> Bezahlt, request Erledigt
const gross = r.doc.totals.toPay;
r = ctx.api_docPay_(invNr, {amount: 100, date: '2026-11-10', method: 'Bar'});
assert.strictEqual(r.doc.status, 'Teilbezahlt');
r = ctx.api_docPay_(invNr, {amount: gross - 100, date: '2026-11-12', method: 'Überweisung'});
assert.strictEqual(r.doc.status, 'Bezahlt');
assert.strictEqual(ctx.leadObj_(ctx.findLead_(LEAD).values).status, 'Erledigt');
console.log('ok payments: partial then full, invoice paid, request done');

// --- cancellation: Storno with negative lines and its own number; original unchanged but marked
const stNr = ctx.api_docCancel_(invNr, 'Falsche Anschrift');
assert.strictEqual(stNr, 'RE-' + r.doc.date.slice(0, 4) + '-0002');
const st = ctx.api_doc_(stNr).doc, orig = ctx.api_doc_(invNr).doc;
near(st.totals.gross, -orig.totals.gross);
assert.strictEqual(st.ref, invNr); assert.strictEqual(orig.status, 'Storniert'); assert.strictEqual(orig.cancelledBy, stNr);
assert.deepStrictEqual(orig.lines.map(l => l.qty), st.lines.map(l => -l.qty));
assert.throws(() => ctx.api_docCancel_(invNr), /bereits storniert/);
console.log('ok cancellation: ' + stNr + ' mirrors ' + invNr + ' with negative amounts');

// --- deposit then final invoice deducts it
nr = ctx.api_docNew_('deposit', LEAD);
r = ctx.api_doc_(nr);
r.doc.lines = [{title: 'Abschlag 30 %', detail: 'auf Angebot ' + offerNr, qty: 1, unit: 'Pausch.', price: 300, vat: 19, disc: 0, labour: false}];
r = ctx.api_docIssue_(r.doc);
const finNr = ctx.api_docCopy_(r.doc.nr, 'final');
const fin = ctx.api_doc_(finNr).doc;
near(fin.deposit, 300); assert.strictEqual(fin.type, 'final');
console.log('ok deposit invoice ' + r.doc.nr + ', final invoice draft deducts 300 €');

// --- list for the overview
const list = ctx.api_docs_().docs;
assert(list.length >= 5 && list.some(x => x.status === 'Storniert') && list.some(x => x.status === 'Entwurf'));
// small business: no VAT on the document
ctx.api_companySave_({small: 'ja'});
nr = ctx.api_docNew_('offer', LEAD);
r = ctx.api_doc_(nr);
html = ctx.api_docPreview_(r.doc);
assert(/§ 19 UStG/.test(html) && !/zzgl\. Umsatzsteuer/.test(html));
ctx.api_companySave_({small: 'nein'});
console.log('ok overview list; small-business documents carry the § 19 note and no VAT');

// --- pre-agreement without a price: the Jobcenter pays; PDF to the customer and the office; the offer goes to the payer
const preState = {ref: 'SU-V1', f1: {from: 'Altenessener Str. 10, 45326 Essen', to: 'Hauptstr. 5, 45879 Gelsenkirchen', km: '', dateMode: 'flex', date: '', hh: 0},
  acc: {old: {floor: 3, lift: 0, park: 1}, 'new': {floor: 1, lift: 3, park: 0}}, hvz: false, rooms: [{r: 'living', sqm: '18'}],
  inv: {sofa: {vi: 1, by: {pick: 1, list: 1}}, carton: {vi: 0, by: {preset: 15}}}, customs: [{name: 'Aquarium <groß>', n: 1, l: 100, b: 40, h: 50, v: 0.2}],
  payer: {kind: 2, name: 'Jobcenter Essen, Standort Altenessen', ref: '123A456789', email: 'jc@example.de'}, pre: true};
const preLead = Object.assign({action: 'lead', lang: 'de', consent: true, t: 60000, contact: {name: 'Herr Demir', phone: '0170 1112223', email: '', channel: 'email'}}, {state: preState});
assert.strictEqual(post(preLead).error, 'pre_email', 'the pre-agreement needs an e-mail address');
preLead.contact = Object.assign({}, preLead.contact, {email: 'demir@example.de'});
mails.length = 0; rendered.length = 0;
const pv = post(preLead);
assert(pv.ok && pv.pre === true, JSON.stringify(pv));
const preHtml = rendered.find(h => /Vorvereinbarung zum Umzug/.test(h));
assert(preHtml, 'pre-agreement rendered');
assert(!/€|EUR|Preis:/.test(preHtml.replace(/ohne Preis|keinen Preis|Angebot mit Preis/g, '')), 'no price in the pre-agreement');
assert(/Jobcenter Essen, Standort Altenessen/.test(preHtml) && /123A456789/.test(preHtml) && /Leistungsempfänger/.test(preHtml));
assert(/Sofa/.test(preHtml) && /Aquarium &lt;groß&gt;/.test(preHtml), 'items listed and escaped');
assert.strictEqual((preHtml.match(/<td class="n">\d+<\/td><td>Sofa/g) || []).length, 1, 'same item from two sources listed once');
assert(/Zugestimmt:<\/b> Herr Demir/.test(preHtml));
const cust = mails.find(m => m.to === 'demir@example.de'), office = mails.find(m => m.to !== 'demir@example.de');
assert(cust && /^Ihre Vorvereinbarung V-A-\d+/.test(cust.subject) && cust.attachments[0].name === 'Vorvereinbarung-V-' + pv.id + '.pdf');
assert(office && /Vorvereinbarung$/.test(office.subject) && office.attachments.length === 1 && /Kostenträger: Jobcenter: Jobcenter Essen/.test(office.body));
const prow = sheets['Anfragen'].data.find(r => r[0] === pv.id), H = sheets['Anfragen'].data[0];
assert(/^Jobcenter: Jobcenter Essen, Standort Altenessen · Az\. 123A456789 · jc@example\.de$/.test(prow[H.indexOf('Kostenträger')]));
assert(/^V-A-\d+ zugestimmt am /.test(prow[H.indexOf('Vorvereinbarung')]));
nr = ctx.api_docNew_('offer', pv.id);
r = ctx.api_doc_(nr);
assert.strictEqual(r.doc.to.company, 'Jobcenter Essen, Standort Altenessen'); assert.strictEqual(r.doc.to.email, 'jc@example.de');
assert(/Leistungsempfänger: Herr Demir, Altenessener Str\. 10/.test(r.doc.ref) && /123A456789/.test(r.doc.ref) && /Vorvereinbarung V-A-/.test(r.doc.ref), r.doc.ref);
assert(!/Guten Tag Herr Demir/.test(r.doc.intro), 'letter to the office, not to the customer');
// paying themselves: no payer, offer to the customer as before
const self = post(Object.assign({}, preLead, {state: Object.assign({}, preState, {payer: {kind: 0, name: 'x'}, pre: false})}));
assert(self.ok && !self.pre);
assert.strictEqual(sheets['Anfragen'].data.find(x => x[0] === self.id)[H.indexOf('Kostenträger')], 'Selbstzahler');
assert.strictEqual(ctx.api_doc_(ctx.api_docNew_('offer', self.id)).doc.to.name, 'Herr Demir');
console.log('ok pre-agreement: needs e-mail, no price, items once, PDF to customer and office, offer addressed to the Jobcenter');
console.log('ALL OK');
