(() => {
  const cards = [...document.querySelectorAll('.sound-card[data-pattern]')];
  if (!cards.length) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let audioContext = null;
  let activeNodes = [];

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function snap(angle, radius, angleSteps=24, radiusStep=15) {
    const angleStep=Math.PI*2/angleSteps;
    return { a:Math.floor(angle/angleStep)*angleStep, r:Math.floor(radius/radiusStep)*radiusStep };
  }
  function pixelsFor(type,color,index,count=300,maxR=100) {
    const random=seeded(3801+index*1709),points=[];
    for(let i=0;i<count;i++){
      let a=0,r=0,grid=[24,15];
      switch(type){
        case 'tokyo': {
          const notes=[0,Math.PI*.4,Math.PI*.8,Math.PI*1.2,Math.PI*1.6];
          a=notes[i%notes.length]+(random()-.5)*.3;r=30+random()*(maxR-30);grid=[36,12];break;
        }
        case 'kyoto': a=random()*Math.PI*2;r=maxR*Math.abs(Math.sin(i/count*Math.PI*3))*.8+15;grid=[24,16];break;
        case 'seville': a=random()*Math.PI*2;r=maxR*.6+Math.sin(a*10)*35+random()*15;grid=[48,8];break;
        case 'florence': a=i/count*Math.PI*2;r=maxR*.8*Math.abs(Math.sin(a*1.5))+15;grid=[60,10];break;
        case 'london': a=random()*Math.PI*2;r=maxR*.4+Math.cos(a*8)*40+random()*10;grid=[32,10];break;
        case 'paris': {const t=i/count;a=t*Math.PI*10;r=t*maxR;grid=[36,12];break;}
        case 'istanbul': {const rings=[.25,.5,.75,1];a=random()*Math.PI*2;r=maxR*rings[Math.floor(random()*rings.length)]+random()*15-7.5;grid=[64,5];break;}
        case 'rio': a=random()*Math.PI*2;r=20+Math.pow(Math.sin(a*5),6)*(maxR-20)+random()*20;grid=[40,10];break;
      }
      const point=snap(a,Math.max(8,r),grid[0],grid[1]);points.push({...point,color});
    }
    return points;
  }

  function stopAudio() {
    activeNodes.forEach(node=>{try{node.stop()}catch(_){}});activeNodes=[];
  }
  function note(master,frequency,start,duration,type='sine',volume=.06,slide=null) {
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),sparkle=audioContext.createOscillator(),sparkleGain=audioContext.createGain(),now=audioContext.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(frequency,now+start);
    if(slide)osc.frequency.exponentialRampToValueAtTime(slide,now+start+duration*.8);
    gain.gain.setValueAtTime(.001,now+start);gain.gain.exponentialRampToValueAtTime(volume,now+start+.025);gain.gain.exponentialRampToValueAtTime(.001,now+start+duration);
    sparkle.type='sine';sparkle.frequency.setValueAtTime(frequency*2.01,now+start);sparkleGain.gain.setValueAtTime(.001,now+start);sparkleGain.gain.exponentialRampToValueAtTime(volume*.2,now+start+.014);sparkleGain.gain.exponentialRampToValueAtTime(.001,now+start+duration*.62);
    osc.connect(gain);gain.connect(master);sparkle.connect(sparkleGain);sparkleGain.connect(master);osc.start(now+start);sparkle.start(now+start);osc.stop(now+start+duration+.02);sparkle.stop(now+start+duration+.02);activeNodes.push(osc,sparkle);
  }
  function playMotif(type) {
    audioContext||=new (window.AudioContext||window.webkitAudioContext)();
    audioContext.resume().catch(()=>{});stopAudio();
    const motifs={
      tokyo:{delay:.16,feedback:.12,notes:[[659,0,.35],[784,.38,.35],[988,.78,.48],[880,1.35,.32],[784,1.72,.32],[659,2.1,.48],[587,3.02,.34],[784,3.38,.36],[880,4.16,.46],[988,5.42,1.3]]},
      kyoto:{delay:.44,feedback:.24,notes:[[440,0,1.2,'sine',.045],[523,1.18,1.1,'sine',.04],[392,2.52,1.35,'sine',.044],[659,4.18,.7,'sine',.038],[523,5.35,1.45,'sine',.043]]},
      seville:{delay:.08,feedback:.06,notes:[[330,0,.16,'triangle'],[392,.2,.13,'triangle'],[440,.62,.2,'triangle'],[523,.9,.14,'triangle'],[392,1.5,.18,'triangle'],[466,2.08,.14,'triangle'],[330,2.32,.12,'triangle'],[523,3.28,.2,'triangle'],[440,4.12,.15,'triangle'],[587,5.2,.62,'triangle']]},
      florence:{delay:.3,feedback:.18,notes:[[349,0,.9],[440,.64,.9],[523,1.3,1],[659,2.12,.8],[523,3.02,.92],[440,3.86,.82],[494,4.58,.75],[698,5.42,1.28]]},
      london:{delay:.36,feedback:.21,notes:[[294,0,1.05,'triangle',.045],[220,.82,1.12,'triangle',.042],[370,1.86,.82,'triangle',.046],[330,2.82,1.1,'triangle',.04],[196,4.1,1.3,'triangle',.05],[294,5.42,1.25,'triangle',.045]]},
      paris:{delay:.25,feedback:.18,notes:[[330,0,.42],[415,.3,.42],[494,.62,.66],[370,1.72,.42],[466,2.02,.42],[554,2.34,.66],[415,3.48,.42],[494,3.78,.42],[622,4.1,.7],[659,5.42,1.3]]},
      istanbul:{delay:.2,feedback:.16,notes:[[330,0,.22],[349,.23,.18],[415,.46,.34],[392,1.08,.2],[440,1.28,.18],[494,1.5,.42],[415,2.42,.22],[466,2.66,.18],[554,2.88,.5],[494,4.05,.35],[659,5.25,1.35]]},
      rio:{delay:.1,feedback:.08,notes:[[294,0,.12,'triangle'],[392,.16,.1,'triangle'],[494,.31,.16,'triangle'],[330,.72,.12,'triangle'],[440,.86,.1,'triangle'],[587,1.02,.2,'triangle'],[392,1.7,.12,'triangle'],[523,1.86,.16,'triangle'],[659,2.5,.18,'triangle'],[494,3.2,.13,'triangle'],[587,3.38,.16,'triangle'],[784,4.18,.2,'triangle'],[659,5.28,.68,'triangle']]}
    };
    const motif=motifs[type],master=audioContext.createGain(),delay=audioContext.createDelay(),feedback=audioContext.createGain();master.gain.value=.72;delay.delayTime.value=motif.delay;feedback.gain.value=motif.feedback;master.connect(audioContext.destination);master.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(audioContext.destination);
    motif.notes.forEach(item=>note(master,item[0],item[1],item[2],item[3]||'sine',item[4]||.055,item[5]||null));
  }

  const instances=cards.map((card,index)=>{
    const canvas=card.querySelector('.pixel-motif'),ctx=canvas.getContext('2d'),type=card.dataset.pattern,color=card.dataset.color;
    canvas.width=300;canvas.height=300;
    const instance={card,canvas,ctx,type,color,pixels:pixelsFor(type,color,index),hovered:false,playhead:-Math.PI/2,hoverEase:0};
    card.addEventListener('pointerenter',()=>{instance.hovered=true;playMotif(type)});
    card.addEventListener('pointerleave',()=>{instance.hovered=false;stopAudio()});
    card.querySelector('.motif-audio').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();playMotif(type)});
    return instance;
  });

  function draw(instance,delta) {
    const {ctx,pixels}=instance,cx=150,cy=150;
    instance.hoverEase+=((instance.hovered?1:0)-instance.hoverEase)*Math.min(1,delta*.012);
    if(instance.hovered&&!reducedMotion){instance.playhead+=delta*.003;if(instance.playhead>Math.PI*1.5)instance.playhead-=Math.PI*2}
    ctx.clearRect(0,0,300,300);ctx.strokeStyle='rgba(143,45,55,.085)';ctx.lineWidth=1;
    for(let radius=30;radius<=120;radius+=30){ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke()}
    ctx.setLineDash([2,4]);
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(angle)*130,cy+Math.sin(angle)*130);ctx.stroke()}
    ctx.setLineDash([]);
    if(instance.hoverEase>.02){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(instance.playhead)*130,cy+Math.sin(instance.playhead)*130);ctx.strokeStyle=`rgba(241,90,67,${.24*instance.hoverEase})`;ctx.lineWidth=2;ctx.stroke()}
    pixels.forEach(point=>{
      const px=cx+Math.cos(point.a)*point.r,py=cy+Math.sin(point.a)*point.r;
      const normA=point.a<-Math.PI/2?point.a+Math.PI*2:point.a,diff=Math.abs(normA-instance.playhead);
      const active=instance.hoverEase>.08&&(diff<.2||diff>Math.PI*2-.2),size=active?7:5;
      ctx.fillStyle=active?'#521f31':point.color;ctx.fillRect(px-size/2,py-size/2,size,size);
    });
  }
  let last=performance.now();
  function animate(time){const delta=Math.min(32,time-last);last=time;instances.forEach(instance=>draw(instance,delta));requestAnimationFrame(animate)}
  requestAnimationFrame(animate);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio()});
})();
