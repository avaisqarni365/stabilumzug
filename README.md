# Stabil Umzug website

Plain static site: German at the root, English under `/en/`. No build step is needed on the host, no cookies, no tracking, no database.

## Fill in your details
Open `tools/config.py`, replace every `[bracketed]` value (phone, email, address, hours, owner, legal form, VAT ID, register, hosting), then run:

    python3 tools/build.py

This regenerates all pages, `assets/js/site-config.js`, `sitemap.xml` and `robots.txt`. Set `whatsapp` (digits only, with country code, e.g. `491701234567`) to enable the WhatsApp button. Switch services on or off in `SERVICES_ENABLED`. Add reviews to `TESTIMONIALS` only when you have real ones.

Page text lives in `tools/pages.py` and `tools/pages2.py`.

## Before going live
- Impressum and Datenschutz are templates. Have them reviewed legally.
- Fill in the insurance answer in the FAQ (tools/pages.py).
- Replace the logo/favicon (`assets/img/favicon.svg`) and the social image (`assets/img/og.png`) when you have final artwork.
- The guides give general orientation only; check them against current rules.

## Publish on GitHub Pages
    git add -A
    git commit -m "Website"
    git push origin main
Then in the repository: Settings > Pages > Deploy from branch `main` / root. The `CNAME` file sets `www.stabilumzug.de`. At your domain provider, point `www` as a CNAME to `avaisqarni365.github.io`. Note: pointing the domain here replaces the current site at that address. Enable "Enforce HTTPS" in Pages once the certificate is ready.
