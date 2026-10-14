"""Page bodies part 2: Essen, about, legal pages, 404. Guides live in guides.py."""
from config import SITE
from lib import esc, t, link, crumbs, ph, is_ph, url_of, prefix_for
from pages import page_head, cta

def sec(inner, cls=""):
    return '<section class="section%s"><div class="container narrow prose">%s</div></section>' % (cls, inner)

def lis(items):
    return "<ul>%s</ul>" % "".join("<li>%s</li>" % i for i in items)

NOTE_DE = '<p class="note">Allgemeine Orientierung, keine Rechts- oder Behördenauskunft. Fristen und Regeln können sich ändern; prüfen Sie sie bei der zuständigen Stelle.</p>'
NOTE_EN = '<p class="note">General guidance, not legal or official advice. Rules and deadlines can change; check with the responsible authority.</p>'

PLACES = ["Essen", "Mülheim an der Ruhr", "Oberhausen", "Bottrop", "Gelsenkirchen", "Bochum", "Duisburg", "Dortmund", "Velbert", "Hattingen", "Düsseldorf", "Ganz Deutschland"]

def essen(lang):
    import guides
    key = "essen"
    title = t("Umzug in Essen", "Moving in Essen", lang)
    body = page_head(key, lang, title, t("Wir sitzen in Essen – Karlstraße 32 – und ziehen im ganzen Ruhrgebiet und deutschlandweit um.",
                                         "We are based in Essen – Karlstraße 32 – and move people across the Ruhr area and all of Germany.", lang), title,
                     kicker=t("Stabil Umzug · Essen", "Stabil Umzug · Essen", lang), photo="essen-zollverein.jpg",
                     alt=t("Förderturm der Zeche Zollverein in Essen", "Zollverein colliery headframe in Essen", lang))
    tips = [
        (t("Frühzeitig eine Halteverbotszone beantragen – besonders in dicht bebauten Straßen.", "Apply early for a no-parking zone – especially in dense streets.", lang), "parking"),
        (t("Enge Treppenhäuser im Altbau im Planer angeben, damit das Team passend plant.", "State narrow stairwells in old buildings in the planner so the crew plans accordingly.", lang), "access"),
        (t("Sperrmüll rechtzeitig bei der Stadt anmelden, bevor die alte Wohnung leer sein muss.", "Book the city's bulky-waste pickup before the old flat must be empty.", lang), "waste"),
        (t("Nach dem Einzug innerhalb von zwei Wochen beim Bürgeramt anmelden.", "Register at the citizens' office within two weeks of moving in.", lang), "register"),
    ]
    tips_html = "".join('<li>%s <a class="link-arrow" href="%s">%s</a></li>' % (esc(a), link(key, k, lang), t("mehr", "more", lang)) for a, k in tips)
    places = "".join("<li>%s</li>" % esc(p if p != "Ganz Deutschland" else t("Ganz Deutschland", "All of Germany", lang)) for p in PLACES)
    body += ('<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span>'
             '<h2>%s</h2></div></div><div class="split"><div><p class="lead-text" style="margin-top:0">%s</p><ul class="checks">%s</ul></div>'
             '<div><span class="kicker">%s</span><ul class="places">%s</ul></div></div></div></section>') % (
        t("Altbau, Hochhaus, Haus", "Old building, tower block, house", lang),
        t("Der Zugang entscheidet über Zeit und Team.", "Access decides time and crew.", lang),
        esc(t("Ob Altbau in Rüttenscheid, Hochhaus im Norden oder Haus im Süden: Wir fragen nach Etage, Aufzug, Treppenhaus und Parkmöglichkeit – an beiden Adressen.",
              "Whether an old building in Rüttenscheid, a tower block in the north or a house in the south: we ask about floor, lift, stairwell and parking – at both addresses.", lang)),
        tips_html, t("Von Essen aus", "From Essen to", lang), places)
    body += ('<section class="section alt"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>%s</div></section>'
             % (t("Ihr Umzug in 10 Schritten", "Your move in 10 steps", lang), t("Schritt für Schritt erklärt.", "Explained step by step.", lang),
                t("Vom Ausmessen der neuen Wohnung bis zur Anmeldung.", "From measuring the new home to registering.", lang), guides.journey_html(key, lang, teasers=False)))
    body += cta(key, lang)
    return dict(key=key, lang=lang, title=t("Umzug in Essen und im Ruhrgebiet | Stabil Umzug", "Moving in Essen and the Ruhr area | Stabil Umzug", lang),
                desc=t("Umzugsunternehmen in Essen, Karlstraße 32: Umzüge im Ruhrgebiet und deutschlandweit, Halteverbotszone, Montage, Entsorgung. Angebot in 24 Std.",
                       "Moving company in Essen, Karlstraße 32: moves across the Ruhr area and Germany, no-parking zones, assembly, disposal. Quote within 24 h.", lang), body=body)

PRINCIPLES = [
    (("Eine Schätzung ist eine gültige Antwort.", "A guess is a valid answer."),
     ("Sie kennen nicht jedes Maß? Kein Problem. „Weiß ich nicht“ ist überall erlaubt – wir setzen einen Planungswert ein und markieren ihn als geschätzt.",
      "You do not know every measurement? No problem. “I don't know” is allowed everywhere – we use a planning value and mark it as a guess.")),
    (("Spannen statt falscher Genauigkeit.", "Ranges, not false precision."),
     ("Volumen und Aufwand zeigen wir als Spanne. Je mehr Sie bestätigen, desto enger wird sie – und desto eher ist ein Festpreis möglich.",
      "We show volume and effort as a range. The more you confirm, the narrower it gets – and the sooner a fixed price is possible.")),
    (("Einmal erfassen, überall nutzen.", "Enter once, reuse everywhere."),
     ("Ihre Angaben fließen in Angebot, Teamplanung, Halteverbotszone und Checkliste. Niemand fragt Sie zweimal.",
      "Your details flow into the quote, crew planning, no-parking zone and checklist. Nobody asks you twice.")),
    (("Transparenter Preis.", "Transparent price."),
     ("Ihr Angebot nennt Arbeit, Fahrzeug, Strecke, Montage, Verpackung, Zugang und Extras als eigene Positionen.",
      "Your quote lists labour, vehicle, distance, assembly, packing, access and extras as separate lines.")),
    (("Einfache Sprache, kein Druck.", "Plain language, no pressure."),
     ("Kurze Texte auf Deutsch und Englisch. Begriffe wie Halteverbotszone erklären wir dort, wo sie vorkommen. Die Stornobedingungen finden Sie vor der Buchung.",
      "Short texts in German and English. Terms like Halteverbotszone are explained where they appear. You find the cancellation terms before you book.")),
    (("Erst messen, dann versprechen.", "Measure first, then promise."),
     ("Nach jedem Umzug vergleichen wir Angebot und tatsächlichen Aufwand – und korrigieren unsere Planungswerte, wo sie danebenlagen.",
      "After every move we compare the quote with the actual effort – and correct our planning values where they were off.")),
]

def about(lang):
    key = "about"
    title = t("Über uns", "About us", lang)
    body = page_head(key, lang, title, t("Ein Umzugsunternehmen aus Essen, das Planung einfach und Preise nachvollziehbar machen will.",
                                         "A moving company from Essen that wants to make planning simple and prices traceable.", lang), title,
                     kicker=t("Stabil Umzug · Essen", "Stabil Umzug · Essen", lang), photo="sofa-assembly.jpg",
                     alt=t("Team von Stabil Umzug baut ein Sofa im Wohnzimmer auf", "Stabil Umzug crew assembling a sofa in the living room", lang))
    intro = t("Ein Umzug ist eine Kette von Schritten: neue Wohnung ausmessen, Hausrat erfassen, Zugang klären, Halteverbot, Kartons, Aufbau, Anmeldung. "
              "Das meiste Geld und der meiste Stress gehen verloren, wenn Angaben von einem Schritt nicht beim nächsten ankommen. Deshalb haben wir diesen Ablauf in einen einfachen Planer übersetzt.",
              "A move is a chain of steps: measure the new home, list your belongings, clarify access, parking permit, boxes, assembly, registration. "
              "Most money and stress are lost when information from one step does not reach the next. So we turned this flow into a simple planner.", lang)
    # phones: the six titles first, each text one tap away
    cells = "".join('<div><details class="pr" data-fold open><summary><h3>%s</h3></summary><p>%s</p></details></div>' % (esc(t(*a, lang)), esc(t(*b, lang))) for a, b in PRINCIPLES)
    body += ('<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>'
             '<div class="costs two">%s</div></div></section>' % (t("Wie wir arbeiten", "How we work", lang), t("Sechs Versprechen.", "Six promises.", lang), esc(intro), cells))
    look = [("uniform.jpg", ("Arbeitskleidung in Orange und Navy", "Workwear in orange and navy"),
             ("Polo, Softshelljacke und Arbeitshose mit Logo – Sie erkennen unser Team sofort an der Tür.", "Polo shirt, softshell jacket and work trousers with our logo – you recognise our crew at the door.")),
            ("caps.jpg", ("Ein Logo, zwei Farben", "One logo, two colours"),
             ("Vom Karton bis zur Kappe: Alles, was zu Ihnen kommt, trägt dasselbe Zeichen.", "From the box to the cap: everything that comes to you carries the same mark."))]
    figs = "".join('<figure class="look"><div class="look-img"><img src="%sassets/img/photos/%s" alt="%s" loading="lazy" width="1536" height="1024"></div><figcaption><b>%s</b>%s</figcaption></figure>' % (
        prefix_for(key, lang), f, esc(t(*h, lang)), esc(t(*h, lang)), esc(t(*d, lang))) for f, h, d in look)
    body += ('<section class="section alt"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div></div>'
             '<div class="looks">%s</div></div></section>') % (t("Unser Auftritt", "How we look", lang), t("Erkennbar in Orange und Navy.", "Recognisable in orange and navy.", lang), figs)
    # the owner's own introduction appears once it is filled in tools/config.py (about_intro_de / about_intro_en)
    own = SITE.get("about_intro_" + lang, "").strip()
    if own:
        body += sec('<div class="prose"><p>%s</p></div>' % esc(own))
    body += cta(key, lang)
    return dict(key=key, lang=lang, title=t("Über uns | Stabil Umzug Essen", "About us | Stabil Umzug Essen", lang),
                desc=t("Stabil Umzug aus Essen: Umzüge einfach planen, Preise nachvollziehbar machen, in einfacher Sprache.",
                       "Stabil Umzug from Essen: simple move planning, traceable prices, plain language.", lang), body=body)

def booking(lang):
    """Appointment booking: the steps are drawn by assets/js/booking.js from the free times in the company sheet."""
    key = "booking"
    # compact head: the calendar has to be on the first screen
    title = t("Termin buchen", "Book an appointment", lang)
    body = ('<div class="page-head bk-head"><div class="container">%s<h1>%s</h1><p class="lead">%s</p></div></div>') % (
        crumbs(key, lang, title), esc(title),
        esc(t("Kostenlos und unverbindlich: Besichtigung vor Ort, per Video oder Rückruf. Bestätigung sofort per E-Mail.",
              "Free and non-binding: on-site viewing, video viewing or call-back. Confirmation by email right away.", lang)))
    phone = ('<a href="tel:%s">%s</a>' % (esc(SITE["phone_href"]), esc(SITE["phone"]))) if SITE.get("phone_href") else ""
    body += ('<section class="section bk-section"><div class="container"><div id="booking" data-privacy="%s" aria-live="polite">'
             '<noscript><p>%s %s</p></noscript></div></div></section>') % (
        link(key, "privacy", lang), t("Für die Terminbuchung wird JavaScript benötigt. Rufen Sie uns gern an:", "Booking needs JavaScript. Feel free to call us:", lang), phone)
    # below the booking: the photo and what the appointment is about
    points = [t("Besichtigung vor Ort: Wir sehen alles an und schicken ein verbindliches Angebot.", "On-site viewing: we look at everything and send a fixed quote.", lang),
              t("Video-Besichtigung: Sie zeigen uns die Räume per WhatsApp-Video – von überall.", "Video viewing: you show us the rooms by WhatsApp video – from anywhere.", lang),
              t("Rückruf: Wir beantworten Ihre Fragen rund um Umzug, Entrümpelung und Transport.", "Call-back: we answer your questions about moves, clear-outs and transport.", lang),
              t("Alle Termine kostenlos und unverbindlich, Bestätigung sofort per E-Mail mit Kalendereintrag.", "All appointments free and non-binding, confirmation by email with a calendar entry right away.", lang)]
    body += ('<section class="section alt"><div class="container"><div class="split gear"><figure class="gear-img"><img src="%sassets/img/photos/uniform.jpg" alt="%s" loading="lazy" width="1536" height="1024"></figure>'
             '<div><span class="kicker red">%s</span><h2>%s</h2><p class="lead" style="margin:14px 0 18px">%s</p><ul class="checks" style="margin-top:0">%s</ul></div></div></div></section>') % (
        prefix_for(key, lang), esc(t("Arbeitskleidung von Stabil Umzug in Orange und Navy", "Stabil Umzug workwear in orange and navy", lang)),
        t("Kostenlos und unverbindlich", "Free and non-binding", lang), esc(t("So läuft Ihr Termin ab.", "How your appointment works.", lang)),
        esc(t("Kostenlose Besichtigung vor Ort, per Video oder ein Rückruf: Wählen Sie oben eine freie Zeit – Sie bekommen sofort eine Bestätigung per E-Mail mit Kalendereintrag.",
              "Free on-site viewing, video viewing or a call-back: pick a free time above – you get a confirmation by email with a calendar entry right away.", lang)),
        "".join("<li>%s</li>" % esc(x) for x in points))
    return dict(key=key, lang=lang, booking=True,
                title=t("Termin buchen: kostenlose Umzugsbesichtigung in Essen | Stabil Umzug", "Book a free moving viewing in Essen | Stabil Umzug", lang),
                desc=t("Kostenlose Besichtigung vor Ort, Video-Besichtigung oder Rückruf online buchen – freie Zeiten sofort sehen, Bestätigung per E-Mail.",
                       "Book a free on-site viewing, video viewing or call-back online – see free times at once, confirmation by email.", lang),
                body=body)

def portal(lang):
    """Customer area: the content is rendered by assets/js/portal.js from the personal link."""
    key = "portal"
    body = page_head(key, lang, t("Mein Umzug", "My move", lang),
        t("Ihr Angebot, Ihr Status und Ihre Checkliste an einem Ort – über Ihren persönlichen Link, ohne Passwort.",
          "Your quote, your status and your checklist in one place – with your personal link, no password.", lang),
        kicker=t("Kundenbereich", "Customer area", lang))
    body += ('<section class="section"><div class="container"><div id="portal" aria-live="polite">'
             '<noscript><p>%s</p></noscript></div></div></section>') % t("Für den Kundenbereich wird JavaScript benötigt.", "The customer area needs JavaScript.", lang)
    return dict(key=key, lang=lang, portal=True, noindex=True, title=t("Mein Umzug | Stabil Umzug", "My move | Stabil Umzug", lang),
                desc=t("Kundenbereich von Stabil Umzug.", "Stabil Umzug customer area.", lang), body=body)

def admin_login(lang):
    """Staff login: the admin app itself runs on Google; Google handles the sign-in."""
    key = "admin"
    url = SITE.get("admin_url", "")
    btn = ('<a class="button primary" href="%s">%s</a>' % (esc(url), t("Zum Admin-Login", "To the admin login", lang))) if url else \
          '<p class="ph">%s</p>' % t("[Admin-Bereich noch nicht eingerichtet]", "[Admin area not set up yet]", lang)
    body = ('<section class="hero on-dark"><div class="container" style="padding-bottom:clamp(48px,7vw,96px)"><div class="hero-copy">'
            '<span class="kicker">%s</span><h1>%s</h1><p class="tagline">%s</p><p class="lead">%s</p><div class="actions">%s</div>'
            '<p class="lead" style="font-size:15px;margin-top:28px">%s</p></div></div></section>') % (
        t("Stabil Umzug · Büro", "Stabil Umzug · Office", lang),
        t("Mitarbeiter-Anmeldung", "Staff sign-in", lang), t("Nur für das Team.", "Team only.", lang),
        t("Anfragen bearbeiten, Angebote erstellen und senden, Termine im Blick behalten. Sie melden sich mit Ihrem Benutzernamen und Passwort an – den Zugang richtet Ibrahim Abdelaal ein.",
          "Handle requests, create and send quotes, keep track of dates. You sign in with your username and password – Ibrahim Abdelaal sets up your access.", lang),
        btn,
        t("Kunde? Ihr Angebot und Ihren Umzugsstatus öffnen Sie über den persönlichen Link aus unserer Nachricht.",
          "Customer? Open your quote and move status with the personal link from our message.", lang))
    return dict(key=key, lang=lang, noindex=True, title=t("Mitarbeiter-Anmeldung | Stabil Umzug", "Staff sign-in | Stabil Umzug", lang),
                desc=t("Anmeldung für das Team von Stabil Umzug.", "Sign-in for the Stabil Umzug team.", lang), body=body)

def imprint(lang):
    key = "imprint"
    title = t("Impressum", "Imprint", lang)
    body = page_head(key, lang, title, "", title)
    rows = [("Anbieter", "Provider", SITE["company"]), ("Rechtsform", "Legal form", SITE["legal_form"]), ("Inhaber/Geschäftsführung", "Owner / management", SITE["owner"]),
            ("Anschrift", "Address", "%s, %s %s" % (SITE["street"], SITE["zip"], SITE["city"])), ("Telefon", "Phone", SITE["phone"]), ("E-Mail", "Email", SITE["email"]),
            ("USt-IdNr.", "VAT ID", SITE["vat_id"]), ("Register", "Register", SITE["register"])]
    tbl = "<table>%s</table>" % "".join("<tr><th scope='row'>%s</th><td>%s</td></tr>" % (esc(t(a, b, lang)), ph(c)) for a, b, c in rows if str(c).strip())
    flag = '<p class="legal-flag">%s</p>' % t("Vorlage nach § 5 DDG. Vor der Veröffentlichung vollständig ausfüllen und rechtlich prüfen lassen.", "Template under § 5 DDG. Complete it and have it reviewed legally before publishing.", lang)
    body += sec(flag + '<div class="table-wrap">%s</div>' % tbl)
    return dict(key=key, lang=lang, title=t("Impressum | Stabil Umzug", "Imprint | Stabil Umzug", lang), desc=t("Impressum von Stabil Umzug, Essen.", "Imprint of Stabil Umzug, Essen.", lang), body=body, noindex=True)

def privacy(lang):
    key = "privacy"
    title = t("Datenschutz", "Privacy", lang)
    body = page_head(key, lang, title, "", title)
    flag = '<p class="legal-flag">%s</p>' % t("Vorlage. Vor der Veröffentlichung rechtlich prüfen lassen und die Angaben zum Hosting ergänzen.", "Template. Have it reviewed legally before publishing and add the hosting details.", lang)
    if lang == "de":
        inner = ("<h2>Verantwortlicher</h2><p>%s, %s, %s %s. E-Mail: %s</p>"
                 "<h2>Hosting</h2><p>Diese Website wird bei %s gehostet. Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten, etwa die IP-Adresse, in Server-Logfiles.</p>"
                 "<h2>Cookies und Besucherzählung</h2><p>Wir setzen keine Cookies und keine Werbe- oder Analysedienste Dritter ein. Schriften und Skripte laden wir von unserer eigenen Domain. "
                 "Um zu sehen, wie die Website genutzt wird, zählen wir Seitenaufrufe ohne Cookies und ohne IP-Adresse: Bei jedem Aufruf übermittelt Ihr Browser an unser Google-Konto nur die aufgerufene Seite, "
                 "die Art der Herkunft (z. B. „Google“, „WhatsApp“ oder „direkt“), die Geräteart (Handy, Tablet, Computer) und die Sprache. Wir speichern daraus nur Tagessummen, "
                 "die keinen Rückschluss auf Sie zulassen, und löschen sie nach 13 Monaten (Art. 6 Abs. 1 lit. f DSGVO).</p>"
                 "<h2>Umzugsplaner</h2><p>Ihre Eingaben im Planer werden nur in Ihrem Browser verarbeitet und nicht an uns übertragen. Damit Sie später weitermachen können, speichert der Planer Ihren Entwurf im lokalen Speicher Ihres Browsers auf diesem Gerät (keine Cookies). Sie können ihn jederzeit im Planer mit „Entwurf löschen und neu beginnen“ oder über die Browsereinstellungen löschen. Erst wenn Sie die Zusammenfassung selbst per WhatsApp oder E-Mail senden, erhalten wir die darin enthaltenen Angaben, einschließlich der Angabe, über welche Seite oder Kampagne Sie zu uns gekommen sind. Dabei gelten die Datenschutzbestimmungen Ihres E-Mail- oder Messenger-Anbieters.</p>"
                 "<h2>Kontakt</h2><p>Wenn Sie uns schreiben, verarbeiten wir Ihre Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO).</p>"
                 "<h2>Ihre Rechte</h2><p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde.</p>")
    else:
        inner = ("<h2>Controller</h2><p>%s, %s, %s %s. Email: %s</p>"
                 "<h2>Hosting</h2><p>This website is hosted by %s. When you visit, the host processes technically necessary data, such as the IP address, in server logs.</p>"
                 "<h2>Cookies and visitor counting</h2><p>We use no cookies and no third-party advertising or analytics services. Fonts and scripts load from our own domain. "
                 "To see how the website is used, we count page views without cookies and without IP address: on each view your browser sends only the page, "
                 "the kind of source (e.g. “Google”, “WhatsApp” or “direct”), the device type (phone, tablet, computer) and the language to our Google account. We keep only daily totals "
                 "that cannot be traced back to you and delete them after 13 months (Art. 6(1)(f) GDPR).</p>"
                 "<h2>Moving planner</h2><p>Your entries in the planner are processed only in your browser and are not transferred to us. So you can continue later, the planner keeps your draft in your browser's local storage on this device (no cookies). You can delete it at any time with “Delete draft and start over” in the planner or in your browser settings. Only when you send the summary yourself via WhatsApp or email do we receive the details in it, including which page or campaign brought you to us. The privacy terms of your email or messenger provider apply.</p>"
                 "<h2>Contact</h2><p>If you write to us we process your details to handle the request (Art. 6(1)(b) GDPR).</p>"
                 "<h2>Your rights</h2><p>You have rights of access, rectification, erasure, restriction, portability and objection, and the right to complain to a supervisory authority.</p>")
    inner = inner % (ph(SITE["company"]), ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]), ph(SITE["email"]), ph(SITE["hosting"]))
    if SITE.get("api"):   # Phase 1: planner connected to the company's Google sheet
        inner += t(
            "<h2>Anfrage über den Umzugsplaner</h2><p>Wenn Sie im Planer auf „Anfrage senden“ klicken, übermitteln wir Ihre Angaben "
            "(Kontaktdaten, Adressen, Zugang, Gegenstände und die Angabe, über welche Seite oder Kampagne Sie gekommen sind) an unser Google-Workspace-Konto "
            "und speichern sie in einer Google-Tabelle, um Ihnen ein Angebot zu erstellen (Art. 6 Abs. 1 lit. b DSGVO, Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO). "
            "Wir nutzen dafür Google Workspace (Anbieter: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) mit einem Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. "
            "Eine Übermittlung in die USA ist nicht auszuschließen; sie erfolgt auf Grundlage des EU-US Data Privacy Framework, nach dem Google zertifiziert ist, und der EU-Standardvertragsklauseln. "
            "Wir löschen Anfragen, aus denen kein Auftrag wird, nach 6 Monaten.</p>"
            "<p>Mit „Entfernung berechnen“ und „Strecke und Karte anzeigen“ werden die beiden eingegebenen Orte über unseren Server an Google Maps übermittelt, um Fahrstrecke, Fahrzeit und eine Karte zu berechnen; Ihr Browser verbindet sich dabei nicht mit Google. "
            "Für unsere Statistik speichern wir je Berechnung nur Zeitpunkt, Postleitzahl und Ort von Start und Ziel, Entfernung, die aufgerufene Seite und die Kampagne – keine Straße, keine Kontaktdaten – und löschen diese Einträge nach 6 Monaten (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an der Planung unseres Angebots). "
            "Mit „Auf einem anderen Gerät weitermachen“ speichern wir Ihren Entwurf nach Ihrer Einwilligung 30 Tage und löschen ihn danach automatisch. "
            "Sie können Ihre Einwilligung jederzeit per E-Mail an uns widerrufen.</p>"
            "<h2>Fotos</h2><p>Mit einer Anfrage können Sie freiwillig Fotos hochladen (Kamera oder Dateien, höchstens 10). Ihr Browser verkleinert sie vor dem Senden; "
            "wir erhalten sie als Anhang einer E-Mail in unserem Google-Postfach und nutzen sie nur, um Ihren Umzug zu planen und Ihnen ein Angebot zu machen (Art. 6 Abs. 1 lit. b DSGVO). "
            "Bitte fotografieren Sie möglichst keine Personen oder Dokumente. Wir löschen die Fotos nach 6 Monaten, wenn daraus kein Auftrag wird.</p>"
            "<h2>Terminbuchung</h2><p>Wenn Sie über „Termin buchen“ einen Termin vereinbaren, speichern wir Art, Tag und Uhrzeit des Termins sowie Name, Telefon, E-Mail, Adresse und Ihre Nachricht "
            "in unserer Google-Tabelle und senden Ihnen und uns eine Bestätigung per E-Mail (Art. 6 Abs. 1 lit. b DSGVO). Wir löschen die Angaben nach 6 Monaten, wenn daraus kein Auftrag wird.</p>",
            "<h2>Requests sent through the moving planner</h2><p>When you click “Send request” in the planner, we transfer your details "
            "(contact details, addresses, access, items and which page or campaign brought you to us) to our Google Workspace account and store them in a Google spreadsheet "
            "to prepare a quote for you (Art. 6(1)(b) GDPR, your consent under Art. 6(1)(a) GDPR). "
            "We use Google Workspace for this (provider: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland) under a data processing agreement according to Art. 28 GDPR. "
            "A transfer to the USA cannot be ruled out; it is based on the EU-US Data Privacy Framework, under which Google is certified, and the EU standard contractual clauses. "
            "We delete requests that do not lead to an order after 6 months.</p>"
            "<p>“Calculate distance” and “Show route and map” send the two places you entered to Google Maps via our server to calculate distance, drive time and a map; your browser does not connect to Google. "
            "For our statistics we store, for each calculation, only the time, postcode and town of start and destination, the distance, the page and the campaign – no street, no contact details – and delete these entries after 6 months (Art. 6(1)(f) GDPR, legitimate interest in planning our service). "
            "“Continue on another device” stores your draft for 30 days with your consent and deletes it automatically afterwards. "
            "You can withdraw your consent at any time by emailing us.</p>"
            "<h2>Photos</h2><p>With a request you may upload photos (camera or files, at most 10). Your browser shrinks them before sending; "
            "we receive them attached to an email in our Google mailbox and use them only to plan your move and prepare a quote (Art. 6(1)(b) GDPR). "
            "Please avoid photographing people or documents. We delete the photos after 6 months if no order follows.</p>"
            "<h2>Appointment booking</h2><p>When you book an appointment, we store its type, day and time as well as your name, phone, email, address and message "
            "in our Google spreadsheet and send a confirmation email to you and to us (Art. 6(1)(b) GDPR). We delete the details after 6 months if no order follows.</p>", lang)
    body += sec(flag + inner)
    return dict(key=key, lang=lang, title=t("Datenschutz | Stabil Umzug", "Privacy | Stabil Umzug", lang), desc=t("Datenschutzerklärung von Stabil Umzug.", "Privacy policy of Stabil Umzug.", lang), body=body, noindex=True)

def not_found():
    body = ('<section class="hero on-dark"><div class="container" style="padding-bottom:clamp(48px,7vw,96px)"><div>'
            '<span class="kicker">404</span><h1>Seite nicht gefunden.</h1><p class="tagline">Page not found.</p>'
            '<p class="lead">Die Seite gibt es nicht (mehr). This page does not exist (any more).</p>'
            '<div class="actions"><a class="button primary" href="/">Zur Startseite</a><a class="button arrow" href="/en/">English home</a>'
            '<a class="button arrow" href="/umzugsplaner/">Umzugsplaner</a></div></div></div></section>')
    return body
