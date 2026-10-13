/**
 * Stabil Umzug – website API, part 2: appointment booking ("Termin buchen") and cookie-free traffic counting.
 * Called from doGet/doPost in Code.js. Constants (TAB, APPT_*, VISIT_COLS) and freeSlots_/ics_ live in Shared.js.
 */

/* ------------------------------------------------------------------ appointments */

/* Free times for the booking page. Cached for one minute so a busy day does not read the sheet for every visitor. */
/* Free times for one type, or for all types at once (type=all: the booking page switches types without waiting).
   Cached for 5 minutes and cleared by each booking; a booking always checks its time against fresh data. */
var SLOT_TTL = 300;
function slots_(type) {
  if (type !== 'all' && !APPT_TYPES[type]) return {ok: false, error: 'type'};
  var cache = CacheService.getScriptCache(), key = 'slots_' + type, hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var res;
  if (type === 'all') {
    var base = slotBase_(true), types = {};
    Object.keys(APPT_TYPES).forEach(function (k) { types[k] = {min: APPT_TYPES[k].min, days: freeSlots_(k, 21, null, base)}; });
    res = {ok: true, type: 'all', types: types};
  } else res = {ok: true, type: type, min: APPT_TYPES[type].min, days: freeSlots_(type, 21)};
  cache.put(key, JSON.stringify(res), SLOT_TTL);
  return res;
}
function clearSlots_() {
  CacheService.getScriptCache().removeAll(['slots_all'].concat(Object.keys(APPT_TYPES).map(function (k) { return 'slots_' + k; })));
}

function nextApptNr_() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('NEXT_APPT') || 1001);
  props.setProperty('NEXT_APPT', String(n + 1));
  return 'T-' + n;
}

/* Books an appointment: checks the time is still free, writes the Termine tab and a request (Anfragen) and e-mails
   customer and office, each with a calendar file. */
function book_(b) {
  if (b.hp) return {ok: true, nr: 'T-0000'};
  if (!(Number(b.t) > 3000)) return {ok: false, error: 'too_fast'};
  if (b.consent !== true) return {ok: false, error: 'consent'};
  var type = String(b.type || ''), T = APPT_TYPES[type];
  if (!T) return {ok: false, error: 'type'};
  var date = String(b.date || ''), time = String(b.time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return {ok: false, error: 'slot'};
  var name = clip_(b.name, 80), phone = clip_(b.phone, 40), email = clip_(b.email, 120), address = clip_(b.address, 200), to = clip_(b.to, 200);
  if (!name || !phone) return {ok: false, error: 'contact'};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok: false, error: 'email'};
  if (type === 'visit' && address.length < 5) return {ok: false, error: 'address'};
  var en = b.lang === 'en', src = b.src || {};
  var srcTxt = [src.utm_source, src.utm_medium, src.utm_campaign].filter(Boolean).join(' / ') || src.ref || 'direkt';
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var a, leadId;
  try {
    var day = freeSlots_(type, 21).filter(function (d) { return d.date === date; })[0];
    if (!day || day.slots.indexOf(time) < 0) return {ok: false, error: 'taken'};
    // the request, so the appointment also shows up in the pipeline
    ensureLeadHeader_();
    leadId = nextId_();
    var row = [], set = function (col, v) { row[LEAD_COLS.indexOf(col)] = v; };
    LEAD_COLS.forEach(function () { row.push(''); });
    set('ID', leadId); set('Eingang', new Date()); set('Status', STATUS[0]);
    set('Name', cell_(name, 80)); set('Telefon', cell_(phone, 40)); set('E-Mail', cell_(email, 120)); set('Kontaktweg', type === 'call' ? 'Telefon' : 'E-Mail');
    set('Von', cell_(address)); set('Nach', cell_(to)); set('Termin', 'flexibel');
    set('Quelle', cell_(srcTxt, 120)); set('Sprache', en ? 'EN' : 'DE'); set('Nachricht', cell_(b.message, 1000)); set('Einwilligung', new Date());
    set('Leistung', T.de + ' (Termin)');
    a = {nr: nextApptNr_(), status: 'Gebucht', type: type, date: date, time: time, min: T.min, name: name, phone: phone, email: email, address: address, to: to,
      message: clip_(b.message, 1000), lead: leadId, lang: en ? 'EN' : 'DE', source: srcTxt};
    set('Notizen', 'Termin ' + a.nr + ': ' + T.de + ' am ' + dayDeLong_(date) + ', ' + time + ' Uhr');
    set('Daten (JSON)', JSON.stringify({appointment: a.nr, src: src}));
    sheet_(TAB.leads).appendRow(row);
    var sh = ss_().getSheetByName(TAB.appts) || ensureTab_(TAB.appts, APPT_COLS, [70, 130, 90, 160, 90, 60, 70, 150, 120, 170, 220]);
    sh.appendRow([a.nr, new Date(), a.status, T.de, "'" + date, "'" + time, T.min, cell_(name, 80), cell_(phone, 40), cell_(email, 120), cell_(address),
      cell_(to), cell_(a.message, 1000), leadId, a.lang, cell_(srcTxt, 120), '', '']);
    CacheService.getScriptCache().remove('slots_' + type);
    ['visit', 'video', 'call'].forEach(function (k) { CacheService.getScriptCache().remove('slots_' + k); });
  } finally { lock.releaseLock(); }
  apptMails_(a, 'booked');
  clearSlots_();
  return {ok: true, nr: a.nr, lead: leadId, type: type, date: date, time: time, min: T.min};
}

/* ------------------------------------------------------------------ traffic (no cookies, no IP, no personal data) */

/* One page view: {p: path, s: source group, d: device, l: language, e: 1 when the visit started on this page}.
   Counts are collected in the script cache and written to the Besuche tab every 10 minutes as one row per
   day/page/source/device/language – a handful of rows a day instead of one per view. */
function hit_(b) {
  var p = String(b.p || '/').slice(0, 80);
  if (p.charAt(0) !== '/' || /[<>"]/.test(p)) return {ok: false};
  var s = clip_(b.s || 'Direkt', 40), d = ['Handy', 'Tablet', 'Computer'].indexOf(b.d) >= 0 ? b.d : 'Computer', l = b.l === 'en' ? 'EN' : 'DE';
  var day = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd'), key = [day, p, s, d, l].join('|');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return {ok: false};
  try {
    var cache = CacheService.getScriptCache(), raw = cache.get('hits'), buf = raw ? JSON.parse(raw) : {since: Date.now(), rows: {}};
    var r = buf.rows[key] = buf.rows[key] || [0, 0];
    r[0]++; if (b.e) r[1]++;
    if (Date.now() - buf.since > 10 * 60000 || Object.keys(buf.rows).length > 150) { writeHits_(buf); buf = {since: Date.now(), rows: {}}; }
    cache.put('hits', JSON.stringify(buf), 21600);
  } finally { lock.releaseLock(); }
  return {ok: true};
}
function writeHits_(buf) {
  var keys = Object.keys(buf.rows || {});
  if (!keys.length) return;
  var sh = ss_().getSheetByName(TAB.visits) || ensureTab_(TAB.visits, VISIT_COLS, [90, 220, 140, 90, 70, 70, 70]);
  sh.getRange(sh.getLastRow() + 1, 1, keys.length, VISIT_COLS.length).setValues(keys.map(function (k) {
    var f = k.split('|'); return ["'" + f[0], f[1], f[2], f[3], f[4], buf.rows[k][0], buf.rows[k][1]];
  }));
}
/* Writes whatever is still in the cache (daily trigger and the admin's "refresh"). */
function flushHits() {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var cache = CacheService.getScriptCache(), raw = cache.get('hits');
    if (raw) { writeHits_(JSON.parse(raw)); cache.remove('hits'); }
  } finally { lock.releaseLock(); }
}
