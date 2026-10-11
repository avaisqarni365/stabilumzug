/* Route check in the planner cards (home page, Umzüge, Transport): distance, drive time and a map of the route.
   The addresses go to our Google Apps Script (SITE.api), which asks Google Maps and returns the map as an image –
   the browser itself never loads anything from Google. The office sees each check (postcode and town only) in the sheet. */
(function () {
  'use strict';
  var SITE = window.SITE || {}, API = SITE.api && SITE.api.charAt(0) !== '[' ? SITE.api : '';
  var forms = document.querySelectorAll('form[data-route]');
  if (!forms.length) return;
  var en = document.documentElement.lang === 'en';
  var T = en ? {
    both: 'Please enter both places – a town or postcode is enough.', busy: 'The route service is busy right now. Just continue – we check the route in your quote.',
    notFound: 'We could not find this route. Please check the places.', net: 'No connection. Just continue – we check the route in your quote.',
    load: 'Calculating your route …', km: 'distance', min: 'drive time', minU: 'min', h: 'h', open: 'Open in Google Maps',
    oneDay: 'Your move fits into one day', twoDays: 'Long-distance move – plan two days', local: 'Local move – short-notice dates often possible',
    map: 'Map of your route'
  } : {
    both: 'Bitte beide Orte eingeben – Ort oder PLZ reicht.', busy: 'Der Routendienst ist gerade ausgelastet. Planen Sie einfach weiter – wir prüfen die Strecke im Angebot.',
    notFound: 'Diese Strecke haben wir nicht gefunden. Bitte die Orte prüfen.', net: 'Keine Verbindung. Planen Sie einfach weiter – wir prüfen die Strecke im Angebot.',
    load: 'Ihre Strecke wird berechnet …', km: 'Strecke', min: 'Fahrzeit', minU: 'Min.', h: 'Std.', open: 'In Google Maps öffnen',
    oneDay: 'Ihr Umzug passt an einen Tag', twoDays: 'Fernumzug – zwei Tage einplanen', local: 'Nahumzug – kurzfristige Termine oft möglich',
    map: 'Karte Ihrer Strecke'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function source() {
    var p = new URLSearchParams(location.search), s = [p.get('utm_source'), p.get('utm_medium'), p.get('utm_campaign')].filter(Boolean).join(' / ');
    if (!s && p.get('gclid')) s = 'Google Ads';
    if (!s && document.referrer) { try { var h = new URL(document.referrer).hostname; if (h !== location.hostname) s = h; } catch (e) {} }
    return s.slice(0, 80);
  }
  function dur(m) { return m < 60 ? m + ' ' + T.minU : Math.floor(m / 60) + ' ' + T.h + ' ' + ('0' + (m % 60)).slice(-2) + ' ' + T.minU; }
  function result(r, a, b) {
    var note = r.km <= 25 ? T.local : r.km <= 250 ? T.oneDay : T.twoDays;
    var gm = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(a) + '&destination=' + encodeURIComponent(b);
    return (r.map ? '<figure class="route-map"><img src="' + r.map + '" alt="' + esc(T.map + ': ' + r.fromLabel + ' – ' + r.toLabel) + '" width="640" height="360"></figure>' : '') +
      '<div class="route-facts"><div><b>' + r.km + ' km</b><span>' + T.km + '</span></div><div><b>' + dur(r.min) + '</b><span>' + T.min + '</span></div></div>' +
      '<p class="route-line"><span class="route-a">A</span>' + esc(r.fromLabel) + '<span class="route-dash" aria-hidden="true"></span><span class="route-b">B</span>' + esc(r.toLabel) + '</p>' +
      '<p class="route-note">' + esc(note) + ' · <a href="' + gm + '" target="_blank" rel="noopener">' + T.open + '</a></p>';
  }
  Array.prototype.forEach.call(forms, function (f) {
    var btn = f.querySelector('.qp-calc'), out = f.querySelector('.route-out'), km = f.querySelector('input[name="km"]'), last = '';
    if (!API || !btn || !out) { if (btn) btn.hidden = true; return; }
    function show(html, cls) { out.hidden = false; out.className = 'route-out' + (cls ? ' ' + cls : ''); out.innerHTML = html; }
    function calc(auto) {
      var a = f.elements.from.value.trim(), b = f.elements.to.value.trim();
      if (a.length < 3 || b.length < 3) { if (!auto) show('<p class="route-msg">' + T.both + '</p>'); return; }
      var k = (a + '|' + b).toLowerCase();
      if (k === last) return;
      last = k; btn.disabled = true;
      show('<div class="route-load" role="status"><span class="route-truck" aria-hidden="true"></span><span>' + T.load + '</span></div>', 'is-loading');
      fetch(API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({action: 'routeMap', from: a, to: b, page: location.pathname, lang: en ? 'en' : 'de', src: source()})})
        .then(function (r) { return r.json(); })
        .then(function (r) {
          btn.disabled = false;
          if (!r || !r.ok) { last = ''; show('<p class="route-msg">' + (r && r.error === 'busy' ? T.busy : r && r.error === 'not_found' ? T.notFound : T.both) + '</p>'); return; }
          if (km) km.value = r.km;
          show(result(r, a, b), 'is-done');
        })
        .catch(function () { btn.disabled = false; last = ''; show('<p class="route-msg">' + T.net + '</p>'); });
    }
    btn.addEventListener('click', function () { calc(false); });
    // calculate on its own as soon as both places are filled in
    ['from', 'to'].forEach(function (n) { f.elements[n].addEventListener('change', function () { calc(true); }); });
  });
})();
