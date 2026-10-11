/* Umzugsplaner master data (Phase 0). Planning values only, no prices.
   Phase 1: this file is generated from the "Catalog" tab of the company sheet; keep the shape stable.
   Item fields: id, de, en, syn (search and list matching, lower case), room, v (m3) or vars [{l,v,kg}],
   kg [min,max], dis/asm (minutes), crew (carry crew), fragile. */
window.FLOW_DATA = {
  version: '2026.10-p0',
  rooms: ['living', 'bedroom', 'kitchen', 'bath', 'kids', 'office', 'cellar'],
  items: [
    {id:'sofa', de:'Sofa', en:'Sofa', syn:['sofa','couch','sitzer'], room:'living', vars:[{l:'2',v:1.1,kg:[35,55]},{l:'3',v:1.5,kg:[45,70]}], dis:0, asm:0, crew:2},
    {id:'armchair', de:'Sessel', en:'Armchair', syn:['sessel','armchair'], room:'living', v:0.6, kg:[15,30], crew:1},
    {id:'tvunit', de:'TV-Board', en:'TV unit', syn:['tv-board','tv board','lowboard','tv unit'], room:'living', v:0.5, kg:[25,45], dis:10, asm:15, crew:2},
    {id:'tv', de:'Fernseher 55"', en:'Flat-screen TV 55 in', syn:['fernseher','tv','television'], room:'living', v:0.2, kg:[15,20], dis:5, asm:5, crew:1, fragile:true},
    {id:'bookshelf', de:'Regal (leer)', en:'Bookshelf (empty)', syn:['regal','bücherregal','bookshelf','shelf'], room:'living', v:0.5, kg:[20,40], dis:20, asm:30, crew:2},
    {id:'coffee', de:'Couchtisch', en:'Coffee table', syn:['couchtisch','coffee table'], room:'living', v:0.3, kg:[10,25], crew:1},
    {id:'table', de:'Esstisch', en:'Dining table', syn:['esstisch','tisch','dining table','table'], room:'living', vars:[{l:'120',v:0.4,kg:[25,40]},{l:'160',v:0.5,kg:[30,50]},{l:'200',v:0.65,kg:[40,60]}], dis:10, asm:15, crew:2},
    {id:'chair', de:'Esszimmerstuhl', en:'Dining chair', syn:['stuhl','stühle','chair'], room:'living', v:0.15, kg:[4,7], crew:1},
    {id:'sideboard', de:'Sideboard', en:'Sideboard', syn:['sideboard','anrichte'], room:'living', v:0.6, kg:[40,70], dis:20, asm:30, crew:2},
    {id:'lamp', de:'Stehlampe', en:'Floor lamp', syn:['stehlampe','lampe','lamp'], room:'living', v:0.05, kg:[2,6], dis:5, asm:5, crew:1},
    {id:'plant', de:'Große Pflanze', en:'Large plant', syn:['pflanze','plant'], room:'living', v:0.1, kg:[5,15], crew:1},
    {id:'bed', de:'Doppelbett mit Rahmen', en:'Double bed with frame', syn:['doppelbett','bett','bed'], room:'bedroom', vars:[{l:'140',v:1.0,kg:[40,60]},{l:'160',v:1.2,kg:[45,65]},{l:'180',v:1.4,kg:[50,75]}], dis:25, asm:35, crew:2},
    {id:'mattress', de:'Matratze', en:'Mattress', syn:['matratze','mattress'], room:'bedroom', v:0.5, kg:[20,35], crew:2},
    {id:'wardrobe', de:'Kleiderschrank, 2-türig', en:'Wardrobe, two-door', syn:['kleiderschrank','schrank','schränke','wardrobe'], room:'bedroom', v:0.8, kg:[50,80], dis:50, asm:75, crew:2},
    {id:'wardrobe-l', de:'Schwebetürenschrank, groß', en:'Wardrobe, large sliding-door', syn:['schwebetür','schiebetür','sliding'], room:'bedroom', v:1.6, kg:[90,140], dis:105, asm:150, crew:3},
    {id:'drawers', de:'Kommode', en:'Chest of drawers', syn:['kommode','drawers'], room:'bedroom', v:0.4, kg:[30,50], crew:2},
    {id:'night', de:'Nachttisch', en:'Nightstand', syn:['nachttisch','nightstand','bedside'], room:'bedroom', v:0.1, kg:[5,12], crew:1},
    {id:'fridge', de:'Kühlschrank', en:'Refrigerator', syn:['kühlschrank','fridge','refrigerator'], room:'kitchen', v:0.6, kg:[40,70], crew:2},
    {id:'dish', de:'Geschirrspüler', en:'Dishwasher', syn:['geschirrspüler','spülmaschine','dishwasher'], room:'kitchen', v:0.4, kg:[40,55], dis:25, asm:25, crew:2},
    {id:'micro', de:'Mikrowelle', en:'Microwave', syn:['mikrowelle','microwave'], room:'kitchen', v:0.1, kg:[10,15], crew:1},
    {id:'ktable', de:'Küchentisch', en:'Kitchen table', syn:['küchentisch','kitchen table'], room:'kitchen', v:0.4, kg:[20,35], dis:10, asm:15, crew:2},
    {id:'washer', de:'Waschmaschine', en:'Washing machine', syn:['waschmaschine','washing machine','washer'], room:'bath', v:0.4, kg:[60,80], dis:25, asm:25, crew:2},
    {id:'kbed', de:'Kinderbett', en:'Child bed', syn:['kinderbett','child bed','kids bed'], room:'kids', v:0.7, kg:[25,40], dis:20, asm:30, crew:2},
    {id:'desk', de:'Schreibtisch', en:'Desk', syn:['schreibtisch','desk'], room:'office', v:0.5, kg:[25,45], dis:15, asm:20, crew:2},
    {id:'ochair', de:'Bürostuhl', en:'Office chair', syn:['bürostuhl','office chair'], room:'office', v:0.2, kg:[8,15], crew:1},
    {id:'filing', de:'Aktenschrank', en:'Filing cabinet', syn:['aktenschrank','filing cabinet'], room:'office', v:0.4, kg:[30,60], crew:2},
    {id:'bike', de:'Fahrrad', en:'Bicycle', syn:['fahrrad','fahrräder','bike','bicycle'], room:'cellar', v:0.4, kg:[10,18], crew:1},
    {id:'cshelf', de:'Kellerregal', en:'Cellar shelf', syn:['kellerregal','cellar shelf'], room:'cellar', v:0.3, kg:[15,30], dis:15, asm:20, crew:1},
    {id:'vac', de:'Staubsauger', en:'Vacuum cleaner', syn:['staubsauger','vacuum'], room:'cellar', v:0.1, kg:[4,8], crew:1},
    {id:'carton', de:'Umzugskarton (gepackt)', en:'Standard carton (filled)', syn:['umzugskarton','karton','kiste','box','carton'], room:'all', v:0.065, kg:[8,20], crew:1},
    {id:'bookbox', de:'Bücherkarton', en:'Book carton', syn:['bücherkarton','book carton','book box'], room:'all', v:0.036, kg:[15,20], crew:1},
    {id:'glassbox', de:'Geschirrkarton', en:'Glass and crockery carton', syn:['geschirrkarton','crockery carton','glass carton'], room:'all', v:0.055, kg:[8,12], crew:1, fragile:true},
    {id:'wardbox', de:'Kleiderbox', en:'Wardrobe box', syn:['kleiderbox','wardrobe box'], room:'all', v:0.275, kg:[10,25], crew:1}
  ],
  /* Option B: household presets. id: [count, variant index] */
  presets: {
    single: {sofa:[1,0], bed:[1,0], mattress:[1,0], wardrobe:[1,0], desk:[1,0], chair:[2,0], tv:[1,0], fridge:[1,0], carton:[15,0]},
    couple: {sofa:[1,1], bed:[1,1], mattress:[1,0], 'wardrobe-l':[1,0], table:[1,1], chair:[4,0], desk:[1,0], tv:[1,0], fridge:[1,0], washer:[1,0], carton:[30,0]},
    family: {sofa:[1,1], bed:[2,1], mattress:[3,0], 'wardrobe-l':[1,0], wardrobe:[2,0], table:[1,2], chair:[6,0], desk:[2,0], tv:[2,0], fridge:[1,0], washer:[1,0], carton:[55,0]}
  },
  /* Option C: quick guess per room. level 1 little, 2 average, 3 much */
  guess: {
    living: {1:{sofa:[1,0], tv:[1,0], carton:[6,0]}, 2:{sofa:[1,1], tv:[1,0], table:[1,1], chair:[4,0], carton:[12,0]}, 3:{sofa:[2,1], tv:[1,0], table:[1,2], chair:[6,0], carton:[20,0]}},
    bedroom: {1:{bed:[1,0], mattress:[1,0], wardrobe:[1,0], carton:[4,0]}, 2:{bed:[1,1], mattress:[1,0], 'wardrobe-l':[1,0], carton:[8,0]}, 3:{bed:[1,2], mattress:[1,0], 'wardrobe-l':[1,0], wardrobe:[1,0], carton:[14,0]}},
    kitchen: {1:{fridge:[1,0], carton:[5,0]}, 2:{fridge:[1,0], carton:[10,0]}, 3:{fridge:[1,0], carton:[18,0]}},
    bath: {1:{carton:[2,0]}, 2:{washer:[1,0], carton:[3,0]}, 3:{washer:[1,0], carton:[5,0]}},
    kids: {1:{kbed:[1,0], mattress:[1,0], carton:[4,0]}, 2:{kbed:[1,0], mattress:[1,0], wardrobe:[1,0], desk:[1,0], carton:[8,0]}, 3:{kbed:[2,0], mattress:[2,0], wardrobe:[1,0], desk:[1,0], carton:[14,0]}},
    office: {1:{desk:[1,0], carton:[3,0]}, 2:{desk:[1,0], ochair:[1,0], carton:[6,0]}, 3:{desk:[2,0], ochair:[2,0], carton:[12,0]}},
    cellar: {1:{carton:[3,0]}, 2:{carton:[8,0]}, 3:{carton:[15,0]}}
  },
  /* Estimator rules (handoff README). Set by the company; replace with own values. */
  rules: {
    buffer: 0.10,
    range: {high: 0.08, medium: 0.18, low: 0.35},
    weight: {pick: 1, custom: 1, list: 0.6, photo: 0.6, preset: 0.2, guess: 0.2},
    vehicles: [{id:'sprinter', cap:20}, {id:'lkw75', cap:38}, {id:'lkw12', cap:50}],
    defaultKm: 20,
    customDensity: 120   /* kg per m3 for custom items */
  }
};
