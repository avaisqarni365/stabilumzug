/**
 * Stabil Umzug – admin app (back office in the browser).
 *
 * Runs as the signed-in Google user ("execute as user accessing"), so Google handles the login and only people
 * the company sheet is shared with (as editors) get in. Everything is read from and written to that sheet.
 * Config.js (written by backend/deploy-backend.ps1) defines SHEET_ID, SITE_URL and PORTAL_URL.
 * Shared.js and Estimator.js are copies made by tools/build.py.
 */

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function doGet() {
  var email = Session.getActiveUser().getEmail() || '';
  var t, ok = false;
  try { ok = isEditor_(email); } catch (err) { ok = false; }
  t = HtmlService.createTemplateFromFile(ok ? 'Index' : 'NoAccess');
  t.email = email;
  t.siteUrl = typeof SITE_URL !== 'undefined' ? SITE_URL : DEFAULT_SITE;
  return t.evaluate().setTitle('Stabil Umzug – Admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* Only editors (and the owner) of the company sheet may use the admin. */
function isEditor_(email) {
  if (!email) return false;
  var s = ss_(), e = email.toLowerCase();
  if (s.getOwner && s.getOwner() && s.getOwner().getEmail().toLowerCase() === e) return true;
  return s.getEditors().some(function (u) { return u.getEmail().toLowerCase() === e; });
}
function guard_() {
  var email = Session.getActiveUser().getEmail();
  if (!isEditor_(email)) throw new Error('Kein Zugriff für ' + (email || 'unbekannt') + '.');
  return email;
}

function iso_(v) { return v instanceof Date ? v.toISOString() : (v == null ? '' : String(v)); }
/* Move date: a calendar day. Sheets turns "2026-11-07" into a Date at local midnight – format it in Berlin time, not UTC. */
function day_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Europe/Berlin', 'yyyy-MM-dd') : (v == null ? '' : String(v)); }

/* Lead row -> plain object with the fields the admin shows (dates as ISO strings: Apps Script cannot return Date objects). */
function leadObj_(v) {
  var g = function (n) { return v[LEAD_COLS.indexOf(n)]; };
  return {
    id: String(g('ID')), received: iso_(g('Eingang')), status: String(g('Status') || STATUS[0]), owner: String(g('Zuständig') || ''),
    total: g('Angebot €') === '' ? null : Number(g('Angebot €')), name: String(g('Name') || ''), phone: String(g('Telefon') || ''),
    email: String(g('E-Mail') || ''), channel: String(g('Kontaktweg') || ''), from: String(g('Von') || ''), to: String(g('Nach') || ''),
    kmFamily: String(g('km (Familie)') || ''), kmMaps: g('km (Maps)') === '' ? null : Number(g('km (Maps)')), minutes: g('Fahrzeit min') === '' ? null : Number(g('Fahrzeit min')),
    date: day_(g('Termin')), household: String(g('Haushalt') || ''), accOld: String(g('Zugang Auszug') || ''), accNew: String(g('Zugang Einzug') || ''),
    hvz: String(g('Halteverbot') || ''), rooms: String(g('Räume') || ''), count: g('Anzahl') === '' ? null : Number(g('Anzahl')),
    volMin: g('Volumen min m³') === '' ? null : Number(g('Volumen min m³')), volMax: g('Volumen max m³') === '' ? null : Number(g('Volumen max m³')),
    weight: String(g('Gewicht kg') || ''), vehicle: String(g('Fahrzeug') || ''), crew: String(g('Team') || ''), hours: String(g('Stunden') || ''),
    confidence: String(g('Vertrauen') || ''), source: String(g('Quelle') || ''), lang: String(g('Sprache') || 'DE'), message: String(g('Nachricht') || ''),
    ref: String(g('Referenz') || ''), service: String(g('Leistung') || 'Umzug (Planer)'), notes: String(g('Notizen') || ''),
    quoteSent: iso_(g('Angebot gesendet')), hasToken: !!g('Kundentoken')
  };
}

function allLeads_() {
  var sh = sheet_(TAB.leads), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, LEAD_COLS.length).getValues()
    .filter(function (v) { return v[0]; })
    .map(leadObj_)
    .reverse();   // newest first
}

/* ------------------------------------------------------------------ API used by Index.html (google.script.run) */

function api_bootstrap() {
  var email = guard_();
  ensureLeadHeader_();
  return {me: email, statuses: STATUS, leads: allLeads_(), sheetUrl: ss_().getUrl(), portal: typeof PORTAL_URL !== 'undefined' && !!PORTAL_URL};
}

function api_lead(id) {
  guard_();
  var hit = findLead_(id);
  if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
  var lead = leadObj_(hit.values);
  var items = sheet_(TAB.items).getDataRange().getValues().slice(1)
    .filter(function (r) { return String(r[0]) === String(id); })
    .map(function (r) { return {name: String(r[2]), size: String(r[3]), n: Number(r[4]) || 0, source: String(r[5]), vol: Number(r[7]) || 0}; });
  var R = rates_(), saved = latestQuote_(id), draft;
  if (saved) draft = {version: saved.version, lines: saved.lines, saved: true};
  else {
    var s = null;
    try { s = JSON.parse(hit.values[JSON_COL - 1] || '{}'); } catch (err) {}
    var q = quoteLines_(s, hit.values, masterFromSheet_(), R);
    draft = {version: 0, lines: q.lines, saved: false, range: q.est ? Math.round(masterFromSheet_().rules.range[q.est.conf] * 100) : null};
  }
  return {lead: lead, items: items, quote: draft, minPrice: R.min_price};
}

/* Status, owner and notes. Every change is written to the Protokoll tab. */
function api_update(id, patch) {
  var email = guard_();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var hit = findLead_(id); if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
    var sh = sheet_(TAB.leads), audit = sheet_(TAB.audit), now = new Date();
    var fields = {status: 'Status', owner: 'Zuständig', notes: 'Notizen'};
    Object.keys(fields).forEach(function (k) {
      if (patch[k] === undefined) return;
      var val = k === 'status' ? (STATUS.indexOf(patch[k]) >= 0 ? patch[k] : null) : cell_(patch[k], k === 'notes' ? 2000 : 60);
      if (val === null) return;
      var col = leadCol_(fields[k]), old = hit.values[col - 1];
      if (String(old) === String(val)) return;
      sh.getRange(hit.row, col).setValue(val);
      audit.appendRow([now, email, TAB.leads, id + ' · ' + fields[k], k === 'notes' ? '(Notiz)' : old, k === 'notes' ? '(Notiz geändert)' : val]);
    });
  } finally { lock.releaseLock(); }
  return api_lead(id).lead;
}

/* Saves the edited quote lines as a new version. lines: [[Position, Basis, Menge, Einheit, Satz], …] */
function api_saveQuote(id, lines) {
  var email = guard_();
  if (!Array.isArray(lines) || !lines.length || lines.length > 40) throw new Error('Ungültige Positionen.');
  var clean = lines.map(function (l) { return [clip_(l[0], 80), clip_(l[1], 160), Number(l[2]) || 0, clip_(l[3], 10), Number(l[4]) || 0]; })
    .filter(function (l) { return l[0]; });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var res;
  try {
    var R = rates_();
    res = writeQuote_(id, clean, masterVersion_() || 'sheet', R);
    var hit = findLead_(id);
    if (hit && hit.values[leadCol_('Status') - 1] === STATUS[0]) sheet_(TAB.leads).getRange(hit.row, leadCol_('Status')).setValue(STATUS[1]);
    sheet_(TAB.audit).appendRow([new Date(), email, TAB.quotes, id, '', 'Angebot v' + res.version + ': ' + res.total + ' €']);
  } finally { lock.releaseLock(); }
  return res;
}

/* Prepares the message for the customer and marks the quote as sent.
   Returns {text, wa, mail}: the browser opens WhatsApp or the mail app with the (editable) text. */
function api_sendQuote(id, text, channel) {
  var email = guard_();
  var hit = findLead_(id); if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
  var lead = leadObj_(hit.values), sh = sheet_(TAB.leads);
  sh.getRange(hit.row, leadCol_('Angebot gesendet')).setValue(new Date());
  if ([STATUS[0], STATUS[1]].indexOf(lead.status) >= 0) sh.getRange(hit.row, leadCol_('Status')).setValue(STATUS[2]);
  sheet_(TAB.audit).appendRow([new Date(), email, TAB.leads, id + ' · Angebot', '', 'gesendet per ' + (channel === 'mail' ? 'E-Mail' : 'WhatsApp')]);
  text = String(text || '').slice(0, 3000);   // keep line breaks (clip_ would remove them)
  return {
    wa: lead.phone ? 'https://wa.me/' + waNumber_(lead.phone) + '?text=' + encodeURIComponent(text) : '',
    mail: lead.email ? 'mailto:' + lead.email + '?subject=' + encodeURIComponent('Ihr Angebot ' + id + ' – Stabil Umzug') + '&body=' + encodeURIComponent(text) : '',
    sent: iso_(new Date())
  };
}

/* Personal customer link (used by the customer area). Created once per request. */
function api_customerLink(id) {
  guard_();
  if (typeof PORTAL_URL === 'undefined' || !PORTAL_URL) return '';
  var hit = findLead_(id); if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
  var col = leadCol_('Kundentoken'), token = String(hit.values[col - 1] || '');
  if (!token) { token = Utilities.getUuid().replace(/-/g, ''); sheet_(TAB.leads).getRange(hit.row, col).setValue(token); }
  return PORTAL_URL + '?id=' + encodeURIComponent(id) + '&k=' + token;
}

/* German phone numbers for wa.me: digits with country code. */
function waNumber_(phone) {
  var d = String(phone).replace(/[^\d+]/g, '');
  if (d.indexOf('+') === 0) return d.slice(1);
  if (d.indexOf('00') === 0) return d.slice(2);
  if (d.indexOf('0') === 0) return '49' + d.slice(1);
  return d;
}

function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
