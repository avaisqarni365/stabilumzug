"""Page bodies part 2: Essen, about, legal pages, 404. Guides live in guides.py."""
from config import SITE
from lib import esc, t, link, crumbs, ph, is_ph, url_of
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
                     kicker=t("Stabil Umzug · Essen", "Stabil Umzug · Essen", lang))
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
     ("Ihr Angebot nennt Arbeit, Fahrzeug, Strecke, Montage, Verpackung, Zugang, Extras und Versicherung als eigene Positionen.",
      "Your quote lists labour, vehicle, distance, assembly, packing, access, extras and insurance as separate lines.")),
    (("Einfache Sprache, kein Druck.", "Plain language, no pressure."),
     ("Kurze Texte auf Deutsch und Englisch. Begriffe wie Halteverbotszone erklären wir dort, wo sie vorkommen. Versicherung und Storno finden Sie vor der Buchung.",
      "Short texts in German and English. Terms like Halteverbotszone are explained where they appear. Insurance and cancellation are clear before you book.")),
    (("Erst messen, dann versprechen.", "Measure first, then promise."),
     ("Nach jedem Umzug vergleichen wir Angebot und tatsächlichen Aufwand – und korrigieren unsere Planungswerte, wo sie danebenlagen.",
      "After every move we compare the quote with the actual effort – and correct our planning values where they were off.")),
]

def about(lang):
    key = "about"
    title = t("Über uns", "About us", lang)
    body = page_head(key, lang, title, t("Ein Umzugsunternehmen aus Essen, das Planung einfach und Preise nachvollziehbar machen will.",
                                         "A moving company from Essen that wants to make planning simple and prices traceable.", lang), title,
                     kicker=t("Stabil Umzug · Essen", "Stabil Umzug · Essen", lang))
    intro = t("Ein Umzug ist eine Kette von Schritten: neue Wohnung ausmessen, Hausrat erfassen, Zugang klären, Halteverbot, Kartons, Aufbau, Anmeldung. "
              "Das meiste Geld und der meiste Stress gehen verloren, wenn Angaben von einem Schritt nicht beim nächsten ankommen. Deshalb haben wir diesen Ablauf in einen einfachen Planer übersetzt.",
              "A move is a chain of steps: measure the new home, list your belongings, clarify access, parking permit, boxes, assembly, registration. "
              "Most money and stress are lost when information from one step does not reach the next. So we turned this flow into a simple planner.", lang)
    cells = "".join('<div><h3>%s</h3><p>%s</p></div>' % (esc(t(*a, lang)), esc(t(*b, lang))) for a, b in PRINCIPLES)
    body += ('<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>'
             '<div class="costs two">%s</div></div></section>' % (t("Wie wir arbeiten", "How we work", lang), t("Sechs Versprechen.", "Six promises.", lang), esc(intro), cells))
    body += sec('<p class="ph">%s</p>' % t("[Hier kurze Vorstellung des Unternehmens, des Teams um Ibrahim Abdelaal und der Erfahrung eintragen]",
                                            "[Add a short introduction of the company, the team around Ibrahim Abdelaal and its experience here]", lang))
    body += cta(key, lang)
    return dict(key=key, lang=lang, title=t("Über uns | Stabil Umzug Essen", "About us | Stabil Umzug Essen", lang),
                desc=t("Stabil Umzug aus Essen: Umzüge einfach planen, Preise nachvollziehbar machen, in einfacher Sprache.",
                       "Stabil Umzug from Essen: simple move planning, traceable prices, plain language.", lang), body=body)

def admin_login(lang):
    """Staff login: the admin app itself runs on Google; Google handles the sign-in."""
    key = "admin"
    url = SITE.get("admin_url", "")
    btn = ('<a class="button primary" href="%s">%s</a>' % (esc(url), t("Mit Google anmelden", "Sign in with Google", lang))) if url else \
          '<p class="ph">%s</p>' % t("[Admin-Bereich noch nicht eingerichtet]", "[Admin area not set up yet]", lang)
    body = ('<section class="hero on-dark"><div class="container" style="padding-bottom:clamp(48px,7vw,96px)"><div class="hero-copy">'
            '<span class="kicker">%s</span><h1>%s</h1><p class="tagline">%s</p><p class="lead">%s</p><div class="actions">%s</div>'
            '<p class="lead" style="font-size:15px;margin-top:28px">%s</p></div></div></section>') % (
        t("Stabil Umzug · Büro", "Stabil Umzug · Office", lang),
        t("Mitarbeiter-Anmeldung", "Staff sign-in", lang), t("Nur für das Team.", "Team only.", lang),
        t("Anfragen bearbeiten, Angebote erstellen und senden, Termine im Blick behalten. Die Anmeldung läuft über Ihr Google-Konto – Zugang hat, wem die Tabelle „Stabil Umzug – Anfragen“ freigegeben ist.",
          "Handle requests, create and send quotes, keep track of dates. You sign in with your Google account – access is granted to everyone the sheet “Stabil Umzug – Anfragen” is shared with.", lang),
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
                 "<h2>Cookies und Tracking</h2><p>Wir setzen keine Cookies und keine Analyse- oder Werbedienste ein. Schriften und Skripte laden wir von unserer eigenen Domain.</p>"
                 "<h2>Umzugsplaner</h2><p>Ihre Eingaben im Planer werden nur in Ihrem Browser verarbeitet und nicht an uns übertragen. Damit Sie später weitermachen können, speichert der Planer Ihren Entwurf im lokalen Speicher Ihres Browsers auf diesem Gerät (keine Cookies). Sie können ihn jederzeit im Planer mit „Entwurf löschen und neu beginnen“ oder über die Browsereinstellungen löschen. Erst wenn Sie die Zusammenfassung selbst per WhatsApp oder E-Mail senden, erhalten wir die darin enthaltenen Angaben, einschließlich der Angabe, über welche Seite oder Kampagne Sie zu uns gekommen sind. Dabei gelten die Datenschutzbestimmungen Ihres E-Mail- oder Messenger-Anbieters.</p>"
                 "<h2>Kontakt</h2><p>Wenn Sie uns schreiben, verarbeiten wir Ihre Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO).</p>"
                 "<h2>Ihre Rechte</h2><p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde.</p>")
    else:
        inner = ("<h2>Controller</h2><p>%s, %s, %s %s. Email: %s</p>"
                 "<h2>Hosting</h2><p>This website is hosted by %s. When you visit, the host processes technically necessary data, such as the IP address, in server logs.</p>"
                 "<h2>Cookies and tracking</h2><p>We use no cookies and no analytics or advertising services. Fonts and scripts load from our own domain.</p>"
                 "<h2>Moving planner</h2><p>Your entries in the planner are processed only in your browser and are not transferred to us. So you can continue later, the planner keeps your draft in your browser's local storage on this device (no cookies). You can delete it at any time with “Delete draft and start over” in the planner or in your browser settings. Only when you send the summary yourself via WhatsApp or email do we receive the details in it, including which page or campaign brought you to us. The privacy terms of your email or messenger provider apply.</p>"
                 "<h2>Contact</h2><p>If you write to us we process your details to handle the request (Art. 6(1)(b) GDPR).</p>"
                 "<h2>Your rights</h2><p>You have rights of access, rectification, erasure, restriction, portability and objection, and the right to complain to a supervisory authority.</p>")
    inner = inner % (ph(SITE["company"]), ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]), ph(SITE["email"]), ph(SITE["hosting"]))
    if SITE.get("api"):   # Phase 1: planner connected to the company's Google sheet
        inner += t(
            "<h2>Anfrage über den Umzugsplaner</h2><p>Wenn Sie im Planer auf „Anfrage senden“ klicken, übermitteln wir Ihre Angaben "
            "(Kontaktdaten, Adressen, Zugang, Gegenstände und die Angabe, über welche Seite oder Kampagne Sie gekommen sind) an unser Google-Konto "
            "und speichern sie in einer Google-Tabelle, um Ihnen ein Angebot zu erstellen (Art. 6 Abs. 1 lit. b DSGVO, Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO). "
            "Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland; eine Übermittlung in die USA ist nicht auszuschließen. "
            "Wir löschen Anfragen, aus denen kein Auftrag wird, nach 6 Monaten.</p>"
            "<p>Mit „Entfernung berechnen“ werden die beiden Adressen an Google Maps übermittelt, um die Fahrstrecke zu berechnen. "
            "Mit „Auf einem anderen Gerät weitermachen“ speichern wir Ihren Entwurf nach Ihrer Einwilligung 30 Tage und löschen ihn danach automatisch. "
            "Sie können Ihre Einwilligung jederzeit per E-Mail an uns widerrufen.</p>",
            "<h2>Requests sent through the moving planner</h2><p>When you click “Send request” in the planner, we transfer your details "
            "(contact details, addresses, access, items and which page or campaign brought you to us) to our Google account and store them in a Google spreadsheet "
            "to prepare a quote for you (Art. 6(1)(b) GDPR, your consent under Art. 6(1)(a) GDPR). "
            "The provider is Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland; a transfer to the USA cannot be ruled out. "
            "We delete requests that do not lead to an order after 6 months.</p>"
            "<p>“Calculate distance” sends both addresses to Google Maps to calculate the driving distance. "
            "“Continue on another device” stores your draft for 30 days with your consent and deletes it automatically afterwards. "
            "You can withdraw your consent at any time by emailing us.</p>", lang)
    body += sec(flag + inner)
    return dict(key=key, lang=lang, title=t("Datenschutz | Stabil Umzug", "Privacy | Stabil Umzug", lang), desc=t("Datenschutzerklärung von Stabil Umzug.", "Privacy policy of Stabil Umzug.", lang), body=body, noindex=True)

def not_found():
    body = ('<section class="hero on-dark"><div class="container" style="padding-bottom:clamp(48px,7vw,96px)"><div>'
            '<span class="kicker">404</span><h1>Seite nicht gefunden.</h1><p class="tagline">Page not found.</p>'
            '<p class="lead">Die Seite gibt es nicht (mehr). This page does not exist (any more).</p>'
            '<div class="actions"><a class="button primary" href="/">Zur Startseite</a><a class="button arrow" href="/en/">English home</a>'
            '<a class="button arrow" href="/umzugsplaner/">Umzugsplaner</a></div></div></div></section>')
    return body
