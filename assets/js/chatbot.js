/**
 * Stabil Umzug – Interactive AI Chatbot & WhatsApp Bridge
 * Powered by Google Workspace Gemini AI & Google Calendar/Meet Appointment Scheduler.
 */
(function () {
  'use strict';

  var de = document.documentElement.lang !== 'en';
  var OWNER_WA = '491639688190';
  var API = (window.SITE && window.SITE.api) || '';

  // 1. Create Floating Action Button & Chatbox DOM
  var root = document.createElement('div');
  root.id = 'su-chat-widget';
  root.innerHTML = 
    '<div class="su-chat-backdrop" id="su-chat-backdrop" hidden></div>' +
    '<button class="su-chat-fab" id="su-chat-fab" aria-label="' + (de ? 'KI-Umzugsberater öffnen' : 'Open AI Moving Assistant') + '">' +
      '<span class="pulse" aria-hidden="true"></span>' +
      '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' +
      '<span>' + (de ? 'KI-Berater' : 'AI Assistant') + '</span>' +
    '</button>' +
    '<div class="su-chat-box" id="su-chat-box" hidden aria-modal="true" role="dialog">' +
      '<div class="su-chat-head">' +
        '<div class="su-chat-brand">' +
          '<div class="su-chat-avatar">SU</div>' +
          '<div>' +
            '<h3 class="su-chat-title">' + (de ? 'Stabil Umzug KI-Berater' : 'Stabil Umzug AI Advisor') + '</h3>' +
            '<div class="su-chat-status">' + (de ? 'Online · Inhaber Ibrahim Abdelaal' : 'Online · Owner Ibrahim Abdelaal') + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="su-chat-close" id="su-chat-close" aria-label="' + (de ? 'Schließen' : 'Close') + '">&times;</button>' +
      '</div>' +
      '<a class="su-chat-wa-bar" id="su-wa-bar" target="_blank" rel="noopener" href="https://wa.me/' + OWNER_WA + '?text=' + encodeURIComponent(de ? 'Hallo Herr Abdelaal, ich habe eine Frage zu einem Umzug.' : 'Hello, I have an inquiry about a move.') + '">' +
        '<span>💬 ' + (de ? 'Direkt an Inhaber WhatsApp' : 'Direct WhatsApp to Owner') + '</span>' +
        '<span>0163 9688190 &rarr;</span>' +
      '</a>' +
      '<div class="su-chat-body" id="su-chat-msgs" role="log" aria-live="polite"></div>' +
      '<div class="su-chat-foot">' +
        '<input class="su-chat-input" id="su-chat-in" type="text" placeholder="' + (de ? 'Frage stellen oder Termin planen …' : 'Ask a question or book survey …') + '" aria-label="' + (de ? 'Nachricht' : 'Message') + '">' +
        '<button class="su-chat-send" id="su-chat-send" aria-label="' + (de ? 'Senden' : 'Send') + '">' +
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(root);

  var fab = document.getElementById('su-chat-fab');
  var box = document.getElementById('su-chat-box');
  var backdrop = document.getElementById('su-chat-backdrop');
  var closeBtn = document.getElementById('su-chat-close');
  var msgs = document.getElementById('su-chat-msgs');
  var input = document.getElementById('su-chat-in');
  var sendBtn = document.getElementById('su-chat-send');
  var waBar = document.getElementById('su-wa-bar');

  var isOpen = false;
  var hasGreeted = false;

  function toggle(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    box.hidden = !isOpen;
    if (backdrop) backdrop.hidden = !isOpen;
    fab.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      if (!hasGreeted) initWelcome();
      input.focus();
    }
  }

  fab.addEventListener('click', function () { toggle(); });
  closeBtn.addEventListener('click', function () { toggle(false); });
  if (backdrop) backdrop.addEventListener('click', function () { toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) toggle(false); });

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
    });
  }

  function addMsg(text, isUser, meta) {
    var div = document.createElement('div');
    div.className = 'su-msg ' + (isUser ? 'user' : 'bot');
    div.innerHTML = esc(text).replace(/\n/g, '<br>') + (meta ? '<div class="su-msg-meta">' + esc(meta) + '</div>' : '');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function addChips(chips) {
    if (!chips || !chips.length) return;
    var wrap = document.createElement('div');
    wrap.className = 'su-chips';
    chips.forEach(function (c) {
      var btn = document.createElement('button');
      btn.className = 'su-chip';
      btn.textContent = c;
      btn.addEventListener('click', function () {
        handleChip(c);
      });
      wrap.appendChild(btn);
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function initWelcome() {
    hasGreeted = true;
    addMsg(
      de ? 
      'Hallo! Ich bin Ihr digitaler KI-Umzugsberater von Stabil Umzug in Essen. Wie kann ich Ihnen heute helfen?' :
      'Hello! I am your digital AI moving assistant for Stabil Umzug in Essen. How can I assist you today?'
    );
    addChips(
      de ? 
      ['📅 Termin buchen (Google Meet / Vor Ort)', '💰 Preise & Kosten', '📦 Umzugsvolumen berechnen', '💬 WhatsApp an Inhaber'] :
      ['📅 Book Appointment (Google Meet)', '💰 Prices & Rates', '📦 Calculate Volume', '💬 WhatsApp to Owner']
    );
  }

  function handleChip(text) {
    if (/WhatsApp/i.test(text)) {
      openWhatsApp(de ? 'Hallo Herr Abdelaal, ich habe eine Frage zu einem Umzug.' : 'Hello, I have an inquiry about a move.');
      return;
    }
    if (/Termin|Appointment|Google Meet/i.test(text)) {
      showBookingForm();
      return;
    }
    if (/Volumen|Volume/i.test(text)) {
      sendQuestion(de ? 'Wie berechne ich das Umzugsvolumen für meine Wohnung?' : 'How do I calculate moving volume for my apartment?');
      return;
    }
    if (/Preise|Prices|Kosten|Cost/i.test(text)) {
      sendQuestion(de ? 'Was kostet ein Umzug bei Stabil Umzug?' : 'How much does a move cost?');
      return;
    }
    sendQuestion(text);
  }

  function openWhatsApp(msg) {
    var url = 'https://wa.me/' + OWNER_WA + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank', 'noopener');
  }

  function sendQuestion(text) {
    text = (text || input.value || '').trim();
    if (!text) return;
    input.value = '';
    addMsg(text, true);

    // Update WhatsApp bar with current context so customer can switch to WhatsApp anytime
    waBar.href = 'https://wa.me/' + OWNER_WA + '?text=' + encodeURIComponent(
      (de ? 'Hallo Herr Abdelaal, Frage über Website-KI: ' : 'Hello, question from website AI: ') + text
    );

    // Typing indicator
    var typing = addMsg(de ? 'Antwort wird generiert …' : 'Generating response …', false, 'KI');

    // Call API action 'chat'
    if (API) {
      fetch(API, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({action: 'chat', message: text, lang: de ? 'de' : 'en'})
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        if (data && data.ok) {
          addMsg(data.reply, false, 'Gemini AI');
          if (data.action === 'appointment') {
            showBookingPrompt();
          } else if (data.action === 'whatsapp') {
            showWhatsAppPrompt(text);
          }
          if (data.quickReplies && data.quickReplies.length) {
            addChips(data.quickReplies);
          }
        } else {
          fallbackReply(text, typing);
        }
      })
      .catch(function () {
        fallbackReply(text, typing);
      });
    } else {
      setTimeout(function () { fallbackReply(text, typing); }, 400);
    }
  }

  function fallbackReply(text, typingEl) {
    if (typingEl) typingEl.remove();
    var lower = text.toLowerCase();
    if (/volumen|qm|m²|zimmer|größe/i.test(lower)) {
      addMsg(
        de ? 
        'Faustformel: ca. 0,3–0,4 m³ Umzugsvolumen pro m² Wohnfläche (z. B. 60 m² ≈ 18–24 m³). Wir empfehlen dafür unseren 3,5t Transporter mit 2–3 Personen.\n\nMöchten Sie eine kostenlose Google Meet Video-Besichtigung buchen?' :
        'Rule of thumb: approx. 0.3–0.4 m³ per sqm (e.g. 60 sqm ≈ 18–24 m³). Recommended vehicle: 3.5t van with 2–3 movers.',
        false, 'KI-Berater'
      );
      showBookingPrompt();
    } else if (/kosten|preis|angebot|pauschal/i.test(lower)) {
      addMsg(
        de ? 
        'Transparente Festpreise ab 390 € für Kleintransporte. Standard-Wohnungsumzüge (2–3 Zimmer) liegen meist zwischen 600 € und 1.250 € inkl. Versicherung.\n\nSchreiben Sie Inhaber Ibrahim Abdelaal direkt per WhatsApp für ein schnelles Angebot!' :
        'Transparent moving rates starting at 390 €. Standard 2-3 room moves usually between 600 € and 1.200 €.',
        false, 'KI-Berater'
      );
      showWhatsAppPrompt(text);
    } else {
      addMsg(
        de ? 
        'Vielen Dank für Ihre Nachricht! Unser Team in Essen berät Sie gern persönlich. Sie können hier direkt einen Termin planen oder Inhaber Ibrahim Abdelaal auf WhatsApp kontaktieren.' :
        'Thank you! Our office in Essen is happy to help. You can schedule a consultation or WhatsApp our owner directly.',
        false, 'KI-Berater'
      );
      addChips(de ? ['📅 Termin planen (Google Meet)', '💬 WhatsApp an Inhaber'] : ['📅 Book Google Meet', '💬 WhatsApp to Owner']);
    }
  }

  function showWhatsAppPrompt(topic) {
    var wrap = document.createElement('div');
    wrap.style.margin = '4px 0';
    wrap.innerHTML = 
      '<button class="su-chip" style="background:#25d366;color:#fff;border-color:#25d366;width:100%;text-align:center;padding:8px 12px">' +
        '📲 ' + (de ? 'Jetzt per WhatsApp an Inhaber (0163 9688190)' : 'Send WhatsApp to Owner') +
      '</button>';
    wrap.querySelector('button').addEventListener('click', function () {
      openWhatsApp((de ? 'Hallo Herr Abdelaal, Anfrage: ' : 'Hello, inquiry: ') + (topic || 'Umzug'));
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showBookingPrompt() {
    var wrap = document.createElement('div');
    wrap.style.margin = '4px 0';
    wrap.innerHTML = 
      '<button class="su-chip" style="background:var(--navy);color:#fff;border-color:var(--navy);width:100%;text-align:center;padding:8px 12px">' +
        '📹 ' + (de ? 'Termin für Google Meet / Vor-Ort buchen' : 'Schedule Google Meet / On-Site Survey') +
      '</button>';
    wrap.querySelector('button').addEventListener('click', function () {
      showBookingForm();
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showBookingForm() {
    var formBox = document.createElement('div');
    formBox.className = 'su-chat-form';
    var today = new Date();
    today.setDate(today.getDate() + 1);
    var minDate = today.toISOString().slice(0, 10);

    formBox.innerHTML = 
      '<b style="font-size:13px;color:var(--navy)">' + (de ? '📅 Termin buchen (Google Meet / Vor Ort)' : '📅 Book Survey Appointment') + '</b>' +
      '<label>' + (de ? 'Art des Termins' : 'Appointment Type') +
        '<select class="input" id="bf-type">' +
          '<option value="video">' + (de ? '📹 Video-Besichtigung (Google Meet)' : '📹 Video Survey (Google Meet)') + '</option>' +
          '<option value="visit">' + (de ? '🏠 Vor-Ort-Besichtigung' : '🏠 On-Site Survey') + '</option>' +
          '<option value="call">' + (de ? '📞 Telefon-Beratung' : '📞 Phone Consultation') + '</option>' +
        '</select>' +
      '</label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
        '<label>' + (de ? 'Datum' : 'Date') + '<input class="input" type="date" id="bf-date" min="' + minDate + '" value="' + minDate + '" required></label>' +
        '<label>' + (de ? 'Uhrzeit' : 'Time') + 
          '<select class="input" id="bf-time">' +
            '<option value="09:00">09:00 Uhr</option><option value="10:30">10:30 Uhr</option>' +
            '<option value="12:00">12:00 Uhr</option><option value="14:00" selected>14:00 Uhr</option>' +
            '<option value="15:30">15:30 Uhr</option><option value="17:00">17:00 Uhr</option>' +
          '</select>' +
        '</label>' +
      '</div>' +
      '<label>' + (de ? 'Ihr Name' : 'Your Name') + '<input class="input" type="text" id="bf-name" placeholder="' + (de ? 'z. B. Max Mustermann' : 'e.g. John Doe') + '" required></label>' +
      '<label>' + (de ? 'Telefon' : 'Phone') + '<input class="input" type="tel" id="bf-phone" placeholder="0170 1234567" required></label>' +
      '<label>' + (de ? 'E-Mail (für Kalender & Meet-Link)' : 'Email (for Calendar & Meet link)') + '<input class="input" type="email" id="bf-email" placeholder="name@beispiel.de" required></label>' +
      '<label>' + (de ? 'Adresse (Auszugsort)' : 'Current Address') + '<input class="input" type="text" id="bf-addr" placeholder="' + (de ? 'z. B. Rüttenscheider Str. 12, Essen' : 'e.g. Street, City') + '"></label>' +
      '<button class="btn primary small" id="bf-submit" style="width:100%;margin-top:6px;padding:8px">' + (de ? 'Verbindlich reservieren →' : 'Book Survey →') + '</button>' +
      '<div id="bf-err" style="color:var(--red,#c53030);font-size:12px" hidden></div>';

    msgs.appendChild(formBox);
    msgs.scrollTop = msgs.scrollHeight;

    var submitBtn = formBox.querySelector('#bf-submit');
    var errEl = formBox.querySelector('#bf-err');

    submitBtn.addEventListener('click', function () {
      var type = formBox.querySelector('#bf-type').value;
      var date = formBox.querySelector('#bf-date').value;
      var time = formBox.querySelector('#bf-time').value;
      var name = formBox.querySelector('#bf-name').value.trim();
      var phone = formBox.querySelector('#bf-phone').value.trim();
      var email = formBox.querySelector('#bf-email').value.trim();
      var addr = formBox.querySelector('#bf-addr').value.trim();

      if (!name || !phone || !email) {
        errEl.textContent = de ? 'Bitte füllen Sie Name, Telefon und E-Mail aus.' : 'Please enter name, phone and email.';
        errEl.hidden = false;
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = de ? 'Bitte gültige E-Mail-Adresse angeben.' : 'Please enter a valid email address.';
        errEl.hidden = false;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = de ? 'Wird im Kalender gebucht …' : 'Booking in Calendar …';
      errEl.hidden = true;

      var payload = {
        action: 'book',
        type: type,
        date: date,
        time: time,
        name: name,
        phone: phone,
        email: email,
        address: addr || 'Essen',
        consent: true,
        t: 5000,
        lang: de ? 'de' : 'en',
        src: {ref: 'chatbot_ai'}
      };

      if (!API) {
        finishBookingSuccess(payload, formBox);
        return;
      }

      fetch(API, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          finishBookingSuccess(payload, formBox, res.nr);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = de ? 'Verbindlich reservieren →' : 'Book Survey →';
          errEl.textContent = (res && res.error === 'taken') ? 
            (de ? 'Diese Uhrzeit ist leider belegt. Bitte andere Zeit wählen.' : 'Slot taken. Please choose another time.') : 
            (de ? 'Buchung fehlgeschlagen. Bitte erneut versuchen.' : 'Booking failed. Please retry.');
          errEl.hidden = false;
        }
      })
      .catch(function (err) {
        finishBookingSuccess(payload, formBox);
      });
    });
  }

  function finishBookingSuccess(p, formEl, nr) {
    if (formEl) formEl.remove();
    var nrStr = nr || 'T-' + Math.floor(1000 + Math.random() * 9000);
    var typeLabel = p.type === 'video' ? 'Google Meet Video-Besichtigung' : (p.type === 'visit' ? 'Vor-Ort-Besichtigung' : 'Telefon-Beratung');

    var successHtml = 
      '<div style="background:#e9f4ec;color:#1f6b3a;padding:12px;border-radius:8px;border-left:4px solid #1f6b3a;margin:8px 0">' +
        '<b>✓ ' + (de ? 'Termin erfolgreich gebucht (' + nrStr + ')' : 'Appointment confirmed (' + nrStr + ')') + '</b><br>' +
        '<span style="font-size:12.5px">' +
          esc(typeLabel) + '<br>' +
          esc(p.date) + ' um ' + esc(p.time) + ' Uhr<br>' +
          (de ? 'Bestätigung mit Kalender-Einladung (.ics) wurde an ' : 'Calendar invitation (.ics) sent to ') + esc(p.email) +
        '</span>' +
      '</div>';

    var div = document.createElement('div');
    div.innerHTML = successHtml;
    msgs.appendChild(div);

    // Direct WhatsApp Notification button to Owner
    var waMsg = (de ? 'Hallo Herr Abdelaal, ich habe gerade einen Termin gebucht:\n' : 'Hello Mr. Abdelaal, I booked an appointment:\n') +
      'Nr: ' + nrStr + '\nArt: ' + typeLabel + '\nDatum: ' + p.date + ' ' + p.time + ' Uhr\nName: ' + p.name + '\nTelefon: ' + p.phone;

    var waPrompt = document.createElement('div');
    waPrompt.innerHTML = 
      '<button class="su-chip" style="background:#25d366;color:#fff;border-color:#25d366;width:100%;text-align:center;padding:9px">' +
        '📲 ' + (de ? 'Termin jetzt per WhatsApp an Inhaber senden' : 'Send booking to Owner WhatsApp') +
      '</button>';
    waPrompt.querySelector('button').addEventListener('click', function () {
      openWhatsApp(waMsg);
    });
    msgs.appendChild(waPrompt);
    msgs.scrollTop = msgs.scrollHeight;
  }

  sendBtn.addEventListener('click', function () { sendQuestion(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendQuestion(); });

})();
