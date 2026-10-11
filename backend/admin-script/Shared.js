/* Copied from backend/shared/Shared.js by tools/build.py. Do not edit here. */
/**
 * Stabil Umzug – shared by the website API (backend/apps-script) and the admin app (backend/admin-script).
 * tools/build.py copies this file into both projects as Shared.js – edit it here only.
 * Each project defines ss_(), which returns the company spreadsheet.
 */

var TAB = {
  leads: 'Anfragen', items: 'Gegenstände', quotes: 'Angebote', catalog: 'Katalog', settings: 'Regeln',
  rates: 'Preise', audit: 'Protokoll', drafts: 'Entwürfe', config: 'Konfiguration'
};
var DEFAULT_SITE = 'https://www.stabilumzug.de';   // first catalogue is read from here unless SITE_URL or GITHUB_REPO is set
var STATUS = ['Neu', 'In Arbeit', 'Angebot raus', 'Gebucht', 'Erledigt', 'Verloren'];
var LEAD_COLS = ['ID', 'Eingang', 'Status', 'Zuständig', 'Angebot €', 'Name', 'Telefon', 'E-Mail', 'Kontaktweg', 'Von', 'Nach',
  'km (Familie)', 'km (Maps)', 'Fahrzeit min', 'Termin', 'Haushalt', 'Zugang Auszug', 'Zugang Einzug', 'Halteverbot', 'Räume',
  'Anzahl', 'Volumen min m³', 'Volumen max m³', 'Gewicht kg', 'Fahrzeug', 'Team', 'Stunden', 'Vertrauen', 'Stammdaten',
  'Quelle', 'Sprache', 'Nachricht', 'Referenz', 'Einwilligung', 'Daten (JSON)', 'Leistung', 'Notizen', 'Kundentoken', 'Angebot gesendet'];
var JSON_COL = LEAD_COLS.indexOf('Daten (JSON)') + 1;   // 1-based
var SERVICE_DE = {moves: 'Umzug', clearance: 'Entrümpelung', dissolution: 'Wohnungsauflösung', transport: 'Transport', other: 'Sonstiges'};
var ITEM_COLS = ['Anfrage', 'item_id', 'Gegenstand', 'Größe', 'Anzahl', 'Herkunft', 'm³ je Stück', 'm³ gesamt'];
var QUOTE_COLS = ['Anfrage', 'Version', 'Erstellt', 'Stammdaten', 'Position', 'Basis', 'Menge', 'Einheit', 'Satz €', 'Betrag €'];
var CAT_COLS = ['item_id', 'Größe', 'Name DE', 'Name EN', 'Suchwörter', 'Raum', 'Volumen m³', 'kg min', 'kg max', 'Abbau min', 'Aufbau min', 'Träger', 'Zerbrechlich', 'Aktiv'];
var AUDIT_COLS = ['Zeit', 'Nutzer', 'Tab', 'Zelle', 'Alt', 'Neu'];
var DRAFT_COLS = ['Referenz', 'Token', 'Gespeichert', 'Läuft ab', 'Daten (JSON)'];
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
function round_(x, d) { var f = Math.pow(10, d == null ? 1 : d); return Math.round(x * f) / f; }
function sheet_(name) { var sh = ss_().getSheetByName(name); if (!sh) throw new Error('Tab fehlt: ' + name + ' – bitte „Einrichten“ ausführen.'); return sh; }
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
    ['Arbeit', est.crew + ' Personen × ' + round_(est.hours) + ' Std.', round_(est.crew * est.hours), 'Std.', R.hour],
    ['Fahrzeug', VEH_DE[est.vehicle] + ' · ' + days + ' Tag(e)', days, 'Tag', R['veh_' + est.vehicle]],
    ['Strecke', est.km + ' km × 2 × ' + est.trips + ' Fahrt(en)' + (est.kmGuess ? ' (geschätzt)' : ''), est.km * 2 * est.trips, 'km', R.km],
    ['Ab- und Aufbau', est.asmMin + ' Minuten laut Katalog', est.asmMin, 'min', R.asm_min],
    ['Zugang', 'Zugangsfaktor ' + round_(acc) + ' × ' + round_(est.vol) + ' m³', round_(acc * est.vol), 'Pkt.', R.access],
    ['Halteverbotszone', s.hvz ? 'gewünscht' : 'nicht gewünscht', s.hvz ? 1 : 0, 'Adr.', R.hvz],
    ['Verpacken', 'nach Absprache', 0, '', 0],
    ['Extras (Küche, Entsorgung, Lager)', 'nach Absprache', 0, '', 0],
    ['Versicherung', 'Gesetzliche Haftung inklusive', 0, '', 0]
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
