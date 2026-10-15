/* "Mein Umzug" – customer area. Opened with the personal link from the quote message (?id=A-…&k=token).
   Data comes from the Google Sheet back end (SITE.api); provides interactive digital contract signing. */
(function () {
  'use strict';
  var box = document.getElementById('portal');
  if (!box) return;
  var SITE = window.SITE || {}, API = SITE.api && SITE.api.charAt(0) !== '[' ? SITE.api : '';
  var en = document.documentElement.lang === 'en';
  var T = en ? {
    loading: 'Loading your move …', notFound: 'This link is not valid (any more). Enter your e-mail address and we will send you your current link.',
    noLink: 'Open this page with the personal link from our quote message – or enter your e-mail address and we will send it to you.',
    email: 'E-mail address', send: 'Send link', sent: 'If we have a quote for this address, the link is on its way. Please also check your spam folder.',
    steps: ['Request received', 'Quote sent', 'Contract signed', 'Moving day', 'Done'], closed: 'This request is closed. Contact us any time for a new quote.',
    req: 'Request', service: 'Service', date: 'Date', from: 'From', to: 'To', flexible: 'flexible',
    quote: 'Your quote', total: 'Total price', noQuote: 'We are preparing your quote and will send it within 24 hours.',
    contractTitle: 'Binding Contract & Digital Signature',
    contractSub: 'Review your quote and digitally sign your moving contract here. You will receive an official confirmation by email right away.',
    sigHint: 'Sign here with finger, stylus or mouse',
    clearSig: 'Clear signature',
    signerLabel: 'Full name of the signing person',
    signerPlaceholder: 'First and last name',
    cOrder: 'I have reviewed the quote and place a legally binding order with Stabil Umzug at the stated price.',
    cWaiver: 'I expressly request and agree that Stabil Umzug begins providing the service before the end of the statutory 14-day cancellation period (§ 356(4) BGB). I understand that I lose my right of withdrawal upon complete performance.',
    cAgb: 'I accept the Terms and Conditions and acknowledge the Privacy Policy.',
    acceptBtn: 'Sign contract & place binding order',
    submitting: 'Submitting contract …',
    signedBadge: '✓ Contract digitally signed & binding',
    signedNotice: 'Thank you – your move is firmly booked. The contract confirmation has been emailed to you.',
    printContract: 'Print / Save contract confirmation',
    needSig: 'Please draw your signature in the signature box.',
    needName: 'Please enter your full name.',
    needConsents: 'Please check all required legal confirmations before signing.',
    err: 'That did not work. Please try again or call us.',
    list: 'Your checklist', before: 'days before', after: 'days after', due: 'by',
    tasks: [['hvz', 'Apply for a no-parking zone (we do this if you chose it)', 14], ['bulk', 'Book bulky-waste pickup with the city', 10], ['mail', 'Set up mail forwarding', 7],
      ['util', 'Transfer power, gas and internet', 7], ['pack', 'Pack and label boxes room by room', 3], ['reg', 'Register at the citizens’ office', -14]],
    help: 'Questions?', call: 'Call', wa: 'WhatsApp'
  } : {
    loading: 'Ihr Umzug wird geladen …', notFound: 'Dieser Link ist nicht (mehr) gültig. Geben Sie Ihre E-Mail-Adresse ein – wir senden Ihnen Ihren aktuellen Link.',
    noLink: 'Öffnen Sie diese Seite mit dem persönlichen Link aus unserer Angebotsnachricht – oder geben Sie Ihre E-Mail-Adresse ein, dann senden wir ihn Ihnen.',
    email: 'E-Mail-Adresse', send: 'Link senden', sent: 'Wenn wir zu dieser Adresse ein Angebot haben, ist der Link unterwegs. Bitte prüfen Sie auch den Spam-Ordner.',
    steps: ['Anfrage eingegangen', 'Angebot erhalten', 'Vertrag gezeichnet', 'Umzugstag', 'Erledigt'], closed: 'Diese Anfrage ist abgeschlossen. Für ein neues Angebot erreichen Sie uns jederzeit.',
    req: 'Anfrage', service: 'Leistung', date: 'Termin', from: 'Von', to: 'Nach', flexible: 'flexibel',
    quote: 'Ihr Angebot', total: 'Gesamtpreis', noQuote: 'Wir erstellen gerade Ihr Angebot und senden es innerhalb von 24 Stunden.',
    contractTitle: 'Verbindlicher Vertragsabschluss & digitale Signatur',
    contractSub: 'Prüfen Sie Ihr persönliches Angebot und zeichnen Sie den Umzugsauftrag direkt hier digital. Sie erhalten sofort Ihre Auftragsbestätigung per E-Mail.',
    sigHint: 'Hier mit Finger, Stift oder Maus unterschreiben',
    clearSig: 'Unterschrift zurücksetzen',
    signerLabel: 'Vollständiger Name des Unterzeichnenden',
    signerPlaceholder: 'Vor- und Nachname',
    cOrder: 'Ich habe das Angebot geprüft und erteile Stabil Umzug den verbindlichen Auftrag zur Durchführung zu den genannten Konditionen.',
    cWaiver: 'Ich verlange ausdrücklich und stimme zu, dass Stabil Umzug vor Ende der 14-tägigen Widerrufsfrist mit der Ausführung der Dienstleistung beginnt (§ 356 Abs. 4 BGB). Mir ist bekannt, dass ich mein Widerrufsrecht bei vollständiger Erfüllung verliere.',
    cAgb: 'Ich bestätige die Geltung der AGB und habe die Datenschutzerklärung zur Kenntnis genommen.',
    acceptBtn: 'Vertrag verbindlich unterzeichnen & zahlungspflichtig beauftragen',
    submitting: 'Vertrag wird übermittelt …',
    signedBadge: '✓ Vertrag rechtsgültig digital gezeichnet',
    signedNotice: 'Danke – Ihr Umzug ist verbindlich beauftragt. Die Auftragsbestätigung wurde an Ihre E-Mail-Adresse gesendet.',
    printContract: 'Vertragsbestätigung drucken / speichern',
    needSig: 'Bitte leisten Sie Ihre digitale Unterschrift im Unterschriftenfeld.',
    needName: 'Bitte tragen Sie Ihren Namen ein.',
    needConsents: 'Bitte bestätigen Sie alle drei rechtlichen Pflichtangaben vor der Beauftragung.',
    err: 'Das hat nicht geklappt. Bitte erneut versuchen oder anrufen.',
    list: 'Ihre Checkliste', before: 'Tage vorher', after: 'Tage danach', due: 'bis',
    tasks: [['hvz', 'Halteverbotszone beantragen (übernehmen wir, wenn gewählt)', 14], ['bulk', 'Sperrmüll-Termin bei der Stadt', 10], ['mail', 'Nachsendeauftrag stellen', 7],
      ['util', 'Strom, Gas und Internet ummelden', 7], ['pack', 'Kartons packen und beschriften', 3], ['reg', 'Ummeldung beim Bürgeramt', -14]],
    help: 'Fragen?', call: 'Anrufen', wa: 'WhatsApp'
  };
  var loc = en ? 'en-GB' : 'de-DE';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function eur(n) { return Number(n).toLocaleString('de-DE', {minimumFractionDigits: 0, maximumFractionDigits: 2}) + ' €'; }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function fmt(s) { return isDate(s) ? new Date(s + 'T12:00:00').toLocaleDateString(loc, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'}) : (s || T.flexible); }
  function dt(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString(loc, {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) + (en ? '' : ' Uhr'); }
  var p = new URLSearchParams(location.search), id = p.get('id') || '', k = p.get('k') || '';

  function resendForm(msg) {
    box.innerHTML = '<p class="portal-msg">' + esc(msg) + '</p><form class="form" id="resend" novalidate style="max-width:520px">' +
      '<div class="wide"><label for="rs-email">' + esc(T.email) + '</label><input id="rs-email" type="email" autocomplete="email" required></div>' +
      '<div class="wide actions"><button class="button primary" type="submit">' + esc(T.send) + '</button></div><p class="wide msg" id="rs-msg" role="status"></p></form>';
    document.getElementById('resend').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = document.getElementById('rs-email').value.trim(), m = document.getElementById('rs-msg');
      if (!API || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { m.textContent = T.err; m.className = 'wide msg bad'; return; }
      fetch(API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({action: 'resend', email: v, lang: en ? 'en' : 'de'})})
        .then(function (r) { return r.json(); }).then(function () { m.textContent = T.sent; m.className = 'wide msg good'; })
        .catch(function () { m.textContent = T.err; m.className = 'wide msg bad'; });
    });
  }

  function stepIndex(d) {
    if (d.status === 'Erledigt') return 4;
    if (d.status === 'Gebucht') return isDate(d.date) && d.date <= new Date().toISOString().slice(0, 10) ? 3 : 2;
    if (d.status === 'Angebot raus') return 1;
    return 0;
  }

  function initSignature(canvas) {
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = rect.width || 560;
    var h = rect.height || 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#17304f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var drawing = false, points = 0;
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function start(e) {
      if (e.cancelable && e.type !== 'mousedown') e.preventDefault();
      drawing = true;
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(e) {
      if (!drawing) return;
      if (e.cancelable && e.type !== 'mousemove') e.preventDefault();
      var p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      points++;
      var hint = document.getElementById('sig-hint');
      if (hint) hint.style.display = 'none';
    }
    function end() {
      if (drawing) {
        drawing = false;
        ctx.closePath();
      }
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, {passive: false});
    canvas.addEventListener('touchmove', move, {passive: false});
    window.addEventListener('touchend', end);

    return {
      clear: function () {
        ctx.clearRect(0, 0, w, h);
        points = 0;
        var hint = document.getElementById('sig-hint');
        if (hint) hint.style.display = 'block';
      },
      hasSigned: function () { return points > 8; },
      dataUrl: function () { return points > 8 ? canvas.toDataURL('image/png') : ''; }
    };
  }

  function render(d) {
    var step = stepIndex(d), closed = d.status === 'Verloren';
    var steps = '<ol class="pstep">' + T.steps.map(function (s, i) { return '<li class="' + (i < step ? 'done' : i === step ? 'now' : '') + '"><span>' + (i + 1) + '</span>' + esc(s) + '</li>'; }).join('') + '</ol>';
    var facts = [[T.req, d.id], [T.service, d.service], [T.date, fmt(d.date)], [T.from, d.from], [T.to, d.to]].filter(function (f) { return f[1]; });
    var quote = '';
    if (d.quote) {
      quote = '<section class="pcard"><h2>' + esc(T.quote) + '</h2><table class="ptab"><tbody>' + d.quote.lines.map(function (l) {
        return '<tr><th scope="row">' + esc(l.pos) + (l.basis ? '<small>' + esc(l.basis) + '</small>' : '') + '</th><td>' + eur(l.amount) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><th scope="row">' + esc(T.total) + '</th><td>' + eur(d.quote.total) + '</td></tr></tfoot></table>';

      if (d.status === 'Gebucht' || d.status === 'Erledigt') {
        quote += '<div class="sig-box" style="margin-top:20px">' +
          '<div class="sig-badge">' + esc(T.signedBadge) + '</div>' +
          '<p class="sig-meta"><b>' + esc(d.signer || d.name) + '</b>' + (d.signedAt ? ' · ' + dt(d.signedAt) : '') + '</p>' +
          (d.signature ? '<img class="sig-preview" src="' + esc(d.signature) + '" alt="Digitale Unterschrift">' : '') +
          '<p class="portal-ok">' + esc(T.signedNotice) + '</p>' +
          '<div class="actions" style="margin-top:14px"><button class="button arrow" type="button" id="p-print">' + esc(T.printContract) + '</button></div>' +
          '</div>';
      } else if (!closed) {
        quote += '<div class="sig-box" id="sign">' +
          '<h3 class="sig-title">' + esc(T.contractTitle) + '</h3>' +
          '<p class="sig-sub">' + esc(T.contractSub) + '</p>' +
          '<div class="sig-name-field"><label for="sig-name">' + esc(T.signerLabel) + '</label>' +
          '<input id="sig-name" type="text" value="' + esc(d.name || '') + '" placeholder="' + esc(T.signerPlaceholder) + '" required autocomplete="name"></div>' +
          '<div class="sig-canvas-wrap">' +
          '<canvas id="sig-canvas" class="sig-canvas"></canvas>' +
          '<span class="sig-hint" id="sig-hint">' + esc(T.sigHint) + '</span>' +
          '</div>' +
          '<div class="sig-tools">' +
          '<button type="button" id="sig-clear">' + esc(T.clearSig) + '</button>' +
          '<span class="muted" style="font-size:12px">' + esc(d.id) + ' · ' + (isDate(d.date) ? fmt(d.date) : esc(d.date || '')) + '</span>' +
          '</div>' +
          '<div class="sig-consents">' +
          '<label><input type="checkbox" id="c-order"> <span>' + esc(T.cOrder) + '</span></label>' +
          '<label><input type="checkbox" id="c-waiver"> <span>' + esc(T.cWaiver) + '</span></label>' +
          '<label><input type="checkbox" id="c-agb"> <span>' + esc(T.cAgb) + '</span></label>' +
          '</div>' +
          '<button class="button primary" id="pa" style="width:100%">' + esc(T.acceptBtn) + '</button>' +
          '<p class="msg" id="pm" role="status"></p>' +
          '</div>';
      }
      quote += '</section>';
    } else if (!closed) {
      quote = '<section class="pcard"><h2>' + esc(T.quote) + '</h2><p>' + esc(T.noQuote) + '</p></section>';
    }

    var list = '';
    if (isDate(d.date) && !closed) {
      var done = {}; try { done = JSON.parse(localStorage.getItem('su-check-' + d.id) || '{}'); } catch (e) {}
      var base = new Date(d.date + 'T12:00:00');
      list = '<section class="pcard"><h2>' + esc(T.list) + '</h2><ul class="pcheck">' + T.tasks.map(function (tk) {
        var due = new Date(base.getTime() - tk[2] * 864e5);
        return '<li><label><input type="checkbox" data-t="' + tk[0] + '"' + (done[tk[0]] ? ' checked' : '') + '> <span>' + esc(tk[1]) +
          '<small>' + esc(T.due) + ' ' + due.toLocaleDateString(loc, {day: '2-digit', month: '2-digit'}) + ' · ' + Math.abs(tk[2]) + ' ' + esc(tk[2] > 0 ? T.before : T.after) + '</small></span></label></li>';
      }).join('') + '</ul></section>';
    }
    var help = '<section class="pcard"><h2>' + esc(T.help) + '</h2><div class="actions">' +
      (SITE.phone_href ? '<a class="button arrow" href="tel:' + esc(SITE.phone_href) + '">' + esc(T.call + ' ' + SITE.phone) + '</a>' : '') +
      (SITE.whatsapp ? '<a class="button arrow" href="https://wa.me/' + esc(SITE.whatsapp) + '?text=' + encodeURIComponent((en ? 'Request ' : 'Anfrage ') + d.id) + '" rel="noopener">' + esc(T.wa) + '</a>' : '') + '</div></section>';

    box.innerHTML = '<p class="portal-hello">' + esc((en ? 'Hello ' : 'Hallo ') + d.name) + '</p>' + (closed ? '<p class="portal-msg">' + esc(T.closed) + '</p>' : steps) +
      '<dl class="pfacts">' + facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="pgrid"><div>' + quote + '</div><div>' + list + help + '</div></div>';

    var printBtn = document.getElementById('p-print');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

    var canvas = document.getElementById('sig-canvas');
    var sigPad = initSignature(canvas);
    var clearBtn = document.getElementById('sig-clear');
    if (clearBtn && sigPad) clearBtn.addEventListener('click', function () { sigPad.clear(); });

    var pa = document.getElementById('pa');
    if (pa && sigPad) {
      pa.addEventListener('click', function () {
        var pm = document.getElementById('pm');
        var nameInput = document.getElementById('sig-name');
        var signer = nameInput ? nameInput.value.trim() : '';
        if (!signer) { pm.textContent = T.needName; pm.className = 'msg bad'; nameInput.focus(); return; }
        if (!sigPad.hasSigned()) { pm.textContent = T.needSig; pm.className = 'msg bad'; return; }
        var cOrder = document.getElementById('c-order');
        var cWaiver = document.getElementById('c-waiver');
        var cAgb = document.getElementById('c-agb');
        if (!cOrder.checked || !cWaiver.checked || !cAgb.checked) {
          pm.textContent = T.needConsents; pm.className = 'msg bad'; return;
        }

        pa.disabled = true;
        pm.textContent = T.submitting;
        pm.className = 'msg';
        var sigImg = sigPad.dataUrl();

        fetch(API, {
          method: 'POST',
          headers: {'Content-Type': 'text/plain;charset=utf-8'},
          body: JSON.stringify({
            action: 'accept',
            id: d.id,
            k: k,
            confirm: true,
            sig: sigImg,
            signer: signer
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (r) {
            if (r && r.ok) {
              d.status = 'Gebucht';
              d.signedAt = r.signedAt || new Date().toISOString();
              d.signer = r.signer || signer;
              d.signature = sigImg;
              render(d);
            } else {
              pa.disabled = false;
              pm.textContent = T.err;
              pm.className = 'msg bad';
            }
          })
          .catch(function () {
            pa.disabled = false;
            pm.textContent = T.err;
            pm.className = 'msg bad';
          });
      });
    }

    box.querySelectorAll('.pcheck input').forEach(function (c) {
      c.addEventListener('change', function () {
        var done = {}; try { done = JSON.parse(localStorage.getItem('su-check-' + d.id) || '{}'); } catch (e) {}
        done[c.getAttribute('data-t')] = c.checked;
        try { localStorage.setItem('su-check-' + d.id, JSON.stringify(done)); } catch (e) {}
      });
    });
  }

  if (!API) { resendForm(T.err); return; }
  if (!id || !k) { resendForm(T.noLink); return; }
  box.innerHTML = '<p class="portal-msg">' + esc(T.loading) + '</p>';
  fetch(API + '?action=portal&id=' + encodeURIComponent(id) + '&k=' + encodeURIComponent(k))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.ok) render(d); else resendForm(T.notFound); })
    .catch(function () { resendForm(T.err); });
})();
