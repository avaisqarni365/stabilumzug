"""Page bodies part 2: guides, Essen, about, legal pages, 404."""
from config import SITE
from lib import esc, t, link, crumbs, ph, is_ph, url_of
from pages import page_head, cta

def sec(inner, cls=""):
    return '<section class="section%s"><div class="container narrow prose">%s</div></section>' % (cls, inner)

def lis(items):
    return "<ul>%s</ul>" % "".join("<li>%s</li>" % i for i in items)

NOTE_DE = '<p class="note">Allgemeine Orientierung, keine Rechts- oder Behördenauskunft. Fristen und Regeln können sich ändern; prüfen Sie sie bei der zuständigen Stelle.</p>'
NOTE_EN = '<p class="note">General guidance, not legal or official advice. Rules and deadlines can change; check with the responsible authority.</p>'

def guides(lang):
    key = "guides"
    body = page_head(key, lang, t("Ratgeber", "Guides", lang), t("Kurz und praktisch: was vor, während und nach dem Umzug zu tun ist.", "Short and practical: what to do before, during and after your move.", lang))
    items = [("checklist", "Umzugscheckliste", "Moving checklist", "Die wichtigsten Aufgaben, nach Zeitpunkt geordnet.", "The key tasks, ordered by timing."),
             ("parking", "Halteverbotszone beantragen", "Applying for a parking permit zone", "Damit der Umzugswagen nah an der Haustür halten kann.", "So the moving van can stop close to the door."),
             ("register", "Ummeldung nach dem Umzug", "Registering after a move", "Frist, Unterlagen und was Sie nicht vergessen sollten.", "Deadline, documents and what not to forget.")]
    tiles = "".join('<article class="tile"><h3>%s</h3><p>%s</p><a class="more" href="%s">%s</a></article>' % (esc(t(a, b, lang)), esc(t(c, d, lang)), link(key, k, lang), t("Lesen", "Read", lang)) for k, a, b, c, d in items)
    body += '<section class="section"><div class="container"><div class="tiles">%s</div></div></section>' % tiles
    body += cta(key, lang)
    return dict(key=key, lang=lang, title=t("Ratgeber rund um den Umzug | Stabil Umzug", "Moving guides | Stabil Umzug", lang),
                desc=t("Checkliste, Halteverbotszone und Ummeldung: kurze Ratgeber für Ihren Umzug in Deutschland.", "Checklist, parking permit and registration: short guides for moving in Germany.", lang), body=body)

def checklist(lang):
    key = "checklist"
    title = t("Umzugscheckliste", "Moving checklist", lang)
    body = page_head(key, lang, title, t("Was Sie wann erledigen sollten, damit am Umzugstag nichts fehlt.", "What to do and when, so nothing is missing on moving day.", lang), title)
    if lang == "de":
        inner = (NOTE_DE + "<h2>Etwa 8 bis 12 Wochen vorher</h2>" + lis([
            "Mietvertrag prüfen: Die Kündigungsfrist beträgt bei Mietern meist drei Monate. Entscheidend ist Ihr Vertrag.",
            "Bestandsaufnahme: Welche Möbel ziehen mit, was wird verkauft oder entsorgt? Der <a href='%s'>Umzugsplaner</a> hilft dabei." % link(key, "planner", lang),
            "Angebote einholen und einen Termin reservieren."]) +
            "<h2>Etwa 4 Wochen vorher</h2>" + lis([
            "Halteverbotszone beantragen, <a href='%s'>mehr dazu</a>." % link(key, "parking", lang),
            "Urlaubstag und Hilfe von Freunden klären.",
            "Verträge ummelden oder kündigen: Strom, Gas, Internet, Versicherungen.",
            "Nachsendeauftrag einrichten."]) +
            "<h2>Letzte Woche</h2>" + lis([
            "Kartons packen und beschriften, Zimmer für Zimmer.",
            "Kühlschrank abtauen, Waschmaschine abklemmen.",
            "Wertsachen und wichtige Unterlagen selbst mitnehmen.",
            "Zählerstände fotografieren."]) +
            "<h2>Umzugstag und danach</h2>" + lis([
            "Übergabeprotokoll mit dem Vermieter.",
            "Schlüssel zählen und übergeben.",
            "Anmeldung beim Einwohnermeldeamt, <a href='%s'>Details</a>." % link(key, "register", lang),
            "Adresse bei Bank, Arbeitgeber und Versicherungen aktualisieren."]))
    else:
        inner = (NOTE_EN + "<h2>About 8 to 12 weeks before</h2>" + lis([
            "Check your lease: the notice period for tenants is usually three months. Your contract decides.",
            "Take stock: what moves, what is sold or thrown away? The <a href='%s'>moving planner</a> helps." % link(key, "planner", lang),
            "Get quotes and reserve a date."]) +
            "<h2>About 4 weeks before</h2>" + lis([
            "Apply for a parking permit zone, <a href='%s'>more here</a>." % link(key, "parking", lang),
            "Sort out time off and help from friends.",
            "Transfer or cancel contracts: electricity, gas, internet, insurance.",
            "Set up mail forwarding."]) +
            "<h2>Last week</h2>" + lis([
            "Pack and label boxes room by room.",
            "Defrost the fridge, disconnect the washing machine.",
            "Carry valuables and key documents yourself.",
            "Photograph the meter readings."]) +
            "<h2>Moving day and after</h2>" + lis([
            "Handover record with the landlord.",
            "Count and hand over keys.",
            "Register at the residents' registration office, <a href='%s'>details</a>." % link(key, "register", lang),
            "Update your address with bank, employer and insurers."]))
    body += sec(inner) + cta(key, lang)
    return dict(key=key, lang=lang, title=t("Umzugscheckliste: Was wann zu tun ist | Stabil Umzug", "Moving checklist: what to do and when | Stabil Umzug", lang),
                desc=t("Umzugscheckliste für Deutschland, geordnet nach Zeitpunkt: Kündigung, Halteverbot, Packen, Übergabe, Anmeldung.", "Moving checklist for Germany ordered by timing: notice, parking permit, packing, handover, registration.", lang), body=body)

def parking(lang):
    key = "parking"
    title = t("Halteverbotszone beantragen", "Applying for a parking permit zone", lang)
    body = page_head(key, lang, title, t("So kann der Umzugswagen am Umzugstag nah an der Tür stehen.", "How to have the moving van close to the door on moving day.", lang), title)
    if lang == "de":
        inner = (NOTE_DE + "<h2>Wozu eine Halteverbotszone?</h2><p>Der Umzugswagen ist lang und schwer. Steht er weit vom Eingang entfernt, verlängert das den Tag. Mit einer ausgeschilderten Zone ist der Platz freigehalten.</p>"
            "<h2>Wie läuft es ab?</h2>" + lis([
            "Den Antrag stellen Sie bei der zuständigen Straßenverkehrsbehörde Ihrer Stadt, oft online oder schriftlich.",
            "Geben Sie Adresse, Datum, Länge der Zone und Zeitraum an.",
            "Die Bearbeitungszeit und die Gebühr unterscheiden sich je nach Stadt. Fragen Sie früh nach.",
            "Die Schilder werden meist einige Tage vor dem Termin aufgestellt, oft mindestens 72 Stunden vorher. Prüfen Sie die Vorgabe Ihrer Stadt.",
            "Die Zone muss für Dritte erkennbar sein. Parkt trotzdem jemand dort, hilft die Behörde oder der Abschleppdienst."]) +
            "<p>Wir unterstützen Sie gern bei Antrag und Aufstellung. Sagen Sie uns im Planer, dass Sie die Halteverbotszone wünschen.</p>")
    else:
        inner = (NOTE_EN + "<h2>Why a parking permit zone?</h2><p>A moving van is long and heavy. Far from the entrance, it lengthens the day. A signed zone keeps the space free.</p>"
            "<h2>How does it work?</h2>" + lis([
            "You apply to the traffic authority of your city, often online or in writing.",
            "Give the address, date, length of the zone and time period.",
            "Processing time and fee differ by city. Ask early.",
            "Signs usually go up several days before, often at least 72 hours. Check your city's rule.",
            "The zone must be visible to others. If someone parks there anyway, the authority or a towing service can help."]) +
            "<p>We are happy to help with the application and the signs. Tell us in the planner that you want the zone.</p>")
    body += sec(inner) + cta(key, lang)
    return dict(key=key, lang=lang, title=t("Halteverbotszone beantragen | Stabil Umzug", "Parking permit zone for moving day | Stabil Umzug", lang),
                desc=t("Halteverbotszone für den Umzug: wo beantragen, was angeben, wie früh. Allgemeine Orientierung für Essen und Deutschland.", "Parking permit zone for moving day: where to apply, what to state, how early. General guidance for Essen and Germany.", lang), body=body)

def register(lang):
    key = "register"
    title = t("Ummeldung nach dem Umzug", "Registering after a move", lang)
    body = page_head(key, lang, title, t("Frist, Unterlagen und typische Fehler.", "Deadline, documents and common mistakes.", lang), title)
    if lang == "de":
        inner = (NOTE_DE + "<h2>Frist</h2><p>Nach dem Einzug melden Sie sich beim Einwohnermeldeamt an, in der Regel innerhalb von zwei Wochen. Bei Verspätung kann ein Bußgeld drohen, das bis zu 1.000 Euro betragen kann.</p>"
            "<h2>Was Sie brauchen</h2>" + lis([
            "Personalausweis oder Reisepass.",
            "Die Wohnungsgeberbestätigung Ihres Vermieters.",
            "Anmeldeformular, oft online verfügbar.",
            "Bei Familien: Heirats- oder Geburtsurkunden, wenn die Behörde sie verlangt."]) +
            "<h2>Gut zu wissen</h2>" + lis([
            "Bei einem Umzug innerhalb Deutschlands ist eine Abmeldung am alten Ort in der Regel nicht nötig.",
            "Termine sind oft knapp. Buchen Sie früh.",
            "Danach: Adresse bei Bank, Arbeitgeber, Versicherungen, Rundfunkbeitrag und Kfz-Zulassung aktualisieren."]))
    else:
        inner = (NOTE_EN + "<h2>Deadline</h2><p>After moving in, you register at the residents' registration office, normally within two weeks. A late registration can lead to a fine of up to 1,000 euros.</p>"
            "<h2>What you need</h2>" + lis([
            "Identity card or passport.",
            "The landlord's confirmation of residence (Wohnungsgeberbestätigung).",
            "Registration form, often available online.",
            "For families: marriage or birth certificates if the office asks for them."]) +
            "<h2>Good to know</h2>" + lis([
            "For a move within Germany you usually do not need to deregister at the old place.",
            "Appointments can be scarce. Book early.",
            "Afterwards: update your address with bank, employer, insurers, broadcasting fee and vehicle registration."]))
    body += sec(inner) + cta(key, lang)
    return dict(key=key, lang=lang, title=t("Ummeldung nach dem Umzug: Frist und Unterlagen | Stabil Umzug", "Registering after a move: deadline and documents | Stabil Umzug", lang),
                desc=t("Anmeldung nach dem Umzug in Deutschland: Zwei-Wochen-Frist, Wohnungsgeberbestätigung, Unterlagen.", "Registering after a move in Germany: two-week deadline, landlord confirmation, documents.", lang), body=body)

def essen(lang):
    key = "essen"
    title = t("Umzug in Essen", "Moving in Essen", lang)
    body = page_head(key, lang, title, t("Wir sitzen in Essen und kennen die Wege im Ruhrgebiet.", "We are based in Essen and know the routes across the Ruhr area.", lang), title)
    if lang == "de":
        inner = ("<p>Ob Altbau in Rüttenscheid, Hochhaus im Norden oder Haus im Süden: Der Zugang entscheidet über Zeit und Team. Wir fragen deshalb nach Etage, Aufzug, Treppen und Parkmöglichkeit.</p>"
                 "<h2>Was in Essen oft hilft</h2>" + lis([
                 "Frühzeitig eine <a href='%s'>Halteverbotszone</a> beantragen, besonders in dicht bebauten Straßen." % link(key, "parking", lang),
                 "Enge Treppenhäuser im Altbau im Planer angeben, damit das Team passend plant.",
                 "Nach dem Einzug innerhalb der Frist <a href='%s'>anmelden</a>." % link(key, "register", lang)]) +
                 "<p>Planen Sie Ihren Umzug mit dem <a href='%s'>Umzugsplaner</a> und senden Sie uns die Zusammenfassung.</p>" % link(key, "planner", lang))
    else:
        inner = ("<p>Whether an old building in Rüttenscheid, a tower block in the north or a house in the south: access decides time and crew. So we ask about floor, lift, stairs and parking.</p>"
                 "<h2>What often helps in Essen</h2>" + lis([
                 "Apply early for a <a href='%s'>parking permit zone</a>, especially in dense streets." % link(key, "parking", lang),
                 "State narrow stairwells in old buildings in the planner so the crew plans accordingly.",
                 "<a href='%s'>Register</a> within the deadline after moving in." % link(key, "register", lang)]) +
                 "<p>Plan your move with the <a href='%s'>moving planner</a> and send us the summary.</p>" % link(key, "planner", lang))
    body += sec(inner) + cta(key, lang)
    return dict(key=key, lang=lang, title=t("Umzug in Essen | Stabil Umzug", "Moving in Essen | Stabil Umzug", lang),
                desc=t("Umzugsunternehmen in Essen: Planung, Halteverbotszone, Montage und Transport im Ruhrgebiet und deutschlandweit.", "Moving company in Essen: planning, parking permit, assembly and transport across the Ruhr area and Germany.", lang), body=body)

def about(lang):
    key = "about"
    title = t("Über uns", "About us", lang)
    body = page_head(key, lang, title, t("Ein Umzugsunternehmen aus Essen, das Planung einfach machen will.", "A moving company from Essen that wants to make planning simple.", lang), title)
    if lang == "de":
        inner = ("<p>Ein Umzug ist viele Schritte: Wohnung messen, Möbel erfassen, Zugang klären, Termin, Halteverbot, Kartons, Aufbau, Anmeldung. Wir haben diesen Ablauf in einen einfachen Planer übersetzt, damit Sie weniger vergessen und wir besser kalkulieren können.</p>"
                 "<p>[Hier kurze Vorstellung des Unternehmens, des Teams und der Erfahrung eintragen]</p>")
    else:
        inner = ("<p>A move is many steps: measure the flat, list furniture, clarify access, date, parking permit, boxes, assembly, registration. We turned this flow into a simple planner so you forget less and we can quote better.</p>"
                 "<p>[Add a short introduction of the company, team and experience here]</p>")
    inner = inner.replace("<p>[", '<p class="ph">[')
    body += sec(inner) + cta(key, lang)
    return dict(key=key, lang=lang, title=t("Über uns | Stabil Umzug Essen", "About us | Stabil Umzug Essen", lang),
                desc=t("Stabil Umzug aus Essen: Umzug einfach planen.", "Stabil Umzug from Essen: simple moving planning.", lang), body=body)

def imprint(lang):
    key = "imprint"
    title = t("Impressum", "Imprint", lang)
    body = page_head(key, lang, title, "", title)
    rows = [("Anbieter", "Provider", SITE["company"]), ("Rechtsform", "Legal form", SITE["legal_form"]), ("Inhaber/Geschäftsführung", "Owner / management", SITE["owner"]),
            ("Anschrift", "Address", "%s, %s %s" % (SITE["street"], SITE["zip"], SITE["city"])), ("Telefon", "Phone", SITE["phone"]), ("E-Mail", "Email", SITE["email"]),
            ("USt-IdNr.", "VAT ID", SITE["vat_id"]), ("Register", "Register", SITE["register"])]
    tbl = "<table>%s</table>" % "".join("<tr><th scope='row'>%s</th><td>%s</td></tr>" % (esc(t(a, b, lang)), ph(c)) for a, b, c in rows)
    flag = '<p class="legal-flag">%s</p>' % t("Vorlage nach § 5 DDG. Vor der Veröffentlichung vollständig ausfüllen und rechtlich prüfen lassen.", "Template under § 5 DDG. Complete it and have it reviewed legally before publishing.", lang)
    body += sec(flag + '<div class="table-wrap">%s</div>' % tbl)
    return dict(key=key, lang=lang, title=t("Impressum | Stabil Umzug", "Imprint | Stabil Umzug", lang), desc=t("Impressum von Stabil Umzug, Essen.", "Imprint of Stabil Umzug, Essen.", lang), body=body, noindex=True)

def privacy(lang):
    key = "privacy"
    title = t("Datenschutz", "Privacy", lang)
    body = page_head(key, lang, title, "", title)
    flag = '<p class="legal-flag">%s</p>' % t("Vorlage. Vor der Veröffentlichung rechtlich prüfen lassen und die Angaben zum Hosting ergänzen.", "Template. Have it reviewed legally before publishing and add the hosting details.", lang)
    if lang == "de":
        inner = ("<h2>Verantwortlicher</h2><p>%s, %s, %s %s. E-Mail: %s</p>"
                 "<h2>Hosting</h2><p>Diese Website wird bei %s gehostet. Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten, etwa die IP-Adresse, in Server-Logfiles.</p>"
                 "<h2>Cookies und Tracking</h2><p>Wir setzen keine Cookies und keine Analyse- oder Werbedienste ein. Schriften und Skripte laden wir von unserer eigenen Domain.</p>"
                 "<h2>Umzugsplaner</h2><p>Ihre Eingaben im Planer werden nur in Ihrem Browser verarbeitet. Sie werden nicht gespeichert und nicht an uns übertragen. Erst wenn Sie das PDF selbst per E-Mail oder WhatsApp senden, erhalten wir die darin enthaltenen Angaben. Dabei gelten die Datenschutzbestimmungen Ihres E-Mail- oder Messenger-Anbieters.</p>"
                 "<h2>Kontakt</h2><p>Wenn Sie uns schreiben, verarbeiten wir Ihre Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO).</p>"
                 "<h2>Ihre Rechte</h2><p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde.</p>")
    else:
        inner = ("<h2>Controller</h2><p>%s, %s, %s %s. Email: %s</p>"
                 "<h2>Hosting</h2><p>This website is hosted by %s. When you visit, the host processes technically necessary data, such as the IP address, in server logs.</p>"
                 "<h2>Cookies and tracking</h2><p>We use no cookies and no analytics or advertising services. Fonts and scripts load from our own domain.</p>"
                 "<h2>Moving planner</h2><p>Your entries in the planner are processed only in your browser. They are not stored and not transferred to us. Only when you send the PDF yourself by email or WhatsApp do we receive the details in it. The privacy terms of your email or messenger provider apply.</p>"
                 "<h2>Contact</h2><p>If you write to us we process your details to handle the request (Art. 6(1)(b) GDPR).</p>"
                 "<h2>Your rights</h2><p>You have rights of access, rectification, erasure, restriction, portability and objection, and the right to complain to a supervisory authority.</p>")
    inner = inner % (ph(SITE["company"]), ph(SITE["street"]), ph(SITE["zip"]), esc(SITE["city"]), ph(SITE["email"]), ph(SITE["hosting"]))
    body += sec(flag + inner)
    return dict(key=key, lang=lang, title=t("Datenschutz | Stabil Umzug", "Privacy | Stabil Umzug", lang), desc=t("Datenschutzerklärung von Stabil Umzug.", "Privacy policy of Stabil Umzug.", lang), body=body, noindex=True)

def not_found():
    body = ('<section class="section"><div class="container narrow prose"><h1>Seite nicht gefunden / Page not found</h1>'
            '<p>Die Seite gibt es nicht (mehr). <a href="/">Zur Startseite</a> · This page does not exist. <a href="/en/">Back to home</a></p></div></section>')
    return body
