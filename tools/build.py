#!/usr/bin/env python3
"""Builds the static site into the repo root. Run:  python3 tools/build.py"""
import os, json, sys
sys.path.insert(0, os.path.dirname(__file__))
from config import SITE
import lib, pages, pages2
from lib import PAGES, url_of, render, is_ph

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

BUILDERS = {
    "home": pages.home, "services": pages.services, "planner": pages.planner, "contact": pages.contact,
    "guides": pages2.guides, "checklist": pages2.checklist, "parking": pages2.parking, "register": pages2.register,
    "essen": pages2.essen, "about": pages2.about, "imprint": pages2.imprint, "privacy": pages2.privacy,
}

def write(rel, text):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(text)

def main():
    urls = []
    for key, fn in BUILDERS.items():
        for lang in ("de", "en"):
            page = fn(lang)
            write(lib.path_of(key, lang) + "index.html", render(page))
            if not page.get("noindex"):
                urls.append(key)
    # 404 page (absolute asset paths so it works at any depth)
    body = pages2.not_found()
    html = ('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>404 | Stabil Umzug</title><meta name="robots" content="noindex"><link rel="icon" href="/assets/img/favicon.svg">'
            '<link rel="stylesheet" href="/assets/css/site.css"></head><body><main id="main">%s</main></body></html>' % body)
    write("404.html", html)

    cfg = {k: SITE[k] for k in ("company", "email", "whatsapp", "phone", "phone_href", "street", "zip", "city")}
    write("assets/js/site-config.js", "window.SITE=%s;\n" % json.dumps(cfg, ensure_ascii=False))

    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.w3.org/1999/xhtml" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    sm[1] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    for key in urls:
        for lang in ("de", "en"):
            sm.append("<url><loc>%s</loc>" % url_of(key, lang))
            for l2 in ("de", "en"):
                sm.append('<xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (l2, url_of(key, l2)))
            sm.append("</url>")
    sm.append("</urlset>")
    write("sitemap.xml", "\n".join(sm) + "\n")
    write("robots.txt", "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE["domain"])
    write("CNAME", "www.stabilumzug.de\n")
    write(".nojekyll", "")

    ph = [k for k, v in SITE.items() if isinstance(v, str) and is_ph(v)]
    print("Built %d pages. Placeholders still to fill in tools/config.py: %s" % (len(BUILDERS) * 2 + 1, ", ".join(ph)))

if __name__ == "__main__":
    main()
