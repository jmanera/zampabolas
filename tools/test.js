// Pruebas: laberintos válidos y partidas simuladas. Uso: node tools/test.js
const fs = require('fs'), path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '../app/assets/laberintos.js'), 'utf8'));
const { full, problems } = require('./maze.js');
const M = require('../app/assets/motor.js');
let fails = 0;
const fail = m => { fails++; console.log('FALLO: ' + m); };

const mazes = window.ZBLaberintos;
for (const [name, half] of Object.entries(mazes)) {
  const p = problems(name, full(half));
  if (p.length) fail(`${name}: ${p.slice(0, 5).join('; ')}`);
}

// rng con semilla para que las pruebas sean repetibles
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// Bot: va a la bolita más cercana (BFS)
function botDir(g) {
  const p = g.player, m = g.maze;
  // decide pensando en la próxima casilla a la que llega, como haría una persona
  const [ddx, ddy] = M.DIRS[p.dir];
  let sx = Math.round(p.x), sy = Math.round(p.y);
  if (Math.abs(p.x - sx) > 0.01 || Math.abs(p.y - sy) > 0.01) {
    sx = ddx > 0 ? Math.ceil(p.x) : ddx < 0 ? Math.floor(p.x) : sx;
    sy = ddy > 0 ? Math.ceil(p.y) : ddy < 0 ? Math.floor(p.y) : sy;
    sx = ((sx % m.W) + m.W) % m.W;
  }
  const prev = new Map([[sx + ',' + sy, null]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    const i = g.idx(x, y);
    if ((m.dots.has(i) || m.powers.has(i)) && !(x === sx && y === sy)) {
      let k = x + ',' + y, first = null;
      while (prev.get(k)) { first = k; k = prev.get(k); }
      const [fx, fy] = (first || (x + ',' + y)).split(',').map(Number);
      let dx = fx - sx, dy = fy - sy;
      if (Math.abs(dx) > 1) dx = -Math.sign(dx);
      const d = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      // a mitad de casilla no se da media vuelta: se decide al llegar
      const mid = Math.abs(p.x - Math.round(p.x)) > 0.01 || Math.abs(p.y - Math.round(p.y)) > 0.01;
      return mid && M.DIRS[d][0] === -ddx && M.DIRS[d][1] === -ddy ? p.dir : d;
    }
    for (const [d, [dx, dy]] of Object.entries(M.DIRS)) {
      const nx = ((x + dx) % m.W + m.W) % m.W, ny = y + dy;
      if (g.openFor(nx, ny, 'player') && !prev.has(nx + ',' + ny)) { prev.set(nx + ',' + ny, x + ',' + y); q.push([nx, ny]); }
    }
  }
  return p.dir;
}

function check(g, tag) {
  for (const a of [g.player, ...g.enemies]) {
    if (!isFinite(a.x) || !isFinite(a.y)) { fail(tag + ': posición no válida'); return false; }
  }
  for (const e of g.enemies) {
    if (e.state !== 'active') continue;
    const c = g.cell(Math.round(e.x), Math.round(e.y));
    if (c !== 0) { fail(`${tag}: perseguidor ${e.k} dentro de un muro (${e.x.toFixed(2)},${e.y.toFixed(2)}) celda ${c}`); return false; }
  }
  const c = g.cell(Math.round(g.player.x), Math.round(g.player.y));
  if (c !== 0) { fail(`${tag}: Zampa dentro de un muro`); return false; }
  return true;
}

// 1) Sin morir, el bot se come todo: cada laberinto se puede terminar
const names = Object.keys(mazes);
for (const [k, name] of names.entries()) {
  const g = new M.Game({ mazes: [mazes[name]], difficulty: 'normal', rng: rng(k + 1), god: true });
  let t = 0, cleared = false, eatenEnemies = 0;
  while (t < 400) {
    g.setDir(botDir(g));
    g.update(1 / 60); t += 1 / 60;
    for (const ev of g.events) { if (ev === 'clear') cleared = true; if (ev.type === 'eatEnemy') eatenEnemies++; }
    if (!check(g, name)) break;
    if (cleared) break;
  }
  if (!cleared) fail(`${name}: el bot no termina el nivel (quedan ${g.maze.dots.size + g.maze.powers.size})`);
  else console.log(`${name}: terminado en ${t.toFixed(0)} s, perseguidores comidos ${eatenEnemies}`);
  // los comidos vuelven a salir
  if (g.enemies.some(e => e.state === 'eaten')) {
    let t2 = 0;
    while (t2 < 20 && g.enemies.some(e => e.state === 'eaten')) { g.update(1 / 60); t2 += 1 / 60; }
  }
}

// 2) Partidas normales: el bot acaba perdiendo, sin errores; pasan niveles y vidas
let levels = 0, deaths = 0;
for (let s = 1; s <= 12; s++) {
  const g = new M.Game({ mazes: names.map(n => mazes[n]), difficulty: ['facil', 'normal', 'dificil'][s % 3], rng: rng(s * 77) });
  let t = 0;
  const eyes = [0, 0, 0, 0];
  while (g.phase !== 'over' && t < 900) {
    g.setDir(botDir(g));
    g.update(1 / 60); t += 1 / 60;
    // unos ojos no deben tardar mucho en volver a casa
    g.enemies.forEach(e => {
      eyes[e.k] = e.state === 'eaten' ? eyes[e.k] + (g.phase === 'play' ? 1 / 60 : 0) : 0;
      if (eyes[e.k] > 10) { fail(`partida ${s}: los ojos del perseguidor ${e.k} no vuelven (${e.x.toFixed(2)},${e.y.toFixed(2)} ${e.dir})`); eyes[e.k] = -1e9; }
    });
    for (const ev of g.events) { if (ev === 'death') deaths++; if (ev === 'level') levels++; }
    if (!check(g, 'partida ' + s)) break;
  }
}
console.log(`Partidas simuladas: ${deaths} vidas perdidas, ${levels} niveles pasados`);
if (!deaths) fail('el bot nunca pierde: los perseguidores no persiguen');
if (fails) { console.log(fails + ' fallos'); process.exit(1); }
console.log('Todo bien');
