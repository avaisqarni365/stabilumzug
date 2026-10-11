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
    book: 'Book appointment', booking: 'Booking …', pick: 'Choose a day and a time first.', loading: 'Loading free times …', noTimes: 'No free times on this day.',
    errLoad: 'The free times could not be loaded. Please call us or write on WhatsApp.', errTaken: 'This time has just been booked by someone else. Please choose another one.',
    errMail: 'Please check your email address.', errAddr: 'Please enter the address for the viewing.', errGen: 'That did not work. Please try again or call us.',
    done: 'Your appointment is booked.', doneText: 'We have sent the confirmation and a calendar file to', add: 'Add to calendar', gcal: 'Google Calendar', ics: 'Calendar file (.ics)',
    next: 'What happens next', nextList: {visit: ['We arrive on time – the address is in your confirmation.', 'We look at all rooms, the cellar and access.', 'You get your fixed quote within 24 hours.'],
      video: ['We call you by WhatsApp video on your number.', 'Walk us through the rooms with your phone.', 'You get your quote within 24 hours.'],
      call: ['We call you at the booked time.', 'We answer your questions and note your wishes.', 'If you like, we send you a quote right after.']},
    change: 'Need to change? Reply to the confirmation email or call', ref: 'Reference', sel: 'Your appointment', when: 'Day and time'
  } : {
    s1: 'Welche Art von Termin?', s2: 'Tag wählen', s3: 'Uhrzeit wählen', s4: 'Ihre Angaben', min: 'Min.', free: 'frei', full: 'voll', none: 'geschlossen',
    types: {visit: ['Besichtigung vor Ort', 'Wir kommen zu Ihnen, sehen uns alles an und schicken ein verbindliches Angebot. Kostenlos.'], video: ['Video-Besichtigung', 'Zeigen Sie uns Ihre Räume per WhatsApp-Video. Kostenlos, von überall.'], call: ['Rückruf und Beratung', 'Wir rufen Sie an und beantworten Ihre Fragen rund um den Umzug.']},
    name: 'Name', phone: 'Telefon (auch für WhatsApp)', email: 'E-Mail (für die Bestätigung)', addrVisit: 'Adresse der Besichtigung', addr: 'Wo wohnen Sie? (optional)', to: 'Umzug nach (optional)', msg: 'Was sollten wir wissen? (optional)',
    consent: 'Ich bin einverstanden, dass Stabil Umzug meine Angaben speichert, um diesen Termin zu vereinbaren, und mich dazu kontaktiert. Ich kann das jederzeit widerrufen.', privacy: 'Datenschutzerklärung',
    book: 'Termin verbindlich buchen', booking: 'Wird gebucht …', pick: 'Bitte zuerst Tag und Uhrzeit wählen.', loading: 'Freie Zeiten werden geladen …', noTimes: 'An diesem Tag ist nichts mehr frei.',
    errLoad: 'Die freien Zeiten konnten nicht geladen werden. Bitte rufen Sie uns an oder schreiben Sie per WhatsApp.', errTaken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere.',
    errMail: 'Bitte prüfen Sie Ihre E-Mail-Adresse.', errAddr: 'Bitte die Adresse für die Besichtigung eingeben.', errGen: 'Das hat nicht geklappt. Bitte noch einmal versuchen oder anrufen.',
    done: 'Ihr Termin ist gebucht.', doneText: 'Die Bestätigung mit Kalenderdatei haben wir geschickt an', add: 'Zum Kalender hinzufügen', gcal: 'Google Kalender', ics: 'Kalenderdatei (.ics)',
    next: 'So geht es weiter', nextList: {visit: ['Wir kommen pünktlich – die Adresse steht in Ihrer Bestätigung.', 'Wir sehen uns alle Räume, Keller und Zugang an.', 'Sie bekommen Ihr verbindliches Angebot innerhalb von 24 Stunden.'],
      video: ['Wir rufen Sie per WhatsApp-Video unter Ihrer Nummer an.', 'Sie zeigen uns die Räume mit dem Handy.', 'Sie bekommen Ihr Angebot innerhalb von 24 Stunden.'],
      call: ['Wir rufen Sie zur gebuchten Zeit an.', 'Wir beantworten Ihre Fragen und notieren Ihre Wünsche.', 'Auf Wunsch schicken wir Ihnen gleich danach ein Angebot.']},
    change: 'Etwas ändern? Antworten Sie auf die Bestätigung oder rufen Sie an:', ref: 'Terminnummer', sel: 'Ihr Termin', when: 'Tag und Uhrzeit'
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

  function draw() {
    var types = Object.keys(T.types).map(function (k) {
      var mins = k === 'visit' ? 60 : 30;
      return '<label class="bk-type"><input type="radio" name="bk-type" value="' + k + '"' + (S.type === k ? ' checked' : '') + '><span><span class="bk-ico bk-' + k + '" aria-hidden="true"></span><b>' + esc(T.types[k][0]) + '</b><small>' + mins + ' ' + T.min + ' · ' + esc(T.types[k][1]) + '</small></span></label>';
    }).join('');
    root.innerHTML = '<div class="bk"><div class="bk-main">' +
      '<section class="bk-step"><h2><span class="no">1</span>' + esc(T.s1) + '</h2><div class="bk-types" role="radiogroup">' + types + '</div></section>' +
      '<section class="bk-step"><h2><span class="no">2</span>' + esc(T.s2) + '</h2><div class="bk-days" id="bk-days" role="radiogroup"><p class="bk-msg">' + esc(T.loading) + '</p></div></section>' +
      '<section class="bk-step"><h2><span class="no">3</span>' + esc(T.s3) + '</h2><div class="bk-times" id="bk-times" role="radiogroup"><p class="bk-muted">' + esc(T.pick) + '</p></div></section>' +
      '<section class="bk-step"><h2><span class="no">4</span>' + esc(T.s4) + '</h2><form id="bk-form" class="bk-form" novalidate>' +
        '<label class="field"><span>' + esc(T.name) + ' *</span><input class="input" name="name" required autocomplete="name"></label>' +
        '<label class="field"><span>' + esc(T.phone) + ' *</span><input class="input" name="phone" type="tel" required autocomplete="tel"></label>' +
        '<label class="field bk-wide"><span>' + esc(T.email) + ' *</span><input class="input" name="email" type="email" required autocomplete="email"></label>' +
        '<label class="field bk-wide"><span id="bk-addr-l">' + esc(T.addrVisit) + ' *</span><input class="input" name="address" autocomplete="street-address"></label>' +
        '<label class="field bk-wide"><span>' + esc(T.to) + '</span><input class="input" name="to"></label>' +
        '<label class="field bk-wide"><span>' + esc(T.msg) + '</span><textarea class="input" name="message" rows="3"></textarea></label>' +
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<label class="bk-consent bk-wide"><input type="checkbox" name="consent" required><span>' + esc(T.consent) + ' <a href="' + esc(privacy) + '">' + esc(T.privacy) + '</a></span></label>' +
        '<p class="bk-msg bk-wide" id="bk-err" hidden role="alert"></p>' +
        '<button class="button primary bk-wide" type="submit" id="bk-go">' + esc(T.book) + '</button></form></section></div>' +
      '<aside class="bk-side"><div class="bk-card"><span class="kicker red">' + esc(T.sel) + '</span><div id="bk-sum"></div></div></aside></div>';
    root.querySelectorAll('input[name="bk-type"]').forEach(function (r) { r.addEventListener('change', function () { S.type = r.value; S.date = ''; S.time = ''; load(); }); });
    root.querySelector('#bk-form').addEventListener('submit', submit);
    load();
  }

  function summary() {
    var el = root.querySelector('#bk-sum'); if (!el) return;
    var addr = root.querySelector('#bk-addr-l'), visit = S.type === 'visit';
    if (addr) { addr.textContent = visit ? T.addrVisit + ' *' : T.addr; root.querySelector('input[name="address"]').required = visit; }
    el.innerHTML = '<p class="bk-sum-t">' + esc(T.types[S.type][0]) + '</p><p class="bk-sum-w">' + (S.date ? esc(dLong(S.date)) + (S.time ? '<b>' + esc(S.time) + (en ? '' : ' Uhr') + '</b>' : '') : '<span class="bk-muted">' + esc(T.pick) + '</span>') + '</p>' +
      (phone ? '<p class="bk-muted">' + esc(T.change) + ' <a href="tel:' + esc(SITE.phone_href || phone) + '">' + esc(phone) + '</a></p>' : '');
  }

  function load() {
    var box = root.querySelector('#bk-days');
    box.innerHTML = '<p class="bk-msg">' + esc(T.loading) + '</p>';
    root.querySelector('#bk-times').innerHTML = '<p class="bk-muted">' + esc(T.pick) + '</p>';
    summary();
    fetch(API + '?action=slots&type=' + encodeURIComponent(S.type)).then(function (r) { return r.json(); }).then(function (r) {
      if (!r || !r.ok) throw new Error('slots');
      S.days = r.days; days();
    }).catch(function () { box.innerHTML = '<p class="bk-msg">' + esc(T.errLoad) + '</p>'; });
  }
  function days() {
    var box = root.querySelector('#bk-days');
    if (!S.date) { var first = S.days.filter(function (d) { return d.slots.length; })[0]; S.date = first ? first.date : ''; }
    box.innerHTML = S.days.map(function (d) {
      var dt = new Date(d.date + 'T12:00:00'), n = d.slots.length;
      return '<label class="bk-day' + (n ? '' : ' off') + '"><input type="radio" name="bk-day" value="' + d.date + '"' + (S.date === d.date ? ' checked' : '') + (n ? '' : ' disabled') + '>' +
        '<span><small>' + WD[dt.getDay()] + '</small><b>' + d.date.slice(8, 10) + '.' + d.date.slice(5, 7) + '.</b><em>' + (n ? n + ' ' + T.free : (dt.getDay() === 0 ? T.none : T.full)) + '</em></span></label>';
    }).join('');
    box.querySelectorAll('input').forEach(function (r) { r.addEventListener('change', function () { S.date = r.value; S.time = ''; times(); summary(); }); });
    var sel = box.querySelector('input:checked'); if (sel) sel.closest('label').scrollIntoView({block: 'nearest', inline: 'center'});
    times(); summary();
  }
  function times() {
    var box = root.querySelector('#bk-times'), d = S.days && S.days.filter(function (x) { return x.date === S.date; })[0];
    if (!d) { box.innerHTML = '<p class="bk-muted">' + esc(T.pick) + '</p>'; return; }
    if (!d.slots.length) { box.innerHTML = '<p class="bk-muted">' + esc(T.noTimes) + '</p>'; return; }
    box.innerHTML = '<p class="bk-day-l">' + esc(dLong(d.date)) + '</p>' + d.slots.map(function (t) {
      return '<label class="bk-time"><input type="radio" name="bk-time" value="' + t + '"' + (S.time === t ? ' checked' : '') + '><span>' + t + '</span></label>';
    }).join('');
    box.querySelectorAll('input').forEach(function (r) { r.addEventListener('change', function () { S.time = r.value; summary(); }); });
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
      if (r && r.ok) return done(r, b);
      if (r && r.error === 'taken') { err(T.errTaken); S.time = ''; load(); return; }
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
    root.innerHTML = '<div class="bk-done" tabindex="-1"><span class="bk-check" aria-hidden="true"></span><h2>' + esc(T.done) + '</h2>' +
      '<p class="bk-when">' + esc(T.types[r.type][0]) + '<b>' + esc(dLong(r.date)) + ', ' + esc(r.time) + (en ? '' : ' Uhr') + '</b></p>' +
      '<p>' + esc(T.doneText) + ' <b>' + esc(b.email) + '</b>. ' + esc(T.ref) + ': <b>' + esc(r.nr) + '</b></p>' +
      '<div class="actions"><a class="button primary" href="' + g + '" target="_blank" rel="noopener">' + esc(T.gcal) + '</a><a class="button arrow" href="' + icsUrl + '" download="termin-' + esc(r.nr) + '.ics">' + esc(T.ics) + '</a></div>' +
      '<h3>' + esc(T.next) + '</h3><ol class="bk-next">' + T.nextList[r.type].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      (phone ? '<p class="bk-muted">' + esc(T.change) + ' <a href="tel:' + esc(SITE.phone_href || phone) + '">' + esc(phone) + '</a></p>' : '') + '</div>';
    var d = root.querySelector('.bk-done'); d.focus(); d.scrollIntoView({block: 'start', behavior: 'smooth'});
  }

  draw();
})();
