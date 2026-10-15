/**
 * Stabil Umzug – admin app (back office in the browser).
 *
 * Login with username and password from the "Benutzer" tab (no Google account needed). The app runs as the
 * company account ("execute as me"); only login(), logout() and api() can be called from the page – every
 * api_…_ function is private and reached through api(), which checks the session first.
 * Everything is read from and written to the company sheet.
 * Config.js (written by backend/deploy-backend.ps1) defines SHEET_ID, SITE_URL and PORTAL_URL.
 * Shared.js and Estimator.js are copies made by tools/build.py.
 */

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.siteUrl = typeof SITE_URL !== 'undefined' ? SITE_URL : DEFAULT_SITE;
  t.start = startPage_(e && e.parameter);
  return t.evaluate().setTitle('Stabil Umzug – Admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function startPage_(p) {
  p = p || {};
  if (/^A-\d{1,8}$/.test(p.a || '')) return 'a/' + p.a;
  if (/^[A-Z]{1,3}-[A-Za-z0-9-]{4,24}$/.test(p.b || '')) return 'beleg/' + p.b;
  if (p.t) return 'termine';
  if (p.p) return 'planer' + (/^A-\d{1,8}$/.test(p.p) ? '?id=' + p.p : '');
  if (p.h) return 'hilfe';
  return '';
}

/* ---------- login ---------- */
var SESSION_TTL = 21600, LOCK_TRIES = 5, LOCK_SECONDS = 900;
var CURRENT_ = null;   // the logged-in user of this call, set by api()

/* login(username, password) → {ok, token, name} or {ok: false, error}. Same answer for unknown user and wrong password. */
function login(user, pass) {
  var u = String(user || '').trim().toLowerCase().slice(0, 60), cache = CacheService.getScriptCache(), key = 'admfail_' + u;
  var fails = Number(cache.get(key) || 0);
  if (fails >= LOCK_TRIES) return {ok: false, error: 'locked'};
  var sh = usersSheet_(), n = sh.getLastRow(), c = function (k) { return USER_COLS.indexOf(k); };
  var rows = n > 1 ? sh.getRange(2, 1, n - 1, USER_COLS.length).getValues() : [], hit = -1;
  for (var i = 0; i < rows.length; i++) if (String(rows[i][c('Benutzername')]).trim().toLowerCase() === u && u) { hit = i; break; }
  var ok = false, name = '', row = hit + 2;
  if (hit >= 0 && /^(ja|yes|x|1|true)$/i.test(String(rows[hit][c('Aktiv')]).trim())) {
    var r = rows[hit], plain = String(r[c('Neues Passwort')] || '');
    if (plain) {   // first login after the owner typed a password: encrypt it now
      var err = setUserPw_(sh, row, plain);
      if (!err) r = sh.getRange(row, 1, 1, USER_COLS.length).getValues()[0];
    }
    if (r[c('Passwort (verschlüsselt)')] && hashPw_(pass, r[c('Salt')]) === String(r[c('Passwort (verschlüsselt)')])) { ok = true; name = String(r[c('Name')] || r[c('Benutzername')]); }
  }
  if (!ok) {
    cache.put(key, String(fails + 1), LOCK_SECONDS);
    Utilities.sleep(600);
    return {ok: false, error: fails + 1 >= LOCK_TRIES ? 'locked' : 'login'};
  }
  cache.remove(key);
  sh.getRange(row, c('Letzte Anmeldung') + 1).setValue(new Date());
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache.put('adm_' + token, JSON.stringify({user: u, name: name}), SESSION_TTL);
  return {ok: true, token: token, name: name};
}
function logout(token) { if (/^[0-9a-f]{64}$/.test(String(token || ''))) CacheService.getScriptCache().remove('adm_' + token); return {ok: true}; }

/* The only door to the data: checks the session, then calls the private api_<name>_ function. */
function api(token, fn, args) {
  var t = String(token || ''), cache = CacheService.getScriptCache(), raw = /^[0-9a-f]{64}$/.test(t) ? cache.get('adm_' + t) : null;
  if (!raw) throw new Error('LOGIN');
  var s = JSON.parse(raw);
  // the user may have been removed or set inactive in the sheet since the login (checked at most once a minute)
  if (!cache.get('admok_' + s.user)) {
    var sh = usersSheet_(), n = sh.getLastRow(), still = false, c = function (k) { return USER_COLS.indexOf(k); };
    if (n > 1) sh.getRange(2, 1, n - 1, USER_COLS.length).getValues().forEach(function (r) {
      if (String(r[c('Benutzername')]).trim().toLowerCase() === s.user && /^(ja|yes|x|1|true)$/i.test(String(r[c('Aktiv')]).trim())) still = true;
    });
    if (!still) { cache.remove('adm_' + t); throw new Error('LOGIN'); }
    cache.put('admok_' + s.user, '1', 60);
  }
  cache.put('adm_' + t, raw, SESSION_TTL);   // sliding: 6 hours after the last action
  var name = String(fn || '');
  if (!/^api_[A-Za-z]+$/.test(name) || typeof globalThis[name + '_'] !== 'function') throw new Error('Unbekannte Aktion.');
  CURRENT_ = s;
  try { return globalThis[name + '_'].apply(null, Array.isArray(args) ? args : []); } finally { CURRENT_ = null; }
}
function guard_() {
  if (!CURRENT_) throw new Error('LOGIN');
  return CURRENT_.name || CURRENT_.user;
}

/* iso_ and day_ live in Shared.js. */

/* Lead row -> plain object with the fields the admin shows (dates as ISO strings: Apps Script cannot return Date objects). */
function leadObj_(v) {
  var g = function (n) { return v[LEAD_COLS.indexOf(n)]; };
  return {
    id: String(g('ID')), received: iso_(g('Eingang')), status: String(g('Status') || STATUS[0]), owner: String(g('Zuständig') || ''),
    total: g('Angebot €') === '' ? null : Number(g('Angebot €')), name: String(g('Name') || ''), phone: String(g('Telefon') || '').replace(/^'/, ''),
    email: String(g('E-Mail') || ''), channel: String(g('Kontaktweg') || ''), from: String(g('Von') || ''), to: String(g('Nach') || ''),
    kmFamily: String(g('km (Familie)') || ''), kmMaps: g('km (Maps)') === '' ? null : Number(g('km (Maps)')), minutes: g('Fahrzeit min') === '' ? null : Number(g('Fahrzeit min')),
    date: day_(g('Termin')), household: String(g('Haushalt') || ''), accOld: String(g('Zugang Auszug') || ''), accNew: String(g('Zugang Einzug') || ''),
    hvz: String(g('Halteverbot') || ''), rooms: String(g('Räume') || ''), count: g('Anzahl') === '' ? null : Number(g('Anzahl')),
    volMin: g('Volumen min m³') === '' ? null : Number(g('Volumen min m³')), volMax: g('Volumen max m³') === '' ? null : Number(g('Volumen max m³')),
    weight: String(g('Gewicht kg') || ''), vehicle: String(g('Fahrzeug') || ''), crew: String(g('Team') || ''), hours: String(g('Stunden') || ''),
    confidence: String(g('Vertrauen') || ''), source: String(g('Quelle') || ''), lang: String(g('Sprache') || 'DE'), message: String(g('Nachricht') || ''),
    ref: String(g('Referenz') || ''), service: String(g('Leistung') || 'Umzug (Planer)'), notes: String(g('Notizen') || ''),
    quoteSent: iso_(g('Angebot gesendet')), hasToken: !!g('Kundentoken'),
    payer: String(g('Kostenträger') || ''), pre: String(g('Vorvereinbarung') || ''),
    payerData: (function () { try { return JSON.parse(g('Daten (JSON)') || '{}').payer || null; } catch (e) { return null; } })(),
    contract: (function () { try { return JSON.parse(g('Daten (JSON)') || '{}').contract || null; } catch (e) { return null; } })(),
    handover: (function () { try { return JSON.parse(g('Daten (JSON)') || '{}').handover || null; } catch (e) { return null; } })(),
    photosDrive: (function () { var n = String(g('Notizen') || ''); var m = n.match(/Google Drive:\s*(https:\/\/[^\s\)]+)/); return m ? m[1] : ''; })()
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

function api_bootstrap_() {
  var email = guard_();
  ensureLeadHeader_();
  return {me: email, statuses: STATUS, leads: allLeads_(), sheetUrl: ss_().getUrl(), portal: typeof PORTAL_URL !== 'undefined' && !!PORTAL_URL, routes: routeStats_()};
}

/* Route checks on the website (Strecken tab): how many people calculated their move, and from/to where. */
function routeStats_() {
  var sh = ss_().getSheetByName(TAB.routes), out = {today: 0, week: 0, month: 0, towns: [], last: []};
  if (!sh || sh.getLastRow() < 2) return out;
  var now = Date.now(), day = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd'), count = {};
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, ROUTE_COLS.length).getValues();
  rows.forEach(function (r) {
    if (!(r[0] instanceof Date)) return;
    var age = (now - r[0].getTime()) / 864e5;
    if (Utilities.formatDate(r[0], 'Europe/Berlin', 'yyyy-MM-dd') === day) out.today++;
    if (age <= 7) out.week++;
    if (age <= 30) { out.month++; [r[1], r[2]].forEach(function (p) { var t = String(p).replace(/^\d{5}\s+/, ''); if (t && t !== '–') count[t] = (count[t] || 0) + 1; }); }
  });
  out.towns = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 8).map(function (k) { return [k, count[k]]; });
  out.last = rows.slice(-6).reverse().map(function (r) { return {at: iso_(r[0]), from: String(r[1]), to: String(r[2]), km: Number(r[3]) || 0, page: String(r[5])}; });
  return out;
}

function api_lead_(id) {
  guard_();
  var hit = findLead_(id);
  if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
  var lead = leadObj_(hit.values);
  var items = sheet_(TAB.items).getDataRange().getValues().slice(1)
    .filter(function (r) { return String(r[0]) === String(id); })
    .map(function (r) { return {name: String(r[2]), size: String(r[3]), n: Number(r[4]) || 0, source: String(r[5]), vol: Number(r[7]) || 0}; });
  var R = rates_(), saved = latestQuote_(id), draft;
  var s = null;
  try { s = JSON.parse(hit.values[JSON_COL - 1] || '{}'); } catch (err) {}
  if (saved) draft = {version: saved.version, lines: saved.lines, saved: true};
  else {
    var master = masterFromSheet_(), q = quoteLines_(s, hit.values, master, R);   // read the catalog once
    draft = {version: 0, lines: q.lines, saved: false, range: q.est ? Math.round(master.rules.range[q.est.conf] * 100) : null};
  }
  return {lead: lead, items: items, quote: draft, minPrice: R.min_price, state: s};
}

/* Status, owner and notes. Every change is written to the Protokoll tab. */
function api_update_(id, patch) {
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
    if (patch.handover !== undefined) {
      var jsonCol = leadCol_('Daten (JSON)');
      var jsonMeta = {};
      try { jsonMeta = JSON.parse(hit.values[jsonCol - 1] || '{}'); } catch (e) {}
      jsonMeta.handover = patch.handover;
      sh.getRange(hit.row, jsonCol).setValue(JSON.stringify(jsonMeta));
      audit.appendRow([now, email, TAB.leads, id + ' · Übergabeliste', '', 'Checkliste aktualisiert']);
    }
  } finally { lock.releaseLock(); }
  return api_lead_(id).lead;
}

/* Saves the edited quote lines as a new version. lines: [[Position, Basis, Menge, Einheit, Satz], …] */
function api_saveQuote_(id, lines) {
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
function api_sendQuote_(id, text, channel) {
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
function api_customerLink_(id) {
  guard_();
  if (typeof PORTAL_URL === 'undefined' || !PORTAL_URL) return '';
  var hit = findLead_(id); if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
  var col = leadCol_('Kundentoken'), token = String(hit.values[col - 1] || '');
  if (!token) { token = Utilities.getUuid().replace(/-/g, ''); sheet_(TAB.leads).getRange(hit.row, col).setValue(token); }
  var base = String(hit.values[leadCol_('Sprache') - 1]) === 'EN' ? PORTAL_URL.replace('/mein-umzug/', '/en/my-move/') : PORTAL_URL;
  return base + '?id=' + encodeURIComponent(id) + '&k=' + token;
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

/* ------------------------------------------------------------------ Owner Planner (api_plannerMaster, api_plannerSave) */

/* Data for the owner planner: master catalog items and rules, rates, company info, and quick lead selector. */
function api_plannerMaster_() {
  guard_();
  var master = masterFromSheet_();
  var r = rates_();
  var c = company_();
  var leads = allLeads_().map(function (l) {
    return {id: l.id, name: l.name, phone: l.phone, email: l.email, from: l.from, to: l.to, date: l.date, service: l.service};
  });
  return {master: master, rates: r, company: c, leads: leads};
}

/* Saves a move plan from the owner planner and converts it to a lead, offer, or invoice. */
function api_plannerSave_(plan, target) {
  var email = guard_();
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  var leadId = (plan && plan.leadId) || '';
  var isNew = !leadId;
  try {
    ensureLeadHeader_();
    var master = masterFromSheet_();
    var R = rates_();
    var s = {
      f1: plan.f1 || {from: '', to: '', km: '', date: '', dateMode: 'fixed', hh: 1},
      acc: plan.acc || {old: {floor: 0, lift: 3, park: 3}, 'new': {floor: 0, lift: 3, park: 3}},
      hvz: !!plan.hvz,
      rooms: plan.rooms || [],
      inv: plan.inv || {},
      customs: plan.customs || []
    };
    var est = Estimator.estimate(s, master);
    var now = new Date();
    var c = plan.contact || {};
    var name = cell_(c.name || 'Kunde (Planer)', 80);
    var phone = cell_(c.phone || '', 40);
    var emailAddr = cell_(c.email || '', 120);
    var kmMaps = Number(s.f1.km) || 0;
    var accStr = function (a) { return a ? FLOORS[a.floor] + ', ' + LIFTS[a.lift] + ', ' + PARKS[a.park] : ''; };
    var dateStr = moveDate_(s.f1);
    var roomsStr = (s.rooms || []).map(function (r) { return (ROOM_DE[r.r] || clip_(r.r, 20)) + (String(r.sqm || '').trim() ? ' ' + clip_(r.sqm, 6) + ' m²' : ''); }).join(', ');
    var byId = {};
    master.items.forEach(function (it) { byId[it.id] = it; });

    if (isNew) {
      leadId = nextId_();
      sheet_(TAB.leads).appendRow([
        leadId, now, STATUS[0], email, '', name, phone, emailAddr, clip_(c.channel || 'phone', 20),
        cell_(s.f1.from), cell_(s.f1.to), clip_(s.f1.km, 8), kmMaps || '', '',
        dateStr, HH[s.f1.hh] || '', accStr(s.acc.old), accStr(s.acc['new']), s.hvz ? 'ja' : 'nein', cell_(roomsStr, 300),
        est.n, round_(est.volLow), round_(est.volHigh), Math.round(est.kgMin) + '–' + Math.round(est.kgMax),
        VEH_DE[est.vehicle] + (est.trips > 1 ? ' · ' + est.trips + ' Fahrten' : ''), est.crew, round_(est.hours),
        {high: 'Hoch', medium: 'Mittel', low: 'Niedrig'}[est.conf], master.version, 'Admin-Planer', 'DE',
        cell_(c.note || '', 1000), '', now, JSON.stringify(s).slice(0, 45000), 'Umzug (Planer)', '', '', '',
        '', ''
      ]);
      sheet_(TAB.audit).appendRow([now, email, TAB.leads, leadId, '', 'Im Admin-Planer erstellt']);
    } else {
      var hit = findLead_(leadId);
      if (!hit) throw new Error('Anfrage ' + leadId + ' nicht gefunden.');
      var sh = sheet_(TAB.leads);
      if (name) sh.getRange(hit.row, leadCol_('Name')).setValue(name);
      if (phone) sh.getRange(hit.row, leadCol_('Telefon')).setValue(phone);
      if (emailAddr) sh.getRange(hit.row, leadCol_('E-Mail')).setValue(emailAddr);
      sh.getRange(hit.row, leadCol_('Von')).setValue(cell_(s.f1.from));
      sh.getRange(hit.row, leadCol_('Nach')).setValue(cell_(s.f1.to));
      if (s.f1.km) sh.getRange(hit.row, leadCol_('km (Maps)')).setValue(kmMaps);
      sh.getRange(hit.row, leadCol_('Termin')).setValue(dateStr);
      sh.getRange(hit.row, leadCol_('Zugang Auszug')).setValue(accStr(s.acc.old));
      sh.getRange(hit.row, leadCol_('Zugang Einzug')).setValue(accStr(s.acc['new']));
      sh.getRange(hit.row, leadCol_('Halteverbot')).setValue(s.hvz ? 'ja' : 'nein');
      sh.getRange(hit.row, leadCol_('Volumen min m³')).setValue(round_(est.volLow));
      sh.getRange(hit.row, leadCol_('Volumen max m³')).setValue(round_(est.volHigh));
      sh.getRange(hit.row, leadCol_('Fahrzeug')).setValue(VEH_DE[est.vehicle] + (est.trips > 1 ? ' · ' + est.trips + ' Fahrten' : ''));
      sh.getRange(hit.row, leadCol_('Team')).setValue(est.crew);
      sh.getRange(hit.row, leadCol_('Stunden')).setValue(round_(est.hours));
      sh.getRange(hit.row, leadCol_('Daten (JSON)')).setValue(JSON.stringify(s).slice(0, 45000));
      sheet_(TAB.audit).appendRow([now, email, TAB.leads, leadId, '', 'Im Admin-Planer aktualisiert']);
    }

    // Write / update TAB.items
    var itemRows = [];
    Object.keys(s.inv).forEach(function (iid) {
      var e = s.inv[iid], it = byId[iid];
      if (!it || !e || !e.by) return;
      Object.keys(e.by).forEach(function (k) {
        var n = Math.max(0, Math.min(999, Number(e.by[k]) || 0));
        if (!n) return;
        var v = Estimator.itemVol(it, e.vi);
        itemRows.push([leadId, iid, it.de, it.vars ? it.vars[e.vi || 0].l : '', n, SRC_DE[k] || k, v, round_(n * v, 3)]);
      });
    });
    (s.customs || []).forEach(function (cu) {
      var n = Math.max(1, Math.min(99, Number(cu.n) || 1)), v = Math.max(0, Math.min(10, Number(cu.v) || 0));
      itemRows.push([leadId, 'custom', cell_(cu.name, 60), [cu.l, cu.b, cu.h].map(Number).join('×') + ' cm', n, SRC_DE.custom, round_(v, 3), round_(n * v, 3)]);
    });

    var shItems = sheet_(TAB.items);
    var itemData = shItems.getDataRange().getValues();
    for (var i = itemData.length - 1; i >= 1; i--) {
      if (String(itemData[i][0]) === String(leadId)) shItems.deleteRow(i + 1);
    }
    if (itemRows.length) {
      shItems.getRange(shItems.getLastRow() + 1, 1, itemRows.length, ITEM_COLS.length).setValues(itemRows);
    }

    // Calculate quote lines and write to TAB.quotes
    var hitLead = findLead_(leadId);
    var qRes = quoteLines_(s, hitLead ? hitLead.values : [], master, R);
    writeQuote_(leadId, qRes.lines, master.version, R);

  } finally {
    lock.releaseLock();
  }

  // Conversion targets
  if (target === 'offer') {
    var docNr = api_docNew_('offer', leadId);
    return {ok: true, leadId: leadId, docNr: docNr, type: 'offer'};
  } else if (target === 'invoice') {
    var docNr = api_docNew_('invoice', leadId);
    return {ok: true, leadId: leadId, docNr: docNr, type: 'invoice'};
  }

  return {ok: true, leadId: leadId, type: 'lead'};
}
