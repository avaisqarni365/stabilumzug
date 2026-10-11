/* Umzugsplaner copy, German and English. Edit text here; keys are used by flow.js.
   Source: the T object of the design handoff ("Umzug Flow.dc.html"), trimmed to Phase 0 screens. */
window.FLOW_T = {
 de: {
  steps: ['Willkommen', 'Start', 'Zugang', 'Räume', 'Gegenstände', 'Prüfen', 'Zusammenfassung'],
  stepOf: 'Schritt {a} von {b}',
  draft: 'Entwurf auf diesem Gerät gespeichert', draftOff: 'Entwurf wird nicht gespeichert',
  back: 'Zurück', next: 'Weiter', guessTag: 'geschätzt', remove: 'Entfernen',
  f0: {
   kicker: 'Umzugsunternehmen · Essen',
   title1: 'Umzug in Essen und ganz Deutschland.', title2: 'Stabil geplant.',
   lead: 'Umzüge, Klaviertransporte und Entrümpelungen – professionell, sorgfältig und flexibel. 7 Tage die Woche für Sie da.',
   fleet: 'Unser Transporter',
   how: 'So läuft Ihr Umzug',
   steps: [
    ['Online planen', 'Räume, Möbel, Zugang – grob reicht. Sie sehen sofort Volumen, Fahrzeug und Teamgröße.'],
    ['Persönliches Angebot', 'Wir prüfen Ihre Angaben und senden Ihr Angebot per WhatsApp oder E-Mail. Bei Unsicherheit ein kurzer Video-Check.'],
    ['Umzugstag mit festem Team', 'Eigener Transporter und ein Ansprechpartner vor Ort.'],
    ['Ankommen & abhaken', 'Möbelmontage, Übergabeprotokoll, Rechnung.']
   ],
   poster: 'Ihr starker Partner für Umzüge in ganz Deutschland.',
   team: 'Ihr Team', teamText: 'Privat-, Senioren- und Studentenumzüge, Büro- und Praxisumzüge, Klaviertransporte, Entrümpelung.',
   cartons: 'Ohne Konto', cartonsText: 'ca. 10 Minuten. Ihre Angaben bleiben auf Ihrem Gerät, bis Sie sie senden.',
   hours: 'Erreichbar', phone: 'Tel / WhatsApp',
   cta: 'Umzug planen', resume: 'Entwurf fortsetzen', restart: 'Neu beginnen'
  },
  f1: {
   title: 'Wohin geht es?', lead: 'Grobe Angaben reichen. Alles lässt sich später ändern.',
   from: 'Alte Adresse', to: 'Neue Adresse', fromPh: 'Rüttenscheider Str. 12, 45130 Essen', toPh: 'Alleestr. 4, 44793 Bochum',
   km: 'Entfernung in km', kmHint: 'Ungefähre Fahrstrecke. Leer lassen: wir rechnen mit 20 km und prüfen die Strecke im Angebot.',
   date: 'Umzugstermin', fixed: 'Fester Tag', flex: 'Flexibel', dateLabel: 'Datum',
   hh: 'Haushalt', hhOpts: ['1 Person', '2 Personen', '3–4', '5+']
  },
  f2: {
   title: 'Zugang zu beiden Gebäuden', lead: 'Etage, Aufzug und Parken bestimmen den Aufwand. „?“ ist erlaubt.',
   old: 'Auszug', 'new': 'Einzug',
   floor: 'Etage', floors: ['EG', '1–2', '3–4', '5+'],
   lift: 'Aufzug', lifts: ['Keiner', 'Klein', 'Groß', '?'],
   park: 'Parken / Tragweg', parks: ['Vor der Tür', 'bis 30 m', 'über 30 m', '?'],
   hvz: 'Halteverbotszone', hvzHint: 'Wenn der LKW nicht legal vor dem Haus halten kann, beantragen wir eine Zone bei der Stadt. Vorlauf je nach Stadt 1–2 Wochen.'
  },
  f3: { title: 'Räume der neuen Wohnung', lead: 'Größen helfen bei der Möbelplanung. Leer lassen ist in Ordnung.', sqm: 'm²', add: 'Raum hinzufügen' },
  f4: {
   title: 'Was zieht mit?', lead: 'Wählen Sie den einfachsten Weg – oder mischen Sie.',
   modes: ['Katalog', 'Vorlage', 'Schnell', 'Liste'],
   search: 'Suchen, z. B. Sofa', all: 'Alle', variant: 'Größe', less: 'weniger', more: 'mehr',
   preset: 'Haushalt wählen – eine typische Liste erscheint und bleibt im Katalog änderbar.',
   presets: ['1 Person', 'Paar', 'Familie'], presetApply: 'Vorlage übernehmen', presetApplied: 'Übernommen – im Katalog anpassen.', presetUndo: 'Vorlage entfernen',
   quick: 'Pro Raum: wie viel steht drin? Wir leiten daraus typische Gegenstände ab.', levels: ['Wenig', 'Mittel', 'Viel'], quickClear: 'zurücksetzen',
   paste: 'Liste einfügen – eine Zeile pro Gegenstand, z. B. „2 Sofas“.', pastePh: '2 Sofas\n1 Kühlschrank\n3x Stuhl\nKlavier',
   match: 'Liste abgleichen', matched: 'Erkannt', unmatched: 'Nicht erkannt – bitte prüfen', addMatched: 'Erkannte übernehmen', added: 'Übernommen.',
   custom: 'Als eigenen Gegenstand anlegen', customDims: 'Länge × Breite × Höhe in cm', customSave: 'Anlegen', cancel: 'Abbrechen', customName: 'Bezeichnung',
   listNote: 'Die Erkennung ist eine Hilfe mit Fehlern. Ihr Angebot richtet sich nach der bestätigten Liste.',
   volume: 'Volumen', conf: 'Vertrauen', empty: 'Noch nichts erfasst.', none: 'Keine Treffer.'
  },
  f5: {
   title: 'Liste prüfen', lead: 'Unsichere Einträge sind markiert. Bestätigen oder korrigieren Sie sie.',
   items: 'Gegenstände', vol: 'Volumen', kg: 'Gewicht',
   uncertain: 'Unsichere Einträge', confirm: 'Passt', dup: 'Doppelt?', toItems: 'Ändern',
   open: 'offene Zeilen aus Ihrer Liste', export: 'Liste als Tabelle herunterladen (CSV)',
   source: {pick: 'Katalog', custom: 'Eigener', list: 'Liste', photo: 'Foto', preset: 'Vorlage', guess: 'Schätzung'}
  },
  f8: {
   title: 'Ihre Zusammenfassung', lead: 'Kein Preis online: Ihr Angebot erstellen wir persönlich und senden es per WhatsApp oder E-Mail.',
   range: 'Geschätztes Volumen', fixed: 'Festpreis möglich', valid: 'Angebot innerhalb von 24 Std.',
   lines: 'Was wir eingeplant haben',
   line: {labour: 'Arbeit', vehicle: 'Fahrzeug', distance: 'Strecke', assembly: 'Ab- und Aufbau', access: 'Zugang', items: 'Gegenstände', date: 'Termin'},
   asmNone: 'nicht nötig', asmHint: 'laut Katalog, im Arbeitsaufwand enthalten',
   more: 'Verpacken, Küche, Entsorgung, Einlagerung und Versicherung besprechen wir im Angebot.',
   why: 'Warum diese Spanne?', whyText: 'Volumen {v} m³ inkl. 10 % Puffer, {c} Personen, ca. {h} Std. inkl. Fahrt. Vertrauen: {k} – je mehr Gegenstände Sie im Katalog bestätigen, desto enger wird die Spanne. Stammdaten {md}.',
   video: 'Video-Check anbieten lassen', videoHint: 'Bei niedrigem Vertrauen prüfen wir Ihre Liste in 15 Minuten per Videoanruf – dann wird die Spanne enger. Schreiben Sie uns einfach dazu.',
   wa: 'Per WhatsApp senden', mail: 'Per E-Mail anfragen',
   waNote: 'Öffnet WhatsApp oder Ihr E-Mail-Programm mit Ihrer Zusammenfassung – Sie können den Text vorher anpassen. Erst dann erhalten wir Ihre Angaben.',
   noContact: 'Kontakt folgt in Kürze – bitte rufen Sie uns an.',
   restart: 'Entwurf löschen und neu beginnen', restartAsk: 'Alle Angaben auf diesem Gerät löschen?',
   veh: {sprinter: 'Transporter 3,5 t', lkw75: 'Koffer-LKW 7,5 t', lkw12: 'LKW 12 t'},
   trips: 'Fahrten', crew: 'Personen', hours: 'Std.', minutes: 'Min.', ref: 'Referenz'
  },
  conf: {high: 'Hoch', medium: 'Mittel', low: 'Niedrig'},
  rooms: {living: 'Wohnzimmer', bedroom: 'Schlafzimmer', kitchen: 'Küche', bath: 'Bad', kids: 'Kinderzimmer', office: 'Arbeitszimmer', cellar: 'Keller', all: 'Alle Räume'},
  msg: {
   title: 'Stabil Umzug – Umzugsanfrage', route: 'Strecke', km: 'Entfernung', date: 'Termin', hh: 'Haushalt',
   accOld: 'Zugang Auszug', accNew: 'Zugang Einzug', floor: 'Etage', lift: 'Aufzug', park: 'Parken',
   rooms: 'Räume', est: 'Schätzung', items: 'Gegenstände', open: 'Nicht erkannt', source: 'Quelle', hvzYes: 'Halteverbotszone gewünscht'
  },
  csv: ['Gegenstand', 'Größe', 'Anzahl', 'Herkunft', 'm³ je Stück', 'm³ gesamt', 'kg min', 'kg max']
 },
 en: {
  steps: ['Welcome', 'Start', 'Access', 'Rooms', 'Items', 'Review', 'Summary'],
  stepOf: 'Step {a} of {b}',
  draft: 'Draft saved on this device', draftOff: 'Draft is not being saved',
  back: 'Back', next: 'Next', guessTag: 'guess', remove: 'Remove',
  f0: {
   kicker: 'Moving company · Essen',
   title1: 'Moving in Essen and across Germany.', title2: 'Solidly planned.',
   lead: 'Moves, piano transport and clear-outs – professional, careful and flexible. There for you 7 days a week.',
   fleet: 'Our transporter',
   how: 'How your move works',
   steps: [
    ['Plan online', 'Rooms, furniture, access – rough is fine. You see volume, vehicle and crew size right away.'],
    ['Personal quote', 'We check your details and send your quote via WhatsApp or email. A short video check if anything is uncertain.'],
    ['Moving day with a fixed crew', 'Our own transporter and a contact person on site.'],
    ['Arrive & tick off', 'Furniture assembly, handover record, invoice.']
   ],
   poster: 'Your strong partner for moves across Germany.',
   team: 'Your crew', teamText: 'Private, senior and student moves, office and practice relocations, piano transport, clear-outs.',
   cartons: 'No account', cartonsText: 'About 10 minutes. Your details stay on your device until you send them.',
   hours: 'Reachable', phone: 'Phone / WhatsApp',
   cta: 'Plan your move', resume: 'Continue draft', restart: 'Start over'
  },
  f1: {
   title: 'Where are you moving?', lead: 'Rough answers are fine. Everything can change later.',
   from: 'Current address', to: 'New address', fromPh: 'Rüttenscheider Str. 12, 45130 Essen', toPh: 'Alleestr. 4, 44793 Bochum',
   km: 'Distance in km', kmHint: 'Approximate driving distance. Leave empty: we assume 20 km and check the route in the quote.',
   date: 'Moving date', fixed: 'Fixed day', flex: 'Flexible', dateLabel: 'Date',
   hh: 'Household', hhOpts: ['1 person', '2 people', '3–4', '5+']
  },
  f2: {
   title: 'Access at both buildings', lead: 'Floor, lift and parking drive the effort. “?” is allowed.',
   old: 'Move out', 'new': 'Move in',
   floor: 'Floor', floors: ['Ground', '1–2', '3–4', '5+'],
   lift: 'Lift', lifts: ['None', 'Small', 'Large', '?'],
   park: 'Parking / carry', parks: ['At door', '≤ 30 m', '> 30 m', '?'],
   hvz: 'No-parking zone (Halteverbotszone)', hvzHint: 'If the truck cannot legally stop at the door, we apply to the city for a reserved zone. Lead time 1–2 weeks depending on the city.'
  },
  f3: { title: 'Rooms of the new home', lead: 'Sizes help with furniture planning. Leaving them empty is fine.', sqm: 'm²', add: 'Add room' },
  f4: {
   title: 'What is moving?', lead: 'Take the easiest route – or mix them.',
   modes: ['Catalogue', 'Preset', 'Quick', 'List'],
   search: 'Search, e.g. sofa', all: 'All', variant: 'Size', less: 'fewer', more: 'more',
   preset: 'Pick a household – a typical list appears and stays editable in the catalogue.',
   presets: ['1 person', 'Couple', 'Family'], presetApply: 'Apply preset', presetApplied: 'Applied – adjust in the catalogue.', presetUndo: 'Remove preset',
   quick: 'Per room: how much is in it? We derive typical items from this.', levels: ['Little', 'Average', 'Much'], quickClear: 'reset',
   paste: 'Paste a list – one item per line, e.g. “2 sofas”.', pastePh: '2 sofas\n1 fridge\n3x chair\npiano',
   match: 'Match list', matched: 'Recognised', unmatched: 'Not recognised – please check', addMatched: 'Add recognised items', added: 'Added.',
   custom: 'Create as custom item', customDims: 'Length × width × height in cm', customSave: 'Create', cancel: 'Cancel', customName: 'Name',
   listNote: 'Recognition is an aid with errors. Your quote follows the confirmed list.',
   volume: 'Volume', conf: 'Confidence', empty: 'Nothing recorded yet.', none: 'No matches.'
  },
  f5: {
   title: 'Check your list', lead: 'Uncertain entries are flagged. Confirm or correct them.',
   items: 'Items', vol: 'Volume', kg: 'Weight',
   uncertain: 'Uncertain entries', confirm: 'Correct', dup: 'Duplicate?', toItems: 'Change',
   open: 'open lines from your list', export: 'Download list as spreadsheet (CSV)',
   source: {pick: 'Catalogue', custom: 'Custom', list: 'List', photo: 'Photo', preset: 'Preset', guess: 'Guess'}
  },
  f8: {
   title: 'Your summary', lead: 'No price online: we prepare your quote personally and send it via WhatsApp or email.',
   range: 'Estimated volume', fixed: 'Fixed price possible', valid: 'Quote within 24 h',
   lines: 'What we have planned for',
   line: {labour: 'Labour', vehicle: 'Vehicle', distance: 'Distance', assembly: 'Dis- and reassembly', access: 'Access', items: 'Items', date: 'Date'},
   asmNone: 'not needed', asmHint: 'from the catalogue, included in labour',
   more: 'Packing, kitchen, disposal, storage and insurance are discussed in the quote.',
   why: 'Why this range?', whyText: 'Volume {v} m³ incl. 10 % buffer, {c} people, approx. {h} h incl. driving. Confidence: {k} – the more items you confirm in the catalogue, the narrower the range. Master data {md}.',
   video: 'Ask for a video check', videoHint: 'With low confidence we check your list in a 15-minute video call – the range then narrows. Just mention it in your message.',
   wa: 'Send via WhatsApp', mail: 'Request by email',
   waNote: 'Opens WhatsApp or your email app with your summary – you can edit the text first. Only then do we receive your details.',
   noContact: 'Contact details coming soon – please call us.',
   restart: 'Delete draft and start over', restartAsk: 'Delete all entries on this device?',
   veh: {sprinter: 'Van 3.5 t', lkw75: 'Box truck 7.5 t', lkw12: 'Truck 12 t'},
   trips: 'trips', crew: 'people', hours: 'h', minutes: 'min', ref: 'Reference'
  },
  conf: {high: 'High', medium: 'Medium', low: 'Low'},
  rooms: {living: 'Living room', bedroom: 'Bedroom', kitchen: 'Kitchen', bath: 'Bathroom', kids: 'Kids’ room', office: 'Office', cellar: 'Cellar', all: 'All rooms'},
  msg: {
   title: 'Stabil Umzug – moving request', route: 'Route', km: 'Distance', date: 'Date', hh: 'Household',
   accOld: 'Access move-out', accNew: 'Access move-in', floor: 'floor', lift: 'lift', park: 'parking',
   rooms: 'Rooms', est: 'Estimate', items: 'Items', open: 'Not recognised', source: 'Source', hvzYes: 'No-parking zone requested'
  },
  csv: ['Item', 'Size', 'Count', 'Source', 'm³ each', 'm³ total', 'kg min', 'kg max']
 }
};
