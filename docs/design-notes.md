# Notas de diseño de Path

Registro del plan de diseño, la revisión contra el brief y lo que se cambió. Los valores finales viven en `DESIGN.md` y `src/styles/tokens.css`.

## Plan v1 (primer borrador)

- Color: papel claro cálido `#F6F1E7`, tinta casi negra, acento terracota `#D9622B`, verde salvia.
- Tipografía: serif cursiva para titulares (como la referencia), sans geométrica para texto.
- Layout: portada con hero centrado, buscador debajo, rejilla de 3 tarjetas idénticas con sombra suave y esquinas redondeadas iguales.
- Principio: "cálido y amable".

## Revisión contra el brief

1. Crema + terracota + serif es el tic número 1 y además acerca Path a Invivo Lab. Cambio: papel verde-gris frío `#F1F4EE`, tinta verde abeto `#12302B`, azul cobalto `#2C45D4` como acción y amarillo maracuyá `#FFC93C` solo para marcar lo que está abierto. Chicha `#C2175F` queda para énfasis puntuales.
2. La pareja serif cursiva + sans es la de la referencia. Cambio: Bricolage Grotesque (titulares, con carácter y variable) + Figtree (texto). Sin serif, sin manuscrita.
3. Rejilla de tarjetas idénticas con sombra gris. Cambio: la cosa memorable es el sendero (`.trail`): cada ficha lleva un riel punteado con un nodo cuyo estado es el de reclutamiento (relleno amarillo = reclutando, hueco = cerrado, discontinuo = por confirmar). En móvil el riel enlaza una ficha con la siguiente. El nodo se repite en el logo y en el estado vacío, así que el estado se lee sin color solamente.
4. Radios y sombras uniformes. Cambio: tres radios con función (14 px tarjeta, 10 px campo, pastilla para chips) y sombra dura sin desenfoque, tipo sticker, solo al pasar el cursor.
5. Eyebrows en mayúsculas y números 01/02. Cambio: no se usan; etiquetas en minúscula de frase. Sin flechas decorativas; solo "↗" en enlaces externos, porque significa salir.
6. Movimiento: un solo momento, el sendero del logo se dibuja al cargar. Todo lo demás es respuesta a una acción (foco, hover, pulsación). `prefers-reduced-motion` lo apaga.

## Wireframes

Portada / explorar (escritorio, alineado a la izquierda):

```
[~o path]  Explorar  Equipos  Proyectos  Personas        [Entrar]
------------------------------------------------------------------
 Encuentra con quién construir.
 [ buscar equipos, proyectos o personas____________ ] [Buscar]
 País [Perú v]  Área [Todas v]   (Presencial)(Remoto)(Híbrido)
 (Todos)(Reclutando)(Por confirmar)
------------------------------------------------------------------
 o- APU Space UNI          o- GIA-PUCP         o- PolySat
 :  Perú · Equipo           :  ...              :  ...
 :  [* Reclutando]         :                   :
```

Móvil 390 px: una columna; el riel punteado baja continuo entre fichas; filtros en un `<details>` desplegable para no ocupar la pantalla.

## Verificación

Ver sección final de `DESIGN.md` y el resultado del lint en el reporte de entrega.
