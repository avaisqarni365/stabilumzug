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
    "email": "info.stabilumzug@gmail.com",
    "whatsapp": "491639688190",             # digits only with country code, e.g. 491701234567 (leave empty to hide)
    "street": "[Straße und Hausnummer]",
    "zip": "[PLZ]",
    "hours": "Mo–Fr 9–19 Uhr · Sa/So 9–17 Uhr",
    # Legal details for the imprint (Impressum). Have them checked by a lawyer.
    "owner": "[Inhaber oder Geschäftsführer]",
    "legal_form": "[Rechtsform]",
    "vat_id": "[USt-IdNr., falls vorhanden]",
    "register": "[Handelsregister und Nummer, falls vorhanden]",
    "hosting": "[Hosting-Anbieter, z. B. GitHub Pages / Netlify / Cloudflare Pages]",
}

# Switch a service off if the company does not offer it. The pages update on the next build.
SERVICES_ENABLED = {
    "private": True,
    "business": True,
    "packing": True,
    "assembly": True,
    "kitchen": True,
    "disposal": True,
    "parking": True,
    "storage": True,
    "restoration": True,   # named on the current website
}

# Real customer reviews go here. The reviews section appears only when this list has entries.
# Example: {"name": "A. Mustermann", "text": "…", "place": "Essen"}
TESTIMONIALS = []
