"""City pages: our own emblem for each place (no official coat of arms – those are protected and need the city's
permission), a short fact sheet and a card with distance and good moving times.
Facts come from tools/places_facts.json (German Wikipedia, see "source" per place)."""
import json, os
from lib import esc, t

_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "places_facts.json")
FACTS = json.load(open(_FILE, encoding="utf-8")) if os.path.exists(_FILE) else {}
DEPOT = FACTS.get("depot") or {"lat": 51.497, "lng": 7.012}


def num_de(n):
    return "{:,}".format(int(n)).replace(",", ".")


def dec_de(x):
    return ("%.2f" % float(x)).rstrip("0").rstrip(".").replace(".", ",")


# ---------------------------------------------------------------- mini map
def _bbox():
    pts = [(f["lat"], f["lng"]) for k, f in FACTS.items() if isinstance(f, dict) and f.get("lat") and f.get("lng")]
    pts.append((DEPOT["lat"], DEPOT["lng"]))
    la = [p[0] for p in pts] or [51.2, 51.6]
    ln = [p[1] for p in pts] or [6.7, 7.5]
    pad_la, pad_ln = (max(la) - min(la)) * 0.08 + 0.01, (max(ln) - min(ln)) * 0.06 + 0.01
    return min(la) - pad_la, max(la) + pad_la, min(ln) - pad_ln, max(ln) + pad_ln


def mini_map(key_, name, lang, km, mins, W=320, H=190):
    """The region as a constellation of all our places, with the route from our depot (A) to this place (B)."""
    f = FACTS.get(key_) or {}
    if not (f.get("lat") and f.get("lng")):
        return ""
    lat0, lat1, lng0, lng1 = _bbox()
    # longitudes are shorter than latitudes at 51°: scale x by cos(lat)
    import math
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    sx, sy = (lng1 - lng0) * kx, (lat1 - lat0)
    s = min(W / sx, H / sy)
    ox, oy = (W - sx * s) / 2, (H - sy * s) / 2
    P = lambda la, ln: (ox + (ln - lng0) * kx * s, oy + (lat1 - la) * s)
    dots = []
    for k, g in FACTS.items():
        if k in ("depot", key_) or not isinstance(g, dict) or not g.get("lat"):
            continue
        x, y = P(g["lat"], g["lng"])
        dots.append('<circle cx="%.1f" cy="%.1f" r="%s" class="em-dot%s"/>' % (x, y, 2.4 if g.get("type") == "city" else 1.6, "" if g.get("type") == "city" else " d"))
    ax, ay = P(DEPOT["lat"], DEPOT["lng"])
    bx, by = P(f["lat"], f["lng"])
    near = ((ax - bx) ** 2 + (ay - by) ** 2) ** .5 < 14
    right = bx < W * .62
    lx, ly = bx + (10 if right else -10), by + (-10 if by > 24 else 18)
    # boxes already taken (x0, y0, x1, y1): faint town names are left out where they would collide
    tw = lambda txt, size: len(txt) * size * .58
    boxes = [((lx if right else lx - tw(name, 12)), ly - 11, (lx + tw(name, 12) if right else lx), ly + 3),
             (bx - 9, by - 9, bx + 9, by + 9), (ax - 9, ay - 9, ax + 9, ay + 9)]
    hit = lambda b: any(not (b[2] < o[0] or b[0] > o[2] or b[3] < o[1] or b[1] > o[3]) for o in boxes)
    if f.get("type") != "essen":
        box = (ax - 10 - tw("Essen", 10), ay - 6, ax - 10, ay + 5)
        if not hit(box):
            boxes.append(box)
            dots.append('<text x="%.1f" y="%.1f" text-anchor="end" class="em-ref em-ref-a">Essen</text>' % (ax - 10, ay + 3.5))
    for k, nm in (("duisburg", "Duisburg"), ("duesseldorf", "Düsseldorf"), ("dortmund", "Dortmund"), ("gelsenkirchen", "Gelsenkirchen")):
        g = FACTS.get(k)
        if k == key_ or not isinstance(g, dict) or not g.get("lat"):
            continue
        x, y = P(g["lat"], g["lng"])
        left = x < W * .5
        box = ((x + 6) if left else (x - 6 - tw(nm, 10)), y - 6, (x + 6 + tw(nm, 10)) if left else (x - 6), y + 5)
        if box[0] < 0 or box[2] > W or hit(box):
            continue
        boxes.append(box)
        dots.append('<text x="%.1f" y="%.1f" text-anchor="%s" class="em-ref">%s</text>' % (x + (6 if left else -6), y + 3.5, "start" if left else "end", esc(nm)))
    label = '<text x="%.1f" y="%.1f" text-anchor="%s" class="em-lbl">%s</text>' % (lx, ly, "start" if right else "end", esc(name))
    route = '' if near else '<path d="M%.1f %.1f L%.1f %.1f" class="em-route"/>' % (ax, ay, bx, by)
    return ('<svg class="em-map" viewBox="0 0 %d %d" role="img" aria-label="%s">%s%s'
            '<circle cx="%.1f" cy="%.1f" r="7" class="em-a"/><text x="%.1f" y="%.1f" class="em-ab">A</text>'
            '<circle cx="%.1f" cy="%.1f" r="7" class="em-b"/><text x="%.1f" y="%.1f" class="em-ab">B</text>%s</svg>') % (
        W, H, esc(t("Karte: von unserem Standort in Essen nach %s", "Map: from our depot in Essen to %s", lang) % name),
        "".join(dots), route,
        ax, ay, ax, ay + 3.6, (bx + (9 if near else 0)), (by - (9 if near else 0)), (bx + (9 if near else 0)), (by - (9 if near else 0)) + 3.6, label)


# ---------------------------------------------------------------- emblem in the page head
def emblem(key_, name, group, lang, km, mins):
    f = FACTS.get(key_) or {}
    essen = group == "essen"
    kicker = t("Stadtteil von Essen", "District of Essen", lang) if essen else (
        t("Kreisfreie Stadt", "Independent city", lang) if (f.get("county") or "").lower().startswith("kreisfrei") else (f.get("county") or t("Stadt in NRW", "City in NRW", lang)))
    plate = f.get("plate") or ("E" if essen else "")
    plz = f.get("postcodes") or []
    # "44787–44894" stays as it is; a list of single codes becomes "45326 – 45329"
    plz_txt = (", ".join(plz) if any("–" in x for x in plz) else plz[0] if len(plz) == 1 else "%s – %s" % (plz[0], plz[-1])) if plz else ""
    tags = ""
    if plate:
        tags += '<span class="plate" title="%s"><i>D</i>%s</span>' % (esc(t("Kfz-Kennzeichen", "Licence plate", lang)), esc(plate))
    if plz_txt:
        tags += '<span class="em-plz">%s %s</span>' % (t("PLZ", "Postcode", lang), esc(plz_txt))
    trip = ""
    if km is not None:
        trip = '<figcaption class="em-trip"><span class="em-a-s">A</span>%s<span class="em-dash" aria-hidden="true"></span><span class="em-b-s">B</span>%s<b>%s km · %s</b></figcaption>' % (
            esc(t("Unser Standort", "Our depot", lang)), esc(name), km, esc(t("ca. %s Min.", "approx. %s min", lang) % mins))
    return ('<figure class="ph-img emblem"><div class="em-top"><span class="em-k">%s</span><b class="em-name">%s</b><div class="em-tags">%s</div></div>%s%s</figure>') % (
        esc(kicker), esc(name), tags, mini_map(key_, name, lang, km, mins), trip)


# ---------------------------------------------------------------- fact sheet + distance and good times
def fact_sheet(key_, name, full, group, city, lang, km, mins):
    f = FACTS.get(key_) or {}
    rows = []
    if f.get("population"):
        rows.append((t("Einwohner", "Population", lang), num_de(f["population"]) + ((' <small>(%s)</small>' % esc(t("Stand", "as of", lang) + " " + f["population_date"])) if f.get("population_date") else "")))
    if f.get("area_km2"):
        rows.append((t("Fläche", "Area", lang), esc(dec_de(f["area_km2"]) + " km²")))
    if f.get("postcodes"):
        rows.append((t("Postleitzahlen", "Postcodes", lang), esc(", ".join(f["postcodes"][:6]) + (" …" if len(f["postcodes"]) > 6 else ""))))
    if group == "essen" and f.get("stadtbezirk"):
        rows.append((t("Stadtbezirk", "Borough", lang), esc(f["stadtbezirk"]).replace("/", "/​")))   # allow a line break after each slash
    elif f.get("county"):
        rows.append((t("Verwaltung", "Administration", lang), esc(f["county"])))
    if f.get("plate"):
        rows.append((t("Kfz-Kennzeichen", "Licence plate", lang), esc(f["plate"])))
    rows.append((t("Halteverbotszone", "No-parking zone", lang), esc(t("Straßenverkehrsbehörde der Stadt %s", "Traffic authority of the City of %s", lang) % city)))
    src = ('<p class="fs-src">%s <a href="%s" rel="noopener" target="_blank">Wikipedia</a></p>' % (esc(t("Quelle:", "Source:", lang)), esc(f["source"]))) if f.get("source") else ""

    # good moving times (guidance, computed from the measured drive time)
    tips = []
    if km is not None and mins is not None:
        rush = int(round(mins * 1.4 / 5.0) * 5)
        tips.append((t("Strecke", "Distance", lang), t("%s km ab Karlstraße 32", "%s km from Karlstraße 32", lang) % km))
        tips.append((t("Fahrzeit", "Drive time", lang), t("ca. %s Min., im Berufsverkehr bis %s Min.", "approx. %s min, up to %s min in rush hour", lang) % (mins, rush)))
        tips.append((t("Bester Start", "Best start", lang), t("7:00 Uhr – vor dem Berufsverkehr", "7 a.m. – before rush hour", lang) if km > 12 else t("ab 8:00 Uhr – kurze Anfahrt", "from 8 a.m. – short trip", lang)))
        lo, hi = 5 + 2 * mins / 60.0, 7 + 2 * mins / 60.0
        half = lambda x: ("%.1f" % (round(x * 2) / 2)).replace(".0", "").replace(".", ",")
        tips.append((t("Dauer 2–3 Zimmer", "Duration 2–3 rooms", lang), t("ca. %s–%s Std. – an einem Tag", "approx. %s–%s h – in one day", lang) % (half(lo), half(hi))))
    tips.append((t("Ruhige Tage", "Quiet days", lang), t("Dienstag bis Donnerstag", "Tuesday to Thursday", lang)))
    tips.append((t("Früh buchen", "Book early", lang), t("Monatsende, Samstage und Ferien", "Month end, Saturdays and holidays", lang)))

    dl = lambda items: "".join('<div><dt>%s</dt><dd>%s</dd></div>' % (esc(a), b) for a, b in items)   # values are already escaped
    return ('<section class="section factsheet"><div class="container"><div class="fs-grid">'
            '<div class="fs-card"><span class="kicker red">%s</span><h2>%s</h2><dl class="fs-dl">%s</dl>%s</div>'
            '<details class="fs-card fs-time" data-fold open><summary><span class="kicker red">%s</span><h2>%s</h2></summary><dl class="fs-dl">%s</dl><p class="fs-src">%s</p></details>'
            '</div></div></section>') % (
        esc(t("Steckbrief", "Fact sheet", lang)), esc(name), dl(rows), src,
        esc(t("Entfernung und Zeiten", "Distance and timing", lang)), esc(t("Gut geplant.", "Well timed.", lang)),
        dl([(a, esc(b)) for a, b in tips]),
        esc(t("Richtwerte für eine 2–3-Zimmer-Wohnung. Ihr Angebot rechnen wir genau.", "Guide values for a two- to three-room flat. We calculate your quote exactly.", lang)))
