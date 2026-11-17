# Path: hub para conectar equipos y estudiantes (diseño del MVP)

Fecha: 2026-11-16. Estado: pendiente de aprobación.
Nombre de trabajo: **Path** (viene del repo `path-collaborative-projects`; es una decisión del asistente, se puede cambiar).

## Intención y por qué

Los estudiantes que quieren construir algo (un proyecto, una investigación, un desarrollo) no tienen dónde encontrar equipos y compañeros. Invivo Lab y KipuBecas resuelven la búsqueda individual de becas; ninguna conecta estudiantes para trabajar juntos.

Path es un hub tipo GitHub para equipos: se exploran equipos, proyectos y personas, a nivel mundial y local (Perú primero), y cada ficha redirige a la página propia del equipo o persona. Path es solo la plataforma de conexión; no aloja multimedia ni reemplaza las webs y redes de cada quien.

## Objetivos

- Explorar equipos, proyectos y personas con filtros: carrera, habilidades, país, nivel, modalidad y "reclutando".
- Cada equipo y cada persona publica su ficha con un **README en Markdown** (sin imágenes; solo stickers estáticos de un set fijo) y un enlace externo.
- Login con Google y GitHub; sin contraseñas.
- Sensación de marca cercana a Invivo Lab: cálida, clara, de comunidad estudiantil, con identidad visual propia.
- Desplegado en `*.workers.dev` y código en `Marquinhos9873/path-collaborative-projects`.

## No-objetivos

- Subir imágenes, archivos o videos.
- Chat, mensajería interna, notificaciones por correo.
- Matching automático por habilidades (queda para fase 2).
- Pagos, dominio propio, internacionalización completa.

## Anti-objetivos (fracaso aunque funcione)

- Publicar oportunidades caducadas o cerradas a otras universidades sin decirlo.
- Que un README de usuario ejecute código en el navegador de otros (XSS).
- Que el diseño parezca una plantilla o una copia de Invivo Lab.
- Contenido sensible de defensa o UAV: solo uso civil o dual.

## Restricciones

- Cloudflare Workers (workers.dev) con D1. Cuenta ya autenticada con wrangler 4.163.
- Node 22, npm 10.
- Idioma de la interfaz: español.
- Todo estático salvo el contenido de D1; sin servicios de pago adicionales.

## Enfoques considerados

- **A. Astro SSR + D1 (elegido por Marco).** Páginas rápidas, buenas para buscadores, poco JavaScript; fácil de dar estilo propio. Costo: los filtros interactivos requieren pequeños bloques de JS (islas).
- B. Hono + D1. Más ligero, pero la interfaz se escribe más a mano.
- C. React/Vite + API. Más fluido, pero más pesado y peor para buscadores.

## Decisiones tomadas por Marco

- Alcance: explorar equipos, proyectos y personas, mundial y Perú.
- Cada equipo y usuario carga su información en formato README; sin imágenes, solo stickers estáticos.
- Enfoque técnico A (Astro + D1).
- Cuatro agentes, usando superpowers (plan), taste-skill, design.md y frontend-design.

## Decisiones del asistente (revisar)

1. **Login:** OAuth con Google y GitHub usando `arctic`; sesiones propias en D1 con token hasheado y cookie `HttpOnly`.
2. **Markdown:** `markdown-it` con HTML crudo desactivado e imágenes desactivadas; el resultado pasa además por un sanitizador con lista blanca. Enlaces con `rel="nofollow ugc noopener"`; solo `https:`.
3. **Stickers:** set fijo de SVG propios en el repo, escritos como `:cohete:`; sin subida de stickers.
4. **Moderación mínima:** botón "reportar" en cada ficha y un panel `/admin` para el dueño (lista de reportes, ocultar ficha). Admin definido por el correo en una variable de entorno.
5. **Datos iniciales:** los equipos del catálogo del brief se cargan como fichas "listadas por Path, sin reclamar", con ciclo anual, "abierto a externos" y fecha de última verificación. Los datos por confirmar se marcan como tales; ninguno se presenta como confirmado.
6. **Dirección visual:** la define el agente de diseño en un `DESIGN.md` (formato design.md, validado con `npx @google/design.md lint`). Referencia de Invivo Lab: DM Sans, serif cursiva, neutros azul pizarra, chips de categoría, tarjetas con estado visible. Path no copia esas fuentes ni la estructura; toma lo que transmiten.
7. **Tarjeta de equipo:** en lugar de cuenta regresiva de plazo, muestra "reclutando / próximo ciclo" y país.

## Modelo de datos (D1)

- `users`: id, proveedor, id_proveedor, nombre, usuario (slug), carrera, país, nivel, habilidades (lista), readme, enlace, estado (activo/oculto), creado.
- `teams`: id, slug, nombre, tipo (equipo, capítulo, laboratorio, competencia), país, área/carrera, modalidad, reclutando (sí/no/por confirmar), ciclo anual, próxima apertura, abierto_a_externos, enlace, readme, dueño, origen (usuario/curado), verificado_en, estado.
- `projects`: id, slug, team_id (opcional), nombre, resumen, perfiles buscados, readme, enlace, estado.
- `memberships`: user_id, team_id, rol.
- `sessions`, `reports`.

## Rutas

- `/` portada: buscador y filtros en primer plano, equipos de Perú y del mundo.
- `/explorar` con pestañas Equipos, Proyectos, Personas.
- `/equipos/[slug]`, `/proyectos/[slug]`, `/u/[usuario]`.
- `/entrar`, `/cuenta` (editar perfil y README con vista previa), `/cuenta/equipos/nuevo`.
- `/admin` (reportes).

## Reparto en 4 agentes

1. **Base:** scaffold Astro + adaptador Cloudflare, `wrangler.jsonc`, migraciones y esquema D1, login OAuth y sesiones, scripts de despliegue.
2. **Diseño:** `DESIGN.md`, tokens CSS, tipografía, layout base y componentes (tarjeta, chips, filtros, formularios). Usa frontend-design, taste-skill y design.md.
3. **Páginas:** explorador con filtros y las fichas de equipo, proyecto y persona; edición de cuenta.
4. **Contenido y seguridad:** pipeline de Markdown seguro, stickers, reportes, `/admin`, datos iniciales y pruebas de XSS.

Contratos entre agentes: el agente 1 fija primero el esquema y las funciones de acceso a datos; los agentes 2 a 4 trabajan sobre ese contrato en carpetas separadas para no pisarse. Integración, pruebas y despliegue los hace el asistente principal.

## Lo que queda a criterio del constructor

Nombres de componentes, estructura interna de carpetas, copy fino en español, paleta exacta (dentro de la dirección descrita), set concreto de stickers.

## Pasos que solo puede hacer Marco

- Crear las credenciales OAuth de Google y de GitHub con la URL de `workers.dev` que resulte del primer despliegue, y guardarlas como secretos (`wrangler secret put`). Hasta entonces el login queda deshabilitado y el resto funciona.
- Verificar con cada equipo los datos del catálogo antes de quitarles la marca "por confirmar".

## Riesgos

- Arranque en frío: pocos equipos reales al inicio; mitigado con el catálogo inicial y el enfoque Perú, electrónica y aeroespacial.
- Datos caducos: fecha de última verificación visible en cada ficha curada.
- Spam y contenido abusivo: reportes y ocultar fichas; sin imágenes ni HTML reduce la superficie.
