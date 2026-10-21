"""Furniture pick-up, delivery and assembly from furniture shops (service page "furniture"). Inline links: [[key|text]].

SHOPS: only shops whose address was checked (October 2026). Opening hours are deliberately not shown: they change and
differ between sources, the page asks people to check them with the shop. The shop names are trademarks of their owners;
we are not a partner of these shops (said on the page).
"""

SHOPS = [
    ("Essen", [
        ("IKEA Essen", "Altendorfer Straße 2", "45127 Essen"),
        ("ROLLER Essen", "Altendorfer Straße 4", "45127 Essen"),
        ("XXXLutz Essen", "Hans-Böckler-Straße 80", "45127 Essen"),
        ("POCO Essen", "Weigelwerkstraße 8", "45326 Essen"),
    ]),
    ("Ruhrgebiet", [
        ("Ostermann Bottrop", "Ruhrölstraße 1", "46240 Bottrop"),
        ("Ostermann Witten", "Fredi-Ostermann-Straße 1", "58454 Witten"),
        ("IKEA Dortmund", "Borussiastraße 120", "44149 Dortmund"),
        ("IKEA Duisburg", "", "Duisburg"),
    ]),
]

# Typical assembly times for two people, guide values (de, en, time de, time en)
ASSEMBLY_TIMES = [
    ("Regal oder Bücherregal", "Shelf or bookcase", "20–45 Min.", "20–45 min"),
    ("Sofa oder Wohnlandschaft", "Sofa or corner sofa", "15–45 Min.", "15–45 min"),
    ("Kommode oder Sideboard", "Chest of drawers or sideboard", "30–60 Min.", "30–60 min"),
    ("Esstisch mit Stühlen", "Dining table with chairs", "30–60 Min.", "30–60 min"),
    ("Doppelbett mit Lattenrost", "Double bed with slatted frame", "45–90 Min.", "45–90 min"),
    ("Kleiderschrank, 2 Türen", "Wardrobe, 2 doors", "1–2 Std.", "1–2 h"),
    ("Schranksystem bis 3 m Breite", "Wardrobe system up to 3 m wide", "3–5 Std.", "3–5 h"),
]

FURNITURE = {
    "paths": ("moebel-abholung/", "en/furniture-pickup/"),
    "icon": "box",
    "de": {
        "nav": "Möbel abholen & aufbauen",
        "title": "Möbel abholen, liefern und aufbauen in Essen",
        "lead": "Neue Möbel gekauft, aber kein Transporter und keine Zeit zum Aufbauen? Wir holen Ihre Möbel im Möbelhaus oder bei privaten Verkäufern ab, tragen sie in Ihre Wohnung und bauen sie fertig auf – in Essen und im ganzen Ruhrgebiet.",
        "teaser": "Abholung im Möbelhaus, Lieferung bis in die Wohnung und fertiger Aufbau – alles aus einer Hand.",
        "seo": "Möbel abholen und aufbauen lassen in Essen | Stabil Umzug",
        "desc": "Möbel-Abholservice in Essen: Wir holen Ihre Möbel bei IKEA, ROLLER, POCO, XXXLutz oder privat ab, liefern bis in die Wohnung und bauen sie auf.",
        "items": [
            ["Abholung im Möbelhaus", "Sie kaufen und bezahlen, wir holen ab – an der Warenausgabe oder Abholstation, zu den Öffnungszeiten des Möbelhauses."],
            ["Lieferung bis in die Wohnung", "Wir tragen alles in die gewünschte Etage und in den richtigen Raum, auch ohne Aufzug."],
            ["Möbelaufbau und Montage", "Wir bauen Schränke, Betten, Kommoden, Regale und Tische nach Anleitung auf und befestigen sie auf Wunsch an der Wand."],
            ["Online bestellte Möbel", "Kommt Ihre Bestellung nur bis zur Bordsteinkante, tragen wir die Pakete hoch, packen aus und bauen auf."],
            ["Kleinanzeigen und Privatkäufe", "Wir holen gebrauchte Möbel bei privaten Verkäufern ab, bauen sie dort ab und bei Ihnen wieder auf."],
            ["Verpackung mitnehmen", "Kartons, Folien und Styropor nehmen wir auf Wunsch mit, damit Ihre Wohnung gleich bewohnbar ist."],
        ],
        "process": [
            ["Anfrage", "Sagen Sie uns, was Sie gekauft haben und wo es abgeholt wird – am einfachsten per WhatsApp mit einem Foto der Bestellung oder des Abholscheins."],
            ["Angebot und Termin", "Sie bekommen ein persönliches Angebot und einen Termin, der zu Ihnen passt."],
            ["Abholung und Lieferung", "Wir holen die Ware ab, prüfen die Pakete auf Vollständigkeit und sichtbare Schäden und bringen sie zu Ihnen."],
            ["Aufbau", "Wir bauen auf, stellen alles an seinen Platz und nehmen auf Wunsch die Verpackung mit."],
        ],
        "included": [
            "Team und Transporter",
            "Abholung im Möbelhaus oder bei privaten Verkäufern",
            "Tragen bis in die Wohnung, auch ohne Aufzug",
            "Aufbau nach Herstelleranleitung",
            "Wandbefestigung nach Vereinbarung",
            "Mitnahme der Verpackung nach Vereinbarung",
        ],
        "faq": [
            ["Holen Sie auch bei IKEA ab?", "Ja. Wir holen bei IKEA, ROLLER, POCO, XXXLutz, Ostermann und bei jedem anderen Möbelhaus ab. Sie kaufen und bezahlen selbst; wir brauchen den Abholschein oder die Bestellnummer. Wir sind kein Partner der Möbelhäuser, sondern holen in Ihrem Auftrag ab."],
            ["Was kostet Abholung und Aufbau?", "Das hängt von Strecke, Menge, Etage und Aufbauzeit ab. Sie bekommen vorab ein kostenloses, persönliches Angebot – per [[quote|Angebotsformular]], Telefon oder WhatsApp."],
            ["Muss ich bei der Abholung dabei sein?", "Das hängt vom Möbelhaus ab. Oft reichen Abholschein und eine kurze Vollmacht. Wir klären vorab mit Ihnen, was nötig ist."],
            ["Wie lange dauert der Aufbau?", "Die Richtwerte oben auf dieser Seite gelten für zwei Personen. Große Schranksysteme und Möbel mit vielen Schubladen brauchen länger; die genaue Zeit steht in Ihrem Angebot."],
            ["Bauen Sie auch Küchen auf?", "Ja, den Küchenaufbau finden Sie bei unseren [[extras|Zusatzleistungen]]."],
        ],
        "guides": ["assembly", "access", "truck"],
    },
    "en": {
        "nav": "Furniture pick-up & assembly",
        "title": "Furniture pick-up, delivery and assembly in Essen",
        "lead": "Bought new furniture but have no van and no time to assemble it? We pick up your furniture at the shop or from private sellers, carry it into your home and assemble it – in Essen and across the Ruhr area.",
        "teaser": "Pick-up at the furniture shop, delivery into your home and assembly – all from one provider.",
        "seo": "Furniture pick-up and assembly in Essen | Stabil Umzug",
        "desc": "Furniture pick-up in Essen: we collect from IKEA, ROLLER, POCO, XXXLutz or private sellers, deliver into your home and assemble it.",
        "items": [
            ["Pick-up at the furniture shop", "You buy and pay, we collect – at the goods issue or pick-up point, during the shop's opening hours."],
            ["Delivery into your home", "We carry everything to the right floor and room, even without a lift."],
            ["Furniture assembly", "We assemble wardrobes, beds, chests of drawers, shelves and tables following the instructions and fix them to the wall if you wish."],
            ["Furniture ordered online", "If your order is only delivered to the kerb, we carry the parcels up, unpack and assemble."],
            ["Second-hand and private purchases", "We collect used furniture from private sellers, take it apart there and put it back together at your home."],
            ["Packaging taken away", "We take boxes, film and polystyrene with us if you wish, so your home is ready to use straight away."],
        ],
        "process": [
            ["Request", "Tell us what you bought and where it is collected – easiest via WhatsApp with a photo of the order or pick-up slip."],
            ["Quote and date", "You receive a personal quote and a date that suits you."],
            ["Pick-up and delivery", "We collect the goods, check the parcels for completeness and visible damage and bring them to you."],
            ["Assembly", "We assemble, put everything in place and take the packaging away if you wish."],
        ],
        "included": [
            "Crew and van",
            "Pick-up at the shop or from private sellers",
            "Carrying into your home, even without a lift",
            "Assembly following the manufacturer's instructions",
            "Wall fixing by arrangement",
            "Packaging taken away by arrangement",
        ],
        "faq": [
            ["Do you also collect from IKEA?", "Yes. We collect from IKEA, ROLLER, POCO, XXXLutz, Ostermann and any other furniture shop. You buy and pay yourself; we need the pick-up slip or order number. We are not a partner of these shops but collect on your behalf."],
            ["What do pick-up and assembly cost?", "It depends on distance, amount, floor and assembly time. You get a free, personal quote in advance – via the [[quote|quote form]], phone or WhatsApp."],
            ["Do I have to be there for the pick-up?", "That depends on the shop. Often the pick-up slip and a short authorisation are enough. We check with you in advance what is needed."],
            ["How long does assembly take?", "The guide values on this page are for two people. Large wardrobe systems and furniture with many drawers take longer; the exact time is in your quote."],
            ["Do you also assemble kitchens?", "Yes, kitchen assembly is part of our [[extras|extra services]]."],
        ],
        "guides": ["assembly", "access", "truck"],
    },
}
