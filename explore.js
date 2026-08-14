(() => {
  if (!sessionStorage.getItem('melotripIntroSeen')) {
    location.replace('index.html');
    return;
  }

  const canvas = document.querySelector('#globeCanvas');
  const context = canvas.getContext('2d', { alpha: true });
  const stage = document.querySelector('#globeExplore');
  const card = document.querySelector('#coordinateCard');
  const previewLink = document.querySelector('#coordinatePreviewLink');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprite = new Image();
  sprite.src = 'assets/travel-sprite.png';

  const rawCities = [
    ['Tokyo','Japan',35.7,139.7],['Singapore','Singapore',1.35,103.8],['London','United Kingdom',51.5,-.1],['New York','United States',40.7,-74],
    ['Cape Town','South Africa',-33.9,18.4],['Reykjavik','Iceland',64.1,-21.9],['Paris','France',48.9,2.35],['Berlin','Germany',52.5,13.4],
    ['Lisbon','Portugal',38.7,-9.1],['Madrid','Spain',40.4,-3.7],['Rome','Italy',41.9,12.5],['Athens','Greece',38,23.7],
    ['Istanbul','Turkiye',41,29],['Cairo','Egypt',30,31.2],['Marrakech','Morocco',31.6,-8],['Nairobi','Kenya',-1.3,36.8],
    ['Accra','Ghana',5.6,-.2],['Lagos','Nigeria',6.5,3.4],['Johannesburg','South Africa',-26.2,28],['Dubai','United Arab Emirates',25.2,55.3],
    ['Mumbai','India',19.1,72.9],['Delhi','India',28.6,77.2],['Bangkok','Thailand',13.8,100.5],['Hanoi','Vietnam',21,105.8],
    ['Seoul','South Korea',37.6,127],['Beijing','China',39.9,116.4],['Shanghai','China',31.2,121.5],['Hong Kong','China',22.3,114.2],
    ['Taipei','Taiwan',25,121.6],['Manila','Philippines',14.6,121],['Jakarta','Indonesia',-6.2,106.8],['Sydney','Australia',-33.9,151.2],
    ['Melbourne','Australia',-37.8,145],['Auckland','New Zealand',-36.9,174.8],['Honolulu','United States',21.3,-157.9],['Vancouver','Canada',49.3,-123.1],
    ['Seattle','United States',47.6,-122.3],['San Francisco','United States',37.8,-122.4],['Los Angeles','United States',34.1,-118.2],['Mexico City','Mexico',19.4,-99.1],
    ['Havana','Cuba',23.1,-82.4],['Bogota','Colombia',4.7,-74.1],['Lima','Peru',-12,-77],['Santiago','Chile',-33.4,-70.7],
    ['Buenos Aires','Argentina',-34.6,-58.4],['Sao Paulo','Brazil',-23.6,-46.6],['Rio de Janeiro','Brazil',-22.9,-43.2],['Montreal','Canada',45.5,-73.6],
    ['Toronto','Canada',43.7,-79.4],['Chicago','United States',41.9,-87.6],['New Orleans','United States',30,-90.1],['Oslo','Norway',59.9,10.8],
    ['Stockholm','Sweden',59.3,18.1],['Helsinki','Finland',60.2,24.9],['Florence','Italy',43.77,11.25],['Kyoto','Japan',35,135.8]
  ];

  const profiles = [
    { title:'Morning Departure', copy:'A melodic coordinate shaped by platform air, footsteps and the changing rhythm of departure.', type:'triangle', accent:'#F4EC32' },
    { title:'Rain Memory', copy:'Rain, wind and reflective surfaces form a soft frequency that changes with the surrounding city.', type:'sine', accent:'#3E8FCE' },
    { title:'Street Conversation', copy:'Small gestures, distant voices and repeated daily movements become a reusable melodic fragment.', type:'square', accent:'#123F85' },
    { title:'Tidal Crossing', copy:'Water, harbour structures and open air create a slow sound that expands beyond the shoreline.', type:'sine', accent:'#9FDCF4' },
    { title:'Living Canopy', copy:'Birds, leaves and changing air pressure are translated into a light organic sequence.', type:'triangle', accent:'#FF8A45' },
    { title:'Afterlight Signal', copy:'A low nocturnal tone gathers electrical hum, distant traffic and the space between events.', type:'sawtooth', accent:'#F15A43' },
    { title:'Market Cadence', copy:'Voices, gestures and small exchanges create a warm repeating pulse.', type:'triangle', accent:'#F29AB2' },
    { title:'Festival Radiance', copy:'Percussion and movement expand through the city as a bright shared rhythm.', type:'sine', accent:'#1769AA' }
  ];

  const scale = [196,220,247,262,294,330,349,392,440,494,523,587];
  const recorders = ['Mika','Elena','Noah','Ari','Sora','Mina','Theo','Luca','Iris','Anya','Leo','Nia'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const toRadians = value => value * Math.PI / 180;
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const mix = (from,to,amount) => from + (to-from)*amount;
  const smooth = value => value*value*(3-2*value);
  const hash = value => Math.abs(Math.sin(value*127.1+311.7)*43758.5453)%1;
  const damp = (current,target,speed,delta) => mix(current,target,1-Math.exp(-speed*delta/1000));
  const blendRgb = (from,to,amount) => from.map((value,index)=>Math.round(mix(value,to[index],amount))).join(',');

  const coordinates = rawCities.map(([city,country,lat,lon],index) => {
    const phi = toRadians(lat);
    const lambda = toRadians(lon);
    const mercatorY=.5-Math.log(Math.tan(Math.PI/4+phi/2))/(2*Math.PI);
    return {
      city,country,lat,lon,index,
      profile:profiles[index%profiles.length],
      sprite:index%12,
      frequency:scale[index%scale.length],
      recorder:recorders[index%recorders.length],
      recorded:`${String(3+(index*7)%25).padStart(2,'0')} ${months[(index*5+3)%12]} 2025`,
      sphere:{ x:Math.cos(phi)*Math.sin(lambda), y:-Math.sin(phi), z:Math.cos(phi)*Math.cos(lambda) },
      plane:{ x:.055+((lon+180)/360)*.89+(hash(index*3)-.5)*.018, y:.075+clamp(mercatorY,.08,.92)*.84+(hash(index*7)-.5)*.018 }
    };
  });

  /* Preserve the map projection while gently separating dense city clusters. */
  coordinates.forEach(item=>item.mapAnchor={...item.plane});
  for(let iteration=0;iteration<64;iteration++){
    for(let a=0;a<coordinates.length;a++)for(let b=a+1;b<coordinates.length;b++){
      const first=coordinates[a].plane,second=coordinates[b].plane;
      const dx=(second.x-first.x)*1.42,dy=second.y-first.y,distance=Math.hypot(dx,dy)||.0001,minDistance=.052;
      if(distance>=minDistance)continue;
      const force=(minDistance-distance)*.095,moveX=(dx/distance)*force/1.42,moveY=(dy/distance)*force;
      first.x-=moveX;first.y-=moveY;second.x+=moveX;second.y+=moveY;
    }
    coordinates.forEach(item=>{
      item.plane.x=clamp(item.plane.x+(item.mapAnchor.x-item.plane.x)*.006,.05,.95);
      item.plane.y=clamp(item.plane.y+(item.mapAnchor.y-item.plane.y)*.006,.1,.9);
    });
  }

  const globeLatitudeLines=[];
  const globeLongitudeLines=[];
  const globeDotField=[];
  for(let lat=-75;lat<=75;lat+=150/14){
    const points=[];
    for(let lon=-180;lon<=180;lon+=4)points.push(sphereVector(lat,lon));
    globeLatitudeLines.push(points);
  }
  for(let lon=-180;lon<180;lon+=360/28){
    const points=[];
    for(let lat=-88;lat<=88;lat+=3)points.push(sphereVector(lat,lon));
    globeLongitudeLines.push(points);
  }
  for(let lat=-78;lat<=78;lat+=9)for(let lon=-180;lon<180;lon+=10){
    globeDotField.push({vector:sphereVector(lat,lon),phase:lat*.2+lon*.1});
  }

  let width=0,height=0,dpr=1,frame=0,lastTime=0;
  let pointer={x:0,y:0,smoothX:0,smoothY:0,inside:false,initialized:false};
  let hovered=null,selected=null,projected=[],hoverPreview=0,lastHoverIndex=-1;
  let yaw=.45,targetYaw=.45,pitch=-.08,targetPitch=-.08,zoom=1.06,targetZoom=1.06;
  let morph=0,targetMorph=0,audioContext=null,activeSources=[];

  function resize(){
    const rect=stage.getBoundingClientRect();
    width=rect.width; height=rect.height; dpr=Math.min(devicePixelRatio||1,1.7);
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    canvas.style.width=`${width}px`; canvas.style.height=`${height}px`;
    context.setTransform(dpr,0,0,dpr,0,0);
  }

  function rotate(point){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x=point.x*cy-point.z*sy;
    const z=point.x*sy+point.z*cy;
    return {x,y:point.y*cp-z*sp,z:point.y*sp+z*cp};
  }

  function globeMetrics(){
    return {cx:width*.5,cy:height*.5+8,radius:Math.min(width*.36,height*.45)*zoom};
  }

  function globePoint(point,time=0){
    const movement=reducedMotion?0:1,edge=1-Math.abs(point.z);
    const warped={x:point.x+Math.sin(time*.00031+point.y*6.2+point.z*2.1)*.0065*edge*movement,y:point.y+Math.cos(time*.00027+point.x*5.4-point.z*2.7)*.0055*edge*movement,z:point.z};
    const rotated=rotate(warped);
    const {cx,cy,radius}=globeMetrics();
    const perspective=.9+rotated.z*.1;
    return { x:cx+rotated.x*radius*perspective, y:cy+rotated.y*radius*perspective, z:rotated.z, scale:perspective };
  }

  function wave(nx,ny,time){
    const drift=(Math.sin(nx*12.4+ny*4.5+time*.00022)+Math.cos(nx*6.6-ny*8.8-time*.00017))*4;
    if(!pointer.inside)return drift*.62;
    const px=pointer.x/width,py=pointer.y/height;
    const distance=Math.hypot(nx-px,(ny-py)*1.35);
    const influence=Math.max(0,1-distance/.3);
    return drift+Math.cos(distance*31-time*.0032)*influence*18+(py-.5)*-13*influence;
  }

  function flatPoint(plane,time){ return {x:plane.x*width,y:plane.y*height+wave(plane.x,plane.y,time),z:0,scale:1}; }

  function screenFor(item,time){
    const sphere=globePoint(item.sphere,time);
    const flat=flatPoint(item.plane,time);
    const amount=smooth(morph);
    return {x:mix(sphere.x,flat.x,amount),y:mix(sphere.y,flat.y,amount),z:mix(sphere.z,0,amount),scale:mix(sphere.scale,1,amount)};
  }

  function line(points,color,lineWidth=.6){
    context.beginPath();
    points.forEach((point,index)=>index?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));
    context.strokeStyle=color; context.lineWidth=lineWidth; context.stroke();
  }

  function depthLine(points,alpha,base){
    context.save();context.lineCap='round';
    [false,true].forEach(front=>{
      context.beginPath();
      for(let index=1;index<points.length;index++){
        const previous=points[index-1],current=points[index];
        if((((previous.z+current.z)*.5)>=0)!==front)continue;
        context.moveTo(previous.x,previous.y);context.lineTo(current.x,current.y);
      }
      context.setLineDash(front?[]:[1.5,4.5]);
      context.strokeStyle=rgba(base,alpha*(front?.22:.025));context.lineWidth=front?.62:.36;context.stroke();
    });
    context.restore();
  }

  function rgba(base,alpha){ return `rgba(${base},${Math.max(0,Math.min(1,alpha))})`; }

  function sphereVector(lat,lon){
    const phi=toRadians(lat),lambda=toRadians(lon);
    return {x:Math.cos(phi)*Math.sin(lambda),y:-Math.sin(phi),z:Math.cos(phi)*Math.cos(lambda)};
  }

  function drawGlobeBody(alpha){
    if(alpha<.015)return;
    const {cx,cy,radius}=globeMetrics();
    context.save();
    context.globalAlpha=alpha;
    context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);
    context.shadowColor='rgba(57,50,37,.14)';context.shadowBlur=66;context.shadowOffsetY=18;
    const body=context.createRadialGradient(cx-radius*.3,cy-radius*.34,radius*.06,cx,cy,radius*1.04);
    body.addColorStop(0,'rgba(255,248,203,.94)');body.addColorStop(.48,'rgba(244,236,50,.42)');body.addColorStop(.78,'rgba(159,220,244,.36)');body.addColorStop(1,'rgba(18,63,133,.17)');
    context.fillStyle=body;context.fill();
    context.shadowColor='transparent';
    context.clip();
    const shade=context.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);
    shade.addColorStop(0,'rgba(255,248,223,.28)');shade.addColorStop(.58,'rgba(159,220,244,0)');shade.addColorStop(1,'rgba(18,63,133,.16)');
    context.fillStyle=shade;context.fillRect(cx-radius,cy-radius,radius*2,radius*2);
    context.restore();
  }

  function drawGlobeFrame(alpha){
    if(alpha<.015)return;
    const {cx,cy,radius}=globeMetrics();
    context.save();context.globalAlpha=alpha;
    const edge=context.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);
    edge.addColorStop(0,'rgba(255,248,223,.72)');edge.addColorStop(.48,'rgba(62,143,206,.16)');edge.addColorStop(1,'rgba(18,63,133,.28)');
    context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.strokeStyle=edge;context.lineWidth=1;context.stroke();
    context.restore();
  }

  function drawGlobeMist(time,alpha){
    if(alpha<.015)return;
    const {cx,cy,radius}=globeMetrics(),drift=Math.sin(time*.00018)*radius*.08;
    context.save();context.beginPath();context.arc(cx,cy,radius-2,0,Math.PI*2);context.clip();context.globalAlpha=alpha;
    context.save();context.translate(cx-radius*.18+drift,cy-radius*.12);context.scale(1,.18);
    const upper=context.createRadialGradient(0,0,0,0,0,radius*.72);
    upper.addColorStop(0,'rgba(255,248,223,.18)');upper.addColorStop(.34,'rgba(244,236,50,.09)');upper.addColorStop(1,'rgba(255,241,189,0)');
    context.fillStyle=upper;context.beginPath();context.arc(0,0,radius*.72,0,Math.PI*2);context.fill();context.restore();
    context.save();context.translate(cx+radius*.16-drift*.7,cy+radius*.24);context.scale(1,.16);
    const lower=context.createRadialGradient(0,0,0,0,0,radius*.66);
    lower.addColorStop(0,'rgba(159,220,244,.16)');lower.addColorStop(.42,'rgba(62,143,206,.065)');lower.addColorStop(1,'rgba(159,220,244,0)');
    context.fillStyle=lower;context.beginPath();context.arc(0,0,radius*.66,0,Math.PI*2);context.fill();context.restore();
    context.restore();
  }

  function drawGlobeGrid(time,alpha){
    if(alpha<.015)return;
    globeLatitudeLines.forEach(line=>depthLine(line.map(point=>globePoint(point,time)),alpha,'18,63,133'));
    globeLongitudeLines.forEach(line=>depthLine(line.map(point=>globePoint(point,time)),alpha*.9,'62,143,206'));
    for(const dot of globeDotField){
      const point=globePoint(dot.vector,time);
      const shimmer=.62+Math.sin(time*.0007+dot.phase)*.18;
      context.beginPath(); context.arc(point.x,point.y,.65+Math.max(0,point.z)*.45,0,Math.PI*2);
      context.fillStyle=rgba('18,63,133',alpha*(point.z>0?.3:.014)*shimmer); context.fill();
    }
  }

  function drawFlatGrid(time,alpha){
    if(alpha<.015)return;
    const left=width*.025,right=width*.975,top=height*.09,bottom=height*.94,rows=19,columns=34,samples=72;
    const orangeProgress=smooth(clamp((alpha-.08)/.92,0,1));
    for(let row=0;row<rows;row++){
      const ny=top/height+(row/(rows-1))*((bottom-top)/height),points=[];
      for(let i=0;i<=samples;i++){
        const nx=left/width+(i/samples)*((right-left)/width);
        points.push({x:nx*width,y:ny*height+wave(nx,ny,time)});
      }
      const rowColor=blendRgb([18,63,133],[241,90,67],orangeProgress*(.12+.7*row/(rows-1)));
      line(points,rgba(rowColor,alpha*(row%4===0?.26:.12)),row%4===0?.78:.48);
    }
    for(let column=0;column<columns;column++){
      const nx=left/width+(column/(columns-1))*((right-left)/width),points=[];
      for(let i=0;i<=42;i++){
        const ny=top/height+(i/42)*((bottom-top)/height);
        points.push({x:nx*width,y:ny*height+wave(nx,ny,time)});
      }
      const columnColor=blendRgb([62,143,206],[255,138,69],orangeProgress*(.08+.48*column/(columns-1)));
      line(points,rgba(columnColor,alpha*(column%5===0?.22:.09)),column%5===0?.7:.42);
    }
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      const nx=left/width+(column/(columns-1))*((right-left)/width);
      const ny=top/height+(row/(rows-1))*((bottom-top)/height);
      const distance=pointer.inside?Math.hypot(nx-pointer.x/width,(ny-pointer.y/height)*1.35):1;
      const near=Math.max(0,1-distance/.22);
      context.beginPath(); context.arc(nx*width,ny*height+wave(nx,ny,time),1.05+near*1.7,0,Math.PI*2);
      const dotColor=blendRgb([18,63,133],[255,106,53],orangeProgress*(.28+.62*ny));
      context.fillStyle=rgba(dotColor,alpha*(.2+near*.5)); context.fill();
    }
  }

  function roundedRect(x,y,w,h,r){
    context.beginPath();context.moveTo(x+r,y);context.arcTo(x+w,y,x+w,y+h,r);context.arcTo(x+w,y+h,x,y+h,r);context.arcTo(x,y+h,x,y,r);context.arcTo(x,y,x+w,y,r);context.closePath();
  }

  function drawHoverPreview(item){
    if(!item||hoverPreview<.02)return;
    const p=item.screen,scale=.9+hoverPreview*.1,boxW=218*scale,photoH=134*scale,labelH=64*scale;
    let x=p.x+20,y=p.y-photoH-labelH-16;
    if(x+boxW>width-20)x=p.x-boxW-20;
    if(y<82)y=p.y+20;
    x=clamp(x,18,width-boxW-18); y=clamp(y,78,height-photoH-labelH-18);
    previewLink.style.left=`${x}px`;previewLink.style.top=`${y}px`;previewLink.style.width=`${boxW}px`;previewLink.style.height=`${photoH+labelH}px`;
    previewLink.href=`city.html?story=${encodeURIComponent(item.city.toLowerCase().replace(/[^a-z]+/g,'-'))}`;
    previewLink.setAttribute('aria-label',`Open ${item.city} sound story`);previewLink.setAttribute('aria-hidden','false');previewLink.tabIndex=0;previewLink.classList.add('visible');
    context.save();context.globalAlpha=hoverPreview;context.shadowColor='rgba(46,41,31,.16)';context.shadowBlur=24;context.shadowOffsetY=9;
    roundedRect(x,y,boxW,photoH+labelH,2);context.fillStyle='rgba(255,241,189,.98)';context.fill();context.shadowColor='transparent';roundedRect(x,y,boxW,photoH,2);context.clip();
    if(sprite.complete&&sprite.naturalWidth){const cellW=sprite.naturalWidth/4,cellH=sprite.naturalHeight/3,col=item.sprite%4,row=Math.floor(item.sprite/4);context.drawImage(sprite,col*cellW,row*cellH,cellW,cellH,x,y,boxW,photoH)}
    else{context.fillStyle=item.profile.accent;context.fillRect(x,y,boxW,photoH)}
    context.restore();context.save();context.globalAlpha=hoverPreview;context.strokeStyle='rgba(97,91,76,.17)';roundedRect(x+.5,y+.5,boxW-1,photoH+labelH-1,2);context.stroke();
    context.fillStyle='#123f85';context.font=`600 ${12*scale}px 'Cormorant Garamond',Georgia,serif`;context.fillText(item.city.toUpperCase(),x+12*scale,y+photoH+19*scale);
    context.fillStyle='#315b87';context.font=`300 ${8.5*scale}px 'Helvetica Neue',Arial,sans-serif`;context.fillText(`RECORDED ${item.recorded}  ·  BY ${item.recorder.toUpperCase()}`,x+12*scale,y+photoH+38*scale);
    context.fillText(`${item.city.toUpperCase()}, ${item.country.toUpperCase()}`,x+12*scale,y+photoH+53*scale);context.restore();
  }

  function drawCoordinates(time){
    projected=coordinates.map(item=>({...item,screen:screenFor(item,time)}));
    projected.forEach(item=>{
      const p=item.screen;
      if(morph<.3&&p.z<-.12)return;
      const visibility=morph<.3?clamp((p.z+.14)*2.2,.2,1):1;
      const isHover=item.index===hovered?.index,isSelected=item.index===selected?.index;
      const size=(isHover||isSelected?9:6.4)*mix(.88,1,morph);
      const breath=Math.sin(time*.00135+item.index*1.71)*.5+.5;
      context.save();context.globalAlpha=visibility*(.1+breath*.13);
      context.beginPath();context.arc(p.x,p.y,size+7+breath*5,0,Math.PI*2);context.strokeStyle=item.profile.accent;context.lineWidth=.85;context.stroke();
      context.globalAlpha=visibility;
      context.beginPath();context.arc(p.x,p.y,size,0,Math.PI*2);context.fillStyle=item.profile.accent;context.fill();
      context.beginPath();context.arc(p.x,p.y,size+4,0,Math.PI*2);context.strokeStyle='rgba(244,240,234,.94)';context.lineWidth=3;context.stroke();
      if(isHover||isSelected){const pulse=16+(Math.sin(time*.003+item.index)*.5+.5)*7;context.beginPath();context.arc(p.x,p.y,pulse,0,Math.PI*2);context.strokeStyle=item.profile.accent+'88';context.lineWidth=1;context.stroke()}
      context.restore();
    });
    if(hovered){const fresh=projected.find(item=>item.index===hovered.index);if(fresh){hovered=fresh;drawHoverPreview(fresh)}}
    else if(hoverPreview<.04){previewLink.classList.remove('visible');previewLink.setAttribute('aria-hidden','true');previewLink.tabIndex=-1}
  }

  function draw(time=0){
    const delta=Math.min(40,time-lastTime||16.667);lastTime=time;
    if(pointer.inside){
      pointer.smoothX=damp(pointer.smoothX,pointer.x,13,delta);
      pointer.smoothY=damp(pointer.smoothY,pointer.y,13,delta);
      if(morph<.82){
        if(hovered){
          targetYaw=damp(targetYaw,yaw,10,delta);
          targetPitch=damp(targetPitch,pitch,10,delta);
        }else{
          const nx=clamp(pointer.smoothX/Math.max(1,width),0,1),ny=clamp(pointer.smoothY/Math.max(1,height),0,1);
          const horizontal=(nx-.5)*(1.04+.24*Math.abs(nx-.5)*2);
          const vertical=(.5-ny)*(1+.12*Math.abs(ny-.5)*2);
          targetYaw=horizontal*Math.PI*1.28;
          targetPitch=clamp(vertical*1.12,-.72,.72);
        }
      }
    }else if(targetMorph<.25&&!reducedMotion){
      targetYaw+=delta*.000024;
    }
    yaw=damp(yaw,targetYaw,4.8,delta);
    pitch=damp(pitch,targetPitch,4.8,delta);
    zoom=damp(zoom,targetZoom,5.1,delta);
    morph=damp(morph,targetMorph,5.4,delta);
    stage.style.setProperty('--morph',morph.toFixed(3));
    hoverPreview+=((hovered?1:0)-hoverPreview)*Math.min(1,delta*.012);
    context.clearRect(0,0,width,height);
    const clock=reducedMotion?0:time;
    const globeAlpha=1-smooth(morph);
    drawGlobeBody(globeAlpha);
    drawGlobeGrid(clock,globeAlpha);
    drawGlobeMist(clock,globeAlpha);
    drawGlobeFrame(globeAlpha);
    drawFlatGrid(clock,smooth(morph));
    drawCoordinates(clock);
    frame=requestAnimationFrame(draw);
  }

  function nearestCoordinate(x,y){
    const retained=hovered&&projected.find(item=>item.index===hovered.index);
    if(retained){
      const retainedDistance=Math.hypot(retained.screen.x-x,retained.screen.y-y);
      if(retainedDistance<mix(62,68,morph))return retained;
    }
    let best=null,distance=mix(44,49,morph);
    for(const item of projected){
      if(morph<.3&&item.screen.z<-.12)continue;
      const candidate=Math.hypot(item.screen.x-x,item.screen.y-y);
      if(candidate<distance){best=item;distance=candidate}
    }
    return best;
  }

  stage.addEventListener('pointermove',event=>{
    if(event.target.closest('.coordinate-preview-link')){pointer.inside=true;return}
    if(event.target.closest('.coordinate-card,.site-header,.explore-question')){hovered=null;lastHoverIndex=-1;return}
    const rect=stage.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;
    if(!pointer.initialized){pointer.smoothX=pointer.x;pointer.smoothY=pointer.y;pointer.initialized=true}
    pointer.inside=true;
    const next=nearestCoordinate(pointer.x,pointer.y);
    if(next?.index!==lastHoverIndex){hoverPreview=0;lastHoverIndex=next?.index??-1}
    hovered=next;
  });
  stage.addEventListener('pointerleave',()=>{pointer.inside=false;pointer.initialized=false;hovered=null;lastHoverIndex=-1});
  stage.addEventListener('wheel',event=>{
    event.preventDefault();
    targetMorph=clamp(targetMorph+event.deltaY*.00085,0,1);
    targetZoom=1.06-targetMorph*.08;
  },{passive:false});
  stage.addEventListener('click',event=>{
    if(event.target.closest('.coordinate-card,.site-header,.coordinate-preview-link,.explore-question'))return;
    const item=hovered||coordinates.find(entry=>entry.index===lastHoverIndex);
    if(item)location.href=`city.html?story=${encodeURIComponent(item.city.toLowerCase().replace(/[^a-z]+/g,'-'))}`;
  });

  function buildWave(item){
    const waveElement=document.querySelector('#coordinateWave');waveElement.innerHTML='';
    for(let i=0;i<52;i++){const bar=document.createElement('i'),value=5+Math.abs(Math.sin(i*.31+item.frequency*.008)*Math.cos(i*.13+item.index))*31;bar.style.setProperty('--h',`${value}px`);bar.style.setProperty('--o',.28+(i%8)/14);bar.style.setProperty('--c',i%9===0?item.profile.accent:'#8fa0a1');waveElement.appendChild(bar)}
  }
  function stopSources(){activeSources.forEach(source=>{try{source.stop()}catch(_){}});activeSources=[]}
  const soundScenes=[
    {wave:'sine',base:262,harmonic:2.01,sparkle:.22,cutoff:6200,delay:.16,feedback:.12,attack:.012,notes:[[0,0,.42],[4,.4,.42],[7,.8,.5],[11,1.3,.42],[7,1.76,.42],[4,2.2,.52],[2,3.05,.42],[7,3.48,.42],[9,4.15,.52],[12,5.45,1.3]]},
    {wave:'sine',base:392,harmonic:2.72,sparkle:.09,cutoff:7600,delay:.34,feedback:.22,attack:.008,notes:[[12,0,.22,.7,-.7],[7,.36,.28,.65,.45],[4,.92,.34,.78,-.2],[0,1.55,.78,.55,.65],[-3,2.62,.34,.7,-.55],[2,3.2,.26,.6,.15],[-5,4.05,.9,.52,.6],[-8,5.45,1.35,.55,-.3]]},
    {wave:'triangle',base:196,harmonic:1.5,sparkle:.05,cutoff:1900,delay:.075,feedback:.06,attack:.006,notes:[[0,0,.18],[7,.24,.15],[3,.72,.2],[10,1.08,.16],[5,1.88,.22],[-2,2.17,.16],[7,3.04,.2],[0,3.32,.18],[8,4.28,.19],[3,5.15,.2],[10,5.48,.55]]},
    {wave:'sine',base:147,harmonic:1.5,sparkle:.035,cutoff:1350,delay:.48,feedback:.27,attack:.24,notes:[[0,0,2.05,.72,-.55,2],[7,0,2.15,.32,.55,-2],[5,2.05,2.1,.66,.45,2],[-2,2.05,2.2,.28,-.45,3],[2,4.2,2.55,.7,-.25,5],[9,4.2,2.45,.25,.5,-2]]},
    {wave:'sine',base:523,harmonic:3.02,sparkle:.17,cutoff:8200,delay:.11,feedback:.12,attack:.004,notes:[[0,0,.13,.65,-.7],[4,.11,.1,.5,-.45],[7,.24,.2,.72,-.2],[12,1.12,.12,.7,.6],[9,1.26,.1,.55,.35],[5,1.42,.19,.7,.1],[2,2.5,.13,.65,-.55],[7,2.64,.11,.58,-.3],[14,2.8,.25,.76,.1],[9,4.15,.12,.62,.55],[16,4.29,.2,.72,.75],[12,5.55,.6,.6,0]]},
    {wave:'triangle',base:110,harmonic:2.01,sparkle:.025,cutoff:920,delay:.42,feedback:.25,attack:.12,notes:[[0,0,1.55,.65,-.45],[-3,1.18,1.48,.58,.35],[-7,2.5,1.65,.62,-.2],[-2,3.95,1.55,.55,.45],[-10,5.25,1.6,.65,0]]},
    {wave:'square',base:220,harmonic:2,sparkle:.025,cutoff:1250,delay:.09,feedback:.08,attack:.004,notes:[[0,0,.12,.48,-.65],[7,.18,.1,.42,-.35],[3,.58,.16,.52,.15],[10,.82,.12,.46,.55],[5,1.38,.14,.5,-.5],[0,1.58,.12,.4,-.2],[8,2.28,.18,.55,.4],[3,2.72,.12,.42,.7],[12,3.5,.16,.52,-.55],[7,3.72,.12,.45,-.25],[10,4.54,.17,.55,.35],[15,5.34,.5,.5,0]]},
    {wave:'sawtooth',base:262,harmonic:1.5,sparkle:.035,cutoff:2600,delay:.19,feedback:.16,attack:.025,notes:[[0,0,.35,.35,-.6],[4,.48,.34,.4,-.3],[7,.96,.36,.42,0],[12,1.46,.46,.48,.3],[9,2.12,.3,.36,.6],[14,2.58,.42,.46,.25],[16,3.18,.45,.5,-.15],[19,3.82,.5,.5,-.5],[12,4.55,.34,.42,.2],[21,5.28,1.25,.52,0]]}
  ];
  function playCoordinate(item){
    audioContext||=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();stopSources();
    const now=audioContext.currentTime,scene=soundScenes[item.index%soundScenes.length],master=audioContext.createGain(),filter=audioContext.createBiquadFilter(),delay=audioContext.createDelay(),feedback=audioContext.createGain();
    master.gain.value=.72;filter.type='lowpass';filter.frequency.value=scene.cutoff;filter.Q.value=.55;delay.delayTime.value=scene.delay;feedback.gain.value=scene.feedback;master.connect(filter);filter.connect(audioContext.destination);filter.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(audioContext.destination);
    const transposition=(item.index%3-1)*2,base=scene.base*Math.pow(2,transposition/12);
    scene.notes.forEach(([semitones,offset,duration,level=1,pan=0,slide=0])=>{
      const start=now+.05+offset,frequency=base*Math.pow(2,semitones/12),tone=audioContext.createOscillator(),toneGain=audioContext.createGain(),partial=audioContext.createOscillator(),partialGain=audioContext.createGain(),panner=audioContext.createStereoPanner?audioContext.createStereoPanner():null;
      tone.type=scene.wave;tone.frequency.setValueAtTime(frequency,start);if(slide)tone.frequency.exponentialRampToValueAtTime(frequency*Math.pow(2,slide/12),start+duration*.85);
      partial.type='sine';partial.frequency.setValueAtTime(frequency*scene.harmonic,start);
      toneGain.gain.setValueAtTime(.0001,start);toneGain.gain.exponentialRampToValueAtTime(.062*level,start+scene.attack);toneGain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      partialGain.gain.setValueAtTime(.0001,start);partialGain.gain.exponentialRampToValueAtTime(.062*level*scene.sparkle,start+Math.min(.018,scene.attack));partialGain.gain.exponentialRampToValueAtTime(.0001,start+duration*.6);
      tone.connect(toneGain);partial.connect(partialGain);if(panner){toneGain.connect(panner);partialGain.connect(panner);panner.pan.value=pan;panner.connect(master)}else{toneGain.connect(master);partialGain.connect(master)}
      tone.start(start);partial.start(start);tone.stop(start+duration+.03);partial.stop(start+duration+.03);activeSources.push(tone,partial);
    });
  }
  function selectCoordinate(item){
    selected=item;document.querySelector('#coordinatePlace').textContent=`${item.city} · ${item.country}`;document.querySelector('#coordinateTitle').textContent=item.profile.title;document.querySelector('#coordinateCopy').textContent=item.profile.copy;buildWave(item);card.classList.add('open');card.setAttribute('aria-hidden','false');playCoordinate(item);
  }

  document.querySelector('#exploreQuestion').addEventListener('submit',event=>{
    event.preventDefault();const input=document.querySelector('#placeSearch'),query=input.value.trim().toLowerCase();
    const item=coordinates.find(entry=>entry.city.toLowerCase().includes(query)||entry.country.toLowerCase().includes(query));const hint=document.querySelector('#searchHint');
    if(!query||!item){hint.textContent=query?'No coordinate found — try another city':'Explore 56 sound coordinates';return}
    targetYaw=-toRadians(item.lon);targetPitch=clamp(toRadians(-item.lat),-1.18,1.18);selectCoordinate(item);hint.textContent=`${item.city} · ${item.profile.title}`;input.blur();
  });
  document.querySelector('#coordinateReplay').addEventListener('click',()=>selected&&playCoordinate(selected));
  document.querySelector('#coordinateClose').addEventListener('click',()=>{selected=null;card.classList.remove('open');card.setAttribute('aria-hidden','true');stopSources()});

  const cursor=document.querySelector('#melotripCursor');
  if(cursor&&matchMedia('(pointer:fine)').matches){
    document.addEventListener('pointermove',event=>{cursor.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0)`;cursor.classList.add('visible');cursor.classList.toggle('over-coordinate',Boolean(hovered||event.target.closest('.coordinate-preview-link')));cursor.classList.toggle('over-action',Boolean(event.target.closest('a,button,input,.coordinate-card')))},{passive:true});
    document.addEventListener('pointerleave',()=>cursor.classList.remove('visible'));
  }
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);stopSources()}else draw(performance.now())});
  resize();draw();
})();
