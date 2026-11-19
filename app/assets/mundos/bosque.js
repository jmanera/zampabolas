// Mundo del bosque: setos, hojas que caen y avispas.
(window.ZBMundos = window.ZBMundos || []).push({
  id: 'bosque',
  nombre: 'Bosque',
  descripcion: 'Setos, hojas y avispas zumbonas',
  laberintos: ['espiral', 'islas', 'cruces', 'clasico'],
  colores: { fondo: '#3d2f1f', muro: '#2b8a3e', hoja1: '#37b24d', hoja2: '#237032', borde: '#1e5128', bolita: '#ffe8a3', puerta: '#a9e34b', texto: '#ffffff', panel: '#2a2116' },
  muro: 'seto',
  perseguidor: 'avispa',
  perseguidores: [
    { nombre: 'Zumbi', color: '#e03131' },
    { nombre: 'Picota', color: '#be4bdb' },
    { nombre: 'Rayas', color: '#1c7ed6' },
    { nombre: 'Moscardón', color: '#f76707' },
  ],
  grande: 'bellota',
  premios: ['mora', 'seta', 'manzana', 'pina', 'miel', 'fresa', 'estrella', 'trofeo'],
  particulas: 'hojas',
  // tierra con algo de textura
  suelo(ctx, w, h, cs) {
    ctx.fillStyle = '#3d2f1f'; ctx.fillRect(0, 0, w, h);
    let s = 3;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < w * h / (cs * cs) * 2; k++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,230,180,.05)' : 'rgba(0,0,0,.08)';
      ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, cs * (0.05 + rnd() * 0.12), 0, Math.PI * 2); ctx.fill();
    }
  },
});
