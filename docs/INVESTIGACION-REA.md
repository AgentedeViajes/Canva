# Investigación REA de Canva

## 1. Alcance y método

Se observó la aplicación pública de Canva en una sesión de Chrome controlada por REA:

- **Objetivo:** entender la interacción de **selección, movimiento, redimensionamiento, rotación y organización** de elementos, además de tipografía, color, deshacer y exportación.
- **Punto de entrada:** `https://www.canva.com/`.
- **Recorrido real:** portada pública → página de plantillas → plantilla pública → editor de plantilla en modo invitado (`/design/play?...`).
- **Herramientas REA usadas:** `list_browser_targets`, `inspect_web_page`, `capture_web_screenshot`, `analyze_web_bundle`.
- **Navegador:** Google Chrome 154/155 en macOS, sesión normal (no headless). La primera fase se hizo con 154 y la ampliación con 155.
- **REA:** `rea-agents` 6.7.0, proveedor CDP `rea-cdp-browser` 2.

La portada se cargó inicialmente en modo headless y quedó detenida en el desafío de Cloudflare
(“Un momento…”). Se reinició con una ventana normal de Chrome y un perfil limpio; el desafío se
resolvió y la observación continuó sobre la página pública.

> **Naturaleza de la evidencia.** Las conclusiones de interacción provienen del DOM/árbol de
> accesibilidad renderizado, capturas de pantalla y mediciones realizadas sobre la interfaz
> pública. No se descargó, descompiló ni reutilizó código propietario del editor. El análisis
> estático de bundles se usó solo como contexto del sitio público y no como prueba del
> comportamiento del editor.

## 2. Evidencia REA principal

| Evidencia | Operación | Qué demuestra |
|---|---|---|
| `ev_80c4939a15a8d7a67e9e519d135de4371869f6e9df27baa25b11b4dc64db9e8e` | `inspect_web_page` | Portada pública, DOM, recursos, accesibilidad y almacenamiento. |
| `ev_b555f89c5c06e65a8ac2308cdc5f87f203d8518298a8d8d90e239e4e50a77f48` | `capture_web_screenshot` | Captura de la portada y del arquetipo visual del editor. |
| `ev_688b157daf41fc5db2617913e88c8ce1a44018ab17fbe1d929188a82927605e1` | `analyze_web_bundle` | 6 scripts observados en la portada; solo rutas/endpoints de marketing y GTM. |
| `ev_d8cb32d4f555e041631acb0c7a327300c9a1730f7a73a65a29073f0d66e0423d` | `inspect_web_page` | Página de plantilla; enlace “Usar plantilla” hacia el editor. |
| `ev_7272fa105e4cd019f597ed018111ffaa7e96f43bf869d2fe1ca214e0b131972d` | `capture_web_screenshot` | Plantilla pública “Navy Gold Futuristic Presentation”. |
| `ev_c8b0cde7f25e304c113285cdf11da41aa117f79de122be6df74f75ec22a572dc` | `inspect_web_page` | Editor invitado, modal de inicio de sesión y shell del editor. |
| `ev_3a029bad0925ba8799460a472204a151f1d88e3b3d56f69271b254587d01e190` | `capture_web_screenshot` | Editor de plantilla en modo invitado, ya sin el modal. |
| `ev_6af7f407934f27d48916dd688e7e77c20ba09e4f165111a5c59f7a87b610f0a2` | `capture_web_screenshot` | Panel de capas del editor. |
| `ev_ebb565d2fea811a5e5a04f45070e2fabf8464ef38af534748b5040560d7b2959` | `inspect_web_page` | DOM final del editor con panel de capas y selección. |
| `ev_6d369e3529258bc04d419dd785d257f4d082e9edc6b9076dc248e18ca6330254` | `inspect_web_page` | Herramienta pública Background Remover. |
| `ev_baa8bbbc3c9136b98bd6c06a967421f4fcb8b57a4da89f449411c88b53d6e404` | `capture_web_screenshot` | Página de Background Remover. |
| `ev_5d6a9735800b8d5eef080247c5e910a007c137b3f7f4f7a104a81e172bcf6246` | `inspect_web_page` | Herramienta pública Magic Eraser. |
| `ev_216df37c57491d6dd16ac72c6c3528f73e8601d3bc44f137e13224d232da32ea` | `capture_web_screenshot` | Página de Magic Eraser. |
| `ev_d272ccc820ff10bbff329554febf1fb7d2edafa492124eb207620912acddec13` | `inspect_web_page` | Editor público de PDF. |
| `ev_d5bf4070322f251d56f8d7bf9a61abd5e3f80b79fc408744a1b6910fac40cde3` | `capture_web_screenshot` | Página del editor de PDF. |

Las capturas correspondientes están en [`docs/evidence/`](evidence/README.md).

## 3. Flujo observado

### 3.1 Acceso al editor

La ruta pública de una plantilla expone un enlace con la forma:

```
https://www.canva.com/design?create&type=...&template=...&category=...&locale=en
```

Al abrirla, Canva redirige a:

```
https://www.canva.com/design/play?type=...&template=...&category=...&locale=en
```

El editor se carga detrás de un modal:

- Título: **“Log in to save your design”**.
- Opciones: continuar con Google, Facebook, email o email de trabajo.
- Texto: “You'll need to log in to save this design to your account.”

Al cerrar el modal, el **shell del editor queda operativo en modo invitado**:

- Barra superior: Home, File, Present, Share, Sign in.
- Rail izquierdo: Templates, Elements, Text, Uploads, Tools, Apps.
- Lienzo central con la plantilla y navigator de páginas.
- Barra inferior: zoom, Pages, 1/11.
- Estado: “Changes will be saved automatically” (en modo invitado, el guardado real requiere cuenta).

Esto permitió observar la interacción sin autenticarse.

### 3.2 Selección

Al hacer clic sobre el texto “PRESENTATION”:

- Aparece un **rectángulo de selección violeta**.
- Se dibujan **8 manejadores circulares** (esquinas y puntos medios de cada lado).
- Aparece un **manejador de rotación** separado.
- Flota una barra contextual con: **Lock, Duplicate, Delete, More**.
- La barra superior cambia a controles de texto:
  - selector de fuente,
  - tamaño,
  - color,
  - Bold / Italics / Underline / Strikethrough / Uppercase,
  - alineación,
  - List / Spacing / Advanced formatting,
  - Transparency / Effects / Animate / Position / Copy style.

Etiquetas accesibles observadas (traducidas del inglés de la UI):

- `Toggle font selector, current font: Pattanakarn Condensed`
- `Decrease font size` / `Increase font size`
- `Current text color Orange`
- `Bold` (`aria-pressed=true`), `Italics`, `Underline`, `Strikethrough`, `Uppercase`
- `Toggle text alignment, current alignment: Center`
- `List`, `Spacing`, `Advanced formatting`, `Transparency`, `Effects`, `Animate`, `Position`, `Copy style`
- Manejadores: `Resize selection from left edge`, `... right edge`, `... top left corner`, `... top right corner`, `... bottom left corner`, `... bottom right corner`, `Rotate selection`

### 3.3 Movimiento

Se arrastró un objeto de texto. El objeto y su caja de selección se movieron juntos y la barra
superior pasó a **“Unsaved changes”**. El botón **Undo** quedó disponible y restauró el estado
anterior.

Observación clave: el arrastre se inicia sobre el objeto ya seleccionado y mueve la selección
completa; la caja de selección, los manejadores y la barra contextual siguen al objeto.

### 3.4 Redimensionamiento

Con el titular seleccionado, el panel **Position** mostraba:

| Campo | Valor inicial |
|---|---|
| Width | `1527 px` |
| Height | `193.9 px` |
| X | `196.5 px` |
| Y | `410.7 px` |
| Rotate | `0°` |

Se arrastró el manejador de la esquina inferior derecha. El resultado medido fue:

| Campo | Después de redimensionar |
|---|---|
| Width | `1213.4 px` |
| Height | `154 px` |
| X | `196.5 px` |
| Y | `410.7 px` |

Es decir, el ancla fue la esquina opuesta y la posición superior izquierda se conservó. El panel
numérico refleja el tamaño en tiempo real; no es solo un cambio visual.

### 3.5 Rotación

Con el mismo objeto se arrastró el manejador de rotación. El campo **Rotate** pasó a `-43.5°` y
las coordenadas X/Y se recalcularon a `309.9 px` / `14.5 px`, coherentes con una caja de
selección alineada a los ejes que envuelve al objeto rotado.

### 3.6 Deshacer

El botón **Undo** de la barra superior restauró el tamaño y la rotación previos. Es un historial
de estados del documento, no una simple recarga de la plantilla: el cambio de tamaño y la
rotación se deshicieron sin perder la selección.

### 3.7 Organización: Position y Layers

El panel **Position** contiene dos pestañas: **Arrange** y **Layers**.

**Arrange**

- Layers
- Forward
- Backward
- To front
- To back
- Align to page: Top, Left, Middle, Center, Bottom, Right
- Advanced: Width, Height, Ratio, X, Y, Rotate

**Layers**

- Filtros **All** y **Overlapping**.
- Lista ordenada de capas; en la plantilla observada aparecían, entre otras:
  - “Presented by Emily Dawson”
  - “PRESENTATION”
- Cada capa puede seleccionarse desde la lista.

El modelo de organización es, por tanto: **orden Z por capas + acciones de envío adelante/atrás +
alineación a página + medidas numéricas**.

### 3.8 Tipografía

El selector de fuente abre un panel con:

- **Font**
- **Text styles**
- **Document fonts**
- **Recommended fonts**
- **Brand fonts** (Pro)
- **Popular fonts**
- Buscador con placeholder “Try ‘Calligraphy’ or ‘Open Sans’”.
- **Upload a font**

El tamaño se introduce numéricamente y también con `−` / `+`. El estilo se compone de peso,
itálica, subrayado, tachado y mayúsculas; la alineación es un control segmentado.

### 3.9 Color

El control de color del texto abre un panel con:

- Buscador “Try ‘blue’ or ‘#00c4cc’”.
- **Add a new color**.
- **Pick a color** (cuentagotas).
- **Colors in this design** con muestras como `#e9c476`, `#e6f2ff`, `#4074ae`, `#204a87`,
  `#36486c`, `#d3e9ff`, `#ffffff`.
- **Photo colors**.
- **Default solid colors**.
- Acciones “See all”.

El color actual se anuncia en la barra de herramientas: `Current text color Orange`.

### 3.10 Imágenes

Al seleccionar la imagen de fondo de la plantilla apareció una barra contextual propia:

- Edit
- 5.0s
- BG Remover (Pro)
- Eraser
- Color
- Crop
- Flip
- Animate
- Position
- Lock / Delete

Esto confirma que Canva trata cada tipo de objeto con un conjunto de acciones contextuales
distinto, manteniendo los manejadores de transformación comunes.

### 3.11 Exportación

El menú **File** mostró:

- Create new design
- Settings
- Accessibility
- Save
- Download
- Print
- Find and replace text
- Open in desktop app
- Suggest improvement
- Report design

Dentro de **Download**:

- Tipo de archivo: **PDF (Suggested)**, **PPTX**, **MP4 Video**, **JPG**, **PNG**,
  **SVG (Pro)**, **GIF**.
- Presets: Digital / Print.
- “Download pages as separate files” (Pro).
- Páginas: All / This page / Custom.
- Advanced Settings: “Password protect and more”.
- Botón Download.

La opción PNG se describe como **“Best for complex images, illustrations”**. La exportación real
no se ejecutó porque la cuenta no estaba autenticada.

### 3.12 Quitar fondo

La página pública **Background Remover** ofrece una herramienta sin registro visible:

- Subida o arrastre de una imagen.
- Categorías de ejemplo: **People, Products, Animals, Objects, Logos**.
- Eliminación en un clic, con opción de refinar con **Erase** y **Restore**.
- Resultado descargable como **PNG transparente**.
- La descripción promete conservar detalles finos como pelo, pelaje o joyas.
- También se puede seguir editando en Canva para cambiar el fondo, añadir texto o gráficos.

Lienzo implementa una versión local: detecta el color dominante de los bordes, hace un flood fill
con tolerancia, suaviza el alfa y exporta PNG transparente. No es un modelo de segmentación
semántica; funciona mejor con fondos uniformes.

### 3.13 Borrador mágico

La página pública **Magic Eraser** describe:

- Subir una imagen o arrastrarla.
- “Brush over distractions” para borrar objetos o personas.
- Uso dentro del photo editor de Canva.
- Casos: fotos de viaje, productos, publicaciones de Instagram.
- Comparativa antes/después y resultado inmediato.

Lienzo implementa un **borrador por difusión**: el usuario pinta una máscara y el relleno se
calcula promediando los píxeles del entorno. Es una aproximación local, no el modelo generativo
de Canva.

### 3.14 Edición de PDF

El **PDF Editor** público de Canva ofrece:

- Subir un PDF.
- Convertirlo en elementos editables dentro de Canva.
- Herramientas de PDF: convertir PPT↔PDF, JPG↔PDF, Word→PDF, PDF→JPG/PNG/PPT, eliminar páginas
  y traducir.
- Exportar de nuevo a PDF, JPG, PNG, PPT o archivos listos para impresión.

Lienzo implementa:
- **Importar PDF**: renderiza la primera página con PDF.js y la agrega como imagen editable.
- **Exportar PDF**: genera un PDF 1.4 propio con la composición actual (sin dependencias).
- Plantillas de documento, currículum, folleto y correo.

La diferencia principal es que Lienzo no descompone el PDF en elementos nativos editables: lo usa
como imagen base sobre la que se puede dibujar y escribir.

### 3.15 Correo y familia de plantillas

La página pública de **Email design** promete diseñar correos visuales para bandejas de entrada.
Las páginas públicas de Instagram, historias, flyers, logos, collage, folletos, currículums y
tarjetas confirman la existencia de plantillas y presets por tipo de formato. Lienzo crea su
propio catálogo original de **13 plantillas** con categorías Redes, Marketing y Documentos, y
presets de página para Instagram, historia, flyer, logo, collage, tarjeta, folleto, correo,
currículum, documento, presentación y A4.

### 3.16 Captura mágica

La URL pública `https://www.canva.com/features/magic-capture/` devuelve **404** en la sesión
observada. Por eso no se documenta aquí una UI concreta de Canva para esa función. Lienzo
implementa una **captura de pantalla del navegador** con `getDisplayMedia`: el usuario elige una
ventana o pestaña, se captura un frame y se agrega como imagen editable. Es una interpretación
funcional del nombre, no una copia de una pantalla de Canva observada.

## 4. Modelo de interacción inferido

A partir de la evidencia anterior, el editor se comporta como un editor de objetos con:

1. **Selección por hit-testing** sobre objetos del lienzo.
2. **Caja de selección transformable**: 8 anclas de redimensionado + 1 de rotación.
3. **Transformaciones numéricas y gestuales equivalentes**: arrastrar y escribir en Position
   producen el mismo estado.
4. **Historial de estados** con Undo/Redo.
5. **Orden Z explícito** y alineación a la página o al conjunto.
6. **Propiedades por tipo**: texto, imagen, forma.
7. **Exportación como composición final del lienzo**, no como captura de la UI.

Estas conclusiones guiaron la implementación de Lienzo.

## 5. Límites de la observación

- **No hubo autenticación.** No se observaron guardado en la nube, colaboración, Brand Kit,
  historial de versiones, comentarios ni exportación real con cuenta.
- **No se usó una cuenta ni un proyecto privado.** Se trabajó con el editor público de una
  plantilla; el modal de login confirmó la barrera de guardado.
- **Cloudflare:** el modo headless quedó bloqueado; fue necesario un navegador normal. Esto no
  invalida la observación, pero condiciona la reproducibilidad.
- **Bundles del editor:** el análisis estático de la portada solo capturó 6 scripts
  (marketing/GTM). El núcleo del editor se sirve en chunks de `static.canva.com` que no se
  analizaron como código. Por eso este informe no afirma cómo está implementado internamente,
  solo cómo se comporta la UI observada.
- **Multi-selección:** no se estableció de forma fiable el gesto de selección múltiple en la
  sesión observada. La implementación de Lienzo soporta ⇧ clic y marquesina como decisión de
  diseño, no como copia de un gesto verificado.
- **Quitar fondo y borrador mágico:** Canva usa modelos de IA; Lienzo usa algoritmos locales de
  color/difusión. La UI y el resultado se inspiran en lo observado, pero no son equivalentes.
- **PDF:** Lienzo importa solo la primera página como imagen; Canva descompone el documento en
  elementos editables y soporta conversiones adicionales.
- **Correo:** Lienzo exporta PNG/PDF; no genera HTML para clientes de correo.
- **Captura mágica:** la página pública devolvió 404; la implementación es una captura de
  pantalla del navegador, no una reproducción de una UI observada.
- **Páginas:** Canva mostró 11 páginas y controles de página. Lienzo implementa un solo
  artboard con capas; el cambio de tamaño de página sí está implementado.
- **Sin reutilización de activos:** no se copiaron fuentes, imágenes, iconos ni código de Canva.
  El recurso abstracto de la plantilla de Lienzo es original y generado por la aplicación.

## 6. Conclusión

Canva organiza la edición alrededor de un **objeto seleccionado** con una caja transformable,
un **toolbar contextual por tipo**, un **panel numérico de posición** y una **lista de capas**.
El usuario puede mover, redimensionar y rotar con gestos, y ajustar los mismos valores con
precisión numérica; Undo revierte esas transformaciones. La exportación se ofrece como una
composición final en varios formatos, con PNG para imágenes complejas.

Lienzo reproduce ese modelo con una implementación propia sobre Canvas 2D, sin dependencias
externas y sin código de Canva. La ampliación añade herramientas locales de imagen, PDF y un
catálogo de 13 plantillas; las diferencias con los modelos de IA y con la edición multipágina de
Canva quedan explícitas en los límites.
