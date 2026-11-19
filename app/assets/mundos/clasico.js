// Mundo clásico: muros de neón verde agua sobre fondo violeta, con bichos y gemas.
(window.ZBMundos = window.ZBMundos || []).push({
  id: 'clasico',
  nombre: 'Clásico',
  descripcion: 'Neón, gemas y bichos traviesos',
  laberintos: ['clasico', 'cruces', 'espiral', 'islas'],
  colores: { fondo: '#1a0f2e', muro: '#24123f', borde: '#20c997', bolita: '#ffe3f1', puerta: '#f06595', texto: '#ffffff', panel: '#21143a' },
  muro: 'neon',
  perseguidor: 'bicho',
  perseguidores: [
    { nombre: 'Rufo', color: '#82c91e' },
    { nombre: 'Pinta', color: '#9775fa' },
    { nombre: 'Chispa', color: '#ced4da' },
    { nombre: 'Lolo', color: '#c08457' },
  ],
  grande: 'gema',
  premios: ['fresa', 'manzana', 'piruleta', 'pastel', 'estrella', 'regalo', 'corona', 'trofeo'],
  particulas: null,
});
