"""Service area: Essen districts and nearby cities, for the local landing pages and the footer.
Distances and drive times come from tools/places_routes.json (Google Maps, from Karlstraße 32, 45329 Essen;
recalculate when the depot moves). Local notes are short, factual and specific to the place."""
import json, os

_ROUTES = {r["name"]: r for r in json.load(open(os.path.join(os.path.dirname(__file__), "places_routes.json"), encoding="utf-8"))}

# key, name, group ("essen" district or "city"), neighbours (names, linked when they have a page), local note DE/EN
PLACES = [
    ("altenessen", "Altenessen", "essen", ["Katernberg", "Karnap", "Vogelheim", "Bergeborbeck"],
     ("Hier ist unser Standort: Karlstraße 32. Kürzer geht die Anfahrt nicht – ideal für kurzfristige Termine und kleine Transporte.",
      "Our depot is here at Karlstraße 32. No shorter trip is possible – ideal for short-notice dates and small transports.")),
    ("ruettenscheid", "Rüttenscheid", "essen", ["Holsterhausen", "Bredeney", "Südviertel", "Stadtwald"],
     ("Viele Altbauten ohne Aufzug und kaum freie Parkplätze rund um die Rüttenscheider Straße: Hier lohnt sich fast immer eine Halteverbotszone.",
      "Many old buildings without a lift and hardly any free parking around Rüttenscheider Straße: a no-parking zone almost always pays off here.")),
    ("borbeck", "Borbeck", "essen", ["Frohnhausen", "Bochold", "Bedingrade", "Dellwig"],
     ("Rund um den Borbecker Markt und das Schloss Borbeck wechseln sich Mehrfamilienhäuser und Einfamilienhäuser ab – wir planen Team und Fahrzeug passend zum Haus.",
      "Around Borbeck market and Schloss Borbeck, apartment blocks and family homes alternate – we plan crew and vehicle to suit the building.")),
    ("steele", "Steele", "essen", ["Kray", "Überruhr", "Horst", "Freisenbruch"],
     ("In der Steeler Altstadt und der Fußgängerzone darf der Wagen nur mit Genehmigung halten – wir klären die Zufahrt vorab.",
      "In Steele's old town and pedestrian zone the van may only stop with a permit – we clarify access in advance.")),
    ("werden", "Werden", "essen", ["Kettwig", "Bredeney", "Heidhausen", "Fischlaken"],
     ("Die Werdener Altstadt hat enge, steile Gassen. Für große Möbel planen wir mehr Träger oder einen kleineren Transporter ein.",
      "Werden's old town has narrow, steep lanes. For large furniture we plan more carriers or a smaller van.")),
    ("kettwig", "Kettwig", "essen", ["Werden", "Schuir", "Mülheim an der Ruhr"],
     ("Kettwig liegt an der Ruhr mit verwinkelter Altstadt und vielen Hanglagen – Zugang und Tragewege klären wir vor dem Angebot.",
      "Kettwig sits on the Ruhr with a winding old town and many hillside streets – we check access and carrying distances before the quote.")),
    ("frohnhausen", "Frohnhausen", "essen", ["Holsterhausen", "Borbeck", "Altendorf", "Margarethenhöhe"],
     ("Dicht bebaute Wohnstraßen mit vielen Mehrfamilienhäusern: Etage, Aufzug und Parkplatz entscheiden hier über den Zeitplan.",
      "Densely built residential streets with many apartment blocks: floor, lift and parking decide the schedule here.")),
    ("holsterhausen", "Holsterhausen", "essen", ["Rüttenscheid", "Frohnhausen", "Südviertel"],
     ("Rund um das Universitätsklinikum ist Parkraum knapp und der Verkehr dicht – wir starten früh und halten die Zone frei.",
      "Around the university hospital parking is scarce and traffic heavy – we start early and keep the zone clear.")),
    ("kray", "Kray", "essen", ["Steele", "Frillendorf", "Leithe"],
     ("Kurze Wege zur A40: Umzüge von Kray nach Bochum, Gelsenkirchen oder Dortmund sind meist an einem Tag erledigt.",
      "Short distance to the A40: moves from Kray to Bochum, Gelsenkirchen or Dortmund are usually done in one day.")),
    ("bredeney", "Bredeney", "essen", ["Rüttenscheid", "Werden", "Schuir", "Baldeney"],
     ("Große Wohnungen und Häuser nahe Baldeneysee und Villa Hügel: oft viel Möbelmontage, Klaviere und lange Einfahrten.",
      "Large flats and houses near Lake Baldeney and Villa Hügel: often a lot of furniture assembly, pianos and long driveways.")),
    ("katernberg", "Katernberg", "essen", ["Altenessen", "Stoppenberg", "Schonnebeck"],
     ("Direkt neben dem Welterbe Zollverein und nur wenige Minuten von unserem Standort – kurze Anfahrt, flexible Termine.",
      "Right next to the Zollverein World Heritage Site and only minutes from our depot – short trip, flexible dates.")),
    ("stadtkern", "Stadtkern", "essen", ["Südviertel", "Nordviertel", "Westviertel", "Ostviertel"],
     ("In der Innenstadt mit Fußgängerzone und Limbecker Platz brauchen Umzugswagen eine Sondergenehmigung oder Halteverbotszone – das übernehmen wir.",
      "In the city centre with its pedestrian zone and Limbecker Platz, moving vans need a special permit or no-parking zone – we take care of it.")),
    ("bochum", "Bochum", "city", ["Wattenscheid", "Langendreer", "Ehrenfeld", "Linden"],
     ("Über die A40 ist Bochum schnell erreicht. Studentenumzüge rund um die Ruhr-Universität erledigen wir oft mit dem kleinen Transporter.",
      "Bochum is quickly reached via the A40. Student moves around the Ruhr University are often done with the small van.")),
    ("gelsenkirchen", "Gelsenkirchen", "city", ["Buer", "Horst", "Schalke", "Erle"],
     ("Gelsenkirchen grenzt direkt an Essen-Nord – von Altenessen sind wir in einer Viertelstunde vor Ort.",
      "Gelsenkirchen borders northern Essen directly – from Altenessen we are there in a quarter of an hour.")),
    ("muelheim", "Mülheim an der Ruhr", "city", ["Saarn", "Speldorf", "Heißen", "Broich"],
     ("Zwischen Ruhrufer und Wohngebieten an Hanglagen: Für Mülheim planen wir Tragewege und Etagen besonders genau.",
      "Between the Ruhr banks and hillside neighbourhoods: for Mülheim we plan carrying distances and floors particularly carefully.")),
    ("oberhausen", "Oberhausen", "city", ["Sterkrade", "Osterfeld", "Alt-Oberhausen"],
     ("Ob Sterkrade oder Alt-Oberhausen: Über A42 und A516 sind wir schnell da, auch für Möbeltransporte vom Einkauf.",
      "Whether Sterkrade or Alt-Oberhausen: via the A42 and A516 we are there quickly, including for furniture you have just bought.")),
    ("duisburg", "Duisburg", "city", ["Ruhrort", "Rheinhausen", "Meiderich", "Neudorf"],
     ("Duisburg erstreckt sich auf beiden Rheinseiten. Bei Umzügen über den Rhein planen wir Brücken- und Stauzeiten ein.",
      "Duisburg spans both banks of the Rhine. For moves across the river we allow for bridges and traffic jams.")),
    ("dortmund", "Dortmund", "city", ["Hörde", "Aplerbeck", "Innenstadt", "Hombruch"],
     ("Rund 40 Kilometer über die A40 oder B1: Für Dortmund starten wir früh, damit Be- und Entladen an einem Tag klappen.",
      "About 40 kilometres via the A40 or B1: for Dortmund we start early so loading and unloading fit into one day.")),
    ("bottrop", "Bottrop", "city", ["Kirchhellen", "Fuhlenbrock", "Eigen"],
     ("Bottrop liegt direkt nördlich von Altenessen – eine der kürzesten Anfahrten in unserem Einsatzgebiet.",
      "Bottrop lies directly north of Altenessen – one of the shortest trips in our service area.")),
    ("gladbeck", "Gladbeck", "city", ["Brauck", "Rentfort", "Zweckel"],
     ("Von Altenessen nach Gladbeck sind es nur wenige Minuten – kurzfristige Termine und Entrümpelungen sind gut planbar.",
      "From Altenessen to Gladbeck takes only minutes – short-notice dates and clear-outs are easy to plan.")),
    ("herne", "Herne", "city", ["Wanne-Eickel", "Sodingen"],
     ("Über die A42 schnell erreichbar, ob Herne-Mitte oder Wanne-Eickel.",
      "Quickly reached via the A42, whether central Herne or Wanne-Eickel.")),
    ("velbert", "Velbert", "city", ["Neviges", "Langenberg"],
     ("Velbert liegt im hügeligen Niederbergischen: Steile Zufahrten und Hanglagen berücksichtigen wir schon bei der Fahrzeugwahl.",
      "Velbert lies in the hilly Niederberg area: steep driveways and slopes are part of our vehicle choice.")),
    ("hattingen", "Hattingen", "city", ["Blankenstein", "Welper", "Niederwenigern"],
     ("Die Hattinger Altstadt mit Fachwerkhäusern ist eng und teils autofrei – Zufahrt und Tragewege klären wir vorab.",
      "Hattingen's half-timbered old town is narrow and partly car-free – we clarify access and carrying distances beforehand.")),
    ("duesseldorf", "Düsseldorf", "city", ["Bilk", "Oberkassel", "Benrath", "Pempelfort"],
     ("Rund 40 Kilometer über die A52: Für die Landeshauptstadt planen wir Halteverbot und Anfahrt mit Puffer für den Berufsverkehr.",
      "About 40 kilometres via the A52: for the state capital we plan the no-parking zone and travel with a buffer for rush hour.")),
]

def route(name):
    r = _ROUTES.get(name, {})
    return r.get("km"), r.get("min")

def page_key(key):
    return "place_" + key

def paths(key, group):
    if group == "essen":
        return ("umzug-essen/%s/" % key, "en/moving-essen/%s/" % key)
    return ("umzug-%s/" % key, "en/moving-%s/" % key)

def display(name, group, lang):
    if group == "essen":
        return ("Essen-" if lang == "de" else "Essen-") + name
    return name
