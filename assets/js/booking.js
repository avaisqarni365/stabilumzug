/* "Termin buchen": pick the kind of appointment, a day and a free time, enter contact details – booked at once.
   Free times come from the company sheet (Apps Script, action=slots); the booking goes there too (action=book),
   and customer and office get an e-mail with a calendar file. */
(function () {
  'use strict';
  var root = document.getElementById('booking');
  if (!root) return;
  var SITE = window.SITE || {}, API = SITE.api && SITE.api.charAt(0) !== '[' ? SITE.api : '';
  var en = document.documentElement.lang === 'en', started = Date.now();
  var T = en ? {
    s1: 'What kind of appointment?', s2: 'Pick a day', s3: 'Pick a time', s4: 'Your details', min: 'min', free: 'free', full: 'full', none: 'closed',
    types: {visit: ['On-site viewing', 'We come to you, look at everything and send a fixed quote. Free.'], video: ['Video viewing', 'Show us your rooms by WhatsApp video. Free, from anywhere.'], call: ['Call-back and advice', 'We call you and answer your questions about the move.']},
    name: 'Name', phone: 'Phone (for WhatsApp too)', email: 'Email (for the confirmation)', addrVisit: 'Address of the viewing', addr: 'Where do you live? (optional)', to: 'Moving to (optional)', msg: 'Anything we should know? (optional)',
    consent: 'I agree that Stabil Umzug stores my details to arrange this appointment and contacts me about it. I can withdraw this at any time.', privacy: 'Privacy policy',
    book: 'Book appointment', booking: 'Booking …', pick: 'Choose a day and a time first.', loading: 'Loading free times …', slow: 'Still loading – the first call can take a few seconds. Rather talk right away? Call', noTimes: 'No free times on this day.',
    errLoad: 'The free times could not be loaded. Please call us or write on WhatsApp.', errTaken: 'This time has just been booked by someone else. Please choose another one.',
    errMail: 'Please check your email address.', errAddr: 'Please enter the address for the viewing.', errGen: 'That did not work. Please try again or call us.',
    done: 'Your appointment is booked.', doneText: 'We have sent the confirmation and a calendar file to', add: 'Add to calendar', gcal: 'Google Calendar', ics: 'Calendar file (.ics)',
    next: 'What happens next', nextList: {visit: ['We arrive on time – the address is in your confirmation.', 'We look at all rooms, the cellar and access.', 'You get your fixed quote within 24 hours.'],
      video: ['We call you by WhatsApp video on your number.', 'Walk us through the rooms with your phone.', 'You get your quote within 24 hours.'],
      call: ['We call you at the booked time.', 'We answer your questions and note your wishes.', 'If you like, we send you a quote right after.']},
    change: 'Need to change? Reply to the confirmation email or call', ref: 'Reference', sel: 'Your appointment', when: 'Day and time',
    more: 'More details (optional)', next2: 'Continue'
  } : {
    s1: 'Welche Art von Termin?', s2: 'Tag wählen', s3: 'Uhrzeit wählen', s4: 'Ihre Angaben', min: 'Min.', free: 'frei', full: 'voll', none: 'geschlossen',
    types: {visit: ['Besichtigung vor Ort', 'Wir kommen zu Ihnen, sehen uns alles an und schicken ein verbindliches Angebot. Kostenlos.'], video: ['Video-Besichtigung', 'Zeigen Sie uns Ihre Räume per WhatsApp-Video. Kostenlos, von überall.'], call: ['Rückruf und Beratung', 'Wir rufen Sie an und beantworten Ihre Fragen rund um den Umzug.']},
    name: 'Name', phone: 'Telefon (auch für WhatsApp)', email: 'E-Mail (für die Bestätigung)', addrVisit: 'Adresse der Besichtigung', addr: 'Wo wohnen Sie? (optional)', to: 'Umzug nach (optional)', msg: 'Was sollten wir wissen? (optional)',
    consent: 'Ich bin einverstanden, dass Stabil Umzug meine Angaben speichert, um diesen Termin zu vereinbaren, und mich dazu kontaktiert. Ich kann das jederzeit widerrufen.', privacy: 'Datenschutzerklärung',
    book: 'Termin verbindlich buchen', booking: 'Wird gebucht …', pick: 'Bitte zuerst Tag und Uhrzeit wählen.', loading: 'Freie Zeiten werden geladen …', slow: 'Lädt noch – beim ersten Aufruf dauert es einige Sekunden. Lieber direkt sprechen? Rufen Sie an:', noTimes: 'An diesem Tag ist nichts mehr frei.',
    errLoad: 'Die freien Zeiten konnten nicht geladen werden. Bitte rufen Sie uns an oder schreiben Sie per WhatsApp.', errTaken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere.',
    errMail: 'Bitte prüfen Sie Ihre E-Mail-Adresse.', errAddr: 'Bitte die Adresse für die Besichtigung eingeben.', errGen: 'Das hat nicht geklappt. Bitte noch einmal versuchen oder anrufen.',
    done: 'Ihr Termin ist gebucht.', doneText: 'Die Bestätigung mit Kalenderdatei haben wir geschickt an', add: 'Zum Kalender hinzufügen', gcal: 'Google Kalender', ics: 'Kalenderdatei (.ics)',
    next: 'So geht es weiter', nextList: {visit: ['Wir kommen pünktlich – die Adresse steht in Ihrer Bestätigung.', 'Wir sehen uns alle Räume, Keller und Zugang an.', 'Sie bekommen Ihr verbindliches Angebot innerhalb von 24 Stunden.'],
      video: ['Wir rufen Sie per WhatsApp-Video unter Ihrer Nummer an.', 'Sie zeigen uns die Räume mit dem Handy.', 'Sie bekommen Ihr Angebot innerhalb von 24 Stunden.'],
      call: ['Wir rufen Sie zur gebuchten Zeit an.', 'Wir beantworten Ihre Fragen und notieren Ihre Wünsche.', 'Auf Wunsch schicken wir Ihnen gleich danach ein Angebot.']},
    change: 'Etwas ändern? Antworten Sie auf die Bestätigung oder rufen Sie an:', ref: 'Terminnummer', sel: 'Ihr Termin', when: 'Tag und Uhrzeit',
    more: 'Weitere Angaben (optional)', next2: 'Weiter'
  };
  var WD = en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var WDL = en ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var S = {type: (new URLSearchParams(location.search).get('art') || 'visit'), days: null, date: '', time: '', busy: false};
  if (!T.types[S.type]) S.type = 'visit';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function dLong(iso) { var d = new Date(iso + 'T12:00:00'); return WDL[d.getDay()] + ', ' + (en ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.'); }
  var phone = SITE.phone && SITE.phone.charAt(0) !== '[' ? SITE.phone : '';
  var privacy = root.getAttribute('data-privacy') || '#';
  if (!API) { root.innerHTML = '<p class="bk-msg">' + esc(T.errLoad) + (phone ? ' <a href="tel:' + esc(SITE.phone_href || phone) + '">' + esc(phone) + '</a>' : '') + '</p>'; return; }

  function source() {
    var p = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (p.get(k)) o[k] = p.get(k).slice(0, 60); });
    if (!o.utm_source && document.referrer) { try { var h = new URL(document.referrer).hostname; if (h !== location.hostname) o.ref = h; } catch (e) {} }
    return o;
  }

  var MONTHS = en ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var WD2 = en ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var small = function () { return window.matchMedia && matchMedia('(max-width:860px)').matches; };

  /* Order on the page: 1 kind → 2 day (month calendar) → 3 time → 4 details and booking. Steps 1–3 fit the first screen. */
  function draw() {
    var types = Object.keys(T.types).map(function (k) {
      var mins = k === 'visit' ? 60 : 30;
      var short = {visit: en ? 'On site' : 'Vor Ort', video: 'Video', call: en ? 'Call-back' : 'Rückruf'}[k];
      return '<label class="bk-type"><input type="radio" name="bk-type" value="' + k + '"' + (S.type === k ? ' checked' : '') + ' aria-label="' + esc(T.types[k][0]) + '"><span><span class="bk-ico bk-' + k + '" aria-hidden="true"></span><b class="bk-l">' + esc(T.types[k][0]) + '</b><b class="bk-sh">' + esc(short) + '</b><small>' + mins + ' ' + T.min + '</small></span></label>';
    }).join('');
    root.innerHTML = '<div class="bk">' +
      '<section class="bk-step bk-s1"><h2 data-no="1">' + esc(T.s1) + '</h2><div class="bk-types" role="radiogroup" aria-label="' + esc(T.s1) + '">' + types + '</div><p class="bk-desc" id="bk-desc"></p></section>' +
      '<div class="bk-pick">' +
        '<section class="bk-step bk-s2"><h2 data-no="2">' + esc(T.s2) + '</h2><div class="bk-cal" id="bk-cal"><p class="bk-msg">' + esc(T.loading) + '</p></div></section>' +
        '<section class="bk-step bk-s3"><h2 data-no="3">' + esc(T.s3) + '</h2><div class="bk-times" id="bk-times" role="radiogroup" aria-label="' + esc(T.s3) + '"><p class="bk-muted">' + esc(T.pick) + '</p></div></section>' +
      '</div>' +
      '<section class="bk-step bk-s4" id="bk-s4"><h2 data-no="4">' + esc(T.s4) + '</h2><div class="bk-chosen" id="bk-sum"></div><form id="bk-form" class="bk-form" novalidate>' +
        '<label class="field"><span>' + esc(T.name) + ' *</span><input class="input" name="name" required autocomplete="name"></label>' +
        '<label class="field"><span>' + esc(T.phone) + ' *</span><input class="input" name="phone" type="tel" required autocomplete="tel"></label>' +
        '<label class="field bk-wide"><span>' + esc(T.email) + ' *</span><input class="input" name="email" type="email" required autocomplete="email"></label>' +
        '<label class="field bk-wide"><span id="bk-addr-l">' + esc(T.addrVisit) + ' *</span><input class="input" name="address" autocomplete="street-address"></label>' +
        '<details class="bk-more bk-wide"><summary>' + esc(T.more) + '</summary><div class="bk-more-in">' +
          '<label class="field"><span>' + esc(T.to) + '</span><input class="input" name="to" autocomplete="off"></label>' +
          '<label class="field"><span>' + esc(T.msg) + '</span><textarea class="input" name="message" rows="3"></textarea></label></div></details>' +
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<label class="bk-consent bk-wide"><input type="checkbox" name="consent" required><span>' + esc(T.consent) + ' <a href="' + esc(privacy) + '">' + esc(T.privacy) + '</a></span></label>' +
        '<p class="bk-msg bk-wide" id="bk-err" hidden role="alert"></p>' +
        '<button class="button primary bk-wide" type="submit" id="bk-go">' + esc(T.book) + '</button></form>' +
        (phone ? '<p class="bk-muted" style="margin-top:12px">' + esc(T.change) + ' <a href="tel:' + esc(SITE.phone_href || phone) + '">' + esc(phone) + '</a></p>' : '') + '</section>' +
      '</div>' +
      '<div class="bk-bar" id="bk-bar" hidden><div><small id="bk-bar-k">' + esc(T.sel) + '</small><b id="bk-bar-t"></b></div><button type="button" class="button primary" id="bk-bar-go">' + esc(T.next2) + '</button></div>';
    root.querySelector('#bk-bar-go').addEventListener('click', function () { toForm(); });
    root.querySelectorAll('input[name="bk-type"]').forEach(function (r) { r.addEventListener('change', function () { S.type = r.value; S.date = ''; S.time = ''; load(); }); });
    root.querySelector('#bk-form').addEventListener('submit', submit);
    load();
  }

  function toForm() {
    root.querySelector('#bk-s4').scrollIntoView({block: 'start', behavior: 'smooth'});
    setTimeout(function () { var n = root.querySelector('input[name="name"]'); if (n && !n.value) n.focus({preventScroll: true}); }, 450);
  }
  function barState() {
    var bar = root.querySelector('#bk-bar'); if (!bar) return;
    var s4 = root.querySelector('#bk-s4');   // hidden while the form itself is on screen
    var formInView = s4 && s4.getBoundingClientRect().top < window.innerHeight * 0.8;
    var on = !!(S.date && S.time) && !formInView && small();
    bar.hidden = !on;
    if (on) {   // label "Ihr Termin · Vor Ort", main line "Mi., 14.10. · 09:30" – fits one line on small phones
      var d = new Date(S.date + 'T12:00:00'), shortType = {visit: en ? 'On site' : 'Vor Ort', video: 'Video', call: en ? 'Call-back' : 'Rückruf'}[S.type];
      // the type goes up into the small label, so day and time always fit on the smallest phones
      root.querySelector('#bk-bar-k').textContent = (en ? 'Slot' : 'Termin') + ' · ' + shortType;
      root.querySelector('#bk-bar-t').textContent = WD[d.getDay()] + (en ? ' ' + S.date.slice(8, 10) + '/' + S.date.slice(5, 7) : '., ' + S.date.slice(8, 10) + '.' + S.date.slice(5, 7) + '.') + ' · ' + S.time;
    }
  }

  /* The chosen appointment, shown at the top of step 4. */
  function summary() {
    var el = root.querySelector('#bk-sum'); if (!el) return;
    var addr = root.querySelector('#bk-addr-l'), visit = S.type === 'visit';
    if (addr) { addr.textContent = visit ? T.addrVisit + ' *' : T.addr; root.querySelector('input[name="address"]').required = visit; }
    var desc = root.querySelector('#bk-desc'); if (desc) desc.textContent = T.types[S.type][1];
    el.innerHTML = '<span class="bk-ico bk-' + S.type + '" aria-hidden="true"></span><div><b>' + esc(T.types[S.type][0]) + '</b>' +
      (S.date && S.time ? '<span>' + esc(dLong(S.date)) + ', ' + esc(S.time) + (en ? '' : ' Uhr') + '</span>' : '<span class="bk-muted">' + esc(T.pick) + '</span>') + '</div>';
    el.classList.toggle('is-set', !!(S.date && S.time));
    barState();
  }

  function load(fresh) {
    var box = root.querySelector('#bk-cal');
    var sk = ''; for (var i = 0; i < 35; i++) sk += '<span class="bk-c sk"></span>';
    box.innerHTML = '<div class="bk-cal-head"><span class="bk-nav sk"></span><b class="sk-t">' + esc(T.loading) + '</b><span class="bk-nav sk"></span></div><div class="bk-grid" aria-busy="true">' + sk + '</div>';
    root.querySelector('#bk-times').innerHTML = '<p class="bk-muted">' + esc(T.pick) + '</p>';
    summary();
    // a cold start of the server can take a while: after 5 s say so, with the phone number as the way out
    var slowT = setTimeout(function () {
      if (box.querySelector('.bk-grid[aria-busy]')) box.insertAdjacentHTML('beforeend', '<p class="bk-slow" role="status">' + esc(T.slow) +
        (phone ? ' <a href="tel:' + esc(SITE.phone_href || phone) + '">' + esc(phone) + '</a>' : '') + '</p>');
    }, 5000);
    slots(fresh).then(function (all) {
      clearTimeout(slowT);
      var t = all[S.type]; if (!t) throw new Error('slots');
      S.days = t.days; S.month = ''; days();
    }).catch(function () { clearTimeout(slowT); box.innerHTML = '<p class="bk-msg">' + esc(T.errLoad) + '</p>'; });
  }

  /* Free times of all types in one request (the server needs a few seconds on a cold start), kept for
     2 minutes in this tab so switching type or coming back is instant. */
  var SLOT_KEY = 'bk-slots', pending = null;
  function slots(fresh) {
    if (!fresh) {
      try { var c = JSON.parse(sessionStorage.getItem(SLOT_KEY) || 'null'); if (c && Date.now() - c.at < 120000) return Promise.resolve(c.types); } catch (e) {}
      if (pending) return pending;
    }
    pending = fetch(API + '?action=slots&type=all').then(function (r) { return r.json(); }).then(function (r) {
      pending = null;
      if (!r || !r.ok || !r.types) throw new Error('slots');
      try { sessionStorage.setItem(SLOT_KEY, JSON.stringify({at: Date.now(), types: r.types})); } catch (e) {}
      return r.types;
    }, function (e) { pending = null; throw e; });
    return pending;
  }
  function forget() { try { sessionStorage.removeItem(SLOT_KEY); } catch (e) {} }

  /* Month calendar (Mo–Su). Bookable days are buttons with the number of free times; the others are greyed out. */
  function days() {
    var box = root.querySelector('#bk-cal'), byDate = {};
    S.days.forEach(function (d) { byDate[d.date] = d.slots.length; });
    if (!S.date || !byDate[S.date]) { var first = S.days.filter(function (d) { return d.slots.length; })[0]; S.date = first ? first.date : ''; }
    var months = []; S.days.forEach(function (d) { var m = d.date.slice(0, 7); if (months.indexOf(m) < 0) months.push(m); });
    if (!S.month || months.indexOf(S.month) < 0) S.month = (S.date || S.days[0].date).slice(0, 7);
    var mi = months.indexOf(S.month), y = Number(S.month.slice(0, 4)), m = Number(S.month.slice(5, 7)) - 1;
    var first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate(), cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="bk-c empty" aria-hidden="true"></span>';
    for (var dd = 1; dd <= count; dd++) {
      var iso = S.month + '-' + ('0' + dd).slice(-2), n = byDate[iso];
      if (n) cells += '<button type="button" class="bk-c free' + (iso === S.date ? ' on' : '') + '" data-d="' + iso + '" aria-pressed="' + (iso === S.date) + '" aria-label="' + esc(dLong(iso)) + ': ' + n + ' ' + T.free + '"><b>' + dd + '</b><i>' + n + '</i></button>';
      else cells += '<span class="bk-c off' + (n === 0 ? ' full' : '') + '"><b>' + dd + '</b></span>';
    }
    box.innerHTML = '<div class="bk-cal-head"><button type="button" class="bk-nav" data-m="-1"' + (mi <= 0 ? ' disabled' : '') + ' aria-label="' + (en ? 'Previous month' : 'Voriger Monat') + '">‹</button>' +
      '<b>' + MONTHS[m] + ' ' + y + '</b><button type="button" class="bk-nav" data-m="1"' + (mi >= months.length - 1 ? ' disabled' : '') + ' aria-label="' + (en ? 'Next month' : 'Nächster Monat') + '">›</button></div>' +
      '<div class="bk-grid">' + WD2.map(function (w) { return '<span class="bk-wd">' + w + '</span>'; }).join('') + cells + '</div>' +
      '<p class="bk-legend"><i></i>' + (en ? 'free times' : 'freie Zeiten') + '</p>';
    box.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.date = b.getAttribute('data-d'); S.time = ''; days();
        if (small()) root.querySelector('.bk-s3').scrollIntoView({block: 'start', behavior: 'smooth'});
      });
    });
    box.querySelectorAll('[data-m]').forEach(function (b) {
      b.addEventListener('click', function () { S.month = months[mi + Number(b.getAttribute('data-m'))]; days(); });
    });
    times(); summary();
  }
  function times() {
    var box = root.querySelector('#bk-times'), d = S.days && S.days.filter(function (x) { return x.date === S.date; })[0];
    if (!d) { box.innerHTML = '<p class="bk-muted">' + esc(T.pick) + '</p>'; return; }
    if (!d.slots.length) { box.innerHTML = '<p class="bk-muted">' + esc(T.noTimes) + '</p>'; return; }
    box.innerHTML = '<p class="bk-day-l">' + esc(dLong(d.date)) + '</p><div class="bk-tgrid">' + d.slots.map(function (t) {
      return '<label class="bk-time"><input type="radio" name="bk-time" value="' + t + '"' + (S.time === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    }).join('') + '</div>';
    box.querySelectorAll('input').forEach(function (r) {
      r.addEventListener('change', function () {
        S.time = r.value; summary();
        toForm();   // on to step 4
      });
    });
  }

  function err(t) { var e = root.querySelector('#bk-err'); e.textContent = t; e.hidden = !t; if (t) e.scrollIntoView({block: 'center', behavior: 'smooth'}); }
  function submit(ev) {
    ev.preventDefault();
    if (S.busy) return;
    var f = ev.target;
    if (!S.date || !S.time) { err(T.pick); root.querySelector('#bk-times').scrollIntoView({block: 'center', behavior: 'smooth'}); return; }
    if (!f.reportValidity()) return;
    var b = {action: 'book', type: S.type, date: S.date, time: S.time, name: f.name.value, phone: f.phone.value, email: f.email.value, address: f.address.value,
      to: f.to.value, message: f.message.value, consent: f.consent.checked, hp: f.website.value, t: Date.now() - started, lang: en ? 'en' : 'de', src: source()};
    S.busy = true; var go = root.querySelector('#bk-go'); go.disabled = true; go.textContent = T.booking; err('');
    fetch(API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(b)}).then(function (r) { return r.json(); }).then(function (r) {
      S.busy = false; go.disabled = false; go.textContent = T.book;
      if (r && r.ok) { forget(); return done(r, b); }
      if (r && r.error === 'taken') { err(T.errTaken); S.time = ''; forget(); load(true); return; }
      err(r && r.error === 'email' ? T.errMail : r && r.error === 'address' ? T.errAddr : T.errGen);
    }).catch(function () { S.busy = false; go.disabled = false; go.textContent = T.book; err(T.errGen); });
  }

  function done(r, b) {
    var p = r.date.split('-'), t = r.time.split(':'), start = new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]), end = new Date(start.getTime() + r.min * 60000);
    var z = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var title = T.types[r.type][0] + ' – Stabil Umzug', where = r.type === 'visit' ? b.address : '';
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + z(start) + '/' + z(end) + '&location=' + encodeURIComponent(where) + '&details=' + encodeURIComponent(T.ref + ': ' + r.nr);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stabil Umzug//Termine//DE', 'BEGIN:VEVENT', 'UID:' + r.nr + '@stabilumzug.de', 'DTSTAMP:' + z(new Date()), 'DTSTART:' + z(start), 'DTEND:' + z(end),
      'SUMMARY:' + title, 'LOCATION:' + where.replace(/[,;]/g, '\\$&'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var icsUrl = URL.createObjectURL(new Blob([ics], {type: 'text/calendar'}));
    S.date = ''; S.time = '';
    root.innerHTML = '<div class="bk-done" tabindex="-1"><span class="bk-check" aria-hidden="true"></span><h2>' + esc(T.done) + '</h2>' +
      '<p class="bk-when">' + esc(T.types[r.type][0]) + '<b>' + esc(dLong(r.date)) + ', ' + esc(r.time) + (en ? '' : ' Uhr') + '</b></p>' +
      '<p>' + esc(T.doneText) + ' <b>' + esc(b.email) + '</b>. ' + esc(T.ref) + ': <b>' + esc(r.nr) + '</b></p>' +
      '<div class="actions"><a class="button primary" href="' + g + '" target="_blank" rel="noopener">' + esc(T.gcal) + '</a><a class="button arrow" href="' + icsUrl + '" download="termin-' + esc(r.nr) + '.ics">' + esc(T.ics) + '</a></div>' +
      '<h3>' + esc(T.next) + '</h3><ol class="bk-next">' + T.nextList[r.type].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      (phone ? '<p class="bk-muted">' + esc(T.change) + ' <a href="tel:' + esc(SITE.phone_href || phone) + '">' + esc(phone) + '</a></p>' : '') + '</div>';
    var d = root.querySelector('.bk-done'); d.focus(); d.scrollIntoView({block: 'start', behavior: 'smooth'});
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; barState(); });
  }, {passive: true});

  draw();
})();
