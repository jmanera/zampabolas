// Zampabolas: bucle del juego, controles, menús, sonidos y récords.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const D = ZBDibujo, MUNDOS = window.ZBMundos, MAZES = window.ZBLaberintos;
  const SKIN_IDS = Object.keys(D.SKINS);

  // ---------- Ajustes y récords ----------
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const cfg = Object.assign({ skin: 'clasico', mundo: 'clasico', diff: 'normal', sound: true, pad: false }, load('zb.cfg', {}));
  const records = load('zb.records', {}); // {mundo: [{score, level, skin, diff, date}]}
  const mundoOf = id => MUNDOS.find(m => m.id === id) || MUNDOS[0];

  // ---------- Partida ----------
  let G = null, W = null; // juego y mundo actuales
  let paused = false, modalOpen = false, playing = false;
  let mazeImg = null, mazeKey = '';
  let popups = []; // puntos flotantes
  let parts = null;
  let flashT = 0;

  function newGame(start) {
    W = mundoOf(cfg.mundo);
    G = new ZBMotor.Game({ mazes: W.laberintos.map(n => MAZES[n]), difficulty: cfg.diff });
    mazeKey = ''; popups = []; flashT = 0;
    playing = !!start;
    paused = false;
    if (start) beepSeq([[523, 0.1], [659, 0.1], [784, 0.1], [659, 0.1], [880, 0.22]], 0.13);
    hud();
  }

  // ---------- Geometría y dibujo ----------
  const cv = $('cv'), ctx = cv.getContext('2d');
  let geo = null;
  function layout() {
    const r = $('stage').getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    if (!G) return;
    const m = G.maze, pad = 8;
    const cs = Math.floor(Math.min((r.width - pad * 2) / m.W, (r.height - pad * 2) / m.H));
    if (cs < 4) { geo = null; return; }
    geo = { cs, x0: Math.round((r.width - cs * m.W) / 2), y0: Math.round((r.height - cs * m.H) / 2), dpr, w: r.width, h: r.height };
    mazeKey = '';
    parts = D.makeParticles(W.particulas, r.width, r.height);
  }

  function draw(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070a1a'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!G || !geo) return;
    const { cs, x0, y0, dpr } = geo, m = G.maze, t = performance.now() / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const key = `${W.id}|${G.level}|${cs}|${dpr}`;
    if (key !== mazeKey) { mazeImg = D.mazeCanvas(G, W, cs, dpr); mazeKey = key; }
    ctx.drawImage(mazeImg, x0, y0, m.W * cs, m.H * cs);
    // nivel superado: los muros parpadean
    if (G.phase === 'clear' && Math.floor(t * 5) % 2) { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x0, y0, m.W * cs, m.H * cs); }
    if (paused) { overlayText('EN PAUSA', W.colores.texto); return; }

    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, m.W * cs, m.H * cs); ctx.clip();
    const px = x => x0 + (x + 0.5) * cs, py = y => y0 + (y + 0.5) * cs;
    // bolitas
    ctx.fillStyle = W.colores.bolita;
    for (const i of m.dots) { const x = i % m.W, y = (i - x) / m.W; ctx.beginPath(); ctx.arc(px(x), py(y), cs * 0.12, 0, Math.PI * 2); ctx.fill(); }
    for (const i of m.powers) {
      const x = i % m.W, y = (i - x) / m.W;
      if (G.phase !== 'play' || Math.floor(t * 4) % 4 !== 0) D.item(ctx, W.grande, px(x), py(y), cs * 0.62, t);
    }
    if (G.bonus) {
      const blink = G.bonus.t < 2 && Math.floor(t * 8) % 2;
      if (!blink) D.item(ctx, W.premios[Math.min(W.premios.length - 1, G.level - 1)], px(G.bonus.x), py(G.bonus.y), cs * 0.75, t);
    }
    // perseguidores (también al otro lado del túnel cuando cruzan)
    const both = (x, fn) => { fn(x); if (x < 0.5) fn(x + m.W); else if (x > m.W - 1.5) fn(x - m.W); };
    if (G.phase !== 'dying' || G.phaseT > 1.6) {
      for (const e of G.enemies) {
        const col = W.perseguidores[e.k].color;
        both(e.x, x => D.enemy(ctx, W.perseguidor, col, px(x), py(e.y), cs * 0.68, e, t));
      }
    }
    // Zampa
    const p = G.player;
    const dying = G.phase === 'dying' ? Math.min(1, (2 - G.phaseT) / 1.6) : null;
    if (G.phase !== 'over') both(p.x, x => D.player(ctx, cfg.skin, px(x), py(p.y), cs * 0.66, p.dir, p.mouth, dying));
    ctx.restore();

    // puntos flotantes
    popups = popups.filter(q => (q.t -= dt) > 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const q of popups) {
      ctx.font = `900 ${Math.round(cs * 0.6)}px system-ui, sans-serif`;
      ctx.fillStyle = q.color; ctx.globalAlpha = Math.min(1, q.t * 2);
      ctx.fillText(q.text, px(q.x), py(q.y) - (1.2 - q.t) * cs * 0.8);
      ctx.globalAlpha = 1;
    }
    D.particles(ctx, parts, dt);
    if (G.phase === 'ready') overlayText(G.level === 1 ? '¡PREPARADOS!' : `NIVEL ${G.level}`, '#ffd43b');
    if (G.phase === 'over') overlayText('FIN DE LA PARTIDA', '#ff6b6b');
  }

  function overlayText(text, color) {
    const { cs, x0, y0 } = geo, m = G.maze;
    const y = y0 + (m.E[1] + 4.5) * cs;
    ctx.font = `900 ${Math.round(cs * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = cs * 0.25; ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.strokeText(text, x0 + m.W * cs / 2, y);
    ctx.fillStyle = color; ctx.fillText(text, x0 + m.W * cs / 2, y);
  }

  // ---------- Bucle ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (G && playing && !paused && !modalOpen) {
      // pasos pequeños para que el movimiento sea estable
      let rest = dt;
      while (rest > 1e-4) {
        const st = Math.min(rest, 1 / 60);
        G.update(st);
        handle(G.events);
        rest -= st;
        if (!playing) break;
      }
    }
    draw(dt);
    requestAnimationFrame(frame);
  }

  let dotTone = 0, lastDot = 0;
  function handle(events) {
    for (const ev of events) {
      if (ev === 'dot') {
        const n = performance.now();
        if (n - lastDot > 70) { beep(dotTone ? 420 : 560, 0.04, 0, 'square', 0.04); dotTone ^= 1; lastDot = n; }
      } else if (ev === 'power') sweep(300, 900, 0.3);
      else if (ev === 'bonusUp') beepSeq([[880, 0.06], [1175, 0.08]], 0.08);
      else if (ev === 'death') { sweep(700, 90, 1.3); }
      else if (ev === 'clear') beepSeq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], 0.12);
      else if (ev === 'level') { mazeKey = ''; }
      else if (ev === 'extra') { beepSeq([[988, 0.08], [988, 0.08], [1319, 0.15]], 0.1); toast('¡Vida extra!'); }
      else if (ev === 'gameover') { gameOver(); }
      else if (ev.type === 'eatEnemy') {
        popups.push({ x: ev.x, y: ev.y, text: ev.points, color: '#66d9e8', t: 1.2 });
        beepSeq([[400, 0.05], [600, 0.05], [900, 0.08]], 0.05);
      } else if (ev.type === 'bonus') {
        popups.push({ x: ev.x, y: ev.y, text: ev.points, color: '#ffd43b', t: 1.4 });
        beepSeq([[784, 0.06], [1047, 0.12]], 0.07);
      }
    }
    if (events.length) hud();
  }

  // ---------- Marcador ----------
  function best() { const r = records[W.id]; return r && r.length ? r[0].score : 0; }
  let livesShown = -1, livesSkin = '';
  function hud() {
    if (!G) return;
    $('sScore').textContent = G.score;
    $('sBest').textContent = Math.max(best(), G.score);
    $('sLevel').textContent = G.level;
    const n = Math.max(0, G.lives - (G.phase === 'over' ? 0 : 1)); // la que se está jugando no se cuenta
    if (n !== livesShown || livesSkin !== cfg.skin) {
      livesShown = n; livesSkin = cfg.skin;
      const box = $('lives'); box.innerHTML = '';
      for (let k = 0; k < Math.min(5, n); k++) box.appendChild(miniSkin(cfg.skin, 26));
    }
  }
  function miniSkin(skin, size, dir) {
    const c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
    c.width = c.height = size * dpr; c.style.width = c.style.height = size + 'px';
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    D.player(x, skin, size / 2, size * 0.56, size * 0.34, dir || 'right', 0.9, null);
    return c;
  }

  function gameOver() {
    playing = false;
    const list = records[W.id] = records[W.id] || [];
    const entry = { score: G.score, level: G.level, skin: cfg.skin, diff: cfg.diff, date: new Date().toISOString().slice(0, 10) };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const pos = list.indexOf(entry);
    records[W.id] = list.slice(0, 5);
    save('zb.records', records);
    const isBest = pos === 0 && G.score > 0;
    setTimeout(() => {
      sheet(`<h2>Fin de la partida</h2>
        <div class="res">
          <div><b>${G.score}</b><small>Puntos</small>${isBest ? '<em>¡Nuevo récord!</em>' : pos < 5 && G.score > 0 ? `<em>Puesto ${pos + 1} en ${esc(W.nombre)}</em>` : ''}</div>
          <div><b>${G.level}</b><small>Nivel</small></div>
          <div><b>${best()}</b><small>Récord</small></div>
        </div>
        <div class="row-btns center"><button class="btn" data-a="start">Cambiar personaje o mundo</button>
        <button class="btn primary big" data-a="again">Otra partida</button></div>`);
    }, 1200);
    hud();
  }

  // ---------- Controles ----------
  function setDir(d) { if (G && playing && !paused) G.setDir(d); }
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  document.addEventListener('keydown', e => {
    if (modalOpen) { if (e.key === 'Escape' && playing) closeSheet(); return; }
    if (KEYS[e.key]) { setDir(KEYS[e.key]); e.preventDefault(); return; }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape' || e.key === ' ') { if (playing) setPause(!paused); e.preventDefault(); }
  });
  // deslizar el dedo por la pantalla (se puede encadenar giros sin levantarlo)
  let sw = null;
  $('stage').addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; if (paused && playing) setPause(false); });
  window.addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) < 18) return;
    setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    sw.x = e.clientX; sw.y = e.clientY;
  });
  window.addEventListener('pointerup', () => { sw = null; });
  window.addEventListener('pointercancel', () => { sw = null; });
  $('pad').addEventListener('pointerdown', e => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    setDir(b.dataset.d);
    b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 150);
  });

  function setPause(v) {
    if (!playing) v = false;
    paused = v;
  }

  // ---------- Ventanas ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function sheet(html) {
    $('sheet').innerHTML = html;
    $('modal').classList.add('show');
    $('sheet').scrollTop = 0;
    modalOpen = true;
    // dibujar las vistas previas
    document.querySelectorAll('#sheet canvas[data-skin]').forEach(c => c.replaceWith(Object.assign(miniSkin(c.dataset.skin, 76, 'right'), { className: '' })));
    document.querySelectorAll('#sheet canvas[data-mundo]').forEach(drawMundoPreview);
  }
  function closeSheet() { $('modal').classList.remove('show'); modalOpen = false; last = performance.now(); }
  $('modal').addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b) action(b.dataset.a, b);
  });

  function drawMundoPreview(c) {
    const M = mundoOf(c.dataset.mundo), dpr = window.devicePixelRatio || 1, w = 130, h = 76;
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    x.fillStyle = M.colores.fondo; D.roundRect(x, 0, w, h, 10); x.fill();
    x.fillStyle = M.colores.borde; x.fillRect(6, 6, w - 12, 8); x.fillRect(6, h - 14, w - 12, 8);
    x.fillStyle = M.colores.muro; x.fillRect(8, 8, w - 16, 4); x.fillRect(8, h - 12, w - 16, 4);
    if (M.muro === 'caramelo' || M.muro === 'barrera') { x.fillStyle = M.colores.raya; for (let k = 8; k < w - 8; k += 12) { x.fillRect(k, 6, 6, 8); x.fillRect(k, h - 14, 6, 8); } }
    if (M.muro === 'seto') { x.fillStyle = M.colores.hoja1; for (let k = 10; k < w - 8; k += 9) { x.beginPath(); x.arc(k, 10, 3, 0, 7); x.arc(k + 4, h - 10, 3, 0, 7); x.fill(); } }
    x.fillStyle = M.colores.bolita; for (let k = 14; k < 56; k += 10) { x.beginPath(); x.arc(k, h / 2, 2.2, 0, 7); x.fill(); }
    D.enemy(x, M.perseguidor, M.perseguidores[0].color, 98, h / 2 + 2, 15, { dir: 'left', state: 'active' }, 0.3);
    D.item(x, M.grande, 70, h / 2, 10, 0.2);
  }

  function startSheet() {
    playing = false;
    sheet(`<div class="logo">Zampabolas</div>
      <p class="tag">Cómete todas las bolitas sin que te pillen</p>
      <h3>Personaje</h3>
      <div class="picks">${SKIN_IDS.map(k => `<button class="pick ${cfg.skin === k ? 'cur' : ''}" data-a="skin" data-v="${k}"><canvas data-skin="${k}"></canvas><b>${D.SKINS[k].name}</b></button>`).join('')}</div>
      <h3>Mundo</h3>
      <div class="picks">${MUNDOS.map(M => `<button class="pick ${cfg.mundo === M.id ? 'cur' : ''}" data-a="mundo" data-v="${M.id}"><canvas data-mundo="${M.id}"></canvas><b>${esc(M.nombre)}</b><small>${esc(M.descripcion)}</small></button>`).join('')}</div>
      <h3>Dificultad</h3>
      <div class="seg">${Object.entries(ZBMotor.DIFF).map(([k, v]) => `<button data-a="diff" data-v="${k}" class="${cfg.diff === k ? 'on' : ''}">${v.name}</button>`).join('')}</div>
      <div class="row-btns">
        <button class="btn" data-a="records">Récords</button>
        <button class="btn" data-a="settings">Ajustes</button>
        <button class="btn" data-a="howto">Cómo se juega</button>
        <button class="btn primary big" data-a="go">¡A jugar!</button>
      </div>`);
  }

  function menuSheet() {
    if (playing) paused = true;
    sheet(`<h2>Menú</h2><div class="menu-list">
      ${playing ? '<button class="btn" data-a="resume">Seguir jugando</button>' : ''}
      <button class="btn" data-a="start">Nueva partida (personaje y mundo)</button>
      <button class="btn" data-a="records">Récords</button>
      <button class="btn" data-a="settings">Ajustes</button>
      <button class="btn" data-a="howto">Cómo se juega</button>
    </div><div class="row-btns"><button class="btn" data-a="resume">Cerrar</button></div>`);
  }

  function recordsSheet() {
    const tab = MUNDOS.map(M => {
      const list = records[M.id] || [];
      const rows = list.length ? list.map((r, k) => `<tr><td>${k + 1}</td><td>${r.score}</td><td>${r.level}</td><td>${esc(D.SKINS[r.skin] ? D.SKINS[r.skin].name : '')}</td><td>${esc(ZBMotor.DIFF[r.diff] ? ZBMotor.DIFF[r.diff].name : '')}</td><td>${r.date.split('-').reverse().join('/')}</td></tr>`).join('')
        : '<tr><td colspan="6" style="color:var(--muted)">Todavía no hay partidas</td></tr>';
      return `<h3>${esc(M.nombre)}</h3><table class="st"><tr><th>#</th><th>Puntos</th><th>Nivel</th><th>Personaje</th><th>Dificultad</th><th>Fecha</th></tr>${rows}</table>`;
    }).join('');
    sheet(`<h2>Récords</h2>${tab}
      <div class="row-btns"><button class="btn" data-a="resetRec">Borrar récords</button><button class="btn primary" data-a="back">Volver</button></div>`);
  }

  function settingsSheet() {
    const sw = (k, label, hint) => `<label class="set"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span>
      <input type="checkbox" class="switch" data-a="cfg" data-k="${k}" ${cfg[k] ? 'checked' : ''}></label>`;
    sheet(`<h2>Ajustes</h2>
      ${sw('sound', 'Sonido')}
      ${sw('pad', 'Cruceta en pantalla', 'Además de deslizar el dedo por el laberinto')}
      <div class="row-btns"><button class="btn primary" data-a="back">Hecho</button></div>`);
  }

  function howtoSheet() {
    sheet(`<h2>Cómo se juega</h2>
      <ul>
        <li>Lleva a Zampa por el laberinto y <b>cómete todas las bolitas</b> para pasar de nivel.</li>
        <li>Para moverte, <b>desliza el dedo</b> en cualquier parte del laberinto hacia donde quieras ir (o usa la cruceta, que se activa en Ajustes). Puedes girar antes de llegar al cruce: Zampa girará en cuanto pueda.</li>
        <li>Cuatro perseguidores te buscan, cada uno a su manera: uno va directo a por ti, otro intenta cortarte el paso, otro se acerca y se aparta, y otro va un poco despistado.</li>
        <li>Las <b>bolitas grandes</b> los asustan durante unos segundos: entonces puedes comértelos (200, 400, 800 y 1600 puntos seguidos). Cuando parpadean, se les está pasando el susto.</li>
        <li>Dos veces por nivel aparece un <b>premio</b> en la salida: cómetelo antes de que desaparezca.</li>
        <li>Los pasillos que salen por un lado aparecen por el otro.</li>
        <li>Empiezas con 3 vidas y ganas una más a los 10.000 puntos.</li>
      </ul>
      <p>Con teclado: flechas o WASD para moverse, P o Esc para pausar.</p>
      <div class="row-btns"><button class="btn primary" data-a="back">Entendido</button></div>`);
  }

  let returnTo = 'start';
  function action(a, el) {
    switch (a) {
      case 'skin': case 'mundo':
        cfg[a] = el.dataset.v; save('zb.cfg', cfg);
        document.querySelectorAll(`#sheet [data-a="${a}"]`).forEach(b => b.classList.toggle('cur', b === el));
        newGame(false); layout(); hud();
        break;
      case 'diff':
        cfg.diff = el.dataset.v; save('zb.cfg', cfg);
        el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
        break;
      case 'go': case 'again': closeSheet(); newGame(true); layout(); break;
      case 'start': returnTo = 'start'; startSheet(); break;
      case 'resume': closeSheet(); if (playing) paused = false; break;
      case 'records': returnTo = modalReturn(); recordsSheet(); break;
      case 'settings': returnTo = modalReturn(); settingsSheet(); break;
      case 'howto': returnTo = modalReturn(); howtoSheet(); save('zb.seenHelp', 1); break;
      case 'back': if (returnTo === 'start') startSheet(); else menuSheet(); break;
      case 'resetRec':
        if (confirm('¿Borrar todos los récords?')) { for (const k of Object.keys(records)) delete records[k]; save('zb.records', records); hud(); recordsSheet(); }
        break;
      case 'cfg': cfg[el.dataset.k] = el.checked; save('zb.cfg', cfg); applyCfg(); break;
    }
  }
  const modalReturn = () => (playing ? 'menu' : 'start');

  function applyCfg() {
    document.body.classList.toggle('nopad', !cfg.pad);
    requestAnimationFrame(() => { layout(); });
  }

  // ---------- Sonido (melodías propias, sintetizadas) ----------
  let audio = null;
  function ac() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } return audio; }
  function beep(freq, dur, delay, type, vol) {
    if (!cfg.sound || !ac()) return;
    const t = audio.currentTime + (delay || 0);
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(g).connect(audio.destination);
    o.start(t); o.stop(t + dur + 0.1);
  }
  function beepSeq(notes, gap) { notes.forEach(([f, d], k) => beep(f, d, k * gap)); }
  function sweep(f1, f2, dur) {
    if (!cfg.sound || !ac()) return;
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
  }

  let toastTimer = 0;
  function toast(t) {
    const el = $('toast');
    el.textContent = t; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- Eventos generales ----------
  $('bMenu').onclick = () => (playing ? menuSheet() : startSheet());
  $('bPause').onclick = () => { if (playing) setPause(!paused); };
  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) paused = true; });

  // Llamadas desde la app Android
  window.appBack = function () {
    if (modalOpen && playing) { closeSheet(); paused = false; return true; }
    if (modalOpen && $('sheet').querySelector('.logo')) return false;
    if (modalOpen) { action('back'); return true; }
    if (playing && !paused) { menuSheet(); return true; }
    if (playing && paused) { paused = false; return true; }
    startSheet(); return true;
  };
  window.appPause = function () { if (playing) paused = true; };

  // ---------- Arranque ----------
  applyCfg();
  newGame(false);
  layout();
  startSheet();
  if (!load('zb.seenHelp', 0)) { save('zb.seenHelp', 1); returnTo = 'start'; setTimeout(howtoSheet, 300); }
  requestAnimationFrame(frame);

  window.ZBDebug = { get G() { return G; }, newGame, action, setDir, get paused() { return paused; } };
})();
