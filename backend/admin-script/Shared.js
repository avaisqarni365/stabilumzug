/* Copied from backend/shared/Shared.js by tools/build.py. Do not edit here. */
/**
 * Stabil Umzug – shared by the website API (backend/apps-script) and the admin app (backend/admin-script).
 * tools/build.py copies this file into both projects as Shared.js – edit it here only.
 * Each project defines ss_(), which returns the company spreadsheet.
 */

/* Addresses before the move to Google Workspace (info@stabilumzug.de); replaced by "Einrichten". */
var OLD_EMAILS = ['info.stabilumzug@gmail.com'];

var TAB = {
  leads: 'Anfragen', items: 'Gegenstände', quotes: 'Angebote', catalog: 'Katalog', settings: 'Regeln',
  rates: 'Preise', audit: 'Protokoll', drafts: 'Entwürfe', config: 'Konfiguration', routes: 'Strecken',
  appts: 'Termine', visits: 'Besuche', users: 'Benutzer'
};
/* Admin users (login with username and password). The owner adds a row and types a password into "Neues Passwort";
   it is stored only as a salted hash (column E/F) and the plain cell is cleared – on edit or at the first login. */
var USER_COLS = ['Benutzername', 'Name', 'Aktiv', 'Neues Passwort', 'Passwort (verschlüsselt)', 'Salt', 'Letzte Anmeldung'];
var PW_MIN = 8;
var DEFAULT_SITE = 'https://www.stabilumzug.de';   // first catalogue is read from here unless SITE_URL or GITHUB_REPO is set
var STATUS = ['Neu', 'In Arbeit', 'Angebot raus', 'Gebucht', 'Erledigt', 'Verloren'];
var LEAD_COLS = ['ID', 'Eingang', 'Status', 'Zuständig', 'Angebot €', 'Name', 'Telefon', 'E-Mail', 'Kontaktweg', 'Von', 'Nach',
  'km (Familie)', 'km (Maps)', 'Fahrzeit min', 'Termin', 'Haushalt', 'Zugang Auszug', 'Zugang Einzug', 'Halteverbot', 'Räume',
  'Anzahl', 'Volumen min m³', 'Volumen max m³', 'Gewicht kg', 'Fahrzeug', 'Team', 'Stunden', 'Vertrauen', 'Stammdaten',
  'Quelle', 'Sprache', 'Nachricht', 'Referenz', 'Einwilligung', 'Daten (JSON)', 'Leistung', 'Notizen', 'Kundentoken', 'Angebot gesendet',
  'Kostenträger', 'Vorvereinbarung'];
/* Who pays for the move (planner, "Wer bezahlt den Umzug?"): an offer for these goes to the payer, not to the customer. */
var PAYERS = ['Selbstzahler', 'Arbeitgeber', 'Jobcenter', 'Sozialamt', 'Andere'];
var JSON_COL = LEAD_COLS.indexOf('Daten (JSON)') + 1;   // 1-based
var SERVICE_DE = {moves: 'Umzug', clearance: 'Entrümpelung', dissolution: 'Wohnungsauflösung', transport: 'Transport', other: 'Sonstiges'};
var ITEM_COLS = ['Anfrage', 'item_id', 'Gegenstand', 'Größe', 'Anzahl', 'Herkunft', 'm³ je Stück', 'm³ gesamt'];
var QUOTE_COLS = ['Anfrage', 'Version', 'Erstellt', 'Stammdaten', 'Position', 'Basis', 'Menge', 'Einheit', 'Satz €', 'Betrag €'];
var CAT_COLS = ['item_id', 'Größe', 'Name DE', 'Name EN', 'Suchwörter', 'Raum', 'Volumen m³', 'kg min', 'kg max', 'Abbau min', 'Aufbau min', 'Träger', 'Zerbrechlich', 'Aktiv'];
var AUDIT_COLS = ['Zeit', 'Nutzer', 'Tab', 'Zelle', 'Alt', 'Neu'];
var DRAFT_COLS = ['Referenz', 'Token', 'Gespeichert', 'Läuft ab', 'Daten (JSON)'];
/* Route checks on the website: only postcode and town are stored, never the street – anonymous interest, no personal data. */
var ROUTE_COLS = ['Zeit', 'Von (PLZ Ort)', 'Nach (PLZ Ort)', 'km', 'Fahrzeit min', 'Seite', 'Sprache', 'Quelle'];
/* Appointments booked on the website (Termine tab). */
var APPT_COLS = ['Nr', 'Eingang', 'Status', 'Art', 'Datum', 'Uhrzeit', 'Dauer min', 'Name', 'Telefon', 'E-Mail', 'Adresse', 'Umzug nach',
  'Nachricht', 'Anfrage', 'Sprache', 'Quelle', 'Kalender', 'Notiz'];
var APPT_STATUS = ['Gebucht', 'Bestätigt', 'Verschoben', 'Erledigt', 'Abgesagt'];
var APPT_TYPES = {
  visit: {de: 'Besichtigung vor Ort', en: 'On-site viewing', min: 60},
  video: {de: 'Video-Besichtigung', en: 'Video viewing', min: 30},
  call: {de: 'Rückruf und Beratung', en: 'Call-back and advice', min: 30}
};
/* Website traffic, counted without cookies: one row per day, page, source, device and language (Besuche tab). */
var VISIT_COLS = ['Datum', 'Seite', 'Quelle', 'Gerät', 'Sprache', 'Aufrufe', 'Einstiege'];

/* Bookable hours per weekday (0 = Sunday): [from, to] in hours, set in Konfiguration "termin_zeiten" as JSON. */
var APPT_HOURS_DEFAULT = {1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 16]};
function apptHours_() {
  var v = config_('termin_zeiten');
  try { var o = JSON.parse(v); if (o && typeof o === 'object') return o; } catch (err) {}
  return APPT_HOURS_DEFAULT;
}
/* Days without appointments (holidays, full days): Konfiguration "termin_gesperrt", dates separated by commas. */
function apptBlocked_() { return String(config_('termin_gesperrt') || '').split(/[\s,;]+/).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }); }
/* The Art column holds the German label; back to the key (visit, video, call). */
function apptType_(label) { for (var k in APPT_TYPES) if (APPT_TYPES[k].de === String(label) || k === String(label)) return k; return String(label); }
function hhmm_(min) { return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2); }

/* All appointments as objects (newest last). */
function allAppts_() {
  var sh = ss_().getSheetByName(TAB.appts);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, APPT_COLS.length).getValues().filter(function (v) { return v[0]; }).map(function (v, i) {
    var g = function (n) { return v[APPT_COLS.indexOf(n)]; };
    var time = g('Uhrzeit') instanceof Date ? Utilities.formatDate(g('Uhrzeit'), 'Europe/Berlin', 'HH:mm') : String(g('Uhrzeit')).replace(/^'/, '');
    return {row: i + 2, nr: String(g('Nr')), received: iso_(g('Eingang')), status: String(g('Status')), type: apptType_(g('Art')), date: String(day_(g('Datum'))).replace(/^'/, ''), time: time,
      min: Number(g('Dauer min')) || 30, name: String(g('Name')), phone: String(g('Telefon')), email: String(g('E-Mail')), address: String(g('Adresse')),
      to: String(g('Umzug nach')), message: String(g('Nachricht')), lead: String(g('Anfrage')), lang: String(g('Sprache') || 'DE'), source: String(g('Quelle')),
      calendar: String(g('Kalender') || ''), note: String(g('Notiz') || '')};
  });
}

/* Free start times per day for the next `days` days, starting tomorrow (Berlin time). Every 30 minutes; an appointment
   needs its whole length inside the opening hours and must not overlap another one. On-site viewings are not offered
   on days with a booked move. Returns [{date, slots: ['09:00', …]}]. */
/* What every slot calculation needs, read from the sheet once (several types can share it). */
function slotBase_(withMoveDays) {
  var b = {hours: apptHours_(), blocked: apptBlocked_(), taken: {}, moveDays: {}};
  allAppts_().forEach(function (a) {
    if (a.status === 'Abgesagt') return;
    var m = a.time.split(':'), s = Number(m[0]) * 60 + Number(m[1]);
    (b.taken[a.date] = b.taken[a.date] || []).push([s, s + a.min]);
  });
  if (withMoveDays) {
    var ls = ss_().getSheetByName(TAB.leads);
    if (ls && ls.getLastRow() > 1) ls.getRange(2, 1, ls.getLastRow() - 1, LEAD_COLS.length).getValues().forEach(function (v) {
      if (v[LEAD_COLS.indexOf('Status')] === 'Gebucht') b.moveDays[day_(v[LEAD_COLS.indexOf('Termin')])] = true;
    });
  }
  return b;
}

function freeSlots_(type, days, todayIso, base) {
  var T = APPT_TYPES[type]; if (!T) return [];
  base = base || slotBase_(type === 'visit');
  var hours = base.hours, blocked = base.blocked, taken = base.taken, moveDays = type === 'visit' ? base.moveDays : {};
  var out = [], base = new Date((todayIso || Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd')) + 'T12:00:00');
  for (var i = 1; i <= (days || 21); i++) {
    var d = new Date(base.getTime() + i * 864e5), iso = Utilities.formatDate(d, 'Europe/Berlin', 'yyyy-MM-dd');
    var h = hours[d.getDay()] || hours[String(d.getDay())], slots = [];
    if (h && blocked.indexOf(iso) < 0 && !moveDays[iso]) {
      for (var s = h[0] * 60; s + T.min <= h[1] * 60; s += 30) {
        var busy = (taken[iso] || []).some(function (r) { return s < r[1] && s + T.min > r[0]; });
        if (!busy) slots.push(hhmm_(s));
      }
    }
    out.push({date: iso, slots: slots});
  }
  return out;
}

/* Calendar file (.ics) for an appointment, so customer and office can add it with one click. */
function ics_(a, title, location, description) {
  var p = a.date.split('-'), t = a.time.split(':');
  var start = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(t[0]), Number(t[1])), end = new Date(start.getTime() + a.min * 60000);
  var z = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
  var e = function (s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stabil Umzug//Termine//DE', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + a.nr + '@stabilumzug.de', 'DTSTAMP:' + z(new Date()), 'DTSTART:' + z(start), 'DTEND:' + z(end),
    'SUMMARY:' + e(title), 'LOCATION:' + e(location), 'DESCRIPTION:' + e(description), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function apptStart_(a) { var p = a.date.split('-'), t = a.time.split(':'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(t[0]), Number(t[1])); }
function dayDeLong_(iso) {
  var d = new Date(iso + 'T12:00:00'), wd = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()];
  return wd + ', ' + iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
}
var FLOORS = ['EG', '1–2', '3–4', '5+'], LIFTS = ['kein Aufzug', 'Aufzug klein', 'Aufzug groß', 'Aufzug ?'], PARKS = ['vor der Tür', 'bis 30 m', 'über 30 m', 'Parken ?'];
var HH = ['1 Person', '2 Personen', '3–4', '5+'];
var SRC_DE = {pick: 'Katalog', custom: 'Eigener', list: 'Liste', photo: 'Foto', preset: 'Vorlage', guess: 'Schätzung'};
var ROOM_DE = {living: 'Wohnzimmer', bedroom: 'Schlafzimmer', kitchen: 'Küche', bath: 'Bad', kids: 'Kinderzimmer', office: 'Arbeitszimmer', cellar: 'Keller'};
var VEH_DE = {sprinter: 'Transporter 3,5 t', lkw75: 'Koffer-LKW 7,5 t', lkw12: 'LKW 12 t'};

/* Placeholder planning rates from the design handoff. The company replaces them in the "Preise" tab. */
var DEFAULT_RATES = [
  ['hour', 'Arbeit je Person und Stunde', 45, '€/h'],
  ['veh_sprinter', 'Transporter 3,5 t je Tag', 120, '€/Tag'],
  ['veh_lkw75', 'Koffer-LKW 7,5 t je Tag', 190, '€/Tag'],
  ['veh_lkw12', 'LKW 12 t je Tag', 260, '€/Tag'],
  ['km', 'Strecke je km (hin und zurück)', 0.95, '€/km'],
  ['asm_min', 'Ab- und Aufbau je Minute', 0.75, '€/min'],
  ['access', 'Zugang je Zugangspunkt und m³', 2.5, '€'],
  ['hvz', 'Halteverbotszone je Adresse', 120, '€'],
  ['min_price', 'Mindestpreis', 390, '€']
];

/* ------------------------------------------------------------------ small helpers */

function clip_(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 200); }
/* Values starting with = + - @ would be read as formulas by Sheets. */
function cell_(s, n) { s = clip_(s, n); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function iso_(v) { return v instanceof Date ? v.toISOString() : (v == null ? '' : String(v)); }
/* Move date: a calendar day. Sheets turns "2026-11-07" into a Date at local midnight – format it in Berlin time, not UTC. */
function usersSheet_() {
  var s = ss_(), sh = s.getSheetByName(TAB.users);
  if (!sh) {
    sh = s.insertSheet(TAB.users);
    sh.getRange(1, 1, 1, USER_COLS.length).setValues([USER_COLS]).setFontWeight('bold').setBackground('#17304f').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(1, USER_COLS.length + 2).setValue('Neuer Benutzer: Benutzername, Name, Aktiv = ja und ein Passwort (mind. ' + PW_MIN + ' Zeichen) unter „Neues Passwort“ eintragen. ' +
      'Es wird sofort verschlüsselt und die Zelle geleert. Löschen: Zeile löschen oder Aktiv = nein. Passwort ändern: neues Passwort eintragen.');
  }
  return sh;
}
function hashPw_(pass, salt) {
  var h = String(pass);
  for (var i = 0; i < 1000; i++) h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h, String(salt)));
  return h;
}
/* Turns the typed password in row `row` into hash + salt and clears it. Returns '' or an error text. */
function setUserPw_(sh, row, plain) {
  plain = String(plain || '');
  var c = function (n) { return USER_COLS.indexOf(n) + 1; };
  sh.getRange(row, c('Neues Passwort')).setValue('');
  if (plain.length < PW_MIN) return 'Passwort zu kurz (mind. ' + PW_MIN + ' Zeichen) – bitte ein neues eintragen.';
  var salt = Utilities.getUuid().replace(/-/g, '');
  sh.getRange(row, c('Passwort (verschlüsselt)'), 1, 2).setValues([[hashPw_(plain, salt), salt]]);
  return '';
}

/* Admin app (backend/admin-script): ?a=<request> opens that request. Override with "admin_url" in the Konfiguration tab. */
var ADMIN_URL = 'https://script.google.com/macros/s/AKfycbzUZgpxmhV4uVShxvhiZIYfYCCA7MUS3EbQUi5xGdONb-3d_Ddxeh5Iw2QroV9a7dc4/exec';
function adminUrl_(id) {
  var u = '';
  try { u = String(config_('admin_url') || ''); } catch (err) {}
  return (/^https:\/\//.test(u) ? u : ADMIN_URL) + (id ? '?a=' + encodeURIComponent(id) : '');
}
function adminLink_(id) { return 'Im Admin öffnen: ' + adminUrl_(id); }

/* Wished moving date as text: a fixed day ("2026-11-07") or "flexibel" with the wished window ("flexibel 01.11.2026–15.11.2026"). */
function moveDate_(f1, long) {
  f1 = f1 || {};
  var ok = function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(String(x || '')); }, de = function (x) { return x.split('-').reverse().join('.'); };
  if (f1.dateMode === 'fixed' && ok(f1.date)) return long ? de(f1.date) : f1.date;
  var a = ok(f1.dateFrom) ? f1.dateFrom : '', b = ok(f1.dateTo) ? f1.dateTo : '';
  if (a && b && b < a) { var x = a; a = b; b = x; }
  var w = a && b ? (long ? 'zwischen ' + de(a) + ' und ' + de(b) : de(a) + '–' + de(b)) : a ? 'ab ' + de(a) : b ? 'bis ' + de(b) : '';
  return long ? 'flexibel' + (w ? ', ' + w : ', nach Absprache') : 'flexibel' + (w ? ' ' + w : '');
}
function day_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Europe/Berlin', 'yyyy-MM-dd') : (v == null ? '' : String(v)); }
/* Decimal number in German notation for texts the customer reads ("4,6 Std."). */
function de_(x, d) { return String(round_(x, d)).replace('.', ','); }
function round_(x, d) { var f = Math.pow(10, d == null ? 1 : d); return Math.round(x * f) / f; }
function sheet_(name) { var sh = ss_().getSheetByName(name); if (!sh) throw new Error('Tab fehlt: ' + name + ' – bitte „Einrichten“ ausführen.'); return sh; }
/* Company data printed on every document. Stored in the Konfiguration tab (key "firma_…"); these are the defaults. */
var COMPANY_FIELDS = [
  ['name', 'Firmenname', 'Stabil Umzug'], ['owner', 'Inhaber', 'Ibrahim Abdelaal'], ['legal', 'Rechtsform', 'Einzelunternehmen'],
  ['street', 'Straße und Hausnummer', 'Karlstraße 32'], ['city', 'PLZ und Ort', '45329 Essen'],
  ['phone', 'Telefon', '0163 9688190'], ['email', 'E-Mail', 'info@stabilumzug.de'], ['web', 'Website', 'www.stabilumzug.de'],
  ['vat_id', 'USt-IdNr.', 'DE458214531'], ['tax_no', 'Steuernummer', ''],
  ['bank', 'Bank', ''], ['iban', 'IBAN', ''], ['bic', 'BIC', ''],
  ['small', 'Kleinunternehmer nach § 19 UStG (ja/nein)', 'nein'], ['vat', 'Standard-USt-Satz %', 19],
  ['price_mode', 'Preise eingeben als (brutto/netto)', 'brutto'], ['pay_days', 'Zahlungsziel Tage', 14], ['offer_days', 'Angebot gültig Tage', 14],
  ['bcc', 'Kopie gesendeter Belege an (E-Mail)', '']
];

function company_() {
  var c = {}, all = {}, sh = ss_().getSheetByName(TAB.config);   // one read of the Konfiguration tab, not one per field
  if (sh) sh.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0] !== '' && !(r[0] in all)) all[r[0]] = r[1]; });
  COMPANY_FIELDS.forEach(function (f) { var v = all['firma_' + f[0]]; c[f[0]] = v === '' || v == null ? f[2] : v; });
  c.small = /^(ja|yes|true|1)$/i.test(String(c.small));
  c.vat = Number(c.vat) || 0; c.pay_days = Number(c.pay_days) || 0; c.offer_days = Number(c.offer_days) || 0;
  c.price_mode = String(c.price_mode).toLowerCase() === 'netto' ? 'net' : 'gross';
  return c;
}

function config_(key) {
  var sh = ss_().getSheetByName(TAB.config);
  if (!sh) return '';
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === key) return v[i][1];
  return '';
}
function setConfig_(key, value) {
  var sh = sheet_(TAB.config), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  sh.appendRow([key, value]);
}

/* Sheets created before a column was added get the new header cells. */
function ensureLeadHeader_() {
  var sh = sheet_(TAB.leads), have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  if (have.length >= LEAD_COLS.length && have[LEAD_COLS.length - 1] === LEAD_COLS[LEAD_COLS.length - 1]) return;
  sh.getRange(1, 1, 1, LEAD_COLS.length).setValues([LEAD_COLS]).setFontWeight('bold').setBackground('#201e1d').setFontColor('#f3f2f2');
}

/* Column number (1-based) of a lead column by its header name. */
function leadCol_(name) { var i = LEAD_COLS.indexOf(name); if (i < 0) throw new Error('Spalte unbekannt: ' + name); return i + 1; }

/* The lead row with this ID: {row, values}. */
function findLead_(id) {
  var sh = sheet_(TAB.leads), ids = sh.getRange(1, 1, Math.max(1, sh.getLastRow()), 1).getValues();
  for (var i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return {row: i + 1, values: sh.getRange(i + 1, 1, 1, LEAD_COLS.length).getValues()[0]};
  }
  return null;
}

/* ------------------------------------------------------------------ master data (Katalog + Regeln tabs) */

function masterVersion_() { return String(config_('master_version') || ''); }

function masterFromSheet_() {
  var rows = sheet_(TAB.catalog).getDataRange().getValues().slice(1);
  var items = [], byId = {};
  rows.forEach(function (r) {
    var id = String(r[0] || '').trim();
    if (!id || String(r[13]).toLowerCase() === 'nein') return;
    var kg = [Number(r[7]) || 0, Number(r[8]) || 0], v = Number(r[6]) || 0, variant = String(r[1] || '').trim();
    var it = byId[id];
    if (!it) {
      it = {id: id, de: String(r[2]), en: String(r[3] || r[2]),
        syn: String(r[4] || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(String),
        room: String(r[5] || 'all'), dis: Number(r[9]) || 0, asm: Number(r[10]) || 0, crew: Number(r[11]) || 1};
      if (String(r[12]).toLowerCase() === 'ja') it.fragile = true;
      byId[id] = it; items.push(it);
    }
    if (variant) { (it.vars = it.vars || []).push({l: variant, v: v, kg: kg}); }
    else { it.v = v; it.kg = kg; }
  });
  var settings = {};
  sheet_(TAB.settings).getDataRange().getValues().slice(1).forEach(function (r) { if (r[0]) settings[String(r[0])] = r[1]; });
  var num = function (k, d) { var x = Number(settings[k]); return isNaN(x) || settings[k] === '' ? d : x; };
  var parse = function (k) { try { return JSON.parse(settings[k]); } catch (err) { return null; } };
  return {
    version: masterVersion_() || 'sheet',
    rooms: String(settings.rooms || 'living,bedroom,kitchen,bath,kids,office,cellar').split(',').map(function (x) { return x.trim(); }),
    items: items,
    presets: parse('presets') || {},
    guess: parse('guess') || {},
    rules: {
      buffer: num('buffer', 0.1),
      range: {high: num('range_high', 0.08), medium: num('range_medium', 0.18), low: num('range_low', 0.35)},
      weight: {pick: num('weight_pick', 1), custom: num('weight_custom', 1), list: num('weight_list', 0.6), photo: num('weight_photo', 0.6),
        preset: num('weight_preset', 0.2), guess: num('weight_guess', 0.2)},
      vehicles: [{id: 'sprinter', cap: num('cap_sprinter', 20)}, {id: 'lkw75', cap: num('cap_lkw75', 38)}, {id: 'lkw12', cap: num('cap_lkw12', 50)}],
      defaultKm: num('default_km', 20),
      customDensity: num('custom_density', 120)
    }
  };
}

function rates_() {
  var r = {};
  sheet_(TAB.rates).getDataRange().getValues().slice(1).forEach(function (x) { if (x[0]) r[String(x[0])] = Number(x[2]) || 0; });
  DEFAULT_RATES.forEach(function (d) { if (r[d[0]] == null) r[d[0]] = d[2]; });
  return r;
}

/* ------------------------------------------------------------------ quotes */

/* Suggested quote lines for a planner request: [Position, Basis, Menge, Einheit, Satz €]. Short-form requests
   (no inventory) get labour/vehicle/distance placeholders to fill in. */
function quoteLines_(s, values, master, R) {
  var kmMaps = Number(values[leadCol_('km (Maps)') - 1]);
  if (!s || !s.f1 || !s.inv) {
    var km = kmMaps > 0 ? kmMaps : 0;
    return {est: null, lines: [
      ['Arbeit', 'Personen × Stunden', 0, 'Std.', R.hour],
      ['Fahrzeug', 'Fahrzeug und Tage', 1, 'Tag', R.veh_sprinter],
      ['Strecke', km ? km + ' km × 2' : 'km × 2', km * 2, 'km', R.km],
      ['Entsorgung', 'nach Menge und Material', 0, '', 0],
      ['Zusatzleistungen', 'nach Absprache', 0, '', 0]
    ]};
  }
  if (kmMaps > 0) s.f1.km = String(kmMaps);
  var est = Estimator.estimate(s, master);
  var acc = Estimator.accessFactor(s.acc.old) + Estimator.accessFactor(s.acc['new']);
  var days = Math.max(1, Math.ceil(est.hours / 9));
  return {est: est, lines: [
    ['Arbeit', est.crew + ' Personen × ' + de_(est.hours) + ' Std.', round_(est.crew * est.hours), 'Std.', R.hour],
    ['Fahrzeug', VEH_DE[est.vehicle] + ' · ' + days + ' Tag(e)', days, 'Tag', R['veh_' + est.vehicle]],
    ['Strecke', est.km + ' km × 2 × ' + est.trips + ' Fahrt(en)' + (est.kmGuess ? ' (geschätzt)' : ''), est.km * 2 * est.trips, 'km', R.km],
    ['Ab- und Aufbau', est.asmMin + ' Minuten laut Katalog', est.asmMin, 'min', R.asm_min],
    ['Zugang', 'Zugangsfaktor ' + de_(acc) + ' × ' + de_(est.vol) + ' m³', round_(acc * est.vol), 'Pkt.', R.access],
    ['Halteverbotszone', s.hvz ? 'gewünscht' : 'nicht gewünscht', s.hvz ? 1 : 0, 'Adr.', R.hvz],
    ['Verpacken', 'nach Absprache', 0, '', 0],
    ['Extras (Küche, Entsorgung, Lager)', 'nach Absprache', 0, '', 0]
  ]};
}

function quoteTotal_(lines, minPrice) {
  var sum = 0;
  lines.forEach(function (l) { sum += (Number(l[2]) || 0) * (Number(l[4]) || 0); });
  return Math.max(Number(minPrice) || 0, Math.round(sum * 100) / 100);
}

/* Writes a new quote version to the Angebote tab (lines with formulas, so the office can edit them in the sheet too)
   and the total into the request row. Returns {version, total}. */
function writeQuote_(id, lines, masterVersion, R) {
  var q = sheet_(TAB.quotes), data = q.getDataRange().getValues(), version = 1;
  data.forEach(function (r) { if (r[0] === id) version = Math.max(version, Number(r[1]) + 1); });
  var start = q.getLastRow() + 1, now = new Date();
  q.getRange(start, 1, lines.length, QUOTE_COLS.length).setValues(lines.map(function (l) {
    return [id, version, now, masterVersion, cell_(l[0], 80), cell_(l[1], 160), Number(l[2]) || 0, clip_(l[3], 10), Number(l[4]) || 0, ''];
  }));
  q.getRange(start, 10, lines.length, 1).setFormulasR1C1(lines.map(function () { return ['=R[0]C[-3]*R[0]C[-1]']; }));
  q.getRange(start + lines.length, 1, 1, QUOTE_COLS.length).setValues([[id, version, now, masterVersion, 'Summe', 'mindestens ' + R.min_price + ' €', '', '', '', '']]);
  q.getRange(start + lines.length, 10).setFormula('=MAX(' + R.min_price + ',SUM(J' + start + ':J' + (start + lines.length - 1) + '))');
  q.getRange(start + lines.length, 1, 1, QUOTE_COLS.length).setFontWeight('bold').setBorder(true, null, null, null, null, null);
  var total = quoteTotal_(lines, R.min_price);
  var hit = findLead_(id);
  if (hit) sheet_(TAB.leads).getRange(hit.row, leadCol_('Angebot €')).setValue(total);
  return {version: version, total: total};
}

/* Latest saved quote version for a request: {version, lines} or null. */
function latestQuote_(id) {
  var data = sheet_(TAB.quotes).getDataRange().getValues(), best = 0, lines = [];
  data.forEach(function (r) { if (r[0] === id) best = Math.max(best, Number(r[1]) || 0); });
  if (!best) return null;
  data.forEach(function (r) { if (r[0] === id && Number(r[1]) === best && r[4] !== 'Summe') lines.push([String(r[4]), String(r[5]), Number(r[6]) || 0, String(r[7]), Number(r[8]) || 0]); });
  return {version: best, lines: lines};
}

/* ------------------------------------------------------------------ appointment e-mails (website and admin) */

/* E-mails about an appointment. kind: booked (customer + office), cancelled or moved (customer). Shared by the admin. */
function apptMails_(a, kind, note) {
  var T = APPT_TYPES[a.type] || {de: a.type, en: a.type, min: a.min};
  var en = a.lang === 'EN', when = (en ? a.date.split('-').reverse().join('/') : dayDeLong_(a.date)) + (en ? ', ' : ', ') + a.time + (en ? '' : ' Uhr');
  var where = a.type === 'visit' ? a.address : a.type === 'video' ? (en ? 'Video call (WhatsApp)' : 'Videoanruf (WhatsApp)') : (en ? 'Phone call' : 'Telefon');
  var how = {
    visit: en ? 'We come to ' + a.address + ', look at everything that needs to be moved and give you a fixed quote afterwards. Takes about 60 minutes, free of charge.'
      : 'Wir kommen zu Ihnen (' + a.address + '), sehen uns alles an, was umziehen soll, und schicken Ihnen danach ein verbindliches Angebot. Dauer etwa 60 Minuten, kostenlos.',
    video: en ? 'We call you by WhatsApp video on ' + a.phone + '. Walk us through your rooms with your phone – about 30 minutes, free of charge.'
      : 'Wir rufen Sie per WhatsApp-Video unter ' + a.phone + ' an. Sie zeigen uns die Räume mit dem Handy – etwa 30 Minuten, kostenlos.',
    call: en ? 'We call you on ' + a.phone + ' and answer your questions about your move.' : 'Wir rufen Sie unter ' + a.phone + ' an und beantworten Ihre Fragen rund um den Umzug.'
  }[a.type] || '';
  var sign = en ? '\n\nKind regards\nStabil Umzug · Karlstraße 32 · 45329 Essen · 0163 9688190' : '\n\nViele Grüße\nStabil Umzug · Karlstraße 32 · 45329 Essen · 0163 9688190';
  var title = (en ? T.en : T.de) + ' – Stabil Umzug';
  var file = Utilities.newBlob(ics_(a, title, where, how), 'text/calendar', 'termin-' + a.nr + '.ics');
  var subject, body;
  if (kind === 'booked') {
    subject = en ? 'Your appointment on ' + when + ' – Stabil Umzug' : 'Ihr Termin am ' + when + ' – Stabil Umzug';
    body = (en ? 'Hello ' + a.name + ',\n\nthank you – your appointment is booked:\n\n' : 'Guten Tag ' + a.name + ',\n\nvielen Dank – Ihr Termin ist gebucht:\n\n') +
      (en ? T.en : T.de) + '\n' + when + ' (' + a.min + ' min)\n' + where + '\n\n' + how +
      (en ? '\n\nThe calendar file is attached. Need to change it? Just reply to this e-mail or call us.' : '\n\nDie Kalenderdatei ist angehängt. Sie möchten den Termin ändern? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.') +
      (en ? '\n\nReference: ' : '\n\nTerminnummer: ') + a.nr + sign;
  } else if (kind === 'cancelled') {
    subject = en ? 'Appointment cancelled – Stabil Umzug' : 'Termin abgesagt – Stabil Umzug';
    body = (en ? 'Hello ' + a.name + ',\n\nunfortunately we have to cancel your appointment on ' + when + '.' : 'Guten Tag ' + a.name + ',\n\nleider müssen wir Ihren Termin am ' + when + ' absagen.') +
      (note ? '\n\n' + note : '') + (en ? '\n\nPlease book a new time on www.stabilumzug.de/en/appointment/ or call us.' : '\n\nBitte buchen Sie einen neuen Termin auf www.stabilumzug.de/termin/ oder rufen Sie uns an.') + sign;
    file = null;
  } else {
    subject = en ? 'New time for your appointment: ' + when + ' – Stabil Umzug' : 'Neue Zeit für Ihren Termin: ' + when + ' – Stabil Umzug';
    body = (en ? 'Hello ' + a.name + ',\n\nwe have moved your appointment to:\n\n' : 'Guten Tag ' + a.name + ',\n\nwir haben Ihren Termin verschoben auf:\n\n') +
      (en ? T.en : T.de) + '\n' + when + '\n' + where + (note ? '\n\n' + note : '') +
      (en ? '\n\nThe updated calendar file is attached.' : '\n\nDie aktualisierte Kalenderdatei ist angehängt.') + sign;
  }
  try {
    var mail = {to: a.email, subject: subject, body: body, name: 'Stabil Umzug'};
    if (file) mail.attachments = [file];
    var office = String(config_('notify_email') || Session.getEffectiveUser().getEmail() || '');
    if (office) mail.replyTo = office;
    MailApp.sendEmail(mail);
    if (kind === 'booked' && office) {
      MailApp.sendEmail({to: office, subject: 'Neuer Termin ' + a.nr + ': ' + T.de + ' ' + when + ' – ' + a.name, attachments: [Utilities.newBlob(ics_(a, T.de + ': ' + a.name, where, how), 'text/calendar', 'termin-' + a.nr + '.ics')],
        body: ['Neuer Termin über die Website', '', T.de + ' · ' + when + ' (' + a.min + ' min)', 'Name: ' + a.name, 'Telefon: ' + a.phone, 'E-Mail: ' + a.email,
          'Adresse: ' + (a.address || '—'), 'Umzug nach: ' + (a.to || '—'), 'Nachricht: ' + (a.message || '—'), 'Anfrage: ' + a.lead, 'Quelle: ' + a.source, adminLink_(a.lead),
          '', 'Die Kalenderdatei ist angehängt (in Gmail: „Zu Kalender hinzufügen“).', 'Tabelle: ' + ss_().getUrl()].join('\n')});
    }
  } catch (err) { console.error(err); }
}
