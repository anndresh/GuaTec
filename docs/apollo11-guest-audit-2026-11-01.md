# Auditoría Invitado e idiomas · 1 de noviembre de 2026

## Recorrido público inicial

Se completó la versión pública `1946343` con una cuenta Invitado aleatoria:
quince operaciones, siete apoyos, desplazamiento con WASD, instrumentos mediante
clics/arrastre/teclado, traslado, lanzamiento, epílogo, guardado remoto, reentrada
y reinicio. Ocho hitos y siete apoyos recuperados. Sin errores de página, consola
o respuestas HTTP fallidas. No se inyectó progreso; la instancia capturada solo
permite observar el estado y planificar rutas con sus colisiones reales.

El vídeo, capturas y traza permanecen ignorados en
`frontend/artifacts/mission-audit-2026-11-01/public-story`.

## Idiomas corregidos

- Seis señales físicas del mundo conservaban el español en EN/FR.
- La referencia meteorológica inglesa mostraba SO en vez de SW.
- El minimapa remoto usaba coma decimal en inglés.
- Cambiar idioma durante una cinemática dejaba controles del HUD y táctiles
  en el idioma previo. El nombre accesible del objetivo tampoco se refrescaba.
- El visor externo conservaba un título accesible en español aunque existía
  su traducción.

El catálogo cubre las señales y notaciones, y el refresco común precede ahora
al retorno cinematográfico. El objetivo y el visor actualizan sus etiquetas.
Las reglas de misión y los guardados permanecen iguales.

Regresiones previas: la prueba del catálogo devolvió ORIENTACIÓN en inglés; el
navegador devolvió Carte · M después de cambiar FR→EN en la introducción. Tras
la corrección pasan 107 pruebas, typecheck, compilación aislada de producción y
ocho comprobaciones de idioma: carga, cinemática, HUD/accesibilidad, borrador de
fusible, pausa/foco, visor, brújula/distancia y recuperación ante fallo WebGL.
La revisión independiente no encontró defectos adicionales en la corrección.
