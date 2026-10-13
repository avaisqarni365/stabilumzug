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
    if (p.action === 'health') return json({ok: true, version: masterVersion_()});
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
    var big = e.postData.contents.length > 100000;   // only photo uploads may be larger (up to 10 photos of ~1600 px)
    if (big && (e.postData.contents.slice(0, 30).indexOf('"action":"photos"') < 0 || e.postData.contents.length > PHOTO_MAX_BODY)) return json({ok: false, error: 'too_large'});
    if (!rateLimit_()) return json({ok: false, error: 'busy'});
    var body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'lead': return json(saveLead_(body));
      case 'quick': return json(saveQuick_(body));
      case 'route': return json(route_(String(body.from || ''), String(body.to || '')));
      case 'routeMap': return json(routeMap_(body));
      case 'book': return json(book_(body));
      case 'photos': return json(photos_(body));
      case 'hit': return json(hit_(body));
      case 'saveDraft': return json(saveDraft_(body));
      case 'accept': return json(accept_(String(body.id || ''), String(body.k || ''), body.confirm === true));
      case 'resend': return json(resend_(String(body.email || ''), String(body.lang || 'de')));
      default: return json({ok: false, error: 'unknown_action'});
    }
  } catch (err) {
    console.error(err);
    return json({ok: false, error: 'server'});
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* At most 60 requests per minute in total: enough for a moving company, a brake for scripts. */
function rateLimit_() {
  var cache = CacheService.getScriptCache(), key = 'rl_' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= 60;
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

  var master = loadMaster_();
  var est = Estimator.estimate(s, master);
  var byId = {};
  master.items.forEach(function (it) { byId[it.id] = it; });

  var route = (s.f1.from && s.f1.to) ? route_(clip_(s.f1.from), clip_(s.f1.to)) : {ok: false};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    ensureLeadHeader_();
    var id = nextId_();
    var now = new Date();
    var acc = function (a) { return a ? FLOORS[a.floor] + ', ' + LIFTS[a.lift] + ', ' + PARKS[a.park] : ''; };
    var rooms = (s.rooms || []).map(function (r) { return (ROOM_DE[r.r] || clip_(r.r, 20)) + (String(r.sqm || '').trim() ? ' ' + clip_(r.sqm, 6) + ' m²' : ''); }).join(', ');
    var src = s.src || {};
    var srcTxt = [src.utm_source, src.utm_medium, src.utm_campaign, src.utm_term].filter(Boolean).join(' / ') || src.ref || (src.gclid ? 'Google Ads' : 'direkt');
    var date = s.f1.dateMode === 'fixed' && s.f1.date ? clip_(s.f1.date, 10) : 'flexibel';
    sheet_(TAB.leads).appendRow([
      id, now, STATUS[0], '', '', cell_(name, 80), cell_(phone, 40), cell_(email, 120), clip_(c.channel, 20),
      cell_(s.f1.from), cell_(s.f1.to), clip_(s.f1.km, 8), route.ok ? route.km : '', route.ok ? route.min : '',
      date, HH[s.f1.hh] || '', acc(s.acc.old), acc(s.acc['new']), s.hvz ? 'ja' : 'nein', cell_(rooms, 300),
      est.n, round_(est.volLow), round_(est.volHigh), Math.round(est.kgMin) + '–' + Math.round(est.kgMax),
      VEH_DE[est.vehicle] + (est.trips > 1 ? ' · ' + est.trips + ' Fahrten' : ''), est.crew, round_(est.hours),
      {high: 'Hoch', medium: 'Mittel', low: 'Niedrig'}[est.conf], master.version, cell_(srcTxt, 120), b.lang === 'en' ? 'EN' : 'DE',
      cell_(c.note, 1000), clip_(s.ref, 20), now, JSON.stringify(s).slice(0, 45000), 'Umzug (Planer)'
    ]);
    var rows = [];
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
  notifyOffice_(id, name, phone, email, s, est, route);
  return {ok: true, id: id, km: route.ok ? route.km : null, up: photoToken_(id)};
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
    set('Termin', clip_(f.date, 10) || 'flexibel');
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
        '', clip_(f.message, 1000), '', 'Tabelle: ' + SpreadsheetApp.getActive().getUrl()].join('\n')});
    } catch (err) { console.error(err); }
  }
  return {ok: true, id: id, up: photoToken_(id)};
}

function nextId_() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('NEXT_ID') || 2601);
  props.setProperty('NEXT_ID', String(n + 1));
  return 'A-' + n;
}

function notifyOffice_(id, name, phone, email, s, est, route) {
  var to = config_('notify_email') || Session.getEffectiveUser().getEmail();
  if (!to) return;
  var url = SpreadsheetApp.getActive().getUrl();
  var body = [
    'Neue Anfrage ' + id + ' über den Umzugsplaner', '',
    'Name: ' + name, 'Telefon: ' + (phone || '—'), 'E-Mail: ' + (email || '—'), '',
    'Von: ' + (s.f1.from || '—'), 'Nach: ' + (s.f1.to || '—') + (route.ok ? ' (' + route.km + ' km, ' + route.min + ' min)' : ''),
    'Volumen: ' + round_(est.volLow) + '–' + round_(est.volHigh) + ' m³, ' + VEH_DE[est.vehicle] + ', ' + est.crew + ' Personen, ca. ' + round_(est.hours) + ' Std.',
    '', 'Tabelle: ' + url
  ].join('\n');
  try { MailApp.sendEmail({to: to, subject: 'Neue Umzugsanfrage ' + id + ' – ' + name, body: body}); } catch (err) { console.error(err); }
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
  return {
    ok: true, id: id, name: name, service: String(g('Leistung') || 'Umzug').replace(/ \((Planer|Kurzformular)\)$/, ''),
    status: String(g('Status') || STATUS[0]), date: day_(g('Termin')), from: String(g('Von') || ''), to: String(g('Nach') || ''),
    lang: String(g('Sprache') || 'DE'), quoteSent: iso_(g('Angebot gesendet')),
    quote: q ? {version: q.version, lines: lines, total: Number(g('Angebot €')) || quoteTotal_(q.lines, rates_().min_price)} : null
  };
}

/* "Zahlungspflichtig beauftragen": the customer accepts the latest quote. */
function accept_(id, k, confirm) {
  if (!confirm) return {ok: false, error: 'confirm'};
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var hit, res;
  try {
    hit = leadByToken_(id, k);
    if (!hit) return {ok: false, error: 'not_found'};
    var status = String(hit.values[leadCol_('Status') - 1]);
    if (status === 'Gebucht' || status === 'Erledigt') return {ok: true, already: true, status: status};
    if (!latestQuote_(id)) return {ok: false, error: 'no_quote'};
    if (status === 'Verloren') return {ok: false, error: 'closed'};
    sheet_(TAB.leads).getRange(hit.row, leadCol_('Status')).setValue('Gebucht');
    sheet_(TAB.audit).appendRow([new Date(), 'Kunde (Link)', TAB.leads, id + ' · Status', status, 'Gebucht – Angebot online angenommen']);
    res = {ok: true, status: 'Gebucht'};
  } finally { lock.releaseLock(); }
  var to = config_('notify_email') || Session.getEffectiveUser().getEmail();
  if (to) {
    var v = hit.values;
    try {
      MailApp.sendEmail({to: to, subject: 'Auftrag erteilt: ' + id + ' – ' + v[leadCol_('Name') - 1],
        body: 'Der Kunde hat das Angebot ' + id + ' über „Mein Umzug“ zahlungspflichtig beauftragt.\n\nName: ' + v[leadCol_('Name') - 1] +
          '\nTelefon: ' + (v[leadCol_('Telefon') - 1] || '—') + '\nAngebot: ' + (v[leadCol_('Angebot €') - 1] || '—') + ' €\n\nBitte Termin bestätigen.\n' + ss_().getUrl()});
    } catch (err) { console.error(err); }
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
  if (links.length) {
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
  var ui = SpreadsheetApp.getUi(), props = PropertiesService.getScriptProperties();
  var repo = props.getProperty('GITHUB_REPO'), token = props.getProperty('GITHUB_TOKEN'), branch = props.getProperty('GITHUB_BRANCH') || 'main';
  if (!repo || !token) { ui.alert('GITHUB_REPO und GITHUB_TOKEN fehlen in den Skripteigenschaften (siehe README).'); return; }
  CacheService.getScriptCache().remove('master');
  var m = masterFromSheet_();
  var problems = m.items.filter(function (it) { return !(it.v > 0 || (it.vars && it.vars.length)) || !it.de; }).map(function (it) { return it.id; });
  if (problems.length) { ui.alert('Bitte prüfen (Volumen oder Name fehlt): ' + problems.join(', ')); return; }
  var d = new Date(), version = Utilities.formatDate(d, 'Europe/Berlin', 'yyyy.MM.dd-HHmm');
  m.version = version;
  var compact = JSON.stringify(m);
  var files = [
    ['data/master.json', JSON.stringify(m, null, 1) + '\n'],
    ['assets/data/master.json', compact + '\n'],
    ['assets/js/flow-data.js', '/* Generated from data/master.json by tools/build.py (or published from the company sheet). Do not edit. */\nwindow.FLOW_DATA=' + compact + ';\n']
  ];
  var user = Session.getActiveUser().getEmail() || 'Tabelle';
  files.forEach(function (f) { githubPut_(repo, branch, token, f[0], f[1], 'Katalog ' + version + ' aus der Tabelle (' + user + ')'); });
  setConfig_('master_version', version);
  CacheService.getScriptCache().remove('master');
  sheet_(TAB.audit).appendRow([d, user, TAB.catalog, '—', '', 'Veröffentlicht: Version ' + version + ', ' + m.items.length + ' Gegenstände']);
  ui.alert('Veröffentlicht: Version ' + version + '. Die Website zeigt den neuen Katalog in wenigen Minuten.');
}

function githubPut_(repo, branch, token, path, content, message) {
  var url = 'https://api.github.com/repos/' + repo + '/contents/' + path;
  var headers = {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  var get = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(branch), {headers: headers, muteHttpExceptions: true});
  var sha = get.getResponseCode() === 200 ? JSON.parse(get.getContentText()).sha : undefined;
  var res = UrlFetchApp.fetch(url, {
    method: 'put', headers: headers, contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({message: message, branch: branch, sha: sha, content: Utilities.base64Encode(content, Utilities.Charset.UTF_8)})
  });
  if (res.getResponseCode() >= 300) throw new Error('GitHub ' + res.getResponseCode() + ' für ' + path + ': ' + res.getContentText().slice(0, 300));
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
  setConfig_('notify_email', config_('notify_email') || Session.getEffectiveUser().getEmail());

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onEditAudit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('daily').timeBased().everyDays(1).atHour(7).create();
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
  if ([TAB.catalog, TAB.settings, TAB.rates].indexOf(name) < 0) return;
  sheet_(TAB.audit).appendRow([new Date(), (e.user && e.user.getEmail()) || Session.getActiveUser().getEmail() || '?', name,
    e.range.getA1Notation(), e.oldValue == null ? '' : e.oldValue, e.value == null ? '(mehrere Zellen)' : e.value]);
  if (name !== TAB.rates) CacheService.getScriptCache().remove('master');
}

/* Daily at 07:00: delete expired drafts and remind the office of unanswered requests. */
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
  var leads = sheet_(TAB.leads).getDataRange().getValues().slice(1), open = [];
  leads.forEach(function (r) {
    var age = (now - new Date(r[1])) / 864e5;
    if ((r[2] === 'Neu' && age > 1) || (r[2] === 'Angebot raus' && age > 3)) open.push(r[0] + ' · ' + r[2] + ' · ' + r[5] + ' · seit ' + Math.floor(age) + ' Tagen');
  });
  var to = config_('notify_email');
  if (open.length && to) MailApp.sendEmail({to: to, subject: 'Stabil Umzug: ' + open.length + ' offene Anfragen', body: open.join('\n') + '\n\n' + SpreadsheetApp.getActive().getUrl()});
}
