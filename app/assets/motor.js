// Motor de Zampabolas: laberinto, movimiento, perseguidores, puntos y niveles. Sin DOM (se prueba con Node).
(function (root) {
  'use strict';

  const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
  const ORDER = ['up', 'left', 'down', 'right'];
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const EPS = 1e-6;

  const DIFF = {
    facil: { enemy: 0.82, fright: 1.5, name: 'Fácil' },
    normal: { enemy: 0.95, fright: 1, name: 'Normal' },
    dificil: { enemy: 1.06, fright: 0.6, name: 'Difícil' },
  };

  // Laberinto a partir de la mitad izquierda
  function buildMaze(half) {
    const rows = half.map(r => r + r.slice(0, -1).split('').reverse().join(''));
    const H = rows.length, W = rows[0].length;
    const m = { W, H, cells: [], dots: new Set(), powers: new Set(), P: null, E: null, door: null, house: [] };
    rows.forEach((r, y) => r.split('').forEach((c, x) => {
      const i = y * W + x;
      m.cells[i] = c === '#' ? 1 : c === '-' ? 2 : c === 'G' ? 3 : 0; // 0 pasillo, 1 muro, 2 puerta, 3 casa
      if (c === '.') m.dots.add(i);
      if (c === 'o') m.powers.add(i);
      if (c === 'P') m.P = [x, y];
      if (c === 'E') m.E = [x, y];
      if (c === '-') m.door = [x, y];
      if (c === 'G') m.house.push([x, y]);
    }));
    // fila central de la casa y huecos de espera de cada perseguidor
    m.homeY = m.E[1] + 2;
    const xs = m.house.filter(h => h[1] === m.homeY).map(h => h[0]).sort((a, b) => a - b);
    const cx = m.E[0];
    m.slots = [[cx, m.E[1]], [cx, m.homeY], [Math.max(xs[0], cx - 2), m.homeY], [Math.min(xs[xs.length - 1], cx + 2), m.homeY]];
    m.totalDots = m.dots.size + m.powers.size;
    // distancia por los pasillos hasta la salida de casa: los ojos siguen el camino más corto
    m.toHome = new Array(W * H).fill(Infinity);
    const start = m.E[1] * W + m.E[0], q = [start];
    m.toHome[start] = 0;
    while (q.length) {
      const i = q.shift(), x = i % W, y = (i - x) / W;
      for (const [dx, dy] of Object.values(DIRS)) {
        const ny = y + dy, nx = ((x + dx) % W + W) % W;
        if (ny < 0 || ny >= H) continue;
        const j = ny * W + nx;
        if (m.cells[j] === 0 && m.toHome[j] === Infinity) { m.toHome[j] = m.toHome[i] + 1; q.push(j); }
      }
    }
    return m;
  }

  class Game {
    // opts: {mazes: [mitades], difficulty, rng}
    constructor(opts) {
      this.opts = opts;
      this.rng = opts.rng || Math.random;
      this.diff = DIFF[opts.difficulty] || DIFF.normal;
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.extraGiven = false;
      this.events = [];
      this.time = 0;
      this.loadLevel();
    }

    loadLevel() {
      const list = this.opts.mazes;
      this.mazeIndex = (this.level - 1) % list.length;
      this.maze = buildMaze(list[this.mazeIndex]);
      this.eatenCount = 0;
      this.bonus = null;
      this.bonusShown = 0;
      this.resetActors(true);
    }

    // Recolocar a todos (al empezar nivel o tras perder una vida)
    resetActors(newLevel) {
      const m = this.maze;
      this.player = { x: m.P[0], y: m.P[1], dir: 'left', want: 'left', moving: true, mouth: 0, alive: true };
      this.enemies = [0, 1, 2, 3].map(k => ({
        k, x: m.slots[k][0], y: m.slots[k][1], dir: k === 0 ? 'left' : k === 1 ? 'down' : 'up',
        state: k === 0 ? 'active' : 'house', fright: false, flash: false, bob: k * 0.7,
        // salida de casa: por tiempo (s) o por bolitas comidas en este nivel
        releaseAt: newLevel ? [0, 1, 6, 12][k] : [0, 1, 4, 7][k],
        releaseDots: newLevel ? [0, 0, 30, 60][k] : 0,
        wanderTarget: null, wanderT: 0,
      }));
      this.phase = 'ready';
      this.phaseT = newLevel && this.level === 1 ? 2.5 : 2;
      this.modeIdx = 0;
      this.modeT = 0;
      this.frightT = 0;
      this.combo = 0;
      this.levelTime = 0;
    }

    // ---- consultas del laberinto ----
    cell(x, y) {
      const m = this.maze;
      if (y < 0 || y >= m.H) return 1;
      x = ((x % m.W) + m.W) % m.W;
      return m.cells[y * m.W + x];
    }
    idx(x, y) { const W = this.maze.W; return y * W + (((x % W) + W) % W); }
    openFor(x, y, who) {
      const c = this.cell(x, y);
      if (c === 0) return true;
      if (who === 'player') return false;
      return (c === 2 || c === 3) && (who.state === 'leaving' || who.state === 'eaten' || who.state === 'house');
    }

    // ---- velocidades (casillas por segundo) ----
    lvlMul() { return Math.min(1.3, 1 + 0.05 * (this.level - 1)); }
    playerSpeed() { return 7.2 * this.lvlMul() * (this.frightT > 0 ? 1.08 : 1); }
    enemySpeed(e) {
      const base = 7.2 * this.lvlMul() * this.diff.enemy;
      if (e.state === 'eaten') return 15;
      if (e.state === 'house' || e.state === 'leaving') return 4;
      const tx = Math.round(e.x), ty = Math.round(e.y);
      if (this.cell(tx, ty) === 0 && (tx <= 1 || tx >= this.maze.W - 2) && this.isTunnelRow(ty)) return base * 0.5;
      if (e.fright) return base * 0.55;
      return base;
    }
    isTunnelRow(y) { return this.cell(0, y) === 0 || this.cell(this.maze.W - 1, y) === 0; }

    frightDuration() {
      const base = Math.max(1.5, 8 - (this.level - 1) * 0.8);
      return base * this.diff.fright;
    }

    // Alternancia dispersarse / perseguir (en segundos)
    modeSchedule() { return this.level < 3 ? [7, 20, 7, 20, 5, 20, 5] : [5, 20, 5, 20, 3, 1033, 1]; }
    chasing() { const s = this.modeSchedule(); return this.modeIdx % 2 === 1 || this.modeIdx >= s.length; }

    // ---- entrada ----
    setDir(d) { if (DIRS[d]) this.player.want = d; }

    // ---- paso de simulación ----
    update(dt) {
      this.events = [];
      dt = Math.min(dt, 0.05);
      this.time += dt;
      if (this.phase === 'ready') { this.phaseT -= dt; if (this.phaseT <= 0) this.phase = 'play'; return; }
      if (this.phase === 'dying') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) {
          if (this.lives <= 0) { this.phase = 'over'; this.events.push('gameover'); }
          else this.resetActors(false);
        }
        return;
      }
      if (this.phase === 'clear') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) { this.level++; this.loadLevel(); this.events.push('level'); }
        return;
      }
      if (this.phase !== 'play') return;
      this.levelTime += dt;

      // modo de los perseguidores
      if (this.frightT > 0) {
        this.frightT -= dt;
        if (this.frightT <= 0) { this.frightT = 0; this.enemies.forEach(e => { e.fright = false; e.flash = false; }); this.combo = 0; }
        else this.enemies.forEach(e => { e.flash = e.fright && this.frightT < 2; });
      } else {
        const s = this.modeSchedule();
        if (this.modeIdx < s.length) {
          this.modeT += dt;
          if (this.modeT >= s[this.modeIdx]) {
            this.modeT = 0; this.modeIdx++;
            this.enemies.forEach(e => { if (e.state === 'active') e.reverse = true; });
          }
        }
      }

      this.movePlayer(dt);
      this.eat();
      if (this.phase !== 'play') return;
      for (const e of this.enemies) this.moveEnemy(e, dt);
      this.collide();

      // premio
      if (this.bonus) { this.bonus.t -= dt; if (this.bonus.t <= 0) this.bonus = null; }
      if (!this.extraGiven && this.score >= 10000) { this.extraGiven = true; this.lives++; this.events.push('extra'); }
    }

    movePlayer(dt) {
      const p = this.player;
      // media vuelta en cualquier momento
      if (p.want === OPP[p.dir]) { p.dir = p.want; p.moving = true; }
      let dist = this.playerSpeed() * dt;
      let moved = false;
      for (let guard = 0; dist > EPS && guard < 4; guard++) {
        const cx = Math.round(p.x), cy = Math.round(p.y);
        const atCenter = Math.abs(p.x - cx) < EPS && Math.abs(p.y - cy) < EPS;
        if (atCenter) {
          p.x = cx; p.y = cy;
          const [wx, wy] = DIRS[p.want];
          if (this.openFor(cx + wx, cy + wy, 'player')) p.dir = p.want;
          const [dx, dy] = DIRS[p.dir];
          if (!this.openFor(cx + dx, cy + dy, 'player')) { p.moving = false; break; }
        }
        p.moving = true;
        const [dx, dy] = DIRS[p.dir];
        // distancia hasta el siguiente centro
        const frac = dx ? (dx > 0 ? Math.ceil(p.x + EPS) - p.x : p.x - Math.floor(p.x - EPS)) : (dy > 0 ? Math.ceil(p.y + EPS) - p.y : p.y - Math.floor(p.y - EPS));
        const step = Math.min(dist, frac);
        p.x += dx * step; p.y += dy * step;
        dist -= step; moved = true;
        this.wrap(p);
        if (Math.abs(step - frac) < EPS) { p.x = Math.round(p.x); p.y = Math.round(p.y); }
      }
      if (moved) p.mouth += dt * 14;
    }

    wrap(a) {
      const W = this.maze.W;
      if (a.x < -0.5) a.x += W;
      else if (a.x > W - 0.5) a.x -= W;
    }

    eat() {
      const p = this.player, m = this.maze;
      const tx = Math.round(p.x), ty = Math.round(p.y);
      if (Math.abs(p.x - tx) > 0.3 || Math.abs(p.y - ty) > 0.3) return;
      const i = this.idx(tx, ty);
      if (m.dots.has(i)) { m.dots.delete(i); this.score += 10; this.eatenCount++; this.events.push('dot'); }
      else if (m.powers.has(i)) {
        m.powers.delete(i); this.score += 50; this.eatenCount++; this.events.push('power');
        this.frightT = this.frightDuration();
        this.combo = 0;
        this.enemies.forEach(e => { if (e.state === 'active') { e.fright = true; e.reverse = true; } else if (e.state === 'house' || e.state === 'leaving') e.fright = true; });
      } else if (this.bonus && Math.abs(p.x - this.bonus.x) < 0.6 && Math.abs(p.y - this.bonus.y) < 0.6) {
        this.score += this.bonus.points; this.events.push({ type: 'bonus', points: this.bonus.points, x: this.bonus.x, y: this.bonus.y });
        this.bonus = null;
      }
      // premio al llevar el 30 % y el 70 % de las bolitas
      const pct = this.eatenCount / m.totalDots;
      if ((this.bonusShown === 0 && pct >= 0.3) || (this.bonusShown === 1 && pct >= 0.7)) {
        this.bonusShown++;
        this.bonus = { x: m.P[0], y: m.P[1], t: 9.5, points: this.bonusPoints() };
        this.events.push('bonusUp');
      }
      if (!m.dots.size && !m.powers.size) {
        this.phase = 'clear'; this.phaseT = 2.4; this.bonus = null;
        this.events.push('clear');
      }
    }
    bonusPoints() { return [100, 300, 500, 700, 1000, 2000, 3000, 5000][Math.min(7, this.level - 1)]; }

    // ---- perseguidores ----
    targetFor(e) {
      const p = this.player, m = this.maze;
      const pt = [Math.round(p.x), Math.round(p.y)];
      const corners = [[m.W - 2, -2], [1, -2], [m.W - 2, m.H + 1], [1, m.H + 1]];
      if (!this.chasing()) return corners[e.k];
      const [dx, dy] = DIRS[p.dir];
      switch (e.k) {
        case 0: return pt; // va directo
        case 1: return [pt[0] + dx * 4, pt[1] + dy * 4]; // corta el paso por delante
        case 2: { // persigue de lejos y se aparta de cerca
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          return d > 6 ? pt : corners[2];
        }
        default: { // despistado: va a un sitio cercano a Zampa que cambia cada poco
          e.wanderT -= 1;
          if (!e.wanderTarget || e.wanderT <= 0) {
            e.wanderTarget = [pt[0] + Math.round((this.rng() - 0.5) * 10), pt[1] + Math.round((this.rng() - 0.5) * 10)];
            e.wanderT = 6;
          }
          return e.wanderTarget;
        }
      }
    }

    moveEnemy(e, dt) {
      const m = this.maze;
      e.bob += dt * 6;
      if (e.state === 'house') {
        const ready = this.levelTime >= e.releaseAt && this.eatenCount >= e.releaseDots;
        // sube y baja dentro de la casa mientras espera
        e.y = m.homeY + Math.sin(e.bob) * 0.25;
        if (ready) { e.state = 'leaving'; e.y = m.homeY; }
        return;
      }
      if (e.state === 'leaving') {
        // primero al centro de la puerta y luego hacia arriba hasta la salida
        const sp = this.enemySpeed(e) * dt;
        const doorX = m.E[0];
        if (Math.abs(e.x - doorX) > EPS) { e.x += Math.sign(doorX - e.x) * Math.min(sp, Math.abs(doorX - e.x)); e.dir = e.x < doorX ? 'right' : 'left'; return; }
        e.dir = 'up';
        e.y -= sp;
        if (e.y <= m.E[1]) { e.y = m.E[1]; e.state = 'active'; e.dir = this.rng() < 0.5 ? 'left' : 'right'; }
        return;
      }
      if (e.state === 'eaten') {
        // los ojos vuelven a la puerta y entran en casa
        if (Math.abs(e.x - m.E[0]) < EPS && Math.abs(e.y - m.E[1]) < 0.5 && e.y >= m.E[1] - EPS) {
          e.x = m.E[0];
          e.y += this.enemySpeed(e) * dt;
          e.dir = 'down';
          if (e.y >= m.homeY) { e.y = m.homeY; e.state = 'leaving'; e.fright = false; e.flash = false; }
          return;
        }
        if (Math.abs(e.x - m.E[0]) < EPS && e.y > m.E[1] && e.y <= m.homeY) {
          e.y += this.enemySpeed(e) * dt; e.dir = 'down';
          if (e.y >= m.homeY) { e.y = m.homeY; e.state = 'leaving'; e.fright = false; e.flash = false; }
          return;
        }
      }
      let dist = this.enemySpeed(e) * dt;
      for (let guard = 0; dist > EPS && guard < 4; guard++) {
        const cx = Math.round(e.x), cy = Math.round(e.y);
        const atCenter = Math.abs(e.x - cx) < EPS && Math.abs(e.y - cy) < EPS;
        if (atCenter) {
          e.x = cx; e.y = cy;
          if (e.state === 'eaten' && cx === m.E[0] && cy === m.E[1]) return; // a la puerta en el próximo paso
          if (e.reverse) { e.reverse = false; e.dir = OPP[e.dir]; if (!this.canGo(e, cx, cy, e.dir)) e.dir = OPP[e.dir]; }
          else e.dir = this.choose(e, cx, cy);
        } else if (e.reverse) { e.reverse = false; e.dir = OPP[e.dir]; }
        const [dx, dy] = DIRS[e.dir];
        const frac = dx ? (dx > 0 ? Math.ceil(e.x + EPS) - e.x : e.x - Math.floor(e.x - EPS)) : (dy > 0 ? Math.ceil(e.y + EPS) - e.y : e.y - Math.floor(e.y - EPS));
        const step = Math.min(dist, frac);
        e.x += dx * step; e.y += dy * step;
        dist -= step;
        this.wrap(e);
        if (Math.abs(step - frac) < EPS) { e.x = Math.round(e.x); e.y = Math.round(e.y); }
      }
    }

    canGo(e, x, y, d) {
      const [dx, dy] = DIRS[d];
      const c = this.cell(x + dx, y + dy);
      return c === 0;
    }

    choose(e, x, y) {
      if (e.state === 'eaten') {
        // camino más corto hasta la salida (puede dar media vuelta)
        let best = e.dir, bd = Infinity;
        for (const d of ORDER) {
          if (!this.canGo(e, x, y, d)) continue;
          const [dx, dy] = DIRS[d], v = this.maze.toHome[this.idx(x + dx, y + dy)];
          if (v < bd) { bd = v; best = d; }
        }
        return best;
      }
      const opts = ORDER.filter(d => d !== OPP[e.dir] && this.canGo(e, x, y, d));
      if (!opts.length) return OPP[e.dir];
      if (e.fright && e.state === 'active') return opts[Math.floor(this.rng() * opts.length)];
      const t = e.state === 'eaten' ? this.maze.E : this.targetFor(e);
      let best = opts[0], bd = Infinity;
      for (const d of opts) {
        const [dx, dy] = DIRS[d];
        const dd = (x + dx - t[0]) ** 2 + (y + dy - t[1]) ** 2;
        if (dd < bd - EPS) { bd = dd; best = d; }
      }
      return best;
    }

    collide() {
      const p = this.player;
      for (const e of this.enemies) {
        if (e.state !== 'active') continue;
        let dx = Math.abs(e.x - p.x);
        dx = Math.min(dx, this.maze.W - dx);
        if (dx + Math.abs(e.y - p.y) > 0.75) continue;
        if (e.fright) {
          e.fright = false; e.flash = false; e.state = 'eaten';
          const pts = 200 * Math.pow(2, this.combo);
          this.combo = Math.min(3, this.combo + 1);
          this.score += pts;
          this.events.push({ type: 'eatEnemy', points: pts, x: e.x, y: e.y, k: e.k });
          // la casilla de destino es la salida: si ya está en ella, entra directamente
        } else if (!this.opts.god) {
          this.lives--;
          this.phase = 'dying'; this.phaseT = 2;
          this.bonus = null;
          this.events.push('death');
          return;
        }
      }
    }
  }

  const api = { Game, buildMaze, DIRS, DIFF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ZBMotor = api;
})(this);
