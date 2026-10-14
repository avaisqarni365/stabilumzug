# Stabil Umzug – Google Sheet back end (Phase 1)

The website stays static (GitHub Pages). A Google Sheet is the database and the back office, and a small
Google Apps Script attached to it is the API the planner talks to. No server, no database to run.

```
Family's phone (static site)  ── POST lead / route / draft ──▶  Apps Script web app  ──▶  Google Sheet
          ▲                                                                                  │
          └──────────── catalogue (data/master.json) ◀── "Katalog veröffentlichen" ─────────┘
```

| File | What it is |
|---|---|
| `apps-script/Code.js` | API, sheet setup, quote calculation, catalogue publishing, triggers |
| `apps-script/Estimator.js` | Copy of `assets/js/estimator.js`, written by `tools/build.py`. Do not edit here. |
| `apps-script/appsscript.json` | Project manifest (time zone, web-app access, scopes) |

## What the sheet contains

| Tab | Content |
|---|---|
| Anfragen | One row per request: status, owner, contact, route, access, estimate, source, master-data version. Status: Neu → In Arbeit → Angebot raus → Gebucht / Verloren |
| Gegenstände | One row per item and source for each request |
| Angebote | Quote lines per request and version (Menge × Satz = Betrag, editable), sum with minimum price |
| Katalog | Master data: one row per item, or per size of an item (`Größe` column). Edited by the office |
| Regeln | Estimator rules (buffer, ranges, weights, vehicle capacities), presets and quick-guess tables |
| Preise | Internal rates (placeholders from the design – replace them). Never published |
| Protokoll | Audit log: who changed which cell in Katalog, Regeln, Preise, and every publication |
| Entwürfe | Drafts saved for "continue on another device" (deleted after 30 days) |
| Konfiguration | `notify_email` (receives new requests and the daily reminder), `master_version` |

## Set up (about 20 minutes, logged in as info@stabilumzug.de)

1. **Create the sheet.** Google Drive → New → Google Sheets. Name it "Stabil Umzug – Anfragen".
2. **Add the script.** In the sheet: Extensions → Apps Script.
   - Rename `Code.gs` and paste the content of `apps-script/Code.js`.
   - Add a script file `Estimator` and paste `apps-script/Estimator.js`.
   - Project Settings (gear) → tick "Show appsscript.json manifest file in editor", open it and paste `apps-script/appsscript.json`.
   - Save.
3. **Script properties** (Project Settings → Script properties):
   - `GITHUB_REPO` = `owner/repository` of this website, `GITHUB_BRANCH` = `main`.
   - `GITHUB_TOKEN` = a GitHub fine-grained personal access token with **Contents: read and write** on this one repository only.
     Needed only for "Katalog veröffentlichen". Store it nowhere else.
   - Optional `SITE_URL` = `https://www.stabilumzug.de` (the first catalogue is then read from the live site instead of GitHub).
4. **Run the setup.** Reload the sheet. Menu **Stabil Umzug → Einrichten**. Google asks for permission once (sheet, e-mail, external requests,
   triggers). Setup creates all tabs, loads the catalogue and rules from `data/master.json`, writes placeholder prices, and installs two triggers
   (edit log, daily 07:00 reminder).
5. **Deploy the web app.** Apps Script → Deploy → New deployment → type **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy.
   Copy the URL ending in `/exec`. Check it: open `<URL>?action=health` – it should show `{"ok":true,...}`.
6. **Connect the website.** Put the URL into `tools/config.py` → `"api": "https://script.google.com/macros/s/…/exec"`, then
   `python3 tools/build.py`, commit and push. The planner now shows "Entfernung berechnen", the contact form with consent,
   "Anfrage senden" and "Auf einem anderen Gerät weitermachen". With `"api": ""` it falls back to WhatsApp/e-mail only.
7. **Before going live:** set the retention period in the privacy page (placeholder in `tools/pages2.py`), replace the prices in "Preise",
   and have the privacy text reviewed.

**After changing the script code:** Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy. The URL stays the same.

## Daily use

- **New request:** an e-mail arrives at `notify_email`; the row appears in "Anfragen" with status "Neu". Set "Zuständig".
- **Quote:** select the request row → menu **Angebot für markierte Anfrage berechnen**. The lines appear in "Angebote" (new version each time);
  adjust Menge or Satz there, the sum updates. The sum is copied into "Angebot €" and the status moves to "In Arbeit".
  Send the quote to the family by WhatsApp or e-mail, then set the status to "Angebot raus".
- **Catalogue:** edit "Katalog" or "Regeln" (every change is logged in "Protokoll"), then **Katalog auf der Website veröffentlichen**.
  The script writes `data/master.json`, `assets/data/master.json` and `assets/js/flow-data.js` to GitHub; the site updates within minutes.
  New requests record the master-data version they were estimated with.
- **Reminder:** every morning at 07:00 an e-mail lists requests still "Neu" after 1 day or "Angebot raus" after 3 days.

## Notes

- **Prices never leave the sheet.** The website only gets volumes, weights, minutes and capacities.
- **Same numbers everywhere:** the script estimates with `Estimator.js`, the same code the planner runs. After changing
  `assets/js/estimator.js`, run the build and paste the new `apps-script/Estimator.js` into the script, then deploy a new version.
- **Protection:** requests must come with consent, a name and a phone or e-mail; a hidden field and a minimum fill-in time stop simple bots;
  at most 60 calls per minute; payloads over 100 KB are refused; text that would start a formula is neutralised.
- **Quotas (consumer / Workspace Individual account):** e-mails and Maps lookups have daily limits that are far above the expected
  request volume. Route results are cached for 6 hours.
- **Data protection:** the sheet holds personal data. Keep the sheet private (do not share by link), give office staff access by
  their own Google login, and delete old rows according to the retention period on the privacy page.
- **Local tests:** the code was tested with Node against mocked Apps Script services (setup, catalogue round trip, leads, route,
  drafts, quotes, publishing, rate limit). Run the real setup once in a copy of the sheet before going live.
