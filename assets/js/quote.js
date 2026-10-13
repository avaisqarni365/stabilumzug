/* "Jetzt kostenloses Angebot anfordern" – short request form (quote and contact pages).
   With SITE.api set, the request goes straight into the company's Google sheet; otherwise it opens WhatsApp
   (or e-mail) with the filled-in text. Nothing is stored in the browser. */
(function () {
  'use strict';
  var form = document.getElementById('quote-form');
  if (!form) return;
  var SITE = window.SITE || {};
  var de = document.documentElement.lang !== 'en';
  var ok = function (v) { return v && String(v).charAt(0) !== '['; };
  var API = ok(SITE.api) ? SITE.api : '';
  var T = de ? {
    need: 'Bitte Name und Telefon oder E-Mail angeben.', consent: 'Bitte bestätigen Sie die Einwilligung.',
    sending: 'Wird gesendet …', fail: 'Senden hat nicht geklappt. Bitte per WhatsApp oder Telefon melden.',
    done: 'Danke! Ihre Anfrage {id} ist bei uns. Wir melden uns innerhalb von 24 Stunden.', title: 'Anfrage über die Website',
    photos: 'Fotos werden gesendet …', photosOk: '{n} Foto(s) sind ebenfalls angekommen.', photosFail: 'Die Fotos kamen nicht an – schicken Sie sie gern per WhatsApp.', wait: 'Einen Moment, die Fotos werden noch vorbereitet.',
    labels: {service: 'Leistung', name: 'Name', phone: 'Telefon', email: 'E-Mail', rooms: 'Zimmer', from: 'Von', to: 'Nach', date: 'Wunschtermin', message: 'Nachricht'}
  } : {
    need: 'Please enter your name and a phone number or email.', consent: 'Please confirm your consent.',
    sending: 'Sending …', fail: 'Sending did not work. Please contact us by WhatsApp or phone.',
    done: 'Thank you! We have your request {id} and will reply within 24 hours.', title: 'Request via the website',
    photos: 'Sending photos …', photosOk: '{n} photo(s) arrived as well.', photosFail: 'The photos did not arrive – feel free to send them by WhatsApp.', wait: 'One moment, the photos are still being prepared.',
    labels: {service: 'Service', name: 'Name', phone: 'Phone', email: 'Email', rooms: 'Rooms', from: 'From', to: 'To', date: 'Preferred date', message: 'Message'}
  };
  var $ = function (id) { return document.getElementById(id); };
  var msg = $('quote-msg'), btn = $('quote-send'), started = Date.now();

  /* preselect the service from ?service=… (service pages link here) */
  var pre = new URLSearchParams(location.search).get('service');
  if (pre && $('q-service').querySelector('option[value="' + pre + '"]')) $('q-service').value = pre;

  function values() {
    var v = {};
    ['service', 'name', 'phone', 'email', 'rooms', 'from', 'to', 'date', 'message'].forEach(function (k) { var el = $('q-' + k); v[k] = el ? el.value.trim() : ''; });
    return v;
  }
  function source() {
    var p = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'ref'].forEach(function (k) { if (p.get(k)) o[k] = p.get(k).slice(0, 80); });
    if (!o.ref && document.referrer) { try { var h = new URL(document.referrer).hostname; if (h !== location.hostname) o.ref = h; } catch (e) {} }
    return o;
  }
  function text(v) {
    var sel = $('q-service'), svc = sel.options[sel.selectedIndex].text;
    var L = [SITE.company + ' – ' + T.title, '', T.labels.service + ': ' + svc];
    ['name', 'phone', 'email', 'rooms', 'from', 'to', 'date'].forEach(function (k) { if (v[k]) L.push(T.labels[k] + ': ' + v[k]); });
    if (v.message) L.push('', v.message);
    return L.join('\n');
  }
  function say(s, bad) { msg.textContent = s; msg.className = 'msg' + (bad ? ' bad' : ' good'); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = values();
    if (!v.name || (!v.phone && !v.email)) { say(T.need, true); (v.name ? $('q-phone') : $('q-name')).focus(); return; }
    if (!$('q-consent').checked) { say(T.consent, true); $('q-consent').focus(); return; }
    if (!API) {
      if (ok(SITE.whatsapp)) window.open('https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(text(v)), '_blank', 'noopener');
      else if (ok(SITE.email)) location.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent(T.title) + '&body=' + encodeURIComponent(text(v));
      return;
    }
    var P = window.StabilPhotos;
    if (P && P.busy('quote')) { say(T.wait, true); return; }
    btn.disabled = true; say(T.sending);
    fetch(API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action: 'quick', lang: de ? 'de' : 'en', consent: true, hp: $('q-hp').value, t: Date.now() - started, form: v, src: source()})})
      .then(function (r) { return r.json(); })
      .then(function (r) {
        btn.disabled = false;
        if (!(r && r.ok)) return say(T.fail, true);
        form.reset();
        var done = T.done.replace('{id}', r.id);
        if (!P || !P.count('quote')) { say(done); msg.focus(); return; }
        btn.disabled = true; say(done + ' ' + T.photos); msg.focus();
        P.send('quote', API, r.id, r.up).then(function (n) { btn.disabled = false; say(done + ' ' + T.photosOk.replace('{n}', n)); },
          function () { btn.disabled = false; say(done + ' ' + T.photosFail); });
      })
      .catch(function () { btn.disabled = false; say(T.fail, true); });
  });
})();
