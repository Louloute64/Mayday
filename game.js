'use strict';
const el = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const wrap = angle => (angle % 360 + 360) % 360;
const delta = (from, to) => wrap(to - from + 180) - 180;
const fieldData = [...terrainFields,runway];
const missions = {
  free: { name:'Vol libre', delay:Infinity, cause:'', consequence:'' },
  total: {name:'Perte totale de puissance',delay:8,cue:'Le moteur ne fournit plus de puissance.',reading:'Le compte-tours s’effondre et les gaz ne répondent plus.',cause:'Perte de la propulsion',consequence:'L’avion conserve son énergie en planant vers un terrain.'},
  airspeed: {name:'Anémomètre défaillant',delay:7,cue:'L’aiguille de vitesse reste figée.',reading:'La vitesse affichée ne réagit ni à l’assiette ni aux gaz.',cause:'Vitesse indiquée figée',consequence:'L’assiette et la puissance restent disponibles comme repères dans ce scénario.'},
  flaps: {name:'Volets bloqués',delay:8,cue:'Les volets sont bloqués dans leur position actuelle.',reading:'Aucune variation de la position quand tu actionnes la commande.',cause:'Blocage des volets',consequence:'Il faut adapter l’approche à la configuration qui reste disponible.'},
  hotOil: {name:'Température d’huile élevée',delay:8,cue:'La température d’huile monte dans le rouge.',reading:'Température d’huile élevée. La pression est encore normale.',cause:'Hausse de la température d’huile',consequence:'Le régime peut rester disponible pendant que la température augmente.'},
  landing: { name:'Approche à Poitiers', delay:Infinity, cause:'', consequence:'' },
  power: { name:'Puissance partielle', delay:8, limit:80, cue:'Le régime moteur chute et le bruit change.', reading:'Le régime moteur s’effondre. L’huile reste stable. Il reste de la puissance.', cause:'Chute du régime moteur', consequence:'Le moteur garde une puissance résiduelle. La réchauffe ne rétablit pas le régime dans ce scénario.' },
  ice: { name:'Givrage carburateur', delay:7, limit:95, cue:'Le régime baisse progressivement à réglage de gaz constant.', reading:'Le régime baisse alors que la pression d’huile reste stable.', cause:'Baisse progressive du régime à gaz constants', consequence:'Dans ce scénario, la réchauffe fait d’abord baisser le régime, puis le moteur récupère progressivement.' },
  fire: { name:'Feu moteur', delay:5, limit:34, cue:'Une fumée sombre remonte devant le pare-brise.', reading:'La fumée vient du capot et le régime devient irrégulier.', cause:'Fumée devant le pare-brise', consequence:'Chaque seconde passée avant de sécuriser le moteur réduit le temps disponible.' },
  oil: { name:'Pression d’huile basse', delay:10, limit:67, cue:'La pression d’huile passe dans le rouge.', reading:'La pression d’huile chute pendant que le moteur tourne encore.', cause:'Baisse de la pression d’huile', consequence:'La panne s’aggrave progressivement et s’accompagne d’une baisse de régime.' }
};
const aircraftProfiles={
  evektor:{name:'Evektor SportStar RTC',hp:100,idle:1350,maxRpm:5800,gear:2.43,base:57,speedGain:39,initial:86,approach:76,rotation:52,ground:1,climb:1,glide:68,sink:6.1,roll:1},
  dr400:{name:'Robin DR400-160',hp:160,idle:650,maxRpm:2700,gear:1,base:61,speedGain:49,initial:93,approach:80,rotation:57,ground:1.02,climb:1.08,glide:76,sink:7.3,roll:.82},
  tecnam:{name:'Tecnam P2002 Sierra',hp:100,idle:1400,maxRpm:5800,gear:2.43,base:54,speedGain:36,initial:80,approach:72,rotation:49,ground:.94,climb:.93,glide:65,sink:5.8,roll:1.10},
  rf6:{name:'Fournier RF-6B',hp:100,idle:650,maxRpm:2750,gear:1,base:55,speedGain:38,initial:82,approach:72,rotation:50,ground:.94,climb:.93,glide:66,sink:5.9,roll:1.17},
  c152:{name:'Cessna 152',hp:110,idle:650,maxRpm:2550,gear:1,base:56,speedGain:41,initial:84,approach:73,rotation:51,ground:.98,climb:.97,glide:67,sink:6.6,roll:.91},
  c172:{name:'Cessna 172S Skyhawk',hp:180,idle:680,maxRpm:2700,gear:1,base:62,speedGain:56,initial:97,approach:79,rotation:56,ground:1.12,climb:1.16,glide:75,sink:7.1,roll:.87},
  da40:{name:'Diamond DA40 XLT',hp:180,idle:700,maxRpm:2700,gear:1,base:62,speedGain:67,initial:104,approach:80,rotation:58,ground:1.16,climb:1.25,glide:79,sink:6.7,roll:1.06}
};
function aircraftProfile(){return aircraftProfiles[game.aircraft];}
function rpmScale(profile){
  return profile.gear>1?{max:6000,step:500,labels:[0,1500,3000,4500,6000],format:value=>value/1000}:
    {max:3000,step:250,labels:[0,750,1500,2250,3000],format:value=>value/1000};
}
function updateAircraftPanel(){
  const profile=aircraftProfile();
  if(gauges[6].profile===profile)return;
  gauges[6].profile=profile;
  const instrument=instruments[6];
  Object.assign(instrument,rpmScale(profile));
  const dial=gauges[6].root.querySelector('.dial');
  dial.querySelector('.dial-scale').replaceWith(drawDialScale(instrument));
  el('aircraft-badge').textContent=profile.name;
}
const instruments = [
  { name:'VITESSE', unit:'kt', max:160, step:10, labels:[0,40,80,120,160] },
  { name:'HORIZON', unit:'roulis', attitude:true },
  { name:'ALTITUDE SOL', unit:'ft', max:1000, step:20, altimeter:true },
  { name:'VIRAGE', unit:'°/s', min:-16, max:16, step:4, labels:[-16,-8,0,8,16] },
  { name:'CAP', unit:'°', max:360, step:10, compass:true },
  { name:'VARIOMÈTRE', unit:'ft/min', min:-2000, max:2000, step:250, labels:[-2000,-1000,0,1000,2000], format:value=>value/1000 },
  { name:'RÉGIME', unit:'tr/min', max:3200, step:200, labels:[0,800,1600,2400,3200], format:value=>value/100 },
  { name:'PRESSION HUILE', unit:'psi', max:100, step:10, labels:[0,20,40,60,80,100] },
  { name:'TEMP. HUILE', unit:'°C', min:50, max:250, step:10, labels:[50,100,150,200,250] },
  { name:'CARBURANT', unit:'%', max:100, step:5, labels:[0,25,50,75,100] }
];
function dialAngle(instrument,value){
  if(instrument.altimeter)return (value%1000)*.36;
  if(instrument.compass)return value;
  const min=instrument.min??0, span=instrument.max-min;
  return -135+270*Math.max(0,Math.min(1,(value-min)/span));
}
function placeDialMark(mark,angle,radius){
  const rad=radians(angle);
  mark.style.left=(50+Math.sin(rad)*radius)+'%';
  mark.style.top=(50-Math.cos(rad)*radius)+'%';
}
function drawDialScale(instrument){
  const scale=document.createElement('div');
  scale.className='dial-scale';
  scale.setAttribute('aria-hidden','true');
  const min=instrument.min??0;
  const cyclic=instrument.altimeter||instrument.compass;
  for(let value=min;value<=instrument.max-(cyclic?1:0);value+=instrument.step){
    const angle=dialAngle(instrument,value);
    const isMajor=instrument.altimeter?value%100===0:instrument.compass?value%30===0:instrument.labels.includes(value);
    const tick=document.createElement('i');
    tick.className=isMajor?'dial-tick major':'dial-tick';
    placeDialMark(tick,angle,isMajor?43:45);
    tick.style.transform='translate(-50%,-50%) rotate('+angle+'deg)';
    scale.append(tick);
    if(!isMajor)continue;
    const label=document.createElement('b');
    label.className='dial-number';
    const cardinal={0:'N',90:'E',180:'S',270:'O'};
    label.textContent=instrument.compass?(cardinal[value]??value/10):instrument.altimeter?value/100:(instrument.format?.(value)??value);
    placeDialMark(label,angle,32);
    scale.append(label);
  }
  return scale;
}
const initialFlight = {aircraft:"evektor",fuelSelector:"both",mixtureStop:false,fuelLeft:64,fuelRight:64,isolatedTime:0,levelAltitude:null,levelHeld:false,area:'poitiers',rudder:0,flare:false,flareAtContact:false,frozenSpeed:null,flapsJammed:false,departing:false,landingCount:0, x:0,y:0,heading:97,turn:0,flaps:0,brakes:false,onGround:false,rollDistance:0,surface:null,alt:1250,mode:0,time:0,bank:0,pitch:0,turnRate:0,vs:0,speed:86,throttle:74,carb:false,ice:0,recovered:false,alerted:false,securedAt:null,fields:fieldData,selected:null,rpm:4643 };
const game = {...initialFlight,airportSelection:'poitiers',aircraftSelection:'evektor',scenario:'power',selection:'power',angle:30,stage:'menu'};
let lastTick = performance.now();
let optionalSound=null;
const gauges = instruments.map(instrument=>{
  const {name,unit,attitude,altimeter,compass}=instrument;
  const root=document.createElement('div');
  root.className='instrument';
  root.innerHTML='<div class="dial"><div class="needle" aria-hidden="true"></div><output></output></div><strong></strong>';
  const dial=root.querySelector('.dial');
  if(attitude){
    root.classList.add('attitude');
    dial.innerHTML='<div class="attitude-world"><div class="attitude-ladder"></div></div><div class="aircraft-symbol"></div><output></output>';
  }else{
    dial.prepend(drawDialScale(instrument));
    if(altimeter){
      root.classList.add('altimeter');
      const short=document.createElement('div');
      short.className='needle needle-short';
      short.setAttribute('aria-hidden','true');
      dial.append(short);
    }
    if(compass)root.classList.add('compass-dial');
  }
  root.insertBefore(dial.querySelector('output'),root.querySelector('strong'));
  root.querySelector('strong').textContent=name;
  root.title=unit?name+' · '+unit:name;
  el('gauges').append(root);
  return {root,value:root.querySelector('output')};
});
const markerElements = fieldData.map(field => {
  const marker = document.createElement('button');
  marker.className = field.runway?'marker runway-marker':'marker';
  marker.addEventListener('click', () => selectField(game.fields[fieldData.indexOf(field)]?.name));
  el('markers').append(marker);
  return marker;
});
const fieldButtons = fieldData.map(field => {
  const button = document.createElement('button');
  button.addEventListener('click', () => selectField(game.fields[fieldData.indexOf(field)]?.name));
  el('ground').append(button);
  return button;
});
function reset() {
  const scenario=game.selection==='unknown' ? (Math.random()<.5?'ice':'power') : game.selection;
  Object.assign(game,initialFlight,{scenario, stage:'playing',scanned:false,messageUntil:0});
  game.aircraft=game.aircraftSelection;
  const profile=aircraftProfile();
  game.speed=profile.initial;
  const area=scenario==='free'?game.airportSelection:'poitiers';
  const strip=airfields[area].runway;
  game.area=area;
  game.fields=area==='poitiers'?fieldData:[strip];
  loadArea(area);
  if(scenario==='landing'){
    const direction=radians(strip.heading);
    Object.assign(game,{x:strip.x-Math.sin(direction)*.64,y:strip.y-Math.cos(direction)*.64,heading:strip.heading,alt:620,speed:profile.approach,throttle:46,selected:strip.name});
  }
  if(scenario==='free'){
    const direction=radians(strip.heading);
    Object.assign(game,{x:strip.x+Math.sin(direction)*.023,y:strip.y+Math.cos(direction)*.023,heading:strip.heading,alt:0,speed:0,throttle:0,rpm:profile.idle,onGround:true,departing:true,surface:strip,rollLimit:strip.length-.023,selected:strip.name});
  }
  game.rpm=engineModel().rpm;
  el('throttle').value=game.throttle;
  look(0);
  lastTick = performance.now();
  message(scenario==='free'?'Au seuil. Augmente les gaz, puis cabre pour décoller.':scenario==='landing'?'En finale piste 03. Prépare ta descente et tes volets.':'Vol stabilisé. Surveille le tableau de bord.', false, 5);
  el('overlay').hidden = true;
  el('pause').disabled = false;
  el('sound').hidden=false;
  el('pause').focus();
  render();
}
function message(text, alert = false, seconds = 4) {
  el('notice').textContent = text;
  el('notice').classList.toggle('alert', alert);
  game.messageUntil = game.time + seconds;
}
function selectField(name) {
  if (game.stage !== 'playing'||!name||game.onGround) return;
  game.selected = name;
  message(name + ' sélectionné. Aligne le cap puis descends.');
  render();
}
function command(action) {
  if (game.stage !== 'playing') return;
  switch(action) {
    case 'left': if(!game.onGround)game.turn=game.turn===-1?0:-1; break;
    case 'right': if(!game.onGround)game.turn=game.turn===1?0:1; break;
    case 'up': game.mode=Math.min(2,game.mode+1);break;
    case 'down': game.mode=Math.max(-2,game.mode-1);break;
    case 'level': game.mode=0;game.turn=0;game.levelAltitude=game.alt;break;
    case 'wings': game.turn=0;break;
    case 'flap-up': adjustFlaps(-1);break;
    case 'flap-down': adjustFlaps(1);break;
    case 'brake':
      if(!game.onGround){message('Les freins agissent après le toucher des roues.');break;}
      game.brakes=!game.brakes;
      message(game.brakes?'Freins serrés.':'Freins relâchés.');
      break;
    case 'scan':
      if (game.alerted) game.scanned = true;
      message(game.alerted ? missions[game.scenario].reading : 'Les instruments sont stables.', game.alerted);
      break;
    case 'secure':
      if (!game.alerted) { message('Aucun incident détecté pour l’instant.'); break; }
      if (game.securedAt !== null) { message('Incident déjà sécurisé. Cherche un terrain.'); break; }
      if (game.scenario !== 'fire') { message('Le moteur tourne encore. Utilise les commandes moteur et observe les instruments.'); break; }
      message('Utilise le sélecteur carburant et la commande de mixture pour isoler le moteur.',true);
      break;
    case 'land': attemptLanding(); break;
  }
  render();
}
function adjustFlaps(direction){
  if(game.flapsJammed){message('Volets bloqués à '+game.flaps*10+'°.',true);return;}
  game.flaps=Math.max(0,Math.min(3,game.flaps+direction));
}
function attemptLanding() {
  if(game.onGround)return message(game.departing?'Avion au sol, prêt au départ.':'Atterrissage réussi. Freine si nécessaire.');
  const strip=airfields[game.area].runway;
  if(game.alt>75)return message('Poursuis l’approche. Le toucher des roues se fait au contact du sol.');
  if(!contactSurface(strip))return message('Vise la piste ou une parcelle dégagée. Tu peux te poser dans un champ sans le sélectionner.');
  game.mode=0;
  message('Palier bas. Augmente doucement l’assiette pour l’arrondi.',false,5);
}
function runwayPosition(strip){
  const angle=radians(strip.heading);
  const dx=game.x-strip.x,dy=game.y-strip.y;
  return {along:dx*Math.sin(angle)+dy*Math.cos(angle),across:dx*Math.cos(angle)-dy*Math.sin(angle)};
}
function contactSurface(strip){
  const {along,across}=runwayPosition(strip);
  const reverse=Math.abs(delta(game.heading,strip.heading))>90;
  const course=wrap(strip.heading+(reverse?180:0));
  if(along>=-.018&&along<=strip.length+.012&&Math.abs(across)<strip.halfWidth+.01&&Math.abs(delta(game.heading,course))<28){
    return {field:strip,available:Math.max(.025,reverse?along:strip.length-along)};
  }
  if(isOpenField(game)){
    const named=game.fields.find(field=>!field.runway&&field.viable&&distance(field)<.19);
    return {field:named??{name:'un champ dégagé',viable:true,runway:false},available:parcelRollout(game)};
  }
  const known=game.fields.filter(field=>!field.runway&&distance(field)<.10);
  const field=known.find(field=>field.name===game.selected)||known[0];
  return field?{field,available:.095}:null;
}
function touchdown(){
  const contact=contactSurface(airfields[game.area].runway);
  if(!contact)return finish(false,'Toucher au sol hors piste ou hors d’une parcelle dégagée.');
  if(!contact.field.viable)return finish(false,'Atterrissage interrompu par les obstacles du champ.');
  if(Math.abs(game.bank)>14)return finish(false,'Toucher des roues avec une inclinaison excessive.');
  if(game.vs < -1400)return finish(false,'Toucher trop dur.');
  const raisedNose=game.pitch>1.6;
  Object.assign(game,{onGround:true,departing:false,alt:0,vs:0,mode:0,bank:0,turn:0,pitch:0,surface:contact.field,rollDistance:0,rollLimit:contact.available,flareAtContact:raisedNose,landingCount:game.landingCount+1});
  message(raisedNose?'Atterrissage réussi · Toucher sur le train principal.':'Atterrissage réussi · Roues au sol.',false,7);
}
const distance = ({ x,y }) => Math.hypot(x-game.x,y-game.y);
const bearing = ({ x,y }) => wrap(Math.atan2(x-game.x,y-game.y)*180/Math.PI);
function feedingTanks(){
  const left=game.fuelSelector==='left'||game.fuelSelector==='both';
  const right=game.fuelSelector==='right'||game.fuelSelector==='both';
  return [left&&game.fuelLeft>0,right&&game.fuelRight>0];
}
function consumeFuel(dt){
  if(engineModel().stopped)return;
  const [left,right]=feedingTanks();
  const used=dt*(.012+game.throttle*.0007)*(aircraftProfile().hp/100)**.52/(left&&right?2:1);
  if(left)game.fuelLeft=Math.max(0,game.fuelLeft-used);
  if(right)game.fuelRight=Math.max(0,game.fuelRight-used);
}
function engineModel() {
  const age=Math.max(0,game.time-missions[game.scenario].delay);
  const incident=game.alerted;
  const scenario=game.scenario;
  const fireOut=incident && scenario==='fire' && game.securedAt!==null;
  const output=incident ? ({power:.57,total:0,oil:Math.max(.34,.85-age*.012),hotOil:Math.max(.65,.99-age*.005),fire:.72,ice:1-game.ice*.69}[scenario]??1) : 1;
  const stopped=fireOut||game.mixtureStop||!feedingTanks().some(Boolean)||(incident&&scenario==='total');
  const power=stopped?0:game.throttle/100*output*(game.carb?.91:1);
  const profile=aircraftProfile();
  const rpm=stopped?(game.onGround?0:350*profile.gear):profile.idle+(profile.maxRpm-profile.idle)*power;
  const oil=incident && scenario==='oil'?Math.max(8,39-age*1.3):72;
  const temp=incident&&scenario==='hotOil'?Math.min(240,154+age*1.6):98;
  return {rpm,oil,temp,power,stopped};
}
function meters() {
  const {oil,temp}=engineModel();
  return [game.frozenSpeed??game.speed,game.bank,game.alt,game.turnRate,game.heading,game.vs,game.rpm,oil,temp,(game.fuelLeft+game.fuelRight)/2];
}
function render() {
  updateAircraftPanel();
  const mission = missions[game.scenario];
  const active = game.stage !== 'menu';
  const secured = game.securedAt != null;
  el('mission').textContent = active ? (game.selection==='unknown' ? 'PANNE INCONNUE' : mission.name.toUpperCase()) : 'VOL LIBRE';
  el('heading').textContent = String(wrap(Math.round(game.heading))).padStart(3,'0')+'°';
  const elapsed = Math.floor(game.time);
  el('clock').textContent = String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
  const altitudeMode=game.levelHeld||game.stage==='menu'?'PALIER':engineModel().power<.1?'VOL PLANÉ':'PALIER NON TENU';
  const vertical=['DESCENTE FORTE','DESCENTE',altitudeMode,'MONTÉE','MONTÉE FORTE'][game.mode+2];
  el('cycles').textContent=game.scenario==='free'?'Atterrissages '+game.landingCount:'';
  all('[data-rudder]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.rudder)===game.rudder));
  el('mode').textContent = game.onGround?'ROULAGE · '+Math.round(game.speed)+' KT':game.flare?'ARRONDI':game.turn!==0?(game.turn<0?'VIRAGE GAUCHE':'VIRAGE DROITE')+' · '+vertical:vertical;
  el('flaps').textContent=game.flaps*10+'°';
  el('brake').setAttribute('aria-pressed',game.brakes);
  all('[data-command="left"],[data-command="right"]').forEach(button=>button.setAttribute('aria-pressed',(button.dataset.command==='left'?-1:1)===game.turn));
  el('throttle-value').textContent=game.throttle+' %';
  for(const button of fuelButtons)button.setAttribute('aria-pressed',button.dataset.fuel===game.fuelSelector);
  el('mixture').setAttribute('aria-pressed',game.mixtureStop);
  el('mixture-label').textContent=game.mixtureStop?'STOP':'RICHE';
  el('fuel-tanks').textContent='G '+Math.round(game.fuelLeft)+' % · D '+Math.round(game.fuelRight)+' %';
  el('carb').querySelector('strong').textContent=game.carb?'Chaud':'Froid';
  el('carb').setAttribute('aria-pressed',game.carb);
  el('terrain').parentElement.classList.toggle('burning',game.alerted && game.scenario==='fire' && !secured);
  const approach='Vise un champ dégagé ou la piste. En courte finale, remets les ailes à plat et augmente doucement l’assiette.';
  const groundHelp=game.departing?'Augmente les gaz et utilise les palonniers pour rester dans l’axe. Cabre pour décoller.':'Atterrissage réussi. Réduis les gaz et freine pour t’arrêter.';
  el('objective').textContent=game.onGround?groundHelp:game.scenario==='free'?'Vol libre · Reviens en finale et pose-toi pour enchaîner un tour de piste.':
    game.scenario==='landing'?'Reste dans l’axe. Près du sol, fais l’arrondi et laisse les roues toucher.':
    game.recovered?'Régime rétabli. Stabilise le vol.':!game.alerted?'Surveille les instruments et le paysage.':
    ['ice','power'].includes(game.scenario)&&game.selection==='unknown'&&!game.selected?'Observe comment le régime réagit aux commandes moteur. Repère aussi un champ.':
    game.scenario==='ice'?'Observe comment le régime réagit aux commandes moteur.':
    game.scenario==='fire'&&!secured?'Isole le moteur avec les commandes de carburant et de mixture.':approach;
  meters().forEach((value,i) => {
    const gauge = gauges[i], instrument=instruments[i];
    const rounded=Math.round(value);
    if(instrument.compass){
      gauge.value.textContent=String(wrap(rounded)).padStart(3,'0')+'°';
      gauge.cardHeading=(gauge.cardHeading??value)+delta(gauge.cardHeading??value,value);
      gauge.root.style.setProperty('--card',-gauge.cardHeading+'deg');
    }else{
      gauge.value.textContent=rounded+' '+instrument.unit;
      if(!instrument.attitude)gauge.root.style.setProperty('--needle',(instrument.altimeter?value*.36:dialAngle(instrument,value))+'deg');
      if(instrument.altimeter)gauge.root.style.setProperty('--needle-short',value*.036+'deg');
    }
    if(instrument.attitude){
      gauge.root.style.setProperty('--roll',-game.bank+'deg');
      gauge.root.style.setProperty('--attitude-pitch',game.pitch*1.45+'%');
      gauge.value.textContent=Math.round(Math.abs(game.bank))+'°';
    }
    gauge.root.classList.toggle('warn',i===0 ? !game.onGround&&(game.frozenSpeed!==null||value<53-game.flaps*3) : i===2 ? !game.onGround&&value<450 : i===6 ? value<aircraftProfile().idle+(aircraftProfile().maxRpm-aircraftProfile().idle)*.40 : i===7 ? value<45 : i===8 && value>145);
  });
  fieldButtons.forEach((button,i)=>{
    const field=game.fields[i];
    button.hidden=!field;
    if(!field)return;
    const dir=bearing(field);
    const selected=field.name===game.selected;
    const bearingText=String(wrap(Math.round(dir))).padStart(3,'0')+'°';
    markerElements[i].classList.toggle('chosen',selected);
    markerElements[i].classList.toggle('runway-marker',field.runway===true);
    markerElements[i].textContent=field.name;
    button.textContent=field.name+' · '+bearingText+' · '+field.quality+' · '+distance(field).toFixed(2)+' NM';
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',selected);
  });
  renderApproachCue();
}
function renderApproachCue(){
  const cue=el('surface-cue');
  const surface=game.stage==='playing'&&!game.onGround&&game.alt<260?contactSurface(airfields[game.area].runway):null;
  cue.hidden=!surface?.field.viable||surface.field.runway;
  if(!cue.hidden)cue.textContent='CHAMP DÉGAGÉ SOUS L’AVION';
  const area=airfields[game.area];
  const strip=area.runway;
  const ends=[{x:strip.x,y:strip.y},{x:strip.endX,y:strip.endY}];
  const index=distance(ends[0])<=distance(ends[1])?0:1;
  const threshold=ends[index];
  const course=wrap(strip.heading+index*180);
  const targetBearing=distance(threshold)<.025?course:bearing(threshold);
  const offset=delta(game.heading,targetBearing);
  const arrow=Math.abs(offset)<7?'↑':offset<0?'↖':'↗';
  const format=value=>String(wrap(Math.round(value))).padStart(3,'0')+'°';
  el('nav-runway').textContent='Piste '+area.numbers[index];
  el('nav-bearing').textContent=arrow+' '+format(targetBearing);
  el('nav-axis').textContent=format(course);
  el('nav-distance').textContent=distance(threshold).toFixed(1)+' NM';
  el('runway-camera').textContent='Voir la piste';
}
function updateGround(dt){
  const profile=aircraftProfile();
  const engine=engineModel();
  const drag=(game.brakes?23:2.8)+(game.surface?.runway?0:4);
  const thrust=engine.power*100*profile.ground*(game.scenario==='free'?.17:.08);
  game.speed=Math.max(0,game.speed+(thrust-drag)*dt);
  game.rpm+=(engine.rpm-game.rpm)*Math.min(1,dt*2);
  game.turnRate=game.rudder*Math.min(1,game.speed/20)*20;
  game.heading=wrap(game.heading+game.turnRate*dt);
  game.pitch+=(0-game.pitch)*Math.min(1,dt*5);
  const travel=game.speed/3600*dt;
  game.rollDistance+=travel;
  move(travel);
  if(game.scenario==='free'){
    const strip=airfields[game.area].runway;
    const {along,across}=runwayPosition(strip);
    if(game.surface?.runway&&game.speed>42&&(along<-.027||along>strip.length+.027||Math.abs(across)>strip.halfWidth+.025)){
      finish(false,'Sortie de piste au roulage.');
      return;
    }
    if(!game.brakes&&engine.power>.62&&game.speed>=profile.rotation-game.flaps*3&&game.mode>0){
      Object.assign(game,{alt:9,vs:140,onGround:false,departing:false,rollDistance:0,pitch:4});
      message('Décollé. Prends de l’altitude puis engage ton tour de piste.',false,7);
    }else if(game.speed<1&&!game.departing){
      game.departing=true;
      message('Arrêt complet. Tu peux repartir pour un nouveau tour.',false,6);
    }
    return;
  }
  if(game.rollDistance>game.rollLimit)finish(false,game.surface.runway?'Sortie de piste au roulage.':'L’avion a dépassé la zone dégagée du champ au roulage.');
  else if(game.speed<1)finish(true,'Atterrissage réussi sur '+game.surface.name+'. '+(game.flareAtContact?'Toucher sur le train principal. ':'')+'Arrêt complet.');
  else if(game.messageUntil<=game.time)message('Atterrissage réussi. Réduis les gaz et freine.');
}
function tick(now) {
  const dt=Math.min(.25,(now-lastTick)/1000);
  lastTick=now;
  if(game.stage!=='playing'||!photoReady)return;
  game.time+=dt;
  const mission=missions[game.scenario];
  consumeFuel(dt);
  if(game.onGround){updateGround(dt);return;}
  if(!game.alerted&&game.time>=mission.delay){
    game.alerted=true;
    if(game.scenario==='ice')game.ice=.23;
    if(game.scenario==='airspeed')game.frozenSpeed=game.speed;
    if(game.scenario==='flaps')game.flapsJammed=true;
    message(mission.cue,true,7);
  }
  if(game.alerted&&game.scenario==='fire'&&game.securedAt===null){
    const isolated=game.fuelSelector==='off'&&game.mixtureStop;
    game.isolatedTime=isolated?game.isolatedTime+dt:0;
    if(game.isolatedTime>=1.8){
      game.securedAt=game.time;
      message('Feu éteint. Moteur coupé, poursuis en vol plané.',false,8);
    }
  }
  if(game.alerted&&game.scenario==='ice'&&!game.recovered){
    game.ice=Math.max(0,Math.min(1,game.ice+dt*(game.carb?-.049:.021)));
    if(game.ice===0){
      game.recovered=true;
      game.securedAt=game.time;
      message('Le régime remonte. Maintiens le vol stabilisé.',false,8);
    }
  }
  if(game.messageUntil<=game.time){
    const text=game.scenario==='free'?'Vol libre':game.scenario==='landing'?'Approche sur la piste':
      game.recovered?'Régime rétabli':game.securedAt!==null?'Moteur sécurisé · Prépare l’approche':game.alerted?mission.cue:'Vol stabilisé';
    message(text,game.alerted&&game.securedAt===null,7);
  }
  const profile=aircraftProfile();
  const bankTarget=game.turn*game.angle;
  game.bank+=(bankTarget-game.bank)*Math.min(1,dt*3*profile.roll);
  game.turnRate=game.bank*.34+game.rudder*2.2;
  game.heading=wrap(game.heading+game.turnRate*dt);
  const pitchTarget=[-11,-5,0,5,10][game.mode+2];
  game.pitch+=(pitchTarget-game.pitch)*Math.min(1,dt*2.5);
  const engine=engineModel();
  game.rpm+=(engine.rpm-game.rpm)*Math.min(1,dt*2);
    const cruiseReference = {
    evektor: { rpm: 4000, knots: 70,  fastKnots: 96 },
    dr400:   { rpm: 2420, knots: 114, fastKnots: 130 },
    tecnam:  { rpm: 4600, knots: 100, fastKnots: 120 },
    rf6:     { rpm: 2400, knots: 96,  fastKnots: 110 },
    c152:    { rpm: 2300, knots: 96,  fastKnots: 105 },
    c172:    { rpm: 2400, knots: 110, fastKnots: 124 },
    da40:    { power: 0.75, knots: 137, fastKnots: 142 }
  }[game.aircraft];

  const availablePower = Math.max(0, Math.min(1, engine.power));
  let levelSpeed = profile.base + availablePower * profile.speedGain;

  if (cruiseReference) {
    const referencePower = cruiseReference.power ??
      (cruiseReference.rpm - profile.idle) / (profile.maxRpm - profile.idle);

    if (availablePower <= referencePower) {
      const fraction = availablePower / referencePower;
      levelSpeed = profile.base +
        (cruiseReference.knots - profile.base) * fraction;
    } else {
      const fraction = (availablePower - referencePower) / (1 - referencePower);
      levelSpeed = cruiseReference.knots +
        (cruiseReference.fastKnots - cruiseReference.knots) * fraction;
    }
  }

  const speedTarget = levelSpeed - game.pitch * 1.35 - game.flaps * 4.1;
  
  game.speed+=(speedTarget-game.speed)*Math.min(1,dt*.37);
  const poweredClimb=engine.power>=.62&&game.speed>58;
  const pitchFlight=game.pitch<0?game.pitch*2.35:poweredClimb?game.pitch*1.12*profile.climb:0;
  const baseSink=(engine.power-.63)*16*profile.climb-game.flaps*1.5-Math.abs(game.bank)*.045;
  let vertical=baseSink+pitchFlight;
  if(engine.power<.1){
    vertical=Math.min(-4.5,-profile.sink-.004*(game.speed-profile.glide)**2+Math.min(0,game.pitch)*1.45-game.flaps*.65-Math.abs(game.bank)*.045);
  }
  const strip=airfields[game.area].runway;
  const nearLanding=game.alt<=42&&game.speed>=43-game.flaps*2&&Math.abs(game.bank)<12&&contactSurface(strip);
  game.flare=Boolean(nearLanding&&game.pitch>-.5&&game.pitch<12&&(game.mode<=0||engine.power<.60));
  const levelPower=.38+game.flaps*.038+Math.abs(game.bank)*.0025;
  game.levelHeld=game.mode===0&&!game.flare&&engine.power>=levelPower&&game.speed>=54-game.flaps*2;
  if(game.levelHeld){
    game.levelAltitude??=game.alt;
    vertical=Math.max(-4,Math.min(4,(game.levelAltitude-game.alt)*.32));
  }else{
    game.levelAltitude=null;
  }
  if(game.flare){
    const factor=Math.max(0,1-game.alt/42);
    const target=-Math.max(.9,3.4-Math.max(0,game.pitch)*.23);
    vertical=Math.min(-.85,vertical*(1-factor)+target*factor);
  }
  if(game.speed<41-game.flaps*2&&!game.flare)vertical=Math.min(vertical,-17);
  game.vs+=(vertical*60-game.vs)*Math.min(1,dt*1.65);
  game.alt=Math.max(0,Math.min(4200,game.alt+dt*game.vs/60));
  const travelPower = Math.max(0, Math.min(1, engine.power));
  const boost = Math.max(0, (travelPower - 0.25) / 0.75);
  const altitudeFactor = Math.max(0, Math.min(1, (game.alt - 60) / 240));

  const travelMultiplier = 1 + 4 * boost * altitudeFactor;
  move((game.speed / 3600) * dt * travelMultiplier);
  if(game.alt<=0)touchdown();
  else if(game.recovered&&game.time-game.securedAt>6)finish(true,'Le régime a remonté et tu as repris un vol stable.');
  else if(game.alerted&&game.scenario==='fire'&&game.securedAt===null&&game.time>mission.delay+mission.limit)finish(false,'L’incendie s’est propagé.');
}
function move(distance){
  game.x+=Math.sin(radians(game.heading))*distance;
  game.y+=Math.cos(radians(game.heading))*distance;
}
let lastDraw=0,lastPanel=0,lastFrame='';

function positionRunwayPin(){
  const area=airfields[game.area];
  const strip=area.runway;
  const anchor=[.5,.2,.8].map(fraction=>({
    x:strip.x+(strip.endX-strip.x)*fraction,
    y:strip.y+(strip.endY-strip.y)*fraction
  })).map(point=>projectField(point,game)).find(Boolean);
  const pin=el('runway-pin');
  pin.hidden=!anchor;
  if(!anchor)return;
  pin.style.left=anchor[0]+'%';
  pin.style.top=anchor[1]+'%';
  pin.classList.toggle('label-left',anchor[0]>70);
  el('runway-pin-label').textContent='Piste '+area.numbers.join('/');
}
function animation(now) {
  requestAnimationFrame(animation);
  if(document.hidden){
    lastTick=now;
    return;
  }
  tick(now);
  if(runwayTrack)cameraLook=delta(game.heading,bearing(midpoint(airfields[game.area].runway)));
  const frame=[game.area,game.x,game.y,game.alt,game.heading,game.bank,game.pitch,cameraLook,runwayTrack,windshield.clientWidth,windshield.clientHeight,photoReady,detailReady].join('/');
  if(frame!==lastFrame&&now-lastDraw>=(compactTerrain?50:30)){
    lastFrame=frame;
    lastDraw=now;
    drawFlight(game);
    positionRunwayPin();
    landmarkData.forEach((point,i)=>{
      const position=!runwayTrack&&projectField(point,game),label=landmarks[i];
      label.hidden=!position;
      if(position){
        label.style.left=position[0]+'%';
        label.style.top=position[1]+'%';
      }
    });
    markerElements.forEach((marker,i)=>{
      const field=game.fields[i];
      const position=!runwayTrack&&field&&!field.runway&&projectField(field,game);
      marker.hidden=!position;
      if(position){
        marker.style.left=position[0]+'%';
        marker.style.top=position[1]+'%';
      }
    });
  }
  if(now-lastPanel>=120){lastPanel=now;render();}
}
function showOverlay(stage) {
  const paused = stage==='paused';
  const menu = stage==='menu';
  game.stage=stage;
  stopOptionalSound();
  el('sound').hidden=true;
  game.rudder=0;
  el('overlay').hidden=false;
  el('pause').disabled=true;
  el('scenarios').hidden=!menu;
  el('airport-picker').hidden=!menu||game.selection!=='free';
  el('aircraft-picker').hidden=!menu;
  el('secondary').hidden=menu;
  el('start').firstChild.textContent=menu?'Entrer dans le cockpit ':paused?'Reprendre le vol ':'Rejouer la mission ';
  el('start').focus();
  render();
}
function finish(won,result) {
  showOverlay('finished');
  const mission = missions[game.scenario];
  const response=game.recovered?'Régime rétabli.':game.scenario==='fire'&&game.securedAt!==null?'Incident sécurisé en '+Math.round(game.securedAt-mission.delay)+' s après le premier indice.':'';
  el('kicker').textContent = 'BILAN DE VOL · '+Math.floor(game.time)+' S';
  el('modal-title').textContent = won?(game.recovered?'Moteur rétabli !':'Atterrissage réussi'):'Vol interrompu';
  el('intro').textContent = ['landing','free'].includes(game.scenario)?result:result+'\nPremier indice · '+mission.cause+'.'+(response?' '+response:'')+'\n'+mission.consequence;
}
function pause() {
  if(game.stage==='paused') {
    game.stage='playing';
    lastTick=performance.now();
    el('overlay').hidden=true;
    el('pause').disabled=false;
    el('sound').hidden=false;
    el('pause').focus();
    render();
  } else if(game.stage==='playing') {
    showOverlay('paused');
    el('kicker').textContent='MISSION SUSPENDUE';
    el('modal-title').textContent='En pause';
    el('intro').textContent='Le temps reprendra quand tu retourneras dans le cockpit.';
  }
}
el('start').addEventListener('click',()=>{
  if(game.stage==='paused'){pause();return;}
  reset();
});
el('secondary').addEventListener('click',()=>{
  Object.assign(game,initialFlight,{aircraft:game.aircraftSelection});
  game.rpm=engineModel().rpm;
  loadArea('poitiers');
  el('throttle').value=game.throttle;
  showOverlay('menu');
  el('kicker').textContent='JEU DE COCKPIT';
  el('modal-title').innerHTML='Mayday<span>.</span>';
  el('intro').textContent='Tu es seul aux commandes d’un monomoteur. Observe les instruments, réagis à la panne et trouve un terrain où te poser.';
  message('En attente de la mission');
});
el('pause').addEventListener('click',pause);
function setSoundButton(label,active){
  const button=el('sound');
  button.textContent=label;
  button.setAttribute('aria-pressed',active);
}
function stopOptionalSound(label='Activer le son'){
  const sound=optionalSound;
  optionalSound=null;
  if(sound){
    clearTimeout(sound.timeout);
    clearInterval(sound.updates);
    sound.context.onstatechange=null;
    if(sound.context.state!=='closed'){
      try{void sound.context.close().catch(()=>{});}catch{}
    }
  }
  setSoundButton(label,false);
}
function updateOptionalSound(){
  const sound=optionalSound;
  if(!sound?.started||sound.context.state!=='running')return;
  if(engineModel().stopped){stopOptionalSound();return;}
  const propellerRpm=game.rpm/aircraftProfile().gear;
  const frequency=Math.max(46,Math.min(115,propellerRpm/30));
  if(sound.frequency!==undefined&&Math.abs(frequency-sound.frequency)<1)return;
  sound.frequency=frequency;
  const time=sound.context.currentTime;
  try{
    sound.engine.frequency.setTargetAtTime(frequency,time,.12);
    sound.harmonic.frequency.setTargetAtTime(frequency*2,time,.12);
  }catch{
    stopOptionalSound('Son interrompu · Relancer');
  }
}
function toggleOptionalSound(){
  if(optionalSound){stopOptionalSound();return;}
  if(game.stage!=='playing')return;
  if(engineModel().stopped){message('Le moteur est coupé.');return;}
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext){setSoundButton('Audio indisponible',false);return;}
  let sound;
  const fail=()=>{
    if(optionalSound===sound)stopOptionalSound('Son bloqué · Réessayer');
  };
  try{
    const context=new AudioContext();
    sound={context,started:false};
    optionalSound=sound;
    const gain=context.createGain();
    gain.gain.value=0;
    const filter=context.createBiquadFilter();
    filter.type='lowpass';
    filter.frequency.value=760;
    filter.connect(gain);
    gain.connect(context.destination);
    sound.engine=context.createOscillator();
    sound.engine.type='sawtooth';
    sound.engine.frequency.value=75;
    sound.engine.connect(filter);
    sound.harmonic=context.createOscillator();
    sound.harmonic.type='triangle';
    sound.harmonic.frequency.value=150;
    const harmonicGain=context.createGain();
    harmonicGain.gain.value=.3;
    sound.harmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    sound.engine.start();
    sound.harmonic.start();
    const started=()=>{
      if(optionalSound!==sound||context.state!=='running')return;
      if(sound.started)return;
      sound.started=true;
      clearTimeout(sound.timeout);
      try{
        gain.gain.setTargetAtTime(.30,context.currentTime,.09);
      }catch{
        fail();
        return;
      }
      updateOptionalSound();
      if(optionalSound!==sound)return;
      sound.updates=setInterval(updateOptionalSound,200);
      setSoundButton('Couper le son',true);
    };
    context.onstatechange=()=>{
      if(context.state==='running')started();
      else if(sound.started&&optionalSound===sound)stopOptionalSound('Son interrompu · Relancer');
    };
    setSoundButton('Démarrage du son…',false);
    sound.timeout=setTimeout(fail,3000);
    void context.resume().then(started,fail);
  }catch{
    if(sound)fail();
    else setSoundButton('Son bloqué · Réessayer',false);
  }
}
el('sound').addEventListener('click',toggleOptionalSound);
const angleButtons=all('[data-angle]');
function setAngle(angle) {
  game.angle=angle;
  angleButtons.forEach(button=>{
    const active=Number(button.dataset.angle)===angle;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',active);
  });
}
angleButtons.forEach(button=>button.addEventListener('click',()=>setAngle(Number(button.dataset.angle))));
all('[data-command]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.command)));
all('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{
  game.selection=button.dataset.scenario;
  el('airport-picker').hidden=game.selection!=='free';
  all('[data-scenario]').forEach(option=>{
    option.classList.toggle('selected',option===button);
    option.setAttribute('aria-pressed',option===button);
  });
}));
const fuelButtons=all('[data-fuel]');
function selectFuel(selector){
  if(game.stage!=='playing')return;
  game.fuelSelector=selector;
  if(selector==='off')message('Arrivée de carburant fermée.');
  else if(!feedingTanks().some(Boolean))message('Le réservoir sélectionné est vide.',true);
  render();
}
function toggleMixture(){
  if(game.stage!=='playing')return;
  game.mixtureStop=!game.mixtureStop;
  message(game.mixtureStop?'Mixture sur STOP.':'Mixture sur RICHE.');
  render();
}
fuelButtons.forEach(button=>button.addEventListener('click',()=>selectFuel(button.dataset.fuel)));
el('mixture').addEventListener('click',toggleMixture);
function throttle(value){
  game.throttle=Math.max(0,Math.min(100,value));
  el('throttle').value=game.throttle;
  render();
}
function carbHeat(){
  if(game.stage!=='playing')return;
  game.carb=!game.carb;
  message(game.carb?'Réchauffe carburateur : chaud. Observe le régime.':'Réchauffe carburateur : froid.');
  render();
}
el('throttle').addEventListener('input',event=>{if(game.stage==='playing')throttle(Number(event.target.value));});
el('carb').addEventListener('click',carbHeat);
const viewButtons=all('[data-view]');
function look(angle){
  runwayTrack=false;
  el('runway-camera').setAttribute('aria-pressed','false');
  cameraLook=angle;
  viewButtons.forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.view)===angle));
}
viewButtons.forEach(button=>button.addEventListener('click',()=>look(Number(button.dataset.view))));
function trackRunway(){
  if(runwayTrack){look(0);return;}
  runwayTrack=true;
  viewButtons.forEach(button=>button.setAttribute('aria-pressed','false'));
  el('runway-camera').setAttribute('aria-pressed','true');
}
el('runway-camera').addEventListener('click',trackRunway);
const keyCommands={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',' ':'level',i:'scan',s:'secure',a:'land',b:'brake',f:'flap-down',v:'flap-up'};
document.addEventListener('keydown',event=>{
  if(event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if(event.key==='Escape' && ['playing','paused'].includes(game.stage)) {event.preventDefault();pause();return;}
  if(game.stage!=='playing') return;
  if(event.target?.id==='throttle' && event.key.startsWith('Arrow')) return;
  const viewKey={j:-87,k:0,l:87}[event.key.toLowerCase()];
  if(viewKey!==undefined){event.preventDefault();look(viewKey);return;}
  const rudderKey={q:-1,d:1}[event.key.toLowerCase()];
  if(rudderKey){event.preventDefault();setRudder(rudderKey);return;}
  if(event.key.toLowerCase()==='p'){event.preventDefault();trackRunway();return;}
  if(event.key.toLowerCase()==='c'){event.preventDefault();carbHeat();return;}
  if(['+','=','-'].includes(event.key)){event.preventDefault();throttle(game.throttle+(event.key==='-'?-5:5));return;}
  const action=keyCommands[event.key.toLowerCase()] || keyCommands[event.key];
  if(action) {event.preventDefault();command(action);}
  if(/^[1-4]$/.test(event.key)){
    const button=angleButtons[Number(event.key)-1];
    if(button){event.preventDefault();setAngle(Number(button.dataset.angle));}
  }
});
el('aircraft').addEventListener('change',event=>{
  game.aircraftSelection=event.target.value;
  game.aircraft=game.aircraftSelection;
  const profile=aircraftProfile();
  el('aircraft-info').textContent=profile.hp+' ch · Modèle de vol du jeu';
  game.rpm=engineModel().rpm;
  render();
});
el('airport').addEventListener('change',event=>{game.airportSelection=event.target.value;});
function setRudder(direction){
  game.rudder=game.stage==='playing'?direction:0;
  render();
}
all('[data-rudder]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{
    button.setPointerCapture(event.pointerId);
    setRudder(Number(button.dataset.rudder));
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,()=>setRudder(0)));
  button.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      setRudder(Number(button.dataset.rudder));
    }
  });
  button.addEventListener('keyup',()=>setRudder(0));
});
document.addEventListener('keyup',event=>{
  const direction={q:-1,d:1}[event.key.toLowerCase()];
  if(direction===game.rudder)setRudder(0);
});
window.addEventListener('blur',()=>setRudder(0));
document.addEventListener('visibilitychange',()=>{
  // Preserve the flight when the browser briefly moves the page to the background.
  lastTick=performance.now();
});
setAngle(30);
render();
requestAnimationFrame(animation);
