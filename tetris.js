// ── Triple-A Tetris for shu@portfolio ────────────────────────

function cmdTetris() {
  const output    = document.getElementById('output');
  const inputLine = document.getElementById('input-line');
  const termBody  = document.getElementById('term-body');

  // ── Layout ─────────────────────────────────────────────────
  const COLS = 10, ROWS = 20;
  const CELL = 24;
  const BW   = COLS * CELL, BH = ROWS * CELL;
  const SW   = 112, P = 10;
  const CW   = P + SW + P + BW + P + SW + P;
  const CH   = BH + P * 2;
  const BX   = P + SW + P, BY = P;

  // ── Pieces ─────────────────────────────────────────────────
  const COLORS = {
    I:'#67e8f9', O:'#fde68a', T:'#c084fc',
    S:'#86efac', Z:'#f87171', J:'#93c5fd', L:'#fdba74',
  };
  const SHAPES = {
    I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O:[[1,1],[1,1]],
    T:[[0,1,0],[1,1,1],[0,0,0]],
    S:[[0,1,1],[1,1,0],[0,0,0]],
    Z:[[1,1,0],[0,1,1],[0,0,0]],
    J:[[1,0,0],[1,1,1],[0,0,0]],
    L:[[0,0,1],[1,1,1],[0,0,0]],
  };

  // SRS wall kicks
  const WK = {
    JLSTZ:{
      '0>1':[[-1,0],[-1,-1],[0,2],[-1,2]],
      '1>2':[[1,0],[1,1],[0,-2],[1,-2]],
      '2>3':[[1,0],[1,-1],[0,2],[1,2]],
      '3>0':[[-1,0],[-1,1],[0,-2],[-1,-2]],
      '1>0':[[1,0],[1,1],[0,-2],[1,-2]],
      '2>1':[[-1,0],[-1,-1],[0,2],[-1,2]],
      '3>2':[[-1,0],[-1,1],[0,-2],[-1,-2]],
      '0>3':[[1,0],[1,-1],[0,2],[1,2]],
    },
    I:{
      '0>1':[[-2,0],[1,0],[-2,1],[1,-2]],
      '1>2':[[-1,0],[2,0],[-1,-2],[2,1]],
      '2>3':[[2,0],[-1,0],[2,-1],[-1,2]],
      '3>0':[[1,0],[-2,0],[1,2],[-2,-1]],
      '1>0':[[2,0],[-1,0],[2,-1],[-1,2]],
      '2>1':[[1,0],[-2,0],[1,2],[-2,-1]],
      '3>2':[[-2,0],[1,0],[-2,1],[1,-2]],
      '0>3':[[-1,0],[2,0],[-1,-2],[2,1]],
    },
  };

  // ── State ──────────────────────────────────────────────────
  let board   = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  let current = null, ghost = null, held = null, canHold = true;
  let bag = [], queue = [];
  let score = 0, level = 1, lines = 0, combo = 0;
  let state   = 'playing'; // playing | clearing | paused | gameover
  let clearingRows = [], clearStart = 0;
  let dropAcc = 0, lastTs = 0;
  let lockTimer = null;
  let dasTimeout = null, dasInterval = null, dasDir = 0;
  let rafId;
  let highScore = parseInt(localStorage.getItem('shu-tetris-hs') || '0');

  // ── DOM ────────────────────────────────────────────────────
  inputLine.style.display = 'none';

  const wrap   = document.createElement('div');
  wrap.className = 'tetris-wrap';
  output.appendChild(wrap);

  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  canvas.className = 'tetris-canvas';
  wrap.appendChild(canvas);

  const hint = document.createElement('div');
  hint.className = 'tetris-hint';
  hint.textContent = '← → Déplacer  ·  ↑ / X Rotation CW  ·  Z Anti-horaire  ·  ↓ Soft drop  ·  ESPACE Hard drop  ·  C Hold  ·  P Pause  ·  ESC Quitter  ·  R Rejouer';
  wrap.appendChild(hint);

  const ctx = canvas.getContext('2d');

  // ── 7-bag RNG ──────────────────────────────────────────────
  function refill() {
    const t = Object.keys(SHAPES);
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    bag.push(...t);
  }

  function pull() { if (bag.length < 7) refill(); return bag.shift(); }

  function makePiece(type) {
    return {
      type, rot: 0,
      color: COLORS[type],
      shape: SHAPES[type].map(r => [...r]),
      x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
      y: type === 'I' ? -1 : 0,
    };
  }

  function init() {
    refill(); refill();
    for (let i = 0; i < 5; i++) queue.push(pull());
    current = makePiece(queue.shift()); queue.push(pull());
    calcGhost();
  }

  // ── Collision ──────────────────────────────────────────────
  function fits(p, dx = 0, dy = 0, sh = p.shape) {
    for (let r = 0; r < sh.length; r++)
      for (let c = 0; c < sh[r].length; c++) {
        if (!sh[r][c]) continue;
        const nx = p.x + c + dx, ny = p.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
    return true;
  }

  // ── Rotation ───────────────────────────────────────────────
  function rotShape(sh, dir) {
    const R = sh.length, C = sh[0].length;
    const out = Array.from({length: C}, () => Array(R).fill(0));
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++)
        dir === 1 ? out[c][R-1-r] = sh[r][c] : out[C-1-c][r] = sh[r][c];
    return out;
  }

  function tryRotate(dir) {
    const nsh = rotShape(current.shape, dir);
    const nr  = ((current.rot + dir) + 4) % 4;
    const key = `${current.rot}>${nr}`;
    if (fits(current, 0, 0, nsh)) { applyRot(nsh, nr, 0, 0); return; }
    const kicks = (WK[current.type === 'I' ? 'I' : 'JLSTZ'] || {})[key] || [];
    for (const [kx, ky] of kicks)
      if (fits(current, kx, ky, nsh)) { applyRot(nsh, nr, kx, ky); return; }
  }

  function applyRot(sh, rot, dx, dy) {
    current.shape = sh; current.rot = rot;
    current.x += dx; current.y += dy;
    resetLock(); calcGhost();
    if (!fits(current, 0, 1)) scheduleLock();
  }

  // ── Ghost ──────────────────────────────────────────────────
  function calcGhost() {
    ghost = { ...current, shape: current.shape.map(r => [...r]) };
    while (fits(ghost, 0, 1)) ghost.y++;
  }

  // ── Movement ───────────────────────────────────────────────
  function move(dx) {
    if (!fits(current, dx, 0)) return;
    current.x += dx; calcGhost(); resetLock();
    if (!fits(current, 0, 1)) scheduleLock();
  }

  function softDrop() {
    if (!fits(current, 0, 1)) return;
    current.y++; score++; dropAcc = 0; calcGhost();
    if (!fits(current, 0, 1)) scheduleLock();
  }

  function hardDrop() {
    let n = 0;
    while (fits(current, 0, 1)) { current.y++; n++; }
    score += n * 2; resetLock(); lock();
  }

  function hold() {
    if (!canHold) return;
    const t = current.type;
    if (held) { current = makePiece(held); }
    else      { current = makePiece(queue.shift()); queue.push(pull()); }
    held = t; canHold = false; calcGhost();
  }

  // ── Lock ───────────────────────────────────────────────────
  function resetLock()    { clearTimeout(lockTimer); lockTimer = null; }
  function scheduleLock() { if (!lockTimer) lockTimer = setTimeout(() => { lockTimer = null; lock(); }, 500); }

  function lock() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) {
          const ny = current.y + r, nx = current.x + c;
          if (ny < 0) { gameOver(); return; }
          board[ny][nx] = current.color;
        }
    checkClears();
  }

  function checkClears() {
    clearingRows = [];
    for (let r = ROWS - 1; r >= 0; r--)
      if (board[r].every(c => c !== null)) clearingRows.push(r);

    if (clearingRows.length) { state = 'clearing'; clearStart = performance.now(); }
    else spawn();
  }

  function applyClears() {
    const n = clearingRows.length;
    const base = [0, 100, 300, 500, 800][n];
    const comboBonus = combo > 0 ? combo * 50 : 0;
    score  += (base + comboBonus) * level;
    lines  += n;
    combo   = n > 0 ? combo + 1 : 0;
    level   = Math.floor(lines / 10) + 1;
    if (score > highScore) { highScore = score; localStorage.setItem('shu-tetris-hs', highScore); }
    for (const r of [...clearingRows].sort((a, b) => b - a)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
    }
    clearingRows = [];
    spawn();
  }

  function spawn() {
    canHold = true;
    current = makePiece(queue.shift()); queue.push(pull());
    calcGhost(); dropAcc = 0;
    if (!fits(current, 0, 0)) gameOver();
  }

  function gameOver() {
    state = 'gameover';
    cancelAnimationFrame(rafId);
    if (score > highScore) { highScore = score; localStorage.setItem('shu-tetris-hs', highScore); }
    draw();
  }

  function dropMs() { return Math.max(40, 1000 - (level - 1) * 88); }

  // ── Game loop ──────────────────────────────────────────────
  function loop(ts) {
    const dt = ts - lastTs; lastTs = ts;

    if (state === 'playing') {
      dropAcc += dt;
      if (dropAcc >= dropMs()) {
        dropAcc = 0;
        if (fits(current, 0, 1)) { current.y++; calcGhost(); if (!fits(current, 0, 1)) scheduleLock(); }
      }
      draw();
    } else if (state === 'clearing') {
      const p = Math.min((ts - clearStart) / 380, 1);
      if (p >= 1) { applyClears(); state === 'playing' ? draw() : null; }
      else drawClearAnim(p);
    }

    if (state !== 'gameover') rafId = requestAnimationFrame(loop);
  }

  // ── Drawing ────────────────────────────────────────────────
  function drawCell(x, y, color, alpha = 1, s = CELL) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 1, y + 1, s - 2, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 1, y + s - 4, s - 2, 3);
    ctx.globalAlpha = 1;
  }

  function drawMini(type, cx, cy, cs = 14) {
    if (!type) return;
    const sh = SHAPES[type], rows = sh.length, cols = sh[0].length;
    const ox = cx - (cols * cs) / 2, oy = cy - (rows * cs) / 2;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (sh[r][c]) drawCell(ox + c * cs, oy + r * cs, COLORS[type], 1, cs);
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(168,85,247,0.05)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(168,85,247,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawLabel(txt, x, y, color = '#6b5a8e', sz = 9) {
    ctx.fillStyle = color;
    ctx.font = `700 ${sz}px JetBrains Mono, monospace`;
    ctx.letterSpacing = '0.08em';
    ctx.fillText(txt, x, y);
    ctx.letterSpacing = '0';
  }

  function drawSides() {
    // ── Left: HOLD ──────────────────────────────────────────
    drawPanel(P, BY, SW, 80);
    drawLabel('HOLD', P + 8, BY + 14);
    drawMini(held, P + SW / 2, BY + 50);

    // ── Right ────────────────────────────────────────────────
    const RX = BX + BW + P;

    // NEXT
    drawPanel(RX, BY, SW, 220);
    drawLabel('NEXT', RX + 8, BY + 14);
    queue.slice(0, 4).forEach((t, i) => drawMini(t, RX + SW / 2, BY + 46 + i * 52));

    // Stats
    const stats = [
      { lbl: 'SCORE', val: String(score).padStart(8, '0'), col: '#c084fc' },
      { lbl: 'LEVEL', val: String(level),                  col: '#fde68a' },
      { lbl: 'LINES', val: String(lines),                  col: '#86efac' },
      { lbl: 'BEST',  val: String(highScore).padStart(8,'0'), col:'#5a4a7a' },
    ];
    stats.forEach(({ lbl, val, col }, i) => {
      const sy = BY + 230 + i * 56;
      drawPanel(RX, sy, SW, 48);
      drawLabel(lbl, RX + 8, sy + 14);
      ctx.fillStyle = col;
      ctx.font = `700 ${val.length > 7 ? 11 : 14}px JetBrains Mono, monospace`;
      ctx.fillText(val, RX + 8, sy + 36);
    });

    // Combo flash
    if (combo > 1) {
      ctx.fillStyle = '#f0abfc';
      ctx.font = `700 12px JetBrains Mono, monospace`;
      ctx.fillText(`COMBO ×${combo}!`, P + 2, BY + BH - 8);
    }
  }

  function drawBoard() {
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(BX, BY, BW, BH);

    // Grid lines
    ctx.strokeStyle = 'rgba(107,33,168,0.1)'; ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(BX + c * CELL, BY); ctx.lineTo(BX + c * CELL, BY + BH); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(BX, BY + r * CELL); ctx.lineTo(BX + BW, BY + r * CELL); ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c]) drawCell(BX + c * CELL, BY + r * CELL, board[r][c]);

    // Ghost
    if (ghost && state === 'playing') {
      for (let r = 0; r < ghost.shape.length; r++)
        for (let c = 0; c < ghost.shape[r].length; c++)
          if (ghost.shape[r][c]) {
            const gx = BX + (ghost.x + c) * CELL, gy = BY + (ghost.y + r) * CELL;
            if (gy + CELL > BY) {
              ctx.strokeStyle = current.color; ctx.lineWidth = 1.5;
              ctx.globalAlpha = 0.28;
              ctx.strokeRect(gx + 2, gy + 2, CELL - 4, CELL - 4);
              ctx.globalAlpha = 1;
            }
          }
    }

    // Current piece
    if (current && state !== 'gameover') {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) {
            const px = BX + (current.x + c) * CELL, py = BY + (current.y + r) * CELL;
            if (py + CELL > BY) drawCell(px, py, current.color);
          }
    }

    // Border glow
    ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 16;
    ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 2;
    ctx.strokeRect(BX, BY, BW, BH);
    ctx.shadowBlur = 0;
  }

  function drawClearAnim(p) {
    ctx.clearRect(0, 0, CW, CH);
    drawSides();
    drawBoard();
    const flash = Math.floor(p * 10) % 2 === 0;
    for (const r of clearingRows) {
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.88)' : 'rgba(192,132,252,0.55)';
      ctx.fillRect(BX + 1, BY + r * CELL + 1, BW - 2, CELL - 2);
    }
  }

  function drawOverlay(title, sub) {
    ctx.fillStyle = 'rgba(5,0,16,0.9)';
    ctx.fillRect(BX + 2, BY + 2, BW - 4, BH - 4);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#f0abfc'; ctx.font = 'bold 22px JetBrains Mono, monospace';
    ctx.fillText(title, BX + BW / 2, BY + BH / 2 - 18);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6b5a8e'; ctx.font = '11px JetBrains Mono, monospace';
    sub.split('\n').forEach((l, i) => ctx.fillText(l, BX + BW / 2, BY + BH / 2 + 12 + i * 20));
    ctx.textAlign = 'left';
  }

  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawSides();
    drawBoard();
    if (state === 'paused')
      drawOverlay('PAUSE', 'P pour reprendre');
    if (state === 'gameover')
      drawOverlay('GAME OVER', `Score : ${score}\n\nR pour rejouer   ESC pour quitter`);
  }

  // ── Input ──────────────────────────────────────────────────
  function kd(e) {
    if (state === 'gameover') {
      if (e.key === 'r' || e.key === 'R') { cleanup(); cmdTetris(); return; }
      if (e.key === 'Escape')             { quit(); return; }
      return;
    }
    if (e.key === 'Escape') { quit(); return; }
    if (e.key === 'p' || e.key === 'P') {
      if (state === 'clearing') return;
      state = state === 'paused' ? 'playing' : 'paused';
      if (state === 'playing') { lastTs = performance.now(); rafId = requestAnimationFrame(loop); }
      else { cancelAnimationFrame(rafId); draw(); }
      return;
    }
    if (state !== 'playing') return;

    switch (e.key) {
      case 'ArrowLeft':  move(-1); startDAS(-1); e.preventDefault(); break;
      case 'ArrowRight': move(1);  startDAS(1);  e.preventDefault(); break;
      case 'ArrowDown':  softDrop(); e.preventDefault(); break;
      case 'ArrowUp':
      case 'x': case 'X': tryRotate(1);  e.preventDefault(); break;
      case 'z': case 'Z': tryRotate(-1); e.preventDefault(); break;
      case ' ':  hardDrop(); e.preventDefault(); break;
      case 'c': case 'C': hold(); break;
    }
  }

  function ku(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopDAS();
  }

  function startDAS(d) {
    stopDAS(); dasDir = d;
    dasTimeout  = setTimeout(() => {
      dasInterval = setInterval(() => { if (state === 'playing') move(dasDir); }, 40);
    }, 160);
  }
  function stopDAS() { clearTimeout(dasTimeout); clearInterval(dasInterval); }

  function quit() {
    cleanup();
    const cmdInput = document.getElementById('cmd-input');
    const ln = (t, c) => {
      const s = document.createElement('span');
      s.className = 'ln' + (c ? ' ' + c : '');
      s.innerHTML = t + '\n';
      output.appendChild(s);
    };
    ln('');
    ln(`  Tetris terminé  ·  score : ${score}  ·  meilleur : ${highScore}`, 'dim');
    ln('');
    inputLine.style.display = 'flex';
    cmdInput.focus();
    termBody.scrollTop = termBody.scrollHeight;
  }

  function cleanup() {
    cancelAnimationFrame(rafId);
    clearTimeout(lockTimer);
    stopDAS();
    document.removeEventListener('keydown', kd);
    document.removeEventListener('keyup', ku);
  }

  document.addEventListener('keydown', kd);
  document.addEventListener('keyup', ku);

  init();
  lastTs = performance.now();
  rafId  = requestAnimationFrame(loop);
  termBody.scrollTop = termBody.scrollHeight;
}
