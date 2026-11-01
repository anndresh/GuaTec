# Detalle de equipos y edificios de Apollo 11 · 1 de noviembre de 2026

## Stands y colisiones

Los puestos eléctricos, de radio y telemetría incorporan gabinetes inferiores,
puertas ventiladas, conectores y cableado posterior sujeto al bastidor. Los bancos
tienen cartelas atornilladas, diagonales y apoyos niveladores. El magnetófono
incorpora guías de cinta y capstan; la estación meteorológica añade una base
anclada y herrajes en la caseta de instrumentos. Los trípodes tienen tramos
telescópicos, abrazaderas y zapatas que llegan al plinto.

Las colisiones cubren los pies de los trípodes, la base del mástil, la caseta y
los dos apoyos traseros del panel de cables. El mundo pasa de 65 a 67 proxies;
los trece accesos frontales siguen libres. El controlador cinemático existente
conserva sus subpasos de desplazamiento y su gravedad analítica.

Se mantienen nueve materiales y un atlas compartido, con los límites existentes
de 10.000 triángulos por puesto y 60.000 para el kit. Los tubos rectos usan un
segmento longitudinal y los cables curvos una subdivisión proporcional a sus
puntos de control. La revisión independiente permitió corregir apoyos que
flotaban sobre el plinto.

## Vehículos

Se añaden detalles de neumáticos, válvulas, soportes de espejos, defensas,
bisagras y cierres de puertas traseras, rejillas, canalones, nervaduras del techo
y estribo. Los pasos de rueda dejan de utilizar discos completos que penetraban
el terreno. Son vehículos de apoyo estilizados, sin atribuirlos a una réplica
histórica exacta.

La carrocería tiene un grupo suspendido separado de las ruedas. Su elevación,
cabeceo y balanceo se calculan por distancia recorrida y la distancia real entre
ejes; aceleración y frenada producen una transferencia visual de carga acotada.
Las ruedas mantienen el contacto con el suelo y giran por odometría. Buscar un
tiempo de la película reproduce exactamente la pose. Movimiento reducido elimina
el movimiento secundario y conserva rodadura y luces. Es una aproximación
cinemática de suspensión; no se incorpora un simulador de conducción.

Se mantienen 31 meshes por vehículo. Sedán: 9.252→11.820 triángulos; furgoneta:
10.224→13.474. No se añaden texturas, luces ni dependencias.

## Edificios de apoyo

Los cuatro edificios reciben escaleras fijas de cubierta, desagües conectados
con abrazaderas y salidas curvas, ventiladores con rejillas, tragaluces con
marcos, juntas de fachada y herrajes de puertas y portones. Todos los detalles
permanecen dentro del margen de 0,7 m de las colisiones existentes; los edificios
siguen cerrados. Se conservan los dos niveles de detalle del VAB.

Cada variante mantiene siete materiales/batches compartidos, sin texturas nuevas.
Triángulos por variante: 7.076, 6.172, 7.100 y 6.528, inferiores al límite
existente de 7.500.

## Skills y comprobación

Se aplicaron las skills instaladas `threejs-game-director`,
`threejs-aaa-graphics-builder` (recetas de modelado y arte técnico),
`threejs-physics` y `threejs-qa-release`. Se consultó `threejs-3d-generator` y la
recuperación de activos del director: las credenciales de Tripo, Gemini y
ElevenLabs no están configuradas, por lo que se amplían los modelos
procedurales existentes. No se enviaron trabajos de generación externa.

El catálogo instalado también incluye especialistas de iluminación, materiales,
rendimiento, cámaras, interacción y UI de Three.js para próximas iteraciones.
Apollo usa Three.js; la skill de Babylon.js corresponde a las otras escenas que
conserven ese motor.

Pasan typecheck y 114 pruebas. Las comprobaciones de navegador incluyen ocho
vistas de stands, reverso, viewport estrecho, trece accesos y cuatro carreras a
10 m/s con actualizaciones de 100 ms contra equipos. La QA arquitectónica cubre
diez vistas, los cuatro edificios y el cambio de LOD. La QA de vehículos cubre
cinco vistas, neumáticos apoyados, frenada, replay y movimiento reducido. La QA
cinematográfica completa verifica locomoción, traslado, búsqueda temporal,
humo, escapes, brazos y tres niveles gráficos.

En el recorrido de stands, telemetría registra 70 llamadas y 109.654 triángulos;
meteorología, 144 y 142.542. Son mediciones de capturas, no FPS. El recorrido
conserva 93 texturas acumuladas y hasta 277 geometrías, por encima de las
referencias generales de la skill: no se afirma optimización global ni calidad
premium de todo el juego. La QA de actores registra 113 llamadas/260.864
triángulos en exploración y 393/1.109.474 en la vista de tripulación con
sombras, todavía por encima del presupuesto orientativo. El foco es detalle de equipos y comportamiento físico,
sin añadir postprocesado.

Las capturas y reportes se guardan fuera del producto publicado en
`frontend/artifacts/stand-detail-pass`, `frontend/artifacts/vehicle-pass`,
`frontend/artifacts/architecture-pass` y `frontend/artifacts/apollo-cinematic-motion`.
Cada cambio se compila y publica desde su commit aislado; el selector de
misiones que estaba en edición queda excluido. La comprobación pública usa
Invitado aleatorio, movimiento, salto, pausa aérea, aterrizaje y mapa, además de
comparar los bundles publicados con el snapshot compilado.
