---
version: alpha
name: Path
description: Hub en español para que estudiantes encuentren equipos, proyectos y personas. Cercano, claro y con energía de comunidad; la identidad es el sendero punteado con nodos de estado.
colors:
  paper: "#F1F4EE"
  surface: "#FBFCF9"
  surface-2: "#E6EBE3"
  ink: "#12302B"
  ink-soft: "#46605A"
  line: "#C9D3C9"
  primary: "#2C45D4"
  on-primary: "#FFFFFF"
  mark: "#FFC93C"
  on-mark: "#3B2A00"
  chicha: "#C2175F"
  paper-dark: "#0E1F1C"
  surface-dark: "#152A26"
  ink-dark: "#E7EFE9"
  primary-dark: "#94A6FF"
  on-primary-dark: "#0E1F1C"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 4.2rem
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.02em
  headline:
    fontFamily: Bricolage Grotesque
    fontSize: 2.9rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  title:
    fontFamily: Bricolage Grotesque
    fontSize: 1.3rem
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: Figtree
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Figtree
    fontSize: 0.8125rem
    fontWeight: 700
    lineHeight: 1.2
rounded:
  field: 10px
  card: 14px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: 12px
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary-dark}"
    rounded: "{rounded.pill}"
  badge-reclutando:
    backgroundColor: "{colors.mark}"
    textColor: "{colors.on-mark}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 8px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 16px
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.card}"
    padding: 16px
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 8px
  chip-borde:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  page-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
  muted-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
  error-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chicha}"
---

# Path

## Visión

Path es el lugar donde un estudiante descubre con quién construir. La sensación buscada es la de un tablero de la facultad bien cuidado: cercano, directo, con un poco de energía de calle (la serigrafía de los afiches de chicha, sin imitarla). Se habla de tú, con verbos claros: "Ir a su página", "Reportar", "Quitar filtros".

## Lo memorable: el sendero

Cada ficha lleva un riel punteado con un nodo. El nodo es el estado de reclutamiento: relleno amarillo es reclutando, hueco es cerrado, discontinuo es por confirmar. En móvil el riel baja continuo de una ficha a la siguiente y forma un camino. El mismo nodo está en el logo y en el estado vacío. El estado siempre lleva también texto y forma (la insignia), nunca solo color.

## Colores

- Papel de calco (`paper`, `#F1F4EE`): fondo gris verdoso muy claro. No es crema ni azul pizarra.
- Tinta abeto (`ink`, `#12302B`): texto y bordes; un verde casi negro, no negro neutro.
- Ruta (`primary`, `#2C45D4`): cobalto para acción y enlaces. Texto blanco encima.
- Maracuyá (`mark`, `#FFC93C`): solo para lo que está abierto, y selección de texto.
- Chicha (`chicha`, `#C2175F`): énfasis puntual y errores, siempre con texto.
- Modo oscuro: fondo `#0E1F1C`, superficie `#152A26`, texto `#E7EFE9`, acción `#94A6FF`, foco amarillo. Mantiene el mismo carácter.

Contraste AA en todos los pares texto/fondo de los tokens (el linter lo comprueba para `components`).

## Tipografía

- Bricolage Grotesque (Google Fonts) para logo y titulares: ancha, con carácter, amigable sin infantilizar. Pesos 700 a 800, interletraje negativo.
- Figtree para texto e interfaz: redonda, legible, buena para pantalla pequeña.
- Escala: 13, 16, 19, 22 a 28, 30 a 46, 37 a 67 px (fluida). Texto de lectura a 68 caracteres como máximo. Alineación a la izquierda, sin justificar. Sin mayúsculas sostenidas, sin eyebrows, sin numeración decorativa.

## Layout

Contenedor de 72 rem, margen lateral de 16 px en móvil y 32 px desde 768 px. Una columna en 390 px, dos desde 640 px, tres desde 1024 px. Los filtros están en un `<details>` para no robar la pantalla en móvil. Sin desbordamiento horizontal.

## Forma y elevación

Tres radios con función: tarjeta 14 px, campo 10 px, pastilla para chips, botones e insignias. Sombra dura sin desenfoque (tipo sticker) solo al pasar el cursor o enfocar una ficha y en botones primarios. No hay sombras grises suaves ni degradados.

## Movimiento

Un solo momento autónomo: el sendero del logo se dibuja al cargar. El resto responde a una acción (hover, foco, pulsación). `prefers-reduced-motion` lo desactiva todo.

## Accesibilidad

Foco visible de 3 px en cobalto (amarillo en oscuro) con separación; enlace "Saltar al contenido"; objetivos táctiles de al menos 40 a 44 px; formularios con etiqueta, ayuda y error asociados; el filtro funciona sin JavaScript.

## Qué evitar

Crema con terracota, negro con verde ácido, rejillas de tarjetas idénticas con sombra suave, imágenes de usuario, flechas decorativas, etiquetas en mayúsculas.
