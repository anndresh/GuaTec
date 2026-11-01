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
