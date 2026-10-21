"""Page bodies (German + English) part 1: home, services, planner, contact."""
from config import SITE, TESTIMONIALS
from lib import esc, t, link, url_of, crumbs, ph, is_ph, prefix_for, path_of, GUIDES

def page_head(key, lang, title, lead, label=None, kicker=None, parent=None, photo=None, alt=""):
    k = '<span class="kicker red">%s</span>' % esc(kicker) if kicker else ""
    inner = '%s%s<h1>%s</h1>%s' % (crumbs(key, lang, label or title, parent), k, esc(title), ('<p class="lead">%s</p>' % esc(lead)) if lead else "")
    if photo:
        return ('<div class="page-head ph-photo"><div class="container"><div class="ph-text">%s</div><figure class="ph-img"><img src="%sassets/img/photos/%s" alt="%s" width="1600" height="1067" fetchpriority="high"></figure></div></div>'
                % (inner, prefix_for(key, lang), photo, esc(alt or title)))
    return '<div class="page-head"><div class="container">%s</div></div>' % inner

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
            '<div class="actions"><a class="button primary" href="%s">%s</a><a class="button arrow" href="%s">%s</a><a class="button arrow" href="%s">%s</a>%s</div></div></section>'
            % (h, esc(p), link(key, "quote", lang), t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang),
               link(key, "booking", lang), t("Kostenlose Besichtigung buchen", "Book a free viewing", lang),
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
]

def cost_section(key, lang, alt=False):
    cells = "".join('<div><h3>%s</h3><p>%s</p><span class="src">%s</span></div>' % (esc(t(*a, lang)), esc(t(*b, lang)), esc(t(*c, lang))) for a, b, c in COSTS)
    return ('<section class="section%s"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>'
            '<div class="costs">%s</div><p style="margin:28px 0 0"><a class="link-arrow" href="%s">%s</a></p></div></section>'
            % (" alt" if alt else "", t("Transparent kalkuliert", "Transparent pricing", lang),
               t("Was Ihren Preis bestimmt", "What decides your price", lang),
               t("Kein Pauschalpreis aus dem Nichts: Ihr Angebot besteht aus sieben Teilen, jedes mit einer klaren Grundlage. Online zeigen wir keine Preise – wir rechnen persönlich.",
                 "No flat price out of thin air: your quote has seven parts, each with a clear basis. We show no prices online – we calculate personally.", lang),
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
        title=t("Umzugsplaner Essen: Volumen und Team schätzen | Stabil Umzug", "Moving planner: estimate volume and crew | Stabil Umzug", lang),
        desc=t("Kostenloser Umzugsplaner von Stabil Umzug aus Essen: Räume und Möbel erfassen, Volumen, Fahrzeug und Team sofort sehen, Angebot in 24 Std.",
               "Free moving planner by Stabil Umzug from Essen: record rooms and furniture, see volume, vehicle and crew at once, quote within 24 hours.", lang),
        body=body)

# ---------------------------------------------------------------- contact
def contact(lang):
    import services as services_mod
    key = "contact"
    body = page_head(key, lang, t("Kontakt", "Contact", lang),
        t("Rufen Sie an, schreiben Sie per WhatsApp – oder senden Sie uns kurz Ihre Anfrage. Wir melden uns innerhalb von 24 Stunden.",
          "Call, message us on WhatsApp – or send us your request. We reply within 24 hours.", lang),
        kicker=t("Stabil Umzug · Karlstraße 32 · Essen", "Stabil Umzug · Karlstraße 32 · Essen", lang))
    body += ('<section class="section"><div class="container">%s<div class="contact-grid"><div>%s</div><div>%s</div></div></div></section>'
             % (services_mod.quick_contact(lang), services_mod.quote_form(key, lang), services_mod.contact_aside(lang, key)))
    biz = {"@context": "https://schema.org", "@type": "MovingCompany", "name": SITE["company"], "url": SITE["domain"] + "/",
           "logo": {"@type": "ImageObject", "url": SITE.get("logo_url", SITE["domain"] + "/assets/img/og.png"), "caption": "Stabil Umzug Logo"},
           "image": SITE.get("brand_images", [SITE["domain"] + "/assets/img/van-branded.jpg"]),
           "telephone": SITE["phone"], "email": SITE["email"],
           "address": {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"], "addressLocality": SITE["city"], "addressRegion": SITE["region"], "addressCountry": "DE"},
           "openingHoursSpecification": OPENING,
           "hasMap": SITE.get("maps_url", "https://maps.google.com/?q=Stabil+Umzug+Karlstra%C3%9Fe+32+45329+Essen")}
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
     ("Der Preis setzt sich aus sieben Teilen zusammen: Arbeit, Fahrzeug, Strecke, Montage, Verpackung, Zugang und Extras. Online zeigen wir keine Preise. Sie beschreiben Ihren Umzug im Planer, wir rechnen jede Position persönlich und senden Ihnen das Angebot innerhalb von 24 Stunden.",
      "The price has seven parts: labour, vehicle, distance, assembly, packing, access and extras. We show no prices online. You describe your move in the planner, we calculate every line personally and send you the quote within 24 hours.")),
    (("Wie genau ist die Schätzung im Planer?", "How accurate is the planner estimate?"),
     ("Der Planer rechnet mit typischen Planungswerten je Möbelstück und einem Puffer von 10 Prozent. Er zeigt das Volumen als Spanne: Je mehr Gegenstände Sie im Katalog bestätigen, desto enger wird sie. Bei großer Unsicherheit prüfen wir Ihre Liste in einem kurzen Video-Check.",
      "The planner uses typical planning values per piece of furniture plus a 10 percent buffer. It shows the volume as a range: the more items you confirm in the catalogue, the narrower it gets. If much is uncertain, we check your list in a short video call.")),
    (("In welchen Gebieten sind Sie tätig?", "Which areas do you cover?"),
     ("Wir sitzen in Essen und ziehen im Ruhrgebiet und in ganz Deutschland um. Bei weiten Strecken planen wir Fahrzeit, Übernachtung und Entladetag mit ein.",
      "We are based in Essen and move people across the Ruhr area and all of Germany. On long routes we plan driving time, overnight stay and unloading day.")),
    (("Brauche ich eine Halteverbotszone?", "Do I need a no-parking zone?"),
     ("Wenn der LKW nicht legal direkt vor dem Haus halten kann, ist sie meist sinnvoll. Sie wird bei der Stadt beantragt, die Vorlaufzeit unterscheidet sich je nach Stadt. Auf Wunsch übernehmen wir den Antrag.",
      "If the truck cannot legally stop right at the building, it is usually worth it. It is applied for at the city, and lead times differ by city. On request we handle the application.")),
    (("Wie früh sollte ich buchen?", "How early should I book?"),
     ("So früh wie möglich, besonders zum Monatsende und in den Ferien. Kurzfristig klappt es oft auch – das hängt von unserer Auslastung ab.",
      "As early as you can, especially at month end and in holidays. Short notice often works too – it depends on our schedule.")),
]

def faq_html(lang, key):
    links = {3: "parking", 0: "costs"}
    items = []
    for i, (q, a) in enumerate(FAQ):
        more = (' <a class="link-arrow" href="%s">%s</a>' % (link(key, links[i], lang), esc(GUIDES[links[i]][lang]["nav"]))) if i in links else ""
        items.append('<details><summary>%s</summary><div class="a"><p>%s%s</p></div></details>' % (esc(t(*q, lang)), esc(t(*a, lang)), more))
    return '<div class="faq">%s</div>' % "".join(items)

def quick_plan(key, lang, title=None, kicker=None, from_value=""):
    """Planner quick start: from and to; opens the planner at step 1 (F1) with these filled in.
    With the website API connected it also shows the route (distance, drive time, map) – see assets/js/route.js."""
    route = bool(SITE.get("api"))
    return ('<form class="quick-plan" action="%s" method="get" aria-labelledby="qp-h"%s><input type="hidden" name="start" value="1"><input type="hidden" name="km" value="">'
            '<div class="qp-head"><span class="qp-k">%s</span><h2 id="qp-h">%s</h2></div>'
            '<div class="qp-row"><label class="qp-field"><span>%s</span><input class="input" name="from" autocomplete="address-level2" placeholder="%s"%s></label>'
            '<label class="qp-field"><span>%s</span><input class="input" name="to" autocomplete="off" placeholder="%s"></label></div>'
            '%s'
            '<button class="button primary qp-go" type="submit">%s</button>'
            '<p class="qp-note">%s</p></form>') % (
        link(key, "planner", lang), ' data-route' if route else '',
        kicker or t("Umzugsplaner · kostenlos", "Moving planner · free", lang), title or t("Ihren Umzug jetzt planen", "Plan your move now", lang),
        t("Von", "From", lang), t("z. B. 45130 Essen", "e.g. 45130 Essen", lang), (' value="%s"' % esc(from_value)) if from_value else "",
        t("Nach", "To", lang), t("z. B. 44793 Bochum", "e.g. 44793 Bochum", lang),
        ('<button type="button" class="button qp-calc"><span class="pin" aria-hidden="true"></span>%s</button><div class="route-out" hidden aria-live="polite"></div>'
         % t("Strecke und Karte anzeigen", "Show route and map", lang)) if route else "",
        t("Umzug planen", "Plan my move", lang),
        t("Ohne Konto · ca. 10 Minuten · Volumen, Fahrzeug und Team sofort sehen", "No account · about 10 minutes · see volume, vehicle and crew right away", lang))

# Service area for search engines: Essen with its districts, then the nearby cities we have pages for
AREA_SERVED = ([{"@type": "City", "name": "Essen"}]
               + [{"@type": "Place", "name": "Essen-" + d} for d in ("Altenessen", "Borbeck", "Bredeney", "Frohnhausen", "Holsterhausen", "Katernberg",
                                                                     "Kettwig", "Kray", "Rüttenscheid", "Stadtkern", "Steele", "Werden")]
               + [{"@type": "City", "name": c} for c in ("Bochum", "Bottrop", "Dortmund", "Düsseldorf", "Duisburg", "Gelsenkirchen", "Gladbeck",
                                                         "Hattingen", "Herne", "Mülheim an der Ruhr", "Oberhausen", "Velbert")]
               + [{"@type": "AdministrativeArea", "name": "Ruhrgebiet"}])

def google_rating(lang):
    """The real Google rating from config.py (score, count, date, profile link) – None until all four are filled in."""
    r, n, d = str(SITE.get("google_rating", "")).strip(), int(SITE.get("google_reviews_count") or 0), str(SITE.get("google_rating_date", "")).strip()
    url = str(SITE.get("google_profile_url", "")).strip()
    if not (r and n and d and url.startswith("https://")):
        return None
    v = max(0.0, min(5.0, float(r.replace(",", "."))))
    full = int(v + 0.25)
    return {"score": ("%.1f" % v).replace(".", ",") if lang == "de" else "%.1f" % v, "count": n, "date": d, "url": url,
            "stars": "★" * full + "☆" * (5 - full)}

def home(lang):
    import guides
    import services as services_mod
    key = "home"
    L = lambda k: link(key, k, lang)
    pre = prefix_for(key, lang)
    call = ('<a class="button arrow tel" href="%s" aria-label="%s">%s</a>' % (phone_link(), esc(t("Anrufen: ", "Call: ", lang) + SITE["phone"]), esc(SITE["phone"]))) if phone_link() else ""
    G = google_rating(lang)
    facts = [(t("Essen", "Essen", lang), t("Sitz in Altenessen, Einsatz in ganz NRW", "based in Altenessen, working across NRW", lang)),
             (t("24 Std.", "24 h", lang), t("bis zu Ihrem Angebot", "to your quote", lang)),
             (t("7 Tage", "7 days", lang), t("die Woche erreichbar", "a week reachable", lang)),
             (t("10 Min.", "10 min", lang), t("Planer ohne Konto", "planner, no account", lang))]
    hero = (
        '<section class="hero on-dark"><div class="container">'
        '<div class="hero-copy"><span class="kicker">%s</span><h1>%s</h1><p class="tagline">%s</p>%s%s<p class="lead">%s</p>'
        '<div class="actions"><a class="button primary" href="%s">%s</a>%s</div></div>'
        '<figure class="hero-art"><img src="%sassets/img/van-branded.jpg" srcset="%sassets/img/van-branded-640.jpg 640w, %sassets/img/van-branded.jpg 1108w" sizes="(max-width:860px) 92vw, 50vw" alt="%s" width="1108" height="1108" fetchpriority="high"><figcaption>%s</figcaption></figure>'
        '<ul class="facts">%s</ul>'
        '</div></section>'
    ) % (
        t("Umzugsunternehmen · Essen", "Moving company · Essen", lang),
        t("Umzug, Entrümpelung und Transport in Essen.", "Moves, clear-outs and transport in Essen.", lang), t("Stabil geplant.", "Solidly planned.", lang),
        ('<a class="g-chip" href="%s" target="_blank" rel="noopener"><span class="g-stars" aria-hidden="true">%s</span><b>%s</b><span>%s</span><span class="g-more">%s</span></a>' % (
            esc(G["url"]), G["stars"], esc(G["score"]), esc(t("%d Google-Bewertungen · Stand %s", "%d Google reviews · as of %s", lang) % (G["count"], G["date"])),
            t("ansehen ↗", "view ↗", lang))) if G else "",
        quick_plan(key, lang),
        esc(t("Umzüge, Entrümpelungen, Wohnungsauflösungen, Transporte und Möbelmontage – in Essen, im Ruhrgebiet und auf Wunsch deutschlandweit. Kostenloses, persönliches Angebot innerhalb von 24 Stunden.",
              "Moves, clear-outs, household clearances, transport and furniture assembly – in Essen, the Ruhr area and across Germany on request. Free personal quote within 24 hours.", lang)),
        L("quote"), t("Kostenloses Angebot", "Free quote", lang), call,
        pre, pre, pre, esc(t("Weißer Transporter mit Stabil-Umzug-Logo in Orange und Navy", "White van with the Stabil Umzug logo in orange and navy", lang)),
        t("Unser Transporter · Essen", "Our van · Essen", lang),
        "".join('<li><b>%s</b>%s</li>' % (esc(a), esc(b)) for a, b in facts))

    head = lambda kick, h, p: '<div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>' % (esc(kick), esc(h), esc(p))
    sec = lambda cls, inner: '<section class="section%s"><div class="container">%s</div></section>' % (cls, inner)

    google_maps_url = SITE.get("maps_url", "https://maps.google.com/?q=Stabil+Umzug+Karlstra%C3%9Fe+32+45329+Essen")
    body = hero

    body += sec("", head(t("Ihr Umzug in 10 Schritten", "Your move in 10 steps", lang),
                         t("Ein Umzug ist eine Kette. Wir halten sie zusammen.", "A move is a chain. We hold it together.", lang),
                         t("Jeder Schritt braucht Angaben aus dem vorherigen. Die ersten beiden – die neue Wohnung ausmessen und den Hausrat erfassen – bestimmen fast alles, was danach kommt.",
                           "Each step needs information from the one before. The first two – measuring the new home and listing your belongings – decide almost everything that follows.", lang))
                + guides.journey_html(key, lang) + '<p style="margin:28px 0 0"><a class="link-arrow" href="%s">%s</a></p>' % (L("guides"), t("Alle Schritte und Themen", "All steps and topics", lang)))

    body += ('<section class="photo-band"><img src="%sassets/img/photos/bed-assembly.jpg" data-sizes="100vw" alt="%s" loading="lazy" width="1600" height="1067">'
             '<div class="container"><span class="kicker">%s</span><h2>%s</h2><p>%s</p><div class="actions"><a class="button primary" href="%s">%s</a><a class="button arrow" href="%s">%s</a></div></div></section>') % (
        pre, esc(t("Zwei Monteure von Stabil Umzug bauen ein Bett in der neuen Wohnung auf", "Two Stabil Umzug fitters assembling a bed in the new home", lang)),
        t("Ankommen statt schleppen", "Arrive instead of carry", lang),
        t("Sie ziehen ein. Wir tragen.", "You move in. We carry.", lang),
        esc(t("Vom ersten Karton bis zum aufgebauten Bett: Unser Team übernimmt das Schwere, damit Sie sich auf Ihr neues Zuhause freuen können.",
              "From the first box to the assembled bed: our crew takes the heavy lifting so you can look forward to your new home.", lang)),
        L("quote"), t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang), L("svc_moves"), t("Mehr über Umzüge", "More about moves", lang))

    steps = [(("Online planen", "Plan online"), ("Räume, Möbel, Zugang – grob reicht. Sie sehen sofort Volumen, Fahrzeug und Teamgröße.", "Rooms, furniture, access – rough is fine. You see volume, vehicle and crew size right away.")),
             (("Persönliches Angebot", "Personal quote"), ("Wir prüfen Ihre Angaben und senden das Angebot per WhatsApp oder E-Mail. Bei Unsicherheit ein kurzer Video-Check.", "We check your details and send the quote via WhatsApp or email. A short video check if anything is uncertain.")),
             (("Umzugstag mit festem Team", "Moving day with a fixed crew"), ("Eigener Transporter und ein Ansprechpartner vor Ort.", "Our own transporter and a contact person on site.")),
             (("Ankommen & abhaken", "Arrive & tick off"), ("Möbelmontage, Übergabeprotokoll, Rechnung.", "Furniture assembly, handover record, invoice."))]
    steps_html = "".join('<li><span class="top"><span class="n">%02d</span>%s</span><h3>%s</h3><p>%s</p></li>' % (
        i + 1, guides.step_icon(("w_plan", "w_quote", "w_team", "w_done")[i]), esc(t(*s[0], lang)), esc(t(*s[1], lang))) for i, s in enumerate(steps))
    body += sec(" alt place-steps", head(t("So arbeiten wir", "How we work", lang), t("Von der Planung bis zum Abhaken.", "From planning to ticking off.", lang),
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
    body += sec(" alt home-planner", '<div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div></div><div class="split"><div><ul class="checks" style="margin-top:0">%s</ul><a class="button primary" href="%s">%s</a></div>%s</div>' % (
        t("Der Umzugsplaner", "The moving planner", lang),
        t("Grob reicht. Ehrlich bleibt es trotzdem.", "Rough is fine. It stays honest anyway.", lang),
        "".join("<li>%s</li>" % esc(t(*x, lang)) for x in [
            ("Aus dem Katalog wählen, eine Vorlage nehmen, pro Raum schätzen oder eine Liste einfügen", "Pick from the catalogue, take a preset, guess per room or paste a list"),
            ("„Weiß ich nicht“ ist erlaubt – unsichere Einträge werden markiert", "“I don't know” is allowed – uncertain entries are flagged"),
            ("Volumen als Spanne mit Vertrauen, dazu Fahrzeug, Team und Stunden", "Volume as a range with confidence, plus vehicle, crew and hours"),
            ("Kein Preis online – Ihr Angebot rechnen wir persönlich", "No price online – we calculate your quote personally")]),
        L("planner"), t("Planer öffnen", "Open the planner", lang), mock))

    body += sec(" svc-home", head(t("Leistungen", "Services", lang), t("Alles aus einer Hand.", "Everything from one team.", lang),
                         t("Sie wählen, was wir übernehmen. Der Rest bleibt bei Ihnen – und günstiger.", "You choose what we handle. The rest stays with you – and costs less.", lang))
                + services_mod.service_tiles(key, lang) + '<p style="margin:28px 0 0"><a class="link-arrow" href="%s">%s</a></p>' % (L("services"), t("Alle Leistungen", "All services", lang)))

    gear = [("Sackkarren und Möbelroller für schwere Stücke", "Hand trucks and furniture dollies for heavy pieces"),
            ("Treppensteiger für Waschmaschine, Schrank und Klavier", "Stair climber for washing machine, wardrobe and piano"),
            ("Möbeldecken, die jedes Stück einzeln schützen", "Moving blankets that protect every piece"),
            ("Spanngurte, damit im Transporter nichts verrutscht", "Ratchet straps so nothing shifts in the van"),
            ("Arbeitshandschuhe mit Griff – sicher für Team und Möbel", "Grip gloves – safe for crew and furniture")]
    body += sec(" alt", '<div class="split gear"><figure class="gear-img"><img src="%sassets/img/photos/equipment.jpg" alt="%s" loading="lazy" width="1536" height="1024"></figure>'
                '<div><span class="kicker red">%s</span><h2>%s</h2><p class="lead" style="margin:14px 0 18px">%s</p><ul class="checks" style="margin-top:0">%s</ul></div></div>' % (
        pre, esc(t("Ausrüstung von Stabil Umzug: Sackkarre, Treppensteiger, Möbelroller, Möbeldecken, Spanngurte und Handschuhe",
                   "Stabil Umzug equipment: hand truck, stair climber, dolly, moving blankets, straps and gloves", lang)),
        t("Ausrüstung", "Equipment", lang), t("Das richtige Werkzeug dabei.", "The right tools on board.", lang),
        esc(t("Damit Möbel heil ankommen und Treppenhäuser ohne Kratzer bleiben.", "So furniture arrives intact and stairwells stay free of scratches.", lang)),
        "".join("<li>%s</li>" % esc(t(*x, lang)) for x in gear)))

    if TESTIMONIALS or G:
        # only real reviews, word for word: {"name", "place", "text", "stars" (1-5), "date" ("März 2026"), "source" ("Google")}
        review_cards = []
        for q in TESTIMONIALS:
            n = max(1, min(5, int(q.get("stars", 5))))
            svc_badge = ('<span class="gr-service">%s</span>' % esc(q["service"])) if q.get("service") else ''
            review_cards.append(
                '<article class="gr-card"><div class="gr-top"><div class="gr-author"><span class="gr-avatar" aria-hidden="true">%s</span>'
                '<div><strong>%s</strong><small>%s</small></div></div><span class="gr-badge">%s</span></div>'
                '<div class="gr-stars" aria-label="%s">%s</div>%s<p class="gr-text">“%s”</p>'
                '<div class="gr-foot"><span class="gr-loc">%s</span><span class="gr-date">%s</span></div></article>' % (
                    esc(q["name"][:1]), esc(q["name"]), esc(q.get("place", SITE["city"])), esc(q.get("source", "Google")),
                    esc(t("%d von 5 Sternen" % n, "%d of 5 stars" % n, lang)), "★" * n + "☆" * (5 - n), svc_badge,
                    esc(q["text"]), esc(q.get("place", SITE["city"])), esc(q["date"])))
        summary_box = ((('<div class="gr-score"><strong>%s</strong><div class="gr-stars" aria-hidden="true">%s</div></div>' % (esc(G["score"]), G["stars"]))
                        + '<p class="gr-count">%s</p>' % esc(t("%d Google-Bewertungen · Stand %s", "%d Google reviews · as of %s", lang) % (G["count"], G["date"]))) if G else "") + (
            '<div class="gr-summary"><p>%s</p><div class="actions" style="margin-top:10px">'
            '<a class="button arrow" href="%s" target="_blank" rel="noopener">%s</a>'
            '<a class="button primary" href="%s" target="_blank" rel="noopener">%s</a></div></div>'
        ) % (
            esc(t("Ausgewählte Bewertungen im Wortlaut. Wir prüfen nicht, ob die Verfasser unsere Leistungen tatsächlich genutzt haben; alle Bewertungen finden Sie bei Google.",
                  "Selected reviews, word for word. We do not check whether the authors actually used our services; you can find all reviews on Google.", lang) if review_cards else
                t("Alle Bewertungen stammen von unserem Google-Unternehmensprofil und sind dort öffentlich nachzulesen.",
                  "All reviews come from our Google Business Profile, where you can read them publicly.", lang)),
            (G["url"] if G else google_maps_url), t("Alle Bewertungen auf Google ↗", "All reviews on Google ↗", lang),
            (G["url"] if G else google_maps_url), t("Bewertung auf Google schreiben", "Write a Google review", lang))
        body += sec(" gr-section", head(
            t("Kundenstimmen", "Customer reviews", lang),
            t("Was Kunden über Stabil Umzug sagen", "What customers say about Stabil Umzug", lang),
            t("Bewertungen von Kunden aus Essen und dem Ruhrgebiet.", "Reviews from customers in Essen and the Ruhr area.", lang)
        ) + summary_box + ('<div class="gr-grid">%s</div>' % "".join(review_cards) if review_cards else ""))
    body += sec("", head(t("Häufige Fragen", "Common questions", lang), t("Kurz beantwortet.", "Briefly answered.", lang),
                         t("Was Familien uns vor dem Umzug am häufigsten fragen.", "What families ask us most often before a move.", lang)) + faq_html(lang, key))
    body += cta(key, lang)

    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": t(*q, lang), "acceptedAnswer": {"@type": "Answer", "text": t(*a, lang)}} for (q, a) in FAQ]}
    biz = {"@context": "https://schema.org", "@type": "MovingCompany", "name": SITE["company"], "url": SITE["domain"] + "/",
           "logo": {"@type": "ImageObject", "url": SITE.get("logo_url", SITE["domain"] + "/assets/img/og.png"), "caption": "Stabil Umzug Essen Logo"},
           "image": SITE.get("brand_images", [SITE["domain"] + "/assets/img/van-branded.jpg"]),
           "photo": [
               {"@type": "ImageObject", "url": SITE["domain"] + "/assets/img/van-branded.jpg", "caption": "Branded Mercedes Sprinter moving van – Stabil Umzug Essen"},
               {"@type": "ImageObject", "url": SITE["domain"] + "/assets/img/photos/loading-boxes.jpg", "caption": "Stabil Umzug crew loading boxes in van"},
               {"@type": "ImageObject", "url": SITE["domain"] + "/assets/img/photos/bed-assembly.jpg", "caption": "Furniture assembly service – Stabil Umzug Essen"},
               {"@type": "ImageObject", "url": SITE["domain"] + "/assets/img/photos/sofa-transport.jpg", "caption": "Professional sofa and furniture transport in Essen"},
               {"@type": "ImageObject", "url": SITE["domain"] + "/assets/img/photos/kitchen-assembly.jpg", "caption": "Kitchen assembly service Essen"},
               {"@type": "ImageObject", "url": SITE["domain"] + "/assets/img/photos/packing.jpg", "caption": "Careful packing of fragile household items"}
           ],
           "address": {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"], "addressLocality": SITE["city"],
                       "addressRegion": SITE["region"], "addressCountry": "DE"},
           "openingHoursSpecification": OPENING, "areaServed": AREA_SERVED, "inLanguage": ["de", "en"],
           "founder": SITE["owner"], "vatID": SITE["vat_id"],
           "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Leistungen", "itemListElement": [
               {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}} for n in ("Umzug", "Entrümpelung", "Wohnungsauflösung", "Transport")]}}
    if not is_ph(SITE["phone"]): biz["telephone"] = SITE["phone"]
    if not is_ph(SITE["email"]): biz["email"] = SITE["email"]
    biz["hasMap"] = SITE.get("maps_url", "https://maps.google.com/?q=Stabil+Umzug+Karlstra%C3%9Fe+32+45329+Essen")
    if SITE.get("geo"):   # exact position of the business, as on the Google profile
        biz["geo"] = {"@type": "GeoCoordinates", "latitude": SITE["geo"][0], "longitude": SITE["geo"][1]}
    if SITE.get("google_profile_url"):
        biz["sameAs"] = [SITE["google_profile_url"]]
    return dict(key=key, lang=lang, route=True, schema=[biz, faq_ld],
        title=t("Stabil Umzug Essen: Umzug planen und Angebot in 24 Std.", "Stabil Umzug Essen: plan your move, quote within 24 h", lang),
        desc=t("Umzugsunternehmen in Essen: Umzug online planen, Volumen, Fahrzeug und Team sofort sehen – persönliches Angebot in 24 Std. per WhatsApp oder E-Mail.",
               "Moving company in Essen: plan your move online, see volume, vehicle and crew right away – personal quote within 24 h via WhatsApp or email.", lang),
        body=body)
