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

def journey_html(frm, lang, teasers=True):
    items = []
    for k in JOURNEY:
        g = GUIDES[k]
        badge = '<span class="key">%s</span>' % t("Grundlage", "Foundation", lang) if g["step"] <= 2 else ""
        items.append('<li><a href="%s"><span class="n">%02d</span><span class="label">%s</span>%s%s</a></li>' % (
            link(frm, k, lang), g["step"], esc(g[lang]["nav"]), ('<span class="teaser">%s</span>' % esc(g[lang]["teaser"])) if teasers else "", badge))
    return '<ol class="journey">%s</ol>' % "".join(items)

def topic_tiles(frm, lang):
    return '<div class="tiles">%s</div>' % "".join(
        '<a class="tile" href="%s"><h3>%s</h3><p>%s</p><span class="link-arrow">%s</span></a>' % (
            link(frm, k, lang), esc(GUIDES[k][lang]["nav"]), esc(GUIDES[k][lang]["teaser"]), t("Lesen", "Read", lang)) for k in TOPICS)

def toc(key, lang):
    li = lambda k, n: '<li><a href="%s"%s><span>%s</span>%s</a></li>' % (
        link(key, k, lang), ' aria-current="page"' if k == key else "", n, esc(GUIDES[k][lang]["nav"]))
    return ('<nav class="toc" aria-label="%s"><h2>%s</h2><ol>%s</ol><h2>%s</h2><ol>%s</ol></nav>' % (
        t("Ratgeber", "Guides", lang), t("Ihr Umzug in 10 Schritten", "Your move in 10 steps", lang),
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
