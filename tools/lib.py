"""Layout helpers for the Stabil Umzug static site generator."""
import html, json
from config import SITE

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
    "checklist": ("ratgeber/umzug-checkliste/", "en/guides/moving-checklist/"),
    "parking":   ("ratgeber/halteverbotszone/", "en/guides/parking-permit/"),
    "register":  ("ratgeber/ummeldung-nach-umzug/", "en/guides/registering-after-a-move/"),
    "essen":     ("umzug-essen/", "en/moving-essen/"),
    "contact":   ("kontakt/", "en/contact/"),
    "about":     ("ueber-uns/", "en/about-us/"),
    "imprint":   ("impressum/", "en/imprint/"),
    "privacy":   ("datenschutz/", "en/privacy/"),
}

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

NAV = ["services", "planner", "guides", "about", "contact"]
NAV_LABEL = {
    "services": ("Leistungen", "Services"),
    "planner": ("Umzugsplaner", "Moving planner"),
    "guides": ("Ratgeber", "Guides"),
    "about": ("Über uns", "About us"),
    "contact": ("Kontakt", "Contact"),
}

def is_ph(v):
    return str(v).startswith("[")

def ph(v):
    return '<span class="ph">%s</span>' % esc(v) if is_ph(v) else esc(v)

def header(key, lang):
    pre = prefix_for(key, lang)
    items = []
    for k in NAV:
        cur = ' aria-current="page"' if (k == key or (k == "guides" and key in ("checklist", "parking", "register"))) else ""
        items.append('<a href="%s"%s>%s</a>' % (link(key, k, lang), cur, esc(t(*NAV_LABEL[k], lang))))
    other = "en" if lang == "de" else "de"
    de_cur = ' aria-current="true"' if lang == "de" else ""
    en_cur = ' aria-current="true"' if lang == "en" else ""
    sw = ('<div class="lang" role="group" aria-label="%s">'
          '<a href="%s" hreflang="de" lang="de"%s>DE</a><a href="%s" hreflang="en" lang="en"%s>EN</a></div>') % (
        t("Sprache", "Language", lang),
        link(key, key, lang, "de"), de_cur, link(key, key, lang, "en"), en_cur)
    return (
        '<header class="site-header"><div class="container bar-row">'
        '<a class="brand" href="%s" aria-label="%s"><img src="%sassets/img/favicon.svg" alt="" width="34" height="34"><span>%s</span></a>'
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">%s</button>'
        '<nav class="nav" id="site-nav" aria-label="%s" data-open="false">%s</nav>'
        '%s'
        '<a class="button primary small" href="%s">%s</a>'
        '</div></header>'
    ) % (link(key, "home", lang), esc(SITE["company"] + " – " + t("Startseite", "Home", lang)), pre, esc(SITE["company"]),
         t("Menü", "Menu", lang), t("Hauptnavigation", "Main navigation", lang), "".join(items), sw,
         link(key, "planner", lang), t("Umzug planen", "Plan your move", lang))

def footer(key, lang):
    L = lambda k: link(key, k, lang)
    phone = ph(SITE["phone"])
    if SITE["phone_href"]:
        phone = '<a href="tel:%s">%s</a>' % (esc(SITE["phone_href"]), esc(SITE["phone"]))
    email = ph(SITE["email"])
    if not is_ph(SITE["email"]):
        email = '<a href="mailto:%s">%s</a>' % (esc(SITE["email"]), esc(SITE["email"]))
    return (
        '<footer class="site-footer"><div class="container">'
        '<div class="footer-grid">'
        '<div><h3>%s</h3><p>%s<br>%s %s</p></div>'
        '<div><h3>%s</h3><ul><li>%s</li><li>%s</li><li>%s</li></ul></div>'
        '<div><h3>%s</h3><ul><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li></ul></div>'
        '<div><h3>%s</h3><ul><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li><li><a href="%s">%s</a></li></ul></div>'
        '</div>'
        '<div class="legal-row"><span>© %s %s</span><span><a href="%s">%s</a> · <a href="%s">%s</a></span></div>'
        '</div></footer>'
    ) % (
        esc(SITE["company"]), ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]),
        t("Kontakt", "Contact", lang), phone, email, ph(SITE["hours"]),
        t("Angebot", "Offer", lang),
        L("planner"), t("Umzugsplaner", "Moving planner", lang),
        L("services"), t("Leistungen", "Services", lang),
        L("essen"), t("Umzug in Essen", "Moving in Essen", lang),
        L("contact"), t("Anfrage senden", "Send a request", lang),
        t("Ratgeber", "Guides", lang),
        L("checklist"), t("Umzugscheckliste", "Moving checklist", lang),
        L("parking"), t("Halteverbotszone", "Parking permit", lang),
        L("register"), t("Ummeldung", "Registration", lang),
        "2026", esc(SITE["company"]),
        L("imprint"), t("Impressum", "Imprint", lang),
        L("privacy"), t("Datenschutz", "Privacy", lang),
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
        '<meta name="theme-color" content="#14222C">',
        '<link rel="icon" href="%sassets/img/favicon.svg" type="image/svg+xml">' % pre,
        '<link rel="preload" href="%sassets/fonts/archivo-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>' % pre,
        '<link rel="preload" href="%sassets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>' % pre,
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
    scripts.append('<script src="%sassets/js/site.js" defer></script>' % pre)
    return (
        '<!doctype html>\n<html lang="%s">\n<head>\n%s\n</head>\n<body>\n'
        '<a class="skip" href="#main">%s</a>\n%s\n<main id="main">\n%s\n</main>\n%s\n%s\n</body>\n</html>\n'
    ) % (lang, head(page), t("Zum Inhalt springen", "Skip to content", lang),
         header(key, lang), page["body"], footer(key, lang), "\n".join(scripts))

def crumbs(key, lang, label):
    return '<nav class="crumbs" aria-label="%s"><a href="%s">%s</a> / %s</nav>' % (
        t("Brotkrumen", "Breadcrumbs", lang), link(key, "home", lang), t("Start", "Home", lang), esc(label))
