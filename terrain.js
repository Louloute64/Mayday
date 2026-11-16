'use strict';
const terrainFields = [
  { name:'Pré des Chênes', x:1.38, y:.58, width:.28, height:.31, quality:'Dégagé', viable:true },
  { name:'Champ du Moulin', x:.91, y:0, width:.34, height:.25, quality:'Ligne d’arbres', viable:false },
  { name:'Prairie du Bourg', x:.96, y:-1.24, width:.35, height:.21, quality:'Dégagée', viable:true }
];
// The drawing and the navigation model use the same world coordinates in NM.
const runway={name:'Poitiers-Biard · Piste 03/21',x:1.78151,y:.27768,endX:2.42791,endY:1.37425,heading:30.52,length:1.273,halfWidth:.01215,viable:true,runway:true,quality:'Asphalte'};
const targeRunway={name:'Châtellerault-Targé · Piste 18/36',x:-.0125766,y:.2163043,endX:.0125766,endY:-.2163043,heading:176.6724,length:.43334,halfWidth:.0054,viable:true,runway:true,quality:'Asphalte'};
const midpoint=strip=>({x:(strip.x+strip.endX)/2,y:(strip.y+strip.endY)/2});
const airfields={
  poitiers:{name:'Poitiers-Biard',code:'LFBI',runway,numbers:['03','21'],photo:'poitiers-ign.jpg',detail:'poitiers-piste-ign.jpg',
    landmarks:[{name:'Poitiers',x:3.5,y:.29},{name:'A10',x:1.49,y:.61},{name:'Poitiers-Biard',...midpoint(runway)}]},
  targe:{name:'Châtellerault-Targé',code:'LFCA',runway:targeRunway,numbers:['18','36'],photo:'targe-ign.jpg',detail:'targe-piste-ign.jpg',
    landmarks:[{name:'Châtellerault',x:-1.1,y:1.75},{name:'Châtellerault-Targé',...midpoint(targeRunway)}]},
  niort:{name:"Niort-Marais poitevin",code:'LFBN',numbers:["07", "25"],photo:'niort-ign.jpg',detail:'niort-piste-ign.jpg',
    runway:{name:"Niort-Marais poitevin · Piste 07/25",x:-0.443616,y:-0.184998,endX:0.443616,endY:0.184998,heading:67.362721,length:0.961289,halfWidth:0.008099,viable:true,runway:true,quality:'Asphalte'},
    landmarks:[{name:"Niort",x:-2.6276,y:0.7446},{name:"Niort-Marais poitevin",x:0.0000,y:0.0000}]},
  angouleme:{name:"Angoulême-Brie-Champniers",code:'LFBU',numbers:["10", "28"],photo:'angouleme-ign.jpg',detail:'angouleme-piste-ign.jpg',
    runway:{name:"Angoulême-Brie-Champniers · Piste 10/28",x:-0.498076,y:0.060692,endX:0.498076,endY:-0.060692,heading:96.947418,length:1.003520,halfWidth:0.012149,viable:true,runway:true,quality:'Asphalte'},
    landmarks:[{name:"Champniers",x:-0.5724,y:-0.9281},{name:"Angoulême-Brie-Champniers",x:0.0000,y:0.0000}]},
  limoges:{name:"Limoges-Bellegarde",code:'LFBL',numbers:["03", "21"],photo:'limoges-ign.jpg',detail:'limoges-piste-ign.jpg',
    runway:{name:"Limoges-Bellegarde · Piste 03/21",x:-0.347428,y:-0.531536,endX:0.347428,endY:0.531536,heading:33.169885,length:1.270019,halfWidth:0.012149,viable:true,runway:true,quality:'Asphalte'},
    landmarks:[{name:"Limoges",x:3.3596,y:-1.7927},{name:"Limoges-Bellegarde",x:0.0000,y:0.0000}]},
  saumur:{name:"Saumur-Saint-Florent",code:'LFOD',numbers:["10", "28"],photo:'saumur-ign.jpg',detail:'saumur-piste-ign.jpg',
    runway:{name:"Saumur-Saint-Florent · Piste 10/28",x:-0.389034,y:0.034228,endX:0.389034,endY:-0.034228,heading:95.028049,length:0.781074,halfWidth:0.008099,viable:true,runway:true,quality:'Asphalte'},
    landmarks:[{name:"Saumur",x:1.5074,y:0.1489},{name:"Saumur-Saint-Florent",x:0.0000,y:0.0000}]}
};
const compactTerrain=window.matchMedia('(pointer: coarse)').matches||
  (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const mapSize=compactTerrain?1600:4096, mapSpan=14;
const map = document.createElement('canvas');
map.width = map.height = mapSize;
const groundContext = map.getContext('2d',{alpha:false});
const pixelsPerMile = mapSize / mapSpan;
const mapX = x => mapSize/2 + x*pixelsPerMile;
const mapY = y => mapSize/2 - y*pixelsPerMile;
let cameraLook=0;
let runwayTrack=false;
let parcelPixels=null;
let activeArea;
let runwayCenter;
let landmarkData=[];
let landmarks=[];
let runwayShapes=[];
let areaRequest=0;
const terrainSource=source=>compactTerrain?source.replace('.jpg','-compact.jpg'):source;
function loadImage(source){
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>resolve(null);
    image.src=source;
  });
}
function loadArea(key){
  const area=airfields[key];
  if(activeArea===area)return;
  activeArea=area;
  const request=++areaRequest;
  photoReady=false;
  detailReady=false;
  parcelPixels=null;
  runwayCenter=midpoint(area.runway);
  runwayShapes=makeRunwayShapes(area.runway,area.numbers);
  landmarkData=area.landmarks.filter(point=>point.name!==area.name);
  const container=document.getElementById('landmarks');
  container.replaceChildren();
  landmarks=landmarkData.map(({name})=>{
    const label=document.createElement('span');
    label.className='landmark';
    label.textContent=name;
    container.append(label);
    return label;
  });
  document.getElementById('location').textContent=area.name.toUpperCase()+' · '+area.code;
  loadImage(terrainSource(area.photo)).then(image=>{
    if(request!==areaRequest)return;
    groundContext.fillStyle='#70826a';
    groundContext.fillRect(0,0,mapSize,mapSize);
    if(image)groundContext.drawImage(image,0,0,mapSize,mapSize);
    photoReady=true;
  });
  loadImage(key+'-champs.png').then(image=>{
    if(request!==areaRequest||!image)return;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=compactTerrain?1024:image.naturalWidth;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.imageSmoothingEnabled=false;
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;
    const data=new Uint8Array(canvas.width*canvas.height);
    for(let i=0;i<data.length;i++)data[i]=rgba[i*4]>128?1:0;
    parcelPixels={width:canvas.width,height:canvas.height,data};
    canvas.width=canvas.height=1;
  });
  loadImage(terrainSource(area.detail)).then(image=>{
    if(request!==areaRequest||!image)return;
    detailTexture.globalCompositeOperation='source-over';
    detailTexture.clearRect(0,0,detailSize,detailSize);
    detailTexture.drawImage(image,0,0,detailSize,detailSize);
    detailTexture.globalCompositeOperation='destination-in';
    const mask=detailTexture.createRadialGradient(detailCenter,detailCenter,detailSize*.368,detailCenter,detailCenter,detailSize*.498);
    mask.addColorStop(0,'white');
    mask.addColorStop(1,'transparent');
    detailTexture.fillStyle=mask;
    detailTexture.fillRect(0,0,detailSize,detailSize);
    detailReady=true;
  });
}
function isParcel(x,y){
  if(!parcelPixels)return false;
  const {width,height,data}=parcelPixels;
  const col=Math.floor((.5+x/mapSpan)*width),row=Math.floor((.5-y/mapSpan)*height);
  return col>=0&&row>=0&&col<width&&row<height&&data[row*width+col]===1;
}
function isOpenField(flight){
  const heading=radians(flight.heading),sin=Math.sin(heading),cos=Math.cos(heading);
  return isParcel(flight.x,flight.y)&&[-1,1].every(side=>
    isParcel(flight.x+cos*side*.009,flight.y-sin*side*.009)
  );
}
function parcelRollout(flight){
  const heading=radians(flight.heading),sin=Math.sin(heading),cos=Math.cos(heading);
  let clear=.012;
  for(;clear<.18;clear+=.012){
    if(!isParcel(flight.x+clear*sin,flight.y+clear*cos))break;
  }
  return Math.max(.045,clear);
}
const windshield=document.getElementById('terrain');
const view=windshield.getContext('2d',{alpha:false,desynchronized:!compactTerrain});
const groundPlane=document.createElement('canvas');
const projection=groundPlane.getContext('2d',{alpha:true});
const forwardMap=document.createElement('canvas');
const forwardSize=compactTerrain?1152:2304, forwardCenter=forwardSize/2, forwardOrigin=forwardSize-28;
forwardMap.width=forwardMap.height=forwardSize;
const forward=forwardMap.getContext('2d',{alpha:false});
const scale=compactTerrain?144:292;
const radians=degrees=>degrees*Math.PI/180;
let photoReady=false;
let orthoFrame;
const detailSpan=2.4,detailSize=compactTerrain?1152:3072,detailScale=detailSize*(1150/3072);
const detailCenter=detailSize/2,detailOrigin=detailSize-17;
const airfield=document.createElement('canvas');
airfield.width=airfield.height=detailSize;
const detailTexture=airfield.getContext('2d');
const detailMap=document.createElement('canvas');
detailMap.width=detailMap.height=detailSize;
const detail=detailMap.getContext('2d');
let detailReady=false;
function makeRunwayShapes(runway,numbers){
  const shapes=[];
  function runwayStripe(from,to,left,right,color){
    const angle=radians(runway.heading),sin=Math.sin(angle),cos=Math.cos(angle);
    const point=(along,across)=>[runway.x+along*sin+across*cos,runway.y+along*cos-across*sin];
    shapes.push({color,points:[point(from,left),point(to,left),point(to,right),point(from,right)]});
  }
  runwayStripe(0,runway.length,-runway.halfWidth,runway.halfWidth,'#525459');
  runwayStripe(0,runway.length,-runway.halfWidth*.60,runway.halfWidth*.60,'#56585e');
  for(const side of [-1,1]){
    runwayStripe(.004,runway.length-.004,side*runway.halfWidth*.92,side*runway.halfWidth*.96,'#dfded2');
  }
  for(let t=.08;t<runway.length-.07;t+=.032)runwayStripe(t,t+.014,-.00025,.00025,'#e8e7df');
  for(const end of [0,runway.length]){
    const reverse=end>0?-1:1;
    for(let stripe=-5;stripe<=5;stripe++){
      if(stripe!==0)runwayStripe(end+reverse*.005,end+reverse*.022,runway.halfWidth*(stripe*.15-.033),runway.halfWidth*(stripe*.15+.033),'#e9e6de');
    }
    for(const side of [-1,1])runwayStripe(end+reverse*.09,end+reverse*.115,side*runway.halfWidth*.30,side*runway.halfWidth*.53,'#e9e6de');
  }
  const numerals={
    '0':['111','101','101','101','111'],
    '1':['010','110','010','010','111'],
    '2':['111','001','111','100','111'],
    '3':['111','001','111','001','111'],
    '5':['111','100','111','001','111'],
    '6':['111','100','111','101','111'],
    '7':['111','001','010','010','010'],
    '8':['111','101','111','101','111']
  };
  for(const [number,end,direction] of [[numbers[0],0,1],[numbers[1],runway.length,-1]]){
    [...number].forEach((digit,digitIndex)=>{
      numerals[digit].forEach((row,j)=>{
        [...row].forEach((pixel,i)=>{
          if(pixel!=='1')return;
          const along=end+direction*(.036+(4-j)*.0016);
          const across=direction*(-.0028+(digitIndex*4+i)*.0008);
          runwayStripe(along,along+direction*.0016,across,across+direction*.0008,'#eeeae1');
        });
      });
    });
  }
  return shapes;
}
function drawRunway(flight,heading,elevation,focal,center,pitch){
  if(Math.hypot(flight.x-runwayCenter.x,flight.y-runwayCenter.y)>3.6)return;
  const sin=Math.sin(heading),cos=Math.cos(heading),near=.004;
  const sinPitch=Math.sin(pitch),cosPitch=Math.cos(pitch);
  for(const {color,points} of runwayShapes){
    const quad=points.map(([x,y])=>{
      const dx=x-flight.x,dy=y-flight.y,forward=dx*sin+dy*cos;
      return [dx*cos-dy*sin,forward*cosPitch-elevation*sinPitch,elevation*cosPitch+forward*sinPitch];
    });
    const visible=[];
    for(let i=0;i<quad.length;i++){
      const [right,depth,down]=quad[i], [nextRight,nextDepth,nextDown]=quad[(i+1)%quad.length];
      if(depth>=near)visible.push([right,depth,down]);
      if((depth<near)!==(nextDepth<near)){
        const fraction=(near-depth)/(nextDepth-depth);
        visible.push([right+(nextRight-right)*fraction,near,down+(nextDown-down)*fraction]);
      }
    }
    if(visible.length<3)continue;
    view.beginPath();
    visible.forEach(([right,depth,down],i)=>{
      const x=right*focal/depth,y=center+down*focal/depth;
      if(i===0)view.moveTo(x,y);else view.lineTo(x,y);
    });
    view.closePath();
    view.fillStyle=color;
    view.fill();
  }
}
function paneAttitude(flight,angle,height,focal){
  if(runwayTrack){
    const distance=Math.hypot(runwayCenter.x-flight.x,runwayCenter.y-flight.y);
    const pitch=-Math.atan2((flight.alt+8)/6076,Math.max(.045,distance));
    return {heading:radians(flight.heading+angle),pitch,bank:radians(flight.bank*.18),
      horizon:height*.46+Math.tan(pitch)*focal};
  }
  const yaw=radians(flight.heading),pitch=radians(flight.pitch),roll=radians(flight.bank);
  const offset=radians(angle),lookDown=radians(cameraLook===0?0:-7);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const cr=Math.cos(roll),sr=Math.sin(roll),co=Math.cos(offset),so=Math.sin(offset);
  const forward=[sy*cp,cy*cp,sp];
  const right=[cy*cr+sy*sp*sr,-sy*cr+cy*sp*sr,-cp*sr];
  const up=[cy*sr-sy*sp*cr,-sy*sr-cy*sp*cr,cp*cr];
  const viewRight=right.map((component,i)=>co*component-so*forward[i]);
  const viewForward=forward.map((component,i)=>(co*component+so*right[i])*Math.cos(lookDown)+up[i]*Math.sin(lookDown));
  const viewUpZ=up[2]*Math.cos(lookDown)-(co*forward[2]+so*right[2])*Math.sin(lookDown);
  const measuredPitch=Math.asin(Math.max(-.98,Math.min(.98,viewForward[2])));
  const bank=Math.atan2(-viewRight[2],viewUpZ);
  // Keep the surroundings visible when the player looks out the high-side window.
  const manualSide=cameraLook!==0;
  const viewPitch=manualSide?Math.max(-Math.atan(height*.48/focal),Math.min(Math.atan(height*.23/focal),measuredPitch)):measuredPitch;
  return {heading:Math.atan2(viewForward[0],viewForward[1]),pitch:viewPitch,
    bank:manualSide?bank*.72:bank,horizon:height*.46+Math.tan(viewPitch)*focal};
}
function cameraPanes(){
  return cameraLook===0&&!runwayTrack?[[-57,0,.22,1.19],[0,.22,.56,1.12],[57,.78,.22,1.19]]:[[cameraLook,0,1,runwayTrack?1.62:2.12]];
}
function drawFlight(flight){
  const ratio=Math.min(compactTerrain?1:1.7,window.devicePixelRatio||1);
  const width=Math.max(1,Math.min(compactTerrain?960:1820,Math.round(windshield.clientWidth*ratio)));
  const height=Math.max(1,Math.round(width*windshield.clientHeight/Math.max(1,windshield.clientWidth)));
  if(windshield.width!==width||windshield.height!==height){windshield.width=width;windshield.height=height;}
  const elevation=(Math.max(0,flight.alt)+8)/6076;
  const focal=width*.5;
  orthoFrame={width,height,elevation,focal};
  const panes=cameraPanes();
  const useDetail=detailReady&&Math.hypot(flight.x-runwayCenter.x,flight.y-runwayCenter.y)<3;
  windshield.parentElement.classList.add('panoramic');
  windshield.parentElement.classList.toggle('looking-side',cameraLook!==0&&!runwayTrack);
  windshield.parentElement.classList.toggle('tracking-runway',runwayTrack);
  windshield.parentElement.classList.toggle('looking-left',cameraLook<0);
  for(const [angle,start,part,span] of panes){
    const {bank,heading,horizon,pitch}=paneAttitude(flight,angle,height,focal);
    const left=start*width,paneWidth=part*width,mid=left+paneWidth/2,center=height*.46;
    view.save();
    view.beginPath();view.rect(left,0,paneWidth,height);view.clip();
    const sky=view.createLinearGradient(0,0,0,Math.max(1,horizon));
    sky.addColorStop(0,'#578faf');sky.addColorStop(1,'#aebfc8');
    view.fillStyle=sky;view.fillRect(left,0,paneWidth,height);
    if(!photoReady){view.restore();continue;}
    forward.setTransform(1,0,0,1,0,0);
    forward.fillStyle='#aebfc8';forward.fillRect(0,0,forwardSize,forwardSize);
    forward.translate(forwardCenter,forwardOrigin);
    forward.rotate(-heading);
    forward.scale(scale/pixelsPerMile,scale/pixelsPerMile);
    forward.drawImage(map,-mapX(flight.x),-mapY(flight.y));
    if(useDetail){
      detail.setTransform(1,0,0,1,0,0);
      detail.clearRect(0,0,detailSize,detailSize);
      detail.translate(detailCenter,detailOrigin);
      detail.rotate(-heading);
      const dimension=detailSpan*detailScale;
      detail.drawImage(airfield,(runwayCenter.x-flight.x)*detailScale-dimension/2,(flight.y-runwayCenter.y)*detailScale-dimension/2,dimension,dimension);
    }
    const paneFocal=paneWidth/span;
    view.translate(mid,center);
    view.rotate(-bank);
    view.scale(paneFocal/focal,1);
    view.translate(0,-center);
    // Fill the unbanked ground first, then rotate one continuous image so
    // intersections between scan lines do not shimmer during a turn.
    const halfView=paneWidth*.5;
    const sine=Math.abs(Math.sin(bank)),cosine=Math.cos(bank);
    const extent=Math.ceil((halfView*cosine+Math.max(center,height-center)*sine)*focal/paneFocal)+3;
    const top=Math.floor(center-halfView*sine-center*cosine)-3;
    const bottom=Math.ceil(center+halfView*sine+(height-center)*cosine)+3;
    const rasterHeight=bottom-top;
    if(groundPlane.width<extent*2)groundPlane.width=Math.ceil(extent/64)*128;
    if(groundPlane.height<rasterHeight)groundPlane.height=Math.ceil(rasterHeight/64)*64;
    projection.clearRect(0,0,extent*2,rasterHeight);
    projection.imageSmoothingQuality='low';
    const firstRow=Math.max(top,Math.ceil(horizon));
    if(firstRow<bottom){
      projection.fillStyle='#aebfc8';
      projection.fillRect(0,firstRow-top,extent*2,bottom-firstRow);
    }
    const rowStep=part<.3||compactTerrain?2:1;
    for(let y=firstRow;y<bottom;y+=rowStep){
      const cp=Math.cos(pitch),sp=Math.sin(pitch);
      const groundFactor=elevation*focal/(Math.max(.5,y-horizon+rowStep*.5)*cp);
      const distance=groundFactor/cp+elevation*sp/cp;
      if(distance>7.75||distance<0)continue;
      const next=elevation*focal/(Math.max(.5,y-horizon+rowStep)*cp*cp);
      const previous=elevation*focal/(Math.max(.5,y-horizon)*cp*cp);
      const band=previous-next;
      const half=groundFactor*scale*(extent/focal);
      const sampled=Math.min(forwardCenter-1,half);
      const projected=extent*sampled/half;
      const row=y-top;
      const sourceHeight=Math.min(24,Math.max(1,band*scale));
      projection.drawImage(forwardMap,forwardCenter-sampled,forwardOrigin-distance*scale-sourceHeight/2,sampled*2,sourceHeight,extent-projected,row,projected*2,rowStep);
      if(useDetail&&distance<2.6){
        const detailHalf=groundFactor*detailScale*(extent/focal);
        const available=Math.min(detailCenter-1,detailHalf);
        const detailWidth=extent*available/detailHalf;
        const detailHeight=Math.min(32,Math.max(1,band*detailScale));
        projection.drawImage(detailMap,detailCenter-available,detailOrigin-distance*detailScale-detailHeight/2,available*2,detailHeight,extent-detailWidth,row,detailWidth*2,rowStep);
      }
      if(distance>2.6){
        projection.fillStyle='rgba(174,191,200,'+Math.min(.81,(distance-2.6)/6.5)+')';
        projection.fillRect(0,row,extent*2,rowStep);
      }
    }
    view.imageSmoothingQuality='medium';
    view.drawImage(groundPlane,0,0,extent*2,rasterHeight,-extent,top,extent*2,rasterHeight);
    drawRunway(flight,heading,elevation,focal,center,pitch);
    view.restore();
  }
}
function projectField(point,flight){
  if(!orthoFrame)return null;
  const {width,height,elevation,focal}=orthoFrame;
  const panes=cameraPanes();
  for(const [angle,start,part,span] of panes){
    const center=start+part/2;
    const {bank,heading,pitch}=paneAttitude(flight,angle,height,focal);
    const dx=point.x-flight.x,dy=point.y-flight.y;
    const forward=dx*Math.sin(heading)+dy*Math.cos(heading);
    const depth=forward*Math.cos(pitch)-elevation*Math.sin(pitch);
    if(depth<.035)continue;
    const right=(dx*Math.cos(heading)-dy*Math.sin(heading))*(width*part/span)/depth;
    const down=(elevation*Math.cos(pitch)+forward*Math.sin(pitch))*focal/depth;
    const x=width*center+right*Math.cos(bank)+down*Math.sin(bank);
    const y=height*.46-right*Math.sin(bank)+down*Math.cos(bank);
    if(Math.abs(x-width*center)<width*part*.43&&y>height*.17&&y<height*.83)return [x/width*100,y/height*100];
  }
  return null;
}

loadArea('poitiers');
