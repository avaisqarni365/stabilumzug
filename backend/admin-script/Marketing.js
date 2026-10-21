/* Marketing planner (Admin → Statistik → Marketing).
 *  - Which channel brings requests, orders and revenue (from Anfragen "Quelle", status and paid invoices).
 *  - The own rates the budget calculation uses: visit → request, request → order, average order value.
 *  - A keyword list in the "Marketing" tab: keyword, target page, searches per month, Google position, click price.
 *    Searches and click prices come from the Google Ads Keyword Planner, positions from Google Search Console;
 *    nothing is invented here – empty cells stay empty and the page says where to get the numbers.
 */
var MKT_COLS = ['Keyword', 'Zielseite', 'Suchanfragen/Monat', 'Position', 'Klickpreis €', 'Notiz', 'Stand'];

// Start list for Essen (target pages exist on the website); numbers are filled in by the owner
var MKT_SEED = [
  ['Umzugsunternehmen Essen', '/'], ['Umzug Essen', '/umzuege/'], ['Umzugsfirma Essen', '/'], ['Umzugshelfer Essen', '/umzuege/'],
  ['Entrümpelung Essen', '/entruempelung/'], ['Wohnungsauflösung Essen', '/wohnungsaufloesung/'], ['Möbeltransport Essen', '/transport/'],
  ['Möbel abholen und aufbauen Essen', '/moebel-abholung/'], ['IKEA Möbel aufbauen lassen Essen', '/moebel-abholung/'],
  ['Küchenmontage Essen', '/zusatzleistungen/'], ['Halteverbotszone Essen', '/ratgeber/halteverbotszone/'],
  ['Umzug Essen Rüttenscheid', '/umzug-essen/ruettenscheid/'], ['Umzug Essen Steele', '/umzug-essen/steele/'],
  ['Umzug Bochum', '/umzug-bochum/'], ['Umzug Gelsenkirchen', '/umzug-gelsenkirchen/'], ['Umzug Mülheim', '/umzug-muelheim/'],
  ['Umzugskosten Essen', '/ratgeber/umzugskosten/']
];

function mktSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(TAB.marketing);
  if (!sh) {
    sh = ss.insertSheet(TAB.marketing);
    sh.getRange(1, 1, 1, MKT_COLS.length).setValues([MKT_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, MKT_SEED.length, 2).setValues(MKT_SEED);
  }
  return sh;
}

/* Lead source text → channel ("google / cpc / …" → Google Ads, "google.com" → Google Suche, …) */
function channel_(src) {
  var s = String(src || '').toLowerCase().trim();
  if (!s || s === 'direkt') return 'Direkt / Empfehlung';
  if (/admin-planer|telefon|büro/.test(s)) return 'Telefon / Büro';
  if (/cpc|ppc|ads|gclid/.test(s)) return 'Google Ads';
  if (/google/.test(s)) return 'Google Suche';
  if (/whatsapp|wa\.me/.test(s)) return 'WhatsApp';
  if (/chat/.test(s)) return 'Chat';
  if (/facebook|instagram|fb\.|meta/.test(s)) return 'Facebook / Instagram';
  if (/bing|duckduckgo|ecosia|yahoo/.test(s)) return 'Andere Suchmaschinen';
  if (/kleinanzeigen|myhammer|check24|umzugsauktion|portal/.test(s)) return 'Portale';
  return 'Andere Webseiten';
}

function api_marketing_(days) {
  guard_();
  days = Math.max(7, Math.min(365, Number(days) || 90));
  var since = Date.now() - days * 864e5, ch = {}, leads = 0, booked = 0;
  var paid = {};   // lead → paid invoice amount
  allDocs_().forEach(function (d) { if (d.type !== 'offer' && d.lead && d.paid > 0) paid[d.lead] = (paid[d.lead] || 0) + d.paid; });
  allLeads_().forEach(function (l) {
    if (new Date(l.received).getTime() < since) return;
    var c = channel_(l.source), o = ch[c] = ch[c] || {name: c, requests: 0, booked: 0, revenue: 0};
    var won = ['Gebucht', 'Erledigt'].indexOf(l.status) >= 0;
    o.requests++; leads++;
    if (won) { o.booked++; booked++; }
    o.revenue += paid[l.id] || 0;
  });
  // own rates: visits from the anonymous page counts, order value from paid invoices (else accepted offers)
  var visits = 0, from = Utilities.formatDate(new Date(since), 'Europe/Berlin', 'yyyy-MM-dd'), vs = ss_().getSheetByName(TAB.visits);
  if (vs && vs.getLastRow() > 1) vs.getRange(2, 1, vs.getLastRow() - 1, VISIT_COLS.length).getValues().forEach(function (r) {
    if (String(day_(r[0])).replace(/^'/, '') >= from) visits += Number(r[6]) || 0;
  });
  var values = Object.keys(paid).map(function (k) { return paid[k]; });
  if (!values.length) allDocs_().forEach(function (d) { if (d.type === 'offer' && d.status === 'Angenommen' && d.gross > 0) values.push(d.gross); });
  var avg = values.length ? values.reduce(function (a, b) { return a + b; }, 0) / values.length : 0;
  var sh = mktSheet_(), n = sh.getLastRow();
  var kw = n > 1 ? sh.getRange(2, 1, n - 1, MKT_COLS.length).getValues().filter(function (r) { return String(r[0]).trim(); }).map(function (r) {
    var num = function (v) { return v === '' || v === null || isNaN(Number(v)) ? null : Number(v); };
    return {keyword: String(r[0]), page: String(r[1] || ''), volume: num(r[2]), position: num(r[3]), cpc: num(r[4]), note: String(r[5] || ''), asOf: day_(r[6]) || ''};
  }) : [];
  return {
    period: days, channels: Object.keys(ch).map(function (k) { return ch[k]; }).sort(function (a, b) { return b.requests - a.requests; }),
    rates: {visits: visits, requests: leads, booked: booked,
            visitToRequest: visits ? leads / visits : null, requestToOrder: leads ? booked / leads : null, avgOrder: avg ? Math.round(avg) : null,
            orderSample: values.length},
    keywords: kw, site: typeof SITE_URL !== 'undefined' ? SITE_URL : 'https://www.stabilumzug.de'
  };
}

/* Saves the keyword list (whole table, as edited in the admin). */
function api_marketingSave_(rows) {
  var who = guard_();
  if (!Array.isArray(rows) || rows.length > 200) throw new Error('Liste ungültig.');
  var num = function (v, max) { var x = Number(String(v).replace(',', '.')); return v === '' || v === null || isNaN(x) ? '' : Math.max(0, Math.min(max, x)); };
  var today = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
  var out = rows.filter(function (r) { return r && String(r.keyword || '').trim(); }).map(function (r) {
    var page = String(r.page || '').trim();
    if (page && !/^\/[A-Za-z0-9\/._-]*$/.test(page)) page = '';
    return [cell_(String(r.keyword).trim(), 80), page, num(r.volume, 1000000), num(r.position, 100), num(r.cpc, 100), cell_(r.note || '', 200), "'" + today];
  });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = mktSheet_(), n = sh.getLastRow();
    for (var i = n; i > out.length + 1; i--) sh.deleteRow(i);   // rows no longer in the list
    if (out.length) sh.getRange(2, 1, out.length, MKT_COLS.length).setValues(out);
    sheet_(TAB.audit).appendRow([new Date(), who, TAB.marketing, 'Keywords', '', out.length + ' Zeilen']);
  } finally { lock.releaseLock(); }
  return api_marketing_(90);
}
