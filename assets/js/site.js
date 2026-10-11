/* Stabil Umzug: small enhancements. The site works without JavaScript except the planner and the message builder. */
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      btn.setAttribute('aria-expanded', String(!open));
    });
  }

  /* Footer service area: switch between the Essen and Ruhr lists (both visible without JavaScript). */
  (function () {
    var tabs = document.querySelectorAll('.areas-tabs [data-tab]');
    if (!tabs.length) return;
    function show(id) {
      Array.prototype.forEach.call(tabs, function (b) {
        var on = b.getAttribute('data-tab') === id;
        b.setAttribute('aria-selected', String(on));
        document.getElementById(b.getAttribute('data-tab')).hidden = !on;
      });
    }
    Array.prototype.forEach.call(tabs, function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
    show('areas-essen');
  })();

  /* Scroll reveal: sections fade in once as they enter the viewport (CSS skips it for reduced motion). */
  (function () {
    var els = document.querySelectorAll('main .section > .container, main .poster > .container, main .cta > .container');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
    Array.prototype.forEach.call(els, function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return;   // already on screen: leave it visible
      el.classList.add('rv'); io.observe(el);
    });
  })();

  /* Lead source: carry campaign parameters (or the external referrer) along internal links so the planner
     can name the source in the request. Nothing is stored; the values only live in the link. */
  (function () {
    var p = new URLSearchParams(location.search), keep = new URLSearchParams();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'gclid', 'ref'].forEach(function (k) { if (p.get(k)) keep.set(k, p.get(k).slice(0, 80)); });
    if (!keep.toString() && document.referrer) {
      try { var h = new URL(document.referrer).hostname; if (h && h !== location.hostname) keep.set('ref', h); } catch (e) {}
    }
    if (!keep.toString()) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      if (a.origin !== location.origin || a.hash && a.pathname === location.pathname) return;
      var u = new URL(a.href);
      keep.forEach(function (v, k) { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
      a.href = u.toString();
    });
  })();

  /* Contact page: builds an email or WhatsApp message from the form. Nothing is sent to a server. */
  var form = document.getElementById('contact-form');
  if (!form) return;
  var SITE = window.SITE || {};
  var msg = document.getElementById('contact-msg');
  var de = document.documentElement.lang !== 'en';

  function text() {
    var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var lines = [
      (de ? 'Umzugsanfrage' : 'Moving request') + ' - ' + (SITE.company || ''),
      '',
      (de ? 'Name: ' : 'Name: ') + g('c-name'),
      (de ? 'Telefon/E-Mail: ' : 'Phone/email: ') + g('c-contact'),
      (de ? 'Von: ' : 'From: ') + g('c-from'),
      (de ? 'Nach: ' : 'To: ') + g('c-to'),
      (de ? 'Wunschtermin: ' : 'Preferred date: ') + g('c-date'),
      '',
      g('c-note')
    ];
    return lines.join('\n');
  }
  function configured(v) { return v && v.charAt(0) !== '['; }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  var mailBtn = document.getElementById('send-mail');
  var waBtn = document.getElementById('send-wa');
  if (mailBtn) mailBtn.addEventListener('click', function () {
    if (!form.reportValidity()) return;
    if (!configured(SITE.email)) { msg.textContent = de ? 'Die E-Mail-Adresse ist noch nicht eingetragen.' : 'The email address has not been set yet.'; return; }
    location.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent((de ? 'Umzugsanfrage' : 'Moving request')) + '&body=' + encodeURIComponent(text());
  });
  if (waBtn) waBtn.addEventListener('click', function () {
    if (!form.reportValidity()) return;
    if (!SITE.whatsapp) { msg.textContent = de ? 'Die WhatsApp-Nummer ist noch nicht eingetragen.' : 'The WhatsApp number has not been set yet.'; return; }
    window.open('https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(text()), '_blank', 'noopener');
  });
})();
