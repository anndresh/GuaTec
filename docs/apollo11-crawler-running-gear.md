# Tren de rodaje del crawler · 3 de noviembre de 2026

Se corrige el transportador procedural estacionado: las cinco ruedas solapadas
por oruga se sustituyen por cuatro ruedas separadas que tocan la cara interior
inferior a y=0,68 m. Sus centros quedan a1,47 m, radio0,79 m y separación1,6 m.
Dos rodillos de retorno por oruga apoyan el tramo superior a y=3 m. Los brazos
diagonales conectan cubos y bastidor. Las zapatas inferiores alcanzan el terreno.

Las escaleras ahora tienen22peldaños en lugar de13, con apoyos al suelo y
postes finales. Se añaden limpiaparabrisas, rieles de puerta, herrajes,
canalón y rejilla trasera de cabina. Se mantiene la interpretación educativa
estilizada: el modelo permanece aparcado y no se simula conducción de orugas.

Se aplicó `threejs-aaa-graphics-builder` y sus referencias de modelado/arte técnico.
Se conservan ocho materiales/meshes y cero texturas nuevas. Los cilindros pequeños
usan8segmentos; las ruedas de carga conservan12 para mantener contactos exactos.
El coste pasa de19.260a19.348triángulos, bajo el límite existente de22.000.
Bounds:40,5×34,5×8,26m, posición(-235,0,52). No cambia navegación ni sus67proxies.

115pruebas y typecheck PASS. Una regresión lanza rayos contra las superficies
reales de los ocho conjuntos: verifica contacto de32ruedas inferiores,
16rodillos superiores, zapatas en el suelo y huecos entre ruedas vecinas.
La QA de Chrome incluye conjunto, reverso, oruga y cabina, dos vistas estrechas
y dos de juego; finitud, bounds, batches y errores. Evidencia ignorada en
`frontend/artifacts/crawler-detail-pass`.

Vistas comparables mantienen31llamadas de conjunto,23de oruga,15de cabina y144
en conjunto estrecho. Solo se añaden88triángulos al modelo. Las texturas acumuladas
siguen por encima del presupuesto general de la skill (87–92 según el recorrido);
no se afirma optimización global ni incremento de FPS.
