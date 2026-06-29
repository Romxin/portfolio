// ── Plants vs Zombies – shu@portfolio ────────────────────────
function cmdPvz() {
  var output    = document.getElementById('output');
  var inputLine = document.getElementById('input-line');
  var termBody  = document.getElementById('term-body');

  // ── Layout ──────────────────────────────────────────────────
  var ROWS=5, COLS=9, CW2=70, CH2=62;
  var GX=82, GY=84;
  var BW=COLS*CW2, BH=ROWS*CH2;
  var CW=GX+BW+14, CH=GY+BH+40;

  // ── DOM ─────────────────────────────────────────────────────
  inputLine.style.display='none';
  var wrap=document.createElement('div'); wrap.className='tetris-wrap';
  output.appendChild(wrap);
  var canvas=document.createElement('canvas');
  canvas.width=CW; canvas.height=CH; canvas.className='tetris-canvas';
  wrap.appendChild(canvas);
  var hint=document.createElement('div'); hint.className='tetris-hint';
  hint.textContent='Clique sur une carte plante puis sur une case  ·  Clique les soleils pour les ramasser  ·  ESC : Quitter';
  wrap.appendChild(hint);
  var ctx=canvas.getContext('2d');

  // ── Data ────────────────────────────────────────────────────
  var PDATA={
    peashooter:{name:'Peashooter',cost:100,maxHp:300,cd:7500,color:'#4ade80',icon:'🌱'},
    sunflower: {name:'Sunflower', cost:50, maxHp:300, cd:7500,color:'#fbbf24',icon:'🌻'},
    wallnut:   {name:'Wall-nut',  cost:50, maxHp:2000,cd:15000,color:'#d97706',icon:'🪨'},
    cherrybomb:{name:'Cherry',    cost:150,maxHp:1,  cd:50000,color:'#ef4444',icon:'🍒'},
  };
  var PORDER=['peashooter','sunflower','wallnut','cherrybomb'];
  var ZDATA={
    basic: {hp:180, spd:26, color:'#86efac'},
    cone:  {hp:560, spd:26, color:'#fdba74'},
    bucket:{hp:1300,spd:22, color:'#94a3b8'},
  };
  var WAVES=[
    [{t:'basic',n:3,gap:5500}],
    [{t:'basic',n:4,gap:4500},{t:'cone',n:2,gap:7000}],
    [{t:'basic',n:3,gap:4000},{t:'cone',n:4,gap:4500}],
    [{t:'cone',n:4,gap:3500},{t:'bucket',n:2,gap:7000}],
    [{t:'basic',n:5,gap:3000},{t:'cone',n:5,gap:3500},{t:'bucket',n:3,gap:5500}],
  ];

  // ── State ───────────────────────────────────────────────────
  // NOTE: loop vars named 'ri'/'ci' to avoid shadowing rrect()
  var grid=[];
  for(var ri=0;ri<ROWS;ri++){grid.push([]);for(var ci=0;ci<COLS;ci++)grid[ri].push(null);}
  var zombies=[], peas=[], suns=[], explosions=[], parts=[];
  var lawnMowers=[true,true,true,true,true];
  var sun=150, selected=null;
  var cds={peashooter:0,sunflower:0,wallnut:0,cherrybomb:0};
  var waveNum=0, spawnQ=[], nextWave=14000, waveActive=false;
  var state='playing', lastNow=0, rafId, pulse=0;
  var sunTimer=0, nextSunDrop=8000;
  var hover={row:-1,col:-1};

  // ── Helpers ─────────────────────────────────────────────────
  function laneY(lane){ return GY+lane*CH2+CH2/2; }
  function colX(col){   return GX+col*CW2+CW2/2; }

  function rrect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  function spawnParts(x,y,col,n){
    n=n||12;
    for(var i=0;i<n;i++){
      var a=Math.random()*Math.PI*2, sp=1.5+Math.random()*4;
      parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,
        life:1,decay:.028+Math.random()*.04,r:2+Math.random()*5,col:col});
    }
  }

  function buildWave(idx){
    var data=WAVES[Math.min(idx,WAVES.length-1)],q=[],delay=1000;
    for(var i=0;i<data.length;i++){
      for(var j=0;j<data[i].n;j++){
        q.push({type:data[i].t,lane:Math.floor(Math.random()*ROWS),delay:delay});
        delay+=data[i].gap;
      }
    }
    q.sort(function(a,b){return a.delay-b.delay;});
    return q;
  }

  function placePlant(row,col,type){
    var pd=PDATA[type];
    if(sun<pd.cost||grid[row][col]||cds[type]>0) return;
    sun-=pd.cost; cds[type]=pd.cd;
    grid[row][col]={type:type,hp:pd.maxHp,maxHp:pd.maxHp,row:row,col:col,
      shootTimer:type==='peashooter'?0:1e9,
      sunTimer:type==='sunflower'?8000:1e9};
    if(type==='cherrybomb'){
      explosions.push({x:colX(col),y:laneY(row),r:0,maxR:CW2*1.7,life:1,col:'#ef4444'});
      spawnParts(colX(col),laneY(row),'#f97316',30);
      for(var zi2=zombies.length-1;zi2>=0;zi2--){
        var z2=zombies[zi2];
        var dx2=z2.x-colX(col),dy2=laneY(z2.lane)-laneY(row);
        if(Math.sqrt(dx2*dx2+dy2*dy2)<CW2*1.7){spawnParts(z2.x,laneY(z2.lane),'#86efac',10);zombies.splice(zi2,1);}
      }
      grid[row][col]=null;
    } else {
      spawnParts(colX(col),laneY(row),'#c084fc',8);
    }
    selected=null;
  }

  function spawnZombie(type,lane){
    var zd=ZDATA[type];
    zombies.push({type:type,lane:lane,x:GX+BW+60,
      hp:zd.hp,maxHp:zd.hp,spd:zd.spd,
      eatTimer:0,walk:Math.random()*Math.PI*2});
  }

  function spawnSunAt(x,y){
    suns.push({x:x,y:y,vy:0,landY:GY+BH*.15+Math.random()*BH*.7,life:6000,landed:false});
  }

  // ── Update ──────────────────────────────────────────────────
  function update(dt){
    // Cooldowns
    for(var k in cds) if(cds[k]>0) cds[k]=Math.max(0,cds[k]-dt);

    // Wave logic
    if(!waveActive){
      nextWave-=dt;
      if(nextWave<=0){waveActive=true;waveNum++;spawnQ=buildWave(waveNum-1);}
    } else {
      if(spawnQ.length>0){
        spawnQ[0].delay-=dt;
        while(spawnQ.length>0&&spawnQ[0].delay<=0){var sq=spawnQ.shift();spawnZombie(sq.type,sq.lane);}
      } else if(zombies.length===0){
        waveActive=false;
        if(waveNum>=WAVES.length){state='win';return;}
        nextWave=14000; sun+=75;
        spawnParts(GX+BW/2,GY+BH/2,'#fde68a',22);
      }
    }

    // Sun drops (ambient)
    sunTimer+=dt;
    if(sunTimer>=nextSunDrop){
      sunTimer=0; nextSunDrop=7000+Math.random()*5000;
      spawnSunAt(GX+20+Math.random()*(BW-40),-25);
    }

    // Sun physics
    for(var si=suns.length-1;si>=0;si--){
      var sd=suns[si];
      if(!sd.landed){sd.vy+=0.1*(dt/16);sd.y+=sd.vy*(dt/16);if(sd.y>=sd.landY){sd.y=sd.landY;sd.landed=true;}}
      sd.life-=dt;
      if(sd.life<=0) suns.splice(si,1);
    }

    // Plants update
    for(var ri2=0;ri2<ROWS;ri2++){
      for(var ci2=0;ci2<COLS;ci2++){
        var pl=grid[ri2][ci2]; if(!pl) continue;
        // Peashooter
        pl.shootTimer-=dt;
        if(pl.type==='peashooter'&&pl.shootTimer<=0){
          pl.shootTimer=1500;
          var hasZ=zombies.some(function(z){return z.lane===ri2&&z.x>colX(ci2);});
          if(hasZ) peas.push({lane:ri2,x:colX(ci2)+CW2/2,dmg:20});
        }
        // Sunflower
        if(pl.type==='sunflower'){
          pl.sunTimer-=dt;
          if(pl.sunTimer<=0){pl.sunTimer=9000;spawnSunAt(colX(ci2)+Math.random()*20-10,laneY(ri2)-20);}
        }
      }
    }

    // Peas
    for(var pi=peas.length-1;pi>=0;pi--){
      var pea=peas[pi]; pea.x+=200*(dt/1000);
      if(pea.x>GX+BW+50){peas.splice(pi,1);continue;}
      var hit=false;
      for(var zi=zombies.length-1;zi>=0;zi--){
        var z=zombies[zi];
        if(z.lane===pea.lane&&Math.abs(pea.x-z.x)<20){
          z.hp-=pea.dmg; spawnParts(pea.x,laneY(pea.lane),'#4ade80',5);
          peas.splice(pi,1); hit=true;
          if(z.hp<=0){spawnParts(z.x,laneY(z.lane),ZDATA[z.type].color,14);zombies.splice(zi,1);}
          break;
        }
      }
    }

    // Zombies
    for(var zi3=zombies.length-1;zi3>=0;zi3--){
      var z3=zombies[zi3]; z3.walk+=dt*0.004;
      // Find plant in path
      var eating=null;
      for(var ci3=0;ci3<COLS;ci3++){
        var pl2=grid[z3.lane][ci3];
        if(pl2&&z3.x<=colX(ci3)+CW2*.55&&z3.x>=colX(ci3)-CW2){eating=pl2;break;}
      }
      if(eating){
        z3.eatTimer+=dt;
        if(z3.eatTimer>=650){z3.eatTimer=0;eating.hp-=15;if(eating.hp<=0){grid[eating.row][eating.col]=null;}}
      } else {
        z3.eatTimer=0; z3.x-=z3.spd*(dt/1000);
        if(z3.x<=GX-8){
          if(lawnMowers[z3.lane]){
            lawnMowers[z3.lane]=false;
            for(var zk=zombies.length-1;zk>=0;zk--){
              if(zombies[zk].lane===z3.lane){spawnParts(zombies[zk].x,laneY(z3.lane),'#ef4444',10);zombies.splice(zk,1);}
            }
            break;
          } else { state='gameover'; return; }
        }
      }
    }

    // Explosions & particles
    for(var ei=explosions.length-1;ei>=0;ei--){
      var ex=explosions[ei]; ex.r+=5*(dt/16); ex.life-=.04*(dt/16);
      if(ex.life<=0) explosions.splice(ei,1);
    }
    parts=parts.filter(function(p){
      p.x+=p.vx; p.y+=p.vy; p.vx*=.92; p.vy=p.vy*.92+.08;
      p.life-=p.decay*(dt/16); return p.life>0;
    });
  }

  // ── Draw helpers ─────────────────────────────────────────────
  function hpBar(x,y,w,hp,maxHp){
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(x,y,w,4);
    var t=hp/maxHp;
    ctx.fillStyle=t>.5?'#22c55e':t>.25?'#fbbf24':'#ef4444';
    ctx.fillRect(x,y,w*t,4);
  }

  // ── Plant drawing ────────────────────────────────────────────
  function drawPeashooter(cx,cy,t){
    ctx.save();
    // Stem
    ctx.fillStyle='#166534'; ctx.fillRect(cx-4,cy+8,8,18);
    // Head
    ctx.shadowColor='#22c55e'; ctx.shadowBlur=8;
    ctx.fillStyle=t>.5?'#22c55e':'#16a34a';
    ctx.beginPath(); ctx.arc(cx,cy,17,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Highlight
    ctx.fillStyle='rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.arc(cx-5,cy-5,8,0,Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx-1,cy-4,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#050010'; ctx.beginPath(); ctx.arc(cx,cy-4,2.5,0,Math.PI*2); ctx.fill();
    // Barrel
    ctx.fillStyle=t>.5?'#16a34a':'#14532d';
    ctx.beginPath(); ctx.ellipse(cx+21,cy+4,9,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#22c55e';
    ctx.beginPath(); ctx.ellipse(cx+21,cy+2,7,4.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#052e16'; ctx.beginPath(); ctx.arc(cx+29,cy+4,3.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawSunflower(cx,cy,t,time){
    ctx.save();
    ctx.fillStyle='#166534'; ctx.fillRect(cx-3,cy+6,6,20);
    var bob=Math.sin(time*.0018+cx)*.7;
    for(var i=0;i<8;i++){
      var ang=i*.785+time*.0008;
      ctx.fillStyle=i%2===0?'#fbbf24':'#f59e0b';
      ctx.beginPath(); ctx.ellipse(cx+Math.cos(ang)*17+bob,cy+Math.sin(ang)*17,8,4.5,ang,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle=t>.5?'#92400e':'#78350f';
    ctx.shadowColor='#fbbf24'; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(cx,cy,11,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#a16207'; ctx.beginPath(); ctx.arc(cx-2,cy-2,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1e1b4b';
    ctx.beginPath(); ctx.arc(cx-3,cy-2,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+3,cy-2,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawWallnut(cx,cy,t){
    ctx.save();
    ctx.fillStyle=t>.5?'#d97706':t>.25?'#b45309':'#92400e';
    ctx.shadowColor='#a16207'; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.arc(cx-6,cy-6,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(cx-7,cy-4,4,5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+7,cy-4,4,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1e1b4b';
    ctx.beginPath(); ctx.arc(cx-7,cy-3,2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+7,cy-3,2.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#1e1b4b'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx-11,cy-10); ctx.lineTo(cx-4,cy-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+11,cy-10); ctx.lineTo(cx+4,cy-8); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy+8,6,Math.PI+.3,-.3); ctx.stroke();
    if(t<.5){
      ctx.strokeStyle='#78350f'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx+5,cy-15); ctx.lineTo(cx+9,cy-3); ctx.lineTo(cx+16,cy+5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-8,cy+4); ctx.lineTo(cx-16,cy+13); ctx.stroke();
    }
    ctx.restore();
  }

  function drawCherryBomb(cx,cy,time){
    ctx.save();
    var fuse=.5+.5*Math.sin(time*.016);
    ctx.strokeStyle='#166534'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx-9,cy-12); ctx.bezierCurveTo(cx-9,cy-22,cx+4,cy-22,cx+4,cy-18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+9,cy-12); ctx.bezierCurveTo(cx+9,cy-22,cx-4,cy-22,cx-4,cy-18); ctx.stroke();
    ctx.fillStyle='#166534';
    ctx.beginPath(); ctx.ellipse(cx,cy-20,8,4.5,-.3,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='#ef4444'; ctx.shadowBlur=8+fuse*8;
    ctx.fillStyle='#dc2626'; ctx.beginPath(); ctx.arc(cx-9,cy,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(cx+9,cy,12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.arc(cx-12,cy-4,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+6,cy-4,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fde68a'; ctx.shadowColor='#fde68a'; ctx.shadowBlur=6*fuse;
    ctx.beginPath(); ctx.arc(cx+9+fuse*3,cy-13-fuse*3,2.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // ── Zombie drawing ───────────────────────────────────────────
  function drawZombie(z,time){
    ctx.save();
    var cx=z.x, cy=laneY(z.lane);
    var t=z.hp/z.maxHp;
    var eating=(function(){
      for(var c=0;c<COLS;c++){
        var p=grid[z.lane][c];
        if(p&&z.x<=colX(c)+CW2*.55&&z.x>=colX(c)-CW2) return true;
      }
      return false;
    }());
    var wobX=eating?Math.sin(time*.016)*3:Math.sin(z.walk)*1.5;
    cx+=wobX;
    // Shadow
    ctx.fillStyle='rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(cx,cy+30,13,4,0,0,Math.PI*2); ctx.fill();
    // Legs
    ctx.fillStyle='#475569'; ctx.fillRect(cx-10,cy+18,8,14); ctx.fillRect(cx+2,cy+18,8,14);
    ctx.fillStyle='#1e293b'; ctx.fillRect(cx-12,cy+28,10,6); ctx.fillRect(cx+1,cy+28,10,6);
    // Body
    ctx.fillStyle='#64748b'; ctx.fillRect(cx-12,cy-8,24,26);
    ctx.fillStyle='rgba(255,255,255,.1)'; ctx.fillRect(cx-8,cy-6,8,22);
    // Arms
    ctx.fillStyle='#86efac';
    ctx.fillRect(cx-26,cy-4,14,7);   // left arm (outstretched toward player)
    ctx.fillStyle='#475569'; ctx.fillRect(cx+12,cy,12,7);
    // Neck
    ctx.fillStyle='#86efac'; ctx.fillRect(cx-5,cy-18,10,10);
    // Head
    ctx.shadowColor=ZDATA[z.type].color; ctx.shadowBlur=6;
    ctx.fillStyle='#86efac';
    ctx.beginPath(); ctx.ellipse(cx,cy-24,13,14,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.arc(cx-4,cy-28,5,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(cx-4,cy-24,3.5,4.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+5,cy-24,3.5,4.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1e1b4b';
    ctx.beginPath(); ctx.arc(cx-3.5,cy-23,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+5.5,cy-23,2,0,Math.PI*2); ctx.fill();
    // Mouth
    ctx.fillStyle='#1e1b4b'; ctx.beginPath(); ctx.arc(cx,cy-16,4,0,Math.PI); ctx.fill();
    // Hat
    if(z.type==='cone'){
      ctx.fillStyle='#f97316';
      ctx.beginPath(); ctx.moveTo(cx,cy-50); ctx.lineTo(cx-13,cy-35); ctx.lineTo(cx+13,cy-35); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fb923c';
      ctx.beginPath(); ctx.moveTo(cx+2,cy-48); ctx.lineTo(cx+2,cy-37); ctx.lineTo(cx+11,cy-37); ctx.closePath(); ctx.fill();
    } else if(z.type==='bucket'){
      ctx.fillStyle='#94a3b8'; ctx.fillRect(cx-13,cy-48,26,20);
      ctx.fillStyle='#cbd5e1'; ctx.fillRect(cx-14,cy-48,28,5);
      ctx.strokeStyle='#64748b'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(cx-13,cy-40); ctx.lineTo(cx+13,cy-40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-13,cy-34); ctx.lineTo(cx+13,cy-34); ctx.stroke();
    }
    // HP bar
    hpBar(cx-16,cy-52,32,z.hp,z.maxHp);
    ctx.restore();
  }

  // ── Sun drawing ──────────────────────────────────────────────
  function drawSun(sd){
    ctx.save();
    var p=Math.sin(pulse*.004+sd.x*.01);
    ctx.shadowColor='#fde68a'; ctx.shadowBlur=14+p*5;
    ctx.fillStyle='#fbbf24'; ctx.beginPath(); ctx.arc(sd.x,sd.y,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fde68a'; ctx.beginPath(); ctx.arc(sd.x,sd.y,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(sd.x-3,sd.y-3,5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#1e1b4b';
    ctx.beginPath(); ctx.arc(sd.x-2,sd.y-2,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sd.x+3,sd.y-2,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#1e1b4b'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(sd.x+.5,sd.y+4,3.5,.1,Math.PI-.1); ctx.stroke();
    // click hint ring
    var fade=Math.min(1,sd.life/800);
    ctx.globalAlpha=fade*.45; ctx.strokeStyle='#fde68a'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(sd.x,sd.y,18+p*3,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // ── Top bar ──────────────────────────────────────────────────
  var CARD_W=64, CARD_H=70, CARD_Y=7;

  function drawCard(ii,pt){
    var pd=PDATA[pt];
    var cx=58+ii*(CARD_W+7);
    var isSel=selected===pt, canAf=sun>=pd.cost, hasCd=cds[pt]>0;

    ctx.save();
    // Card background
    ctx.fillStyle=isSel?'rgba(168,85,247,.28)':'rgba(10,0,28,.92)';
    ctx.strokeStyle=isSel?'#a855f7':canAf?'rgba(168,85,247,.42)':'rgba(107,33,168,.15)';
    ctx.lineWidth=isSel?2:1.5;
    if(isSel){ctx.shadowColor='#a855f7';ctx.shadowBlur=10;}
    rrect(cx,CARD_Y,CARD_W,CARD_H,5); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0;

    // Plant icon (mini, drawn directly – no scale needed)
    ctx.save();
    ctx.beginPath(); rrect(cx+2,CARD_Y+2,CARD_W-4,CARD_H-20,4); ctx.clip();
    ctx.globalAlpha=canAf?1:.3;
    var mcx=cx+CARD_W/2, mcy=CARD_Y+CARD_H*.38;
    if(pt==='peashooter'){
      // Mini peashooter
      ctx.fillStyle='#166534'; ctx.fillRect(mcx-3,mcy+6,6,14);
      ctx.shadowColor='#22c55e'; ctx.shadowBlur=5;
      ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(mcx,mcy,12,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(mcx-3,mcy-3,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(mcx-1,mcy-2,3.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#050010'; ctx.beginPath(); ctx.arc(mcx,mcy-2,1.8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#16a34a'; ctx.beginPath(); ctx.ellipse(mcx+14,mcy+2,6.5,4.5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#052e16'; ctx.beginPath(); ctx.arc(mcx+20,mcy+2,2.5,0,Math.PI*2); ctx.fill();
    } else if(pt==='sunflower'){
      ctx.fillStyle='#166534'; ctx.fillRect(mcx-2,mcy+5,5,15);
      for(var pi2=0;pi2<8;pi2++){
        var ang2=pi2*.785;
        ctx.fillStyle=pi2%2===0?'#fbbf24':'#f59e0b';
        ctx.beginPath(); ctx.ellipse(mcx+Math.cos(ang2)*12,mcy+Math.sin(ang2)*12,6,3.5,ang2,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle='#92400e'; ctx.shadowColor='#fbbf24'; ctx.shadowBlur=4;
      ctx.beginPath(); ctx.arc(mcx,mcy,8,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    } else if(pt==='wallnut'){
      ctx.shadowColor='#a16207'; ctx.shadowBlur=4;
      ctx.fillStyle='#d97706'; ctx.beginPath(); ctx.arc(mcx,mcy,17,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.13)'; ctx.beginPath(); ctx.arc(mcx-5,mcy-5,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(mcx-5,mcy-2,3,4,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(mcx+5,mcy-2,3,4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1e1b4b'; ctx.beginPath(); ctx.arc(mcx-5,mcy-1.5,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mcx+5,mcy-1.5,2,0,Math.PI*2); ctx.fill();
    } else { // cherrybomb
      ctx.shadowColor='#ef4444'; ctx.shadowBlur=8;
      ctx.fillStyle='#dc2626'; ctx.beginPath(); ctx.arc(mcx-7,mcy,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(mcx+7,mcy,10,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(mcx-9,mcy-3,3.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#166534'; ctx.beginPath(); ctx.ellipse(mcx,mcy-18,6,3.5,-.3,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();

    // Sun cost
    ctx.font='700 9px JetBrains Mono,monospace'; ctx.textAlign='center';
    ctx.fillStyle=canAf?'#fde68a':'#6b5a8e';
    ctx.fillText('☀ '+pd.cost, cx+CARD_W/2, CARD_Y+CARD_H-4);
    ctx.textAlign='left';

    // Cooldown overlay
    if(hasCd){
      var cdR=cds[pt]/pd.cd;
      ctx.fillStyle='rgba(0,0,0,.65)';
      ctx.fillRect(cx+2,CARD_Y+2,(CARD_W-4)*cdR,CARD_H-22);
    }
    ctx.restore();
  }

  function drawTopBar(){
    ctx.fillStyle='#0a0020'; ctx.fillRect(0,0,CW,GY-2);
    ctx.strokeStyle='rgba(107,33,168,.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,GY-2); ctx.lineTo(CW,GY-2); ctx.stroke();

    // Sun counter
    ctx.shadowColor='#fde68a'; ctx.shadowBlur=10;
    ctx.fillStyle='#fbbf24'; ctx.beginPath(); ctx.arc(28,GY/2,16,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#1e1b4b'; ctx.font='bold 11px JetBrains Mono,monospace';
    ctx.textAlign='center'; ctx.fillText(String(sun),28,GY/2+4); ctx.textAlign='left';

    // Cards
    for(var ii=0;ii<PORDER.length;ii++) drawCard(ii,PORDER[ii]);

    // Wave / timer info
    ctx.fillStyle='#6b5a8e'; ctx.font='700 9px JetBrains Mono,monospace';
    ctx.textAlign='right';
    ctx.fillText('VAGUE '+waveNum+'/'+WAVES.length, CW-6, 22);
    if(!waveActive&&nextWave>0) ctx.fillText('Prochaine : '+Math.ceil(nextWave/1000)+'s', CW-6, 38);
    else if(waveActive)        ctx.fillText('⚠ ATTAQUE !', CW-6, 38);
    ctx.textAlign='left';
  }

  // ── Lawn ─────────────────────────────────────────────────────
  function drawLawn(){
    // Rows alternating
    for(var row2=0;row2<ROWS;row2++){
      ctx.fillStyle=row2%2===0?'#0f2810':'#0b2010';
      ctx.fillRect(GX,GY+row2*CH2,BW,CH2);
    }
    // Grid lines
    ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=1;
    for(var r2=0;r2<=ROWS;r2++){ctx.beginPath();ctx.moveTo(GX,GY+r2*CH2);ctx.lineTo(GX+BW,GY+r2*CH2);ctx.stroke();}
    for(var c2=0;c2<=COLS;c2++){ctx.beginPath();ctx.moveTo(GX+c2*CW2,GY);ctx.lineTo(GX+c2*CW2,GY+BH);ctx.stroke();}
    // Hover highlight
    if(selected&&hover.row>=0){
      ctx.fillStyle='rgba(168,85,247,.2)';
      ctx.fillRect(GX+hover.col*CW2,GY+hover.row*CH2,CW2,CH2);
    }
    // Lawn mower zone
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(0,GY,GX-2,BH);
    for(var lm2=0;lm2<ROWS;lm2++){
      if(lawnMowers[lm2]){
        ctx.fillStyle='#dc2626'; ctx.fillRect(GX-38,GY+lm2*CH2+CH2/2-10,28,18);
        ctx.fillStyle='#fbbf24';
        ctx.beginPath(); ctx.arc(GX-27,GY+lm2*CH2+CH2/2+10,6,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(GX-13,GY+lm2*CH2+CH2/2+10,6,0,Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle='rgba(248,113,113,.1)'; ctx.fillRect(0,GY+lm2*CH2,GX,CH2);
      }
    }
    // Border glow
    ctx.shadowColor='#14532d'; ctx.shadowBlur=10;
    ctx.strokeStyle='#166534'; ctx.lineWidth=2;
    ctx.strokeRect(GX,GY,BW,BH); ctx.shadowBlur=0;
  }

  // ── Full draw ────────────────────────────────────────────────
  function draw(now){
    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle='#060012'; ctx.fillRect(0,0,CW,CH);
    drawLawn();
    drawTopBar();

    // Peas (glow)
    for(var pi3=0;pi3<peas.length;pi3++){
      ctx.save();
      ctx.shadowColor='#4ade80'; ctx.shadowBlur=10;
      ctx.fillStyle='#4ade80'; ctx.beginPath(); ctx.arc(peas[pi3].x,laneY(peas[pi3].lane),5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#bbf7d0'; ctx.beginPath(); ctx.arc(peas[pi3].x-1,laneY(peas[pi3].lane)-1,2.5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.restore();
    }

    // Plants
    for(var ri3=0;ri3<ROWS;ri3++){
      for(var ci4=0;ci4<COLS;ci4++){
        var pl3=grid[ri3][ci4]; if(!pl3) continue;
        var px=colX(ci4), py=laneY(ri3);
        if(pl3.type==='peashooter') drawPeashooter(px,py,pl3.hp/pl3.maxHp);
        else if(pl3.type==='sunflower') drawSunflower(px,py,pl3.hp/pl3.maxHp,now);
        else if(pl3.type==='wallnut') drawWallnut(px,py,pl3.hp/pl3.maxHp);
        else if(pl3.type==='cherrybomb') drawCherryBomb(px,py,now);
        hpBar(px-18,py-CH2*.44,36,pl3.hp,pl3.maxHp);
      }
    }

    // Zombies (sorted back to front)
    var sortedZ=zombies.slice().sort(function(a,b){return a.lane-b.lane;});
    for(var zi4=0;zi4<sortedZ.length;zi4++) drawZombie(sortedZ[zi4],now);

    // Explosions
    for(var ei2=0;ei2<explosions.length;ei2++){
      var ex2=explosions[ei2];
      ctx.save();
      ctx.globalAlpha=ex2.life*.6;
      ctx.strokeStyle=ex2.col; ctx.lineWidth=4+ex2.life*5;
      ctx.shadowColor=ex2.col; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(ex2.x,ex2.y,ex2.r,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=ex2.life*.25;
      ctx.fillStyle=ex2.col; ctx.beginPath(); ctx.arc(ex2.x,ex2.y,ex2.r*.6,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.restore();
    }

    // Suns
    for(var si2=0;si2<suns.length;si2++) drawSun(suns[si2]);

    // Particles
    for(var pp=0;pp<parts.length;pp++){
      var pt2=parts[pp];
      ctx.save(); ctx.globalAlpha=pt2.life;
      ctx.fillStyle=pt2.col; ctx.beginPath(); ctx.arc(pt2.x,pt2.y,pt2.r*Math.max(.1,pt2.life),0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Bottom bar
    ctx.fillStyle='rgba(6,0,18,.9)'; ctx.fillRect(0,GY+BH+2,CW,38);
    ctx.strokeStyle='rgba(107,33,168,.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,GY+BH+2); ctx.lineTo(CW,GY+BH+2); ctx.stroke();
    ctx.fillStyle='#6b5a8e'; ctx.font='9px JetBrains Mono,monospace';
    ctx.fillText('Clique une carte puis une case verte pour planter  ·  Clique les soleils  ·  ESC : Quitter',8,GY+BH+22);

    // Overlay
    if(state==='gameover'||state==='win'){
      ctx.fillStyle='rgba(5,0,16,.92)'; ctx.fillRect(GX,GY,BW,BH);
      ctx.textAlign='center';
      ctx.shadowColor=state==='win'?'#22c55e':'#ef4444'; ctx.shadowBlur=24;
      ctx.fillStyle=state==='win'?'#86efac':'#f87171';
      ctx.font='bold 26px JetBrains Mono,monospace';
      ctx.fillText(state==='win'?'VICTOIRE !':'GAME OVER',GX+BW/2,GY+BH/2-18);
      ctx.shadowBlur=0; ctx.fillStyle='#6b5a8e'; ctx.font='11px JetBrains Mono,monospace';
      ctx.fillText(state==='win'?'Tu as survécu aux 5 vagues !':'Les zombies ont envahi ta maison...',GX+BW/2,GY+BH/2+10);
      ctx.fillText('ESC pour quitter',GX+BW/2,GY+BH/2+32);
      ctx.textAlign='left';
    }
  }

  // ── Events ───────────────────────────────────────────────────
  canvas.addEventListener('mousemove',function(e){
    var rect=canvas.getBoundingClientRect();
    var mx=e.clientX-rect.left, my=e.clientY-rect.top;
    if(mx>=GX&&mx<GX+BW&&my>=GY&&my<GY+BH){
      hover.row=Math.floor((my-GY)/CH2);
      hover.col=Math.floor((mx-GX)/CW2);
    } else {hover.row=-1;hover.col=-1;}
  });

  canvas.addEventListener('click',function(e){
    if(state!=='playing') return;
    var rect=canvas.getBoundingClientRect();
    var mx=e.clientX-rect.left, my=e.clientY-rect.top;
    // Suns
    for(var si3=suns.length-1;si3>=0;si3--){
      var sd2=suns[si3], dx=mx-sd2.x, dy=my-sd2.y;
      if(dx*dx+dy*dy<22*22){
        sun+=25; spawnParts(sd2.x,sd2.y,'#fde68a',10);
        suns.splice(si3,1); return;
      }
    }
    // Cards
    for(var ii2=0;ii2<PORDER.length;ii2++){
      var pt3=PORDER[ii2], cx3=58+ii2*(CARD_W+7);
      if(mx>=cx3&&mx<cx3+CARD_W&&my>=CARD_Y&&my<CARD_Y+CARD_H){
        var pd2=PDATA[pt3];
        if(sun>=pd2.cost&&cds[pt3]<=0) selected=(selected===pt3?null:pt3);
        return;
      }
    }
    // Place
    if(selected&&mx>=GX&&mx<GX+BW&&my>=GY&&my<GY+BH){
      var col2=Math.floor((mx-GX)/CW2), row2=Math.floor((my-GY)/CH2);
      placePlant(row2,col2,selected);
    } else { selected=null; }
  });

  function kd(e){
    if(e.key==='Escape') quit();
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].indexOf(e.key)>=0) e.preventDefault();
  }
  document.addEventListener('keydown',kd);

  function quit(){
    cancelAnimationFrame(rafId); document.removeEventListener('keydown',kd);
    var sp=document.createElement('span'); sp.className='ln dim';
    sp.innerHTML='\n  Plants vs Zombies termin\xe9  \xb7  Vague '+waveNum+'/'+WAVES.length+'\n';
    output.appendChild(sp); inputLine.style.display='flex';
    document.getElementById('cmd-input').focus(); termBody.scrollTop=termBody.scrollHeight;
  }

  // ── Loop ─────────────────────────────────────────────────────
  function loop(now){
    var dt=now-lastNow; lastNow=now; pulse+=dt;
    if(state==='playing'&&dt>0&&dt<200) update(dt);
    draw(now); rafId=requestAnimationFrame(loop);
  }
  lastNow=performance.now(); rafId=requestAnimationFrame(loop);
  termBody.scrollTop=termBody.scrollHeight;
}
