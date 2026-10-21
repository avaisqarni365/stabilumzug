/**
 * Stabil Umzug – Google Sheet back end (Phase 1).
 *
 * The sheet is the database and the back office; this script is its small API:
 *   POST {action:'lead'}      a family sends the planner request  → Leads + Items rows, e-mail to the office
 *   POST {action:'route'}     distance between two addresses      → Google Maps (built-in service), cached
 *   POST {action:'saveDraft'} "continue on another device" link   → Drafts row (expires after 30 days)
 *   GET  ?action=draft        load such a draft
 *   GET  ?action=health       check that the deployment works
 * Menu "Stabil Umzug" in the sheet: set up tabs, calculate a quote for the selected lead,
 * publish the catalogue to the website (GitHub), install the triggers.
 *
 * Prices live only in the "Preise" tab and never leave the sheet.
 * Estimator.js is a copy of the website's estimator, so office and family see the same numbers.
 * Setup: see backend/README.md.
 */

/* Constants, sheet helpers, master data and quote logic live in Shared.js (copied from backend/shared). */
function ss_() { return SpreadsheetApp.getActive(); }

/* ------------------------------------------------------------------ web app */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'health') return json(p.pdf ? {ok: true, pdf: pdfCheck_()} : {ok: true, version: masterVersion_(), warm: PropertiesService.getScriptProperties().getProperty('WARM_TRIGGER') === '1', warmErr: PropertiesService.getScriptProperties().getProperty('WARM_ERR') || ''});
    if (p.action === 'draft') return json(loadDraft_(String(p.ref || ''), String(p.token || '')));
    if (p.action === 'portal') return json(portal_(String(p.id || ''), String(p.k || '')));
    if (p.action === 'slots') return json(slots_(String(p.type || '')));
    return json({ok: false, error: 'unknown_action'});
  } catch (err) {
    console.error(err);
    return json({ok: false, error: 'server'});
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json({ok: false, error: 'empty'});
    var size = e.postData.contents.length;
    if (size > PHOTO_MAX_BODY) return json({ok: false, error: 'too_large'});
    var body = JSON.parse(e.postData.contents);
    if (!body || typeof body !== 'object') return json({ok: false, error: 'empty'});
    if (size > 100000 && body.action !== 'photos') return json({ok: false, error: 'too_large'});   // only photo uploads may be larger
    if (!rateLimit_(body.action)) return json({ok: false, error: 'busy'});
    switch (body.action) {
      case 'lead': return json(saveLead_(body));
      case 'quick': return json(saveQuick_(body));
      case 'route': return json(route_(String(body.from || ''), String(body.to || '')));
      case 'routeMap': return json(routeMap_(body));
      case 'book': return json(book_(body));
      case 'photos': return json(photos_(body));
      case 'hit': return json(hit_(body));
      case 'saveDraft': return json(saveDraft_(body));
      case 'accept': return json(accept_(String(body.id || ''), String(body.k || ''), body.confirm === true, body.sig, body.signer, body.waiver === true));
      case 'resend': return json(resend_(String(body.email || ''), String(body.lang || 'de')));
      case 'chat': return json(aiChat_(body));
      default: return json({ok: false, error: 'unknown_action'});
    }
  } catch (err) {
    console.error(err);
    return json({ok: false, error: 'server'});
  }
}

/* ?action=health&pdf=1: can this project turn HTML into a PDF (the pre-agreement)? Writes nothing. */
function pdfCheck_() {
  try { return HtmlService.createHtmlOutput('<p>Test</p>').getBlob().getAs('application/pdf').getBytes().length > 0; }
  catch (err) { return String(err).slice(0, 120); }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* At most 60 requests per minute in total: enough for a moving company, a brake for scripts. */
/* Requests per minute for all visitors together, separately per kind: page views must never block a request form. */
var RATE = {hit: 600, write: 20, read: 60};
var WRITE_ACTIONS = ['lead', 'quick', 'book', 'photos', 'saveDraft', 'accept', 'resend', 'handover'];
function rateLimit_(action) {
  var kind = action === 'hit' ? 'hit' : WRITE_ACTIONS.indexOf(action) >= 0 ? 'write' : 'read';
  var cache = CacheService.getScriptCache(), key = 'rl_' + kind + '_' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= RATE[kind];
}

/* E-mails to an address a visitor typed in: at most 5 a day per address (protects strangers and the mail quota). */
function mailOk_(addr) {
  var a = String(addr || '').toLowerCase().trim();
  if (!a) return false;
  var cache = CacheService.getScriptCache(), key = 'ml_' + Utilities.base64EncodeWebSafe(a).slice(0, 200), n = Number(cache.get(key) || 0);
  if (n >= 5) return false;
  cache.put(key, String(n + 1), 86400);
  return true;
}

/* ------------------------------------------------------------------ leads */

function saveLead_(b) {
  if (b.hp) return {ok: true, id: 'A-0000'};                       // honeypot field filled: a bot, pretend success
  if (!(Number(b.t) > 4000)) return {ok: false, error: 'too_fast'};  // filled in under 4 seconds
  if (b.consent !== true) return {ok: false, error: 'consent'};
  var c = b.contact || {}, s = b.state || {};
  var name = clip_(c.name, 80), phone = clip_(c.phone, 40), email = clip_(c.email, 120);
  if (!name || (!phone && !email)) return {ok: false, error: 'contact'};
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok: false, error: 'email'};
  if (!s.f1 || !s.acc || typeof s.inv !== 'object') return {ok: false, error: 'state'};
  var payer = payer_(s.payer), pre = s.pre === true;
  if (pre && !email) return {ok: false, error: 'pre_email'};   // the pre-agreement is sent by e-mail

  var master = loadMaster_();
  var est = Estimator.estimate(s, master);
  var byId = {};
  master.items.forEach(function (it) { byId[it.id] = it; });

  var route = (s.f1.from && s.f1.to) ? route_(clip_(s.f1.from), clip_(s.f1.to)) : {ok: false};
  var lock = LockService.getScriptLock(), rows = [];
  lock.waitLock(20000);
  try {
    ensureLeadHeader_();
    var id = nextId_();
    var now = new Date();
    var acc = function (a) { return a ? FLOORS[a.floor] + ', ' + LIFTS[a.lift] + ', ' + PARKS[a.park] : ''; };
    var rooms = (s.rooms || []).map(function (r) { return (ROOM_DE[r.r] || clip_(r.r, 20)) + (String(r.sqm || '').trim() ? ' ' + clip_(r.sqm, 6) + ' m²' : ''); }).join(', ');
    var src = s.src || {};
    var srcTxt = [src.utm_source, src.utm_medium, src.utm_campaign, src.utm_term].filter(Boolean).join(' / ') || src.ref || (src.gclid ? 'Google Ads' : 'direkt');
    var date = moveDate_(s.f1);
    sheet_(TAB.leads).appendRow([
      id, now, STATUS[0], '', '', cell_(name, 80), cell_(phone, 40), cell_(email, 120), cell_(c.channel, 20),
      cell_(s.f1.from), cell_(s.f1.to), cell_(s.f1.km, 8), route.ok ? route.km : '', route.ok ? route.min : '',
      date, (s.f1.hhSet && HH[s.f1.hh]) || '', acc(s.acc.old), acc(s.acc['new']), s.hvz ? 'ja' : 'nein', cell_(rooms, 300),
      est.n, round_(est.volLow), round_(est.volHigh), Math.round(est.kgMin) + '–' + Math.round(est.kgMax),
      VEH_DE[est.vehicle] + (est.trips > 1 ? ' · ' + est.trips + ' Fahrten' : ''), est.crew, round_(est.hours),
      {high: 'Hoch', medium: 'Mittel', low: 'Niedrig'}[est.conf], master.version, cell_(srcTxt, 120), b.lang === 'en' ? 'EN' : 'DE',
      cell_(c.note, 1000), cell_(s.ref, 20), now, JSON.stringify(s).slice(0, 45000), 'Umzug (Planer)', '', '', '',
      cell_(payer.text, 300), pre ? 'V-' + id + ' zugestimmt am ' + Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy HH:mm') : ''
    ]);
    rows = [];
    Object.keys(s.inv).forEach(function (iid) {
      var e = s.inv[iid], it = byId[iid];
      if (!it || !e || !e.by) return;
      Object.keys(e.by).forEach(function (k) {
        var n = Math.max(0, Math.min(999, Number(e.by[k]) || 0));
        if (!n) return;
        var v = Estimator.itemVol(it, e.vi);
        rows.push([id, iid, it.de, it.vars ? it.vars[e.vi || 0].l : '', n, SRC_DE[k] || k, v, round_(n * v, 3)]);
      });
    });
    (s.customs || []).forEach(function (cu) {
      var n = Math.max(1, Math.min(99, Number(cu.n) || 1)), v = Math.max(0, Math.min(10, Number(cu.v) || 0));
      rows.push([id, 'custom', cell_(cu.name, 60), [cu.l, cu.b, cu.h].map(Number).join('×') + ' cm', n, SRC_DE.custom, round_(v, 3), round_(n * v, 3)]);
    });
    if (rows.length) {
      var sh = sheet_(TAB.items);
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, ITEM_COLS.length).setValues(rows);
    }
  } finally {
    lock.releaseLock();
  }
  var pdf = null;
  if (pre) {
    try {
      pdf = preAgreementPdf_({id: id, at: now, name: name, phone: phone, email: email, note: clip_(c.note, 1000), s: s, est: est, route: route, payer: payer, items: rows});
      preAgreementMail_(email, b.lang === 'en', id, name, pdf);
    } catch (err) { console.error(err); }
  }
  notifyOffice_(id, name, phone, email, s, est, route, payer, pdf);
  return {ok: true, id: id, km: route.ok ? route.km : null, up: photoToken_(id), pre: !!pdf};
}

/* Short form ("Jetzt kostenloses Angebot anfordern"): contact, service, rooms, from/to, date, message. */
function saveQuick_(b) {
  if (b.hp) return {ok: true, id: 'A-0000'};
  if (!(Number(b.t) > 3000)) return {ok: false, error: 'too_fast'};
  if (b.consent !== true) return {ok: false, error: 'consent'};
  var f = b.form || {};
  var name = clip_(f.name, 80), phone = clip_(f.phone, 40), email = clip_(f.email, 120);
  if (!name || (!phone && !email)) return {ok: false, error: 'contact'};
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok: false, error: 'email'};
  var service = SERVICE_DE[f.service] || SERVICE_DE.other;
  var from = clip_(f.from, 200), to = clip_(f.to, 200);
  var route = (from && to) ? route_(from, to) : {ok: false};
  var src = b.src || {};
  var srcTxt = [src.utm_source, src.utm_medium, src.utm_campaign].filter(Boolean).join(' / ') || src.ref || 'direkt';
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var id;
  try {
    ensureLeadHeader_();
    id = nextId_();
    var now = new Date(), row = [];
    LEAD_COLS.forEach(function () { row.push(''); });
    var set = function (col, v) { row[LEAD_COLS.indexOf(col)] = v; };
    set('ID', id); set('Eingang', now); set('Status', STATUS[0]);
    set('Name', cell_(name, 80)); set('Telefon', cell_(phone, 40)); set('E-Mail', cell_(email, 120)); set('Kontaktweg', clip_(f.channel, 20));
    set('Von', cell_(from)); set('Nach', cell_(to));
    if (route.ok) { set('km (Maps)', route.km); set('Fahrzeit min', route.min); }
    set('Termin', cell_(f.date, 10) || 'flexibel');
    set('Räume', f.rooms ? clip_(f.rooms, 6) + ' Zimmer' : '');
    set('Quelle', cell_(srcTxt, 120)); set('Sprache', b.lang === 'en' ? 'EN' : 'DE');
    set('Nachricht', cell_(f.message, 1000)); set('Einwilligung', now);
    set('Daten (JSON)', JSON.stringify({form: f, src: src}).slice(0, 45000));
    set('Leistung', service + ' (Kurzformular)');
    sheet_(TAB.leads).appendRow(row);
  } finally {
    lock.releaseLock();
  }
  var to_ = config_('notify_email') || Session.getEffectiveUser().getEmail();
  if (to_) {
    try {
      MailApp.sendEmail({to: to_, subject: 'Neue Anfrage ' + id + ' – ' + service + ' – ' + name, body: [
        'Neue Anfrage ' + id + ' über das Kurzformular', '', 'Leistung: ' + service, 'Name: ' + name, 'Telefon: ' + (phone || '—'), 'E-Mail: ' + (email || '—'),
        'Von: ' + (from || '—'), 'Nach: ' + (to || '—') + (route.ok ? ' (' + route.km + ' km)' : ''), 'Zimmer: ' + (f.rooms || '—'), 'Termin: ' + (f.date || 'flexibel'),
        '', clip_(f.message, 1000), '', adminLink_(id), 'Tabelle: ' + SpreadsheetApp.getActive().getUrl()].join('\n')});
    } catch (err) { console.error(err); }
  }
  return {ok: true, id: id, up: photoToken_(id)};
}

// nextId_() lives in Shared.js

function notifyOffice_(id, name, phone, email, s, est, route, payer, pdf) {
  var to = config_('notify_email') || Session.getEffectiveUser().getEmail();
  if (!to) return;
  var url = SpreadsheetApp.getActive().getUrl();
  var body = [
    'Neue Anfrage ' + id + ' über den Umzugsplaner', '',
    'Name: ' + name, 'Telefon: ' + (phone || '—'), 'E-Mail: ' + (email || '—'), '',
    'Von: ' + (s.f1.from || '—'), 'Nach: ' + (s.f1.to || '—') + (route.ok ? ' (' + route.km + ' km, ' + route.min + ' min)' : ''),
    'Wunschtermin: ' + moveDate_(s.f1, true),
    'Volumen: ' + round_(est.volLow) + '–' + round_(est.volHigh) + ' m³, ' + VEH_DE[est.vehicle] + ', ' + est.crew + ' Personen, ca. ' + round_(est.hours) + ' Std.',
    'Kostenträger: ' + (payer ? payer.text : 'Selbstzahler'),
    pdf ? 'Vorvereinbarung V-' + id + ' (ohne Preis) vom Kunden zugestimmt – PDF im Anhang. Angebot mit Preis ' + (payer && payer.kind ? 'an den Kostenträger richten.' : 'an den Kunden.') : '',
    '', adminLink_(id), 'Tabelle: ' + url
  ].join('\n');
  var mail = {to: to, subject: 'Neue Umzugsanfrage ' + id + ' – ' + name + (pdf ? ' – Vorvereinbarung' : ''), body: body};
  if (pdf) mail.attachments = [pdf];
  try { MailApp.sendEmail(mail); } catch (err) { console.error(err); }
}

/* ------------------------------------------------------------------ customer area ("Mein Umzug") */

/* The request behind a personal link, or null. The token is created by the admin when the quote is sent. */
function leadByToken_(id, k) {
  if (!id || !/^[0-9a-f]{32}$/.test(k)) return null;
  var hit = findLead_(id);
  if (!hit || String(hit.values[leadCol_('Kundentoken') - 1]) !== k) return null;
  return hit;
}

/* What the customer sees: no internal notes, no other customers' data. */
function portal_(id, k) {
  var hit = leadByToken_(id, k);
  if (!hit) return {ok: false, error: 'not_found'};
  var v = hit.values, g = function (n) { return v[leadCol_(n) - 1]; };
  var q = latestQuote_(id), lines = [];
  if (q) q.lines.forEach(function (l) { var a = Math.round(l[2] * l[4] * 100) / 100; if (a > 0) lines.push({pos: l[0], basis: l[1], amount: a}); });
  var name = String(g('Name') || '');
  var jsonMeta = {};
  try { jsonMeta = JSON.parse(v[JSON_COL - 1] || '{}'); } catch (e) {}
  var contract = jsonMeta.contract || null;
  return {
    ok: true, id: id, name: name, service: String(g('Leistung') || 'Umzug').replace(/ \((Planer|Kurzformular)\)$/, ''),
    status: String(g('Status') || STATUS[0]), date: day_(g('Termin')), from: String(g('Von') || ''), to: String(g('Nach') || ''),
    lang: String(g('Sprache') || 'DE'), quoteSent: iso_(g('Angebot gesendet')),
    quote: q ? {version: q.version, lines: lines, total: Number(g('Angebot €')) || quoteTotal_(q.lines, rates_().min_price)} : null,
    signedAt: contract ? contract.signedAt : null,
    signer: contract ? contract.signer : null,
    signature: contract ? (contract.sigData || contract.sigUrl) : null
  };
}

/* "Zahlungspflichtig beauftragen": the customer accepts and digitally signs the latest quote. */
function sigSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(TAB.signatures);
  if (!sh) { sh = ss.insertSheet(TAB.signatures); sh.appendRow(['Anfrage', 'Zeitpunkt', 'Name', 'Unterschrift (Bild als Data-URL)']); sh.setFrozenRows(1); }
  return sh;
}
var SIG_MAX = 40000;   // characters of the signature image (data URL); the phone sends a small JPEG

function accept_(id, k, confirm, sig, signer, waiver) {
  if (!confirm) return {ok: false, error: 'confirm'};
  sig = String(sig || '');
  if (sig && (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(sig) || sig.length > SIG_MAX)) return {ok: false, error: 'sig'};
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var hit, res;
  try {
    hit = leadByToken_(id, k);
    if (!hit) return {ok: false, error: 'not_found'};
    var status = String(hit.values[leadCol_('Status') - 1]);
    if (status === 'Gebucht' || status === 'Erledigt') return {ok: true, already: true, status: status};
    if (!latestQuote_(id)) return {ok: false, error: 'no_quote'};
    if (status === 'Verloren') return {ok: false, error: 'closed'};

    var now = new Date(), nowIso = iso_(now), nowDe = Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy HH:mm');
    var signerName = clip_(signer || hit.values[leadCol_('Name') - 1] || 'Kunde', 80);
    var sigUrl = '';
    if (sig && typeof DriveApp !== 'undefined') {
      try {
        var base64Data = String(sig).replace(/^data:image\/\w+;base64,/, '');
        var bytes = Utilities.base64Decode(base64Data);
        var folder = ensureDriveFolder_('Stabil Umzug - Verträge');
        if (folder) {
          var file = folder.createFile(Utilities.newBlob(bytes, 'image/png', id + '-unterschrift.png'));
          sigUrl = file.getUrl();
        }
      } catch (err) { console.error('Drive save signature err:', err); }
    }

    // the signature image has its own tab (a cell holds 50,000 characters; the request JSON already uses up to 45,000)
    if (sig) sigSheet_().appendRow([id, now, signerName, sig]);
    var jsonMeta = {};
    try { jsonMeta = JSON.parse(hit.values[JSON_COL - 1] || '{}'); } catch (e) {}
    jsonMeta.contract = {signed: true, signedAt: nowIso, signer: signerName, sigUrl: sigUrl, sigStored: !!sig, waiver: !!waiver};
    sheet_(TAB.leads).getRange(hit.row, JSON_COL).setValue(JSON.stringify(jsonMeta).slice(0, 49000));
    var colNote = leadCol_('Notizen'), oldNote = String(hit.values[colNote - 1] || '');
    var signNote = 'Vertrag digital gezeichnet von ' + signerName + ' am ' + nowDe + ' Uhr' + (waiver ? ' · vorzeitiger Beginn verlangt (§ 356 Abs. 4 BGB)' : '') + (sigUrl ? ' (Drive: ' + sigUrl + ')' : '');
    sheet_(TAB.leads).getRange(hit.row, colNote).setValue(cell_((oldNote ? oldNote + '\n' : '') + signNote, 2000));
    sheet_(TAB.leads).getRange(hit.row, leadCol_('Status')).setValue('Gebucht');   // last: only when everything above is saved

    sheet_(TAB.audit).appendRow([now, 'Kunde (' + signerName + ')', TAB.leads, id + ' · Status', status, 'Gebucht – digital unterschrieben']);
    res = {ok: true, status: 'Gebucht', signedAt: nowIso, signer: signerName, signature: sig || sigUrl};
  } finally { lock.releaseLock(); }

  var to = config_('notify_email') || Session.getEffectiveUser().getEmail();
  if (to) {
    var v = hit.values;
    try {
      MailApp.sendEmail({to: to, subject: 'Auftrag erteilt (digital signiert): ' + id + ' – ' + signerName,
        body: 'Der Kunde hat das Angebot ' + id + ' über „Mein Umzug“ rechtsverbindlich digital unterzeichnet.\n\nName: ' + signerName +
          '\nTelefon: ' + (v[leadCol_('Telefon') - 1] || '—') + '\nE-Mail: ' + (v[leadCol_('E-Mail') - 1] || '—') +
          '\nAngebot: ' + (v[leadCol_('Angebot €') - 1] || '—') + ' €' + (sigUrl ? '\nUnterschrift in Google Drive: ' + sigUrl : '') +
          '\n\n' + adminLink_(id) + '\n' + ss_().getUrl()});
    } catch (err) { console.error(err); }
  }

  var custEmail = String(hit.values[leadCol_('E-Mail') - 1] || '');
  if (custEmail) {
    try {
      var en = String(hit.values[leadCol_('Sprache') - 1]) === 'EN';
      MailApp.sendEmail({
        to: custEmail,
        name: 'Stabil Umzug',
        subject: en ? 'Contract Confirmation ' + id + ' – Stabil Umzug' : 'Auftragsbestätigung ' + id + ' – Stabil Umzug',
        body: (en ?
          'Hello ' + signerName + ',\n\nthank you for choosing Stabil Umzug! Your moving contract for request ' + id + ' has been successfully signed and booked.\n\n' +
          'Agreed price: ' + (hit.values[leadCol_('Angebot €') - 1] || '–') + ' €\n' +
          'We have reserved your moving date. Our office will contact you directly with any final details.\n\n' +
          'You can review your contract and moving checklist anytime in your personal portal:\nhttps://www.stabilumzug.de/en/my-move/?id=' + id + '&k=' + k +
          '\n\nKind regards,\nStabil Umzug · Karlstraße 32 · 45329 Essen · Phone & WhatsApp: 0163 9688190'
          :
          'Guten Tag ' + signerName + ',\n\nvielen Dank für Ihr Vertrauen! Ihr Umzugsauftrag zur Anfrage ' + id + ' wurde erfolgreich digital unterzeichnet und verbindlich gebucht.\n\n' +
          'Vereinbarter Gesamtpreis: ' + (hit.values[leadCol_('Angebot €') - 1] || '–') + ' €\n' +
          'Ihr Termin ist fest reserviert. Unser Büro bestätigt Ihnen die Details nochmals persönlich.\n\n' +
          'Ihren Vertragsstatus und Ihre Checkliste finden Sie jederzeit unter:\nhttps://www.stabilumzug.de/mein-umzug/?id=' + id + '&k=' + k +
          '\n\nViele Grüße\nStabil Umzug · Karlstraße 32 · 45329 Essen · Telefon & WhatsApp: 0163 9688190'
        )
      });
    } catch (err) { console.error('Cust email send err:', err); }
  }

  return res;
}

/* "Link vergessen?": e-mails the personal links for this address. Always answers ok, so nobody can probe addresses. */
function resend_(email, lang) {
  email = clip_(email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok: false, error: 'email'};
  var cache = CacheService.getScriptCache(), ck = 'rs_' + Utilities.base64EncodeWebSafe(email);
  if (cache.get(ck)) return {ok: true};
  cache.put(ck, '1', 600);   // at most one mail per address every 10 minutes
  var portal = String(config_('portal_url') || (DEFAULT_SITE + '/mein-umzug/'));
  var sh = sheet_(TAB.leads), n = sh.getLastRow(), links = [];
  if (n >= 2) {
    sh.getRange(2, 1, n - 1, LEAD_COLS.length).getValues().forEach(function (v) {
      var tok = String(v[leadCol_('Kundentoken') - 1] || '');
      if (tok && String(v[leadCol_('E-Mail') - 1]).toLowerCase() === email) links.push(v[0] + ': ' + portal + '?id=' + encodeURIComponent(v[0]) + '&k=' + tok);
    });
  }
  if (links.length && mailOk_(email)) {
    var en = lang === 'en';
    try {
      MailApp.sendEmail({to: email, subject: en ? 'Your Stabil Umzug link' : 'Ihr Link zu „Mein Umzug“ – Stabil Umzug',
        body: (en ? 'Here is your personal link to your quote and move status:\n\n' : 'Hier ist Ihr persönlicher Link zu Angebot und Umzugsstatus:\n\n') + links.join('\n') +
          (en ? '\n\nQuestions? Call or WhatsApp 0163 9688190.\nStabil Umzug · Karlstraße 32 · 45329 Essen' : '\n\nFragen? Telefon und WhatsApp 0163 9688190.\nStabil Umzug · Karlstraße 32 · 45329 Essen')});
    } catch (err) { console.error(err); }
  }
  return {ok: true};
}

/* ------------------------------------------------------------------ route (Google Maps, built in) */

function route_(from, to) {
  from = clip_(from, 200); to = clip_(to, 200);
  if (from.length < 4 || to.length < 4) return {ok: false, error: 'address'};
  var cache = CacheService.getScriptCache();
  var key = 'rt_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, from + '|' + to));
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var res;
  try {
    var d = Maps.newDirectionFinder().setOrigin(from).setDestination(to).setMode(Maps.DirectionFinder.Mode.DRIVING)
      .setRegion('de').setLanguage('de').getDirections();
    if (d && d.routes && d.routes.length) {
      var leg = d.routes[0].legs[0];
      res = {ok: true, km: Math.round(leg.distance.value / 1000), min: Math.round(leg.duration.value / 60)};
    } else res = {ok: false, error: 'not_found'};
  } catch (err) {
    console.error(err);
    res = {ok: false, error: 'maps'};
  }
  cache.put(key, JSON.stringify(res), 21600);
  return res;
}

/* Route check on the website (home page and service pages): distance, drive time and a map of the route.
   The map is a Google static map made here on the server – the visitor's browser never contacts Google, so no
   cookie banner is needed. Each check is logged in the Strecken tab with postcode and town only (no street). */
function routeMap_(b) {
  var from = clip_(b.from, 200), to = clip_(b.to, 200);
  if (from.length < 3 || to.length < 3) return {ok: false, error: 'address'};
  var cache = CacheService.getScriptCache(), now = new Date();
  // protect the daily Maps quota: at most 30 new checks a minute and 800 a day
  var mk = 'rm_m_' + Math.floor(now.getTime() / 60000), dk = 'rm_d_' + Utilities.formatDate(now, 'Europe/Berlin', 'yyyyMMdd');
  var key = 'rm_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, from.toLowerCase() + '|' + to.toLowerCase()));
  var res = null, hit = cache.get(key);
  if (hit) res = JSON.parse(hit);
  else {
    var perMin = Number(cache.get(mk)) || 0, perDay = Number(cache.get(dk)) || 0;
    if (perMin >= 30 || perDay >= 800) return {ok: false, error: 'busy'};
    cache.put(mk, String(perMin + 1), 120); cache.put(dk, String(perDay + 1), 90000);
    try {
      var d = Maps.newDirectionFinder().setOrigin(from).setDestination(to).setMode(Maps.DirectionFinder.Mode.DRIVING)
        .setRegion('de').setLanguage('de').getDirections();
      if (!d || !d.routes || !d.routes.length) return {ok: false, error: 'not_found'};
      var r = d.routes[0], leg = r.legs[0];
      res = {ok: true, km: Math.round(leg.distance.value / 1000), min: Math.round(leg.duration.value / 60),
        fromLabel: place_(leg.start_address || from), toLabel: place_(leg.end_address || to)};
      try {
        var map = Maps.newStaticMap().setSize(640, 360).setLanguage('de').setFormat(Maps.StaticMap.Format.PNG)
          .setPathStyle(6, '0xE85A0AFF', null).addPath(r.overview_polyline.points)
          .setMarkerStyle(Maps.StaticMap.MarkerSize.MID, '0x17304F', 'A').addMarker(leg.start_location.lat, leg.start_location.lng)
          .setMarkerStyle(Maps.StaticMap.MarkerSize.MID, '0xE85A0A', 'B').addMarker(leg.end_location.lat, leg.end_location.lng);
        res.map = 'data:image/png;base64,' + Utilities.base64Encode(map.getBlob().getBytes());
      } catch (err) { console.error(err); }
      try { cache.put(key, JSON.stringify(res), 21600); } catch (err) { var lite = JSON.parse(JSON.stringify(res)); delete lite.map; cache.put(key, JSON.stringify(lite), 21600); }
    } catch (err) {
      console.error(err);
      return {ok: false, error: 'maps'};
    }
  }
  try {
    var sh = ss_().getSheetByName(TAB.routes) || ensureTab_(TAB.routes, ROUTE_COLS, [130, 160, 160, 60, 90, 160, 70, 140]);
    sh.appendRow([now, cell_(res.fromLabel, 80), cell_(res.toLabel, 80), res.km, res.min, cell_(b.page, 80), b.lang === 'en' ? 'EN' : 'DE', cell_(b.src, 80)]);
  } catch (err) { console.error(err); }
  return res;
}

/* "Rüttenscheider Str. 12, 45130 Essen, Deutschland" -> "45130 Essen". Never returns the street. */
function place_(addr) {
  var a = String(addr || ''), m = a.match(/\b(\d{5})\s+([^,\d]+)/);
  if (m) return m[1] + ' ' + m[2].trim().replace(/-Stadtbezirke?\s+\S+$/, '');   // "Essen-Stadtbezirke V" -> "Essen"
  var parts = a.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && !/\d/.test(x) && !/^(deutschland|germany)$/i.test(x); });
  return parts.length ? parts[parts.length - 1].slice(0, 60) : '–';
}

/* ------------------------------------------------------------------ drafts (continue on another device) */

function saveDraft_(b) {
  if (b.consent !== true) return {ok: false, error: 'consent'};
  var s = b.state;
  if (!s || typeof s !== 'object' || !s.ref) return {ok: false, error: 'state'};
  var ref = clip_(s.ref, 20), token = clip_(b.token, 40);
  var sh = sheet_(TAB.drafts), data = sh.getDataRange().getValues();
  var now = new Date(), until = new Date(now.getTime() + 30 * 864e5), payload = JSON.stringify(s).slice(0, 45000);
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === ref && token && data[i][1] === token) {
      sh.getRange(i + 1, 3, 1, 3).setValues([[now, until, payload]]);
      return {ok: true, token: token, until: until.toISOString()};
    }
  }
  token = Utilities.getUuid().replace(/-/g, '');
  sh.appendRow([ref, token, now, until, payload]);
  return {ok: true, token: token, until: until.toISOString()};
}

function loadDraft_(ref, token) {
  if (!ref || !token) return {ok: false, error: 'missing'};
  var data = sheet_(TAB.drafts).getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === ref && data[i][1] === token) {
      if (new Date(data[i][3]) < new Date()) return {ok: false, error: 'expired'};
      return {ok: true, state: JSON.parse(data[i][4])};
    }
  }
  return {ok: false, error: 'not_found'};
}

/* ------------------------------------------------------------------ master data (Katalog + Regeln tabs) */

function loadMaster_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('master');
  if (hit) return JSON.parse(hit);
  if (sheet_(TAB.catalog).getLastRow() < 2) seedFromWebsite_();   // setup was interrupted: load the catalogue now
  var m = masterFromSheet_();
  try { cache.put('master', JSON.stringify(m), 3600); } catch (err) {}
  return m;
}

/* ------------------------------------------------------------------ quote (internal, C2 light) */

function quoteSelectedLead() {
  var ui = SpreadsheetApp.getUi(), sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== TAB.leads || sh.getActiveRange().getRow() < 2) { ui.alert('Bitte eine Zeile im Tab „' + TAB.leads + '“ markieren.'); return; }
  var vals = sh.getRange(sh.getActiveRange().getRow(), 1, 1, LEAD_COLS.length).getValues()[0];
  var id = vals[0], s = null;
  try { s = JSON.parse(vals[JSON_COL - 1] || '{}'); } catch (err) {}
  var master = loadMaster_(), R = rates_(), q = quoteLines_(s, vals, master, R);
  var res = writeQuote_(id, q.lines, master.version, R);
  if (vals[leadCol_('Status') - 1] === STATUS[0]) sh.getRange(sh.getActiveRange().getRow(), leadCol_('Status')).setValue(STATUS[1]);
  ui.alert('Angebot ' + id + ' v' + res.version, 'Summe: ' + Math.round(res.total) + ' €' +
    (q.est ? ' (Spanne ±' + Math.round(master.rules.range[q.est.conf] * 100) + ' %, Vertrauen ' + q.est.conf + ')' : ' – Kurzformular: Mengen bitte eintragen') + '.\n' +
    'Sätze und Mengen können im Tab „' + TAB.quotes + '“ oder im Admin-Bereich angepasst werden.', ui.ButtonSet.OK);
}

/* ------------------------------------------------------------------ publish catalogue to the website */

function publishCatalog() {
  var ui = SpreadsheetApp.getUi();
  try {
    var user = Session.getActiveUser().getEmail() || 'Tabelle';
    var res = publishCatalogCore_(user, ui);
    ui.alert('Veröffentlicht: Version ' + res.version + '. Die Website zeigt den neuen Katalog in wenigen Minuten.');
  } catch (err) {
    if (!ui) throw err;
  }
}

/* ------------------------------------------------------------------ setup, menu, triggers */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Stabil Umzug')
    .addItem('Angebot für markierte Anfrage berechnen', 'quoteSelectedLead')
    .addItem('Katalog auf der Website veröffentlichen', 'publishCatalog')
    .addSeparator()
    .addItem('Einrichten (Tabs, Startdaten, Trigger)', 'setup')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  ensureTab_(TAB.leads, LEAD_COLS, [70, 130, 110, 100, 80, 140, 120, 170, 90, 200, 200]);
  ensureTab_(TAB.items, ITEM_COLS);
  ensureTab_(TAB.quotes, QUOTE_COLS);
  ensureTab_(TAB.catalog, CAT_COLS, [90, 60, 190, 190, 200]);
  ensureTab_(TAB.settings, ['Schlüssel', 'Wert', 'Bedeutung']);
  ensureTab_(TAB.rates, ['Schlüssel', 'Bezeichnung', 'Wert', 'Einheit', 'Gültig ab']);
  ensureTab_(TAB.audit, AUDIT_COLS);
  ensureTab_(TAB.drafts, DRAFT_COLS);
  ensureTab_(TAB.config, ['Schlüssel', 'Wert']);
  ensureTab_(TAB.routes, ROUTE_COLS, [130, 160, 160, 60, 90, 160, 70, 140]);
  ensureTab_(TAB.appts, APPT_COLS, [70, 130, 90, 160, 90, 60, 70, 150, 120, 170, 220]);
  ensureTab_(TAB.visits, VISIT_COLS, [90, 220, 140, 90, 70, 70, 70]);

  var leads = sheet_(TAB.leads);
  var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build();
  leads.getRange(2, 3, leads.getMaxRows() - 1, 1).setDataValidation(statusRule);
  leads.getRange(2, 2, leads.getMaxRows() - 1, 1).setNumberFormat('dd.MM.yyyy HH:mm');
  var colors = {'Neu': '#ffe0d9', 'In Arbeit': '#fff2ef', 'Angebot raus': '#eae7e7', 'Gebucht': '#d7d3d3', 'Verloren': '#f8f4f4'};
  leads.setConditionalFormatRules(Object.keys(colors).map(function (k) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(colors[k]).setRanges([leads.getRange('C2:C')]).build();
  }));
  leads.hideColumns(JSON_COL);   // raw JSON

  var rates = sheet_(TAB.rates);
  if (rates.getLastRow() < 2) {
    var today = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy');
    rates.getRange(2, 1, DEFAULT_RATES.length, 5).setValues(DEFAULT_RATES.map(function (r) { return [r[0], r[1], r[2], r[3], today]; }));
    rates.getRange(1, 7).setValue('Platzhalter aus dem Design – durch eigene Werte ersetzen. Preise bleiben intern und erscheinen nie auf der Website.');
  }
  if (sheet_(TAB.catalog).getLastRow() < 2) seedFromWebsite_();
  // moved to Google Workspace: the old Gmail address in the copied sheet becomes the new business address
  var me = Session.getEffectiveUser().getEmail();
  ['notify_email', 'firma_email'].forEach(function (k) { if (OLD_EMAILS.indexOf(String(config_(k)).toLowerCase()) >= 0) setConfig_(k, me); });
  setConfig_('notify_email', config_('notify_email') || me);

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onEditAudit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('daily').timeBased().everyDays(1).atHour(7).create();
  ScriptApp.newTrigger('warmSlots').timeBased().everyMinutes(10).create();   // booking page: free times kept ready
  PropertiesService.getScriptProperties().setProperty('WARM_TRIGGER', '1');
  SpreadsheetApp.getUi().alert('Fertig. Nächster Schritt: Bereitstellen → Neue Bereitstellung → Web-App (siehe README).');
}

function ensureTab_(name, cols, widths) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#201e1d').setFontColor('#f3f2f2');
    sh.setFrozenRows(1);
    (widths || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}

/* First catalogue: read the website's public master.json (no prices) and write it into the Katalog and Regeln tabs. */
function seedFromWebsite_() {
  var props = PropertiesService.getScriptProperties();
  var repo = props.getProperty('GITHUB_REPO'), branch = props.getProperty('GITHUB_BRANCH') || 'main';
  var url = props.getProperty('SITE_URL') ? props.getProperty('SITE_URL').replace(/\/$/, '') + '/assets/data/master.json'
    : repo ? 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/data/master.json'
    : DEFAULT_SITE + '/assets/data/master.json';
  var m = JSON.parse(UrlFetchApp.fetch(url).getContentText());
  var rows = [];
  m.items.forEach(function (it) {
    var base = [it.de, it.en, (it.syn || []).join(', '), it.room];
    var tail = [it.dis || 0, it.asm || 0, it.crew || 1, it.fragile ? 'ja' : 'nein', 'ja'];
    if (it.vars) it.vars.forEach(function (v) { rows.push([it.id, v.l].concat(base, [v.v, v.kg[0], v.kg[1]], tail)); });
    else rows.push([it.id, ''].concat(base, [it.v, it.kg[0], it.kg[1]], tail));
  });
  sheet_(TAB.catalog).getRange(2, 1, rows.length, CAT_COLS.length).setValues(rows);
  var R = m.rules, settings = [
    ['buffer', R.buffer, 'Puffer auf das Volumen (0,10 = 10 %)'],
    ['range_high', R.range.high, 'Spanne bei Vertrauen Hoch (±)'], ['range_medium', R.range.medium, 'Spanne bei Mittel'], ['range_low', R.range.low, 'Spanne bei Niedrig'],
    ['weight_pick', R.weight.pick, 'Gewicht Katalog'], ['weight_custom', R.weight.custom, 'Gewicht eigene Gegenstände'], ['weight_list', R.weight.list, 'Gewicht Liste'],
    ['weight_photo', R.weight.photo, 'Gewicht Foto'], ['weight_preset', R.weight.preset, 'Gewicht Vorlage'], ['weight_guess', R.weight.guess, 'Gewicht Schätzung'],
    ['cap_sprinter', R.vehicles[0].cap, 'Kapazität Transporter m³'], ['cap_lkw75', R.vehicles[1].cap, 'Kapazität 7,5 t m³'], ['cap_lkw12', R.vehicles[2].cap, 'Kapazität 12 t m³'],
    ['default_km', R.defaultKm, 'km, wenn die Familie nichts angibt'], ['custom_density', R.customDensity, 'kg je m³ für eigene Gegenstände'],
    ['rooms', m.rooms.join(','), 'Räume (Schlüssel, Reihenfolge)'],
    ['presets', JSON.stringify(m.presets), 'Vorlagen: item_id → [Anzahl, Größen-Index]'],
    ['guess', JSON.stringify(m.guess), 'Schnellschätzung je Raum und Stufe']
  ];
  sheet_(TAB.settings).getRange(2, 1, settings.length, 3).setValues(settings);
  setConfig_('master_version', m.version);
}

/* Installable trigger: log every edit to catalogue, rules and prices (who, when, old, new). */
function onEditAudit(e) {
  var sh = e.range.getSheet(), name = sh.getName();
  if (name === TAB.users) {   // admin users: a typed password is encrypted at once and the cell cleared
    var pc = USER_COLS.indexOf('Neues Passwort') + 1;
    if (e.range.getColumn() <= pc && e.range.getLastColumn() >= pc) {
      for (var r = Math.max(2, e.range.getRow()); r <= e.range.getLastRow(); r++) {
        var v = sh.getRange(r, pc).getValue();
        if (v !== '') { var err = setUserPw_(sh, r, v); if (err) sh.getRange(r, pc).setNote(err); }
      }
    }
    return;
  }
  if ([TAB.catalog, TAB.settings, TAB.rates].indexOf(name) < 0) return;
  sheet_(TAB.audit).appendRow([new Date(), (e.user && e.user.getEmail()) || Session.getActiveUser().getEmail() || '?', name,
    e.range.getA1Notation(), e.oldValue == null ? '' : e.oldValue, e.value == null ? '(mehrere Zellen)' : e.value]);
  if (name !== TAB.rates) CacheService.getScriptCache().remove('master');
}

/* Daily at 07:00: delete expired drafts and remind the office of unanswered requests. */
/* Privacy promise (Datenschutz page): requests, their items and quotes, and appointments that did not lead to an order
   are deleted after 6 months. Kept: booked or finished requests and every request with an offer or invoice in "Belege"
   (statutory retention periods). Returns the number of deleted requests and appointments. */
function purgeOld_(now) {
  var cut = now.getTime() - 183 * 864e5, keep = {}, gone = {}, n = 0, m = 0;
  var docs = ss_().getSheetByName('Belege');
  if (docs && docs.getLastRow() > 1) docs.getRange(2, 4, docs.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0]) keep[String(r[0])] = true; });
  var sh = sheet_(TAB.leads), v = sh.getDataRange().getValues(), st = leadCol_('Status') - 1, rec = leadCol_('Eingang') - 1;
  for (var i = 1; i < v.length; i++) if (['Gebucht', 'Erledigt'].indexOf(String(v[i][st])) >= 0) keep[String(v[i][0])] = true;
  for (var r = v.length - 1; r >= 1; r--) {
    var id = String(v[r][0]), t = new Date(v[r][rec]).getTime();
    if (!id || keep[id] || !(t < cut)) continue;
    gone[id] = true; sh.deleteRow(r + 1); n++;
  }
  [TAB.items, TAB.quotes].forEach(function (name) {
    var s = ss_().getSheetByName(name);
    if (!s || s.getLastRow() < 2 || !n) return;
    var d = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
    for (var k = d.length - 1; k >= 0; k--) if (gone[String(d[k][0])]) s.deleteRow(k + 2);
  });
  var ap = ss_().getSheetByName(TAB.appts);
  if (ap && ap.getLastRow() > 1) {
    var a = ap.getRange(2, 1, ap.getLastRow() - 1, APPT_COLS.length).getValues(), ci = APPT_COLS.indexOf('Eingang'), li = APPT_COLS.indexOf('Anfrage');
    for (var j = a.length - 1; j >= 0; j--) if (new Date(a[j][ci]).getTime() < cut && !keep[String(a[j][li] || '')]) { ap.deleteRow(j + 2); m++; }
  }
  if (n || m) sheet_(TAB.audit).appendRow([now, 'System', TAB.leads, 'Löschung nach 6 Monaten', '', n + ' Anfragen, ' + m + ' Termine']);
  return {requests: n, appts: m};
}

function daily() {
  var drafts = sheet_(TAB.drafts), data = drafts.getDataRange().getValues(), now = new Date();
  for (var i = data.length - 1; i >= 1; i--) { if (data[i][3] && new Date(data[i][3]) < now) drafts.deleteRow(i + 1); }
  try { flushHits(); } catch (err) { console.error(err); }
  var visits = ss_().getSheetByName(TAB.visits);   // anonymous daily counts: kept 13 months for year-on-year comparison
  if (visits) {
    var vv = visits.getDataRange().getValues(), vcut = Utilities.formatDate(new Date(now.getTime() - 400 * 864e5), 'Europe/Berlin', 'yyyy-MM-dd');
    for (var k = vv.length - 1; k >= 1; k--) { if (String(day_(vv[k][0])).replace(/^'/, '') < vcut) visits.deleteRow(k + 1); }
  }
  var routes = ss_().getSheetByName(TAB.routes);   // route checks are kept 6 months, like requests
  if (routes) {
    var rv = routes.getDataRange().getValues(), cut = new Date(now.getTime() - 183 * 864e5);
    for (var j = rv.length - 1; j >= 1; j--) { if (rv[j][0] && new Date(rv[j][0]) < cut) routes.deleteRow(j + 1); }
  }
  try { purgeOld_(now); } catch (err) { console.error(err); }
  var leads = sheet_(TAB.leads).getDataRange().getValues().slice(1), open = [];
  leads.forEach(function (r) {
    var age = (now - new Date(r[1])) / 864e5;
    if ((r[2] === 'Neu' && age > 1) || (r[2] === 'Angebot raus' && age > 3)) open.push(r[0] + ' · ' + r[2] + ' · ' + r[5] + ' · seit ' + Math.floor(age) + ' Tagen\n   ' + adminUrl_(r[0]));
  });
  var to = config_('notify_email');
  if (open.length && to) MailApp.sendEmail({to: to, subject: 'Stabil Umzug: ' + open.length + ' offene Anfragen', body: open.join('\n') + '\n\n' + SpreadsheetApp.getActive().getUrl()});
}

/* ------------------------------------------------------------------ AI Chatbot (Gemini & Intelligent Moving Advisor) */
function aiChat_(b) {
  var msg = String(b.message || '').trim().slice(0, 1000);   // a question, not a document
  if (!msg) return {ok: false, error: 'empty'};
  var lang = (b.lang === 'en' || /^[a-zA-Z\s?!,.-]+$/.test(msg) && /\b(hello|hi|quote|price|moving|furniture|apartment)\b/i.test(msg)) ? 'en' : 'de';
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  // 1. Try Google Gemini API if key is present
  if (apiKey) {
    try {
      var systemInstruction = "Du bist der intelligente, freundliche KI-Umzugsberater von 'Stabil Umzug' (Inhaber: Ibrahim Abdelaal, Karlstraße 32, 45329 Essen, Telefon/WhatsApp: 0163 9688190). " +
        "Dienstleistungen: Privatumzüge, Firmenumzüge, Entrümpelung, Möbel- und Küchenmontage, Halteverbotszonen, Klaviertransporte. " +
        "Einsatzgebiet: Essen, Ruhrgebiet und NRW. Kostenlose Besichtigung per Video oder vor Ort; das Angebot kommt innerhalb von 24 Stunden. " +
        "Regeln: Nenne keine Preise, Rabatte, Versicherungsleistungen oder Garantien und erfinde keine Leistungen. Für Preise verweise auf den Umzugsplaner (www.stabilumzug.de/umzugsplaner/) und das persönliche Angebot. " +
        "Antworte hilfsbereit und kompakt auf " + (lang === 'en' ? 'Englisch' : 'Deutsch') + ". " +
        "Biete dem Kunden an, direkt einen Termin zu buchen oder Inhaber Ibrahim Abdelaal per WhatsApp (0163 9688190) zu kontaktieren.";
      
      var model = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || 'gemini-2.5-flash';   // the 1.5 models are retired
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
      var payload = {
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + "\n\nKundenfrage: " + msg }] }
        ],
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
      };
      var res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        var jsonRes = JSON.parse(res.getContentText());
        var candidate = jsonRes.candidates && jsonRes.candidates[0];
        if (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]) {
          return {
            ok: true,
            reply: candidate.content.parts[0].text,
            action: 'gemini',
            ownerPhone: '491639688190'
          };
        }
      }
    } catch (err) {
      console.error('Gemini API call failed, falling back to local engine:', err);
    }
  }

  // 2. Built-in moving consultant response engine
  var lower = msg.toLowerCase();
  var reply = '', actionType = 'info', quick = [];

  if (lang === 'en') {
    if (/volume|m3|cubic|size|room|sqm|qm|apartment/i.test(lower)) {
      reply = "A good rule of thumb is 0.3 to 0.4 m³ per square metre (e.g. 60 m² ≈ 18–24 m³). The moving planner calculates it from your rooms and items.\n\nWould you like to book a free video viewing so we can check your volume?";
      actionType = 'appointment';
      quick = ['Book Video Survey', 'WhatsApp to Owner', 'Open Moving Planner'];
    } else if (/cost|price|quote|how much|rate|flat/i.test(lower)) {
      reply = "The price depends on volume, floors, access and distance. In the moving planner you see volume, vehicle and crew in about 10 minutes, and your personal quote follows within 24 hours.\n\nYou can also send us a WhatsApp message.";
      actionType = 'whatsapp';
      quick = ['WhatsApp to Owner', 'Book Video Survey', 'Open Moving Planner'];
    } else if (/appointment|visit|survey|meet|video|booking/i.test(lower)) {
      reply = "We offer free 30-minute Google Meet video surveys or on-site visits across Essen and the Ruhr area. We look at your home and send your quote within 24 hours.";
      actionType = 'appointment';
      quick = ['Book Video Survey', 'Book On-Site Visit', 'Call Office'];
    } else {
      reply = "Hello! I am your digital moving assistant from Stabil Umzug in Essen. I can estimate your volume, answer questions, or schedule a Google Meet video survey.";
      quick = ['Cost & Prices', 'Calculate Volume', 'Book Appointment', 'WhatsApp to Owner'];
    }
  } else {
    if (/volumen|m3|kubik|größe|zimmer|qm|m²|wohnung|wie viel/i.test(lower)) {
      reply = "Als Faustformel gilt: ca. 0,3 bis 0,4 m³ Umzugsvolumen pro m² Wohnfläche (z. B. 60 m² ≈ 18–24 m³). Der Umzugsplaner berechnet es genauer aus Ihren Räumen und Gegenständen.\n\nMöchten Sie eine kostenlose Video-Besichtigung buchen?";
      actionType = 'appointment';
      quick = ['Google Meet Termin buchen', 'WhatsApp an Inhaber', 'Umzugsplaner öffnen'];
    } else if (/kosten|preis|kostet|wie viel|angebot|pauschal|stundensatz/i.test(lower)) {
      reply = "Der Preis hängt von Volumen, Etagen, Zugang und Strecke ab. Im Umzugsplaner sehen Sie in etwa 10 Minuten Volumen, Fahrzeug und Team; Ihr persönliches Angebot bekommen Sie innerhalb von 24 Stunden.\n\nSie können uns auch per WhatsApp schreiben.";
      actionType = 'whatsapp';
      quick = ['WhatsApp an Inhaber', 'Kostenlose Besichtigung', 'Online-Planer'];
    } else if (/termin|besichtigung|video|meet|zeit|buchen|vor ort/i.test(lower)) {
      reply = "Sie können jederzeit eine kostenlose Besichtigung buchen: Bequem per Google Meet Videokonferenz (15–30 Min. per Smartphone) oder persönlich vor Ort in Essen und Umgebung. Danach erhalten Sie Ihr Angebot innerhalb von 24 Stunden.";
      actionType = 'appointment';
      quick = ['Video-Termin buchen', 'Vor-Ort-Termin buchen', 'Inhaber anrufen'];
    } else if (/halteverbot|parken|genehmigung|zone|schild/i.test(lower)) {
      reply = "Wir kümmern uns um die komplette Genehmigung der Halteverbotszone (HVZ) inklusive Aufstellen der Schilder (mindestens 4 Tage vor dem Umzug); die Kosten stehen in Ihrem Angebot. So kann der Lkw direkt vor Ihrer Tür parken.";
      actionType = 'info';
      quick = ['Halteverbot anfragen', 'Termin buchen', 'WhatsApp an Inhaber'];
    } else if (/küche|montage|aufbau|abbau|schrank|möbelaufbau/i.test(lower)) {
      reply = "Unser erfahrenes Team übernimmt den fachgerechten Ab- und Aufbau Ihrer Möbel sowie den Ab- und Aufbau von Küchen; was genau dazugehört, klären wir bei der Besichtigung.";
      actionType = 'info';
      quick = ['Küchenmontage anfragen', 'WhatsApp an Inhaber', 'Termin buchen'];
    } else if (/jobcenter|arbeitsamt|amt|kostenübernahme|bg/i.test(lower)) {
      reply = "Wir arbeiten regelmäßig mit dem Jobcenter und Sozialamt zusammen. Wir erstellen Ihnen eine kostenlose Vorvereinbarung und ein normgerechtes Angebot zur Kostenübernahme.";
      actionType = 'info';
      quick = ['Jobcenter-Angebot anfragen', 'WhatsApp an Inhaber', 'Besichtigung buchen'];
    } else {
      reply = "Guten Tag! Ich bin Ihr digitaler Umzugsberater von Stabil Umzug in Essen. Wie kann ich Ihnen helfen? Sie können hier Ihr Volumen schätzen, Preise erfahren, eine Video-Besichtigung per Google Meet buchen oder direkt per WhatsApp mit Inhaber Ibrahim Abdelaal schreiben.";
      quick = ['Preise & Kosten', 'Volumen berechnen', 'Termin buchen', 'WhatsApp an Inhaber'];
    }
  }

  return {
    ok: true,
    reply: reply,
    action: actionType,
    quickReplies: quick,
    ownerPhone: '491639688190'
  };
}

