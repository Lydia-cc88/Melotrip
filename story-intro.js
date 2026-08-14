(() => {
  const hero=document.querySelector('#storyParticleHero');
  const canvas=document.querySelector('#storyParticleCanvas');
  const button=document.querySelector('#storyTapButton');
  const content=document.querySelector('#soundStoriesContent');
  if(!hero||!canvas||!button||!content)return;

  const context=canvas.getContext('2d',{alpha:true});
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette=['#064cff','#123f85','#3e8fce','#9fdcf4','#f4ff00','#fff200','#d7ef76'];
  let width=0,height=0,dpr=1,points=[],playing=false,gatherStarted=0,frame=0,lastTime=0,visible=true,audioContext=null,audioNodes=[];

  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function snapPolar(angle,radius,angleSteps=24,radiusStep=20){
    const step=Math.PI*2/angleSteps;
    return{angle:Math.floor(angle/step)*step,radius:Math.floor(radius/radiusStep)*radiusStep};
  }
  function buildPoints(){
    const count=Math.round(clamp(width*height/1200,700,1200));
    const maxRadius=Math.min(380,Math.min(width,height)*.39),minRadius=Math.min(80,maxRadius*.24),radiusStep=Math.max(12,maxRadius/16);
    points=Array.from({length:count},()=>{
      const sx=Math.random()*width,sy=Math.random()*height,angle=Math.random()*Math.PI*2;
      const radius=minRadius+Math.pow(Math.random(),1.5)*(maxRadius-minRadius),snapped=snapPolar(angle,radius,24,radiusStep);
      return{sx,sy,cx:sx,cy:sy,tx:width/2+Math.cos(snapped.angle)*snapped.radius,ty:height/2+Math.sin(snapped.angle)*snapped.radius,color:palette[Math.floor(Math.random()*palette.length)],speed:.02+Math.random()*.03,delay:Math.random()*1.5,done:false,driftX:(Math.random()-.5)*.34,driftY:(Math.random()-.5)*.34};
    });
  }
  function resize(){
    const rect=hero.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
    context.setTransform(dpr,0,0,dpr,0,0);buildPoints();if(playing)gatherStarted=performance.now();
  }
  function drawGuides(progress){
    const maxRadius=Math.min(380,Math.min(width,height)*.39),step=Math.max(20,maxRadius/15);
    context.save();context.strokeStyle=`rgba(143,45,55,${.09*progress})`;context.lineWidth=1;
    for(let radius=Math.min(80,maxRadius*.24);radius<=maxRadius;radius+=step){context.beginPath();context.arc(width/2,height/2,radius,0,Math.PI*2);context.stroke()}
    context.restore();
  }
  function render(time){
    frame=requestAnimationFrame(render);if(!visible)return;
    const delta=Math.min(32,time-lastTime||16);lastTime=time;
    context.fillStyle=playing?'rgba(255,241,189,.2)':'rgba(255,248,223,.28)';context.fillRect(0,0,width,height);
    const elapsed=playing?(time-gatherStarted)/1000:0;
    if(playing)drawGuides(Math.min(1,elapsed/1.8));
    for(const point of points){
      if(!playing){
        if(!reducedMotion){point.cx+=point.driftX*delta*.08+(Math.random()-.5)*.5;point.cy+=point.driftY*delta*.08+(Math.random()-.5)*.5}
        if(point.cx<0)point.cx=width;if(point.cx>width)point.cx=0;if(point.cy<0)point.cy=height;if(point.cy>height)point.cy=0;
      }else if(reducedMotion){point.cx=point.tx;point.cy=point.ty;
      }else if(elapsed>point.delay){
        const amount=Math.min(1,(elapsed-point.delay)*point.speed*10),eased=1-Math.pow(1-amount,5);
        point.cx=point.sx+(point.tx-point.sx)*eased;point.cy=point.sy+(point.ty-point.sy)*eased;
        if(eased>=.999&&!point.done){point.done=true;point.sx=point.cx;point.sy=point.cy}
        if(point.done){const angle=Math.atan2(point.cy-height/2,point.cx-width/2),radius=Math.hypot(point.cx-width/2,point.cy-height/2),spin=.0019*delta/16;point.cx=width/2+Math.cos(angle+spin)*radius;point.cy=height/2+Math.sin(angle+spin)*radius;point.sx=point.cx;point.sy=point.cy}
      }else{point.cx+=(Math.random()-.5)*2.4;point.cy+=(Math.random()-.5)*2.4}
      context.fillStyle=point.color;context.fillRect(point.cx-2,point.cy-2,4,4);
    }
  }

  function stopAudio(){audioNodes.forEach(node=>{try{node.stop()}catch(_){}});audioNodes=[]}
  function tone(frequency,start,duration,type='sine',volume=.05){
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
    oscillator.type=type;oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.001,now+start);gain.gain.exponentialRampToValueAtTime(volume,now+start+.018);gain.gain.exponentialRampToValueAtTime(.001,now+start+duration);
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now+start);oscillator.stop(now+start+duration+.03);audioNodes.push(oscillator);
  }
  function playGatheringSequence(){
    audioContext||=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});stopAudio();
    for(let index=0;index<30;index++)tone(200+Math.random()*800,Math.random()*2,.1,'sine',.025);
    [261.63,329.63,392,523.25,659.25].forEach((frequency,index)=>tone(frequency,2+index*.1,3,'triangle',.055));tone(130.81,2,4,'sine',.06);
  }
  function start(){
    if(playing)return;playing=true;gatherStarted=performance.now();button.classList.add('playing');button.setAttribute('aria-pressed','true');playGatheringSequence();
    setTimeout(()=>content.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'start'}),reducedMotion?500:3500);
  }

  button.addEventListener('click',start);
  addEventListener('resize',resize,{passive:true});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting},{threshold:0});observer.observe(hero);
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden&&hero.getBoundingClientRect().bottom>0;if(document.hidden)stopAudio()});
  resize();frame=requestAnimationFrame(render);
})();
