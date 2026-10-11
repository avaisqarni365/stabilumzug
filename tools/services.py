"""Service pages, the price list and the free-quote form."""
from config import SITE, PRICES_PUBLISHED
from lib import esc, t, link, crumbs, GUIDES, SVC, is_ph, ph
from services_content import SERVICES
import prices_content as P

def eur(n, lang):
    return ("%s €" % format(n, ",").replace(",", ".")) if lang == "de" else ("€%s" % format(n, ","))

def price_text(v, lang):
    if v is None:
        return t("auf Anfrage", "on request", lang)
    if v == "offer":
        return t("individuelles Angebot", "individual quote", lang)
    if v == "agreed":
        return t("nach Vereinbarung", "by arrangement", lang)
    return t("ab ", "from ", lang) + eur(v, lang)

# ---------------------------------------------------------------- quote form (quote + contact pages)
SERVICE_OPTIONS = [("moves", "Umzug", "Move"), ("clearance", "Entrümpelung", "Clear-out"), ("dissolution", "Wohnungsauflösung", "Household clearance"),
                   ("transport", "Transport", "Transport"), ("other", "Sonstiges", "Other")]

def quote_form(key, lang):
    opt = lambda v, l: '<option value="%s">%s</option>' % (v, esc(l))
    f = lambda i, label, typ="text", ac="", wide=False, req=False: (
        '<div%s><label for="q-%s">%s%s</label><input id="q-%s" type="%s"%s%s></div>' % (
            ' class="wide"' if wide else "", i, esc(label), ' <span aria-hidden="true">*</span>' if req else "", i, typ,
            (' autocomplete="%s"' % ac) if ac else "", " required" if req else ""))
    rooms = "".join(opt(v, v) for v in ["1", "2", "3", "4", "5+"])
    return (
        '<form class="form" id="quote-form" novalidate>'
        '<div class="wide"><label for="q-service">%s</label><select id="q-service">%s</select></div>'
        + f("name", t("Name", "Name", lang), ac="name", req=True)
        + f("phone", t("Telefon / WhatsApp", "Phone / WhatsApp", lang), "tel", "tel")
        + f("email", t("E-Mail", "Email", lang), "email", "email")
        + '<div><label for="q-rooms">%s</label><select id="q-rooms"><option value="">–</option>%s</select></div>'
        + f("from", t("Startadresse", "Start address", lang), ac="street-address", wide=True)
        + f("to", t("Zieladresse (bei Umzug und Transport)", "Destination (for moves and transport)", lang), wide=True)
        + f("date", t("Wunschtermin", "Preferred date", lang), "date")
        + '<div class="wide"><label for="q-message">%s</label><textarea id="q-message"></textarea></div>'
        '<div class="hp" aria-hidden="true"><label>Website <input id="q-hp" type="text" tabindex="-1" autocomplete="off"></label></div>'
        '<label class="wide consent"><input type="checkbox" id="q-consent"> <span>%s <a href="%s">%s</a></span></label>'
        '<div class="wide actions"><button class="button primary" type="submit" id="quote-send">%s</button></div>'
        '<p class="wide msg" id="quote-msg" role="status" tabindex="-1"></p>'
        '</form>'
    ) % (t("Leistung", "Service", lang), "".join(opt(v, t(d, e, lang)) for v, d, e in SERVICE_OPTIONS),
         t("Zimmer", "Rooms", lang), rooms,
         t("Nachricht (optional): was, wie viel, Etage, Besonderheiten", "Message (optional): what, how much, floor, special items", lang),
         t("Ich bin einverstanden, dass Stabil Umzug meine Angaben speichert, um mir ein Angebot zu erstellen.",
           "I agree that Stabil Umzug stores my details to prepare a quote for me.", lang),
         link(key, "privacy", lang), t("Datenschutz", "Privacy", lang),
         t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang))

def contact_aside(lang, key):
    phone = '<a href="tel:%s">%s</a>' % (esc(SITE["phone_href"]), esc(SITE["phone"])) if SITE.get("phone_href") else ph(SITE["phone"])
    wa = '<li><b>WhatsApp</b><a href="https://wa.me/%s" rel="noopener">%s</a></li>' % (esc(SITE["whatsapp"]), t("Nachricht schreiben", "Send a message", lang)) if SITE.get("whatsapp") else ""
    email = '<a href="mailto:%s">%s</a>' % (esc(SITE["email"]), esc(SITE["email"])) if not is_ph(SITE["email"]) else ph(SITE["email"])
    return ('<ul class="contact-list"><li><b>%s</b>%s</li>%s<li><b>E-Mail</b>%s</li><li><b>%s</b>%s</li><li><b>%s</b>%s<br>%s %s</li></ul>'
            '<div class="planner-box" style="margin-top:24px"><span class="kicker">%s</span><p>%s</p><a class="button arrow" href="%s" style="border-color:var(--dark-line);color:var(--dark-ink)">%s</a></div>'
            % (t("Telefon", "Phone", lang), phone, wa, email, t("Erreichbar", "Hours", lang), ph(SITE["hours"]),
               t("Adresse", "Address", lang), ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]),
               t("Großer Umzug?", "Big move?", lang),
               t("Mit dem Umzugsplaner erfassen Sie Räume, Möbel und Zugang – und sehen sofort Volumen, Fahrzeug und Team.",
                 "With the moving planner you record rooms, furniture and access – and see volume, vehicle and crew right away.", lang),
               link(key, "planner", lang), t("Umzug online planen", "Plan your move online", lang)))

def quote_page(lang):
    from pages import page_head
    key = "quote"
    body = page_head(key, lang, t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang),
        t("Kurz ausfüllen – wir melden uns innerhalb von 24 Stunden mit Ihrem persönlichen, unverbindlichen Angebot. Lieber direkt sprechen? Rufen Sie an oder schreiben Sie per WhatsApp.",
          "Fill in briefly – we reply within 24 hours with your personal, non-binding quote. Prefer to talk? Call or message us on WhatsApp.", lang),
        kicker=t("Kostenlos und unverbindlich", "Free and non-binding", lang))
    body += ('<section class="section"><div class="container contact-grid"><div>%s</div><div>%s</div></div></section>' % (quote_form(key, lang), contact_aside(lang, key)))
    return dict(key=key, lang=lang, quote=True,
        title=t("Kostenloses Angebot: Umzug, Entrümpelung, Transport | Stabil Umzug Essen", "Free quote: moves, clear-outs, transport | Stabil Umzug Essen", lang),
        desc=t("Jetzt kostenloses Angebot anfordern: Umzug, Entrümpelung, Wohnungsauflösung oder Transport in Essen und im Ruhrgebiet. Antwort innerhalb von 24 Stunden.",
               "Request your free quote now: moves, clear-outs, household clearance or transport in Essen and the Ruhr area. Reply within 24 hours.", lang),
        body=body)

# ---------------------------------------------------------------- prices
def package_cards(key, lang):
    out = []
    for p in P.PACKAGES:
        name, sub, items = p[lang]
        price = ('<span class="from">%s</span>%s' % (t("ab", "from", lang), eur(p["price"], lang))) if p["price"] else t("Preis auf Anfrage", "Price on request", lang)
        out.append('<article class="pkg%s"><h3>%s</h3><p class="sub">%s</p><p class="price">%s</p><ul>%s</ul><a class="button %s" href="%s">%s</a></article>' % (
            " featured" if p.get("featured") else "", esc(name), esc(sub), price, "".join("<li>%s</li>" % esc(i) for i in items),
            "primary" if p.get("featured") else "arrow", link(key, "quote", lang) + "?service=moves", t("Angebot anfordern", "Request a quote", lang)))
    return '<div class="pkgs">%s</div>' % "".join(out)

def price_tables(key, lang):
    out = []
    for g in P.GROUPS:
        rows = "".join('<tr><th scope="row">%s</th><td>%s</td></tr>' % (esc(t(d, e, lang)), esc(price_text(v, lang))) for d, e, v in g["rows"])
        out.append('<div class="ptable"><h3>%s</h3><table>%s</table><a class="link-arrow" href="%s">%s</a></div>' % (
            esc(g[lang]), rows, link(key, SVC[g["service"]], lang), t("Zur Leistung", "About this service", lang)))
    extras = "".join("<li>%s</li>" % esc(t(d, e, lang)) for d, e in P.EXTRAS)
    out.append('<div class="ptable"><h3>%s</h3><ul class="checks">%s</ul><p class="small">%s</p></div>' % (
        t("Zusatzleistungen", "Extra services", lang), extras, t("Berechnung nach Aufwand und Vereinbarung.", "Charged by effort and arrangement.", lang)))
    return '<div class="ptables">%s</div>' % "".join(out)

def prices_page(lang):
    from pages import page_head, cta
    key = "prices"
    body = page_head(key, lang, t("Preise", "Prices", lang),
        t("Unsere Startpreise für Umzug, Entrümpelung, Wohnungsauflösung und Transport. Den verbindlichen Preis nennen wir im kostenlosen, persönlichen Angebot.",
          "Our starting prices for moves, clear-outs, household clearance and transport. We state the binding price in your free personal quote.", lang),
        kicker=t("Transparent und fair", "Transparent and fair", lang))
    if not PRICES_PUBLISHED:
        body = ('<p class="legal-flag" style="margin:0;border-radius:0">%s</p>' % t(
            "Vorschau – noch nicht veröffentlicht. Preise werden vor der Veröffentlichung anhand von Aufwand, Anfahrt, Mitarbeiterzahl und Entsorgungskosten geprüft.",
            "Preview – not published yet. Prices are checked against effort, travel, staff and disposal costs before publishing.", lang)) + body
    body += '<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>%s</div></section>' % (
        t("Umzugspakete", "Moving packages", lang), t("Das passende Paket für Ihren Umzug.", "The right package for your move.", lang),
        t("Alle Pakete mit eigenem Transporter und festem Team. Möbelmontage und Verpackung buchen Sie bei Bedarf dazu.",
          "All packages with our own transporter and a fixed crew. Add furniture assembly and packing if you need them.", lang), package_cards(key, lang))
    body += '<section class="section alt"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div>%s</div></section>' % (
        t("Weitere Leistungen", "More services", lang), t("Entrümpelung, Auflösung, Transport.", "Clear-outs, clearance, transport.", lang),
        t("Startpreise je Auftrag. Entsorgungskosten richten sich nach Menge und Art des Materials.",
          "Starting prices per job. Disposal costs depend on the amount and type of material.", lang), price_tables(key, lang))
    conds = "".join("<li>%s</li>" % esc(c) for c in P.CONDITIONS[lang])
    body += ('<section class="section"><div class="container narrow"><span class="kicker red">%s</span><h2 style="font-size:clamp(1.6rem,3vw,2.2rem);margin-bottom:16px">%s</h2>'
             '<ul class="checks">%s</ul><p class="ph">%s</p></div></section>') % (
        t("Preisbedingungen", "Price conditions", lang), t("So entsteht Ihr Preis.", "How your price is made.", lang), conds,
        t("[Bitte bestätigen: Alle Preise inkl. 19 % MwSt.]", "[Please confirm: all prices incl. 19 % VAT]", lang))
    body += cta(key, lang)
    return dict(key=key, lang=lang, noindex=not PRICES_PUBLISHED,
        title=t("Preise: Umzug, Entrümpelung, Transport in Essen | Stabil Umzug", "Prices: moves, clear-outs, transport in Essen | Stabil Umzug", lang),
        desc=t("Umzugspakete ab 249 €, Entrümpelung ab 149 €, Wohnungsauflösung ab 399 €, Transport ab 79 €. Startpreise – Ihr persönliches Angebot ist kostenlos.",
               "Moving packages from €249, clear-outs from €149, household clearance from €399, transport from €79. Starting prices – your personal quote is free.", lang),
        body=body)

# ---------------------------------------------------------------- service pages
LINK_RE = __import__("re").compile(r"\[\[([a-z]+)\|([^\]]+)\]\]")

def inline(text, key, lang):
    return LINK_RE.sub(lambda m: '<a href="%s">%s</a>' % (link(key, SVC.get(m.group(1), m.group(1)), lang), m.group(2)), esc(text))

def service_page(skey):
    def build(lang):
        from pages import cta
        key = SVC[skey]
        c = SERVICES[skey][lang]
        quote_href = link(key, "quote", lang) + ("?service=%s" % skey if skey != "extras" else "")
        head = ('<div class="page-head"><div class="container">%s<span class="kicker red">%s</span><h1>%s</h1><p class="lead">%s</p>'
                '<div class="actions" style="margin-top:28px"><a class="button primary" href="%s">%s</a>%s</div></div></div>') % (
            crumbs(key, lang, c["nav"], parent="services"), t("Stabil Umzug · Essen", "Stabil Umzug · Essen", lang), esc(c["title"]), inline(c["lead"], key, lang),
            quote_href, t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang),
            ('<a class="button arrow" href="tel:%s">%s %s</a>' % (esc(SITE["phone_href"]), t("Anrufen", "Call", lang), esc(SITE["phone"]))) if SITE.get("phone_href") else "")
        items = "".join('<div><h3>%s</h3><p>%s</p></div>' % (esc(a), inline(b, key, lang)) for a, b in c["items"])
        body = head + '<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p>%s</p></div><div class="costs svc">%s</div></div></section>' % (
            t("Leistungen", "Services", lang), esc(t("Was wir für Sie übernehmen.", "What we take care of.", lang)), esc(c["teaser"]), items)
        steps = "".join('<li><span class="n">%02d</span><h3>%s</h3><p>%s</p></li>' % (i + 1, esc(a), inline(b, key, lang)) for i, (a, b) in enumerate(c["process"]))
        incl = "".join("<li>%s</li>" % inline(x, key, lang) for x in c["included"])
        body += ('<section class="section alt"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p></p></div><ol class="steps-list">%s</ol>'
                 '<div class="split" style="margin-top:48px"><div><h3 style="font-size:1.5rem;margin-bottom:8px">%s</h3><ul class="checks">%s</ul></div>%s</div></div></section>') % (
            t("Ablauf", "How it works", lang), t("In vier Schritten erledigt.", "Done in four steps.", lang), steps,
            t("Typischerweise enthalten", "Typically included", lang), incl, price_hint(skey, key, lang))
        faq = "".join('<details><summary>%s</summary><div class="a"><p>%s</p></div></details>' % (esc(q), inline(a, key, lang)) for q, a in c["faq"])
        rel = "".join('<a class="tile" href="%s"><h3>%s</h3><p>%s</p><span class="link-arrow">%s</span></a>' % (
            link(key, g, lang), esc(GUIDES[g][lang]["nav"]), esc(GUIDES[g][lang]["teaser"]), t("Lesen", "Read", lang)) for g in c["guides"] if g in GUIDES)
        body += '<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p></p></div><div class="faq">%s</div></div></section>' % (
            t("Häufige Fragen", "Common questions", lang), esc(t("Kurz beantwortet.", "Briefly answered.", lang)), faq)
        if rel:
            body += '<section class="section alt"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div><p></p></div><div class="tiles">%s</div></div></section>' % (
                t("Ratgeber", "Guides", lang), esc(t("Gut vorbereitet.", "Well prepared.", lang)), rel)
        body += cta(key, lang)
        svc_ld = {"@context": "https://schema.org", "@type": "Service", "name": c["nav"], "serviceType": c["nav"], "description": c["desc"],
                  "areaServed": [{"@type": "City", "name": "Essen"}, {"@type": "Country", "name": "Deutschland"}],
                  "provider": {"@type": "MovingCompany", "name": SITE["company"], "telephone": SITE["phone"],
                               "address": {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"], "addressLocality": SITE["city"], "addressCountry": "DE"}}}
        faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": LINK_RE.sub(lambda m: m.group(2), a)}} for q, a in c["faq"]]}
        return dict(key=key, lang=lang, title=c["seo"], desc=c["desc"], body=body, schema=[svc_ld, faq_ld])
    return build

def price_hint(skey, key, lang):
    """Box beside 'typically included': starting price when prices are published, otherwise the free quote."""
    if PRICES_PUBLISHED:
        start = {"moves": 249, "clearance": 149, "dissolution": 399, "transport": 79}.get(skey)
        if start:
            return ('<div class="mock"><div class="top"><small>%s</small><strong>%s</strong></div><figcaption>%s <a href="%s">%s</a></figcaption></div>' % (
                t("Startpreis", "Starting price", lang), t("ab ", "from ", lang) + eur(start, lang),
                t("Endpreis nach Aufwand, Anfahrt und Entsorgung.", "Final price by effort, travel and disposal.", lang), link(key, "prices", lang), t("Alle Preise", "All prices", lang)))
    return ('<div class="mock"><div class="top"><small>%s</small><strong>%s</strong></div><figcaption>%s</figcaption></div>' % (
        t("Ihr Angebot", "Your quote", lang), t("Kostenlos in 24 Std.", "Free within 24 h", lang),
        t("Persönlich kalkuliert nach Menge, Etage, Anfahrt und Entsorgung – unverbindlich.", "Calculated personally by amount, floor, travel and disposal – non-binding.", lang)))

def services_overview(lang):
    from pages import page_head, cta
    key = "services"
    body = page_head(key, lang, t("Leistungen", "Services", lang),
        t("Umzüge, Entrümpelungen, Wohnungsauflösungen und Transporte aus Essen – im Ruhrgebiet und in ganz Deutschland. Alles aus einer Hand, mit eigenem Transporter und festem Team.",
          "Moves, clear-outs, household clearances and transport from Essen – across the Ruhr area and all of Germany. All from one team, with our own transporter and a fixed crew.", lang),
        kicker=t("Stabil Umzug · Essen", "Stabil Umzug · Essen", lang))
    body += '<section class="section"><div class="container">%s</div></section>' % service_tiles(key, lang, big=True)
    body += cta(key, lang)
    return dict(key=key, lang=lang,
        title=t("Leistungen: Umzug, Entrümpelung, Wohnungsauflösung, Transport | Stabil Umzug", "Services: moves, clear-outs, clearance, transport | Stabil Umzug", lang),
        desc=t("Umzugsunternehmen Essen: Privat- und Firmenumzüge, Entrümpelung, Wohnungsauflösung, Möbeltransport und Zusatzleistungen. Kostenloses Angebot in 24 Std.",
               "Moving company in Essen: private and business moves, clear-outs, household clearance, furniture transport and extra services. Free quote within 24 h.", lang),
        body=body)

def service_tiles(frm, lang, big=False):
    out = []
    for sk, s in SERVICES.items():
        c = s[lang]
        subs = ('<ul>%s</ul>' % "".join("<li>%s</li>" % esc(a) for a, _ in c["items"][:6])) if big else ""
        out.append('<a class="tile svc-tile" href="%s"><h3>%s</h3><p>%s</p>%s<span class="link-arrow">%s</span></a>' % (
            link(frm, SVC[sk], lang), esc(c["nav"]), esc(c["teaser"]), subs, t("Mehr erfahren", "Learn more", lang)))
    return '<div class="tiles%s">%s</div>' % (" svc-big" if big else "", "".join(out))
