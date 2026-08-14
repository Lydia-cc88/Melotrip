(() => {
  const canvas = document.querySelector('#placeCanvas');
  const context = canvas.getContext('2d', { alpha: true });
  const intro = document.querySelector('#intro');
  const progressCircle = document.querySelector('#progressCircle');
  const skipButton = document.querySelector('#skipIntro');
  const soundButton = document.querySelector('#soundIntro');
  const places = ['TOKYO','SINGAPORE','LONDON','NEW YORK','CAPE TOWN','REYKJAVIK','PARIS','BERLIN','LISBON','MADRID','ROME','ATHENS','ISTANBUL','CAIRO','MARRAKECH','NAIROBI','ACCRA','LAGOS','JOHANNESBURG','DUBAI','MUMBAI','DELHI','BANGKOK','HANOI','SEOUL','BEIJING','SHANGHAI','HONG KONG','TAIPEI','MANILA','JAKARTA','SYDNEY','MELBOURNE','AUCKLAND','HONOLULU','VANCOUVER','SEATTLE','SAN FRANCISCO','LOS ANGELES','MEXICO CITY','HAVANA','BOGOTA','LIMA','SANTIAGO','BUENOS AIRES','SAO PAULO','RIO DE JANEIRO','MONTREAL','TORONTO','CHICAGO','NEW ORLEANS','OSLO','STOCKHOLM','HELSINKI','COPENHAGEN','KYOTO','EDINBURGH','BRISTOL','BRUSSELS','AMSTERDAM','PRAGUE','VIENNA','BUDAPEST','WARSAW','TALLINN','RIGA','VILNIUS','ZURICH','GENEVA','VENICE','NAPLES','PALERMO','VALLETTA','TUNIS','DAKAR','ADDIS ABABA','KAMPALA','KIGALI','ZANZIBAR','MUSCAT','TEHRAN','KARACHI','KATHMANDU','COLOMBO','PHNOM PENH','KUALA LUMPUR','OSAKA','SAPPORO','BUSAN','GUANGZHOU','CHENGDU','ULAANBAATAR','PERTH','BRISBANE','WELLINGTON','ANCHORAGE','PORTLAND','AUSTIN','MIAMI','QUEBEC CITY'];
  const scale = [261.63,293.66,329.63,349.23,392,440,493.88,523.25];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 3000 : 12500;
  let width=0,height=0,dpr=1,start=performance.now(),last=start,frame=0,finished=false;
  let soundEnabled=true,audioContext=null,lastNote=0,lastSequence=0,sequenceIndex=0,particles=[];
  const pointer={x:0,y:0,active:false,down:false};
  const seeded=(index,salt=0)=>{const value=Math.sin(index*127.1+salt*311.7)*43758.5453;return value-Math.floor(value)};

  function createParticles(){
    const count=width<650?64:108;
    particles=Array.from({length:count},(_,index)=>{
      const font=7.5+seeded(index,2)*4.5,text=places[index%places.length];
      context.font=`300 ${font}px 'Cormorant Garamond',Georgia,serif`;
      const measured=context.measureText(text).width,startsInside=index<count*.48;
      return {text,index,font,w:measured,r:Math.max(6,Math.min(20,measured*.23)),x:width*(.045+seeded(index,3)*.91),y:startsInside?height*(.03+seeded(index,4)*.72):-height*(.04+seeded(index,4)*.66),vx:(seeded(index,5)-.5)*.3,vy:.03+seeded(index,6)*.12,angle:(seeded(index,7)-.5)*1.3,spin:(seeded(index,8)-.5)*.006,alpha:.4+seeded(index,9)*.48,lastBounce:0};
    });
  }
  function resize(){const rect=intro.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;context.setTransform(dpr,0,0,dpr,0,0);createParticles()}
  function ensureAudio(){
    if(!audioContext){try{audioContext=new(window.AudioContext||window.webkitAudioContext)()}catch(_){return}}
    audioContext.resume?.();
  }
  function playNote(index,velocity=.5){
    if(!soundEnabled)return;ensureAudio();if(!audioContext||audioContext.state!=='running')return;
    const now=audioContext.currentTime;if(now-lastNote<.09)return;lastNote=now;
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),frequency=scale[index%scale.length]*(index%7===6?2:1);
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,now);gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.018+Math.min(.035,velocity*.02),now+.015);gain.gain.exponentialRampToValueAtTime(.001,now+.48);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.5);
  }
  function setSound(enabled){soundEnabled=enabled;soundButton.classList.toggle('enabled',enabled);soundButton.textContent=enabled?'Sound on ●':'Sound off ◐';soundButton.setAttribute('aria-pressed',String(enabled));if(enabled){ensureAudio();playNote(sequenceIndex++,1)}}
  function solveParticleCollisions(){
    for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
      const a=particles[i],b=particles[j],dx=b.x-a.x,dy=b.y-a.y,min=a.r+b.r,distanceSq=dx*dx+dy*dy;if(distanceSq<=0||distanceSq>=min*min)continue;
      const distance=Math.sqrt(distanceSq),nx=dx/distance,ny=dy/distance,overlap=(min-distance)*.5;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
      const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(relative<0){const impulse=-relative*.38;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse}
    }
  }
  function physics(dt,progress,now){
    const step=Math.min(2.2,dt/16.67),gravity=progress<.72?.013:.018,floor=height-30;
    for(const p of particles){
      p.vy+=gravity*step;p.vx*=.998;p.vy*=.999;p.x+=p.vx*step;p.y+=p.vy*step;p.angle+=p.spin*step;
      if(pointer.active){const dx=p.x-pointer.x,dy=p.y-pointer.y,distance=Math.hypot(dx,dy);if(distance<120&&distance>1){const force=(1-distance/120)*(pointer.down?.16:.045);p.vx+=dx/distance*force*step;p.vy+=dy/distance*force*step;p.spin+=dx*.000002}}
      if(p.x<p.r){p.x=p.r;p.vx=Math.abs(p.vx)*.5}if(p.x>width-p.r){p.x=width-p.r;p.vx=-Math.abs(p.vx)*.5}
      if(p.y>floor-p.r){const impact=Math.abs(p.vy);p.y=floor-p.r;p.vy=-impact*.34;p.vx*=.88;if(impact>.42)playNote(p.index,impact)}
      const beatInterval=520+(p.index%4)*18;if(soundEnabled&&p.y>floor-p.r-2&&now-p.lastBounce>beatInterval){p.lastBounce=now;p.vy=-.32-seeded(p.index,12)*.3;p.spin+=(seeded(p.index,13)-.5)*.004}
    }
    solveParticleCollisions();
  }
  function draw(progress){
    context.clearRect(0,0,width,height);const fade=progress>.88?Math.max(0,1-(progress-.88)/.1):1;
    for(const p of particles){if(p.y<-50||p.y>height+50)continue;context.save();context.translate(p.x,p.y);context.rotate(p.angle);context.globalAlpha=p.alpha*fade;context.font=`300 ${p.font}px 'Cormorant Garamond',Georgia,serif`;context.fillStyle=p.text.length%5===0?'#fff6a0':'#f4ec32';context.textAlign='center';context.textBaseline='middle';context.fillText(p.text,0,0);context.restore()}context.globalAlpha=1;
  }
  function loop(now){
    const progress=Math.min(1,(now-start)/duration),dt=now-last;last=now;progressCircle.style.strokeDashoffset=56.55*(1-progress);
    if(soundEnabled&&now-lastSequence>560){lastSequence=now;playNote(sequenceIndex++,.48)}
    physics(dt,progress,now);draw(progress);if(progress>=1){finish();return}frame=requestAnimationFrame(loop);
  }
  function finish(){if(finished)return;finished=true;sessionStorage.setItem('melotripIntroSeen','1');cancelAnimationFrame(frame);document.body.classList.add('leaving');setTimeout(()=>location.replace('explore.html'),880)}
  intro.addEventListener('pointermove',event=>{const rect=intro.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.active=true});
  intro.addEventListener('pointerleave',()=>{pointer.active=false;pointer.down=false});
  intro.addEventListener('pointerdown',event=>{pointer.down=true;ensureAudio();if(soundEnabled)playNote(sequenceIndex++,1);for(let i=0;i<particles.length;i+=8){const p=particles[i],dx=p.x-event.clientX,dy=p.y-event.clientY,d=Math.hypot(dx,dy)||1;if(d<220){p.vx+=dx/d*.45;p.vy+=dy/d*.45}}});
  intro.addEventListener('pointerup',()=>pointer.down=false);soundButton.addEventListener('click',event=>{event.stopPropagation();setSound(!soundEnabled)});skipButton.addEventListener('click',finish);addEventListener('resize',resize,{passive:true});
  resize();setSound(true);frame=requestAnimationFrame(loop);
})();
