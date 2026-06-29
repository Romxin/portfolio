// ── Triple-A Snake ────────────────────────────────────────────
function cmdSnake() {
  const output    = document.getElementById('output');
  const inputLine = document.getElementById('input-line');
  const termBody  = document.getElementById('term-body');

  const COLS=24,ROWS=18,CELL=24,BW=24*24,BH=18*24,SP=132,P=10;
  const CW=P+BW+P+SP+P, CH=P+BH+P, BX=P, BY=P;

  let snake=[],dir={x:1,y:0},nextDir={x:1,y:0};
  let food=null,bonus=null,bonusMs=0;
  let parts=[],popups=[];
  let score=0,level=1,eaten=0,combo=0,lastEatTs=0;
  let flashMs=0,shakeMag=0;
  let state='start',elapsed=0,lastNow=0,rafId;
  let hs=parseInt(localStorage.getItem('shu-snake-hs')||'0');
  let pulse=0;

  function spd(){ return Math.max(60,165-(level-1)*13); }

  inputLine.style.display='none';
  const wrap=document.createElement('div'); wrap.className='tetris-wrap';
  output.appendChild(wrap);
  const canvas=document.createElement('canvas');
  canvas.width=CW; canvas.height=CH; canvas.className='tetris-canvas';
  wrap.appendChild(canvas);
  const hint=document.createElement('div'); hint.className='tetris-hint';
  hint.textContent='← → ↑ ↓ / WASD : Diriger  ·  ESPACE : Start  ·  P : Pause  ·  R : Rejouer  ·  ESC : Quitter';
  wrap.appendChild(hint);
  const ctx=canvas.getContext('2d');

  function reset(){
    const sx=Math.floor(COLS/2),sy=Math.floor(ROWS/2);
    snake=[{x:sx,y:sy},{x:sx-1,y:sy},{x:sx-2,y:sy}];
    dir={x:1,y:0}; nextDir={x:1,y:0};
    food=randFood(); bonus=null; bonusMs=0;
    parts=[]; popups=[];
    score=0; level=1; eaten=0; combo=0; lastEatTs=0;
    elapsed=0; pulse=0; flashMs=0; shakeMag=0;
  }

  function randFood(ex){
    let f; const e=ex||[];
    do { f={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}; }
    while(snake.some(s=>s.x===f.x&&s.y===f.y)||e.some(v=>v&&v.x===f.x&&v.y===f.y));
    return f;
  }

  function spawnParts(gx,gy,col,n){
    n=n||14;
    for(let i=0;i<n;i++){
      const a=(Math.PI*2*i)/n+Math.random()*.5, sp=1.8+Math.random()*3.5;
      parts.push({x:BX+gx*CELL+CELL/2,y:BY+gy*CELL+CELL/2,
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,
        decay:.03+Math.random()*.04,r:2+Math.random()*4,col:col});
    }
  }

  function spawnPopup(gx,gy,text,col){
    popups.push({x:BX+gx*CELL+CELL/2,y:BY+gy*CELL,text:text,col:col,life:1,vy:-1.2});
  }

  function step(now){
    dir=nextDir;
    var hx=snake[0].x+dir.x, hy=snake[0].y+dir.y;
    if(hx<0||hx>=COLS||hy<0||hy>=ROWS||snake.some(function(s){return s.x===hx&&s.y===hy;}))
      return gameOver();
    snake.unshift({x:hx,y:hy});
    var grew=false;
    if(hx===food.x&&hy===food.y){
      grew=true;
      var gap=lastEatTs?now-lastEatTs:9999;
      combo=gap<3500?combo+1:1;
      var pts=10*combo*level; score+=pts; eaten++;
      if(score>hs){hs=score;localStorage.setItem('shu-snake-hs',hs);}
      spawnParts(food.x,food.y,'#fde68a');
      spawnPopup(food.x,food.y,combo>1?'+'+pts+' \xd7'+combo:'+'+pts,combo>2?'#f0abfc':'#fde68a');
      var pl=level; level=Math.floor(eaten/5)+1;
      if(level>pl) flashMs=700;
      food=randFood([bonus]); lastEatTs=now;
      if(eaten%5===0&&!bonus){bonus=randFood([food]);bonusMs=6500;}
    }
    if(bonus&&hx===bonus.x&&hy===bonus.y){
      grew=true;
      var bpts=60*level; score+=bpts;
      if(score>hs){hs=score;localStorage.setItem('shu-snake-hs',hs);}
      spawnParts(bonus.x,bonus.y,'#f0abfc',22);
      spawnPopup(bonus.x,bonus.y,'★ +'+bpts,'#f0abfc');
      bonus=null; bonusMs=0;
    }
    if(!grew) snake.pop();
  }

  function gameOver(){ state='gameover'; shakeMag=9; if(score>hs){hs=score;localStorage.setItem('shu-snake-hs',hs);} }

  var H1=['f0','ab','fc'], T1=['3b','07','64'];
  function lerp(c1,c2,t){
    function h(s){return parseInt(s,16);}
    return 'rgb('+Math.round(h(c1[0])+(h(c2[0])-h(c1[0]))*t)+','+Math.round(h(c1[1])+(h(c2[1])-h(c1[1]))*t)+','+Math.round(h(c1[2])+(h(c2[2])-h(c1[2]))*t)+')';
  }

  function rr(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  function starPath(cx,cy,ro,ri,n){
    n=n||5; ctx.beginPath();
    for(var i=0;i<n*2;i++){
      var a=i*Math.PI/n-Math.PI/2, rv=i%2===0?ro:ri;
      if(i===0) ctx.moveTo(cx+Math.cos(a)*rv,cy+Math.sin(a)*rv);
      else ctx.lineTo(cx+Math.cos(a)*rv,cy+Math.sin(a)*rv);
    }
    ctx.closePath();
  }

  function drawBoard(now){
    var bg=ctx.createRadialGradient(BX+BW/2,BY+BH/2,30,BX+BW/2,BY+BH/2,BW/1.3);
    bg.addColorStop(0,'rgba(12,0,35,0.98)'); bg.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle=bg; ctx.fillRect(BX,BY,BW,BH);

    ctx.strokeStyle='rgba(107,33,168,0.12)'; ctx.lineWidth=.5;
    for(var r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(BX,BY+r*CELL);ctx.lineTo(BX+BW,BY+r*CELL);ctx.stroke();}
    for(var c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(BX+c*CELL,BY);ctx.lineTo(BX+c*CELL,BY+BH);ctx.stroke();}

    if(snake.length>0&&state==='playing'){
      var hd=snake[0];
      var d=Math.max(Math.max(0,3-hd.x),Math.max(0,hd.x-(COLS-4)),Math.max(0,3-hd.y),Math.max(0,hd.y-(ROWS-4)));
      if(d>0){
        ctx.strokeStyle='rgba(248,113,113,'+(d/3*.45*(0.5+0.5*Math.sin(pulse/110)))+')';
        ctx.lineWidth=8; ctx.strokeRect(BX+2,BY+2,BW-4,BH-4); ctx.lineWidth=1;
      }
    }

    for(var pi=0;pi<parts.length;pi++){
      var p=parts[pi];
      ctx.globalAlpha=p.life; ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(.15,p.life),0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    var fp=Math.sin(pulse/350);
    var fcx=BX+food.x*CELL+CELL/2, fcy=BY+food.y*CELL+CELL/2;
    ctx.strokeStyle='rgba(253,230,138,'+(.25+fp*.18)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(fcx,fcy,CELL/2-1+fp*2.5,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(253,230,138,'+(.1+fp*.08)+')'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(fcx,fcy,CELL/2+2.5+fp*3.5,0,Math.PI*2); ctx.stroke();
    ctx.shadowColor='#fde68a'; ctx.shadowBlur=10+fp*7;
    ctx.fillStyle='#fde68a';
    ctx.beginPath(); ctx.arc(fcx,fcy,CELL/2-4+fp*1.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.arc(fcx-2,fcy-2,(CELL/2-4)*.38,0,Math.PI*2); ctx.fill();

    if(bonus){
      var bp=pulse/280;
      var urg=bonusMs<2000?(.5+.5*Math.sin(pulse/80)):1;
      ctx.save(); ctx.translate(BX+bonus.x*CELL+CELL/2,BY+bonus.y*CELL+CELL/2);
      ctx.rotate(bp*.85); ctx.globalAlpha=urg;
      ctx.shadowColor='#f0abfc'; ctx.shadowBlur=14+Math.sin(bp)*8;
      ctx.fillStyle='#f0abfc'; starPath(0,0,CELL/2-1,CELL/4,5); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.4)'; starPath(0,0,(CELL/2-1)*.5,(CELL/4)*.5,5); ctx.fill();
      ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.restore();
    }

    var len=snake.length;
    for(var i=0;i<len-1;i++){
      var a=snake[i],b=snake[i+1],t=i/(len-1||1);
      ctx.fillStyle=lerp(H1,T1,t);
      var ax=BX+a.x*CELL+CELL/2, ay=BY+a.y*CELL+CELL/2;
      var bx=BX+b.x*CELL+CELL/2, by2=BY+b.y*CELL+CELL/2;
      var pad=3;
      if(a.x===b.x) ctx.fillRect(ax-CELL/2+pad,Math.min(ay,by2)-.5,CELL-pad*2,Math.abs(by2-ay)+1);
      else           ctx.fillRect(Math.min(ax,bx)-.5,ay-CELL/2+pad,Math.abs(bx-ax)+1,CELL-pad*2);
    }

    for(var j=len-1;j>=0;j--){
      var seg=snake[j], tt=len>1?j/(len-1):0;
      var sx=BX+seg.x*CELL, sy=BY+seg.y*CELL;
      var pad2=j===0?1:2, rad=j===0?CELL/3:CELL/3.2;
      if(j===0){ctx.shadowColor='#c084fc';ctx.shadowBlur=14;}
      ctx.fillStyle=lerp(H1,T1,tt); rr(sx+pad2,sy+pad2,CELL-pad2*2,CELL-pad2*2,rad); ctx.fill();
      ctx.shadowBlur=0;
      var hg=ctx.createRadialGradient(sx+pad2+3,sy+pad2+3,0,sx+CELL/2,sy+CELL/2,CELL/2);
      hg.addColorStop(0,'rgba(255,255,255,.22)'); hg.addColorStop(.5,'rgba(255,255,255,.05)'); hg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=hg; rr(sx+pad2,sy+pad2,CELL-pad2*2,CELL-pad2*2,rad); ctx.fill();
    }

    if(snake.length>0&&state!=='gameover'){
      var hd2=snake[0];
      var hx=BX+hd2.x*CELL+CELL/2, hy=BY+hd2.y*CELL+CELL/2, eo=CELL/4.5;
      var e1,e2;
      if(dir.x===1)       {e1={x:hx+eo,y:hy-eo};e2={x:hx+eo,y:hy+eo};}
      else if(dir.x===-1) {e1={x:hx-eo,y:hy-eo};e2={x:hx-eo,y:hy+eo};}
      else if(dir.y===-1) {e1={x:hx-eo,y:hy-eo};e2={x:hx+eo,y:hy-eo};}
      else                {e1={x:hx-eo,y:hy+eo};e2={x:hx+eo,y:hy+eo};}
      ctx.fillStyle='#fff';
      [e1,e2].forEach(function(e){ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill();});
      ctx.fillStyle='#050010';
      [e1,e2].forEach(function(e){ctx.beginPath();ctx.arc(e.x+dir.x,e.y+dir.y,1.5,0,Math.PI*2);ctx.fill();});
    }

    if(flashMs>0){
      ctx.fillStyle='rgba(253,230,138,'+(flashMs/700*.28)+')'; ctx.fillRect(BX,BY,BW,BH);
      var ta=Math.min(1,flashMs/180);
      ctx.textAlign='center'; ctx.shadowColor='#fde68a'; ctx.shadowBlur=22*ta;
      ctx.fillStyle='rgba(253,230,138,'+ta+')'; ctx.font='bold 22px JetBrains Mono,monospace';
      ctx.fillText('LEVEL '+level,BX+BW/2,BY+BH/2);
      ctx.shadowBlur=0; ctx.textAlign='left';
    }
    if(shakeMag>0){ctx.fillStyle='rgba(248,113,113,'+(shakeMag/32)+')';ctx.fillRect(BX,BY,BW,BH);}

    ctx.textAlign='center';
    for(var pi2=0;pi2<popups.length;pi2++){
      var pp=popups[pi2];
      ctx.globalAlpha=pp.life; ctx.fillStyle=pp.col;
      ctx.shadowColor=pp.col; ctx.shadowBlur=10;
      ctx.font='bold 13px JetBrains Mono,monospace';
      ctx.fillText(pp.text,pp.x,pp.y);
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.textAlign='left';

    ctx.shadowColor='#a855f7'; ctx.shadowBlur=14;
    ctx.strokeStyle='#6b21a8'; ctx.lineWidth=2;
    ctx.strokeRect(BX,BY,BW,BH); ctx.shadowBlur=0;
  }

  function drawPanel(){
    var PX=BX+BW+P, PY=BY;
    function box(y,h){
      ctx.fillStyle='rgba(168,85,247,.05)'; ctx.fillRect(PX,PY+y,SP,h);
      ctx.strokeStyle='rgba(168,85,247,.18)'; ctx.lineWidth=1; ctx.strokeRect(PX,PY+y,SP,h);
    }
    function lbl(t,y,c,sz){c=c||'#6b5a8e';sz=sz||9;ctx.fillStyle=c;ctx.font='700 '+sz+'px JetBrains Mono,monospace';ctx.fillText(t,PX+9,PY+y);}
    function val(t,y,c,sz){sz=sz||14;ctx.fillStyle=c;ctx.font='700 '+sz+'px JetBrains Mono,monospace';ctx.fillText(t,PX+9,PY+y);}

    box(0,54);   lbl('SCORE',14);  val(String(score).padStart(8,'0'),42,'#c084fc',score>9999999?11:13);
    box(62,42);  lbl('LEVEL',76);  val(String(level),102,'#fde68a',16);
    box(112,42); lbl('LENGTH',126);val(String(snake.length),152,'#86efac',16);
    box(162,42); lbl('COMBO',176);
    val('\xd7'+(combo||1),202,combo>5?'#f0abfc':combo>2?'#fdba74':'#6b5a8e',16);
    box(212,42); lbl('BEST',226);  val(String(hs).padStart(8,'0'),252,'#5a4a7a',11);

    if(bonus){
      box(262,50); var urg2=bonusMs<2000;
      lbl('★ BONUS',276,urg2?'#f0abfc':'#c084fc');
      val((bonusMs/1000).toFixed(1)+'s',304,urg2?'#f0abfc':'#c084fc',18);
    }

    var bY=320; box(bY,34); lbl('NEXT LVL',bY+14);
    var prog=(eaten%5)/5;
    ctx.fillStyle='rgba(168,85,247,.15)'; ctx.fillRect(PX+9,PY+bY+18,SP-18,8);
    if(prog>0){var g=ctx.createLinearGradient(PX+9,0,PX+9+prog*(SP-18),0);g.addColorStop(0,'#6b21a8');g.addColorStop(1,'#f0abfc');ctx.fillStyle=g;ctx.fillRect(PX+9,PY+bY+18,prog*(SP-18),8);}

    var sY=362; box(sY,34); lbl('SPEED',sY+14);
    var ratio=Math.min((165-spd())/110,1);
    ctx.fillStyle='rgba(168,85,247,.15)'; ctx.fillRect(PX+9,PY+sY+18,SP-18,8);
    if(ratio>0){var g2=ctx.createLinearGradient(PX+9,0,PX+9+ratio*(SP-18),0);g2.addColorStop(0,'#6b21a8');g2.addColorStop(1,'#f0abfc');ctx.fillStyle=g2;ctx.fillRect(PX+9,PY+sY+18,ratio*(SP-18),8);}
  }

  function drawOverlay(title,sub){
    ctx.fillStyle='rgba(5,0,16,.9)'; ctx.fillRect(BX+2,BY+2,BW-4,BH-4);
    ctx.textAlign='center';
    ctx.shadowColor='#a855f7'; ctx.shadowBlur=22;
    ctx.fillStyle='#f0abfc'; ctx.font='bold 22px JetBrains Mono,monospace';
    ctx.fillText(title,BX+BW/2,BY+BH/2-20); ctx.shadowBlur=0;
    ctx.fillStyle='#6b5a8e'; ctx.font='11px JetBrains Mono,monospace';
    sub.split('\n').forEach(function(l,i){ctx.fillText(l,BX+BW/2,BY+BH/2+10+i*20);});
    ctx.textAlign='left';
  }

  function updateParts(dt){
    parts=parts.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vx*=.93;p.vy=p.vy*.93+.06;p.life-=p.decay*(dt/16);return p.life>0;});
    popups=popups.filter(function(p){p.y+=p.vy;p.life-=.022*(dt/16);return p.life>0;});
  }

  function draw(now){
    var shx=shakeMag>0?(Math.random()-.5)*shakeMag:0;
    var shy=shakeMag>0?(Math.random()-.5)*shakeMag:0;
    ctx.save(); ctx.translate(shx,shy);
    ctx.clearRect(-12,-12,CW+24,CH+24);
    drawBoard(now); drawPanel();
    if(state==='start')    drawOverlay('SNAKE','ESPACE pour d\xe9marrer\nESC pour quitter');
    if(state==='paused')   drawOverlay('PAUSE','P pour reprendre');
    if(state==='gameover') drawOverlay('GAME OVER','Score : '+score+'  \xb7  Meilleur : '+hs+'\n\nR pour rejouer   ESC pour quitter');
    ctx.restore();
  }

  var DIRS={ArrowLeft:{x:-1,y:0},a:{x:-1,y:0},A:{x:-1,y:0},
            ArrowRight:{x:1,y:0},d:{x:1,y:0},D:{x:1,y:0},
            ArrowUp:{x:0,y:-1},w:{x:0,y:-1},W:{x:0,y:-1},
            ArrowDown:{x:0,y:1},s:{x:0,y:1},S:{x:0,y:1}};

  function kd(e){
    if(e.key==='Escape'){quit();return;}
    if(state==='gameover'){if(e.key==='r'||e.key==='R'){reset();state='playing';}return;}
    if(e.key===' '&&state==='start'){state='playing';lastNow=performance.now();e.preventDefault();return;}
    if((e.key==='p'||e.key==='P')&&(state==='playing'||state==='paused')){state=state==='paused'?'playing':'paused';e.preventDefault();return;}
    if(state!=='playing')return;
    var nd=DIRS[e.key];
    if(nd){if(!(nd.x===-dir.x&&nd.y===-dir.y))nextDir=nd;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key)>=0)e.preventDefault();}
  }

  function quit(){
    cancelAnimationFrame(rafId); document.removeEventListener('keydown',kd);
    var sp=document.createElement('span'); sp.className='ln dim';
    sp.innerHTML='\n  Snake termin\xe9  \xb7  score : '+score+'  \xb7  meilleur : '+hs+'\n';
    output.appendChild(sp); inputLine.style.display='flex';
    document.getElementById('cmd-input').focus(); termBody.scrollTop=termBody.scrollHeight;
  }

  function loop(now){
    var dt=now-lastNow; lastNow=now; pulse+=dt;
    if(flashMs>0)flashMs-=dt;
    if(shakeMag>0)shakeMag=Math.max(0,shakeMag-dt*.06);
    updateParts(dt);
    if(state==='playing'){
      if(bonus){bonusMs-=dt;if(bonusMs<=0){bonus=null;bonusMs=0;}}
      elapsed+=dt;
      if(elapsed>=spd()){elapsed=0;step(now);}
    }
    draw(now); rafId=requestAnimationFrame(loop);
  }

  document.addEventListener('keydown',kd);
  reset(); lastNow=performance.now(); rafId=requestAnimationFrame(loop);
  termBody.scrollTop=termBody.scrollHeight;
}
