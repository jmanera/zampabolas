// Mundo de carreras: circuitos con barreras, coches perseguidores y turbos.
(window.ZBMundos = window.ZBMundos || []).push({
  id: 'carreras',
  nombre: 'Carreras',
  descripcion: 'Circuitos con barreras y coches que te persiguen',
  laberintos: ['circuito', 'ovalo', 'clasico', 'cruces'],
  colores: { fondo: '#33363b', muro: '#ffffff', raya: '#e03131', borde: '#212529', bolita: '#ffe066', puerta: '#ffd43b', texto: '#ffffff', panel: '#25272b' },
  muro: 'barrera',
  perseguidor: 'coche',
  perseguidores: [
    { nombre: 'Rayo', color: '#e03131' },
    { nombre: 'Bólido', color: '#1c7ed6' },
    { nombre: 'Turbo', color: '#2f9e44' },
    { nombre: 'Derrape', color: '#f59f00' },
  ],
  grande: 'turbo',
  premios: ['bandera', 'rueda', 'gasolina', 'casco', 'estrella', 'trofeo', 'corona', 'trofeo'],
  particulas: null,
  // asfalto con una rejilla de salida discreta
  suelo(ctx, w, h, cs) {
    ctx.fillStyle = '#33363b'; ctx.fillRect(0, 0, w, h);
    let s = 11;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < w * h / (cs * cs) * 6; k++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.12)';
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  },
});
