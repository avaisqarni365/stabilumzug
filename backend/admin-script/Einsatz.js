/* Crew app (Admin → Einsätze): booked jobs for the crew on the phone, actual values per job, report quote vs. actual.
 *  - api_jobs_(): booked jobs from today on and the jobs of the last 30 days, with their planned values and actuals
 *  - api_jobSave_(id, actual, finish): saves the actual values in the "Einsätze" tab; finish = request becomes "Erledigt"
 *    (the website's daily job then sends the thank-you mail with the review link)
 *  - api_jobReport_(): planned vs. actual hours of all finished jobs with actuals
 */
var JOB_COLS = ['Anfrage', 'Datum', 'Beginn', 'Ende', 'Personen', 'Stunden (Ist)', 'Personenstunden (Ist)', 'km (Ist)', 'Notiz', 'Erfasst von', 'Erfasst am'];

function jobSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(TAB.jobs);
  if (!sh) {
    sh = ss.insertSheet(TAB.jobs);
    sh.getRange(1, 1, 1, JOB_COLS.length).setValues([JOB_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function jobActuals_() {
  var sh = ss_().getSheetByName(TAB.jobs), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, JOB_COLS.length).getValues().forEach(function (r, i) {
    if (!r[0]) return;
    var t = function (v) { return v instanceof Date ? Utilities.formatDate(v, 'Europe/Berlin', 'HH:mm') : String(v || '').replace(/^'/, ''); };
    out[String(r[0])] = {row: i + 2, date: day_(r[1]), start: t(r[2]), end: t(r[3]), crew: Number(r[4]) || 0, hours: Number(r[5]) || 0,
                         manHours: Number(r[6]) || 0, km: r[7] === '' ? null : Number(r[7]), note: String(r[8] || ''), by: String(r[9] || '')};
  });
  return out;
}
function num_(v) { var x = Number(String(v).replace(',', '.')); return isNaN(x) ? 0 : x; }

function api_jobs_() {
  guard_();
  var today = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd'), from = Utilities.formatDate(new Date(Date.now() - 30 * 864e5), 'Europe/Berlin', 'yyyy-MM-dd');
  var act = jobActuals_(), items = {};
  var its = ss_().getSheetByName(TAB.items);
  if (its && its.getLastRow() > 1) its.getRange(2, 1, its.getLastRow() - 1, ITEM_COLS.length).getValues().forEach(function (r) {
    var id = String(r[0]); if (!id) return;
    (items[id] = items[id] || []).push({name: String(r[2]), size: String(r[3]), n: Number(r[4]) || 0});
  });
  var jobs = allLeads_().filter(function (l) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(l.date)) return false;
    return (l.status === 'Gebucht' && l.date >= from) || (l.status === 'Erledigt' && l.date >= from);
  }).map(function (l) {
    return {id: l.id, status: l.status, date: l.date, arrival: l.arrival, name: l.name, phone: l.phone, from: l.from, to: l.to,
            service: l.service, volMin: l.volMin, volMax: l.volMax, vehicle: l.vehicle, crew: Number(l.crew) || null, hours: num_(l.hours) || null,
            km: l.kmMaps, hvz: l.hvz, accOld: l.accOld, accNew: l.accNew, notes: l.notes, items: (items[l.id] || []).slice(0, 80), actual: act[l.id] || null};
  }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.arrival) < String(b.arrival) ? -1 : 1; });
  return {today: today, jobs: jobs};
}

function api_jobSave_(id, a, finish) {
  var who = guard_();
  a = a || {};
  var time = function (v) { v = String(v || ''); return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : ''; };
  var start = time(a.start), end = time(a.end), crew = Math.max(0, Math.min(12, Math.round(num_(a.crew)))), km = a.km === '' || a.km == null ? '' : Math.max(0, Math.min(3000, Math.round(num_(a.km))));
  if (finish && (!start || !end || !crew)) throw new Error('Zum Abschließen bitte Beginn, Ende und Personen eintragen.');
  var hours = '';
  if (start && end) {
    var m = (Number(end.slice(0, 2)) * 60 + Number(end.slice(3))) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)));
    if (m <= 0) m += 24 * 60;   // over midnight
    hours = Math.round(m / 60 * 100) / 100;
  }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var hit = findLead_(id); if (!hit) throw new Error('Anfrage ' + id + ' nicht gefunden.');
    var l = leadObj_(hit.values), sh = jobSheet_(), prev = jobActuals_()[id];
    var row = [id, l.date || '', start ? "'" + start : '', end ? "'" + end : '', crew || '', hours, hours && crew ? Math.round(hours * crew * 100) / 100 : '', km,
               cell_(a.note || '', 1000), who, new Date()];
    if (prev) sh.getRange(prev.row, 1, 1, JOB_COLS.length).setValues([row]); else sh.appendRow(row);
    var audit = sheet_(TAB.audit);
    audit.appendRow([new Date(), who, TAB.jobs, id, '', 'Ist-Werte: ' + (start || '–') + '–' + (end || '–') + ', ' + (crew || '–') + ' Pers.']);
    if (finish && l.status !== 'Erledigt') {
      sheet_(TAB.leads).getRange(hit.row, leadCol_('Status')).setValue('Erledigt');
      audit.appendRow([new Date(), who, TAB.leads, id + ' · Status', l.status, 'Erledigt (Einsatz abgeschlossen)']);
    }
  } finally { lock.releaseLock(); }
  return api_jobs_();
}

/* Quote vs. actual: planned hours (planner/quote) against measured hours, per job and on average. */
function api_jobReport_() {
  guard_();
  var act = jobActuals_(), rows = [];
  allLeads_().forEach(function (l) {
    var a = act[l.id];
    if (!a || !a.hours) return;
    var plan = num_(l.hours), planMan = plan && Number(l.crew) ? plan * Number(l.crew) : null;
    rows.push({id: l.id, name: l.name, date: l.date, status: l.status, planHours: plan || null, planCrew: Number(l.crew) || null, planManHours: planMan,
               hours: a.hours, crew: a.crew, manHours: a.manHours || (a.hours * a.crew), total: l.total,
               dev: planMan ? Math.round(((a.manHours || a.hours * a.crew) - planMan) / planMan * 1000) / 10 : null});
  });
  rows.sort(function (x, y) { return x.date < y.date ? 1 : -1; });
  var withPlan = rows.filter(function (r) { return r.dev != null; });
  var avg = withPlan.length ? Math.round(withPlan.reduce(function (s, r) { return s + r.dev; }, 0) / withPlan.length * 10) / 10 : null;
  var revenue = rows.filter(function (r) { return r.total && r.manHours; });
  var perHour = revenue.length ? Math.round(revenue.reduce(function (s, r) { return s + r.total; }, 0) / revenue.reduce(function (s, r) { return s + r.manHours; }, 0)) : null;
  return {rows: rows.slice(0, 100), count: rows.length, avgDev: avg, perManHour: perHour};
}
