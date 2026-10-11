/* Stabil Umzug – Umzugsplaner (family flow, Phase 0).
   Screens: Welcome, F1 Start, F2 Access, F3 Rooms, F4 Items (catalogue, preset, quick guess, list), F5 Review, F8 Summary.
   Runs entirely in the browser. The draft is kept in this device's local storage so the family can stop and resume;
   nothing is sent anywhere until the family opens WhatsApp or e-mail with the prepared summary. */
(function () {
  'use strict';
  var root = document.getElementById('uf');
  if (!root || !window.FLOW_DATA || !window.FLOW_T || !window.Estimator) return;

  var D = window.FLOW_DATA, E = window.Estimator, SITE = window.SITE || {};
  var lang = document.documentElement.lang === 'en' ? 'en' : 'de';
  var t = window.FLOW_T[lang];
  var BASE = root.getAttribute('data-base') || './';
  var KEY = 'stabil-umzug-draft-v1';
  var LAST = 6;                      /* index of the summary screen; steps 1..6 are counted */
  var SRC_ORDER = ['pick', 'list', 'photo', 'preset', 'guess'];
  var CAT = {};
  D.items.forEach(function (it) { CAT[it.id] = it; });

  /* ---------- helpers ---------- */
  var loc = lang === 'de' ? 'de-DE' : 'en-GB';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function num(x, d) { return Number(x).toLocaleString(loc, {maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0}); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function nm(it) { return it[lang]; }
  function total(e) { var n = 0; for (var k in e.by) n += e.by[k]; return n; }
  function itemLabel(it, vi) { return nm(it) + (it.vars ? ' ' + it.vars[vi || 0].l : ''); }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); var x = ks.reduce(function (a, k) { return a[k]; }, o); if (x) x[last] = v; }
  function mkRef() { return 'SU-' + (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4)).toUpperCase(); }
  var ICON = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>'
  };

  /* ---------- state and draft ---------- */
  function fresh() {
    return {
      v: 1, ref: mkRef(), step: 0,
      f1: {from: '', to: '', km: '', dateMode: 'flex', date: '', hh: 1},
      acc: {old: {floor: 0, lift: 3, park: 3}, 'new': {floor: 0, lift: 3, park: 3}}, hvz: false,
      rooms: ['living', 'bedroom', 'kitchen', 'bath'].map(function (r) { return {r: r, sqm: ''}; }),
      inv: {}, vsel: {}, customs: [],
      mode: 0, q: '', room: 'all', presetSel: null, preset: null, guess: {},
      paste: '', parsed: null, cd: null, src: null,
      contact: {name: '', phone: '', email: '', channel: 0, note: ''}, consent: false, sent: null,
      route: null, remote: null, remoteOk: false, started: 0
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== 1) return null;
      var f = fresh();
      for (var k in f) if (d[k] === undefined) d[k] = f[k];
      return d;
    } catch (e) { return null; }
  }
  var S = load() || fresh();
  var saveOk = true, saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; }
      catch (e) { saveOk = false; }
      var el = document.getElementById('uf-saved');
      if (el) el.innerHTML = savedHtml();
    }, 250);
  }
  function savedHtml() { return '<span class="uf-dot" aria-hidden="true"></span>' + esc(saveOk ? t.draft : t.draftOff); }

  /* Lead source: from the URL (utm_*, gclid, ref, passed along by site.js) or an external referrer. Nothing is stored before the visitor starts. */
  (function captureSrc() {
    var p = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'gclid', 'ref'].forEach(function (k) { var v = p.get(k); if (v) o[k] = v.slice(0, 80); });
    if (!o.ref && document.referrer) {
      try { var h = new URL(document.referrer).hostname; if (h && h !== location.hostname) o.ref = h; } catch (e) {}
    }
    if (Object.keys(o).length && !S.src) S.src = o;
  })();
  /* Quick start from the home page hero (?start=1&from=&to=&hh=): fill F1 and open it directly. */
  (function quickStart() {
    var p = new URLSearchParams(location.search);
    if (p.get('start') !== '1') return;
    var from = (p.get('from') || '').slice(0, 120), to = (p.get('to') || '').slice(0, 120), hh = parseInt(p.get('hh'), 10);
    if (from) S.f1.from = from;
    if (to) S.f1.to = to;
    if (hh >= 0 && hh <= 3) S.f1.hh = hh;
    var km = parseInt(p.get('km'), 10);   // measured by the route check on the website
    if (km > 0 && km < 3000) S.f1.km = String(km);
    if (!S.started) S.started = Date.now();
    S.step = 1;
    ['start', 'from', 'to', 'hh', 'km'].forEach(function (k) { p.delete(k); });
    var q = p.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '')); } catch (e) {}
    save();
  })();
  function srcText() {
    var o = S.src;
    if (!o) return lang === 'de' ? 'direkt' : 'direct';
    return [o.utm_source, o.utm_medium, o.utm_campaign, o.utm_term].filter(Boolean).join(' / ') || o.ref || (o.gclid ? 'Google Ads' : '');
  }

  /* ---------- inventory ---------- */
  function add(id, cnt, vi, src) {
    var e = S.inv[id];
    if (!e) { if (cnt <= 0) return; e = S.inv[id] = {vi: vi || 0, by: {}}; }
    else if (vi != null && total(e) === 0) e.vi = vi;
    e.by[src] = Math.max(0, (e.by[src] || 0) + cnt);
    if (!e.by[src]) delete e.by[src];
    if (!total(e)) delete S.inv[id];
  }
  function dec(id) {
    var e = S.inv[id];
    if (!e) return;
    for (var i = SRC_ORDER.length - 1; i >= 0; i--) {   /* remove the least certain first */
      var src = SRC_ORDER[i];
      if (e.by[src] > 0) { e.by[src]--; if (!e.by[src]) delete e.by[src]; break; }
    }
    if (!total(e)) delete S.inv[id];
  }
  function applySet(set, sign, src) { for (var id in set) add(id, sign * set[id][0], set[id][1], src); }
  var PRESET_KEYS = ['single', 'couple', 'family'];

  /* List matching: names and synonyms, longest first; short keys need word boundaries. */
  var SYN = [];
  D.items.forEach(function (it) {
    [it.de, it.en].concat(it.syn).forEach(function (k) {
      k = norm(k);
      if (k.length >= 2) SYN.push([k, it.id]);
    });
  });
  SYN.sort(function (a, b) { return b[0].length - a[0].length; });
  function norm(s) { return String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/["„“”]/g, '').replace(/\s+/g, ' ').trim(); }
  function findItem(name) {
    for (var i = 0; i < SYN.length; i++) {
      var k = SYN[i][0];
      if (k.length < 4) { if (new RegExp('(^|[^a-zäöüß])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zäöüß]|s?$)').test(name)) return SYN[i][1]; }
      else if (name.indexOf(k) >= 0) return SYN[i][1];
    }
    return null;
  }
  function parseList(txt) {
    var found = {}, order = [], open = [];
    txt.split(/\n/).map(function (l) { return l.replace(/^[-*•\s]+/, '').trim(); }).filter(Boolean).forEach(function (l) {
      var n = 1, name = l, m;
      if ((m = l.match(/^(\d+)\s*(?:x|×|stk\.?|stück|pcs)?\.?\s+(.+)$/i)) || (m = l.match(/^(\d+)\s*[x×]\s*(.+)$/i))) { n = parseInt(m[1], 10); name = m[2]; }
      else if ((m = l.match(/^(.+?)\s+(?:x|×)\s*(\d+)$/i)) || (m = l.match(/^(.+?)\s+(\d+)\s*(?:x|×|stk\.?|stück)$/i))) { n = parseInt(m[2], 10); name = m[1]; }
      n = Math.max(1, Math.min(n, 500));
      var id = findItem(norm(name));
      if (id) { if (!found[id]) { found[id] = 0; order.push(id); } found[id] += n; }
      else open.push(l);
    });
    return {matched: order.map(function (id) { return {id: id, n: found[id]}; }), open: open};
  }

  /* ---------- estimate and labels ---------- */
  function est() { return E.estimate(S, D); }
  function volRange(e) { return e.n ? num(e.volLow) + '–' + num(e.volHigh) + ' m³' : '—'; }
  function vehName(e) { return t.f8.veh[e.vehicle] + (e.trips > 1 ? ' · ' + e.trips + ' ' + t.f8.trips : ''); }
  function confClass(c) { return c === 'high' ? 'uf-c-high' : c === 'medium' ? 'uf-c-med' : 'uf-c-low'; }
  function accText(b) { return t.f2.floors[b.floor] + ' · ' + t.f2.lifts[b.lift] + ' · ' + t.f2.parks[b.park]; }
  function dateText() {
    if (S.f1.dateMode === 'fixed' && S.f1.date) {
      var d = new Date(S.f1.date + 'T12:00:00');
      if (!isNaN(d)) return d.toLocaleDateString(loc, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'});
    }
    return t.f1.flex;
  }

  /* ---------- small builders ---------- */
  function seg(name, opts, cur, path, label) {
    return '<div class="seg uf-seg" role="radiogroup" aria-label="' + esc(label) + '">' + opts.map(function (o, i) {
      return '<label class="seg-opt"><input type="radio" name="' + name + '" data-set="' + path + '" data-val="' + i + '" data-k="' + name + '-' + i + '"' + (cur === i ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
    }).join('') + '</div>';
  }
  function field(label, inner, id) { return '<div class="field"><label' + (id ? ' for="' + id + '"' : '') + '>' + esc(label) + '</label>' + inner + '</div>'; }
  function groupField(label, inner) { return '<div class="field" role="group" aria-label="' + esc(label) + '"><span class="uf-label">' + esc(label) + '</span>' + inner + '</div>'; }
  function head(title, lead) { return '<div class="uf-head"><h2 tabindex="-1" id="uf-h">' + esc(title) + '</h2><p class="uf-lead">' + esc(lead) + '</p></div>'; }
  function tag(text, cls) { return '<span class="tag ' + (cls || 'tag-accent') + '">' + esc(text) + '</span>'; }
  function stat(k, v) { return '<div class="uf-stat"><div class="uf-k">' + esc(k) + '</div><div class="uf-v">' + esc(v) + '</div></div>'; }

  /* ---------- screens ---------- */
  function welcome() {
    var phone = SITE.phone && SITE.phone.charAt(0) !== '[' ? SITE.phone : '';
    var hours = SITE.hours && SITE.hours.charAt(0) !== '[' ? SITE.hours : '';
    return '<div class="uf-hero">' +
      '<h1 tabindex="-1" id="uf-h">' + esc(t.f0.title1) + ' <span>' + esc(t.f0.title2) + '</span></h1>' +
      '<p>' + esc(t.f0.lead) + '</p>' +
      '<div class="uf-scene"><img src="' + BASE + 'assets/img/van-branded.jpg" alt="' + esc(lang === 'de' ? 'Transporter von Stabil Umzug' : 'Stabil Umzug van') + '" width="1108" height="1108"></div>' +
      '<div class="uf-caption"><span>' + esc(t.f0.fleet) + '</span><span>' + esc(t.f0.kicker) + '</span></div></div>' +
      '<div><h3 class="uf-h6">' + esc(t.f0.how) + '</h3><ol class="uf-how">' + t.f0.steps.map(function (x, i) {
        return '<li><span class="uf-n" aria-hidden="true">0' + (i + 1) + '</span><div><div class="uf-strong">' + esc(x[0]) + '</div><div class="uf-small">' + esc(x[1]) + '</div></div></li>';
      }).join('') + '</ol></div>' +
      '<div class="uf-poster"><div class="uf-poster-k">STABIL UMZUG · ESSEN</div><div class="uf-poster-t">' + esc(t.f0.poster) + '</div></div>' +
      '<div class="uf-cards">' +
        '<div class="uf-card">' + TEAM_SVG + '<div><div class="uf-strong">' + esc(t.f0.team) + '</div><div class="uf-small">' + esc(t.f0.teamText) + '</div></div></div>' +
        '<div class="uf-card">' + BOX_SVG + '<div><div class="uf-strong">' + esc(t.f0.cartons) + '</div><div class="uf-small">' + esc(t.f0.cartonsText) + '</div></div></div>' +
      '</div>' +
      ((phone || hours) ? '<div class="uf-strip2">' +
        (hours ? '<div><div class="uf-k">' + esc(t.f0.hours) + '</div><div class="uf-strong">' + esc(hours) + '</div></div>' : '<div></div>') +
        (phone ? '<div><div class="uf-k">' + esc(t.f0.phone) + '</div><div class="uf-strong"><a href="tel:' + esc(SITE.phone_href || phone.replace(/\s/g, '')) + '">' + esc(phone) + '</a></div></div>' : '<div></div>') +
      '</div>' : '');
  }

  function f1() {
    var f = S.f1;
    return head(t.f1.title, t.f1.lead) +
      field(t.f1.from, '<input class="input" id="uf-from" data-bind="f1.from" value="' + esc(f.from) + '" placeholder="' + esc(t.f1.fromPh) + '" autocomplete="off">', 'uf-from') +
      field(t.f1.to, '<input class="input" id="uf-to" data-bind="f1.to" value="' + esc(f.to) + '" placeholder="' + esc(t.f1.toPh) + '" autocomplete="off">', 'uf-to') +
      '<div class="field"><label for="uf-km">' + esc(t.f1.km) + '</label><input class="input uf-short" id="uf-km" data-bind="f1.km" value="' + esc(f.km) + '" inputmode="decimal" placeholder="20" aria-describedby="uf-km-h"><div class="uf-hint" id="uf-km-h">' + esc(t.f1.kmHint) + '</div></div>' + routeBox() +
      groupField(t.f1.date, seg('dm', [t.f1.fixed, t.f1.flex], f.dateMode === 'fixed' ? 0 : 1, 'f1.dateMode', t.f1.date)) +
      (f.dateMode === 'fixed' ? field(t.f1.dateLabel, '<input class="input uf-short" type="date" id="uf-date" data-bind="f1.date" value="' + esc(f.date) + '">', 'uf-date') : '') +
      groupField(t.f1.hh, seg('hh', t.f1.hhOpts, f.hh, 'f1.hh', t.f1.hh));
  }

  function f2() {
    return head(t.f2.title, t.f2.lead) + ['old', 'new'].map(function (b) {
      var a = S.acc[b];
      return '<section class="uf-block"><h3 class="uf-h4">' + esc(t.f2[b]) + '</h3>' +
        groupField(t.f2.floor, seg(b + 'fl', t.f2.floors, a.floor, 'acc.' + b + '.floor', t.f2[b] + ' – ' + t.f2.floor)) +
        groupField(t.f2.lift, seg(b + 'li', t.f2.lifts, a.lift, 'acc.' + b + '.lift', t.f2[b] + ' – ' + t.f2.lift)) +
        groupField(t.f2.park, seg(b + 'pa', t.f2.parks, a.park, 'acc.' + b + '.park', t.f2[b] + ' – ' + t.f2.park)) + '</section>';
    }).join('') +
      '<section class="uf-block"><label class="uf-check"><input type="checkbox" data-toggle="hvz" data-k="hvz"' + (S.hvz ? ' checked' : '') + '><span class="uf-box" aria-hidden="true"></span>' +
      '<span><span class="uf-strong">' + esc(t.f2.hvz) + '</span><span class="uf-small uf-block-s">' + esc(t.f2.hvzHint) + '</span></span></label></section>';
  }

  function f3() {
    var addable = D.rooms.filter(function (r) { return !S.rooms.some(function (x) { return x.r === r; }); });
    return head(t.f3.title, t.f3.lead) +
      '<div class="uf-list">' + S.rooms.map(function (r, i) {
        var id = 'uf-sqm-' + i;
        return '<div class="uf-row uf-room"><label class="uf-strong" for="' + id + '">' + esc(t.rooms[r.r]) + '</label>' +
          '<span class="uf-sqm"><input class="input" id="' + id + '" data-bind="rooms.' + i + '.sqm" value="' + esc(r.sqm) + '" inputmode="decimal" placeholder="?"><span>' + esc(t.f3.sqm) + '</span></span>' +
          '<button type="button" class="btn btn-secondary uf-icon" data-act="rmRoom" data-i="' + i + '" data-k="rmroom-' + i + '" aria-label="' + esc(t.remove + ': ' + t.rooms[r.r]) + '">' + ICON.x + '</button></div>';
      }).join('') + '</div>' +
      (addable.length ? '<div class="uf-chips" role="group" aria-label="' + esc(t.f3.add) + '">' + addable.map(function (r) {
        return '<button type="button" class="btn btn-secondary uf-chipbtn" data-act="addRoom" data-r="' + r + '" data-k="addroom-' + r + '">' + ICON.plus + esc(t.rooms[r]) + '</button>';
      }).join('') + '</div>' : '');
  }

  function catRows() {
    var q = norm(S.q);
    var rows = D.items.filter(function (it) {
      return (S.room === 'all' || it.room === S.room || it.room === 'all') &&
        (!q || [it.de, it.en].concat(it.syn).some(function (k) { return norm(k).indexOf(q) >= 0; }));
    });
    if (!rows.length) return '<p class="uf-small">' + esc(t.f4.none) + '</p>';
    return rows.map(function (it) {
      var e = S.inv[it.id], n = e ? total(e) : 0;
      var vi = e ? e.vi : (S.vsel[it.id] || 0);
      var tags = e ? SRC_ORDER.filter(function (s) { return s !== 'pick' && e.by[s]; }).map(function (s) { return tag(t.f5.source[s] + ' ' + e.by[s]); }).join('') : '';
      var label = itemLabel(it, vi);
      return '<div class="uf-row uf-item' + (n ? ' on' : '') + '">' +
        '<div class="uf-item-main"><div class="uf-item-txt"><div class="uf-strong">' + esc(nm(it)) + '</div>' +
        '<div class="uf-meta">' + num(E.itemVol(it, vi), 3) + ' m³' + tags + '</div></div>' +
        '<div class="uf-stepper">' +
          '<button type="button" data-act="dec" data-id="' + it.id + '" data-k="dec-' + it.id + '" aria-label="' + esc(label + ' – ' + t.f4.less) + '"' + (n ? '' : ' disabled') + '>' + ICON.minus + '</button>' +
          '<span class="uf-count" aria-hidden="true">' + n + '</span>' +
          '<button type="button" class="plus" data-act="inc" data-id="' + it.id + '" data-k="inc-' + it.id + '" aria-label="' + esc(label + ' – ' + t.f4.more) + '">' + ICON.plus + '</button>' +
        '</div></div>' +
        (it.vars ? '<div class="uf-vars"><span>' + esc(t.f4.variant) + '</span>' + seg('v-' + it.id, it.vars.map(function (v) { return v.l; }), vi, 'vi.' + it.id, nm(it) + ' – ' + t.f4.variant) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  function f4() {
    var modes = '<div class="uf-tabs" role="group" aria-label="' + esc(t.f4.title) + '">' + t.f4.modes.map(function (m, i) {
      return '<button type="button" data-act="mode" data-i="' + i + '" data-k="mode-' + i + '" aria-pressed="' + (S.mode === i) + '">' + esc(m) + '</button>';
    }).join('') + '</div>';
    var body = '';
    if (S.mode === 0) {
      var chips = [['all', t.f4.all]].concat(D.rooms.map(function (r) { return [r, t.rooms[r]]; }));
      body = '<input class="input" type="search" id="uf-q" data-search="1" value="' + esc(S.q) + '" placeholder="' + esc(t.f4.search) + '" aria-label="' + esc(t.f4.search) + '">' +
        '<div class="uf-roomchips" role="group" aria-label="' + esc(t.rooms.all) + '">' + chips.map(function (c) {
          return '<button type="button" data-act="room" data-r="' + c[0] + '" data-k="room-' + c[0] + '" aria-pressed="' + (S.room === c[0]) + '">' + esc(c[1]) + '</button>';
        }).join('') + '</div>' +
        '<div class="uf-list" id="uf-cat">' + catRows() + '</div>';
    } else if (S.mode === 1) {
      var sel = S.presetSel != null ? S.presetSel : Math.min(2, S.f1.hh);
      body = '<p class="uf-lead">' + esc(t.f4.preset) + '</p>' + seg('ps', t.f4.presets, sel, 'presetSel', t.f4.presets.join(', ')) +
        (S.preset ? '<div class="uf-note">' + tag(t.f5.source.preset) + '<span>' + esc(t.f4.presetApplied) + ' (' + esc(t.f4.presets[PRESET_KEYS.indexOf(S.preset)]) + ')</span>' +
          '<button type="button" class="btn btn-ghost" data-act="presetUndo" data-k="presetUndo">' + esc(t.f4.presetUndo) + '</button></div>' : '') +
        '<button type="button" class="btn btn-primary btn-block uf-big" data-act="preset" data-k="preset"><span>' + esc(t.f4.presetApply) + '</span><span aria-hidden="true">→</span></button>';
    } else if (S.mode === 2) {
      body = '<p class="uf-lead">' + esc(t.f4.quick) + '</p><div class="uf-list">' + D.rooms.map(function (r) {
        var cur = S.guess[r] ? S.guess[r] - 1 : -1;
        return '<div class="uf-row uf-guess"><span class="uf-strong">' + esc(t.rooms[r]) + '</span>' + seg('g-' + r, t.f4.levels, cur, 'guess.' + r, t.rooms[r]) +
          (cur >= 0 ? '<button type="button" class="btn btn-ghost uf-mini" data-act="guessClear" data-r="' + r + '" data-k="gc-' + r + '">' + esc(t.f4.quickClear) + '</button>' : '<span></span>') + '</div>';
      }).join('') + '</div>';
    } else {
      var p = S.parsed;
      body = '<label class="uf-lead" for="uf-paste">' + esc(t.f4.paste) + '</label>' +
        '<textarea class="input" id="uf-paste" data-bind="paste" rows="5" placeholder="' + esc(t.f4.pastePh) + '">' + esc(S.paste) + '</textarea>' +
        '<div><button type="button" class="btn btn-primary" data-act="match" data-k="match">' + esc(t.f4.match) + '</button></div>';
      if (p) {
        body += '<section class="uf-block"><h3 class="uf-h6">' + esc(t.f4.matched) + '</h3>' +
          (p.matched.length ? p.matched.map(function (x) { return '<div class="uf-row uf-line"><span>' + x.n + ' × ' + esc(nm(CAT[x.id])) + '</span>' + tag(t.f5.source.list, 'tag-neutral') + '</div>'; }).join('') +
            '<button type="button" class="btn btn-primary btn-block" data-act="addMatched" data-k="addMatched">' + esc(t.f4.addMatched) + '</button>'
            : '<p class="uf-small">' + esc(p.added ? t.f4.added : t.f4.none) + '</p>') + '</section>';
        if (p.open.length) {
          body += '<section class="uf-block"><h3 class="uf-h6 uf-acc">' + esc(t.f4.unmatched) + '</h3>' + p.open.map(function (l, i) {
            return '<div class="uf-row uf-line"><span>' + esc(l) + '</span><button type="button" class="btn btn-ghost" data-act="custom" data-i="' + i + '" data-k="custom-' + i + '">' + esc(t.f4.custom) + '</button></div>';
          }).join('') + '</section>';
        }
      }
      if (S.cd) {
        var cd = S.cd;
        body += '<div class="card elev-md uf-cd"><div class="card-kicker">' + esc(t.f4.custom) + '</div>' +
          field(t.f4.customName, '<input class="input" id="uf-cdn" data-bind="cd.name" value="' + esc(cd.name) + '">', 'uf-cdn') +
          groupField(t.f4.customDims, '<div class="uf-dims">' + ['l', 'b', 'h'].map(function (k) {
            return '<input class="input" data-bind="cd.' + k + '" value="' + esc(cd[k]) + '" inputmode="numeric" placeholder="' + k.toUpperCase() + '" aria-label="' + k.toUpperCase() + ' (cm)">';
          }).join('') + '</div>') +
          '<div class="uf-small">' + esc(t.f4.volume) + ': <b id="uf-cvol">' + num(cdVol(cd), 2) + ' m³</b></div>' +
          '<div class="uf-btnrow"><button type="button" class="btn btn-primary" data-act="saveCustom" data-k="saveCustom">' + esc(t.f4.customSave) + '</button>' +
          '<button type="button" class="btn btn-secondary" data-act="cancelCustom" data-k="cancelCustom">' + esc(t.f4.cancel) + '</button></div></div>';
      }
      if (S.customs.length) body += customRows();
      body += '<p class="uf-small">' + esc(t.f4.listNote) + '</p>';
    }
    return head(t.f4.title, t.f4.lead) + modes + body;
  }
  function cdVol(cd) { var l = parseFloat(cd.l) || 0, b = parseFloat(cd.b) || 0, h = parseFloat(cd.h) || 0; return l * b * h / 1e6; }
  function customRows() {
    return '<section class="uf-block">' + S.customs.map(function (c, i) {
      return '<div class="uf-row uf-line"><span>' + c.n + ' × ' + esc(c.name) + ' <span class="uf-small">(' + esc(c.l + '×' + c.b + '×' + c.h) + ' cm)</span></span>' +
        '<span class="uf-r">' + tag(t.f5.source.custom, 'tag-neutral') + '<button type="button" class="btn btn-secondary uf-icon" data-act="rmCustom" data-i="' + i + '" data-k="rmc-' + i + '" aria-label="' + esc(t.remove + ': ' + c.name) + '">' + ICON.x + '</button></span></div>';
    }).join('') + '</section>';
  }

  function rowsBySource() {
    var out = [];
    Object.keys(S.inv).forEach(function (id) {
      var e = S.inv[id], it = CAT[id];
      if (!it) return;
      SRC_ORDER.forEach(function (src) {
        var n = e.by[src];
        if (n) out.push({id: id, src: src, n: n, name: itemLabel(it, e.vi), v: E.itemVol(it, e.vi), kg: E.itemKg(it, e.vi), vi: e.vi, uncertain: (D.rules.weight[src] || 0) < 1});
      });
    });
    return out;
  }

  function f5() {
    var e = est(), rows = rowsBySource(), unc = rows.filter(function (r) { return r.uncertain; });
    var open = S.parsed && S.parsed.open.length;
    var h = head(t.f5.title, t.f5.lead) +
      '<div class="uf-strip3">' + stat(t.f5.items, String(e.n)) + stat(t.f5.vol, volRange(e)) + stat(t.f5.kg, e.n ? num(e.kgMin, 0) + '–' + num(e.kgMax, 0) + ' kg' : '—') + '</div>';
    if (unc.length) {
      h += '<section><h3 class="uf-h6 uf-acc">' + esc(t.f5.uncertain) + '</h3>' + unc.map(function (r) {
        var dup = Object.keys(S.inv[r.id].by).length > 1;
        return '<div class="uf-row uf-unc"><span>' + r.n + ' × ' + esc(r.name) + (dup ? ' ' + tag(t.f5.dup, 'tag-neutral') : '') + '</span>' + tag(t.f5.source[r.src]) +
          '<span class="uf-r"><button type="button" class="btn btn-ghost" data-act="confirm" data-id="' + r.id + '" data-src="' + r.src + '" data-k="cf-' + r.id + '-' + r.src + '">' + esc(t.f5.confirm) + '</button>' +
          '<button type="button" class="btn btn-ghost" data-act="fix" data-id="' + r.id + '" data-k="fx-' + r.id + '-' + r.src + '">' + esc(t.f5.toItems) + '</button></span></div>';
      }).join('') + '</section>';
    }
    if (open) {
      h += '<div class="uf-alert"><span><b>' + open + '</b> ' + esc(t.f5.open) + '</span><button type="button" class="btn btn-ghost" data-act="toList" data-k="toList">' + esc(t.f5.toItems) + '</button></div>';
    }
    h += '<section><h3 class="uf-h6">' + esc(t.f5.items) + '</h3>';
    if (!rows.length && !S.customs.length) h += '<p class="uf-small">' + esc(t.f4.empty) + '</p>';
    h += rows.map(function (r) {
      return '<div class="uf-row uf-rev"><span>' + r.n + ' × ' + esc(r.name) + '</span><span class="uf-num">' + num(r.n * r.v, 2) + ' m³</span>' + tag(t.f5.source[r.src], 'tag-neutral') + '</div>';
    }).join('');
    h += S.customs.map(function (c) {
      return '<div class="uf-row uf-rev"><span>' + c.n + ' × ' + esc(c.name) + '</span><span class="uf-num">' + num(c.n * c.v, 2) + ' m³</span>' + tag(t.f5.source.custom, 'tag-neutral') + '</div>';
    }).join('') + '</section>';
    if (rows.length || S.customs.length) h += '<div><button type="button" class="btn btn-ghost uf-link" data-act="csv" data-k="csv">' + ICON.down + esc(t.f5.export) + '</button></div>';
    return h;
  }

  function f8() {
    var e = est();
    var lines = [
      [t.f8.line.date, dateText(), ''],
      [t.f8.line.labour, e.crew + ' ' + t.f8.crew, 'ca. ' + num(e.hours) + ' ' + t.f8.hours],
      [t.f8.line.vehicle, vehName(e), ''],
      [t.f8.line.distance, num(e.km, 0) + ' km', e.kmGuess ? t.guessTag : ''],
      [t.f8.line.assembly, e.asmMin ? 'ca. ' + num(e.asmMin / 60) + ' ' + t.f8.hours : t.f8.asmNone, e.asmMin ? t.f8.asmHint : ''],
      [t.f8.line.access, accText(S.acc.old) + ' → ' + accText(S.acc['new']), S.hvz ? t.f2.hvz : ''],
      [t.f8.line.items, String(e.n), t.f4.conf + ': ' + t.conf[e.conf]]
    ];
    return head(t.f8.title, t.f8.lead) +
      '<div class="uf-accent"><div class="uf-k">' + esc(t.f8.range) + '</div><div class="uf-big-v">' + esc(volRange(e)) + '</div>' +
        '<div class="uf-pills"><span class="uf-pill">' + esc(t.f4.conf + ': ' + t.conf[e.conf]) + '</span>' + (e.conf === 'high' ? '<span class="uf-pill">' + esc(t.f8.fixed) + '</span>' : '') + '<span>' + esc(t.f8.valid) + '</span></div></div>' +
      '<div class="uf-strip3">' + stat(t.f5.vol, volRange(e)) + stat(t.f8.line.vehicle, vehName(e)) + stat(t.f8.line.labour, e.crew + ' ' + t.f8.crew + ' · ' + num(e.hours) + ' ' + t.f8.hours) + '</div>' +
      '<section><h3 class="uf-h6">' + esc(t.f8.lines) + '</h3>' + lines.map(function (l) {
        return '<div class="uf-row uf-qline"><div><div>' + esc(l[0]) + '</div>' + (l[2] ? '<div class="uf-small">' + esc(l[2]) + '</div>' : '') + '</div><span class="uf-strong uf-num">' + esc(l[1]) + '</span></div>';
      }).join('') + '<p class="uf-small uf-mt">' + esc(t.f8.more) + '</p></section>' +
      '<details class="uf-why"><summary>' + esc(t.f8.why) + '</summary><p>' + esc(fmt(t.f8.whyText, {v: num(e.vol), c: e.crew, h: num(e.hours), k: t.conf[e.conf], md: e.mdVersion})) + '</p></details>' +
      (e.conf === 'low' ? '<div class="uf-alert uf-col"><div class="uf-strong">' + esc(t.f8.video) + '</div><p class="uf-small">' + esc(t.f8.videoHint) + '</p></div>' : '') +
      contactSection() +
      '<p class="uf-small">' + esc(t.f8.ref) + ': <b>' + esc(S.ref) + '</b> · <button type="button" class="btn btn-ghost uf-mini" data-act="restart" data-k="restart">' + esc(t.f8.restart) + '</button></p>';
  }

  var SCREENS = [welcome, f1, f2, f3, f4, f5, f8];

  /* ---------- summary text, links, export ---------- */
  function summaryText(max) {
    var e = est(), m = t.msg, L = [];
    L.push(m.title);
    L.push(t.f8.ref + ': ' + S.ref + (S.sent ? ' · ' + t.api.sentK + ' ' + S.sent.id : ''));
    L.push('');
    L.push(m.route + ': ' + (S.f1.from || '—') + ' → ' + (S.f1.to || '—'));
    L.push(m.km + ': ' + num(e.km, 0) + ' km' + (e.kmGuess ? ' (' + t.guessTag + ')' : ''));
    L.push(m.date + ': ' + dateText());
    L.push(m.hh + ': ' + t.f1.hhOpts[S.f1.hh]);
    L.push(m.accOld + ': ' + accText(S.acc.old));
    L.push(m.accNew + ': ' + accText(S.acc['new']));
    if (S.hvz) L.push(m.hvzYes);
    var rooms = S.rooms.map(function (r) { return t.rooms[r.r] + (String(r.sqm).trim() ? ' ' + r.sqm + ' m²' : ''); });
    if (rooms.length) L.push(m.rooms + ': ' + rooms.join(', '));
    L.push('');
    L.push(m.est + ': ' + volRange(e) + ', ' + (e.n ? num(e.kgMin, 0) + '–' + num(e.kgMax, 0) + ' kg, ' : '') + vehName(e) + ', ' + e.crew + ' ' + t.f8.crew + ', ca. ' + num(e.hours) + ' ' + t.f8.hours + ', ' + t.f4.conf + ' ' + t.conf[e.conf]);
    L.push('');
    L.push(m.items + ' (' + e.n + '):');
    var head = L.join('\n');
    var items = rowsBySource().map(function (r) { return '- ' + r.n + ' × ' + r.name + ' (' + t.f5.source[r.src] + ')'; })
      .concat(S.customs.map(function (c) { return '- ' + c.n + ' × ' + c.name + ' (' + c.l + '×' + c.b + '×' + c.h + ' cm)'; }));
    var tail = [];
    if (S.parsed && S.parsed.open.length) tail.push('', m.open + ': ' + S.parsed.open.join('; '));
    tail.push('', m.source + ': ' + srcText() + ' · ' + (lang === 'de' ? 'Stammdaten' : 'Master data') + ' ' + D.version);
    var tailTxt = tail.join('\n');
    var body = '';
    for (var i = 0; i < items.length; i++) {
      var next = body + '\n' + items[i];
      if (max && (head + next + tailTxt).length > max - 4) { body += '\n- …'; break; }
      body = next;
    }
    return head + body + '\n' + tailTxt;
  }
  function contactOk(v) { return v && String(v).charAt(0) !== '['; }

  /* ---------- Phase 1: Google Sheet back end (SITE.api = Apps Script web app URL) ---------- */
  var API = contactOk(SITE.api) ? SITE.api : '';
  var busy = false, flash = {};
  function api(payload) {
    /* text/plain avoids a CORS preflight, which Apps Script cannot answer */
    return fetch(API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(payload)})
      .then(function (r) { return r.json(); });
  }
  function resumeUrl() { return location.origin + location.pathname + '?resume=' + encodeURIComponent(S.ref + '.' + S.remote.token); }
  var CHANNELS = ['whatsapp', 'phone', 'email'];
  function routeBox() {
    if (!API) return '';
    var r = S.route, ok = S.f1.from.trim().length > 3 && S.f1.to.trim().length > 3;
    return '<div class="uf-route"><button type="button" class="btn btn-secondary" data-act="route" data-k="route"' + (ok && !busy ? '' : ' disabled') + '>' + esc(busy === 'route' ? t.api.routeBusy : t.api.route) + '</button>' +
      '<span class="uf-small" role="status">' + (r && r.km != null ? esc(fmt(t.api.routeOk, {km: r.km, min: r.min})) : flash.route ? esc(flash.route) : esc(t.api.routeNote)) + '</span></div>';
  }
  function remoteBox() {
    if (!API || S.step < 1 || S.sent) return '';
    var link = S.remote && S.remote.token ? resumeUrl() : '';
    return '<details class="uf-remote"' + (flash.remote || link ? ' open' : '') + '><summary>' + esc(t.api.remote) + '</summary><div class="uf-col">' +
      '<p class="uf-small">' + esc(t.api.remoteText) + '</p>' +
      (link ? '<div class="uf-linkrow"><input class="input" readonly value="' + esc(link) + '" aria-label="' + esc(t.api.remoteLink) + '" id="uf-rlink"><button type="button" class="btn btn-secondary" data-act="copyLink" data-k="copyLink">' + esc(t.api.copy) + '</button></div>' : '') +
      '<label class="uf-check"><input type="checkbox" data-toggle="remoteOk" data-k="remoteOk"' + (S.remoteOk ? ' checked' : '') + '><span class="uf-box" aria-hidden="true"></span><span class="uf-small">' + esc(t.api.remoteConsent) + '</span></label>' +
      '<div><button type="button" class="btn btn-secondary" data-act="saveRemote" data-k="saveRemote"' + (S.remoteOk && !busy ? '' : ' disabled') + '>' + esc(link ? t.api.remoteUpdate : t.api.remoteSave) + '</button></div>' +
      (flash.remote ? '<p class="uf-small" role="status">' + esc(flash.remote) + '</p>' : '') + '</div></details>';
  }
  function contactSection() {
    if (!API) return '';
    if (S.sent) {
      return '<div class="uf-done" tabindex="-1" id="uf-done"><div class="uf-k">' + esc(t.api.sentK) + '</div><div class="uf-big-v">' + esc(S.sent.id) + '</div>' +
        '<p>' + esc(t.api.sentText) + '</p></div>';
    }
    var c = S.contact;
    return '<section class="uf-block" id="uf-contact"><h3 class="uf-h4">' + esc(t.api.title) + '</h3><p class="uf-small">' + esc(t.api.lead) + '</p>' +
      field(t.api.name, '<input class="input" id="uf-cn" data-bind="contact.name" value="' + esc(c.name) + '" autocomplete="name" required>', 'uf-cn') +
      field(t.api.phone, '<input class="input" id="uf-cp" type="tel" data-bind="contact.phone" value="' + esc(c.phone) + '" autocomplete="tel">', 'uf-cp') +
      field(t.api.email, '<input class="input" id="uf-ce" type="email" data-bind="contact.email" value="' + esc(c.email) + '" autocomplete="email">', 'uf-ce') +
      groupField(t.api.channel, seg('ch', t.api.channels, c.channel, 'contact.channel', t.api.channel)) +
      field(t.api.note, '<textarea class="input" id="uf-cno" data-bind="contact.note" rows="3">' + esc(c.note) + '</textarea>', 'uf-cno') +
      '<div class="uf-hp" aria-hidden="true"><label>Website <input type="text" id="uf-hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="uf-check"><input type="checkbox" data-toggle="consent" data-k="consent"' + (S.consent ? ' checked' : '') + '><span class="uf-box" aria-hidden="true"></span>' +
      '<span class="uf-small">' + esc(t.api.consent) + ' <a href="' + esc(t.api.privacyHref) + '">' + esc(t.api.privacy) + '</a></span></label>' +
      (flash.send ? '<p class="uf-error" role="alert">' + esc(flash.send) + '</p>' : '') + '</section>';
  }
  function sendLead() {
    var c = S.contact;
    flash.send = '';
    if (!c.name.trim() || (!c.phone.trim() && !c.email.trim())) flash.send = t.api.errContact;
    else if (!S.consent) flash.send = t.api.errConsent;
    if (flash.send) {
      render();
      var el = document.getElementById(!c.name.trim() ? 'uf-cn' : (!c.phone.trim() && !c.email.trim()) ? 'uf-cp' : 'uf-contact');
      if (el) { el.scrollIntoView({block: 'center'}); if (el.focus) el.focus({preventScroll: true}); }
      return;
    }
    busy = 'send'; render();
    var hp = document.getElementById('uf-hp');
    api({action: 'lead', lang: lang, consent: true, hp: hp ? hp.value : '', t: Date.now() - (S.started || Date.now()),
      contact: {name: c.name, phone: c.phone, email: c.email, channel: CHANNELS[c.channel], note: c.note}, state: S})
      .then(function (r) {
        busy = false;
        if (r && r.ok) { S.sent = {id: r.id, at: Date.now()}; save(); render(); var d = document.getElementById('uf-done'); if (d) d.focus(); }
        else { flash.send = r && r.error === 'too_fast' ? t.api.errFast : t.api.errSend; render(); }
      })
      .catch(function () { busy = false; flash.send = t.api.errSend; render(); });
  }
  function getRoute() {
    busy = 'route'; flash.route = ''; render();
    api({action: 'route', from: S.f1.from, to: S.f1.to}).then(function (r) {
      busy = false;
      if (r && r.ok) { S.route = {km: r.km, min: r.min, key: S.f1.from + '|' + S.f1.to}; S.f1.km = String(r.km); save(); }
      else flash.route = t.api.routeFail;
      render();
    }).catch(function () { busy = false; flash.route = t.api.routeFail; render(); });
  }
  function saveRemote() {
    busy = 'remote'; flash.remote = ''; render();
    api({action: 'saveDraft', consent: true, token: S.remote && S.remote.token, state: S}).then(function (r) {
      busy = false;
      if (r && r.ok) { S.remote = {token: r.token, until: r.until}; save(); flash.remote = fmt(t.api.remoteSaved, {d: new Date(r.until).toLocaleDateString(loc)}); }
      else flash.remote = t.api.errSend;
      render();
    }).catch(function () { busy = false; flash.remote = t.api.errSend; render(); });
  }
  function tryResume() {
    var p = new URLSearchParams(location.search).get('resume');
    if (!API || !p || p.indexOf('.') < 0) return;
    var ref = p.split('.')[0], token = p.split('.').slice(1).join('.');
    fetch(API + '?action=draft&ref=' + encodeURIComponent(ref) + '&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok || !r.state) { alert(t.api.resumeFail); return; }
        if (S.ref !== ref && Object.keys(S.inv).length && !window.confirm(t.api.resumeAsk)) return;
        var f = fresh(), st = r.state;
        for (var k in f) if (st[k] === undefined) st[k] = f[k];
        st.remote = {token: token}; st.sent = null;
        S = st; save(); render(true);
        history.replaceState(null, '', location.pathname);
      })
      .catch(function () { alert(t.api.resumeFail); });
  }
  function waHref() { return 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(summaryText(1500)); }
  function mailHref() { return 'mailto:' + SITE.email + '?subject=' + encodeURIComponent(t.msg.title + ' ' + S.ref) + '&body=' + encodeURIComponent(summaryText(1800)); }

  function downloadCsv() {
    var dec = lang === 'de' ? ',' : '.';
    var n = function (x, d) { return Number(x).toFixed(d).replace('.', dec); };
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var lines = [t.csv.map(q).join(';')];
    rowsBySource().forEach(function (r) {
      var it = CAT[r.id];
      lines.push([q(nm(it)), q(it.vars ? it.vars[r.vi].l : ''), r.n, q(t.f5.source[r.src]), n(r.v, 3), n(r.n * r.v, 3), n(r.n * r.kg[0], 0), n(r.n * r.kg[1], 0)].join(';'));
    });
    S.customs.forEach(function (c) {
      var kg = c.v * D.rules.customDensity;
      lines.push([q(c.name), q(c.l + '×' + c.b + '×' + c.h + ' cm'), c.n, q(t.f5.source.custom), n(c.v, 3), n(c.n * c.v, 3), n(c.n * kg * 0.8, 0), n(c.n * kg * 1.2, 0)].join(';'));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], {type: 'text/csv;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'umzug-' + S.ref.toLowerCase() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- shell ---------- */
  function footer() {
    var e = est(), h = '';
    if (S.step === 4) {
      h += '<div class="uf-estline" id="uf-est">' + estLine(e) + '</div>';
    }
    var back = S.step > 0 ? '<button type="button" class="btn btn-secondary uf-back" data-act="back" data-k="back" aria-label="' + esc(t.back) + '">' + ICON.back + '</button>' : '';
    if (S.step === 0) {
      h += '<div class="uf-btnrow"><button type="button" class="btn btn-primary btn-block uf-big uf-cta" data-act="go" data-i="1" data-k="start"><span>' + esc(t.f0.cta) + '</span><span aria-hidden="true">→</span></button></div>';
    } else if (S.step < LAST) {
      h += '<div class="uf-btnrow">' + back + '<button type="button" class="btn btn-primary btn-block uf-big" data-act="next" data-k="next"><span>' + esc(t.next) + '</span><span aria-hidden="true">→</span></button></div>';
    } else if (API && !S.sent) {
      h += '<div class="uf-btnrow">' + back + '<div class="uf-col uf-grow">' +
        '<button type="button" class="btn btn-primary btn-block uf-big" data-act="send" data-k="send"' + (busy ? ' disabled' : '') + '><span>' + esc(busy === 'send' ? t.api.sending : t.api.send) + '</span><span aria-hidden="true">→</span></button>' +
        '<p class="uf-note2">' + esc(t.api.or) + ' ' + (contactOk(SITE.whatsapp) ? '<a href="' + esc(waHref()) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        (contactOk(SITE.email) ? ' · <a href="' + esc(mailHref()) + '">' + esc(t.api.mailShort) + '</a>' : '') + '</p></div></div>';
    } else {
      var wa = contactOk(SITE.whatsapp), mail = contactOk(SITE.email);
      h += '<div class="uf-btnrow">' + back + '<div class="uf-col uf-grow">' +
        (wa ? '<a class="btn ' + (S.sent ? 'btn-secondary' : 'btn-primary') + ' btn-block uf-big" href="' + esc(waHref()) + '" target="_blank" rel="noopener"><span>' + esc(S.sent ? t.api.waAlso : t.f8.wa) + '</span><span aria-hidden="true">→</span></a>' : '') +
        (mail ? '<a class="btn btn-secondary btn-block uf-mid" href="' + esc(mailHref()) + '">' + esc(t.f8.mail) + '</a>' : '') +
        (!wa && !mail ? '<p class="uf-small">' + esc(t.f8.noContact) + '</p>' : S.sent ? '' : '<p class="uf-note2">' + esc(t.f8.waNote) + '</p>') +
        '</div></div>';
    }
    return h;
  }
  function estLine(e) {
    return '<span>' + esc(t.f4.volume) + ' <b class="uf-strong">' + esc(volRange(e)) + '</b></span><span>' + esc(t.f4.conf) + ': <b class="' + confClass(e.conf) + '">' + esc(t.conf[e.conf]) + '</b></span>';
  }

  function render(focusHead) {
    var active = document.activeElement, k = active && root.contains(active) ? active.getAttribute('data-k') : null;
    var cells = '';
    for (var i = 1; i <= LAST; i++) cells += '<span class="' + (i <= S.step ? 'done' : '') + '"></span>';
    var kicker = S.step ? fmt(t.stepOf, {a: S.step, b: LAST}) + ' · ' + t.steps[S.step] : t.f0.kicker;
    root.innerHTML =
      '<div class="uf-top"><div class="uf-prog" aria-hidden="true">' + cells + '</div>' +
      '<div class="uf-metarow"><span class="uf-kicker">' + esc(kicker) + '</span><span class="uf-saved" id="uf-saved" aria-live="polite">' + (S.step ? savedHtml() : '') + '</span></div></div>' +
      '<div class="uf-body' + (S.step === 0 ? ' uf-body0' : '') + (focusHead ? ' uf-enter' : '') + '">' + SCREENS[S.step]() + remoteBox() + '</div>' +
      '<div class="uf-foot">' + footer() + '</div>' +
      '<div class="uf-sr" aria-live="polite" id="uf-live"></div>';
    if (focusHead) {
      var h = document.getElementById('uf-h');
      if (h) h.focus({preventScroll: true});
      var top = root.getBoundingClientRect().top + window.pageYOffset - 8;
      if (window.pageYOffset > top) window.scrollTo({top: top});
    } else if (k) {
      var el = root.querySelector('[data-k="' + k + '"]');
      if (el && !el.disabled) el.focus({preventScroll: true});
      else if (el && el.getAttribute('data-k').indexOf('dec-') === 0) { var inc = root.querySelector('[data-k="inc-' + el.getAttribute('data-k').slice(4) + '"]'); if (inc) inc.focus({preventScroll: true}); }
    }
  }
  function refreshEst() {
    var el = document.getElementById('uf-est');
    if (el) el.innerHTML = estLine(est());
  }
  function announce(msg) { var el = document.getElementById('uf-live'); if (el) el.textContent = msg; }
  function go(n) { S.step = Math.max(0, Math.min(LAST, n)); save(); render(true); }

  /* ---------- events ---------- */
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id'), i = +b.getAttribute('data-i'), r = b.getAttribute('data-r');
    switch (a) {
      case 'go': if (!S.started) S.started = Date.now(); return go(i);
      case 'next': return go(S.step + 1);
      case 'back': return go(S.step - 1);
      case 'inc': add(id, 1, S.inv[id] ? null : (S.vsel[id] || 0), 'pick'); announce(nm(CAT[id]) + ': ' + total(S.inv[id])); break;
      case 'dec': dec(id); announce(nm(CAT[id]) + ': ' + (S.inv[id] ? total(S.inv[id]) : 0)); break;
      case 'mode': S.mode = i; break;
      case 'room': S.room = r; break;
      case 'addRoom': S.rooms.push({r: r, sqm: ''}); break;
      case 'rmRoom': S.rooms.splice(i, 1); break;
      case 'preset':
        var key = PRESET_KEYS[S.presetSel != null ? S.presetSel : Math.min(2, S.f1.hh)];
        if (S.preset) applySet(D.presets[S.preset], -1, 'preset');
        applySet(D.presets[key], 1, 'preset'); S.preset = key; break;
      case 'presetUndo': if (S.preset) applySet(D.presets[S.preset], -1, 'preset'); S.preset = null; break;
      case 'guessClear': if (S.guess[r]) applySet(D.guess[r][S.guess[r]], -1, 'guess'); delete S.guess[r]; break;
      case 'match': S.parsed = parseList(S.paste); S.cd = null; break;
      case 'addMatched':
        S.parsed.matched.forEach(function (x) { add(x.id, x.n, null, 'list'); });
        S.parsed.matched = []; S.parsed.added = true; break;
      case 'custom':
        var line = S.parsed.open[i], m = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
        S.cd = {i: i, line: line, name: m ? m[2] : line, n: m ? Math.min(+m[1], 99) : 1, l: '', b: '', h: ''}; break;
      case 'saveCustom':
        var cd = S.cd, v = cdVol(cd);
        if (!(v > 0) || !String(cd.name).trim()) { var bad = root.querySelector('[data-bind="cd.l"]'); if (bad) bad.focus(); return; }
        S.customs.push({name: String(cd.name).trim().slice(0, 60), n: cd.n || 1, l: +cd.l, b: +cd.b, h: +cd.h, v: v});
        if (S.parsed) S.parsed.open = S.parsed.open.filter(function (l) { return l !== cd.line; });
        S.cd = null; break;
      case 'cancelCustom': S.cd = null; break;
      case 'rmCustom': S.customs.splice(i, 1); break;
      case 'confirm':
        var src = b.getAttribute('data-src'), e = S.inv[id];
        if (e && e.by[src]) { e.by.pick = (e.by.pick || 0) + e.by[src]; delete e.by[src]; }
        break;
      case 'fix': S.step = 4; S.mode = 0; S.room = 'all'; S.q = nm(CAT[id]); save(); return render(true);
      case 'toList': S.step = 4; S.mode = 3; save(); return render(true);
      case 'csv': return downloadCsv();
      case 'send': return sendLead();
      case 'route': return getRoute();
      case 'saveRemote': return saveRemote();
      case 'copyLink':
        var li = document.getElementById('uf-rlink');
        if (li) { li.select(); try { navigator.clipboard.writeText(li.value); } catch (err) { document.execCommand('copy'); } }
        flash.remote = t.api.copied; render(); return;
      case 'restart':
        if (!window.confirm(t.f8.restartAsk)) return;
        try { localStorage.removeItem(KEY); } catch (err) {}
        S = fresh(); flash = {}; return render(true);
      default: return;
    }
    save(); render();
  });

  root.addEventListener('change', function (ev) {
    var el = ev.target;
    var p = el.getAttribute('data-set');
    if (p) {
      var v = +el.getAttribute('data-val');
      if (p === 'f1.dateMode') S.f1.dateMode = v === 0 ? 'fixed' : 'flex';
      else if (p.indexOf('vi.') === 0) {
        var id = p.slice(3);
        if (S.inv[id]) S.inv[id].vi = v; else S.vsel[id] = v;
      } else if (p.indexOf('guess.') === 0) {
        var r = p.slice(6);
        if (S.guess[r]) applySet(D.guess[r][S.guess[r]], -1, 'guess');
        S.guess[r] = v + 1;
        applySet(D.guess[r][v + 1], 1, 'guess');
      } else setPath(S, p, v);
      save(); render(); return;
    }
    if (el.getAttribute('data-toggle')) { S[el.getAttribute('data-toggle')] = el.checked; save(); render(); }
  });

  root.addEventListener('input', function (ev) {
    var el = ev.target, p = el.getAttribute('data-bind');
    if (p) {
      if (getPath(S, p) === undefined && p.indexOf('cd.') !== 0) return;
      setPath(S, p, el.value.slice(0, p === 'paste' ? 4000 : p === 'contact.note' ? 1000 : 160));
      if (p === 'f1.km' && S.route) S.route = null;
      if ((p === 'f1.from' || p === 'f1.to') && API) {
        if (S.route && S.route.key !== S.f1.from + '|' + S.f1.to) S.route = null;
        var rb = root.querySelector('[data-act="route"]');
        if (rb) rb.disabled = !(S.f1.from.trim().length > 3 && S.f1.to.trim().length > 3) || !!busy;
      }
      save();
      if (p.indexOf('cd.') === 0) { var cv = document.getElementById('uf-cvol'); if (cv) cv.textContent = num(cdVol(S.cd), 2) + ' m³'; }
      refreshEst();
      return;
    }
    if (el.getAttribute('data-search')) {
      S.q = el.value.slice(0, 60); save();
      var list = document.getElementById('uf-cat');
      if (list) list.innerHTML = catRows();
    }
  });

  /* Inline brand illustrations from the design handoff. */
  var TEAM_SVG = '<svg viewBox="0 0 150 110" role="img" aria-hidden="true" focusable="false"><g><circle cx="30" cy="22" r="12" fill="#17304f"/><rect x="14" y="38" width="32" height="44" fill="#f0650f"/><rect x="18" y="46" width="8" height="8" fill="#f3f2f2"/><rect x="14" y="82" width="13" height="26" fill="#17304f"/><rect x="33" y="82" width="13" height="26" fill="#17304f"/></g><g><circle cx="75" cy="18" r="12" fill="#17304f"/><rect x="59" y="34" width="32" height="48" fill="#f0650f"/><rect x="63" y="42" width="8" height="8" fill="#f3f2f2"/><rect x="59" y="82" width="13" height="26" fill="#17304f"/><rect x="78" y="82" width="13" height="26" fill="#17304f"/><rect x="92" y="30" width="40" height="30" fill="#f3f2f2" stroke="#17304f" stroke-width="2"/><rect x="92" y="42" width="40" height="4" fill="#f0650f"/><rect x="98" y="48" width="6" height="6" fill="#f0650f"/></g><g><circle cx="128" cy="26" r="11" fill="#17304f"/><rect x="113" y="62" width="30" height="20" fill="#f0650f"/><rect x="117" y="67" width="7" height="7" fill="#f3f2f2"/><rect x="113" y="82" width="12" height="26" fill="#17304f"/><rect x="131" y="82" width="12" height="26" fill="#17304f"/></g></svg>';
  var BOX_SVG = '<svg viewBox="0 0 150 110" role="img" aria-hidden="true" focusable="false"><rect x="12" y="52" width="62" height="50" fill="#f3f2f2" stroke="#17304f" stroke-width="2"/><rect x="12" y="52" width="62" height="6" fill="#f0650f"/><rect x="20" y="70" width="10" height="10" fill="#f0650f"/><rect x="34" y="72" width="30" height="3" fill="#17304f"/><rect x="34" y="78" width="20" height="2" fill="#17304f"/><rect x="80" y="40" width="58" height="62" fill="#f3f2f2" stroke="#17304f" stroke-width="2"/><rect x="80" y="40" width="58" height="6" fill="#f0650f"/><rect x="88" y="62" width="10" height="10" fill="#f0650f"/><rect x="102" y="64" width="28" height="3" fill="#17304f"/><rect x="102" y="70" width="18" height="2" fill="#17304f"/><rect x="34" y="6" width="54" height="44" fill="#f3f2f2" stroke="#17304f" stroke-width="2"/><rect x="34" y="6" width="54" height="6" fill="#f0650f"/><rect x="42" y="24" width="10" height="10" fill="#f0650f"/><rect x="56" y="26" width="26" height="3" fill="#17304f"/><rect x="56" y="32" width="16" height="2" fill="#17304f"/></svg>';

  if (S.step > 0 && !S.started) S.started = Date.now() - 60000;
  render(false);
  tryResume();
})();
