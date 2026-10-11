/**
 * Stabil Umzug – admin: appointments booked on the website (Termine) and the website traffic dashboard (Statistik).
 * Runs as the signed-in office user: "In Google Kalender" writes to that user's calendar, mails go out from that account.
 */

function apptByNr_(nr) {
  var a = allAppts_().filter(function (x) { return x.nr === String(nr); })[0];
  if (!a) throw new Error('Termin ' + nr + ' nicht gefunden.');
  return a;
}
function apptSet_(a, fields) {
  var sh = sheet_(TAB.appts);
  Object.keys(fields).forEach(function (k) { sh.getRange(a.row, APPT_COLS.indexOf(k) + 1).setValue(fields[k]); });
}

function api_appts() {
  guard_();
  var today = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
  return {appts: allAppts_().sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }), today: today,
    hours: apptHours_(), blocked: apptBlocked_().join(', '), types: APPT_TYPES, statuses: APPT_STATUS};
}

/* Puts the appointment into the signed-in user's Google Calendar (once) and marks it confirmed. */
function api_apptCalendar(nr) {
  var email = guard_();
  var a = apptByNr_(nr), T = APPT_TYPES[a.type] || {de: a.type};
  if (a.calendar) return apptByNr_(nr);
  var start = apptStart_(a), end = new Date(start.getTime() + a.min * 60000);
  var ev = CalendarApp.getDefaultCalendar().createEvent(T.de + ': ' + a.name, start, end, {
    location: a.type === 'visit' ? a.address : '',
    description: ['Termin ' + a.nr + ' · Anfrage ' + a.lead, 'Telefon: ' + a.phone, 'E-Mail: ' + a.email, a.to ? 'Umzug nach: ' + a.to : '', a.message ? 'Nachricht: ' + a.message : '']
      .filter(String).join('\n')
  });
  apptSet_(a, {'Kalender': ev.getId(), 'Status': a.status === 'Gebucht' ? 'Bestätigt' : a.status});
  sheet_(TAB.audit).appendRow([new Date(), email, TAB.appts, a.nr, '', 'In Google Kalender eingetragen']);
  return apptByNr_(nr);
}

/* Status, new time and internal note. Moving checks the new time is free; cancel and move can e-mail the customer. */
function api_apptUpdate(nr, p) {
  var email = guard_();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var a;
  try {
    a = apptByNr_(nr);
    var status = APPT_STATUS.indexOf(p.status) >= 0 ? p.status : a.status, fields = {'Status': status};
    if (p.note !== undefined) fields['Notiz'] = cell_(p.note, 500);
    var moved = p.date && p.time && (p.date !== a.date || p.time !== a.time);
    if (moved) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !/^\d{2}:\d{2}$/.test(p.time)) throw new Error('Datum oder Uhrzeit ungültig.');
      // free time? (the appointment itself does not count)
      var others = allAppts_().filter(function (x) { return x.nr !== a.nr && x.status !== 'Abgesagt' && x.date === p.date; });
      var m = p.time.split(':'), s = Number(m[0]) * 60 + Number(m[1]), h = apptHours_()[new Date(p.date + 'T12:00:00').getDay()];
      var clash = others.some(function (x) { var t = x.time.split(':'), xs = Number(t[0]) * 60 + Number(t[1]); return s < xs + x.min && s + a.min > xs; });
      if (clash || !h || s < h[0] * 60 || s + a.min > h[1] * 60) throw new Error('Die Zeit ' + p.time + ' am ' + p.date + ' ist nicht frei (Öffnungszeiten oder anderer Termin).');
      fields['Datum'] = "'" + p.date; fields['Uhrzeit'] = "'" + p.time; fields['Status'] = 'Verschoben';
    }
    apptSet_(a, fields);
    sheet_(TAB.audit).appendRow([new Date(), email, TAB.appts, a.nr, a.status + ' ' + a.date + ' ' + a.time, fields['Status'] + (moved ? ' ' + p.date + ' ' + p.time : '')]);
  } finally { lock.releaseLock(); }
  var b = apptByNr_(nr);
  if (a.calendar) {
    try {
      var ev = CalendarApp.getDefaultCalendar().getEventById(a.calendar);
      if (ev && b.status === 'Abgesagt') { ev.deleteEvent(); apptSet_(b, {'Kalender': ''}); }
      else if (ev && moved) { var st = apptStart_(b); ev.setTime(st, new Date(st.getTime() + b.min * 60000)); }
    } catch (err) { console.error(err); }
  }
  if (p.notify && b.email && (b.status === 'Abgesagt' || moved)) apptMails_(b, b.status === 'Abgesagt' ? 'cancelled' : 'moved', clip_(p.message || p.note || '', 500));
  return apptByNr_(nr);
}

/* Bookable hours per weekday and blocked days. hours: {1: [9, 18], …} (0 = Sunday), blocked: "2026-12-24, …" */
function api_apptSettings(p) {
  var email = guard_();
  if (p && p.hours) {
    var clean = {};
    Object.keys(p.hours).forEach(function (k) {
      var h = p.hours[k], d = Number(k);
      if (d >= 0 && d <= 6 && Array.isArray(h) && h.length === 2 && Number(h[0]) >= 6 && Number(h[1]) <= 22 && Number(h[0]) < Number(h[1])) clean[d] = [Number(h[0]), Number(h[1])];
    });
    setConfig_('termin_zeiten', JSON.stringify(clean));
  }
  if (p && p.blocked !== undefined) setConfig_('termin_gesperrt', String(p.blocked).split(/[\s,;]+/).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }).join(', '));
  sheet_(TAB.audit).appendRow([new Date(), email, TAB.config, 'termin_zeiten', '', 'Terminzeiten geändert']);
  return api_appts();
}

/* ------------------------------------------------------------------ traffic dashboard */

/* Website numbers for the last `days` days: views and visits per day, top pages, sources, devices, languages,
   and the way from visit to booked job (route checks, planner, requests, appointments, bookings). */
function api_traffic(days) {
  guard_();
  days = Math.max(7, Math.min(365, Number(days) || 30));
  var tz = 'Europe/Berlin', now = new Date(), from = Utilities.formatDate(new Date(now.getTime() - (days - 1) * 864e5), tz, 'yyyy-MM-dd');
  var perDay = {}, pages = {}, sources = {}, devices = {}, langs = {}, totals = {views: 0, entries: 0}, planner = 0;
  for (var i = 0; i < days; i++) perDay[Utilities.formatDate(new Date(now.getTime() - (days - 1 - i) * 864e5), tz, 'yyyy-MM-dd')] = [0, 0];
  var sh = ss_().getSheetByName(TAB.visits);
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, VISIT_COLS.length).getValues().forEach(function (r) {
    var d = String(day_(r[0])).replace(/^'/, '');
    if (d < from || !perDay[d]) return;
    var v = Number(r[5]) || 0, e = Number(r[6]) || 0;
    perDay[d][0] += v; perDay[d][1] += e; totals.views += v; totals.entries += e;
    pages[r[1]] = (pages[r[1]] || 0) + v; sources[r[2]] = (sources[r[2]] || 0) + e; devices[r[3]] = (devices[r[3]] || 0) + e; langs[r[4]] = (langs[r[4]] || 0) + e;
    if (/^\/(en\/moving-planner|umzugsplaner)\//.test(String(r[1]))) planner += v;
  });
  var top = function (o, n) { return Object.keys(o).filter(function (k) { return o[k]; }).sort(function (a, b) { return o[b] - o[a]; }).slice(0, n).map(function (k) { return [k, o[k]]; }); };
  var since = new Date(from + 'T00:00:00').getTime(), requests = 0, booked = 0, routes = 0;
  allLeads_().forEach(function (l) { var t = new Date(l.received).getTime(); if (t >= since) { requests++; if (['Gebucht', 'Erledigt'].indexOf(l.status) >= 0) booked++; } });
  var rs = ss_().getSheetByName(TAB.routes);
  if (rs && rs.getLastRow() > 1) rs.getRange(2, 1, rs.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0] instanceof Date && r[0].getTime() >= since) routes++; });
  var appts = allAppts_().filter(function (a) { return new Date(a.received).getTime() >= since; }).length;
  return {
    days: Object.keys(perDay).map(function (d) { return {date: d, views: perDay[d][0], entries: perDay[d][1]}; }),
    totals: totals, pages: top(pages, 10), sources: top(sources, 8), devices: top(devices, 3), langs: top(langs, 2),
    funnel: {visits: totals.entries, routes: routes, planner: planner, requests: requests, appts: appts, booked: booked},
    period: days, updated: iso_(now)
  };
}
