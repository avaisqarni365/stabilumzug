/* Photos with a request: furniture, boxes, accessories – from the camera or from files (computer or phone).
   The browser shrinks each photo (longest side 1600 px, JPEG) before it leaves the device; the photos are sent
   right after the request itself (action=photos, with the one-time token from that answer) and reach the office
   as one e-mail with the photos attached. Photos stay in memory only – nothing is stored in the browser.

   Use: <div data-photos="planner"></div> anywhere; StabilPhotos.mountAll(root) draws the control into it
   (again after every re-render – the photos live in a store per key, not in the DOM).
   StabilPhotos.count(key), StabilPhotos.send(key, api, id, token) → Promise<number sent>. */
(function () {
  'use strict';
  var MAX = 10, EDGE = 1600, QUALITY = 0.82;
  var en = document.documentElement.lang === 'en';
  var T = en ? {
    title: 'Photos of furniture and items (optional)',
    hint: 'A few photos help us plan: large furniture, the piano, boxes, cellar or attic. Up to 10 photos.',
    camera: 'Take photo', files: 'Choose photos', drop: 'or drop photos here',
    count: '{n} of {max} photos', remove: 'Remove photo {n}', tooMany: 'At most {max} photos.',
    bad: 'This file could not be read. Please use JPG or PNG photos.', reading: 'Preparing photo …'
  } : {
    title: 'Fotos von Möbeln und Zubehör (optional)',
    hint: 'Ein paar Fotos helfen bei der Planung: große Möbel, Klavier, Kartons, Keller oder Dachboden. Bis zu 10 Fotos.',
    camera: 'Foto aufnehmen', files: 'Fotos auswählen', drop: 'oder Fotos hierher ziehen',
    count: '{n} von {max} Fotos', remove: 'Foto {n} entfernen', tooMany: 'Höchstens {max} Fotos.',
    bad: 'Diese Datei konnte nicht gelesen werden. Bitte JPG- oder PNG-Fotos verwenden.', reading: 'Foto wird vorbereitet …'
  };
  var store = {}, flash = {}, pendingN = {};
  var touch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  var fmt = function (s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var list = function (key) { return store[key] || (store[key] = []); };

  var CAM = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  var IMG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5h16v14H4z"/><path d="M4 16l5-5 4 4 3-3 4 4"/><circle cx="15.5" cy="9" r="1.5"/></svg>';

  /* Shrink one image file to a JPEG blob (longest side EDGE). Browsers apply the EXIF orientation when drawing. */
  function shrink(file) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, f = Math.min(1, EDGE / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * f); c.height = Math.round(h * f);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : fail(new Error('encode')); }, 'image/jpeg', QUALITY);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('decode')); };
      img.src = url;
    });
  }

  function add(key, files) {
    var L = list(key), room = MAX - L.length - (pendingN[key] || 0);
    files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name); });
    flash[key] = files.length > room ? fmt(T.tooMany, {max: MAX}) : '';
    files = files.slice(0, Math.max(0, room));
    if (!files.length) return redraw(key);
    pendingN[key] = (pendingN[key] || 0) + files.length; redraw(key);
    files.reduce(function (p, f) {
      return p.then(function () {
        return shrink(f).then(function (b) { L.push({blob: b, url: URL.createObjectURL(b)}); }, function () { flash[key] = T.bad; })
          .then(function () { pendingN[key]--; redraw(key); });
      });
    }, Promise.resolve());
  }
  function remove(key, i) {
    var L = list(key), it = L.splice(i, 1)[0];
    if (it) URL.revokeObjectURL(it.url);
    flash[key] = ''; redraw(key);
  }

  function html(key) {
    var L = list(key), n = L.length, busy = pendingN[key] || 0, full = n + busy >= MAX;
    var thumbs = L.map(function (it, i) {
      return '<li><img src="' + it.url + '" alt=""><button type="button" class="ph-x" data-ph-rm="' + i + '" aria-label="' + esc(fmt(T.remove, {n: i + 1})) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>';
    }).join('') + (busy ? new Array(busy + 1).join('<li class="ph-wait" aria-label="' + esc(T.reading) + '"></li>') : '');
    return '<div class="ph-box' + (n ? ' has' : '') + '"><div class="ph-head"><b>' + esc(T.title) + '</b><span>' + esc(T.hint) + '</span></div>' +
      '<div class="ph-btns">' +
      (touch ? '<label class="ph-btn' + (full ? ' off' : '') + '">' + CAM + '<span>' + esc(T.camera) + '</span><input type="file" accept="image/*" capture="environment"' + (full ? ' disabled' : '') + '></label>' : '') +
      '<label class="ph-btn' + (touch ? ' ph-line' : '') + (full ? ' off' : '') + '">' + IMG + '<span>' + esc(T.files) + '</span><input type="file" accept="image/*" multiple' + (full ? ' disabled' : '') + '></label>' +
      (touch ? '' : '<span class="ph-drop">' + esc(T.drop) + '</span>') + '</div>' +
      (n || busy ? '<ul class="ph-list">' + thumbs + '</ul><p class="ph-count" aria-live="polite">' + esc(fmt(T.count, {n: n, max: MAX})) + '</p>' : '') +
      (flash[key] ? '<p class="ph-err" role="alert">' + esc(flash[key]) + '</p>' : '') + '</div>';
  }

  function wire(el) {
    var key = el.getAttribute('data-photos');
    el.innerHTML = html(key);
    el.querySelectorAll('input[type=file]').forEach(function (inp) {
      inp.addEventListener('change', function () { add(key, inp.files); });
    });
    el.querySelectorAll('[data-ph-rm]').forEach(function (b) {
      b.addEventListener('click', function () {
        remove(key, +b.getAttribute('data-ph-rm'));
        var next = document.querySelector('[data-photos="' + key + '"] .ph-x, [data-photos="' + key + '"] .ph-btn input');
        if (next) next.focus({preventScroll: true});
      });
    });
    if (!el._phDrop) {   // drag and drop on computers
      el._phDrop = true;
      el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('ph-over'); });
      el.addEventListener('dragleave', function () { el.classList.remove('ph-over'); });
      el.addEventListener('drop', function (e) { e.preventDefault(); el.classList.remove('ph-over'); add(key, e.dataTransfer && e.dataTransfer.files); });
    }
  }
  function redraw(key) { document.querySelectorAll('[data-photos="' + key + '"]').forEach(wire); }
  function mountAll(root) { (root || document).querySelectorAll('[data-photos]').forEach(wire); }

  function b64(blob) {
    return new Promise(function (ok, fail) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = fail; r.readAsDataURL(blob);
    });
  }
  /* Sends the photos of one key for request `id`; resolves with the number sent (0 when there were none). */
  function send(key, api, id, token, note) {
    var L = list(key);
    if (!L.length || !api || !id || !token) return Promise.resolve(0);
    return Promise.all(L.map(function (it) { return b64(it.blob); })).then(function (data) {
      // "action" first: the server accepts large bodies only for photo uploads
      var body = JSON.stringify({action: 'photos', id: id, k: token, note: note || '', images: data.map(function (d) { return {type: 'image/jpeg', data: d}; })});
      return fetch(api, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: body});
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error || 'photos');
      var n = L.length; L.splice(0).forEach(function (it) { URL.revokeObjectURL(it.url); }); redraw(key);
      return n;
    });
  }

  var SITE = window.SITE || {};
  if (!SITE.api || String(SITE.api).charAt(0) === '[') {   // without the website API the photos could not be sent
    document.querySelectorAll('[data-photos]').forEach(function (el) { el.remove(); });
    return;
  }
  window.StabilPhotos = {mountAll: mountAll, count: function (key) { return list(key).length; }, send: send, busy: function (key) { return (pendingN[key] || 0) > 0; }};
  mountAll(document);
})();
