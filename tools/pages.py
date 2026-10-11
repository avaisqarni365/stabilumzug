"""Page bodies (German + English) part 1: home, services, planner, contact."""
from config import SITE, SERVICES_ENABLED, TESTIMONIALS
from lib import esc, t, link, url_of, crumbs, ph, is_ph, prefix_for, path_of

def page_head(key, lang, title, lead, label=None):
    return ('<div class="page-head"><div class="container narrow">%s<h1>%s</h1><p class="lead">%s</p></div></div>'
            % (crumbs(key, lang, label or title), esc(title), esc(lead)))

def cta(key, lang, h=None, p=None):
    h = h or t("Bereit für Ihren Umzug?", "Ready to move?", lang)
    p = p or t("Planen Sie in wenigen Minuten und senden Sie uns die Zusammenfassung.",
               "Plan it in a few minutes and send us the summary.", lang)
    return ('<section class="cta"><div class="container row"><div><h2>%s</h2><p>%s</p></div>'
            '<div class="actions"><a class="button primary" href="%s">%s</a><a class="button ghost" href="%s">%s</a></div></div></section>'
            % (esc(h), esc(p), link(key, "planner", lang), t("Umzug planen", "Plan your move", lang),
               link(key, "contact", lang), t("Direkt anfragen", "Contact us", lang)))

# ---------------------------------------------------------------- services
SERVICES = {
    "private": ("Privatumzug", "Private move",
        "Von der Einzimmerwohnung bis zum Haus: Wir tragen, laden, fahren und stellen auf.",
        "From a one-room flat to a house: we carry, load, drive and set down."),
    "business": ("Büro- und Gewerbeumzug", "Office and business move",
        "Arbeitsplätze, Akten und Technik so umziehen, dass der Betrieb schnell weiterläuft.",
        "Desks, files and equipment moved so work can resume quickly."),
    "packing": ("Verpackung und Kartons", "Packing and boxes",
        "Umzugskartons in passenden Größen und auf Wunsch Packhilfe für Geschirr, Bücher und Kleidung.",
        "Moving boxes in suitable sizes and, on request, help packing dishes, books and clothes."),
    "assembly": ("Möbelmontage", "Furniture assembly",
        "Schränke, Betten und Regale abbauen und am neuen Ort wieder aufbauen.",
        "Wardrobes, beds and shelves taken apart and rebuilt at the new place."),
    "kitchen": ("Küchen ab- und aufbauen", "Kitchen dismantling and fitting",
        "Küchenmöbel abbauen, transportieren und aufbauen. Anschlüsse für Wasser und Strom nach Absprache.",
        "Kitchen units taken down, moved and fitted. Water and electrical connections by arrangement."),
    "disposal": ("Entrümpelung und Entsorgung", "Clearance and disposal",
        "Altes, das nicht mitziehen soll, sortieren und abholen lassen.",
        "Sort and collect what should not move with you."),
    "parking": ("Halteverbotszone", "Parking permit",
        "Wir unterstützen bei der Beantragung, damit der Wagen am Umzugstag direkt vor der Tür stehen kann.",
        "We help with the application so the van can stand right at the door on moving day."),
    "storage": ("Zwischenlagerung", "Temporary storage",
        "Wenn der Einzug später ist als der Auszug: Möbel sicher zwischenlagern.",
        "When you move in later than you move out: safe storage for your furniture."),
    "restoration": ("Übergabe und Endreinigung", "Handover and final cleaning",
        "Wohnung besenrein oder gründlich gereinigt an Vermieter oder Nachmieter übergeben.",
        "Hand the flat back clean to your landlord or the next tenant."),
}

def services_tiles(key, lang, limit=None):
    out = []
    for k, (dt, et, dd, ed) in SERVICES.items():
        if not SERVICES_ENABLED.get(k):
            continue
        out.append('<article class="tile"><h3>%s</h3><p>%s</p></article>' % (esc(t(dt, et, lang)), esc(t(dd, ed, lang))))
        if limit and len(out) >= limit:
            break
    return '<div class="tiles">%s</div>' % "".join(out)

def services(lang):
    key = "services"
    body = page_head(key, lang, t("Leistungen", "Services", lang),
        t("Alles rund um den Umzug aus einer Hand. Nicht jeder braucht jede Leistung: Im Planer wählen Sie, was Sie brauchen.",
          "Everything around a move from one team. Nobody needs every service: choose what you need in the planner.", lang))
    body += '<section class="section"><div class="container">%s</div></section>' % services_tiles(key, lang)
    body += cta(key, lang)
    return dict(key=key, lang=lang,
        title=t("Leistungen | Stabil Umzug Essen", "Services | Stabil Umzug Essen", lang),
        desc=t("Privat- und Gewerbeumzug, Verpackung, Möbel- und Küchenmontage, Entsorgung und mehr. Stabil Umzug in Essen.",
               "Private and business moves, packing, furniture and kitchen assembly, disposal and more. Stabil Umzug in Essen.", lang),
        body=body)

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
    key = "contact"
    body = page_head(key, lang, t("Kontakt", "Contact", lang),
        t("Schreiben Sie uns kurz, wohin es geht. Wir melden uns zur Abstimmung.",
          "Tell us briefly where you are moving. We will get back to you.", lang))
    phone = ph(SITE["phone"]) if not SITE["phone_href"] else '<a href="tel:%s">%s</a>' % (esc(SITE["phone_href"]), esc(SITE["phone"]))
    email = ph(SITE["email"]) if is_ph(SITE["email"]) else '<a href="mailto:%s">%s</a>' % (esc(SITE["email"]), esc(SITE["email"]))
    f = lambda i, l, typ="text", req=False, wide=False: (
        '<div%s><label for="%s">%s</label><input id="%s" type="%s"%s></div>' % (' class="wide"' if wide else "", i, l, i, typ, " required" if req else ""))
    form = (
        '<form class="form" id="contact-form" novalidate>'
        + f("c-name", t("Name", "Name", lang), req=True)
        + f("c-contact", t("Telefon oder E-Mail", "Phone or email", lang), req=True)
        + f("c-from", t("Von (Ort/Adresse)", "From (place/address)", lang))
        + f("c-to", t("Nach (Ort/Adresse)", "To (place/address)", lang))
        + f("c-date", t("Wunschtermin", "Preferred date", lang), "date")
        + '<div class="wide"><label for="c-note">%s</label><textarea id="c-note"></textarea></div>' % t("Anmerkungen", "Notes", lang)
        + '<div class="wide actions"><button class="button primary" type="button" id="send-mail">%s</button>'
          '<button class="button ghost" type="button" id="send-wa">%s</button></div>'
          '<p class="wide msg" id="contact-msg" role="status"></p>' % (t("Per E-Mail senden", "Send by email", lang), t("Per WhatsApp senden", "Send by WhatsApp", lang))
        + '</form>')
    note = t("Die Buttons öffnen Ihr E-Mail-Programm oder WhatsApp mit einem vorbereiteten Text. Es wird nichts über unsere Website gesendet.",
             "The buttons open your email app or WhatsApp with a prepared text. Nothing is sent through our website.", lang)
    side = ('<ul class="contact-list"><li><b>%s</b>%s</li><li><b>%s</b>%s</li><li><b>%s</b>%s<br>%s %s</li><li><b>%s</b>%s</li></ul>'
            % (t("Telefon", "Phone", lang), phone, "E-Mail", email, t("Adresse", "Address", lang), ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]),
               t("Erreichbar", "Hours", lang), ph(SITE["hours"])))
    body += ('<section class="section"><div class="container contact-grid"><div>%s<p class="msg">%s</p>'
             '<p>%s <a href="%s">%s</a></p></div><div>%s</div></div></section>'
             % (form, esc(note), t("Mehr Details zum Umzug?", "More details about your move?", lang), link(key, "planner", lang),
                t("Nutzen Sie den Umzugsplaner.", "Use the moving planner.", lang), side))
    return dict(key=key, lang=lang,
        title=t("Kontakt und Anfrage | Stabil Umzug Essen", "Contact and request | Stabil Umzug Essen", lang),
        desc=t("Umzugsanfrage an Stabil Umzug in Essen: Telefon, E-Mail oder WhatsApp.", "Send a moving request to Stabil Umzug in Essen by phone, email or WhatsApp.", lang),
        body=body)

# ---------------------------------------------------------------- home
FAQ = [
    (("Was kostet ein Umzug?", "What does a move cost?"),
     ("Der Preis hängt vor allem von Volumen, Entfernung, Etagen, Aufzug und gewünschten Zusatzleistungen ab. Mit dem Umzugsplaner erfassen Sie diese Angaben und senden uns die Zusammenfassung. Auf dieser Basis erstellen wir ein Angebot.",
      "The price depends mostly on volume, distance, floors, lift and the extra services you want. The planner collects these details and you send us the summary. We base our quote on it.")),
    (("In welchen Gebieten sind Sie tätig?", "Which areas do you cover?"),
     ("Wir sitzen in Essen und ziehen im Ruhrgebiet und in ganz Deutschland um. Fragen Sie uns bei weiten Strecken nach der Planung.",
      "We are based in Essen and move people across the Ruhr area and all of Germany. Ask us about planning for long distances.")),
    (("Wie genau ist die Schätzung im Planer?", "How accurate is the planner estimate?"),
     ("Der Planer rechnet mit typischen Werten für Möbel und Kartons und einem Puffer von 10 Prozent. Er zeigt eine Größenordnung für Volumen, Fahrzeug und Team. Das verbindliche Angebot folgt nach Rücksprache oder Besichtigung.",
      "The planner uses typical values for furniture and boxes plus a 10 percent buffer. It gives an order of magnitude for volume, vehicle and crew. The binding quote follows after we talk or view the flat.")),
    (("Brauche ich eine Halteverbotszone?", "Do I need a parking permit zone?"),
     ("Wenn der Umzugswagen nicht legal direkt vor dem Haus halten kann, ist sie oft sinnvoll. Sie wird bei der zuständigen Behörde beantragt, die Vorlaufzeit unterscheidet sich je nach Stadt. Mehr dazu in unserem Ratgeber.",
      "If the van cannot legally stop right at the building, one is often worth it. It is applied for at the responsible authority and lead times differ by city. See our guide.")),
    (("Sind meine Möbel versichert?", "Is my furniture insured?"),
     ("[Versicherungsschutz und Haftungsgrenzen: Angaben des Unternehmens eintragen]",
      "[Insurance cover and liability limits: company to fill in]")),
    (("Wie früh sollte ich buchen?", "How early should I book?"),
     ("So früh wie möglich, besonders zum Monatsende und in den Ferien. Ein Termin nach Absprache ist oft auch kurzfristig möglich, eine Zusage hängt von der Auslastung ab.",
      "As early as you can, especially at month end and in holidays. Short notice can work too, but depends on our schedule.")),
]

def faq_html(lang, key):
    items = []
    for (q, a) in FAQ:
        ans = t(a[0], a[1], lang)
        ans_html = ('<p>%s</p>' % ph(ans)) if is_ph(ans) else '<p>%s</p>' % esc(ans)
        if "Halteverbotszone" in a[0] or "parking permit" in a[1]:
            ans_html = '<p>%s <a href="%s">%s</a></p>' % (esc(ans.rsplit(".", 2)[0] + "."), link(key, "parking", lang), t("Zum Ratgeber", "To the guide", lang))
        items.append('<details><summary>%s</summary><div class="a">%s</div></details>' % (esc(t(*q, lang)), ans_html))
    return '<div class="faq">%s</div>' % "".join(items)

def crate_svg(lang):
    rooms = [("Küche", "Kitchen"), ("Bad", "Bathroom"), ("Kinder", "Kids"), ("Büro", "Office"), ("Keller", "Cellar")]
    pos = [(10, 20), (118, 20), (226, 20), (64, 108), (172, 108)]
    parts = []
    for i, ((de, en), (x, y)) in enumerate(zip(rooms, pos)):
        fill = 'fill="#F2A900"' if i == 0 else 'fill="none" stroke="#F3F6F8" stroke-width="3"'
        txt = "#14222C" if i == 0 else "#F3F6F8"
        parts.append('<g><rect x="%d" y="%d" width="98" height="78" rx="6" %s/><path d="M%d %dh98" stroke="%s" stroke-width="2" opacity=".5"/>'
                     '<text x="%d" y="%d" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="600" font-size="15" fill="%s">%s</text></g>'
                     % (x, y, fill, x + 0, y + 20, txt, x + 49, y + 52, txt, t(de, en, lang)))
    return ('<svg viewBox="0 0 334 196" role="img" aria-label="%s" class="crates">%s</svg>'
            % (t("Fünf Umzugskisten: Küche, Bad, Kinder, Büro, Keller", "Five moving crates: kitchen, bathroom, kids, office, cellar", lang), "".join(parts)))

def home(lang):
    key = "home"
    L = lambda k: link(key, k, lang)
    hero = (
        '<section class="hero"><div class="container grid"><div>'
        '<h1>%s</h1><p class="lead">%s</p>'
        '<div class="actions"><a class="button primary" href="%s">%s</a><a class="button ghost" href="%s">%s</a></div>'
        '<ul class="facts"><li>%s</li><li>%s</li><li>%s</li></ul></div>'
        '<figure>%s<div class="est-card"><span class="tag">%s</span>'
        '<dl><dt>%s</dt><dd>13 m³</dd><dt>%s</dt><dd>%s</dd><dt>%s</dt><dd>%s</dd></dl></div>'
        '<figcaption>%s</figcaption></figure></div></section>'
    ) % (
        t("Umzug in Essen und ganz Deutschland. <em>Stabil</em> geplant.", "Moving in Essen and all over Germany. Planned <em>stable</em>.", lang),
        esc(t("Erfassen Sie Ihre Räume und Möbel online. Sie sehen, welches Fahrzeug und wie viele Helfer sinnvoll sind, und senden uns die Zusammenfassung per WhatsApp oder E-Mail.",
              "Record your rooms and furniture online. See which vehicle and how many helpers make sense, and send us the summary via WhatsApp or email.", lang)),
        L("planner"), t("Umzug planen", "Plan your move", lang), L("contact"), t("Anfrage senden", "Send a request", lang),
        t("Ohne Konto, ohne Cookies", "No account, no cookies", lang), t("Deutsch und Englisch", "German and English", lang), t("Aus Essen", "Based in Essen", lang),
        crate_svg(lang), t("Beispiel", "Example", lang),
        t("Volumen", "Volume", lang), t("Fahrzeug", "Vehicle", lang), t("Großer Transporter", "Large van", lang),
        t("Team", "Crew", lang), t("2 Personen", "2 people", lang),
        t("Beispielrechnung für eine kleine Wohnung, kein Angebot.", "Sample calculation for a small flat, not a quote.", lang))
    steps = [
        (("Planen", "Plan"), ("Räume, Möbel und Zugang erfassen.", "Record rooms, furniture and access.")),
        (("Angebot", "Quote"), ("Sie senden uns die Zusammenfassung, wir melden uns.", "You send us the summary and we reply.")),
        (("Vorbereiten", "Prepare"), ("Kartons, Halteverbot, Ummeldung, Kündigungen.", "Boxes, parking permit, registration, cancellations.")),
        (("Umzugstag", "Moving day"), ("Abbau, Verladen, Fahrt, Aufbau.", "Dismantle, load, drive, assemble.")),
        (("Ankommen", "Arrive"), ("Anmelden, Übergabe, Kartons auspacken.", "Register, hand over, unpack.")),
    ]
    steps_html = "".join('<li><div class="n">%d</div><h3>%s</h3><p>%s</p></li>' % (i + 1, esc(t(*s[0], lang)), esc(t(*s[1], lang))) for i, s in enumerate(steps))
    sec = lambda cls, inner: '<section class="section%s"><div class="container">%s</div></section>' % (cls, inner)
    head = lambda h, p="": '<div class="head"><h2>%s</h2>%s</div>' % (esc(h), ('<p>%s</p>' % esc(p)) if p else "")
    body = hero
    body += sec("", head(t("So läuft ein Umzug mit uns", "How a move with us works", lang),
                         t("Fünf Schritte, in dieser Reihenfolge.", "Five steps, in this order.", lang)) + '<ol class="steps-list">%s</ol>' % steps_html)
    body += sec(" alt", head(t("Leistungen", "Services", lang)) + services_tiles(key, lang, 6)
                + '<p><a class="button ghost" href="%s">%s</a></p>' % (L("services"), t("Alle Leistungen", "All services", lang)))
    body += sec("", '<div class="split"><div>%s<ul class="checks"><li>%s</li><li>%s</li><li>%s</li></ul><a class="button primary" href="%s">%s</a></div><div>%s</div></div>' % (
        head(t("Der Umzugsplaner", "The moving planner", lang)),
        esc(t("Zimmer und Gegenstände aus einer Liste wählen", "Pick rooms and items from a list", lang)),
        esc(t("Volumen, Fahrzeug und Team als Schätzung", "Volume, vehicle and crew as an estimate", lang)),
        esc(t("Zusammenfassung per WhatsApp oder E-Mail senden", "Send the summary via WhatsApp or email", lang)),
        L("planner"), t("Planer öffnen", "Open the planner", lang), '<div class="panel-dark">%s</div>' % crate_svg(lang)))
    if TESTIMONIALS:
        quotes = "".join('<article class="tile"><p>“%s”</p><p><b>%s</b></p></article>' % (esc(q["text"]), esc(q["name"])) for q in TESTIMONIALS)
        body += sec(" alt", head(t("Kundenstimmen", "Reviews", lang)) + '<div class="tiles">%s</div>' % quotes)
    body += sec(" alt", head(t("Ratgeber", "Guides", lang), t("Kurz erklärt, was vor und nach dem Umzug zu tun ist.", "A short explanation of what to do before and after the move.", lang))
                + '<div class="tiles">%s</div>' % "".join(
                    '<article class="tile"><h3>%s</h3><p>%s</p><a class="more" href="%s">%s</a></article>' % (esc(t(a, b, lang)), esc(t(c, d, lang)), L(k), t("Lesen", "Read", lang))
                    for (k, a, b, c, d) in [
                        ("checklist", "Umzugscheckliste", "Moving checklist", "Was wann zu erledigen ist.", "What to do and when."),
                        ("parking", "Halteverbotszone", "Parking permit", "So kommt der Wagen vor die Tür.", "How to get the van to the door."),
                        ("register", "Ummeldung", "Registration", "Fristen und Unterlagen nach dem Einzug.", "Deadlines and documents after moving in.")]))
    body += sec("", head(t("Häufige Fragen", "Common questions", lang)) + faq_html(lang, key))
    body += cta(key, lang)

    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": t(*q, lang), "acceptedAnswer": {"@type": "Answer", "text": t(*a, lang)}}
        for (q, a) in FAQ if not t(*a, lang).startswith("[")]}
    biz = {"@context": "https://schema.org", "@type": "MovingCompany", "name": SITE["company"], "url": SITE["domain"] + "/",
           "address": {"@type": "PostalAddress", "addressLocality": SITE["city"], "addressRegion": SITE["region"], "addressCountry": "DE"},
           "areaServed": "DE", "inLanguage": ["de", "en"]}
    if not is_ph(SITE["phone"]): biz["telephone"] = SITE["phone"]
    if not is_ph(SITE["email"]): biz["email"] = SITE["email"]
    return dict(key=key, lang=lang, schema=[biz, faq_ld],
        title=t("Stabil Umzug Essen: Umzug planen und anfragen", "Stabil Umzug Essen: plan and request your move", lang),
        desc=t("Umzug in Essen und ganz Deutschland. Räume und Möbel im Planer erfassen, Volumen und Fahrzeug schätzen, Zusammenfassung per WhatsApp oder E-Mail senden.",
               "Moving in Essen and all over Germany. Record rooms and furniture, estimate volume and vehicle, send the summary via WhatsApp or email.", lang),
        body=body)
