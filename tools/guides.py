"""Guide pages: the ten steps of a move plus topic guides, rendered from guides_content.GUIDES."""
import re
from config import SITE
from lib import esc, t, link, crumbs, GUIDES, JOURNEY, TOPICS

LINK = re.compile(r"\[\[([a-z]+)\|([^\]]+)\]\]")

def inline(text, key, lang):
    return LINK.sub(lambda m: '<a href="%s">%s</a>' % (link(key, m.group(1), lang), m.group(2)), esc(text))

def slug(s):
    s = s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:48]

def blocks_html(blocks, key, lang):
    out = []
    for b in blocks:
        kind = b[0]
        if kind == "h2":
            out.append('<h2 id="%s">%s</h2>' % (slug(b[1]), inline(b[1], key, lang)))
        elif kind == "p":
            out.append("<p>%s</p>" % inline(b[1], key, lang))
        elif kind in ("ul", "ol"):
            out.append("<%s>%s</%s>" % (kind, "".join("<li>%s</li>" % inline(i, key, lang) for i in b[1]), kind))
        elif kind == "table":
            head = "".join('<th scope="col">%s</th>' % esc(h) for h in b[1])
            rows = "".join("<tr>%s</tr>" % "".join(("<th scope=\"row\">%s</th>" if i == 0 else "<td>%s</td>") % inline(c, key, lang) for i, c in enumerate(r)) for r in b[2])
            out.append('<div class="table-wrap"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (head, rows))
        elif kind == "note":
            out.append('<p class="note">%s</p>' % inline(b[1], key, lang))
        elif kind == "planner":
            out.append('<div class="planner-box"><span class="kicker">%s</span><p>%s</p><a class="button primary" href="%s">%s</a></div>'
                       % (t("Im Umzugsplaner", "In the moving planner", lang), inline(b[1], key, lang), link(key, "planner", lang), t("Umzug planen", "Plan your move", lang)))
    return "".join(out)

# One small line drawing per step (navy lines, orange accent "a"), 24x24.
STEP_ICONS = {
    "measure": '<rect x="4" y="8" width="16" height="12" rx="1"/><path d="M12 8v5h8"/><path class="a" d="M4 4.5h16M4 3v3M20 3v3"/>',
    "inventory": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9.5 4V2.8h5V4M14 10.5h2.5M14 16h2.5"/><path class="a" d="M8 10.5l1.4 1.4L12 9.3M8 16l1.4 1.4L12 14.8"/>',
    "volume": '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path class="a" d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    "packing": '<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 8v9l9 4 9-4V8M12 12v9"/><path class="a" d="M7.5 6l9 4v3.5"/>',
    "access": '<path d="M3 21h4.5v-3.5h4.5V14h4.5v-3.5H21"/><path class="a" d="M13 3h6v6M19 3l-6.5 6.5"/>',
    "parking": '<path d="M12 17v4.5"/><circle class="a" cx="12" cy="10" r="7"/><path class="a" d="M7.1 5.1l9.8 9.8M16.9 5.1l-9.8 9.8"/>',
    "truck": '<path d="M2 6.5h11v9.5H2zM13 9.5h4.2l2.8 3.2V16H13"/><circle cx="6" cy="17.3" r="1.8"/><circle cx="16.5" cy="17.3" r="1.8"/><path class="a" d="M2 21.3h3M8 21.3h3M14 21.3h3M20 21.3h2"/>',
    "waste": '<path d="M4 7h16M9.5 7V4h5v3M6 7l1 14h10l1-14"/><path class="a" d="M10 11v6M14 11v6"/>',
    "kitchen": '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5"/><path class="a" d="M10 20v-6h4v6"/>',
    # "So arbeiten wir" on the home page
    "w_plan": '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><path class="a" d="M9 7h6M9 10.2h6M9 13.4h3.5"/>',
    "w_quote": '<path d="M4 4.5h16v11.5H9.5L4 20.5z"/><path class="a" d="M8 9h8M8 12.3h5"/>',
    "w_team": '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.6-3.4 2.8-5.5 5.5-5.5s4.9 2.1 5.5 5.5"/><circle class="a" cx="17" cy="9" r="2.4"/><path class="a" d="M15.6 14.6c.5-.1 1-.1 1.4-.1 2.2 0 3.9 1.7 4.4 4.5"/>',
    "w_done": '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5"/><path class="a" d="M8.8 14.6l2.2 2.2 4.3-4.6"/>',
    # "Was Ihren Preis bestimmt": the seven parts of a quote
    "c_labour": '<circle cx="12" cy="13.5" r="7.5"/><path d="M10 2.5h4M12 2.5V6"/><path class="a" d="M12 9.5v4l2.8 1.8"/>',
    "c_route": '<path d="M16 9c0 3.6-4 8-4 8s-4-4.4-4-8a4 4 0 0 1 8 0z"/><circle class="a" cx="12" cy="9" r="1.5"/><path class="a" d="M3 21.2h3M9 21.2h3M15 21.2h3M20 21.2h1"/>',
    "c_assembly": '<path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3.5 17.5l3 3 6-6a4 4 0 0 0 5.2-5.2l-2.5 2.5-2.3-.7-.7-2.3z"/><path class="a" d="M16.5 16.5l3.5 3.5"/>',
    "c_extras": '<circle cx="12" cy="12" r="8.5"/><path class="a" d="M12 8v8M8 12h8"/>',
    "register": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M14 10h4M14 13.5h4"/><circle class="a" cx="8.5" cy="10.5" r="2"/><path class="a" d="M5.5 16.2c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4"/>',
}

def step_icon(k):
    return ('<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" '
            'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">%s</svg></span>' % STEP_ICONS[k]) if k in STEP_ICONS else ""

def journey_html(frm, lang, teasers=True):
    items = []
    for k in JOURNEY:
        g = GUIDES[k]
        badge = '<span class="key">%s</span>' % t("Grundlage", "Foundation", lang) if g["step"] <= 2 else ""
        items.append('<li><a href="%s"><span class="top"><span class="n">%02d</span>%s</span><span class="label">%s</span>%s%s</a></li>' % (
            link(frm, k, lang), g["step"], step_icon(k), esc(g[lang]["nav"]), ('<span class="teaser">%s</span>' % esc(g[lang]["teaser"])) if teasers else "", badge))
    return '<ol class="journey">%s</ol>' % "".join(items)

def topic_tiles(frm, lang):
    return '<div class="tiles">%s</div>' % "".join(
        '<a class="tile" href="%s"><h3>%s</h3><p>%s</p><span class="link-arrow">%s</span></a>' % (
            link(frm, k, lang), esc(GUIDES[k][lang]["nav"]), esc(GUIDES[k][lang]["teaser"]), t("Lesen", "Read", lang)) for k in TOPICS)

def toc(key, lang):
    li = lambda k, n: '<li><a href="%s"%s><span>%s</span>%s</a></li>' % (
        link(key, k, lang), ' aria-current="page"' if k == key else "", n, esc(GUIDES[k][lang]["nav"]))
    # phones: the list of all guides folds under one row after the article
    return ('<nav class="toc" aria-label="%s"><details class="toc-fold" data-fold open><summary>%s</summary><h2>%s</h2><ol>%s</ol><h2>%s</h2><ol>%s</ol></details></nav>' % (
        t("Ratgeber", "Guides", lang), t("Alle Ratgeber", "All guides", lang), t("Ihr Umzug in 10 Schritten", "Your move in 10 steps", lang),
        "".join(li(k, "%02d" % GUIDES[k]["step"]) for k in JOURNEY),
        t("Themen", "Topics", lang), "".join(li(k, "·") for k in TOPICS)))

def step_nav(key, lang):
    if key not in JOURNEY:
        return ""
    i = JOURNEY.index(key)
    prev = JOURNEY[i - 1] if i > 0 else None
    nxt = JOURNEY[i + 1] if i + 1 < len(JOURNEY) else None
    a = lambda k, cls, lab: ('<a class="%s" href="%s"><small>%s</small>%s</a>' % (cls, link(key, k, lang), lab, esc(GUIDES[k][lang]["nav"]))) if k else '<span></span>'
    return '<nav class="step-nav" aria-label="%s">%s%s</nav>' % (
        t("Schritte", "Steps", lang), a(prev, "prev", t("← Vorheriger Schritt", "← Previous step", lang)), a(nxt, "next", t("Nächster Schritt →", "Next step →", lang)))

def guide(key):
    def build(lang):
        from pages import cta
        g, c = GUIDES[key], GUIDES[key][lang]
        badge = ""
        if g["step"]:
            bar = "".join('<i class="%s"></i>' % ("on" if i < g["step"] else "") for i in range(10))
            badge = '<span class="step-badge"><span class="bar" aria-hidden="true">%s</span>%s</span>' % (
                bar, t("Schritt %d von 10" % g["step"], "Step %d of 10" % g["step"], lang))
        head = ('<div class="page-head"><div class="container">%s%s<h1>%s</h1><p class="lead">%s</p></div></div>'
                % (crumbs(key, lang, c["nav"], parent="guides"), badge or '<span class="kicker red">%s</span>' % t("Ratgeber", "Guide", lang),
                   esc(c["title"]), inline(c["lead"], key, lang)))
        body = head + '<div class="container article">%s<article class="prose">%s%s</article></div>' % (
            toc(key, lang), blocks_html(c["blocks"], key, lang), step_nav(key, lang)) + cta(key, lang)
        article = {"@context": "https://schema.org", "@type": "Article", "headline": c["title"], "description": c["desc"],
                   "inLanguage": lang, "publisher": {"@type": "Organization", "name": SITE["company"]}}
        return dict(key=key, lang=lang, title=c["seo"], desc=c["desc"], body=body, schema=[article])
    return build

def hub(lang):
    from pages import cta, page_head
    key = "guides"
    body = page_head(key, lang, t("Ihr Umzug in 10 Schritten", "Your move in 10 steps", lang),
        t("Ein Umzug ist keine einzelne Aufgabe, sondern eine Kette: Jeder Schritt braucht Angaben aus dem vorherigen. "
          "Die ersten beiden – die neue Wohnung ausmessen und den Hausrat erfassen – bestimmen fast alles, was danach kommt.",
          "A move is not one task but a chain: each step needs information from the one before. "
          "The first two – measuring the new home and listing your belongings – decide almost everything that follows.", lang),
        kicker=t("Ratgeber", "Guides", lang))
    body += '<section class="section"><div class="container">%s</div></section>' % journey_html(key, lang)
    body += ('<section class="section alt"><div class="container"><div class="head"><h2>%s</h2><p>%s</p></div>%s</div></section>'
             % (t("Themen rund um den Umzug", "Topics around the move", lang),
                t("Was ein Umzug kostet, wie lange der Möbelaufbau dauert – und was wann zu erledigen ist.",
                  "What a move costs, how long furniture assembly takes – and what to do when.", lang),
                topic_tiles(key, lang)))
    body += cta(key, lang)
    return dict(key=key, lang=lang, title=t("Umzug in 10 Schritten: Ratgeber | Stabil Umzug", "Moving in 10 steps: guides | Stabil Umzug", lang),
                desc=t("Vom Ausmessen der neuen Wohnung bis zur Ummeldung: zehn Schritte eines Umzugs in Deutschland, dazu Kosten, Möbelmontage und Checkliste.",
                       "From measuring the new home to registering: the ten steps of a move in Germany, plus costs, furniture assembly and a checklist.", lang),
                body=body)
