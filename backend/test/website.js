/* Appointment booking and cookie-free traffic counting (Website.js), plus the admin side.  Usage: node backend/test/website.js */
const assert = require('assert');
const M = require('./mock');
const {ctx, sheets, mails, cache} = M;

const pad = n => String(n).padStart(2, '0');
const fmt = (d, tz, f) => f === 'HH:mm' ? pad(d.getHours()) + ':' + pad(d.getMinutes())
  : f === 'yyyyMMdd' ? d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
  : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js', 'Website.js']);
ctx.Utilities.formatDate = fmt;
ctx.Utilities.newBlob = (data, type, name) => ({data, type, name});
ctx.setup();
assert(sheets['Termine'] && sheets['Besuche'], 'setup creates Termine and Besuche');
const get = p => ctx.doGet({parameter: p});
const post = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});

// --- free times: from tomorrow, opening hours, Sunday closed, 60-minute viewings end by closing time
let s = get({action: 'slots', type: 'visit'});
assert(s.ok && s.days.length === 21 && s.min === 60);
const tomorrow = fmt(new Date(Date.now() + 864e5));
assert.strictEqual(s.days[0].date, tomorrow);
s.days.forEach(d => {
  const wd = new Date(d.date + 'T12:00:00').getDay();
  if (wd === 0) assert.strictEqual(d.slots.length, 0, 'Sunday closed');
  if (wd >= 1 && wd <= 5) { assert.strictEqual(d.slots[0], '09:00'); assert.strictEqual(d.slots[d.slots.length - 1], '17:00'); }
  if (wd === 6) assert.strictEqual(d.slots[d.slots.length - 1], '15:00');
});
const call = get({action: 'slots', type: 'call'});
const workday = call.days.find(d => d.slots.length && new Date(d.date + 'T12:00:00').getDay() === 2);
assert.strictEqual(workday.slots[workday.slots.length - 1], '17:30', '30-minute call fits until 18:00');
assert.strictEqual(get({action: 'slots', type: 'party'}).error, 'type');
// all types in one answer, the same times as the single requests
const all = get({action: 'slots', type: 'all'});
assert(all.ok && all.types.visit && all.types.video && all.types.call);
assert.deepStrictEqual(all.types.visit.days, s.days);
assert.deepStrictEqual(all.types.call.days, call.days);
assert.strictEqual(all.types.call.min, call.min);
console.log('ok slots: 21 days from tomorrow, opening hours, no Sunday, length respected, all types at once');

// --- booking: request + appointment + mails with calendar file
const base = {action: 'book', t: 20000, consent: true, lang: 'de', name: 'Familie Kaya', phone: '0171 1234567', email: 'kaya@example.de',
  address: 'Rüttenscheider Str. 12, 45130 Essen', to: 'Bochum', message: 'Klavier', src: {utm_source: 'google', utm_medium: 'cpc'}};
assert.strictEqual(post(Object.assign({}, base, {type: 'visit', date: workday.date, time: '10:00', consent: false})).error, 'consent');
assert.strictEqual(post(Object.assign({}, base, {type: 'visit', date: workday.date, time: '10:00', address: ''})).error, 'address');
assert.strictEqual(post(Object.assign({}, base, {type: 'visit', date: workday.date, time: '10:00', email: 'nope'})).error, 'email');
assert.strictEqual(post(Object.assign({}, base, {type: 'visit', date: workday.date, time: '10:00', t: 500})).error, 'too_fast');
mails.length = 0;
let r = post(Object.assign({}, base, {type: 'visit', date: workday.date, time: '10:00'}));
assert(r.ok && /^T-\d+$/.test(r.nr) && /^A-\d+$/.test(r.lead), JSON.stringify(r));
// the booking clears the cached free times: 10:00 is gone right away
assert(get({action: 'slots', type: 'all'}).types.visit.days.find(d => d.date === workday.date).slots.indexOf('10:00') < 0, 'cache cleared');
const appt = ctx.allAppts_()[0];
assert.strictEqual(appt.type, 'visit'); assert.strictEqual(appt.date, workday.date); assert.strictEqual(appt.time, '10:00'); assert.strictEqual(appt.min, 60);
const lead = ctx.findLead_(r.lead).values;
assert.strictEqual(lead[ctx.LEAD_COLS.indexOf('Leistung')], 'Besichtigung vor Ort (Termin)');
assert(/T-\d+: Besichtigung vor Ort am/.test(lead[ctx.LEAD_COLS.indexOf('Notizen')]));
assert.strictEqual(lead[ctx.LEAD_COLS.indexOf('Quelle')], 'google / cpc');
assert.strictEqual(mails.length, 2, 'customer and office');
const cust = mails.find(m => m.to === 'kaya@example.de'), office = mails.find(m => m.to !== 'kaya@example.de');
assert(/Ihr Termin am .* 10:00 Uhr/.test(cust.subject) && cust.attachments[0].type === 'text/calendar');
const ics = cust.attachments[0].data;
assert(/BEGIN:VEVENT/.test(ics) && /DTSTART:\d{8}T\d{6}Z/.test(ics) && /UID:T-\d+@stabilumzug\.de/.test(ics));
assert(/Neuer Termin T-\d+/.test(office.subject) && office.replyTo === undefined);
assert.strictEqual(cust.replyTo, office.to);
console.log('ok booking: request + appointment saved, customer and office mailed with calendar file');

// --- the time is gone now (also for overlapping lengths); same time cannot be booked twice
s = ctx.slots_('visit');
let day = ctx.freeSlots_('visit', 21).find(d => d.date === workday.date);
['09:30', '10:00', '10:30'].forEach(t => assert(day.slots.indexOf(t) < 0, t + ' blocked by 10:00–11:00'));
assert(day.slots.indexOf('09:00') >= 0 && day.slots.indexOf('11:00') >= 0);
assert.strictEqual(post(Object.assign({}, base, {type: 'call', date: workday.date, time: '10:30'})).error, 'taken');
console.log('ok overlap: 10:00–11:00 blocks 09:30–10:30, double booking refused');

// --- blocked days and booked moves
ctx.setConfig_('termin_gesperrt', workday.date);
assert.strictEqual(ctx.freeSlots_('call', 21).find(d => d.date === workday.date).slots.length, 0);
ctx.setConfig_('termin_gesperrt', '');
const other = call.days.find(d => d.slots.length && d.date !== workday.date);
const lrow = ctx.findLead_(r.lead);
sheets['Anfragen'].data[lrow.row - 1][ctx.LEAD_COLS.indexOf('Status')] = 'Gebucht';
sheets['Anfragen'].data[lrow.row - 1][ctx.LEAD_COLS.indexOf('Termin')] = other.date;
assert.strictEqual(ctx.freeSlots_('visit', 21).find(d => d.date === other.date).slots.length, 0, 'no viewings on a moving day');
assert(ctx.freeSlots_('call', 21).find(d => d.date === other.date).slots.length > 0, 'calls still possible');
console.log('ok availability: blocked days, no on-site viewings on moving days');

// --- traffic: counted in the cache, written as aggregated rows
for (let i = 0; i < 5; i++) post({action: 'hit', p: '/', s: 'Google', d: 'Handy', l: 'de', e: i === 0 ? 1 : 0});
post({action: 'hit', p: '/umzuege/', s: 'WhatsApp', d: 'Computer', l: 'de', e: 1});
post({action: 'hit', p: 'javascript:alert(1)', s: 'x'});
assert.strictEqual(sheets['Besuche'].data.length, 1, 'nothing written yet');
ctx.flushHits();
const rows = sheets['Besuche'].data.slice(1).map(x => x.slice(1));
assert.deepStrictEqual(JSON.parse(JSON.stringify(rows)).sort(), [['/', 'Google', 'Handy', 'DE', 5, 1], ['/umzuege/', 'WhatsApp', 'Computer', 'DE', 1, 1]].sort());
const buf = JSON.parse(cache.hits || '{"rows":{}}');
assert.strictEqual(Object.keys(buf.rows || {}).length, 0);
console.log('ok traffic: 6 views in 2 aggregated rows, bad paths ignored');

// --- admin: appointments, calendar entry, cancel and move with mails, traffic dashboard
ctx.SHEET_ID = 'sheet'; ctx.SpreadsheetApp.openById = () => M.ss;
M.ss.getEditors = () => [{getEmail: () => 'office@test'}]; M.ss.getOwner = () => ({getEmail: () => 'x@y'});
ctx.Session.getActiveUser = () => ({getEmail: () => 'office@test'});
const events = [];
ctx.CalendarApp = {getDefaultCalendar: () => ({createEvent: (t, a, b, o) => { events.push({t, a, b, o}); return {getId: () => 'ev1'}; },
  getEventById: id => ({deleteEvent: () => events.push({deleted: id}), setTime: (a, b) => events.push({moved: id, a, b})})})};
M.load('admin-script', ['Admin.js', 'Termine.js']);
let A = ctx.api_appts();
assert.strictEqual(A.appts.length, 1); assert(A.hours[1]);
let u = ctx.api_apptCalendar(appt.nr);
assert.strictEqual(u.calendar, 'ev1'); assert.strictEqual(events[0].t, 'Besichtigung vor Ort: Familie Kaya'); assert.strictEqual(u.status, 'Bestätigt');
mails.length = 0;
u = ctx.api_apptUpdate(appt.nr, {status: 'Verschoben', date: workday.date, time: '14:00', note: 'Team früher frei', notify: true});
assert.strictEqual(u.time, '14:00'); assert(/Neue Zeit/.test(mails[0].subject) && mails[0].attachments.length === 1);
assert(events.some(e => e.moved === 'ev1'));
assert.throws(() => ctx.api_apptUpdate(appt.nr, {status: 'Verschoben', date: workday.date, time: '03:00'}), /nicht frei/);
u = ctx.api_apptUpdate(appt.nr, {status: 'Abgesagt', note: 'Krankheit', notify: true});
assert.strictEqual(u.status, 'Abgesagt'); assert(/abgesagt/.test(mails[1].subject)); assert(events.some(e => e.deleted === 'ev1'));
assert(ctx.freeSlots_('visit', 21).find(d => d.date === workday.date).slots.indexOf('14:00') >= 0, 'cancelled time is free again');
ctx.api_apptSettings({hours: {1: [8, 12]}, blocked: '2026-12-24, 2026-12-31'});
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.apptHours_())), {1: [8, 12]});
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.apptBlocked_())), ['2026-12-24', '2026-12-31']);
console.log('ok admin appointments: Google Calendar entry, move and cancel with customer mails, settings');

const D = ctx.api_traffic(30);
assert.strictEqual(D.totals.views, 6); assert.strictEqual(D.totals.entries, 2);
assert.strictEqual(D.days.length, 30);
// sources and devices count visits (entries), pages count views
assert.strictEqual(D.sources.find(x => x[0] === 'Google')[1], 1); assert.strictEqual(D.sources.find(x => x[0] === 'WhatsApp')[1], 1);
assert.strictEqual(D.devices.find(x => x[0] === 'Handy')[1], 1);
assert.deepStrictEqual(JSON.parse(JSON.stringify(D.pages[0])), ['/', 5]);
assert.strictEqual(D.funnel.requests, 1); assert.strictEqual(D.funnel.appts, 1);
console.log('ok dashboard: totals, 30 days, sources, devices, funnel');
console.log('ALL OK');
