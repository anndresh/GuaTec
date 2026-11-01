# Movimiento y cinemáticas de Apollo 11 · 1 de noviembre de 2026

La continuación conserva la misión, los guardados, el personaje con licencia,
la escala de 110,6 m del Saturn V y los colliders del recorrido existente.

## Movimiento

La aceleración inicial y la gravedad se integran analíticamente. La pausa
congela posición, velocidad vertical y pose durante un salto. El ritmo de los
clips depende del desplazamiento que permiten las colisiones; un obstáculo
cerrado lleva al reposo, y el giro interpola por el arco más corto. El
controlador sigue siendo cinemático, con barridos AABB y suelo plano.

## Presentación

La introducción recorre un carril Catmull–Rom continuo. Tripulación y transporte
arrancan y frenan con rampas de velocidad continuas; los astronautas mezclan
caminata con reposo al llegar. El transporte conserva odometría por distancia,
añade inclinación al acelerar/frenar y activa las luces de freno al reducir
velocidad. El segundo plano separa los nombres en pantalla.

Los cinco motores reciben envolventes turbulentas y núcleos calientes agrupados
en dos batches instanciados. La boca de cada pluma permanece en su campana al
variar el encendido. El humo tiene fecha de nacimiento, deriva, expansión y
fundido propios: el vapor de plataforma deja de emitirse y el rastro sigue
posiciones anteriores del vehículo. Los brazos se apartan de forma escalonada
antes de que el cohete abandone la torre. El movimiento reducido desactiva
vibración, inclinación y oscilación de las plumas. La salida libera también los
buffers de todas las mallas instanciadas.

## Verificación

- 106 pruebas unitarias; typecheck y compilación de producción.
- Movimiento real: caminar/correr, sprint táctil, salto/aterrizaje, pausa aérea,
  foco, colisión y giro; equivalencia a 30/60/120 pasos por segundo.
- Vídeo sin pausa del traslado completo y del arranque/ascenso; llegada con
  pesos Walk=0 e Idle=1, odometría y partículas reproducibles al buscar tiempos.
- Siete muestras de cámara comprueban que no se superponen los nombres.
- Viewports 1440×900 y 390×844, tres calidades, movimiento reducido y liberación
  de los tres buffers instanciados, sin errores de página o consola.
- Entrada como Invitado en compilado y producción, movimiento real, salto,
  pausa/reanudación, mapa y fixture visual de los escapes. El preview local usa
  un puente CORS del arnés hacia la API real; la prueba pública usa la red normal.

Los arneses viven en `frontend/scripts/qa-apollo-movement.mjs`,
`qa-apollo-cinematic-motion.mjs` y `qa-apollo-motion-release.mjs`. Usan el paquete
Playwright y Chrome del entorno mediante `PLAYWRIGHT_MODULE_PATH` y `CHROME_BIN`;
el vídeo requiere el ffmpeg de Playwright. Las capturas, vídeo, métricas e informe
final permanecen ignorados en `frontend/artifacts/`.

La revisión independiente detectó y permitió corregir liberación de buffers y
superposición de nombres. Los fotogramas muestran poses proporcionadas y plumas
ancladas; no constituyen una medición exacta del deslizamiento de pies. La escena
con tres clones conserva un coste alto de triángulos/texturas y puede superar el
presupuesto orientativo de llamadas. No se afirma una mejora de FPS ni se ha
hecho un benchmark de teléfono físico. No se añadieron dependencias, texturas,
postprocesado ni activos de servicios externos.
