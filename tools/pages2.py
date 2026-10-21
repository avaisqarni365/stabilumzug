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
                title=t("Umzugsbesichtigung in Essen kostenlos buchen | Stabil Umzug", "Book a free moving viewing in Essen | Stabil Umzug", lang),
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
    body += sec('<div class="table-wrap">%s</div>' % tbl)
    return dict(key=key, lang=lang, title=t("Impressum | Stabil Umzug", "Imprint | Stabil Umzug", lang), desc=t("Impressum von Stabil Umzug, Essen.", "Imprint of Stabil Umzug, Essen.", lang), body=body)

def privacy(lang):
    """Privacy page. Every section describes what the code actually does (website, backend in backend/apps-script)."""
    key = "privacy"
    title = t("Datenschutz", "Privacy", lang)
    body = page_head(key, lang, title, "", title)
    api = bool(SITE.get("api"))
    S = []   # (heading de, heading en, text de, text en)
    S.append(("Verantwortlicher", "Controller",
              "%s, %s, %s %s. E-Mail: %s, Telefon: %s." % (ph(SITE["company"]) + " (" + esc(SITE["owner"]) + ")", ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]), ph(SITE["email"]), esc(SITE["phone"])),
              "%s, %s, %s %s. Email: %s, phone: %s." % (ph(SITE["company"]) + " (" + esc(SITE["owner"]) + ")", ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]), ph(SITE["email"]), esc(SITE["phone"]))))
    S.append(("Hosting der Website", "Website hosting",
              "Diese Website wird bei %s gehostet. Beim Aufruf verarbeitet der Anbieter technisch notwendige Daten wie Ihre IP-Adresse, Datum und Uhrzeit in Server-Logfiles, "
              "um die Seiten auszuliefern und die Sicherheit zu gewährleisten (Art. 6 Abs. 1 lit. f DSGVO)." % ph(SITE["hosting"]),
              "This website is hosted by %s. When you visit, the host processes technically necessary data such as your IP address, date and time in server logs "
              "to deliver the pages and keep them secure (Art. 6(1)(f) GDPR)." % ph(SITE["hosting"])))
    if api:
        S.append(("Unser Server bei Google", "Our server at Google",
                  "Für die Funktionen dieser Website (Besucherzählung, Strecke berechnen, Anfragen, Fotos, Terminbuchung, Chat-Assistent, Kundenbereich) betreiben wir ein Programm bei Google (Google Apps Script) "
                  "und speichern die Angaben in einer Google-Tabelle in unserem Google-Konto. Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. "
                  "Nutzen Sie eine dieser Funktionen, verbindet sich Ihr Browser direkt mit Servern von Google; dabei erhält Google technisch Ihre IP-Adresse. Wir selbst speichern keine IP-Adressen. "
                  "Eine Übermittlung in die USA ist nicht auszuschließen; Google ist nach dem EU-US Data Privacy Framework zertifiziert.",
                  "For the functions of this website (visitor counting, route calculation, requests, photos, appointment booking, chat assistant, customer area) we run a program at Google (Google Apps Script) "
                  "and store the details in a Google spreadsheet in our Google account. The provider is Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. "
                  "When you use one of these functions, your browser connects directly to Google servers, so Google technically receives your IP address. We do not store IP addresses ourselves. "
                  "A transfer to the USA cannot be ruled out; Google is certified under the EU-US Data Privacy Framework."))
    S.append(("Cookies und Besucherzählung", "Cookies and visitor counting",
              "Wir setzen keine Cookies und keine Werbe- oder Analysedienste ein. Schriften und Skripte laden wir von unserer eigenen Domain. "
              + ("Um zu sehen, wie die Website genutzt wird, sendet Ihr Browser bei jedem Seitenaufruf die aufgerufene Seite, die Art der Herkunft (z. B. „Google“, „WhatsApp“ oder „direkt“), "
                 "die Geräteart (Handy, Tablet, Computer) und die Sprache an unseren Server bei Google. Wir speichern daraus nur Tagessummen ohne IP-Adresse, die keinen Rückschluss auf Sie zulassen, "
                 "und löschen sie nach 13 Monaten (Art. 6 Abs. 1 lit. f DSGVO)." if api else ""),
              "We use no cookies and no advertising or analytics services. Fonts and scripts load from our own domain. "
              + ("To see how the website is used, your browser sends the page, the kind of source (e.g. “Google”, “WhatsApp” or “direct”), the device type (phone, tablet, computer) "
                 "and the language to our server at Google on each page view. We keep only daily totals without IP address that cannot be traced back to you, and delete them after 13 months (Art. 6(1)(f) GDPR)." if api else "")))
    S.append(("Umzugsplaner", "Moving planner",
              "Ihre Eingaben speichert der Planer zunächst nur im lokalen Speicher Ihres Browsers auf diesem Gerät (keine Cookies), damit Sie später weitermachen können. "
              "Sie können den Entwurf jederzeit mit „Entwurf löschen und neu beginnen“ oder über die Browsereinstellungen löschen. "
              + ("Erst wenn Sie auf „Anfrage senden“ klicken, übermitteln wir Ihre Angaben (Kontaktdaten, Adressen, Zugang, Gegenstände und die Seite oder Kampagne, über die Sie gekommen sind) an unseren Server "
                 "und bearbeiten sie, um Ihnen ein Angebot zu machen (Art. 6 Abs. 1 lit. b DSGVO). Mit „Auf einem anderen Gerät weitermachen“ speichern wir Ihren Entwurf nach Ihrer Einwilligung 30 Tage "
                 "und löschen ihn danach automatisch (Art. 6 Abs. 1 lit. a DSGVO). " if api else "")
              + "Senden Sie die Zusammenfassung selbst per WhatsApp oder E-Mail, gelten zusätzlich die Datenschutzbestimmungen Ihres Anbieters.",
              "The planner first keeps your entries only in your browser's local storage on this device (no cookies) so you can continue later. "
              "You can delete the draft at any time with “Delete draft and start over” or in your browser settings. "
              + ("Only when you click “Send request” do we transfer your details (contact details, addresses, access, items and the page or campaign that brought you to us) to our server "
                 "and process them to prepare a quote (Art. 6(1)(b) GDPR). With “Continue on another device” we store your draft for 30 days with your consent and then delete it automatically (Art. 6(1)(a) GDPR). " if api else "")
              + "If you send the summary yourself via WhatsApp or email, your provider's privacy terms apply as well."))
    if api:
        S.append(("Strecke berechnen", "Route calculation",
                  "Mit „Entfernung berechnen“ und „Strecke und Karte anzeigen“ übermitteln wir die beiden Orte über unseren Server an Google Maps, um Fahrstrecke, Fahrzeit und eine Karte zu berechnen. "
                  "Für unsere Statistik speichern wir je Berechnung nur Zeitpunkt, Postleitzahl und Ort von Start und Ziel, Entfernung, Seite und Kampagne – keine Straße, keine Kontaktdaten – "
                  "und löschen diese Einträge nach 6 Monaten (Art. 6 Abs. 1 lit. f DSGVO).",
                  "With “Calculate distance” and “Show route and map” we send the two places to Google Maps via our server to calculate distance, drive time and a map. "
                  "For our statistics we store per calculation only time, postcode and town of start and destination, distance, page and campaign – no street, no contact details – "
                  "and delete these entries after 6 months (Art. 6(1)(f) GDPR)."))
        S.append(("Fotos", "Photos",
                  "Mit einer Anfrage können Sie freiwillig Fotos hochladen (höchstens 10). Ihr Browser verkleinert sie vor dem Senden; wir erhalten sie per E-Mail in unserem Google-Postfach "
                  "und nutzen sie nur, um Ihren Umzug zu planen (Art. 6 Abs. 1 lit. b DSGVO). Bitte fotografieren Sie möglichst keine Personen oder Dokumente.",
                  "You can upload photos with a request (up to 10). Your browser shrinks them before sending; we receive them by email in our Google mailbox "
                  "and use them only to plan your move (Art. 6(1)(b) GDPR). Please avoid photographing people or documents."))
        S.append(("Terminbuchung", "Appointment booking",
                  "Buchen Sie einen Termin, speichern wir Art, Tag und Uhrzeit sowie Name, Telefon, E-Mail, Adresse und Ihre Nachricht und senden Ihnen und uns eine Bestätigung per E-Mail (Art. 6 Abs. 1 lit. b DSGVO).",
                  "When you book an appointment, we store its type, day and time as well as your name, phone, email, address and message and send a confirmation email to you and to us (Art. 6(1)(b) GDPR)."))
        S.append(("Chat-Assistent", "Chat assistant",
                  "Der Chat-Assistent beantwortet allgemeine Fragen. Ihre Nachricht geht an unseren Server; wenn dort die KI-Antworten eingeschaltet sind, wird der Text zur Beantwortung an Google (Gemini API) übermittelt. "
                  "Wir speichern Chat-Nachrichten nicht. Bitte geben Sie im Chat keine Adressen, Telefonnummern oder anderen persönlichen Angaben ein – dafür gibt es Anfrage und Terminbuchung (Art. 6 Abs. 1 lit. f DSGVO).",
                  "The chat assistant answers general questions. Your message goes to our server; if AI answers are switched on there, the text is sent to Google (Gemini API) to generate the answer. "
                  "We do not store chat messages. Please do not enter addresses, phone numbers or other personal details in the chat – use the request form or appointment booking for that (Art. 6(1)(f) GDPR)."))
        S.append(("Kundenbereich „Mein Umzug“", "Customer area “My move”",
                  "Über Ihren persönlichen Link sehen Sie Stand und Angebot Ihres Umzugs. Bestätigen Sie dort einen Auftrag mit Ihrer Unterschrift, speichern wir Name, Zeitpunkt und das Bild der Unterschrift zu Ihrer Anfrage "
                  "(Art. 6 Abs. 1 lit. b DSGVO). Abgehakte Punkte der Checkliste speichert nur Ihr Browser auf diesem Gerät. Geben Sie den Link nicht weiter.",
                  "With your personal link you see the status and quote of your move. If you confirm an order there with your signature, we store the name, time and the image of the signature with your request "
                  "(Art. 6(1)(b) GDPR). Ticked checklist items are stored only by your browser on this device. Do not share the link."))
    S.append(("Kontakt", "Contact",
              "Wenn Sie uns anrufen, per WhatsApp oder per E-Mail schreiben, verarbeiten wir Ihre Angaben, um die Anfrage zu bearbeiten (Art. 6 Abs. 1 lit. b DSGVO). Für WhatsApp gelten zusätzlich die Bestimmungen von WhatsApp.",
              "If you call us or write via WhatsApp or email, we process your details to handle the request (Art. 6(1)(b) GDPR). WhatsApp's own terms apply as well."))
    S.append(("Speicherdauer", "Storage period",
              "Anfragen, Fotos und Termine, aus denen kein Auftrag wird, löschen wir nach 6 Monaten. Bei Aufträgen bewahren wir Angebote, Rechnungen und Buchungsunterlagen so lange auf, "
              "wie es die gesetzlichen Fristen verlangen (in der Regel 6 bis 10 Jahre nach § 147 AO und § 257 HGB).",
              "Requests, photos and appointments that do not lead to an order are deleted after 6 months. For orders we keep quotes, invoices and accounting records as long as the law requires "
              "(usually 6 to 10 years under § 147 AO and § 257 HGB)."))
    S.append(("Ihre Rechte", "Your rights",
              "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung jederzeit für die Zukunft zu widerrufen. "
              "Schreiben Sie uns dazu an %s. Sie können sich außerdem bei einer Aufsichtsbehörde beschweren, zum Beispiel bei der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen, "
              "Kavalleriestraße 2–4, 40213 Düsseldorf." % ph(SITE["email"]),
              "You have the right of access, rectification, erasure, restriction of processing, data portability and objection, and the right to withdraw consent at any time for the future. "
              "Write to us at %s. You can also complain to a supervisory authority, for example the State Commissioner for Data Protection and Freedom of Information of North Rhine-Westphalia, "
              "Kavalleriestraße 2–4, 40213 Düsseldorf, Germany." % ph(SITE["email"])))
    inner = "".join("<h2>%s</h2><p>%s</p>" % (esc(t(a, b, lang)), t(c, d, lang)) for a, b, c, d in S)
    body += sec(inner)
    return dict(key=key, lang=lang, title=t("Datenschutz | Stabil Umzug", "Privacy | Stabil Umzug", lang),
                desc=t("Datenschutzerklärung von Stabil Umzug: welche Daten die Website verarbeitet, wie lange wir sie speichern und welche Rechte Sie haben.",
                       "Privacy policy of Stabil Umzug: which data the website processes, how long we keep it and which rights you have.", lang), body=body)

def not_found():
    body = ('<section class="hero on-dark"><div class="container" style="padding-bottom:clamp(48px,7vw,96px)"><div>'
            '<span class="kicker">404</span><h1>Seite nicht gefunden.</h1><p class="tagline">Page not found.</p>'
            '<p class="lead">Die Seite gibt es nicht (mehr). This page does not exist (any more).</p>'
            '<div class="actions"><a class="button primary" href="/">Zur Startseite</a><a class="button arrow" href="/en/">English home</a>'
            '<a class="button arrow" href="/umzugsplaner/">Umzugsplaner</a></div></div></div></section>')
    return body
