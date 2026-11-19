// Dibujo de Zampabolas en canvas: personajes, perseguidores, objetos, muros y partículas.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  function ellipse(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  // ---------- Zampa ----------
  const SKINS = {
    clasico: { name: 'Zampa', body: '#ffc21a', feet: '#e8590c' },
    coletas: { name: 'Zampa con coletas', body: '#ff8fb8', feet: '#c2255c' },
    navidad: { name: 'Zampa navideño', body: '#ffc21a', feet: '#2b8a3e' },
  };

  // phase: animación de la boca y los pies; dying: 0..1 al perder una vida
  function player(ctx, skin, x, y, r, dir, phase, dying) {
    const S = SKINS[skin] || SKINS.clasico;
    const a = ANG[dir] || 0;
    const fx = dir === 'left' ? -1 : 1;
    let mouth = (0.06 + 0.3 * Math.abs(Math.sin(phase))) * Math.PI;
    let scale = 1;
    if (dying != null) { mouth = Math.min(Math.PI, 0.2 + dying * Math.PI); scale = 1 - Math.max(0, dying - 0.7) * 3; if (scale <= 0) return; }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineWidth = Math.max(1, r * 0.09);
    // pies
    if (dying == null) {
      const st = Math.sin(phase) * r * 0.16;
      ctx.fillStyle = S.feet;
      ellipse(ctx, -r * 0.38 + st, r * 0.86, r * 0.3, r * 0.17); ctx.fill();
      ellipse(ctx, r * 0.38 - st, r * 0.86, r * 0.3, r * 0.17); ctx.fill();
    }
    // accesorios detrás del cuerpo
    if (skin === 'coletas') {
      const bx = dir === 'up' || dir === 'down' ? 0 : -fx * r * 0.35;
      for (const s of [-1, 1]) {
        ctx.fillStyle = S.body; ctx.strokeStyle = shade(S.body, 0.7);
        circle(ctx, bx + s * r * 0.62, -r * 0.82, r * 0.3); ctx.fill(); ctx.stroke();
      }
    }
    // cuerpo con la boca abierta hacia donde mira
    ctx.fillStyle = S.body; ctx.strokeStyle = shade(S.body, 0.65);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a + mouth, a - mouth + TAU); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // ojo: arriba, hacia donde mira; mirando arriba o abajo, a un lado
    const ex = dir === 'up' ? r * 0.45 : dir === 'down' ? r * 0.3 : fx * r * 0.12;
    const ey = dir === 'up' ? r * 0.02 : dir === 'down' ? -r * 0.45 : -r * 0.5;
    if (dying == null || dying < 0.4) {
      ctx.fillStyle = '#fff'; ellipse(ctx, ex, ey, r * 0.2, r * 0.24); ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = shade(S.body, 0.5); ctx.stroke();
      const [px, py] = dir === 'up' ? [0, -1] : dir === 'down' ? [0, 1] : [fx, 0];
      ctx.fillStyle = '#1b1b1b'; circle(ctx, ex + px * r * 0.07, ey + py * r * 0.07, r * 0.11); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, ex + px * r * 0.07 - r * 0.04, ey + py * r * 0.07 - r * 0.05, r * 0.04); ctx.fill();
    }
    if (skin === 'coletas') {
      // lazos, pestañas y mejilla
      const bx = dir === 'up' || dir === 'down' ? 0 : -fx * r * 0.35;
      ctx.fillStyle = '#7b2ff7';
      for (const s of [-1, 1]) {
        const cx = bx + s * r * 0.4, cy = -r * 0.7;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - r * 0.2, cy - r * 0.14); ctx.lineTo(cx - r * 0.2, cy + r * 0.14); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.2, cy - r * 0.14); ctx.lineTo(cx + r * 0.2, cy + r * 0.14); ctx.closePath(); ctx.fill();
        circle(ctx, cx, cy, r * 0.07); ctx.fill();
      }
      if (dying == null) {
        ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = Math.max(1, r * 0.05);
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ex + k * r * 0.1, ey - r * 0.22); ctx.lineTo(ex + k * r * 0.16, ey - r * 0.36); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,80,120,.45)';
        circle(ctx, dir === 'up' ? r * 0.2 : dir === 'down' ? -r * 0.35 : -fx * r * 0.25, dir === 'down' ? -r * 0.2 : r * 0.1, r * 0.13); ctx.fill();
      }
    }
    if (skin === 'navidad') {
      // gorro de Papá Noel, caído hacia atrás
      const back = dir === 'up' || dir === 'down' ? -1 : -fx;
      ctx.save();
      ctx.translate(dir === 'up' ? -r * 0.35 : 0, dir === 'up' ? r * 0.15 : 0);
      ctx.fillStyle = '#e03131'; ctx.strokeStyle = '#a61e1e'; ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, -r * 0.72);
      ctx.quadraticCurveTo(-r * 0.1, -r * 1.75, back * r * 0.95, -r * 1.25);
      ctx.quadraticCurveTo(r * 0.2, -r * 1.25, r * 0.62, -r * 0.72);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.74, r * 0.7, r * 0.17, 0, 0, TAU); ctx.fill();
      circle(ctx, back * r * 0.98, -r * 1.22, r * 0.18); ctx.fill();
      ctx.restore();
      // bufanda
      if (dying == null) {
        ctx.fillStyle = '#2b8a3e';
        ellipse(ctx, -fx * r * 0.2, r * 0.62, r * 0.55, r * 0.14, -fx * 0.25); ctx.fill();
        ctx.fillStyle = '#fff'; ellipse(ctx, -fx * r * 0.2, r * 0.62, r * 0.1, r * 0.1); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- Perseguidores ----------
  // e: {dir, fright, flash, state}; t: segundos
  function enemy(ctx, style, color, x, y, r, e, t) {
    const eyesOnly = e.state === 'eaten';
    const scared = e.fright && !eyesOnly;
    const white = scared && e.flash && Math.floor(t * 6) % 2 === 0;
    const body = scared ? (white ? '#f1f3ff' : '#4c6ef5') : color;
    const [lx, ly] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[e.dir] || [0, 0];
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = Math.max(1, r * 0.08);
    if (!eyesOnly) {
      if (style === 'coche') car(ctx, body, r, e.dir, t);
      else if (style === 'duende') elf(ctx, body, r, t, scared);
      else if (style === 'avispa') wasp(ctx, body, r, t, scared);
      else bug(ctx, body, r, t);
    }
    // ojos
    const ey = style === 'duende' ? r * 0.05 : style === 'avispa' ? -r * 0.12 : -r * 0.18;
    if (scared) {
      ctx.fillStyle = white ? '#e03131' : '#fff';
      circle(ctx, -r * 0.3, ey, r * 0.12); ctx.fill();
      circle(ctx, r * 0.3, ey, r * 0.12); ctx.fill();
      ctx.strokeStyle = white ? '#e03131' : '#fff'; ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const px = -r * 0.45 + k * r * 0.15, py = r * 0.35 + (k % 2 ? -1 : 1) * r * 0.08; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    } else {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#fff'; ellipse(ctx, s * r * 0.3, ey, r * 0.23, r * 0.28); ctx.fill();
        ctx.fillStyle = eyesOnly ? '#1c7ed6' : '#141414';
        circle(ctx, s * r * 0.3 + lx * r * 0.1, ey + ly * r * 0.12, r * 0.12); ctx.fill();
      }
    }
    ctx.restore();
  }

  function bug(ctx, col, r, t) {
    // antenas
    ctx.strokeStyle = shade(col, 0.6);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.7); ctx.quadraticCurveTo(s * r * 0.45, -r * 1.05, s * r * (0.55 + 0.05 * Math.sin(t * 8)), -r * 1.08); ctx.stroke();
      ctx.fillStyle = col; circle(ctx, s * r * (0.55 + 0.05 * Math.sin(t * 8)), -r * 1.08, r * 0.13); ctx.fill();
    }
    // cuerpo redondeado con patitas
    ctx.fillStyle = col; ctx.strokeStyle = shade(col, 0.6);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r * 0.82, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const st = Math.sin(t * 12) * r * 0.08;
    for (const s of [-1, 0, 1]) { ellipse(ctx, s * r * 0.5 + (s ? st * s : -st), r * 0.82, r * 0.17, r * 0.12); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ellipse(ctx, -r * 0.35, -r * 0.45, r * 0.25, r * 0.13, -0.5); ctx.fill();
  }

  function elf(ctx, col, r, t, scared) {
    const skin = scared ? col : '#f8c99c';
    // orejas
    ctx.fillStyle = skin;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.7, -r * 0.1); ctx.lineTo(s * r * 1.08, -r * 0.35); ctx.lineTo(s * r * 0.72, r * 0.25); ctx.closePath(); ctx.fill(); }
    // cara
    ctx.strokeStyle = shade(scared ? col : '#f8c99c', 0.7);
    circle(ctx, 0, r * 0.12, r * 0.78); ctx.fill(); ctx.stroke();
    if (!scared) { ctx.fillStyle = 'rgba(230,60,60,.35)'; circle(ctx, -r * 0.45, r * 0.4, r * 0.13); ctx.fill(); circle(ctx, r * 0.45, r * 0.4, r * 0.13); ctx.fill(); }
    // gorro puntiagudo
    const sw = Math.sin(t * 5) * r * 0.15;
    ctx.fillStyle = scared ? '#dbe4ff' : col; ctx.strokeStyle = shade(scared ? '#4c6ef5' : col, 0.6);
    ctx.beginPath(); ctx.moveTo(-r * 0.82, -r * 0.2); ctx.quadraticCurveTo(-r * 0.2, -r * 1.2, r * 0.55 + sw, -r * 1.25); ctx.quadraticCurveTo(r * 0.3, -r * 0.8, r * 0.82, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ellipse(ctx, 0, -r * 0.22, r * 0.85, r * 0.15); ctx.fill();
    circle(ctx, r * 0.6 + sw, -r * 1.25, r * 0.15); ctx.fill();
  }

  function wasp(ctx, col, r, t, scared) {
    // alas
    const f = 0.6 + 0.4 * Math.abs(Math.sin(t * 30));
    ctx.fillStyle = 'rgba(230,245,255,.75)'; ctx.strokeStyle = 'rgba(120,140,170,.8)';
    for (const s of [-1, 1]) { ellipse(ctx, s * r * 0.5, -r * 0.75, r * 0.3, r * 0.5 * f, s * 0.6); ctx.fill(); ctx.stroke(); }
    // cuerpo con rayas
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.85, r * 0.78, 0, 0, TAU);
    ctx.fillStyle = scared ? col : '#ffd43b'; ctx.fill();
    ctx.clip();
    ctx.fillStyle = scared ? '#dbe4ff' : '#212121';
    for (const yy of [0.25, 0.62]) ctx.fillRect(-r, yy * r, 2 * r, r * 0.18);
    ctx.restore();
    ctx.strokeStyle = shade(scared ? col : '#ffd43b', 0.55);
    ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.85, r * 0.78, 0, 0, TAU); ctx.stroke();
    // diadema del color de cada avispa
    if (!scared) { ctx.fillStyle = col; ctx.fillRect(-r * 0.62, -r * 0.62, r * 1.24, r * 0.16); }
    // aguijón
    ctx.fillStyle = scared ? col : '#212121';
    ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.8); ctx.lineTo(0, r * 1.08); ctx.lineTo(r * 0.12, r * 0.8); ctx.fill();
  }

  function car(ctx, col, r, dir, t) {
    ctx.save();
    ctx.rotate((ANG[dir] || 0) + Math.PI / 2); // el coche mira hacia arriba en su propio sistema
    const w = r * 1.25, h = r * 1.85;
    // ruedas
    ctx.fillStyle = '#111';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ctx.fillRect(sx * w * 0.5 - (sx > 0 ? 0 : r * 0.22), sy * h * 0.28 - r * 0.2, r * 0.22, r * 0.4);
    // carrocería
    ctx.fillStyle = col; ctx.strokeStyle = shade(col, 0.55);
    roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.35); ctx.fill(); ctx.stroke();
    // parabrisas y alerón
    ctx.fillStyle = 'rgba(20,30,50,.75)';
    roundRect(ctx, -w * 0.38, -h * 0.3, w * 0.76, h * 0.28, r * 0.12); ctx.fill();
    ctx.fillStyle = shade(col, 0.7); ctx.fillRect(-w * 0.55, h * 0.4, w * 1.1, r * 0.16);
    // franja
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-r * 0.08, h * 0.02, r * 0.16, h * 0.36);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- Objetos: bolitas grandes y premios ----------
  function item(ctx, kind, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = Math.max(1, r * 0.08);
    const pulse = 1 + 0.12 * Math.sin(t * 6);
    switch (kind) {
      case 'gema': { // gema tallada que brilla
        ctx.scale(pulse, pulse);
        ctx.shadowColor = '#f06595'; ctx.shadowBlur = r;
        ctx.fillStyle = '#f783ac';
        ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.3, -r * 0.55); ctx.lineTo(r * 0.3, -r * 0.55); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(0, r * 0.65); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.55); ctx.lineTo(0, -r * 0.2); ctx.lineTo(r * 0.3, -r * 0.55); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,0,60,.25)';
        ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(0, r * 0.65); ctx.closePath(); ctx.fill();
        break;
      }
      case 'bola': { // bola de árbol de Navidad
        const c = ['#e03131', '#f59f00', '#1c7ed6', '#d6336c'][Math.floor(t * 1.5) % 4];
        ctx.fillStyle = '#ced4da'; ctx.fillRect(-r * 0.18, -r * 0.82, r * 0.36, r * 0.22);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = r * 0.8; circle(ctx, 0, 0, r * 0.62 * pulse); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.6)'; circle(ctx, -r * 0.2, -r * 0.2, r * 0.15); ctx.fill();
        break;
      }
      case 'bellota': {
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#c47a2c'; ellipse(ctx, 0, r * 0.15, r * 0.45, r * 0.55); ctx.fill();
        ctx.fillStyle = '#7a4a1e'; ellipse(ctx, 0, -r * 0.3, r * 0.55, r * 0.28); ctx.fill();
        ctx.fillRect(-r * 0.05, -r * 0.75, r * 0.1, r * 0.25);
        break;
      }
      case 'turbo': {
        ctx.fillStyle = '#ffd43b'; ctx.shadowColor = '#ffd43b'; ctx.shadowBlur = r;
        circle(ctx, 0, 0, r * 0.65 * pulse); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#e8590c';
        ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.5); ctx.lineTo(-r * 0.25, r * 0.08); ctx.lineTo(0, r * 0.08); ctx.lineTo(-r * 0.1, r * 0.5); ctx.lineTo(r * 0.28, -r * 0.1); ctx.lineTo(0, -r * 0.1); ctx.closePath(); ctx.fill();
        break;
      }
      case 'fresa':
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.quadraticCurveTo(0, r * 1.2, r * 0.6, -r * 0.3); ctx.quadraticCurveTo(0, -r * 0.6, -r * 0.6, -r * 0.3); ctx.fill();
        ctx.fillStyle = '#ffe066'; for (const [a, b] of [[-0.25, 0], [0.2, 0.05], [0, 0.35], [-0.1, -0.15], [0.3, -0.2]]) { circle(ctx, a * r, b * r, r * 0.05); ctx.fill(); }
        ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.4); ctx.lineTo(0, -r * 0.2); ctx.lineTo(r * 0.45, -r * 0.4); ctx.lineTo(0, -r * 0.65); ctx.closePath(); ctx.fill();
        break;
      case 'manzana':
        ctx.fillStyle = '#2f9e44'; circle(ctx, 0, r * 0.1, r * 0.6); ctx.fill();
        ctx.fillStyle = '#7a4a1e'; ctx.fillRect(-r * 0.05, -r * 0.75, r * 0.1, r * 0.3);
        ctx.fillStyle = '#69db7c'; ellipse(ctx, r * 0.22, -r * 0.6, r * 0.22, r * 0.1, -0.5); ctx.fill();
        break;
      case 'piruleta':
        ctx.fillStyle = '#f1f3f5'; ctx.fillRect(-r * 0.05, 0, r * 0.1, r * 0.9);
        ctx.fillStyle = '#f783ac'; circle(ctx, 0, -r * 0.2, r * 0.55); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.3, 0, Math.PI * 1.5); ctx.stroke();
        break;
      case 'estrella':
        ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#f08c00';
        ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.32 : r * 0.75, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'pastel':
        ctx.fillStyle = '#ffe3b3'; ctx.fillRect(-r * 0.6, -r * 0.1, r * 1.2, r * 0.6);
        ctx.fillStyle = '#f783ac'; ctx.fillRect(-r * 0.6, -r * 0.25, r * 1.2, r * 0.2);
        ctx.fillStyle = '#e03131'; circle(ctx, 0, -r * 0.45, r * 0.16); ctx.fill();
        break;
      case 'regalo':
        ctx.fillStyle = '#1c7ed6'; ctx.fillRect(-r * 0.6, -r * 0.4, r * 1.2, r * 1);
        ctx.fillStyle = '#ffd43b'; ctx.fillRect(-r * 0.1, -r * 0.4, r * 0.2, r); ctx.fillRect(-r * 0.6, -r * 0.05, r * 1.2, r * 0.18);
        ellipse(ctx, -r * 0.22, -r * 0.55, r * 0.22, r * 0.14, 0.4); ctx.fill(); ellipse(ctx, r * 0.22, -r * 0.55, r * 0.22, r * 0.14, -0.4); ctx.fill();
        break;
      case 'corona':
        ctx.fillStyle = '#fcc419'; ctx.beginPath(); ctx.moveTo(-r * 0.65, r * 0.4); ctx.lineTo(-r * 0.65, -r * 0.35); ctx.lineTo(-r * 0.3, 0); ctx.lineTo(0, -r * 0.55); ctx.lineTo(r * 0.3, 0); ctx.lineTo(r * 0.65, -r * 0.35); ctx.lineTo(r * 0.65, r * 0.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e03131'; circle(ctx, 0, r * 0.15, r * 0.1); ctx.fill();
        break;
      case 'trofeo':
        ctx.fillStyle = '#fcc419'; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.6); ctx.quadraticCurveTo(r * 0.45, r * 0.15, 0, r * 0.2); ctx.quadraticCurveTo(-r * 0.45, r * 0.15, -r * 0.5, -r * 0.6); ctx.fill();
        ctx.fillRect(-r * 0.08, r * 0.15, r * 0.16, r * 0.3); ctx.fillRect(-r * 0.35, r * 0.45, r * 0.7, r * 0.15);
        ctx.strokeStyle = '#fcc419'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.35, r * 0.2, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.35, r * 0.2, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        break;
      case 'baston':
        ctx.lineCap = 'round'; ctx.lineWidth = r * 0.28;
        ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.75); ctx.lineTo(r * 0.1, -r * 0.2); ctx.arc(-r * 0.2, -r * 0.2, r * 0.3, 0, Math.PI, true); ctx.stroke();
        ctx.strokeStyle = '#e03131'; ctx.setLineDash([r * 0.15, r * 0.15]); ctx.stroke(); ctx.setLineDash([]);
        break;
      case 'turron':
        ctx.fillStyle = '#f4e1b5'; ctx.fillRect(-r * 0.7, -r * 0.3, r * 1.4, r * 0.65);
        ctx.fillStyle = '#c9a66b'; for (const [a, b] of [[-0.4, -0.05], [0, 0.1], [0.4, -0.1], [-0.15, 0.15], [0.25, 0.15]]) { ellipse(ctx, a * r, b * r, r * 0.12, r * 0.08); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.7, -r * 0.42, r * 1.4, r * 0.12);
        break;
      case 'galleta':
        ctx.fillStyle = '#c47a2c'; circle(ctx, 0, -r * 0.45, r * 0.25); ctx.fill();
        ctx.fillRect(-r * 0.25, -r * 0.25, r * 0.5, r * 0.6);
        ctx.fillRect(-r * 0.55, -r * 0.2, r * 1.1, r * 0.2);
        ctx.fillRect(-r * 0.3, r * 0.3, r * 0.2, r * 0.4); ctx.fillRect(r * 0.1, r * 0.3, r * 0.2, r * 0.4);
        ctx.fillStyle = '#fff'; circle(ctx, -r * 0.09, -r * 0.5, r * 0.04); ctx.fill(); circle(ctx, r * 0.09, -r * 0.5, r * 0.04); ctx.fill();
        break;
      case 'campana':
        ctx.fillStyle = '#fcc419'; ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.4); ctx.quadraticCurveTo(-r * 0.45, -r * 0.65, 0, -r * 0.65); ctx.quadraticCurveTo(r * 0.45, -r * 0.65, r * 0.6, r * 0.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8590c'; circle(ctx, 0, r * 0.5, r * 0.14); ctx.fill();
        ctx.fillStyle = '#e03131'; ellipse(ctx, 0, -r * 0.72, r * 0.25, r * 0.12); ctx.fill();
        break;
      case 'seta':
        ctx.fillStyle = '#f8f0e3'; ctx.fillRect(-r * 0.18, -r * 0.05, r * 0.36, r * 0.65);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(0, 0, r * 0.65, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; circle(ctx, -r * 0.3, -r * 0.25, r * 0.1); ctx.fill(); circle(ctx, r * 0.2, -r * 0.4, r * 0.08); ctx.fill(); circle(ctx, r * 0.35, -r * 0.12, r * 0.07); ctx.fill();
        break;
      case 'mora':
        ctx.fillStyle = '#5f3dc4'; for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.05], [-0.25, 0.15], [0.25, 0.15], [0, 0.4], [0, -0.4]]) { circle(ctx, a * r, b * r, r * 0.2); ctx.fill(); }
        ctx.fillStyle = '#2f9e44'; ellipse(ctx, 0, -r * 0.65, r * 0.3, r * 0.1); ctx.fill();
        break;
      case 'miel':
        ctx.fillStyle = '#f59f00'; roundRect(ctx, -r * 0.5, -r * 0.35, r, r * 0.9, r * 0.2); ctx.fill();
        ctx.fillStyle = '#e8590c'; ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 0.22);
        ctx.fillStyle = '#fff3bf'; ctx.font = `bold ${r * 0.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MIEL', 0, r * 0.12);
        break;
      case 'pina':
        ctx.fillStyle = '#8d5524'; ellipse(ctx, 0, 0, r * 0.45, r * 0.7); ctx.fill();
        ctx.strokeStyle = '#5c3a17'; ctx.lineWidth = r * 0.06;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.45, k * r * 0.25); ctx.lineTo(r * 0.45, k * r * 0.25 + r * 0.2); ctx.stroke(); }
        break;
      case 'bandera':
        ctx.fillStyle = '#868e96'; ctx.fillRect(-r * 0.55, -r * 0.7, r * 0.08, r * 1.45);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(-r * 0.47 + i * r * 0.27, -r * 0.7 + j * r * 0.25, r * 0.27, r * 0.25); }
        break;
      case 'rueda':
        ctx.fillStyle = '#212529'; circle(ctx, 0, 0, r * 0.65); ctx.fill();
        ctx.fillStyle = '#adb5bd'; circle(ctx, 0, 0, r * 0.32); ctx.fill();
        ctx.fillStyle = '#495057'; circle(ctx, 0, 0, r * 0.1); ctx.fill();
        break;
      case 'casco':
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.6, Math.PI, 0); ctx.lineTo(r * 0.6, r * 0.35); ctx.lineTo(-r * 0.6, r * 0.35); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(20,30,50,.8)'; ctx.fillRect(-r * 0.1, -r * 0.15, r * 0.7, r * 0.25);
        ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.6, r * 0.0, r * 0.4, r * 0.08);
        break;
      case 'gasolina':
        ctx.fillStyle = '#e03131'; roundRect(ctx, -r * 0.45, -r * 0.4, r * 0.9, r * 1, r * 0.12); ctx.fill();
        ctx.fillStyle = '#212529'; ctx.fillRect(r * 0.05, -r * 0.62, r * 0.25, r * 0.25);
        ctx.fillStyle = '#ffd43b'; ctx.fillRect(-r * 0.3, -r * 0.05, r * 0.6, r * 0.12);
        break;
      default: // bolita grande corriente
        ctx.fillStyle = '#fff'; circle(ctx, 0, 0, r * 0.5 * pulse); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Laberinto ----------
  // Devuelve un canvas con el suelo, los muros y la puerta, ya pintados
  function mazeCanvas(game, mundo, cs, dpr) {
    const m = game.maze, W = m.W, H = m.H;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(W * cs * dpr); cv.height = Math.ceil(H * cs * dpr);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const C = mundo.colores;
    ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, W * cs, H * cs);
    const wall = (x, y) => x < 0 || x >= W || y < 0 || y >= H ? (game.isTunnelRow(y) ? false : true) : m.cells[y * W + x] === 1;
    // forma de cada muro: recortada por los lados que dan a un pasillo, con esquinas redondeadas
    const shapes = (inset) => {
      ctx.beginPath();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!wall(x, y)) continue;
        const L = wall(x - 1, y) ? 0 : inset, R = wall(x + 1, y) ? 0 : inset, T = wall(x, y - 1) ? 0 : inset, B = wall(x, y + 1) ? 0 : inset;
        const x0 = x * cs + L, y0 = y * cs + T, x1 = (x + 1) * cs - R, y1 = (y + 1) * cs - B;
        const rad = cs * 0.3;
        const rTL = L && T ? rad : 0, rTR = R && T ? rad : 0, rBR = R && B ? rad : 0, rBL = L && B ? rad : 0;
        ctx.moveTo(x0 + rTL, y0);
        ctx.lineTo(x1 - rTR, y0); if (rTR) ctx.arcTo(x1, y0, x1, y0 + rTR, rTR);
        ctx.lineTo(x1, y1 - rBR); if (rBR) ctx.arcTo(x1, y1, x1 - rBR, y1, rBR);
        ctx.lineTo(x0 + rBL, y1); if (rBL) ctx.arcTo(x0, y1, x0, y1 - rBL, rBL);
        ctx.lineTo(x0, y0 + rTL); if (rTL) ctx.arcTo(x0, y0, x0 + rTL, y0, rTL);
        ctx.closePath();
      }
    };
    const ins = cs * 0.14, lw = Math.max(1.5, cs * 0.09);
    if (mundo.suelo) mundo.suelo(ctx, W * cs, H * cs, cs);
    // borde
    if (mundo.muro === 'neon') { ctx.shadowColor = C.borde; ctx.shadowBlur = cs * 0.35; }
    shapes(ins); ctx.fillStyle = C.borde; ctx.fill();
    ctx.shadowBlur = 0;
    // relleno
    shapes(ins + lw); ctx.fillStyle = C.muro; ctx.fill();
    // textura del relleno
    ctx.save(); shapes(ins + lw); ctx.clip();
    if (mundo.muro === 'caramelo') {
      ctx.strokeStyle = C.raya; ctx.lineWidth = cs * 0.22;
      for (let k = -H * cs; k < W * cs + H * cs; k += cs * 0.7) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + H * cs, H * cs); ctx.stroke(); }
    } else if (mundo.muro === 'seto') {
      let s = 7;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let k = 0; k < W * H * 3; k++) {
        ctx.fillStyle = rnd() < 0.5 ? C.hoja1 : C.hoja2;
        circle(ctx, rnd() * W * cs, rnd() * H * cs, cs * (0.12 + rnd() * 0.12)); ctx.fill();
      }
    } else if (mundo.muro === 'barrera') {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!wall(x, y)) continue;
        ctx.fillStyle = (x + y) % 2 ? C.raya : C.muro;
        ctx.fillRect(x * cs, y * cs, cs, cs);
      }
    }
    ctx.restore();
    // puerta de la casa
    const [dx, dy] = m.door;
    ctx.fillStyle = C.puerta;
    ctx.fillRect(dx * cs - cs * 0.5, dy * cs + cs * 0.4, cs * 2, cs * 0.2);
    // los túneles se ven como una salida difuminada
    return cv;
  }

  // ---------- Partículas de ambiente ----------
  function makeParticles(kind, w, h) {
    if (!kind) return null;
    const n = kind === 'nieve' ? 90 : 26, list = [];
    for (let k = 0; k < n; k++) list.push({ x: Math.random() * w, y: Math.random() * h, s: 0.4 + Math.random(), a: Math.random() * TAU });
    return { kind, list, w, h };
  }
  function particles(ctx, P, dt) {
    if (!P) return;
    for (const p of P.list) {
      if (P.kind === 'nieve') {
        p.y += (18 + 26 * p.s) * dt; p.x += Math.sin(p.a += dt) * 8 * dt;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * p.s / 1.4})`;
        circle(ctx, p.x, p.y, 1 + p.s * 1.6); ctx.fill();
      } else {
        p.y += (14 + 12 * p.s) * dt; p.x += Math.sin(p.a += dt * 1.3) * 22 * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = ['rgba(240,140,0,.7)', 'rgba(200,80,30,.7)', 'rgba(170,190,60,.7)'][Math.floor(p.s * 3) % 3];
        ellipse(ctx, 0, 0, 3 + p.s * 3, 1.5 + p.s * 1.5); ctx.fill();
        ctx.restore();
      }
      if (p.y > P.h + 8) { p.y = -8; p.x = Math.random() * P.w; }
    }
  }

  window.ZBDibujo = { SKINS, player, enemy, item, mazeCanvas, makeParticles, particles, roundRect, circle };
})();
