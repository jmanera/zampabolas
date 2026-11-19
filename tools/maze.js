// Comprueba los laberintos: tamaños, casa, conexiones y callejones sin salida. Uso: node tools/maze.js [nombre]
const fs = require('fs'), path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '../app/assets/laberintos.js'), 'utf8'));
const full = half => half.map(r => r + r.slice(0, -1).split('').reverse().join(''));
const problems = (name, rows) => {
  const out = [], H = rows.length, W = rows[0].length;
  rows.forEach((r, y) => { if (r.length !== W) out.push(`fila ${y}: ${r.length} columnas`); });
  const at = (x, y) => (y < 0 || y >= H) ? '#' : rows[y][((x % W) + W) % W];
  const open = c => c !== '#' && c !== 'G' && c !== '-';
  const count = ch => rows.join('').split(ch).length - 1;
  if (count('P') !== 1) out.push('debe haber una P');
  if (count('E') !== 1) out.push('debe haber una E');
  let E = null, P = null;
  rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c === 'E') E = [x, y]; if (c === 'P') P = [x, y]; }));
  if (E && at(E[0], E[1] + 1) !== '-') out.push('debajo de E debe estar la puerta');
  if (E && at(E[0], E[1] + 2) !== 'G') out.push('debajo de la puerta debe estar la casa');
  // callejones: cada pasillo debe tener al menos dos salidas
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x];
    if (!open(c)) continue;
    if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) out.push(`esquina abierta ${x},${y}`);
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(at(x + dx, y + dy))).length;
    if (n < 2 && c !== 'E') out.push(`callejón en ${x},${y}`);
    if ((y === 0 || y === H - 1) && open(c)) out.push(`borde abierto ${x},${y}`);
  }
  // todo alcanzable desde P
  if (P) {
    const seen = new Set([P.join()]), q = [P];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ((x + dx) % W + W) % W, ny = y + dy;
        if (open(at(nx, ny)) && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); }
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (open(rows[y][x]) && !seen.has(x + ',' + y)) out.push(`aislado ${x},${y}`);
  }
  return out;
};
module.exports = { full, problems };
if (require.main === module) {
  let bad = 0;
  for (const [name, half] of Object.entries(window.ZBLaberintos)) {
    if (process.argv[2] && process.argv[2] !== name) continue;
    const rows = full(half), p = problems(name, rows);
    console.log(`== ${name} ${rows[0].length}x${rows.length} ${p.length ? p.length + ' problemas' : 'bien'}`);
    if (p.length) { bad++; console.log(rows.map((r, y) => String(y).padStart(2) + ' ' + r).join('\n')); console.log('  ' + p.slice(0, 15).join('; ')); }
  }
  process.exit(bad ? 1 : 0);
}
