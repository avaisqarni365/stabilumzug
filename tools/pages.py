"""Page bodies (German + English) part 1: home, services, planner, contact."""
from config import SITE, TESTIMONIALS
from lib import esc, t, link, url_of, crumbs, ph, is_ph, prefix_for, path_of, GUIDES

def page_head(key, lang, title, lead, label=None, kicker=None, parent=None):
    k = '<span class="kicker red">%s</span>' % esc(kicker) if kicker else ""
    return ('<div class="page-head"><div class="container">%s%s<h1>%s</h1>%s</div></div>'
            % (crumbs(key, lang, label or title, parent), k, esc(title), ('<p class="lead">%s</p>' % esc(lead)) if lead else ""))

def phone_link():
    if is_ph(SITE["phone"]):
        return ""
    return "tel:" + (SITE["phone_href"] or SITE["phone"].replace(" ", ""))

def cta(key, lang, h=None, p=None):
    h = h or t("Kostenlos anfragen. <span>Antwort in 24 Std.</span>", "Ask for free. <span>Reply within 24 h.</span>", lang)
    p = p or t("Umzug, Entrümpelung, Wohnungsauflösung oder Transport: Wir senden Ihr persönliches, unverbindliches Angebot innerhalb von 24 Stunden – per WhatsApp oder E-Mail.",
               "Move, clear-out, household clearance or transport: we send your personal, non-binding quote within 24 hours – via WhatsApp or email.", lang)
    call = ('<a class="button arrow" href="%s">%s %s</a>' % (phone_link(), t("Anrufen", "Call", lang), esc(SITE["phone"]))) if phone_link() else \
           '<a class="button arrow" href="%s">%s</a>' % (link(key, "contact", lang), t("Direkt anfragen", "Contact us", lang))
    return ('<section class="cta on-dark"><div class="container"><div><h2>%s</h2><p>%s</p></div>'
            '<div class="actions"><a class="button primary" href="%s">%s</a><a class="button arrow" href="%s">%s</a>%s</div></div></section>'
            % (h, esc(p), link(key, "quote", lang), t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang),
               link(key, "planner", lang), t("Umzug online planen", "Plan your move online", lang), call))

# ---------------------------------------------------------------- services
def services(lang):
    import services as services_mod
    return services_mod.services_overview(lang)

# ---------------------------------------------------------------- cost drivers (no prices)
COSTS = [
    (("Arbeit", "Labour"), ("Volumen, Teamgröße und Stunden.", "Volume, crew size and hours."), ("aus Ihren Gegenständen", "from your items")),
    (("Fahrzeug", "Vehicle"), ("Größe des LKW und Anzahl der Tage.", "Truck size and number of days."), ("aus Volumen und Gewicht", "from volume and weight")),
    (("Strecke", "Distance"), ("Kilometer jeder Fahrt, bei weiten Strecken Übernachtung.", "Kilometres of each leg, overnight stay on long routes."), ("aus beiden Adressen", "from both addresses")),
    (("Montage", "Assembly"), ("Minuten je Möbelstück für Ab- und Aufbau.", "Minutes per piece to dismantle and assemble."), ("aus dem Möbelkatalog", "from the furniture catalogue")),
    (("Verpackung", "Packing"), ("Kartons, Material und Packstunden.", "Boxes, material and packing hours."), ("aus der Kartonzahl", "from the box count")),
    (("Zugang", "Access"), ("Etage, Aufzug, Tragweg, Möbellift.", "Floor, lift, carry distance, furniture lift."), ("aus beiden Gebäuden", "from both buildings")),
    (("Extras", "Extras"), ("Halteverbot, Entsorgung, Küche, Lager.", "Parking permit, disposal, kitchen, storage."), ("aus Ihrer Auswahl", "from your choices")),
    (("Versicherung", "Insurance"), ("Angegebener Wert Ihres Hausrats.", "Declared value of your belongings."), ("aus Ihrer Angabe", "from your declaration")),
]

def cost_section(key, lang, alt=False):
    cells = "".join('<div><h3>%s</h3><p>%s</p><span class="src">%s</span></div>' % (esc(t(*a, lang)), esc(t(*b, lang)), esc(t(*c, lang))) for a, b, c in COSTS)
    return ('<section class="section%s"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>'
            '<div class="costs">%s</div><p style="margin:28px 0 0"><a class="link-arrow" href="%s">%s</a></p></div></section>'
            % (" alt" if alt else "", t("Transparent kalkuliert", "Transparent pricing", lang),
               t("Was Ihren Preis bestimmt", "What decides your price", lang),
               t("Kein Pauschalpreis aus dem Nichts: Ihr Angebot besteht aus acht Teilen, jedes mit einer klaren Grundlage. Online zeigen wir keine Preise – wir rechnen persönlich.",
                 "No flat price out of thin air: your quote has eight parts, each with a clear basis. We show no prices online – we calculate personally.", lang),
               cells, link(key, "costs", lang), t("Wie sich Umzugskosten zusammensetzen", "How moving costs add up", lang)))

# ---------------------------------------------------------------- planner
def planner(lang):
    key = "planner"
    pre = prefix_for(key, lang)
    phone = SITE["phone"] if not is_ph(SITE["phone"]) else ""
    fallback = t("Der Umzugsplaner braucht JavaScript. Rufen Sie uns an oder nutzen Sie das Kontaktformular.",
                 "The moving planner needs JavaScript. Call us or use the contact form.", lang)
    body = (
        '<section class="uf-wrap"><div class="uf" id="uf" data-base="%s">'
        '<noscript><div class="uf-body"><h1>%s</h1><p>%s</p><p>%s <a href="%s">%s</a></p></div></noscript>'
        '</div></section>'
    ) % (pre, esc(t("Umzugsplaner", "Moving planner", lang)), esc(fallback),
         esc(phone), link(key, "contact", lang), t("Zum Kontaktformular", "Go to the contact form", lang))
    return dict(key=key, lang=lang, planner=True,
        title=t("Umzugsplaner: Volumen, Fahrzeug und Team schätzen | Stabil Umzug", "Moving planner: estimate volume, vehicle and crew | Stabil Umzug", lang),
        desc=t("Kostenloser Umzugsplaner: Räume, Möbel und Zugang erfassen, Volumen, Fahrzeug und Team sofort sehen und die Zusammenfassung per WhatsApp oder E-Mail an Stabil Umzug senden.",
               "Free moving planner: record rooms, furniture and access, see volume, vehicle and crew right away, and send the summary to Stabil Umzug via WhatsApp or email.", lang),
        body=body)

# ---------------------------------------------------------------- contact
def contact(lang):
    import services as services_mod
    key = "contact"
    body = page_head(key, lang, t("Kontakt", "Contact", lang),
        t("Rufen Sie an, schreiben Sie per WhatsApp – oder senden Sie uns kurz Ihre Anfrage. Wir melden uns innerhalb von 24 Stunden.",
          "Call, message us on WhatsApp – or send us your request. We reply within 24 hours.", lang),
        kicker=t("Stabil Umzug · Karlstraße 32 · Essen", "Stabil Umzug · Karlstraße 32 · Essen", lang))
    body += ('<section class="section"><div class="container contact-grid"><div>%s</div><div>%s</div></div></section>'
             % (services_mod.quote_form(key, lang), services_mod.contact_aside(lang, key)))
    biz = {"@context": "https://schema.org", "@type": "MovingCompany", "name": SITE["company"], "url": SITE["domain"] + "/",
           "telephone": SITE["phone"], "email": SITE["email"],
           "address": {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"], "addressLocality": SITE["city"], "addressCountry": "DE"},
           "openingHoursSpecification": OPENING}
    return dict(key=key, lang=lang, quote=True, schema=[biz],
        title=t("Kontakt: Umzugsunternehmen Essen | Stabil Umzug", "Contact: moving company Essen | Stabil Umzug", lang),
        desc=t("Stabil Umzug, Karlstraße 32, 45329 Essen. Telefon und WhatsApp 0163 9688190, Mo–Fr 9–19 Uhr, Sa/So 9–17 Uhr. Kostenloses Angebot in 24 Stunden.",
               "Stabil Umzug, Karlstraße 32, 45329 Essen. Phone and WhatsApp 0163 9688190. Free quote within 24 hours.", lang),
        body=body)

OPENING = [
    {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "19:00"},
    {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday", "Sunday"], "opens": "09:00", "closes": "17:00"},
]

# ---------------------------------------------------------------- home
FAQ = [
    (("Was kostet ein Umzug?", "What does a move cost?"),
     ("Der Preis setzt sich aus acht Teilen zusammen: Arbeit, Fahrzeug, Strecke, Montage, Verpackung, Zugang, Extras und Versicherung. Online zeigen wir keine Preise. Sie beschreiben Ihren Umzug im Planer, wir rechnen jede Position persönlich und senden Ihnen das Angebot innerhalb von 24 Stunden.",
      "The price has eight parts: labour, vehicle, distance, assembly, packing, access, extras and insurance. We show no prices online. You describe your move in the planner, we calculate every line personally and send you the quote within 24 hours.")),
    (("Wie genau ist die Schätzung im Planer?", "How accurate is the planner estimate?"),
     ("Der Planer rechnet mit typischen Planungswerten je Möbelstück und einem Puffer von 10 Prozent. Er zeigt das Volumen als Spanne: Je mehr Gegenstände Sie im Katalog bestätigen, desto enger wird sie. Bei großer Unsicherheit prüfen wir Ihre Liste in einem kurzen Video-Check.",
      "The planner uses typical planning values per piece of furniture plus a 10 percent buffer. It shows the volume as a range: the more items you confirm in the catalogue, the narrower it gets. If much is uncertain, we check your list in a short video call.")),
    (("In welchen Gebieten sind Sie tätig?", "Which areas do you cover?"),
     ("Wir sitzen in Essen und ziehen im Ruhrgebiet und in ganz Deutschland um. Bei weiten Strecken planen wir Fahrzeit, Übernachtung und Entladetag mit ein.",
      "We are based in Essen and move people across the Ruhr area and all of Germany. On long routes we plan driving time, overnight stay and unloading day.")),
    (("Brauche ich eine Halteverbotszone?", "Do I need a no-parking zone?"),
     ("Wenn der LKW nicht legal direkt vor dem Haus halten kann, ist sie meist sinnvoll. Sie wird bei der Stadt beantragt, die Vorlaufzeit unterscheidet sich je nach Stadt. Auf Wunsch übernehmen wir den Antrag.",
      "If the truck cannot legally stop right at the building, it is usually worth it. It is applied for at the city, and lead times differ by city. On request we handle the application.")),
    (("Sind meine Möbel versichert?", "Is my furniture insured?"),
     ("Während des Umzugs haftet das Umzugsunternehmen gesetzlich für Verlust und Schäden, begrenzt je Kubikmeter. Für höheren Schutz gibt es eine zusätzliche Transportversicherung bis zu Ihrem angegebenen Wert. Den genauen Umfang nennt Ihr Vertrag.",
      "During the move the moving company is liable by law for loss and damage, limited per cubic metre. For higher cover there is extra goods-in-transit insurance up to your declared value. Your contract states the exact cover.")),
    (("Wie früh sollte ich buchen?", "How early should I book?"),
     ("So früh wie möglich, besonders zum Monatsende und in den Ferien. Kurzfristig klappt es oft auch – das hängt von unserer Auslastung ab.",
      "As early as you can, especially at month end and in holidays. Short notice often works too – it depends on our schedule.")),
]

def faq_html(lang, key):
    links = {3: "parking", 4: "insurance", 0: "costs"}
    items = []
    for i, (q, a) in enumerate(FAQ):
        more = (' <a class="link-arrow" href="%s">%s</a>' % (link(key, links[i], lang), esc(GUIDES[links[i]][lang]["nav"]))) if i in links else ""
        items.append('<details><summary>%s</summary><div class="a"><p>%s%s</p></div></details>' % (esc(t(*q, lang)), esc(t(*a, lang)), more))
    return '<div class="faq">%s</div>' % "".join(items)

def home(lang):
    import guides
    import services as services_mod
    key = "home"
    L = lambda k: link(key, k, lang)
    pre = prefix_for(key, lang)
    call = ('<a class="button arrow" href="%s">%s</a>' % (phone_link(), esc(t("Anrufen: ", "Call: ", lang) + SITE["phone"]))) if phone_link() else ""
    facts = [(t("10 Min.", "10 min", lang), t("Planer ohne Konto", "planner, no account", lang)),
             (t("24 Std.", "24 h", lang), t("bis zu Ihrem Angebot", "to your quote", lang)),
             (t("7 Tage", "7 days", lang), t("die Woche erreichbar", "a week reachable", lang)),
             (t("0 Cookies", "0 cookies", lang), t("keine Werbe-Tracker", "no ad trackers", lang))]
    hero = (
        '<section class="hero on-dark"><div class="container">'
        '<div><span class="kicker">%s</span><h1>%s <span>%s</span></h1><p class="lead">%s</p>'
        '<div class="actions"><a class="button primary" href="%s">%s</a>%s</div></div>'
        '<div class="hero-art"><img src="%sassets/img/stabil-scene.svg" alt="%s" width="980" height="380"></div>'
        '<ul class="facts">%s</ul>'
        '</div></section>'
    ) % (
        t("Umzugsunternehmen · Essen", "Moving company · Essen", lang),
        t("Umzug, Entrümpelung und Transport in Essen.", "Moves, clear-outs and transport in Essen.", lang), t("Stabil geplant.", "Solidly planned.", lang),
        esc(t("Umzüge, Entrümpelungen, Wohnungsauflösungen und Transporte – im Ruhrgebiet und in ganz Deutschland. Kostenloses, persönliches Angebot innerhalb von 24 Stunden.",
              "Moves, clear-outs, household clearances and transport – across the Ruhr area and all of Germany. Free personal quote within 24 hours.", lang)),
        L("quote"), t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang), call,
        pre, esc(t("Stabil Umzug Transporter mit Team", "Stabil Umzug transporter with crew", lang)),
        "".join('<li><b>%s</b>%s</li>' % (esc(a), esc(b)) for a, b in facts))

    head = lambda kick, h, p: '<div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>' % (esc(kick), esc(h), esc(p))
    sec = lambda cls, inner: '<section class="section%s"><div class="container">%s</div></section>' % (cls, inner)
    body = hero

    body += sec("", head(t("Ihr Umzug in 10 Schritten", "Your move in 10 steps", lang),
                         t("Ein Umzug ist eine Kette. Wir halten sie zusammen.", "A move is a chain. We hold it together.", lang),
                         t("Jeder Schritt braucht Angaben aus dem vorherigen. Die ersten beiden – die neue Wohnung ausmessen und den Hausrat erfassen – bestimmen fast alles, was danach kommt.",
                           "Each step needs information from the one before. The first two – measuring the new home and listing your belongings – decide almost everything that follows.", lang))
                + guides.journey_html(key, lang) + '<p style="margin:28px 0 0"><a class="link-arrow" href="%s">%s</a></p>' % (L("guides"), t("Alle Schritte und Themen", "All steps and topics", lang)))

    steps = [(("Online planen", "Plan online"), ("Räume, Möbel, Zugang – grob reicht. Sie sehen sofort Volumen, Fahrzeug und Teamgröße.", "Rooms, furniture, access – rough is fine. You see volume, vehicle and crew size right away.")),
             (("Persönliches Angebot", "Personal quote"), ("Wir prüfen Ihre Angaben und senden das Angebot per WhatsApp oder E-Mail. Bei Unsicherheit ein kurzer Video-Check.", "We check your details and send the quote via WhatsApp or email. A short video check if anything is uncertain.")),
             (("Umzugstag mit festem Team", "Moving day with a fixed crew"), ("Eigener Transporter und ein Ansprechpartner vor Ort.", "Our own transporter and a contact person on site.")),
             (("Ankommen & abhaken", "Arrive & tick off"), ("Möbelmontage, Übergabeprotokoll, Rechnung.", "Furniture assembly, handover record, invoice."))]
    steps_html = "".join('<li><span class="n">%02d</span><h3>%s</h3><p>%s</p></li>' % (i + 1, esc(t(*s[0], lang)), esc(t(*s[1], lang))) for i, s in enumerate(steps))
    body += sec(" alt", head(t("So arbeiten wir", "How we work", lang), t("Von der Planung bis zum Abhaken.", "From planning to ticking off.", lang),
                             t("Vier Schritte mit Ihnen – ohne Besichtigungstermin, wenn Ihre Angaben reichen.", "Four steps with you – without a site visit when your details are enough.", lang))
                + '<ol class="steps-list">%s</ol>' % steps_html)

    body += ('<section class="poster"><div class="container"><div><span class="kicker">%s</span><h2>%s</h2></div>'
             '<div><p>%s</p><ul>%s</ul><a class="button arrow" href="%s">%s</a></div></div></section>') % (
        t("Einmal erfassen", "Enter once", lang),
        t("Einmal beschreiben. Überall weiter­verwenden.", "Describe it once. Reuse it everywhere.", lang),
        esc(t("Was Sie im Planer angeben, fließt in Angebot, Teamplanung, Halteverbotszone und Checkliste. Niemand fragt Sie zweimal.",
              "What you enter in the planner flows into the quote, crew planning, no-parking zone and checklist. Nobody asks you twice.", lang)),
        "".join("<li>%s</li>" % esc(t(*x, lang)) for x in [
            ("Gegenstände → Volumen, Fahrzeug, Kartons", "Items → volume, vehicle, boxes"),
            ("Etage und Tragweg → Teamgröße und Zeit", "Floor and carry distance → crew size and time"),
            ("Termin → Halteverbot, Sperrmüll, Ummeldung", "Date → parking permit, bulky waste, registration")]),
        L("planner"), t("Umzug planen", "Plan your move", lang))

    body += cost_section(key, lang)

    mock = ('<figure class="mock" aria-label="%s"><div class="bar">%s</div><div class="top"><small>%s</small><strong>18–24 m³</strong></div>'
            '<div class="row"><span>%s</span><b>%s</b></div><div class="row"><span>%s</span><b>%s</b></div><div class="row"><span>%s</span><b>%s</b></div>'
            '<figcaption>%s</figcaption></figure>') % (
        esc(t("Beispiel einer Zusammenfassung", "Example summary", lang)), '<i></i>' * 5 + '<i class="off"></i>',
        t("Geschätztes Volumen", "Estimated volume", lang),
        t("Fahrzeug", "Vehicle", lang), t("Transporter 3,5 t · 2 Fahrten", "Van 3.5 t · 2 trips", lang),
        t("Team", "Crew", lang), t("3 Personen · ca. 9 Std.", "3 people · approx. 9 h", lang),
        t("Vertrauen", "Confidence", lang), t("Mittel", "Medium", lang),
        t("Beispiel für eine 3-Zimmer-Wohnung, kein Angebot.", "Example for a three-room flat, not a quote.", lang))
    body += sec(" alt", '<div class="split"><div><span class="kicker red">%s</span><h2 style="font-size:clamp(1.9rem,3.8vw,3rem)">%s</h2><ul class="checks">%s</ul><a class="button primary" href="%s">%s</a></div>%s</div>' % (
        t("Der Umzugsplaner", "The moving planner", lang),
        t("Grob reicht. Ehrlich bleibt es trotzdem.", "Rough is fine. It stays honest anyway.", lang),
        "".join("<li>%s</li>" % esc(t(*x, lang)) for x in [
            ("Aus dem Katalog wählen, eine Vorlage nehmen, pro Raum schätzen oder eine Liste einfügen", "Pick from the catalogue, take a preset, guess per room or paste a list"),
            ("„Weiß ich nicht“ ist erlaubt – unsichere Einträge werden markiert", "“I don't know” is allowed – uncertain entries are flagged"),
            ("Volumen als Spanne mit Vertrauen, dazu Fahrzeug, Team und Stunden", "Volume as a range with confidence, plus vehicle, crew and hours"),
            ("Kein Preis online – Ihr Angebot rechnen wir persönlich", "No price online – we calculate your quote personally")]),
        L("planner"), t("Planer öffnen", "Open the planner", lang), mock))

    body += sec("", head(t("Leistungen", "Services", lang), t("Alles aus einer Hand.", "Everything from one team.", lang),
                         t("Sie wählen, was wir übernehmen. Der Rest bleibt bei Ihnen – und günstiger.", "You choose what we handle. The rest stays with you – and costs less.", lang))
                + services_mod.service_tiles(key, lang) + '<p style="margin:28px 0 0"><a class="link-arrow" href="%s">%s</a></p>' % (L("services"), t("Alle Leistungen", "All services", lang)))

    cover = [(("Gesetzliche Haftung", "Statutory carrier liability"), ("Inklusive. Deckt Verlust und Schäden während des Umzugs, begrenzt je Kubikmeter. Nicht gedeckt: selbst gepackte Kartons, Wertsachen, Bargeld.", "Included. Covers loss and damage during the move, limited per cubic metre. Not covered: self-packed boxes, valuables, cash.")),
             (("Transportversicherung", "Goods-in-transit cover"), ("Auf Anfrage. Deckt bis zu Ihrem angegebenen Wert, auch Kratzer und Glasbruch.", "On request. Covers up to your declared value, including scratches and glass breakage.")),
             (("Eigene Hausratversicherung", "Own household insurance"), ("Deckt oft alte und neue Wohnung während des Umzugs. Neue Adresse melden.", "Often covers old and new home during the move. Report the new address.")),
             (("Private Haftpflicht", "Private liability"), ("Schäden am Gebäude, bei Nachbarn oder Dritten. Ergänzt die Haftung, ersetzt sie nicht.", "Damage to the building, neighbours or third parties. Complements liability, does not replace it."))]
    body += sec(" alt", head(t("Versicherung", "Insurance", lang), t("Klar gesagt: Was ist abgesichert?", "Plainly put: what is covered?", lang),
                             t("Unklare Deckung ist der häufigste Streitpunkt nach einem Umzug. Deshalb nennen wir Ausschlüsse und Fristen vorher – in einfachen Worten.",
                               "Unclear cover is the most common dispute after a move. So we state exclusions and deadlines up front – in plain words.", lang))
                + '<ul class="cover">%s</ul><p class="note" style="max-width:none">%s</p><p><a class="link-arrow" href="%s">%s</a></p>' % (
                    "".join('<li><b>%s</b><span>%s</span></li>' % (esc(t(*a, lang)), esc(t(*b, lang))) for a, b in cover),
                    esc(t("Sichtbare Schäden bei der Übergabe melden, verdeckte Schäden schriftlich innerhalb der Frist im Vertrag. Allgemeine Orientierung – den genauen Schutz nennt Ihr Vertrag.",
                          "Report visible damage at handover, hidden damage in writing within the deadline in the contract. General guidance – your contract states the exact cover.", lang)),
                    L("insurance"), esc(GUIDES["insurance"][lang]["nav"])))

    if TESTIMONIALS:
        quotes = "".join('<article class="tile"><p style="font-size:1.15rem;color:var(--ink);font-weight:700">“%s”</p><p>%s</p></article>' % (esc(q["text"]), esc(q["name"])) for q in TESTIMONIALS)
        body += sec("", head(t("Kundenstimmen", "Reviews", lang), t("Was Kunden sagen.", "What customers say.", lang), "") + '<div class="tiles">%s</div>' % quotes)
    body += sec("", head(t("Häufige Fragen", "Common questions", lang), t("Kurz beantwortet.", "Briefly answered.", lang),
                         t("Was Familien uns vor dem Umzug am häufigsten fragen.", "What families ask us most often before a move.", lang)) + faq_html(lang, key))
    body += cta(key, lang)

    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": t(*q, lang), "acceptedAnswer": {"@type": "Answer", "text": t(*a, lang)}} for (q, a) in FAQ]}
    biz = {"@context": "https://schema.org", "@type": "MovingCompany", "name": SITE["company"], "url": SITE["domain"] + "/",
           "image": SITE["domain"] + "/assets/img/og.png", "logo": SITE["domain"] + "/assets/img/favicon.svg",
           "address": {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"], "addressLocality": SITE["city"],
                       "addressRegion": SITE["region"], "addressCountry": "DE"},
           "openingHoursSpecification": OPENING, "areaServed": ["Essen", "Ruhrgebiet", "Deutschland"], "inLanguage": ["de", "en"],
           "founder": SITE["owner"], "vatID": SITE["vat_id"],
           "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Leistungen", "itemListElement": [
               {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}} for n in ("Umzug", "Entrümpelung", "Wohnungsauflösung", "Transport")]}}
    if not is_ph(SITE["phone"]): biz["telephone"] = SITE["phone"]
    if not is_ph(SITE["email"]): biz["email"] = SITE["email"]
    return dict(key=key, lang=lang, schema=[biz, faq_ld],
        title=t("Stabil Umzug Essen: Umzug planen und Angebot in 24 Std.", "Stabil Umzug Essen: plan your move, quote within 24 h", lang),
        desc=t("Umzugsunternehmen in Essen: Umzug online planen, Volumen, Fahrzeug und Team sofort sehen, persönliches Angebot innerhalb von 24 Stunden per WhatsApp oder E-Mail.",
               "Moving company in Essen: plan your move online, see volume, vehicle and crew right away, personal quote within 24 hours via WhatsApp or email.", lang),
        body=body)
