# Antena de seguimiento · 3 de noviembre de 2026

Se amplía el modelo procedural existente con plataforma anular de mantenimiento,
escalera fija, barandillas con abertura de acceso, riostras, transmisión con
aletas, volante, pernos de bridas y cableado. El reflector recibe dos anillos
traseros, triangulación al cubo, juntas radiales, cierres de borde y alimentación
con cable sujeto al brazo. Es una interpretación educativa del equipo de apoyo,
no una réplica histórica certificada.

Se aplicó `threejs-aaa-graphics-builder`, sus recetas de modelado y arte técnico.
Se conservan cuatro materiales y cuatro meshes, sin texturas, luces, dependencias
ni generación externa. La geometría pasa de 5.496 a 11.576 triángulos, por debajo
del contrato de 12.000 existente. Las piezas se fusionan por material y sus
geometrías temporales se liberan. Se calculan bounds de cada lote y se añade
metadata de diagnóstico al grupo.

La plataforma tiene una abertura real alrededor del mástil y los peldaños parten
del plinto. El grupo conserva posición (83,0,254), altura inferior a 12 m y todos
sus extremos dentro de la colisión de 7,6 × 7,6 m. Se mantienen 67 colisiones y
la escala del Saturn V de 110,6 m.

`frontend/scripts/qa-apollo-dish.mjs` comprueba el mundo integrado con Chrome:
frente, reverso, transmisión, reflector, dos vistas estrechas y exploración y
comunicaciones; bounds, colisión, coste geométrico y ausencia de errores de página,
consola y carga. Evidencia ignorada en `frontend/artifacts/dish-detail-pass`.
Pasan typecheck y las 114 pruebas existentes, incluido el contrato de geometría
finita, escala y presupuesto de los equipos.

En las cámaras comparables se conservan 184 llamadas delanteras, 63 traseras y
99 en exploración. Las texturas acumuladas del mundo siguen en 90; el presupuesto
orientativo global de texturas sigue excedido. El modelo añade triángulos, no se
afirma una mejora de FPS. No se han cambiado iluminación ni postprocesado.
