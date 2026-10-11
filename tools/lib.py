"""Layout helpers for the Stabil Umzug static site generator."""
import html, json
from config import SITE
from guides_content import GUIDES
from services_content import SERVICES
from config import PRICES_PUBLISHED
from places_content import PLACES, paths as place_paths, page_key as place_key

def esc(s):
    return html.escape(str(s), quote=True)

def t(de, en, lang):
    return de if lang == "de" else en

# key -> (German path, English path). Paths are folders ("" = root).
PAGES = {
    "home":      ("", "en/"),
    "services":  ("leistungen/", "en/services/"),
    "planner":   ("umzugsplaner/", "en/moving-planner/"),
    "guides":    ("ratgeber/", "en/guides/"),
    "essen":     ("umzug-essen/", "en/moving-essen/"),
    "contact":   ("kontakt/", "en/contact/"),
    "about":     ("ueber-uns/", "en/about-us/"),
    "imprint":   ("impressum/", "en/imprint/"),
    "quote":     ("angebot/", "en/free-quote/"),
    "admin":     ("admin/", "en/admin/"),
    "portal":    ("mein-umzug/", "en/my-move/"),
    "prices":    ("preise/", "en/prices/"),
    "privacy":   ("datenschutz/", "en/privacy/"),
}
for _k, _g in GUIDES.items():
    PAGES[_k] = _g["paths"]
# service pages: page key "svc_<name>"; SVC maps content keys (and inline-link keys) to page keys
SVC = {"quote": "quote", "planner": "planner", "contact": "contact", "prices": "prices", "services": "services"}
for _k, _s in SERVICES.items():
    PAGES["svc_" + _k] = _s["paths"]
    SVC[_k] = "svc_" + _k
for _p in PLACES:
    PAGES[place_key(_p[0])] = place_paths(_p[0], _p[2])

# The ten steps of a move, in order (guide keys with a step number), and the topic guides.
JOURNEY = sorted([k for k, g in GUIDES.items() if g["step"]], key=lambda k: GUIDES[k]["step"])
TOPICS = [k for k, g in GUIDES.items() if not g["step"]]
GUIDE_KEYS = set(GUIDES)

def path_of(key, lang):
    return PAGES[key][0 if lang == "de" else 1]

def url_of(key, lang):
    return SITE["domain"] + "/" + path_of(key, lang)

def prefix_for(key, lang):
    depth = len([p for p in path_of(key, lang).split("/") if p])
    return "../" * depth

def link(frm_key, to_key, lang, to_lang=None):
    """Relative link from page (frm_key, lang) to page (to_key, to_lang)."""
    to_lang = to_lang or lang
    p = prefix_for(frm_key, lang) + path_of(to_key, to_lang)
    return p or "./"

NAV = ["services"] + (["prices"] if PRICES_PUBLISHED else []) + ["planner", "guides", "about", "contact"]
NAV_LABEL = {
    "services": ("Leistungen", "Services"),
    "planner": ("Umzugsplaner", "Moving planner"),
    "guides": ("Ratgeber", "Guides"),
    "prices": ("Preise", "Prices"),
    "costs": ("Kosten", "Costs"),
    "about": ("Über uns", "About us"),
    "contact": ("Kontakt", "Contact"),
}

def is_ph(v):
    return str(v).startswith("[")

def ph(v):
    return '<span class="ph">%s</span>' % esc(v) if is_ph(v) else esc(v)

def brand(key, lang):
    pre = prefix_for(key, lang)
    return ('<a class="brand" href="%s" aria-label="%s"><img src="%sassets/img/favicon.svg" alt="" width="32" height="32">'
            '<span>Stabil <b>Umzug</b></span></a>') % (link(key, "home", lang), esc(SITE["company"] + " – " + t("Startseite", "Home", lang)), pre)

def header(key, lang):
    items = []
    for k in NAV:
        here = k == key or (k == "guides" and key in GUIDE_KEYS) or (k == "services" and key.startswith("svc_"))
        cur = ' aria-current="page"' if here else ""
        items.append('<a href="%s"%s>%s</a>' % (link(key, k, lang), cur, esc(t(*NAV_LABEL[k], lang))))
    sw = ('<div class="lang" role="group" aria-label="%s">'
          '<a href="%s" hreflang="de" lang="de"%s>DE</a><a href="%s" hreflang="en" lang="en"%s>EN</a></div>') % (
        t("Sprache", "Language", lang),
        link(key, key, lang, "de"), ' aria-current="true"' if lang == "de" else "",
        link(key, key, lang, "en"), ' aria-current="true"' if lang == "en" else "")
    return (
        '<header class="site-header"><div class="container bar-row">%s'
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">%s</button>'
        '<nav class="nav" id="site-nav" aria-label="%s" data-open="false">%s</nav>%s'
        '<a class="button primary small" href="%s">%s</a>'
        '</div></header>'
    ) % (brand(key, lang), t("Menü", "Menu", lang), t("Hauptnavigation", "Main navigation", lang), "".join(items), sw,
         link(key, "quote", lang), t("Kostenloses Angebot", "Free quote", lang))

def footer(key, lang):
    L = lambda k: link(key, k, lang)
    phone = ph(SITE["phone"])
    if SITE["phone_href"]:
        phone = '<a href="tel:%s">%s</a>' % (esc(SITE["phone_href"]), esc(SITE["phone"]))
    email = ph(SITE["email"])
    if not is_ph(SITE["email"]):
        email = '<a href="mailto:%s">%s</a>' % (esc(SITE["email"]), esc(SITE["email"]))
    wa = ""
    if SITE.get("whatsapp"):
        wa = '<li><a href="https://wa.me/%s" rel="noopener">WhatsApp</a></li>' % esc(SITE["whatsapp"])
    steps = "".join('<li><a href="%s">%s</a></li>' % (L("svc_" + k), esc(s[lang]["nav"])) for k, s in SERVICES.items())
    import places
    return places.area_band(key, lang) + (
        '<footer class="site-footer"><div class="container">'
        '<div class="footer-top">'
        '<div><div class="wordmark">Stabil<span>Umzug.</span></div><p>%s</p></div>'
        '<div><h3>%s</h3><ul><li>%s</li><li>%s</li>%s<li>%s</li><li>%s %s</li></ul></div>'
        '<div><h3>%s</h3><ul>%s<li><a href="%s">%s</a></li></ul></div>'
        '<div><h3>%s</h3><ul><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li></ul></div>'
        '</div>'
        '<div class="legal-row"><span>© %s %s · %s</span><span><a href="%s">%s</a> · <a href="%s">%s</a> · <a href="%s">%s</a></span></div>'
        '</div></footer>'
    ) % (
        esc(t("Umzüge, Klaviertransporte und Entrümpelungen aus Essen – im Ruhrgebiet und in ganz Deutschland.",
              "Moves, piano transport and clear-outs from Essen – across the Ruhr area and all of Germany.", lang)),
        t("Kontakt", "Contact", lang), phone, email, wa, ph(SITE["hours"]), ph(SITE["street"]), esc(SITE["city"]),
        t("Leistungen", "Services", lang), steps, L("quote"), t("Kostenloses Angebot", "Free quote", lang),
        t("Stabil Umzug", "Stabil Umzug", lang),
        L("planner"), t("Umzugsplaner", "Moving planner", lang),
        L("guides"), t("Ratgeber: 10 Schritte", "Guides: 10 steps", lang),
        L("costs"), t("Umzugskosten", "Moving costs", lang),
        L("essen"), t("Umzug in Essen", "Moving in Essen", lang),
        L("about"), t("Über uns", "About us", lang),
        "2026", esc(SITE["company"]), esc(SITE["city"]),
        L("imprint"), t("Impressum", "Imprint", lang),
        L("privacy"), t("Datenschutz", "Privacy", lang),
        L("admin"), t("Mitarbeiter-Login", "Staff login", lang),
    )

def head(page):
    key, lang = page["key"], page["lang"]
    pre = prefix_for(key, lang)
    canon = url_of(key, lang)
    alt_de, alt_en = url_of(key, "de"), url_of(key, "en")
    og = SITE["domain"] + "/assets/img/og.png"
    parts = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<script>document.documentElement.className+=' js'</script>",
        "<title>%s</title>" % esc(page["title"]),
        '<meta name="description" content="%s">' % esc(page["desc"]),
        '<link rel="canonical" href="%s">' % canon,
        '<link rel="alternate" hreflang="de" href="%s">' % alt_de,
        '<link rel="alternate" hreflang="en" href="%s">' % alt_en,
        '<link rel="alternate" hreflang="x-default" href="%s">' % alt_de,
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="%s">' % esc(SITE["company"]),
        '<meta property="og:title" content="%s">' % esc(page["title"]),
        '<meta property="og:description" content="%s">' % esc(page["desc"]),
        '<meta property="og:url" content="%s">' % canon,
        '<meta property="og:image" content="%s">' % og,
        '<meta property="og:locale" content="%s">' % ("de_DE" if lang == "de" else "en_GB"),
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="theme-color" content="#201e1d">',
        '<link rel="icon" href="%sassets/img/favicon.svg" type="image/svg+xml">' % pre,
        '<link rel="preload" href="%sassets/fonts/archivo-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>' % pre,
        '<link rel="preload" href="%sassets/fonts/archivo-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>' % pre,
        '<link rel="stylesheet" href="%sassets/css/site.css">' % pre,
    ]
    if page.get("planner"):
        parts.append('<link rel="stylesheet" href="%sassets/css/flow.css">' % pre)
    if page.get("noindex"):
        parts.append('<meta name="robots" content="noindex">')
    for s in page.get("schema", []):
        parts.append('<script type="application/ld+json">%s</script>' % json.dumps(s, ensure_ascii=False))
    return "\n".join(parts)

def render(page):
    key, lang = page["key"], page["lang"]
    pre = prefix_for(key, lang)
    scripts = ['<script src="%sassets/js/site-config.js"></script>' % pre]
    if page.get("planner"):
        for f in ("flow-i18n", "flow-data", "estimator", "flow"):
            scripts.append('<script src="%sassets/js/%s.js" defer></script>' % (pre, f))
    if page.get("quote"):
        scripts.append('<script src="%sassets/js/quote.js" defer></script>' % pre)
    if page.get("portal"):
        scripts.append('<script src="%sassets/js/portal.js" defer></script>' % pre)
    scripts.append('<script src="%sassets/js/site.js" defer></script>' % pre)
    no_bar = page.get("planner") or key in ("quote", "portal")   # the planner has its own footer; the quote page is the bar's target
    return (
        '<!doctype html>\n<html lang="%s">\n<head>\n%s\n</head>\n<body%s>\n'
        '<a class="skip" href="#main">%s</a>\n%s\n<main id="main">\n%s\n</main>\n%s\n%s%s\n</body>\n</html>\n'
    ) % (lang, head(page), "" if no_bar else ' class="has-actionbar"', t("Zum Inhalt springen", "Skip to content", lang),
         header(key, lang), page["body"], footer(key, lang), "" if no_bar else actionbar(key, lang), "\n".join(scripts))

def actionbar(key, lang):
    """Sticky bar on phones: plan the move, or call / WhatsApp right away."""
    second = ""
    if SITE.get("whatsapp"):
        second = '<a class="ab-wa" href="https://wa.me/%s" rel="noopener">WhatsApp</a>' % esc(SITE["whatsapp"])
    elif SITE.get("phone_href"):
        second = '<a class="ab-wa" href="tel:%s">%s</a>' % (esc(SITE["phone_href"]), t("Anrufen", "Call", lang))
    return ('<nav class="actionbar" aria-label="%s"><a class="ab-plan" href="%s">%s</a>%s</nav>\n'
            % (t("Schnellzugriff", "Quick actions", lang), link(key, "quote", lang), t("Kostenloses Angebot", "Free quote", lang), second))

def crumbs(key, lang, label, parent=None):
    mid = ""
    if parent:
        mid = ' / <a href="%s">%s</a>' % (link(key, parent, lang), esc(t(*NAV_LABEL.get(parent, ("", "")), lang)))
    return '<nav class="crumbs" aria-label="%s"><a href="%s">%s</a>%s / %s</nav>' % (
        t("Brotkrumen", "Breadcrumbs", lang), link(key, "home", lang), t("Start", "Home", lang), mid, esc(label))
