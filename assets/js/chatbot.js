/**
 * Stabil Umzug – Interactive AI Chatbot & WhatsApp Bridge
 * Answers from the website backend (Gemini when configured) or built-in replies; booking hands over to the booking page.
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
            '<div class="su-chat-status">' + (de ? 'Automatischer Assistent · Antworten ohne Gewähr' : 'Automated assistant · answers without guarantee') + '</div>' +
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
          addMsg(data.reply, false, de ? 'Assistent (KI)' : 'Assistant (AI)');
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
        false, de ? 'Automatische Antwort' : 'Automatic reply'
      );
      showBookingPrompt();
    } else if (/kosten|preis|angebot|pauschal/i.test(lower)) {
      addMsg(
        de ? 
        'Der Preis hängt von Volumen, Etagen, Zugang und Strecke ab. Im Umzugsplaner sehen Sie in etwa 10 Minuten Volumen, Fahrzeug und Team; Ihr persönliches Angebot bekommen Sie innerhalb von 24 Stunden. Oder schreiben Sie uns kurz per WhatsApp.' :
        'The price depends on volume, floors, access and distance. In the moving planner you see volume, vehicle and crew in about 10 minutes; your personal quote follows within 24 hours.',
        false, de ? 'Automatische Antwort' : 'Automatic reply'
      );
      showWhatsAppPrompt(text);
    } else {
      addMsg(
        de ? 
        'Vielen Dank für Ihre Nachricht! Unser Team in Essen berät Sie gern persönlich. Sie können hier direkt einen Termin planen oder Inhaber Ibrahim Abdelaal auf WhatsApp kontaktieren.' :
        'Thank you! Our office in Essen is happy to help. You can schedule a consultation or WhatsApp our owner directly.',
        false, de ? 'Automatische Antwort' : 'Automatic reply'
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

  /* Booking happens on the booking page: real free times, consent checkbox, confirmation by e-mail. */
  function showBookingForm() {
    var page = de ? '/termin/' : '/en/appointment/';
    var opts = [['video', de ? '📹 Video-Besichtigung' : '📹 Video viewing'], ['visit', de ? '🏠 Besichtigung vor Ort' : '🏠 On-site viewing'],
      ['call', de ? '📞 Rückruf und Beratung' : '📞 Call-back and advice']];
    var box = document.createElement('div');
    box.className = 'su-chat-form';
    box.innerHTML = '<b style="font-size:13px;color:var(--navy)">' + (de ? 'Termin wählen – freie Zeiten sehen Sie auf der nächsten Seite' : 'Choose the type – free times are shown on the next page') + '</b>' +
      opts.map(function (o) { return '<a class="su-chip" style="display:block;text-align:center;padding:9px;margin-top:6px;text-decoration:none" href="' + page + '?art=' + o[0] + '">' + esc(o[1]) + ' →</a>'; }).join('');
    msgs.appendChild(box);
    msgs.scrollTop = msgs.scrollHeight;
  }

  sendBtn.addEventListener('click', function () { sendQuestion(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendQuestion(); });

})();
