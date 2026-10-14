"""Single source for everything that is specific to the business.

Edit the values below, then run:  python3 tools/build.py
Every value that still looks like [Something in brackets] is a placeholder
that must be replaced before the site goes live (the build prints a list).
"""

SITE = {
    "domain": "https://www.stabilumzug.de",
    "company": "Stabil Umzug",
    "city": "Essen",
    "region": "Nordrhein-Westfalen",
    # Contact details shown in the footer, on the contact page and used by the planner.
    "phone": "0163 9688190",
    "phone_href": "+491639688190",           # digits with country code for the call link, e.g. +4920112345678
    "email": "info@stabilumzug.de",
    "whatsapp": "491639688190",             # digits only with country code, e.g. 491701234567 (leave empty to hide)
    # Phase 1: URL of the Google Apps Script web app (ends in /exec). Empty = the planner works without the sheet (WhatsApp/e-mail only).
    "api": "https://script.google.com/macros/s/AKfycbz_7zZfYBWLPdU-jFSh5xRbhfQxRoBJoeeKUDYFZRQSTKxlqWZUphCrcgbLgb1HjwPB/exec",
    # Admin area (Apps Script web app, staff sign in with Google). Linked from /admin/ and the footer.
    "admin_url": "https://script.google.com/macros/s/AKfycbzUZgpxmhV4uVShxvhiZIYfYCCA7MUS3EbQUi5xGdONb-3d_Ddxeh5Iw2QroV9a7dc4/exec",
    "street": "Karlstraße 32",
    "zip": "45329",
    "hours": "Mo–Fr 9–19 Uhr · Sa/So 9–17 Uhr",
    # Legal details for the imprint (Impressum). Have them checked by a lawyer.
    "owner": "Ibrahim Abdelaal",
    # short introduction of the company and team for the About page (left empty: the section is not shown)
    "about_intro_de": "",
    "about_intro_en": "",
    "legal_form": "Einzelunternehmen",
    "vat_id": "DE458214531",
    "register": "",
    "hosting": "GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA)",
}

# Price list page (tools/prices_content.py). False = page is built for review at /preise/ but hidden (noindex, not linked).
PRICES_PUBLISHED = False

# Real customer reviews go here. The reviews section appears only when this list has entries.
# Example: {"name": "A. Mustermann", "text": "…", "place": "Essen"}
TESTIMONIALS = []
