// Mundo de Navidad: muros de bastón de caramelo, nieve y duendes.
(window.ZBMundos = window.ZBMundos || []).push({
  id: 'navidad',
  nombre: 'Navidad',
  descripcion: 'Bastones de caramelo, nieve y duendes',
  laberintos: ['cruces', 'islas', 'clasico', 'espiral'],
  colores: { fondo: '#0f2347', muro: '#ffffff', raya: '#e03131', borde: '#c92a2a', bolita: '#ffffff', puerta: '#ffd43b', texto: '#ffffff', panel: '#13305e' },
  muro: 'caramelo',
  perseguidor: 'duende',
  perseguidores: [
    { nombre: 'Cascabel', color: '#e03131' },
    { nombre: 'Muérdago', color: '#2f9e44' },
    { nombre: 'Escarcha', color: '#4dabf7' },
    { nombre: 'Canela', color: '#b5651d' },
  ],
  grande: 'bola',
  premios: ['baston', 'galleta', 'turron', 'campana', 'regalo', 'estrella', 'pastel', 'corona'],
  particulas: 'nieve',
  // suelo con un brillo de nieve
  suelo(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0f2347'); g.addColorStop(1, '#1b3a6b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },
});
