# Zampabolas

Juego de laberinto para tablet Android: lleva a Zampa por el laberinto, cómete todas las bolitas y
no dejes que te pillen. Es una página web (`app/assets/`) envuelta en una app Android mínima con un
WebView a pantalla completa. Funciona sin conexión.

## Descargar

La última versión firmada está en [Releases](https://github.com/jmanera/zampabolas/releases/latest): descarga `Zampabolas.apk` y ábrelo
en la tablet (la primera vez hay que permitir instalar aplicaciones de origen desconocido), o
instálalo con `adb install -r Zampabolas.apk`.

## Qué incluye

- Tres personajes: **Zampa** (amarillo), **Zampa con coletas** (rosa, con lazos) y **Zampa navideño**
  (con gorro de Papá Noel y bufanda).
- Cuatro mundos, cada uno con sus muros, perseguidores, bolitas grandes y premios:
  - **Clásico**: neón verde agua, bichos con antenas y gemas.
  - **Navidad**: muros de bastón de caramelo, nieve, duendes, bolas de árbol, turrones y galletas.
  - **Bosque**: setos, hojas que caen, avispas, bellotas, setas, moras y miel.
  - **Carreras**: circuitos con barreras, coches que te persiguen, turbos, banderas y trofeos.
- Seis laberintos propios; cada mundo los va alternando nivel a nivel, y los niveles van más rápido.
- Cuatro perseguidores con su propia forma de buscarte: uno va directo, otro intenta cortarte el
  paso, otro se acerca y se aparta y otro va un poco despistado. Alternan entre perseguirte y
  dispersarse.
- Bolitas grandes que los asustan y te dejan comértelos (200, 400, 800 y 1600 puntos), premios dos
  veces por nivel, túneles laterales, vidas (y una extra a los 10.000 puntos).
- Tres dificultades, récords por mundo (los 5 mejores), pausa automática al salir de la app.
- Controles: deslizar el dedo por el laberinto (se pueden encadenar giros sin levantarlo), cruceta
  en pantalla opcional y teclado (flechas o WASD).
- Sonidos sintetizados propios.

## Añadir un mundo

Cada mundo es un fichero en `app/assets/mundos/` que se añade a `index.html` con un `<script>`
antes de `motor.js`. Por ejemplo, `mundos/playa.js`:

```js
(window.ZBMundos = window.ZBMundos || []).push({
  id: 'playa',
  nombre: 'Playa',
  descripcion: 'Castillos de arena y cangrejos',
  laberintos: ['islas', 'clasico'],          // nombres de laberintos.js, en orden de nivel
  colores: { fondo: '#f4e3b5', muro: '#e9c46a', borde: '#b08968', raya: '#fff',
             bolita: '#ffffff', puerta: '#2a9d8f', texto: '#ffffff', panel: '#1d3557' },
  muro: 'neon',              // neon | caramelo | seto | barrera
  perseguidor: 'bicho',      // bicho | duende | avispa | coche
  perseguidores: [{ nombre: 'Pinzas', color: '#e63946' }, /* ... cuatro en total */],
  grande: 'gema',            // gema | bola | bellota | turbo
  premios: ['fresa', 'estrella' /* ... uno por nivel; el último se repite */],
  particulas: null,          // null | 'nieve' | 'hojas'
  suelo(ctx, ancho, alto, casilla) { /* opcional: pintar el suelo */ },
});
```

Los premios disponibles están en `dibujo.js` (función `item`): fresa, manzana, piruleta, estrella,
pastel, regalo, corona, trofeo, baston, turron, galleta, campana, seta, mora, miel, pina, bandera,
rueda, casco y gasolina. Un estilo nuevo de muro, perseguidor o premio se añade también en `dibujo.js`.

## Añadir un laberinto

Los laberintos están en `app/assets/laberintos.js`. Se escribe la mitad izquierda (con la columna
central) y se completa en espejo: `#` muro, `.` bolita, `o` bolita grande, espacio pasillo vacío,
`P` salida de Zampa, `E` salida de los perseguidores (encima de la puerta `-`) y `G` la casa. Una
fila abierta por los dos bordes es un túnel. `node tools/maze.js` dice si hay callejones sin salida,
zonas aisladas o problemas con la casa, y `node tools/test.js` además juega partidas simuladas en
todos los laberintos.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `app/assets/laberintos.js` | Laberintos. |
| `app/assets/mundos/*.js` | Mundos: colores, perseguidores, objetos y laberintos que usan. |
| `app/assets/motor.js` | Lógica del juego (sin DOM, se prueba con Node). |
| `app/assets/dibujo.js` | Dibujo en canvas de personajes, perseguidores, objetos y muros. |
| `app/assets/app.js` | Bucle, controles, menús, sonido y récords. |
| `app/src/.../MainActivity.java` | Envoltorio Android (WebView). |
| `tools/test.js`, `tools/maze.js` | Comprobación de laberintos y partidas simuladas. |

## Compilar e instalar desde el código

Con la tablet conectada por USB y la depuración USB activada:

```bash
./build.sh
adb install -r Zampabolas.apk
```

`build.sh` pasa primero las pruebas y compila sin Gradle (usa `aapt2`, `javac`, `d8` y `apksigner`
del SDK en `~/Android/Sdk`). La primera vez crea `release.keystore` (no se sube al repo): guárdalo,
porque para actualizar la app sin desinstalarla hay que firmar siempre con la misma clave.

## Probar en el ordenador

```bash
python3 -m http.server 8769 -d app/assets
```

Y abrir `http://localhost:8769`.

## Publicar una versión

El workflow [Publicar APK](.github/workflows/release.yml) compila el APK firmado y crea una release
nueva (`v1.N`). Solo se lanza a mano, desde *Actions > Publicar APK > Run workflow*, y solo lo puede
ejecutar el dueño del repositorio. Firma con la misma clave que `release.keystore`, guardada en el
secreto `KEYSTORE_BASE64` (el fichero en base64):

```bash
base64 -w0 release.keystore | gh secret set KEYSTORE_BASE64
```

## Otros juegos

Hechos de la misma forma, para la misma tablet:

- [Mahjong solitario](https://github.com/jmanera/mahjong-solitario): emparejar fichas, con 12 tableros.
- [Autodefinidos](https://github.com/jmanera/autodefinidos): crucigramas con las definiciones dentro de la cuadrícula.
- [Sopa de letras](https://github.com/jmanera/sopa-de-letras): sopas de letras por temas.
- [Abecedario](https://github.com/jmanera/abecedario): una definición por letra contra el reloj, para uno o varios jugadores.
- [Encaja](https://github.com/jmanera/encaja): piezas que caen y encajan, con seis modos y cuatro temas.
