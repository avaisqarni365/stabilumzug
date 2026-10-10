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
