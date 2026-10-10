/* Umzug planner. Runs entirely in the browser: nothing is stored or sent until the visitor shares the PDF. */

/* ---------- Company settings: change these three lines for your business ---------- */
const SITE = window.SITE || {};
const BASE = (document.querySelector('.planner') || {dataset:{}}).dataset.base || './';
const CONFIG = {
  company: SITE.company || 'Stabil Umzug',
  email: SITE.email || '',
  whatsapp: SITE.whatsapp || '',
  buffer: 0.10,               // handling buffer added to the volume (set by the company)
  caps: [13, 20, 35],         // vehicle capacities in m3: large van, 3.5 t truck, 7.5 t truck
  density: 100                // kg per m3 for custom items (planning value)
};

/* ---------- Master data (approximate planning values) ---------- */
const ROOMS = {
  living:{en:'Living room',de:'Wohnzimmer'}, bedroom:{en:'Bedroom',de:'Schlafzimmer'},
  kitchen:{en:'Kitchen',de:'Küche'}, office:{en:'Office and child',de:'Arbeit und Kind'}, other:{en:'Other',de:'Sonstiges'}
};
const RAW = [
 ['sofa','living','Sofa, 3-Sitzer','Sofa, three-seat',1.5,45,70,0,0,2,1],
 ['armchair','living','Sessel','Armchair',0.6,15,30,0,0,1,1],
 ['tvunit','living','TV-Board','TV unit',0.5,25,45,10,15,2,1],
 ['tv','living','Fernseher 55 Zoll','TV 55 in',0.2,15,20,5,5,1,1],
 ['bookshelf','living','Regal (leer)','Bookshelf, empty',0.5,20,40,20,30,2,1],
 ['coffee','living','Couchtisch','Coffee table',0.3,10,25,0,0,1,0],
 ['dtable','living','Esstisch 160 cm','Dining table 160 cm',0.5,30,50,10,15,2,1],
 ['chair','living','Stuhl','Dining chair',0.15,4,7,0,0,1,4],
 ['sideboard','living','Sideboard','Sideboard',0.6,40,70,20,30,2,0],
 ['bed','bedroom','Doppelbett mit Rahmen','Double bed with frame',1.0,40,60,25,35,2,1],
 ['mattress','bedroom','Matratze 140x200','Mattress 140x200',0.5,20,35,0,0,2,1],
 ['ward2','bedroom','Kleiderschrank, 2-türig','Wardrobe, two-door',0.8,50,80,50,75,2,1],
 ['wardS','bedroom','Schiebetürenschrank, groß','Wardrobe, large sliding-door',1.6,90,140,105,150,3,0],
 ['drawers','bedroom','Kommode','Chest of drawers',0.4,30,50,0,0,2,0],
 ['night','bedroom','Nachttisch','Nightstand',0.1,5,12,0,0,1,2],
 ['fridge','kitchen','Kühlschrank','Refrigerator',0.6,40,70,0,0,2,1],
 ['washer','kitchen','Waschmaschine','Washing machine',0.4,60,80,25,25,2,1],
 ['dish','kitchen','Geschirrspüler','Dishwasher',0.4,40,55,25,25,2,0],
 ['micro','kitchen','Mikrowelle','Microwave',0.1,10,15,0,0,1,0],
 ['ktable','kitchen','Küchentisch','Kitchen table',0.4,20,35,10,15,2,0],
 ['desk','office','Schreibtisch','Desk',0.5,25,45,15,20,2,1],
 ['ochair','office','Bürostuhl','Office chair',0.2,8,15,0,0,1,1],
 ['kbed','office','Kinderbett','Child bed',0.7,25,40,20,30,2,0],
 ['filing','office','Aktenschrank','Filing cabinet',0.4,30,60,0,0,2,0],
 ['bike','other','Fahrrad','Bicycle',0.4,10,18,0,0,1,0],
 ['plant','other','Große Pflanze','Large plant',0.1,5,15,0,0,1,0],
 ['cshelf','other','Kellerregal','Cellar shelf',0.3,15,30,15,20,1,0],
 ['vac','other','Staubsauger','Vacuum cleaner',0.1,4,8,0,0,1,0],
 ['lamp','other','Stehlampe','Floor lamp',0.05,2,6,5,5,1,0]
];
const ITEMS = RAW.map(r=>({id:r[0],room:r[1],de:r[2],en:r[3],v:r[4],kmin:r[5],kmax:r[6],down:r[7],up:r[8],crew:r[9],ex:r[10]}));
const CARTONS = [
 {id:'std',de:'Standardkarton',en:'Standard carton',v:0.065,kmin:8,kmax:20,ex:30,dim:'60 x 33 x 34 cm'},
 {id:'book',de:'Bücherkarton',en:'Book carton',v:0.036,kmin:15,kmax:20,ex:10,dim:'40 x 30 x 30 cm'},
 {id:'glass',de:'Geschirrkarton',en:'Glass and crockery carton',v:0.055,kmin:8,kmax:12,ex:6,dim:'45 x 35 x 35 cm'},
 {id:'ward',de:'Kleiderbox',en:'Wardrobe box',v:0.275,kmin:10,kmax:25,ex:2,dim:'50 x 50 x 110 cm'}
];

/* ---------- Text ---------- */
const T = {
 en:{
  tag:'Describe your move once. Get a PDF you can send to your moving company.',
  steps:['Move','Items','Services','Send'],
  s1:'Your move', s1l:'Basic details and how to reach the two buildings. If you do not know something, leave it empty or choose "not sure".',
  name:'Your name',email:'Email',phone:'Phone or WhatsApp',date:'Preferred date',hh:'People moving',
  from:'Old address',to:'New address',km:'Road distance between addresses (km)',
  old:'Old home',neu:'New home',floor:'Floor',lift:'Lift',carry:'Walk from truck to door (m)',park:'Parking for the truck',
  ground:'Ground floor',fl:'floor',yes:'Yes',no:'No',pOwn:'Space available at the door',pPermit:'Need a no-parking zone',pUnsure:'Not sure',
  s2:'Your items',s2l:'Pick what you will take. Counts do not need to be exact. Values are approximate planning values.',
  example:'Example items are loaded so you can see how the estimate works.',clear:'Clear all',
  search:'Search items',all:'All',cartons:'Packing cartons',suggest:'Use typical amount for my household',
  custom:'Something else',cName:'Item name',cL:'Length (cm)',cW:'Width (cm)',cH:'Height (cm)',cN:'Number',add:'Add item',remove:'Remove',
  s3:'Services and cover',s3l:'Tell the company what help you want. Prices are given by the company after it reads your request.',
  svPack:'Packing by the crew',svPackD:'The crew packs your belongings.',
  svAsm:'Take apart and set up furniture',svAsmD:'Beds, wardrobes, shelves and tables that need tools.',
  svKit:'Kitchen: take down and install',svKitD:'Length of kitchen in metres:',
  svWaste:'Remove unwanted furniture',svWasteD:'The company arranges collection of items you leave behind.',
  svStore:'Temporary storage',svStoreD:'Storage between the old and new home.',
  svPermit:'Help with the parking permit',svPermitD:'Application for a no-parking zone at one or both addresses.',
  cover:'Insurance cover',cov1:'Statutory liability of the moving company',cov2:'Extra cover up to the value I state',val:'Total value of your belongings (EUR)',
  notes:'Notes for the company',
  s4:'Check and send',s4l:'Check the summary, then create the PDF. A PDF cannot be attached by an email or WhatsApp link. On a phone, "Share PDF" opens your apps. Otherwise save the PDF and attach it.',
  pdf:'Share or save PDF',mail:'Write email',wa:'Open WhatsApp',copy:'Copy summary',
  to_email:'Company email',to_wa:'Company WhatsApp',copied:'Summary copied.',copyFail:'Copy was blocked. Select the text in the summary and copy it.',
  pdfDone:'PDF created. If nothing was saved or shared, your browser blocked it: use Copy summary instead.',
  need:'Please add your name and an email or phone number so the company can reply.',
  back:'Back',next:'Next',
  est:'Estimate',vol:'Volume',wt:'Weight',veh:'Vehicle',crew:'Crew',cnt:'Cartons',asm:'Furniture work',
  items:'Items',people:'people',hours:'h',
  veh0:'Large van',veh1:'3.5 t truck',veh2:'7.5 t truck',veh3:'7.5 t truck, two trips',
  fine:'Planning values, not a quote. The company confirms the final price.',
  sum:'Summary',cust:'Customer',mv:'Move',acc:'Access',itm:'Items',srv:'Services',insr:'Insurance',nt:'Notes',
  item:'Item',qty:'Qty',vl:'Volume',kg:'Weight (kg)',
  none:'none selected',date0:'not given',un:'not sure',carrym:'m carry',
  disc:'Estimate based on approximate catalogue values. Not an offer.',pdfTitle:'Moving request'
 },
 de:{
  tag:'Beschreiben Sie Ihren Umzug einmal. Erhalten Sie ein PDF für Ihr Umzugsunternehmen.',
  steps:['Umzug','Gegenstände','Leistungen','Senden'],
  s1:'Ihr Umzug', s1l:'Grunddaten und Zugang zu beiden Gebäuden. Wenn Sie etwas nicht wissen, lassen Sie es leer oder wählen Sie "unsicher".',
  name:'Ihr Name',email:'E-Mail',phone:'Telefon oder WhatsApp',date:'Wunschtermin',hh:'Personen im Umzug',
  from:'Alte Adresse',to:'Neue Adresse',km:'Fahrstrecke zwischen den Adressen (km)',
  old:'Altes Zuhause',neu:'Neues Zuhause',floor:'Etage',lift:'Aufzug',carry:'Weg vom LKW zur Tür (m)',park:'Parken für den LKW',
  ground:'Erdgeschoss',fl:'. Etage',yes:'Ja',no:'Nein',pOwn:'Platz vor der Tür vorhanden',pPermit:'Halteverbotszone nötig',pUnsure:'Unsicher',
  s2:'Ihre Gegenstände',s2l:'Wählen Sie, was mitkommt. Die Anzahl muss nicht exakt sein. Die Werte sind ungefähre Planungswerte.',
  example:'Beispielgegenstände sind geladen, damit Sie die Schätzung sehen.',clear:'Alles löschen',
  search:'Gegenstände suchen',all:'Alle',cartons:'Umzugskartons',suggest:'Typische Menge für meinen Haushalt',
  custom:'Etwas anderes',cName:'Bezeichnung',cL:'Länge (cm)',cW:'Breite (cm)',cH:'Höhe (cm)',cN:'Anzahl',add:'Hinzufügen',remove:'Entfernen',
  s3:'Leistungen und Versicherung',s3l:'Sagen Sie dem Unternehmen, welche Hilfe Sie möchten. Preise nennt das Unternehmen nach Prüfung Ihrer Anfrage.',
  svPack:'Packen durch das Team',svPackD:'Das Team packt Ihre Sachen.',
  svAsm:'Möbel ab- und aufbauen',svAsmD:'Betten, Schränke, Regale und Tische, die Werkzeug brauchen.',
  svKit:'Küche: ab- und aufbauen',svKitD:'Länge der Küche in Metern:',
  svWaste:'Nicht benötigte Möbel entsorgen',svWasteD:'Das Unternehmen organisiert die Abholung zurückbleibender Sachen.',
  svStore:'Zwischenlagerung',svStoreD:'Lagerung zwischen altem und neuem Zuhause.',
  svPermit:'Hilfe bei der Halteverbotszone',svPermitD:'Antrag für eine Halteverbotszone an einer oder beiden Adressen.',
  cover:'Versicherungsschutz',cov1:'Gesetzliche Haftung des Umzugsunternehmens',cov2:'Zusatzschutz bis zum angegebenen Wert',val:'Gesamtwert Ihres Umzugsguts (EUR)',
  notes:'Hinweise für das Unternehmen',
  s4:'Prüfen und senden',s4l:'Prüfen Sie die Zusammenfassung und erstellen Sie das PDF. Ein PDF lässt sich nicht über einen E-Mail- oder WhatsApp-Link anhängen. Auf dem Handy öffnet "PDF teilen" Ihre Apps. Sonst speichern Sie das PDF und hängen es an.',
  pdf:'PDF teilen oder speichern',mail:'E-Mail schreiben',wa:'WhatsApp öffnen',copy:'Zusammenfassung kopieren',
  to_email:'E-Mail des Unternehmens',to_wa:'WhatsApp des Unternehmens',copied:'Zusammenfassung kopiert.',copyFail:'Kopieren wurde blockiert. Markieren Sie den Text der Zusammenfassung und kopieren Sie ihn.',
  pdfDone:'PDF erstellt. Wenn nichts gespeichert oder geteilt wurde, hat Ihr Browser es blockiert: nutzen Sie "Zusammenfassung kopieren".',
  need:'Bitte geben Sie Ihren Namen und eine E-Mail oder Telefonnummer an, damit das Unternehmen antworten kann.',
  back:'Zurück',next:'Weiter',
  est:'Schätzung',vol:'Volumen',wt:'Gewicht',veh:'Fahrzeug',crew:'Team',cnt:'Kartons',asm:'Möbelarbeit',
  items:'Gegenstände',people:'Personen',hours:'Std.',
  veh0:'Großer Transporter',veh1:'3,5-t-LKW',veh2:'7,5-t-LKW',veh3:'7,5-t-LKW, zwei Fahrten',
  fine:'Planungswerte, kein Angebot. Den Endpreis bestätigt das Unternehmen.',
  sum:'Zusammenfassung',cust:'Kunde',mv:'Umzug',acc:'Zugang',itm:'Gegenstände',srv:'Leistungen',insr:'Versicherung',nt:'Hinweise',
  item:'Gegenstand',qty:'Anz.',vl:'Volumen',kg:'Gewicht (kg)',
  none:'keine gewählt',date0:'nicht angegeben',un:'unsicher',carrym:'m Tragweg',
  disc:'Schätzung auf Basis ungefährer Katalogwerte. Kein Angebot.',pdfTitle:'Umzugsanfrage'
 }
};

/* ---------- State ---------- */
const state = {
  lang:(document.documentElement.lang==='en'?'en':'de'), step:0, q:'', room:'all', example:true, msg:'',
  f:{name:'',email:'',phone:'',date:'',hh:'2',from:'',to:'',km:'',
     oFloor:'0',oLift:'no',oCarry:'',oPark:'unsure', nFloor:'0',nLift:'no',nCarry:'',nPark:'unsure'},
  qty:{}, cart:{}, custom:[],
  s:{pack:false,asm:true,kit:false,kitM:'',waste:false,store:false,permit:false,cover:'cov1',val:'',notes:''}
};
ITEMS.forEach(i=>{ if(i.ex) state.qty[i.id]=i.ex; });
CARTONS.forEach(c=>{ state.cart[c.id]=c.ex; });

const t = k => T[state.lang][k];
const $ = (s,r) => (r||document).querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const loc = () => state.lang==='de'?'de-DE':'en-GB';
const num = (n,d) => Number(n).toLocaleString(loc(),{maximumFractionDigits:d==null?1:d});
const nm = o => o[state.lang];

/* ---------- Calculation ---------- */
function calc(){
  let base=0,kmin=0,kmax=0,asm=0,crew=1,items=0,cartons=0;
  ITEMS.forEach(i=>{ const n=state.qty[i.id]||0; if(!n) return;
    base+=n*i.v; kmin+=n*i.kmin; kmax+=n*i.kmax; asm+=n*(i.down+i.up); crew=Math.max(crew,i.crew); items+=n; });
  CARTONS.forEach(c=>{ const n=state.cart[c.id]||0; if(!n) return;
    base+=n*c.v; kmin+=n*c.kmin; kmax+=n*c.kmax; cartons+=n; });
  state.custom.forEach(c=>{ const v=c.l*c.w*c.h/1e6; base+=c.n*v; const kg=c.n*v*CONFIG.density; kmin+=kg; kmax+=kg; items+=c.n; });
  const vol=base*(1+CONFIG.buffer);
  const veh = vol<=CONFIG.caps[0]?0 : vol<=CONFIG.caps[1]?1 : vol<=CONFIG.caps[2]?2 : 3;
  let people=Math.max(2,crew);
  if(vol>25) people+=1;
  const stairs=(+state.f.oFloor>=3&&state.f.oLift==='no')||(+state.f.nFloor>=3&&state.f.nLift==='no');
  if(stairs) people+=1;
  people=Math.min(people,6);
  const hours = state.s.asm ? asm/60 : 0;
  return {base,vol,kmin,kmax,veh,people,hours,items,cartons};
}

/* ---------- Rendering: shell ---------- */
function renderShell(){
  
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===state.lang)));
  $('#steps').innerHTML=t('steps').map((s,i)=>`<li><button type="button" data-go="${i}" ${i===state.step?'aria-current="step"':''}><span class="n">${i+1}</span>${esc(s)}</button></li>`).join('');
  renderEst();
}
function renderEst(){
  const c=calc();
  const html=`
    <h2>${esc(t('est'))}</h2>
    <div class="stat"><div class="k">${esc(t('vol'))}</div><div class="v">${num(c.vol)} <small>m³</small></div></div>
    <div class="stat"><div class="k">${esc(t('wt'))}</div><div class="v">${num(c.kmin,0)}–${num(c.kmax,0)} <small>kg</small></div></div>
    <div class="stat"><div class="k">${esc(t('veh'))}</div><div class="v">${esc(t('veh'+c.veh))}</div></div>
    <div class="stat"><div class="k">${esc(t('crew'))}</div><div class="v">${c.people} <small>${esc(t('people'))}</small></div></div>
    <div class="stat"><div class="k">${esc(t('items'))} / ${esc(t('cnt'))}</div><div class="v">${c.items} / ${c.cartons}</div></div>
    ${c.hours?`<div class="stat"><div class="k">${esc(t('asm'))}</div><div class="v">${num(c.hours)} <small>${esc(t('hours'))}</small></div></div>`:''}
    <p class="fine">${esc(t('fine'))}</p>`;
  $('#est').innerHTML=html;
  $('#bar').innerHTML=`<div><span class="k">${esc(t('vol'))}</span><span class="v">${num(c.vol)} m³</span></div><div><span class="k">${esc(t('veh'))}</span><span class="v">${esc(t('veh'+c.veh))}</span></div><div><span class="k">${esc(t('crew'))}</span><span class="v">${c.people}</span></div>`;
}

/* ---------- Rendering: steps ---------- */
const fld = (k,label,type,extra) => `<div class="field"><label for="f-${k}">${esc(label)}</label><input id="f-${k}" data-f="${k}" type="${type||'text'}" value="${esc(state.f[k])}" ${extra||''}></div>`;
function floorSel(k){
  let o=`<option value="0">${esc(t('ground'))}</option>`;
  for(let i=1;i<=8;i++) o+=`<option value="${i}">${state.lang==='de'?i+'. Etage':i+(i===1?'st':i===2?'nd':i===3?'rd':'th')+' floor'}</option>`;
  return `<div class="field"><label for="f-${k}">${esc(t('floor'))}</label><select id="f-${k}" data-f="${k}">${o.replace(`value="${state.f[k]}"`,`value="${state.f[k]}" selected`)}</select></div>`;
}
function selOpts(k,opts){
  return `<select id="f-${k}" data-f="${k}">${opts.map(([v,l])=>`<option value="${v}" ${state.f[k]===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
}
function access(p,title){
  return `<div class="sub"><span class="lab">${esc(title)}</span><div class="fields">
    ${floorSel(p+'Floor')}
    <div class="field"><label for="f-${p}Lift">${esc(t('lift'))}</label>${selOpts(p+'Lift',[['no',t('no')],['yes',t('yes')]])}</div>
    ${fld(p+'Carry',t('carry'),'number','min="0" inputmode="numeric"')}
    <div class="field"><label for="f-${p}Park">${esc(t('park'))}</label>${selOpts(p+'Park',[['own',t('pOwn')],['permit',t('pPermit')],['unsure',t('pUnsure')]])}</div>
  </div></div>`;
}
function step0(){
  return `<section class="card"><h2>${esc(t('s1'))}</h2><p class="lead">${esc(t('s1l'))}</p>
   <div class="fields">
     ${fld('name',t('name'),'text','autocomplete="name"')}
     ${fld('email',t('email'),'email','autocomplete="email"')}
     ${fld('phone',t('phone'),'tel','autocomplete="tel"')}
     ${fld('date',t('date'),'date')}
     <div class="field"><label for="f-hh">${esc(t('hh'))}</label>${selOpts('hh',[['1','1'],['2','2'],['3','3'],['4','4'],['5','5+']])}</div>
     ${fld('km',t('km'),'number','min="0" inputmode="numeric"')}
     <div class="field wide">${fld('from',t('from'),'text','autocomplete="street-address"')}</div>
     <div class="field wide">${fld('to',t('to'),'text')}</div>
   </div>
   <h3>${esc(t('acc'))}</h3>
   <div class="two">${access('o',t('old'))}${access('n',t('neu'))}</div>
   <div class="nav"><span></span><button class="btn primary" type="button" data-go="1">${esc(t('next'))}</button></div>
  </section>`;
}
function itemRow(o,grp){
  const n=(grp==='c'?state.cart[o.id]:state.qty[o.id])||0;
  const meta = `${num(o.v,3)} m³ · ${num(o.kmin,0)}${o.kmax!==o.kmin?'–'+num(o.kmax,0):''} kg${o.dim?' · '+o.dim:''}`;
  return `<div class="item ${n?'on':''}" data-row="${grp}:${o.id}"><div><div class="nm">${esc(nm(o))}</div><div class="meta">${esc(meta)}</div></div>
    <div class="qty"><button type="button" data-act="dec" data-grp="${grp}" data-id="${o.id}" aria-label="−">−</button><span class="n" aria-live="polite">${n}</span><button type="button" data-act="inc" data-grp="${grp}" data-id="${o.id}" aria-label="+">+</button></div></div>`;
}
function listHtml(){
  const q=state.q.trim().toLowerCase();
  const rows=ITEMS.filter(i=>(state.room==='all'||i.room===state.room)&&(!q||(i.de+' '+i.en).toLowerCase().includes(q)));
  return rows.map(i=>itemRow(i,'i')).join('')||`<p class="fine">—</p>`;
}
function customHtml(){
  return state.custom.map((c,ix)=>`<div class="custom-row"><span>${c.n} × ${esc(c.name)} <span class="fine">(${c.l}×${c.w}×${c.h} cm)</span></span><button type="button" class="btn small" data-rm="${ix}">${esc(t('remove'))}</button></div>`).join('');
}
function step1(){
  const chips=[['all',t('all')]].concat(Object.keys(ROOMS).map(k=>[k,nm(ROOMS[k])]));
  return `<section class="card"><h2>${esc(t('s2'))}</h2><p class="lead">${esc(t('s2l'))}</p>
   ${state.example?`<div class="note"><span>${esc(t('example'))}</span><button type="button" class="btn small" data-clear="1">${esc(t('clear'))}</button></div>`:''}
   <div class="field"><label for="q">${esc(t('search'))}</label><input id="q" type="search" value="${esc(state.q)}"></div>
   <div class="chips" id="chips">${chips.map(([k,l])=>`<button type="button" class="chip" data-room="${k}" aria-pressed="${state.room===k}">${esc(l)}</button>`).join('')}</div>
   <div class="rows" id="list">${listHtml()}</div>
   <h3>${esc(t('cartons'))}</h3>
   <button type="button" class="btn small" data-suggest="1">${esc(t('suggest'))}</button>
   <div class="rows" style="margin-top:12px">${CARTONS.map(c=>itemRow(c,'c')).join('')}</div>
   <h3>${esc(t('custom'))}</h3>
   <div class="fields">
     <div class="field wide"><label for="cu-name">${esc(t('cName'))}</label><input id="cu-name" type="text"></div>
     <div class="field"><label for="cu-l">${esc(t('cL'))}</label><input id="cu-l" type="number" min="1" inputmode="numeric"></div>
     <div class="field"><label for="cu-w">${esc(t('cW'))}</label><input id="cu-w" type="number" min="1" inputmode="numeric"></div>
     <div class="field"><label for="cu-h">${esc(t('cH'))}</label><input id="cu-h" type="number" min="1" inputmode="numeric"></div>
     <div class="field"><label for="cu-n">${esc(t('cN'))}</label><input id="cu-n" type="number" min="1" value="1" inputmode="numeric"></div>
   </div>
   <p style="margin:12px 0 0"><button type="button" class="btn small" data-addcustom="1">${esc(t('add'))}</button></p>
   <div id="customs">${customHtml()}</div>
   <div class="nav"><button class="btn" type="button" data-go="0">${esc(t('back'))}</button><button class="btn primary" type="button" data-go="2">${esc(t('next'))}</button></div>
  </section>`;
}
const chk = (k,title,desc,extra) => `<label class="check" for="s-${k}"><input id="s-${k}" type="checkbox" data-s="${k}" ${state.s[k]?'checked':''}><span><b>${esc(title)}</b>${esc(desc)}${extra||''}</span></label>`;
function step2(){
  return `<section class="card"><h2>${esc(t('s3'))}</h2><p class="lead">${esc(t('s3l'))}</p>
   ${chk('pack',t('svPack'),t('svPackD'))}
   ${chk('asm',t('svAsm'),t('svAsmD'))}
   ${chk('kit',t('svKit'),t('svKitD')+' ',` <input id="s-kitM" data-s="kitM" type="number" min="0" step="0.1" value="${esc(state.s.kitM)}" style="width:90px;display:inline-block;padding:4px 8px">`)}
   ${chk('waste',t('svWaste'),t('svWasteD'))}
   ${chk('store',t('svStore'),t('svStoreD'))}
   ${chk('permit',t('svPermit'),t('svPermitD'))}
   <h3>${esc(t('cover'))}</h3>
   <div class="fields">
     <div class="field"><label for="s-cover">${esc(t('cover'))}</label><select id="s-cover" data-s="cover"><option value="cov1" ${state.s.cover==='cov1'?'selected':''}>${esc(t('cov1'))}</option><option value="cov2" ${state.s.cover==='cov2'?'selected':''}>${esc(t('cov2'))}</option></select></div>
     <div class="field"><label for="s-val">${esc(t('val'))}</label><input id="s-val" data-s="val" type="number" min="0" inputmode="numeric" value="${esc(state.s.val)}"></div>
     <div class="field wide"><label for="s-notes">${esc(t('notes'))}</label><textarea id="s-notes" data-s="notes">${esc(state.s.notes)}</textarea></div>
   </div>
   <div class="nav"><button class="btn" type="button" data-go="1">${esc(t('back'))}</button><button class="btn primary" type="button" data-go="3">${esc(t('next'))}</button></div>
  </section>`;
}

/* ---------- Summary data (shared by screen, text and PDF) ---------- */
function parkLabel(v){ return v==='own'?t('pOwn'):v==='permit'?t('pPermit'):t('pUnsure'); }
function floorLabel(v){ return +v===0?t('ground'):(state.lang==='de'?v+'. Etage':'floor '+v); }
function chosenItems(){
  const out=[];
  ITEMS.forEach(i=>{ const n=state.qty[i.id]||0; if(n) out.push({name:nm(i),n,v:n*i.v,kmin:n*i.kmin,kmax:n*i.kmax}); });
  CARTONS.forEach(c=>{ const n=state.cart[c.id]||0; if(n) out.push({name:nm(c),n,v:n*c.v,kmin:n*c.kmin,kmax:n*c.kmax}); });
  state.custom.forEach(c=>{ const v=c.l*c.w*c.h/1e6; out.push({name:c.name+' ('+c.l+'x'+c.w+'x'+c.h+' cm)',n:c.n,v:c.n*v,kmin:c.n*v*CONFIG.density,kmax:c.n*v*CONFIG.density}); });
  return out;
}
function services(){
  const s=state.s,l=[];
  if(s.pack) l.push(t('svPack'));
  if(s.asm) l.push(t('svAsm'));
  if(s.kit) l.push(t('svKit').replace(/:.*$/,'')+(s.kitM?' ('+s.kitM+' m)':''));
  if(s.waste) l.push(t('svWaste'));
  if(s.store) l.push(t('svStore'));
  if(s.permit) l.push(t('svPermit'));
  return l;
}
function facts(){
  const f=state.f,s=state.s,c=calc();
  return {
    cust:[[t('name'),f.name],[t('email'),f.email],[t('phone'),f.phone]],
    mv:[[t('date'),f.date||t('date0')],[t('hh'),f.hh==='5'?'5+':f.hh],[t('from'),f.from],[t('to'),f.to],[t('km'),f.km]],
    acc:[[t('old'),floorLabel(f.oFloor)+', '+t('lift')+': '+(f.oLift==='yes'?t('yes'):t('no'))+', '+(f.oCarry?f.oCarry+' '+t('carrym'):t('un'))+', '+parkLabel(f.oPark)],
         [t('neu'),floorLabel(f.nFloor)+', '+t('lift')+': '+(f.nLift==='yes'?t('yes'):t('no'))+', '+(f.nCarry?f.nCarry+' '+t('carrym'):t('un'))+', '+parkLabel(f.nPark)]],
    est:[[t('vol'),num(c.vol)+' m³'],[t('wt'),num(c.kmin,0)+' - '+num(c.kmax,0)+' kg'],[t('veh'),t('veh'+c.veh)],[t('crew'),c.people+' '+t('people')],[t('cnt'),String(c.cartons)],[t('asm'),c.hours?num(c.hours)+' '+t('hours'):'-']],
    srv:services(),
    insr:[[t('cover'),t(s.cover)],[t('val'),s.val?s.val+' EUR':'-']],
    notes:s.notes
  };
}
function summaryText(max){
  const F=facts(),L=[];
  L.push(CONFIG.company+' - '+t('pdfTitle'));
  const sec=(h,rows)=>{ L.push(''); L.push(h.toUpperCase()); rows.forEach(r=>{ if(r[1]!==''&&r[1]!=null) L.push(r[0]+': '+r[1]); }); };
  sec(t('cust'),F.cust); sec(t('mv'),F.mv); sec(t('acc'),F.acc); sec(t('est'),F.est);
  L.push(''); L.push(t('srv').toUpperCase()); L.push(F.srv.length?F.srv.join(', '):t('none'));
  sec(t('insr'),F.insr);
  if(F.notes){ L.push(''); L.push(t('nt').toUpperCase()); L.push(F.notes); }
  L.push(''); L.push(t('itm').toUpperCase());
  chosenItems().forEach(i=>L.push(i.n+' x '+i.name));
  let out=L.join('\n');
  if(max&&out.length>max) out=out.slice(0,max-3)+'...';
  return out;
}
function summaryHtml(){
  const F=facts(); const it=chosenItems();
  const dl=rows=>`<table><tbody>${rows.filter(r=>r[1]!=='').map(r=>`<tr><th scope="row" style="width:38%">${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>`;
  return `<h3>${esc(t('cust'))}</h3>${dl(F.cust)}<h3>${esc(t('mv'))}</h3>${dl(F.mv)}<h3>${esc(t('acc'))}</h3>${dl(F.acc)}
   <h3>${esc(t('est'))}</h3>${dl(F.est)}
   <h3>${esc(t('srv'))}</h3><p style="margin:0">${esc(F.srv.length?F.srv.join(', '):t('none'))}</p>
   <h3>${esc(t('insr'))}</h3>${dl(F.insr)}
   ${F.notes?`<h3>${esc(t('nt'))}</h3><p style="margin:0">${esc(F.notes)}</p>`:''}
   <h3>${esc(t('itm'))}</h3><div class="scroll"><table><thead><tr><th>${esc(t('item'))}</th><th class="r">${esc(t('qty'))}</th><th class="r">${esc(t('vl'))}</th><th class="r">${esc(t('kg'))}</th></tr></thead><tbody>
   ${it.map(i=>`<tr><td>${esc(i.name)}</td><td class="r">${i.n}</td><td class="r">${num(i.v,2)} m³</td><td class="r">${num(i.kmin,0)}${i.kmax!==i.kmin?'–'+num(i.kmax,0):''}</td></tr>`).join('')}</tbody></table></div>`;
}
function step3(){
  const f=state.f; const miss=!f.name.trim()||(!f.email.trim()&&!f.phone.trim());
  const mail='mailto:'+CONFIG.email+'?subject='+encodeURIComponent(t('pdfTitle')+(f.name?' - '+f.name:''))+'&body='+encodeURIComponent(summaryText(1800));
  const wa=CONFIG.whatsapp?'https://wa.me/'+CONFIG.whatsapp+'?text='+encodeURIComponent(summaryText(1500)):'#';
  return `<section class="card"><h2>${esc(t('s4'))}</h2><p class="lead">${esc(t('s4l'))}</p>
   ${miss?`<p class="warn">${esc(t('need'))}</p>`:''}
   <div class="actions">
     <button type="button" class="btn primary" data-pdf="1">${esc(t('pdf'))}</button>
     <a class="btn" href="${mail}">${esc(t('mail'))}</a>
     <a class="btn" href="${wa}" target="_blank" rel="noopener">${esc(t('wa'))}</a>
     <button type="button" class="btn" data-copy="1">${esc(t('copy'))}</button>
   </div>
   <div class="addr"><span>${esc(t('to_email'))}:</span><code id="a-mail">${esc(CONFIG.email)}</code><span>${esc(t('to_wa'))}:</span><code id="a-wa">${CONFIG.whatsapp?'+'+esc(CONFIG.whatsapp):'-'}</code></div>
   <p class="msg" id="msg" role="status">${esc(state.msg)}</p>
   <div id="summary">${summaryHtml()}</div>
   <p class="fine">${esc(t('disc'))}</p>
   <div class="nav"><button class="btn" type="button" data-go="2">${esc(t('back'))}</button><span></span></div>
  </section>`;
}
const STEPS=[step0,step1,step2,step3];
function renderStep(){ $('#step').innerHTML=STEPS[state.step](); }
function renderAll(){ renderShell(); renderStep(); }

/* ---------- PDF ---------- */
function loadPdf(){
  if(window.jspdf) return Promise.resolve();
  return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=BASE+'assets/js/vendor/jspdf.umd.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
}
function buildPdf(){
  const {jsPDF}=window.jspdf; const d=new jsPDF({unit:'mm',format:'a4'});
  const L=16,R=194; let y=18;
  const S=s=>String(s==null?'':s).replace(/[–—]/g,'-').replace(/€/g,'EUR').replace(/[^\u0000-ÿ]/g,'');
  const need=h=>{ if(y+h>282){ d.addPage(); y=18; } };
  d.setFont('helvetica','bold'); d.setFontSize(17); d.text(S(CONFIG.company),L,y); y+=7;
  d.setFont('helvetica','normal'); d.setFontSize(11); d.setTextColor(90); d.text(S(t('pdfTitle')+' - '+new Date().toLocaleDateString(loc())),L,y); d.setTextColor(0); y+=4;
  const h2=s=>{ need(14); y+=5; d.setFont('helvetica','bold'); d.setFontSize(10.5); d.text(S(s).toUpperCase(),L,y); d.setDrawColor(190); d.line(L,y+1.5,R,y+1.5); y+=7; };
  const row=(a,b)=>{ if(b===''||b==null) return; d.setFont('helvetica','bold'); d.setFontSize(9.5); const lines=d.splitTextToSize(S(b),R-L-52); need(5*lines.length); d.text(S(a),L,y); d.setFont('helvetica','normal'); d.text(lines,L+52,y); y+=5*lines.length+0.5; };
  const F=facts();
  h2(t('cust')); F.cust.forEach(r=>row(r[0],r[1]));
  h2(t('mv')); F.mv.forEach(r=>row(r[0],r[1]));
  h2(t('acc')); F.acc.forEach(r=>row(r[0],r[1]));
  h2(t('est')); F.est.forEach(r=>row(r[0],r[1]));
  h2(t('srv')); row('',F.srv.length?F.srv.join(', '):t('none'));
  h2(t('insr')); F.insr.forEach(r=>row(r[0],r[1]));
  if(F.notes){ h2(t('nt')); row('',F.notes); }
  h2(t('itm'));
  d.setFont('helvetica','bold'); d.setFontSize(9); d.text(S(t('item')),L,y); d.text(S(t('qty')),L+112,y,{align:'right'}); d.text(S(t('vl')),L+140,y,{align:'right'}); d.text(S(t('kg')),R,y,{align:'right'}); y+=5;
  d.setFont('helvetica','normal');
  chosenItems().forEach(i=>{ need(5.5); d.text(S(i.name).slice(0,60),L,y); d.text(String(i.n),L+112,y,{align:'right'}); d.text(S(num(i.v,2)+' m³'),L+140,y,{align:'right'}); d.text(S(num(i.kmin,0)+(i.kmax!==i.kmin?'-'+num(i.kmax,0):'')),R,y,{align:'right'}); y+=5; });
  need(12); y+=6; d.setFontSize(8.5); d.setTextColor(100); d.text(S(t('disc')),L,y);
  return d;
}
async function sharePdf(){
  const out=$('#msg');
  try{
    await loadPdf();
    const doc=buildPdf(); const fname='umzug-'+(state.f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'anfrage')+'.pdf';
    const blob=doc.output('blob'); const file=new File([blob],fname,{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file],title:t('pdfTitle')}); state.msg=t('pdfDone'); out.textContent=state.msg; return; }
      catch(e){ if(e&&e.name==='AbortError') return; }
    }
    doc.save(fname); state.msg=t('pdfDone'); out.textContent=state.msg;
  }catch(e){ state.msg=t('pdfDone'); out.textContent=state.msg; }
}
async function copySummary(){
  const out=$('#msg'); const txt=summaryText();
  try{ await navigator.clipboard.writeText(txt); state.msg=t('copied'); }
  catch(e){ state.msg=t('copyFail'); const r=document.createRange(); r.selectNodeContents($('#summary')); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  out.textContent=state.msg;
}

/* ---------- Events ---------- */
function setQty(grp,id,delta){
  const store=grp==='c'?state.cart:state.qty;
  store[id]=Math.max(0,Math.min(999,(store[id]||0)+delta));
  const row=document.querySelector(`[data-row="${grp}:${id}"]`);
  if(row){ row.classList.toggle('on',store[id]>0); row.querySelector('.n').textContent=store[id]; }
  renderEst();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.lang){ state.lang=b.dataset.lang; state.msg=''; document.documentElement.lang=state.lang; renderAll(); return; }
  if(b.dataset.go!=null){ state.step=+b.dataset.go; state.msg=''; renderAll(); scrollTo({top:0,behavior:'smooth'}); return; }
  if(b.dataset.act){ setQty(b.dataset.grp,b.dataset.id,b.dataset.act==='inc'?1:-1); return; }
  if(b.dataset.room){ state.room=b.dataset.room; $('#list').innerHTML=listHtml(); document.querySelectorAll('#chips .chip').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.room===state.room))); return; }
  if(b.dataset.clear){ state.qty={}; CARTONS.forEach(c=>state.cart[c.id]=0); state.example=false; renderStep(); renderEst(); return; }
  if(b.dataset.suggest){ const T0=[32,65,95,130,175][Math.min(4,Math.max(0,+state.f.hh-1))];
    state.cart={std:Math.round(T0*.55),book:Math.round(T0*.25),glass:Math.round(T0*.12),ward:Math.round(T0*.08)}; renderStep(); renderEst(); return; }
  if(b.dataset.addcustom){ const nmv=$('#cu-name').value.trim(),l=+$('#cu-l').value,w=+$('#cu-w').value,h=+$('#cu-h').value,n=Math.max(1,+$('#cu-n').value||1);
    if(!nmv||!l||!w||!h) return; state.custom.push({name:nmv,l,w,h,n}); renderStep(); renderEst(); return; }
  if(b.dataset.rm!=null){ state.custom.splice(+b.dataset.rm,1); $('#customs').innerHTML=customHtml(); renderEst(); return; }
  if(b.dataset.pdf){ sharePdf(); return; }
  if(b.dataset.copy){ copySummary(); return; }
});
function onInput(e){
  const el=e.target;
  if(el.id==='q'){ state.q=el.value; $('#list').innerHTML=listHtml(); return; }
  if(el.dataset.f){ state.f[el.dataset.f]=el.value; renderEst(); return; }
  if(el.dataset.s){ const k=el.dataset.s; state.s[k]=el.type==='checkbox'?el.checked:el.value; renderEst(); }
}
document.addEventListener('input',onInput);
document.addEventListener('change',onInput);

renderAll();
