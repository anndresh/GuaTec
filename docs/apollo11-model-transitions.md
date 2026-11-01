# Modelos de torre y transiciones · 1 de noviembre de 2026

## Brazos de servicio

Se integra el componente de pasarela que ya estaba preparado en el proyecto:
cerchas conectadas, cubierta con travesaños, barandillas dobles, conducciones,
colectores, bisagra y paso superior cubierto. Se corrigieron dos pequeños
apoyos que quedaban suspendidos. Cada brazo conserva cuatro batches de
materiales compartidos y entre 1792 y 2224 triángulos, sin texturas nuevas.

Las siete longitudes se calculan desde el pivote hasta el radio del casco en
su altura de conexión. La cubierta termina antes del casco y solo alcanza la
piel el conector. Se conserva la altura del Saturn V de 110,6 m y los 65
colliders existentes. El pivote queda en el pilar frontal: el giro se realiza
hacia el exterior y conserva el ángulo radial de reposo. El soporte transversal
une los dos pilares de esa cara, incluso entre los pisos de la torre.

La revisión independiente detectó que el pivote interior anterior cruzaba un
pilar al abrirse; la colocación frontal lo evita. Se comprobaron 33 posiciones
del barrido frente a los otros tres pilares, las siete conexiones, el paso
cubierto y la reproducción exacta del giro al buscar tiempos de cinemática.

## Verificación del modelo

108 pruebas y build/typecheck pasan. Capturas comparables de detalle bajo,
medio, superior, conjunto, exploración y vista estrecha; sin errores de página
o consola. Evidencia ignorada: `frontend/artifacts/model-transition-pass`.

En la misma cámara de conjunto: 64→78 llamadas y 42980→55368 triángulos; en
exploración: 91→91 llamadas y 229812→229896 triángulos. Es una comparación de
capturas, no FPS. La vista estrecha con tripulación mantiene el coste alto de
los clones y sombras existentes. No se añadieron texturas, postprocesado,
dependencias ni activos externos; no se afirma calidad premium global.

## Transiciones y entrega de cámara

Una cortina calculada desde el tiempo de la secuencia cubre los dos cortes de
tripulación y los cuatro de lanzamiento. Mantiene los subtítulos por encima,
conserva las tarjetas narrativas negras y elimina la transición CSS de fondo
que competía con esa cronología. Los avisos de checkpoint se ocultan durante
la película. El modo de movimiento reducido elimina los fundidos decorativos.

Al terminar u omitir una película, la cámara recupera directamente la posición
y el campo de visión de juego sobre un fotograma cubierto, seguido de una
revelación breve. Se evita el barrido desde la torre o desde el teleobjetivo.
El traslado a observación usa esa misma revelación. La capa se elimina aunque
el epílogo esté pausado y se reemplaza en interrupciones rápidas.

El tiempo de película se actualiza antes de renderizar el mundo: cámara y
cortina consumen la misma muestra, también en una actualización de 100 ms.
La revisión independiente detectó y permitió corregir el desfase de un
fotograma y la competencia CSS. No se añadieron temporizadores de transición,
texturas ni pases de render.

Pasan 110 pruebas, typecheck, build aislado, vídeo local de cortes y retornos,
reproducción por tiempo, subtítulos en 390×844, interrupciones, transferencia
remota, epílogo pausado y movimiento reducido. El compilado también pasa como
Invitado: apertura real de introducción, omisión, posición/FOV de juego,
movimiento, salto, pausa y mapa. Los fixtures locales de cinemática usan estado
en memoria y API interceptada; no constituyen un recorrido completo de misión.
El arnés permite WebSocket local en su perfil Chrome aislado para evitar que
la política de red del navegador bloquee el cliente de desarrollo Vite.
