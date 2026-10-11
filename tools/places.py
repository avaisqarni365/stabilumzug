"""Local landing pages (Essen districts, nearby cities) and the "Einsatzgebiet" band in the footer."""
from config import SITE
from lib import esc, t, link, crumbs, prefix_for, SVC
from places_content import PLACES, route, page_key, display

BY_NAME = {p[1]: p for p in PLACES}

def band(km, lang):
    """Planning notes by distance – these differ by place because the measured distances differ."""
    if km is None:
        return []
    if km <= 12:
        return [t("Kurze Anfahrt: Kurzfristige Termine sind oft möglich, auch mehrere Fahrten an einem Tag.",
                  "Short trip: short-notice dates are often possible, even several runs in one day.", lang),
                t("Kleine Aufträge wie einzelne Möbel oder eine Kellerentrümpelung lohnen sich hier besonders.",
                  "Small jobs such as single pieces of furniture or a cellar clear-out are especially worthwhile here.", lang)]
    if km <= 30:
        return [t("Anfahrt und Rückfahrt sind im Tagesplan eingerechnet – der Umzug ist an einem Tag erledigt.",
                  "Travel there and back is part of the day plan – the move is done in one day.", lang),
                t("Wir starten so, dass das Team vor dem Berufsverkehr an der ersten Adresse ist.",
                  "We start so the crew reaches the first address before rush hour.", lang)]
    return [t("Bei dieser Entfernung starten wir früh und planen einen Puffer für den Verkehr ein.",
              "At this distance we start early and allow a buffer for traffic.", lang),
            t("Halteverbotszonen an beiden Adressen sind besonders wichtig, damit keine Wartezeit entsteht.",
              "No-parking zones at both addresses are especially important so there is no waiting time.", lang)]

def place_page(p):
    key_, name, group, neighbours, note = p
    key = page_key(key_)
    def build(lang):
        from pages import cta
        km, mins = route(name)
        full = display(name, group, lang)
        city = "Essen" if group == "essen" else name
        photo = "essen-zollverein.jpg" if group == "essen" else "loading-boxes.jpg"
        pre = prefix_for(key, lang)
        trip = (t("%s km · ca. %s Min. von unserem Standort in Essen-Altenessen", "%s km · approx. %s min from our depot in Essen-Altenessen", lang) % (km, mins)) if km is not None else ""
        head = ('<div class="page-head ph-photo"><div class="container"><div class="ph-text">%s<span class="kicker red">%s</span><h1>%s</h1><p class="lead">%s</p>'
                '<div class="actions" style="margin-top:24px"><a class="button primary" href="%s">%s</a><a class="button arrow" href="tel:%s">%s</a></div></div>'
                '<figure class="ph-img"><img src="%sassets/img/photos/%s" alt="%s" fetchpriority="high" width="1600" height="1067"></figure></div></div>') % (
            crumbs(key, lang, full, parent="essen" if group == "essen" else None),
            esc(trip), esc(t("Umzug %s", "Moving in %s", lang) % full),
            esc(t("Umzüge, Entrümpelungen, Wohnungsauflösungen und Transporte in %s – mit festem Team, eigenem Transporter und kostenlosem Angebot innerhalb von 24 Stunden.",
                  "Moves, clear-outs, household clearances and transport in %s – with a fixed crew, our own van and a free quote within 24 hours.", lang) % full),
            link(key, "quote", lang), t("Jetzt kostenloses Angebot anfordern", "Request your free quote now", lang),
            esc(SITE["phone_href"]), esc(t("Anrufen: ", "Call: ", lang) + SITE["phone"]),
            pre, photo, esc(t("Umzug in %s", "Moving in %s", lang) % full))
        facts = [(t("Entfernung", "Distance", lang), ("%s km" % km) if km is not None else "–"),
                 (t("Fahrzeit", "Drive time", lang), (t("ca. %s Min.", "approx. %s min", lang) % mins) if mins is not None else "–"),
                 (t("Angebot", "Quote", lang), t("in 24 Std.", "within 24 h", lang)),
                 (t("Erreichbar", "Reachable", lang), t("7 Tage", "7 days", lang))]
        strip = '<ul class="facts light">%s</ul>' % "".join('<li><b>%s</b>%s</li>' % (esc(v), esc(k)) for k, v in facts)
        tips = [t(*note, lang)] + band(km, lang) + [
            t("Für eine Halteverbotszone in %s ist die Straßenverkehrsbehörde der Stadt %s zuständig – auf Wunsch beantragen wir sie für Sie.",
              "A no-parking zone in %s is issued by the traffic authority of the City of %s – on request we apply for it for you.", lang) % (full, city)]
        nb = []
        for n in neighbours:
            if n in BY_NAME:
                q = BY_NAME[n]
                nb.append('<li><a href="%s">%s</a></li>' % (link(key, page_key(q[0]), lang), esc(display(n, q[2], lang))))
            else:
                nb.append('<li>%s</li>' % esc(n))
        svc = [("moves", t("Umzug %s", "Moving in %s", lang)), ("clearance", t("Entrümpelung %s", "Clear-out in %s", lang)),
               ("dissolution", t("Wohnungsauflösung %s", "Household clearance in %s", lang)), ("transport", t("Möbeltransport %s", "Furniture transport in %s", lang))]
        svc_html = "".join('<a class="tile" href="%s"><h3>%s</h3><span class="link-arrow">%s</span></a>' % (
            link(key, SVC[k], lang), esc(lbl % name), t("Mehr erfahren", "Learn more", lang)) for k, lbl in svc)
        faq = [
            (t("Was kostet ein Umzug in %s?", "What does a move in %s cost?", lang) % full,
             t("Der Preis hängt von Menge, Etage, Aufzug, Tragewegen und Entfernung ab. Wir rechnen jede Position persönlich und senden Ihnen das kostenlose Angebot innerhalb von 24 Stunden.",
               "The price depends on the amount, floor, lift, carrying distance and distance. We calculate every line personally and send you the free quote within 24 hours.", lang)),
            (t("Wie schnell sind Sie in %s?", "How quickly can you be in %s?", lang) % full,
             (t("Von unserem Standort in der Karlstraße 32 sind es %s km, laut Google Maps etwa %s Minuten Fahrt – im Berufsverkehr länger.",
                "From our depot at Karlstraße 32 it is %s km, about %s minutes by car according to Google Maps – longer in rush hour.", lang) % (km, mins)) if km is not None else ""),
            (t("Übernehmen Sie auch Entrümpelungen und Transporte in %s?", "Do you also do clear-outs and transport in %s?", lang) % full,
             t("Ja. Neben Umzügen räumen wir Keller, Dachböden und ganze Wohnungen und transportieren einzelne Möbel – in %s und im ganzen Ruhrgebiet.",
               "Yes. Besides moves we clear cellars, attics and whole flats and transport single pieces of furniture – in %s and across the Ruhr area.", lang) % full),
        ]
        faq_html = "".join('<details><summary>%s</summary><div class="a"><p>%s</p></div></details>' % (esc(q), esc(a)) for q, a in faq if a)
        body = head + '<section class="section"><div class="container">%s</div></section>' % strip
        body += ('<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div></div>'
                 '<div class="split"><div><ul class="checks" style="margin-top:0">%s</ul></div>'
                 '<div><span class="kicker">%s</span><ul class="places">%s</ul></div></div></div></section>') % (
            t("Vor Ort", "Local", lang), esc(t("Ihr Umzug in %s.", "Your move in %s.", lang) % full),
            "".join("<li>%s</li>" % esc(x) for x in tips), esc(t("Auch in der Nähe", "Also nearby", lang)), "".join(nb))
        body += '<section class="section alt"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div></div><div class="tiles two">%s</div></div></section>' % (
            t("Leistungen", "Services", lang), esc(t("Was wir in %s übernehmen.", "What we handle in %s.", lang) % name), svc_html)
        body += '<section class="section"><div class="container"><div class="head"><div><span class="kicker red">%s</span><h2>%s</h2></div></div><div class="faq">%s</div></div></section>' % (
            t("Häufige Fragen", "Common questions", lang), esc(t("Umzug %s: kurz beantwortet.", "Moving in %s: briefly answered.", lang) % full), faq_html)
        body += cta(key, lang)
        ld = [{"@context": "https://schema.org", "@type": "Service", "serviceType": t("Umzug", "Moving", lang), "name": t("Umzug %s", "Moving in %s", lang) % full,
               "areaServed": {"@type": "Place", "name": full},
               "provider": {"@type": "MovingCompany", "name": SITE["company"], "telephone": SITE["phone"],
                            "address": {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"], "addressLocality": SITE["city"], "addressCountry": "DE"}}},
              {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                  {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq if a]}]
        return dict(key=key, lang=lang, schema=ld,
                    title=t("Umzug %s – Umzugsunternehmen | Stabil Umzug", "Moving in %s – removal company | Stabil Umzug", lang) % full,
                    desc=(t("Umzugsunternehmen für %s: Umzug, Entrümpelung, Wohnungsauflösung, Transport. %s km von unserem Standort Essen-Altenessen. Kostenloses Angebot in 24 Std.",
                            "Removal company for %s: moves, clear-outs, household clearance, transport. %s km from our depot in Essen-Altenessen. Free quote within 24 h.", lang) % (full, km)),
                    body=body)
    return build

def area_band(frm, lang):
    """Footer band: every place as a chip with its drive time, in two tabs (both lists visible without JavaScript)."""
    def chips(group):
        out = []
        for key_, name, g, _, _ in PLACES:
            if (group == "essen") != (g == "essen"):
                continue
            km, mins = route(name)
            out.append('<li><a href="%s"><span>%s</span><small>%s</small></a></li>' % (
                link(frm, page_key(key_), lang), esc(name), esc((t("%s Min.", "%s min", lang) % mins) if mins is not None else "")))
        return "".join(out)
    return ('<section class="areas" aria-labelledby="areas-h"><div class="container">'
            '<div class="areas-head"><div><span class="kicker">%s</span><h2 id="areas-h">%s</h2></div>'
            '<div class="areas-tabs" role="tablist"><button role="tab" aria-selected="true" aria-controls="areas-essen" data-tab="areas-essen">%s</button>'
            '<button role="tab" aria-selected="false" aria-controls="areas-ruhr" data-tab="areas-ruhr">%s</button></div></div>'
            '<ul class="areas-list" id="areas-essen" role="tabpanel">%s</ul><ul class="areas-list" id="areas-ruhr" role="tabpanel">%s</ul>'
            '<p class="areas-note">%s <a href="%s">%s</a></p></div></section>') % (
        t("Einsatzgebiet", "Service area", lang), t("Umzug in Essen, im Ruhrgebiet und in ganz NRW", "Moving in Essen, the Ruhr area and all of NRW", lang),
        t("Essen", "Essen", lang), t("Ruhrgebiet & NRW", "Ruhr area & NRW", lang), chips("essen"), chips("city"),
        t("Fahrzeiten ab Karlstraße 32, 45329 Essen. Ihr Ort fehlt? Wir ziehen deutschlandweit um –", "Drive times from Karlstraße 32, 45329 Essen. Your town is missing? We move people all over Germany –", lang),
        link(frm, "quote", lang), t("einfach anfragen.", "just ask.", lang))
