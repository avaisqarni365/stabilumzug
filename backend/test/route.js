/* Route check on the website (routeMap_ in Code.js) and the admin statistics.  Usage: node backend/test/route.js */
const assert = require('assert');
const M = require('./mock');
const {ctx, sheets, cache} = M;

M.load('apps-script', ['Estimator.js', 'Shared.js', 'Code.js']);
ctx.setup();
assert(sheets['Strecken'], 'setup creates the Strecken tab');

let mapsCalls = 0;
ctx.Maps.newDirectionFinder = () => {
  const o = {}; ['setOrigin', 'setDestination', 'setMode', 'setRegion', 'setLanguage'].forEach(k => o[k] = () => o);
  o.getDirections = () => { mapsCalls++; return {routes: [{overview_polyline: {points: 'abc'}, legs: [{distance: {value: 23400}, duration: {value: 1680},
    start_address: 'Rüttenscheider Str. 12, 45130 Essen, Deutschland', end_address: 'Alleestraße 4, 44793 Bochum, Deutschland',
    start_location: {lat: 51.43, lng: 7.0}, end_location: {lat: 51.48, lng: 7.21}}]}]}; };
  return o;
};
const staticMap = {}; ['setSize', 'setLanguage', 'setFormat', 'setPathStyle', 'addPath', 'setMarkerStyle', 'addMarker'].forEach(k => staticMap[k] = () => staticMap);
staticMap.getBlob = () => ({getBytes: () => [137, 80, 78, 71]});
ctx.Maps.newStaticMap = () => staticMap;
ctx.Maps.StaticMap = {Format: {PNG: 'png'}, MarkerSize: {MID: 'mid'}};
ctx.Utilities.formatDate = (d, tz, f) => f === 'yyyyMMdd' ? '20261011' : d.toISOString().slice(0, 10);

const post = b => ctx.doPost({postData: {contents: JSON.stringify(b)}});
let r = post({action: 'routeMap', from: 'Rüttenscheider Str. 12, Essen', to: 'Alleestr. 4, Bochum', page: '/', lang: 'de', src: 'google / cpc'});
assert(r.ok && r.km === 23 && r.min === 28, JSON.stringify(r));
assert(/^data:image\/png;base64,/.test(r.map), 'map image');
assert.strictEqual(r.fromLabel, '45130 Essen'); assert.strictEqual(r.toLabel, '44793 Bochum');
const row = sheets['Strecken'].data[1];
assert.deepStrictEqual(JSON.parse(JSON.stringify(row.slice(1, 8))), ['45130 Essen', '44793 Bochum', 23, 28, '/', 'DE', 'google / cpc']);
assert(!JSON.stringify(sheets['Strecken'].data).includes('Rüttenscheider'), 'no street stored');
console.log('ok route: km, minutes, map image; sheet row has postcode and town only');

// same route again: from the cache, no new Maps call, but counted again
r = post({action: 'routeMap', from: 'rüttenscheider str. 12, essen', to: 'ALLEESTR. 4, BOCHUM', page: '/umzuege/', lang: 'de'});
assert(r.ok && mapsCalls === 1 && sheets['Strecken'].data.length === 3);
console.log('ok cache: repeated route uses no Maps quota, still counted');

// bad input and quota guard
assert.strictEqual(post({action: 'routeMap', from: 'a', to: 'b'}).error, 'address');
Object.keys(cache).filter(k => k.startsWith('rm_d_')).forEach(k => { cache[k] = '800'; });
assert.strictEqual(post({action: 'routeMap', from: 'Essen', to: 'Berlin'}).error, 'busy');
console.log('ok guard: short input rejected, daily quota limit answers "busy"');

// place_ never returns a street
assert.strictEqual(ctx.place_('Hauptstr. 5, 45127 Essen, Deutschland'), '45127 Essen');
assert.strictEqual(ctx.place_('Bochum'), 'Bochum');
assert.strictEqual(ctx.place_('Karlstraße 32, 45329 Essen-Stadtbezirke V, Deutschland'), '45329 Essen');
assert.strictEqual(ctx.place_('Kettwiger Str. 1'), '–');

// admin statistics
ctx.SHEET_ID = 'sheet'; ctx.SpreadsheetApp.openById = () => M.ss;
M.ss.getEditors = () => [{getEmail: () => 'office@test'}]; M.ss.getOwner = () => ({getEmail: () => 'x@y'});
ctx.Session.getActiveUser = () => ({getEmail: () => 'office@test'});
M.load('admin-script', ['Admin.js']);
const st = ctx.api_bootstrap().routes;
assert.strictEqual(st.today, 2); assert.strictEqual(st.week, 2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(st.towns.map(t => t[0]).sort())), ['Bochum', 'Essen']);
assert.strictEqual(st.last[0].page, '/umzuege/');
console.log('ok admin: checks today/7/30 days, top towns, latest routes');
console.log('ALL OK');
