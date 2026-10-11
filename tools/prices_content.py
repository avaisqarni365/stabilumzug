"""Price list (customer's starting prices). Shown on the site only when config.PRICES_PUBLISHED is True.
Every price is a starting price ("ab"); the final price follows the personal quote.
Each entry: (German label, English label, price in euros or None for "on request", German note, English note)."""

PACKAGES = [
    {"key": "small", "price": 249,
     "de": ("Klein-Umzug", "Für Studenten, Singles und kleine Wohnungen",
            ["Kleine Möbel und Umzugskartons", "Transport und Tragehilfe", "Be- und Entladen"]),
     "en": ("Small move", "For students, singles and small flats",
            ["Small furniture and moving boxes", "Transport and carrying help", "Loading and unloading"])},
    {"key": "medium", "price": 499, "featured": True,
     "de": ("Mittel-Umzug", "Für 2–3-Zimmer-Wohnungen",
            ["Transport von Möbeln und Kartons", "Be- und Entladen", "Möbelabbau und -aufbau optional"]),
     "en": ("Medium move", "For two- to three-room flats",
            ["Transport of furniture and boxes", "Loading and unloading", "Furniture dismantling and assembly optional"])},
    {"key": "large", "price": 899,
     "de": ("Groß-Umzug", "Für große Wohnungen und Häuser",
            ["Transport des Hausrats", "Be- und Entladen", "Möbelmontage optional", "Verpackungsservice optional"]),
     "en": ("Large move", "For large flats and houses",
            ["Transport of the household", "Loading and unloading", "Furniture assembly optional", "Packing service optional"])},
    {"key": "business", "price": None,
     "de": ("Firmen-Umzug", "Büro- und Gewerbeumzüge",
            ["Transport von Büromöbeln und Arbeitsmaterialien", "Möbelmontage nach Vereinbarung", "Individuelle Planung"]),
     "en": ("Business move", "Office and commercial moves",
            ["Transport of office furniture and work materials", "Furniture assembly by arrangement", "Individual planning"])},
]

GROUPS = [
    {"key": "clearance", "service": "clearance",
     "de": "Entrümpelung", "en": "Clear-outs",
     "rows": [("Kellerentrümpelung", "Cellar clear-out", 149), ("Dachbodenentrümpelung", "Attic clear-out", 199),
              ("Garagenentrümpelung", "Garage clear-out", 199), ("Wohnungsentrümpelung", "Flat clear-out", 299),
              ("Hausentrümpelung", "House clear-out", 499), ("Gewerbliche Entrümpelung", "Commercial clear-out", None)]},
    {"key": "dissolution", "service": "dissolution",
     "de": "Wohnungs- und Haushaltsauflösung", "en": "Flat and household clearance",
     "rows": [("Kleine Wohnungsauflösung", "Small flat clearance", 399), ("Mittlere Wohnungsauflösung", "Medium flat clearance", 699),
              ("Große Wohnungsauflösung", "Large flat clearance", 999), ("Komplette Haushaltsauflösung", "Complete household clearance", "offer"),
              ("Besenreine Übergabe", "Broom-clean handover", "agreed")]},
    {"key": "transport", "service": "transport",
     "de": "Transportservice", "en": "Transport service",
     "rows": [("Kleintransport", "Small transport", 79), ("Möbeltransport", "Furniture transport", 99),
              ("Möbelabholung und Lieferung", "Furniture pickup and delivery", 79), ("Transport einzelner Möbelstücke", "Single pieces of furniture", None),
              ("Größere Transporte", "Larger transports", "offer")]},
]

EXTRAS = [("Möbelabbau und Möbelaufbau", "Furniture dismantling and assembly"), ("Ein- und Auspackservice", "Packing and unpacking"),
          ("Umzugskartons und Verpackungsmaterial", "Moving boxes and packing material"), ("Tragehilfe", "Carrying help"),
          ("Sperrmüllentsorgung", "Bulky-waste disposal"), ("Halteverbotszone nach Vereinbarung", "No-parking zone by arrangement")]

# What decides the final price – stated on the page, as the customer asked.
CONDITIONS = {
    "de": ["Alle Preise sind Startpreise („ab“). Den verbindlichen Preis nennen wir im persönlichen Angebot.",
           "Der Endpreis hängt vom tatsächlichen Aufwand ab: Menge und Volumen, Etage, Aufzug und Tragewege, Anfahrt und Entfernung, Anzahl der Mitarbeiter und Entsorgungskosten.",
           "Zusatzleistungen wie Möbelmontage, Verpackung oder Halteverbotszone werden nach Vereinbarung berechnet.",
           "Das Angebot ist kostenlos und unverbindlich."],
    "en": ["All prices are starting prices (“from”). We state the binding price in your personal quote.",
           "The final price depends on the actual effort: amount and volume, floor, lift and carrying distance, travel and distance, number of staff and disposal costs.",
           "Extra services such as furniture assembly, packing or a no-parking zone are charged by arrangement.",
           "The quote is free and non-binding."],
}
