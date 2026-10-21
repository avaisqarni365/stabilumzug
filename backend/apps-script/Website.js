/**
 * Stabil Umzug – website API, part 2: appointment booking ("Termin buchen") and cookie-free traffic counting.
 * Called from doGet/doPost in Code.js. Constants (TAB, APPT_*, VISIT_COLS) and freeSlots_/ics_ live in Shared.js.
 */

/* ------------------------------------------------------------------ appointments */

/* Free times for the booking page. Cached for one minute so a busy day does not read the sheet for every visitor. */
/* Free times for one type, or for all types at once (type=all: the booking page switches types without waiting).
   Cached for 5 minutes and cleared by each booking; a booking always checks its time against fresh data. */
var SLOT_TTL = 900;
function slots_(type) {
  if (type !== 'all' && !APPT_TYPES[type]) return {ok: false, error: 'type'};
  ensureWarm_();
  var cache = CacheService.getScriptCache(), key = 'slots_' + type, hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var res = computeSlots_(type);
  cache.put(key, JSON.stringify(res), SLOT_TTL);
  return res;
}
function computeSlots_(type) {
  if (type !== 'all') return {ok: true, type: type, min: APPT_TYPES[type].min, days: freeSlots_(type, 21)};
  var base = slotBase_(true), types = {};
  Object.keys(APPT_TYPES).forEach(function (k) { types[k] = {min: APPT_TYPES[k].min, days: freeSlots_(k, 21, null, base)}; });
  return {ok: true, type: 'all', types: types};
}
/* After a booking: drop the old times and calculate the new ones right away, so the next visitor is not kept waiting. */
function clearSlots_() {
  var cache = CacheService.getScriptCache();
  cache.removeAll(['slots_all'].concat(Object.keys(APPT_TYPES).map(function (k) { return 'slots_' + k; })));
  try { cache.put('slots_all', JSON.stringify(computeSlots_('all')), SLOT_TTL); } catch (err) { console.error(err); }
}

/* Time trigger every 10 minutes (06–22 h): keeps the free times calculated, so the booking page never waits for the
   sheet. Installed by "Einrichten" and, until that has run, by the first visit to the booking page (ensureWarm_). */
function warmSlots() {
  var h = Number(Utilities.formatDate(new Date(), 'Europe/Berlin', 'H'));
  if (h < 6 || h >= 22) return;
  CacheService.getScriptCache().put('slots_all', JSON.stringify(computeSlots_('all')), SLOT_TTL);
}
function ensureWarm_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('WARM_TRIGGER') === '1') return;
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'warmSlots'; });
    if (!has) ScriptApp.newTrigger('warmSlots').timeBased().everyMinutes(10).create();
    props.setProperty('WARM_TRIGGER', '1');
  } catch (err) { console.error(err); try { props.setProperty('WARM_ERR', String(err).slice(0, 200)); } catch (e2) {} }
}

/* ------------------------------------------------------------------ photos with a request
   The customer may add photos of furniture and items (camera or files). The browser shrinks them and sends them
   right after the request, with the one-time token from that answer. They reach the office as one e-mail with the
   photos attached (no extra Google permission needed); the request row notes how many arrived. */
var PHOTO_MAX = 10, PHOTO_MAX_BYTES = 1500000, PHOTO_MAX_BODY = 14000000, PHOTO_TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'};

function photoToken_(id) {
  var k = Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('up_' + id, JSON.stringify({k: k, n: 0}), 7200);   // valid for 2 hours
  return k;
}

function photos_(b) {
  var id = String(b.id || ''), cache = CacheService.getScriptCache(), raw = cache.get('up_' + id), tok = raw ? JSON.parse(raw) : null;
  if (!/^A-\d+$/.test(id) || !tok || tok.k !== String(b.k || '')) return {ok: false, error: 'token'};
  var list = Array.isArray(b.images) ? b.images : [];
  if (!list.length) return {ok: false, error: 'empty'};
  if (tok.n + list.length > PHOTO_MAX) return {ok: false, error: 'too_many'};
  var blobs = [];
  for (var i = 0; i < list.length; i++) {
    var im = list[i] || {}, ext = PHOTO_TYPES[im.type], data = String(im.data || '');
    if (!ext || !data || data.length > PHOTO_MAX_BYTES * 4 / 3 + 4) return {ok: false, error: 'file'};
    var bytes;
    try { bytes = Utilities.base64Decode(data); } catch (err) { return {ok: false, error: 'file'}; }
    blobs.push(Utilities.newBlob(bytes, im.type, id + '-foto-' + (tok.n + i + 1) + '.' + ext));
  }
  tok.n += blobs.length;
  cache.put('up_' + id, JSON.stringify(tok), 7200);

  var driveFolderUrl = '';
  if (typeof DriveApp !== 'undefined') {
    try {
      var rootFolder = ensureDriveFolder_('Stabil Umzug - Kundenfotos');
      if (rootFolder) {
        var leadFolder = ensureDriveFolder_(id, rootFolder);
        if (leadFolder) {
          for (var fi = 0; fi < blobs.length; fi++) {
            leadFolder.createFile(blobs[fi]);
          }
          driveFolderUrl = leadFolder.getUrl();
        }
      }
    } catch (err) { console.error('Drive photo upload error:', err); }
  }

  var note = clip_(b.note, 300), hit = findLead_(id), name = hit ? hit.values[LEAD_COLS.indexOf('Name')] : '';
  if (hit) {
    var col = LEAD_COLS.indexOf('Notizen') + 1, old = String(hit.values[col - 1] || '');
    var driveText = driveFolderUrl ? ' (Google Drive: ' + driveFolderUrl + ')' : '';
    sheet_(TAB.leads).getRange(hit.row, col).setValue(cell_((old ? old + '\n' : '') + 'Fotos: ' + tok.n + ' per E-Mail erhalten' + (driveFolderUrl ? ' und in Google Drive gespeichert' + driveText : '') + (note ? ' – ' + note : ''), 2000));
  }
  var to = config_('notify_email') || Session.getEffectiveUser().getEmail();
  if (to) {
    try {
      MailApp.sendEmail({to: to, subject: 'Fotos zu Anfrage ' + id + (name ? ' – ' + name : '') + ' (' + blobs.length + ')',
        body: [blobs.length + ' Foto(s) zur Anfrage ' + id + ' über die Website.',
               driveFolderUrl ? 'Google Drive Ordner: ' + driveFolderUrl : '',
               note ? 'Hinweis des Kunden: ' + note : '', '',
               adminLink_(id), 'Tabelle: ' + SpreadsheetApp.getActive().getUrl()].filter(Boolean).join('\n'), attachments: blobs});
    } catch (err) { console.error(err); return {ok: false, error: 'mail'}; }
  }
  return {ok: true, n: tok.n, driveUrl: driveFolderUrl};
}

/* ------------------------------------------------------------------ pre-agreement without a price (Vorvereinbarung)
   At the end of the planner the customer may agree to a pre-agreement: all details and every planned item, but no
   price. It goes to the customer as a PDF (for the Jobcenter, the employer or their own files) and to the office.
   Stabil Umzug then sends an offer with a price – to the payer when someone else pays. Binding only once that
   offer is accepted. Always in German: it is meant for German offices. */
function payer_(p) {
  p = p || {};
  var kind = Math.max(0, Math.min(PAYERS.length - 1, Number(p.kind) || 0));
  var o = {kind: kind, label: PAYERS[kind], name: kind ? clip_(p.name, 120) : '', ref: kind ? clip_(p.ref, 60) : '', email: kind ? clip_(p.email, 120) : ''};
  if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) o.email = '';
  o.text = kind ? [o.label + (o.name ? ': ' + o.name : ''), o.ref ? 'Az. ' + o.ref : '', o.email].filter(String).join(' · ') : 'Selbstzahler';
  return o;
}

function preAgreementHtml_(d) {
  var c = company_(), s = d.s, e = d.est, x = function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (ch) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]; }); };
  var dz = function (n, k) { return String(round_(n, k)).replace('.', ','); };   // German decimal comma
  var when = Utilities.formatDate(d.at, 'Europe/Berlin', 'dd.MM.yyyy'), at = Utilities.formatDate(d.at, 'Europe/Berlin', 'dd.MM.yyyy, HH:mm');
  var acc = function (a) { return a ? FLOORS[a.floor] + ', ' + LIFTS[a.lift] + ', ' + PARKS[a.park] : '–'; };
  var date = moveDate_(s.f1, true);
  var rooms = (s.rooms || []).map(function (r) { return (ROOM_DE[r.r] || clip_(r.r, 20)) + (String(r.sqm || '').trim() ? ' (' + clip_(r.sqm, 6) + ' m²)' : ''); }).join(', ');
  var row = function (k, v) { return v ? '<tr><th>' + x(k) + '</th><td>' + x(v) + '</td></tr>' : ''; };
  // the same item from several sources (catalogue, list, preset) shows once
  var items = {}, order = [];
  (d.items || []).forEach(function (r) {
    var k = r[1] + '|' + r[3];
    if (!items[k]) { items[k] = {name: r[2], size: r[3], n: 0, vol: 0}; order.push(k); }
    items[k].n += Number(r[4]) || 0; items[k].vol += Number(r[7]) || 0;
  });
  var list = order.map(function (k, i) {
    var it = items[k];
    return '<tr><td class="n">' + (i + 1) + '</td><td>' + x(it.name) + (it.size ? ' <span class="m">' + x(it.size) + '</span>' : '') + '</td><td class="n">' + it.n + '</td><td class="n">' + dz(it.vol, 2) + '</td></tr>';
  }).join('');
  var p = d.payer;
  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4;margin:16mm 16mm 18mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#17304f;line-height:1.4}' +
    '.top{display:table;width:100%;border-bottom:2px solid #e85a0a;padding-bottom:8px;margin-bottom:14px}.top>div{display:table-cell;vertical-align:top}.top .r{text-align:right;font-size:9pt;color:#55606f}' +
    '.brand{font-size:17pt;font-weight:bold}.brand b{color:#e85a0a}h1{font-size:15pt;margin:0 0 2px}.sub{color:#55606f;margin:0 0 14px}' +
    'h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:.06em;color:#b4420e;margin:16px 0 6px;border-bottom:1px solid #d5d9df;padding-bottom:3px}' +
    'table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:3px 6px 3px 0}.kv th{width:34%;font-weight:normal;color:#55606f}' +
    '.items th{font-size:8.5pt;color:#55606f;border-bottom:1px solid #17304f}.items td{border-bottom:1px solid #e3e6ea}.n{text-align:right;white-space:nowrap}.m{color:#55606f}' +
    '.cols{display:table;width:100%}.cols>div{display:table-cell;width:50%;vertical-align:top;padding-right:12px}' +
    'ol{margin:4px 0 0;padding-left:18px}li{margin:0 0 4px}.ok{margin-top:14px;padding:10px 12px;background:#fff1e8;border:1px solid #f3c4a6}' +
    '.foot{margin-top:18px;font-size:8.5pt;color:#55606f;border-top:1px solid #d5d9df;padding-top:6px}</style></head><body>' +
    '<div class="top"><div><div class="brand">Stabil <b>Umzug</b></div></div><div class="r">' + x(c.name) + ' · Inh. ' + x(c.owner) + '<br>' + x(c.street) + ', ' + x(c.city) +
      '<br>' + x(c.phone) + ' · ' + x(c.email) + '<br>' + x(c.web) + '</div></div>' +
    '<h1>Vorvereinbarung zum Umzug – ohne Preis</h1><p class="sub">Nr. V-' + x(d.id) + ' · vom ' + when + ' · Anfrage ' + x(d.id) + ' · Referenz ' + x(s.ref) + '</p>' +
    '<div class="cols"><div><h2>Kunde</h2><table class="kv">' + row('Name', d.name) + row('Telefon', d.phone) + row('E-Mail', d.email) +
      row('Bisherige Adresse', s.f1.from) + row('Neue Adresse', s.f1.to) + '</table></div>' +
    '<div><h2>Kostenträger</h2><table class="kv">' + (p.kind ? row('Art', p.label) + row('Name / Stelle', p.name) + row('Aktenzeichen / BG-Nr.', p.ref) + row('E-Mail', p.email) +
      row('Leistungsempfänger', d.name) : row('Art', 'Selbstzahler')) + '</table></div></div>' +
    '<h2>Umzug</h2><table class="kv">' + row('Wunschtermin', date) +
      row('Entfernung', d.route && d.route.ok ? d.route.km + ' km, ca. ' + d.route.min + ' min Fahrzeit' : (s.f1.km ? s.f1.km + ' km (Angabe)' : '')) +
      row('Haushalt', HH[s.f1.hh] || '') + row('Zugang Auszug', acc(s.acc.old)) + row('Zugang Einzug', acc(s.acc['new'])) + row('Halteverbotszone', s.hvz ? 'gewünscht' : 'nicht nötig') +
      row('Räume', rooms) + row('Geschätztes Volumen', dz(e.volLow) + '–' + dz(e.volHigh) + ' m³ (Umzugsgut, ohne Gewähr)') +
      row('Planung', VEH_DE[e.vehicle] + (e.trips > 1 ? ', ' + e.trips + ' Fahrten' : '') + ', ' + e.crew + ' Personen, ca. ' + dz(e.hours) + ' Std. (Schätzung)') + '</table>' +
    '<h2>Gegenstände (' + order.length + ' Positionen)</h2>' + (list ? '<table class="items"><thead><tr><th class="n">#</th><th>Gegenstand</th><th class="n">Anzahl</th><th class="n">m³</th></tr></thead><tbody>' + list + '</tbody></table>' : '<p>Keine Gegenstände angegeben.</p>') +
    (d.note ? '<h2>Hinweise des Kunden</h2><p>' + x(d.note) + '</p>' : '') +
    '<h2>Vereinbarung</h2><ol>' +
      '<li>Der Kunde bestätigt, dass die oben stehenden Angaben und die Liste der Gegenstände vollständig und richtig sind.</li>' +
      '<li>Diese Vorvereinbarung enthält keinen Preis. Stabil Umzug erstellt auf ihrer Grundlage ein Angebot mit Preis' + (p.kind ? ' und richtet es auf Wunsch des Kunden direkt an den Kostenträger (' + x(p.name || p.label) + ').' : '.') + '</li>' +
      '<li>Ein verbindlicher Auftrag kommt erst zustande, wenn dieses Angebot angenommen wurde' + (p.kind ? ' bzw. der Kostenträger die Kosten übernimmt' : '') + '. Bis dahin ist die Vorvereinbarung für beide Seiten kostenlos und unverbindlich.</li>' +
      '<li>Ändern sich Umfang, Gegenstände, Zugang oder Termin, passt Stabil Umzug das Angebot an.</li></ol>' +
    '<div class="ok"><b>Zugestimmt:</b> ' + x(d.name) + ', elektronisch über www.stabilumzug.de am ' + at + ' Uhr (Anfrage ' + x(d.id) + ').</div>' +
    '<div class="foot">' + x(c.name) + ' · ' + x(c.legal) + ' · Inhaber ' + x(c.owner) + ' · ' + x(c.street) + ', ' + x(c.city) + ' · ' + x(c.phone) + ' · ' + x(c.email) + '</div>' +
    '</body></html>';
}

function preAgreementPdf_(d) {
  return HtmlService.createHtmlOutput(preAgreementHtml_(d)).getBlob().getAs('application/pdf').setName('Vorvereinbarung-V-' + d.id + '.pdf');
}

function preAgreementMail_(email, en, id, name, pdf) {
  if (!email || !mailOk_(email)) return;
  var c = company_();
  MailApp.sendEmail({to: email, name: c.name, replyTo: c.email, attachments: [pdf],
    subject: en ? 'Your pre-agreement V-' + id + ' – Stabil Umzug' : 'Ihre Vorvereinbarung V-' + id + ' – Stabil Umzug',
    body: (en ? ['Hello ' + name + ',', '', 'thank you for your request ' + id + '. Attached is your pre-agreement V-' + id + ' with all details and items – without a price.',
      'If your employer, the Jobcenter or another office pays for the move, you can hand it in there. We will send the offer with the price within 24 hours' +
      ' – to the payer if you named one.', '', 'The document is in German because it is meant for German offices. Questions? Just reply to this e-mail or call ' + c.phone + '.']
      : ['Guten Tag ' + name + ',', '', 'danke für Ihre Anfrage ' + id + '. Im Anhang finden Sie Ihre Vorvereinbarung V-' + id + ' mit allen Angaben und Gegenständen – ohne Preis.',
      'Zahlt Ihr Arbeitgeber, das Jobcenter oder eine andere Stelle den Umzug, können Sie sie dort einreichen. Das Angebot mit Preis schicken wir innerhalb von 24 Stunden' +
      ' – an den Kostenträger, wenn Sie einen angegeben haben.', '', 'Fragen? Antworten Sie einfach auf diese E-Mail oder rufen Sie an: ' + c.phone + '.']).concat(['', c.name, c.street + ', ' + c.city, c.web]).join('\n')});
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
  var s = cell_(b.s || 'Direkt', 40), d = ['Handy', 'Tablet', 'Computer'].indexOf(b.d) >= 0 ? b.d : 'Computer', l = b.l === 'en' ? 'EN' : 'DE';
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
