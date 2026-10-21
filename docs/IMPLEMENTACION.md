# Implementación de Lienzo

## 1. Resumen

**Lienzo** es un editor de diseño gráfico local, sin dependencias externas, construido con
HTML, CSS y JavaScript moderno. Reproduce el modelo de edición observado en Canva:

- seleccionar objetos y ver una caja transformable,
- mover, redimensionar y rotar con el puntero,
- ajustar los mismos valores numéricamente,
- organizar por capas y alinear,
- cambiar tipografía y color,
- deshacer y rehacer,
- exportar el lienzo a PNG.

El diseño inicial es un cartel editorial de **1080 × 1080 px** con **11 elementos** (texto,
rectángulo, elipse, estrella, línea e imagen). La aplicación arranca sin red.

## 2. Cómo ejecutar

```bash
cd /Users/javier/Desktop/CLON
npm start
```

Abre <http://127.0.0.1:4173>.

`npm start` ejecuta `server.mjs`, un servidor estático de Node sin dependencias, con MIME types
correctos para módulos ES. No requiere instalación de paquetes.

También se puede servir con cualquier servidor estático que respete los módulos ES; no usar
`file://` directamente porque los módulos se bloquean por origen.

## 3. Arquitectura

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura de la UI, iconos SVG, diálogos, paneles y sprite de iconos. |
| `styles.css` | Sistema visual, layout de 4 columnas, caja de selección, manejadores, capas, inspector, diálogos y modo presentación. |
| `js/app.js` | Arranque, estado de vista, zoom, atajos, carga de archivos, exportación, diálogos, modo presentación y API de depuración. |
| `js/store.js` | Documento, selección, historial undo/redo, transacciones de arrastre, orden Z, alineación, autoguardado y persistencia. |
| `js/model.js` | Modelo de elementos, valores por defecto, plantilla inicial, arte abstracto original, hit-testing, bounds, normalización e importación. |
| `js/render.js` | Render Canvas 2D, layout y ajuste de texto, imágenes, placeholders y exportación a canvas. |
| `js/interactions.js` | Puntero: selección, marquesina, mover, redimensionar, rotar, guías, edición de texto en el sitio y barra flotante. |
| `js/snapping.js` | Objetivos de alineación de página y elementos, cálculo del ajuste y guías. |
| `js/ui.js` | Paneles de plantillas, elementos, texto, subidos, capas y fondo; inspector de diseño y posición. |
| `js/templates.js` | 13 plantillas originales por categoría (Redes, Marketing, Documentos). |
| `js/image-tools.js` | Quitar fondo, difusión para borrador mágico, recorte, placeholders y captura de pantalla. |
| `js/tools-ui.js` | Diálogos de quitar fondo, borrador mágico, recorte y captura. |
| `js/pdf-tools.js` | Importación de PDF con PDF.js y exportación PDF 1.4 propia. |
| `js/collage.js` | Cuadrículas de 2, 4 y 9 fotos con ranuras rellenables. |
| `js/vendor/pdfjs/` | PDF.js 4.10.38 (Apache 2.0) y su worker. |
| `build.mjs` | Copia la app estática a `dist` para Vercel. |
| `vercel.json` | Build y Output Directory de Vercel. |
| `js/util.js` | Utilidades, fuentes, paletas, presets de página, descargas y saneamiento. |
| `server.mjs` | Servidor estático concurrente para desarrollo local. |
| `docs/` | Investigación REA, esta documentación, guía de uso y evidencias. |

### Flujo de estado

```
Store (documento + historial + selección)
   │
   ├── suscripción ──► renderScene() ──► Canvas 2D + overlay DOM
   ├── suscripción ──► UI.renderPanel() / renderInspector()
   └── autosave ─────► localStorage ("lienzo.project.v1")
```

La selección vive fuera del historial: deshacer restaura el documento y conserva solo los IDs
que siguen existiendo.

## 4. Modelo de datos

```js
{
  schema: 1,
  name: "Cartel editorial",
  width: 1080,
  height: 1080,
  background: "#f4efe6",
  elements: [
    {
      id, type, name,
      x, y, w, h, rotation, opacity,
      locked, hidden,
      fill, stroke, strokeWidth, radius, shadow
    }
  ]
}
```

Propiedades específicas:

- **texto:** `text`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `underline`,
  `uppercase`, `textAlign`, `verticalAlign`, `lineHeight`, `letterSpacing`.
- **imagen:** `src` (data URL), `naturalWidth`, `naturalHeight`, `fit`, `flipX`, `flipY`,
  `radius`.
- **línea:** `stroke`, `strokeWidth`, `arrow`.

Los tipos disponibles son `text`, `rect`, `ellipse`, `triangle`, `star`, `line` e `image`.

## 5. Interacciones implementadas

### 5.1 Selección

- Clic sobre un objeto: selección única.
- **⇧ clic / ⌘ clic:** añade o quita de la selección.
- **Arrastrar en vacío:** marquesina; selecciona los objetos que intersecta.
- **⌘ A:** selecciona todo.
- **Esc:** deselecciona.
- Los objetos bloqueados se pueden seleccionar, pero no mover ni transformar.
- La selección múltiple muestra una caja envolvente y una barra flotante común.

Hit-testing en `model.js`:

1. Se recorre el documento de arriba hacia abajo.
2. Se transforma el punto al espacio local del objeto con la rotación inversa.
3. Se comprueba el rectángulo, la elipse o la distancia a la línea.
4. Se ignora lo oculto.

### 5.2 Mover

- Arrastrar un objeto seleccionado mueve **toda la selección**.
- Las posiciones se calculan desde el estado inicial del gesto, no acumulando deltas.
- **Flechas:** 1 px; **⇧ flechas:** 10 px.
- **Ajuste magnético:** imanta bordes y centros del objeto contra:
  - bordes y centros de la página,
  - bordes y centros de los demás objetos.
- Se dibujan guías rosas cuando hay coincidencia.

### 5.3 Redimensionar

Hay 8 manejadores: `nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`.

El cálculo es consciente de la rotación:

1. Se lleva el puntero al espacio local del objeto.
2. Se calcula el nuevo ancho/alto según el lado o esquina arrastrada.
3. Se conserva fijo el ancla opuesta (esquina o lado).
4. Se recalcula el centro rotado y, a partir de él, `x`/`y`.
5. Tamaño mínimo: 12 px.
6. **⇧ en una esquina:** conserva la proporción original.

La misma operación se puede hacer con los campos **Ancho / Alto** del inspector, con bloqueo de
proporción opcional.

### 5.4 Rotar

- Manejador circular debajo de la caja de selección.
- Se calcula el ángulo desde el centro; la rotación se normaliza a `[-π, π]`.
- **⇧:** pasos de 15°.
- Campo numérico **Rotación** en grados.

### 5.5 Organización

- **Capas:** lista en orden Z inverso (la superior primero).
  - seleccionar desde la lista,
  - mostrar/ocultar,
  - bloquear/desbloquear,
  - arrastrar filas para reordenar.
- **Organizar:** Adelante, Atrás, Al frente, Al fondo.
- **Alinear:** izquierda, centro horizontal, derecha, arriba, centro vertical, abajo.
  - con un objeto: contra la página,
  - con varios: contra la caja de la selección.
- **Distribuir:** horizontal o vertical con 3+ objetos.
- **Medidas:** Ancho, Alto, X, Y, Rotación, Opacidad.
- **Proporción fija** opcional.

### 5.6 Tipografía

- 16 familias con agrupación (sans, serif, monoespaciada, display), incluyendo stacks del sistema.
- Tamaño 4–800 px.
- Pesos 300–900.
- Negrita, cursiva, subrayado, mayúsculas.
- Alineación horizontal izquierda/centro/derecha.
- Alineación vertical arriba/medio/abajo.
- Interlineado 0.4–3.
- Espaciado entre letras −100 a 200 px.
- Botón **Ajustar caja** para recalcular la altura al contenido.

### 5.7 Color

- Selector nativo de color + campo hexadecimal.
- Paleta de 30 colores y fila de muestras rápidas.
- Color de relleno, trazo, texto y fondo de página.
- Opacidad por elemento (0–100 %).
- Fondo transparente en exportación.

### 5.8 Texto en el sitio

- **Doble clic** en un texto abre un `textarea` superpuesto, rotado y escalado con el objeto.
- El texto del canvas se oculta mientras se edita para evitar duplicación.
- Al escribir:
  - se actualiza el contenido,
  - se amplía la altura mínima si hace falta,
  - el nombre de capa se sincroniza con la primera línea.
- Al salir del campo se confirma la transacción de historial.
- Un texto completamente vacío se elimina.

### 5.9 Imágenes

- Subida por botón o arrastrando archivos a la ventana.
- Formatos: PNG, JPG, WebP y SVG (según soporte del navegador).
- Se leen como data URL; no se suben a ningún servidor.
- Se añaden al lienzo con proporción original y tamaño máximo del 56 % del lienzo.
- Modos **Rellenar** (cover) y **Contener** (contain).
- Voltear horizontal/vertical, redondeo y opacidad.
- **Reemplazar imagen** desde el inspector.
- La lista **Subidos** muestra los recursos del proyecto y permite reutilizarlos.

### 5.10 Historial

- 80 estados.
- Los cambios continuos se agrupan:
  - un gesto de arrastre = un estado,
  - una edición de texto = un estado,
  - escribir en un campo o mover un slider se fusiona durante 700 ms.
- **⌘ Z** deshacer, **⇧ ⌘ Z** rehacer.
- Botones de la barra superior con estado habilitado/deshabilitado.

### 5.11 Exportación PNG

- Calidades 1×, 2×, 3×.
- Fondo del diseño o transparente.
- Nombre de archivo editable.
- Vista previa y dimensiones finales.
- Render fuera de pantalla a resolución completa con `CanvasRenderingContext2D`.
- `toBlob` → descarga local.
- Se esperan fuentes e imágenes antes de renderizar.
- Verificación:
  - 1080 × 1080 a 1×,
  - 2160 × 2160 a 2×,
  - alfa 0 en la esquina con fondo transparente,
  - alfa 255 con fondo sólido.

### 5.12 Persistencia

- Autoguardado en `localStorage` con debounce de 550 ms.
- Estado “Guardando…” / “Guardado” en la barra superior.
- Si el almacenamiento se llena, se muestra “Sin espacio local”.
- **Archivo → Guardar proyecto (.json)** y **Abrir proyecto** permiten mover el trabajo entre
  navegadores.
- **Archivo → Nuevo** y **Reiniciar diseño** permiten empezar de cero.
- El formato JSON se normaliza al importar: se validan tipos, números y campos faltantes.

### 5.13 Otros

- 13 plantillas originales con miniaturas renderizadas y filtros por categoría.
- Quitar fondo con detección por bordes, tolerancia, suavizado y PNG transparente.
- Borrador mágico con máscara de pincel y relleno por difusión.
- Recorte interactivo de imágenes.
- Captura de ventana/pantalla con `getDisplayMedia`.
- Importación de la primera página de un PDF y exportación a PDF.
- Collage de 2, 4 o 9 fotos con reemplazo en lote.
- Presets para Instagram, historia, flyer, logo, collage, tarjeta, folleto, correo, currículum,
  documento, presentación y A4.
- Cambio de página: Publicación, Presentación, Historia, Retrato, Portada, A4 y medidas
  personalizadas; opción de escalar contenido.
- Modo presentación a pantalla completa con salida por Esc.
- Atajos y diálogo de ayuda.
- API de depuración `window.__lienzo` para pruebas automatizadas.

## 6. Requisitos → implementación

| Requisito del usuario | Implementación | Verificación |
|---|---|---|
| Investigar con REA | `docs/INVESTIGACION-REA.md` + evidencias | Sesión CDP/REA sobre Canva pública. |
| Construir y clonar la aplicación | Editor completo en `index.html`, `styles.css`, `js/` | App carga en Chrome 155 sin errores de consola. |
| Arrastrar elementos | `CanvasInteractions.beginMove/doMove` | x 72 → 236; Undo → 72. |
| Cambiar colores | Inspector de color, paletas, fondo | Relleno `#ef4444` aplicado y exportado. |
| Cambiar tipografías | Selector de 16 fuentes, tamaño, peso, estilos | Georgia + tamaño 96/128 aplicados. |
| Deshacer modificación | Historial + `undo/redo` | Resize/rotación restaurados con Undo. |
| Exportar a PNG | `exportPNG` + diálogo | PNG 2160×2160, 655 111 bytes. |
| Editar imágenes y recursos propios | Subida, reemplazo, lista de recursos | SVG 400×300 subido como elemento 605×454. |
| Organización de elementos | Capas, orden Z, alineación, distribución | Panel de capas con 11 filas; alineación múltiple. |
| Quitar fondo | `removeBackground` + diálogo | 56 % transparente; PNG aplicado y undo. |
| Borrador mágico | `inpaintFromMask` + máscara | 24 135 px de máscara; relleno aplicado. |
| Captura mágica | `captureScreenFrame` + diálogo | UI de selección de ventana; requiere permiso del navegador. |
| Editar PDF/documentos | `importPdfFirstPage` + `exportDocToPdf` | Página 1 importada; PDF de 211 617 bytes válido. |
| Collage de fotos | `createCollageDoc` + ranuras | 4 fotos; 2 reemplazadas en lote. |
| Plantillas sociales, logos, folletos, CV, tarjetas, correo | `templates.js` | 13 plantillas, 4 categorías. |

## 7. Verificación realizada

Entorno: Chrome 155.0.8059.85, macOS, servidor local `node server.mjs`.

| Prueba | Resultado |
|---|---|
| `node --check` de todos los módulos | OK |
| Carga y recarga sin errores de consola | `ERRORS []`, `LOGS []` |
| Selección de titular | 1 ID seleccionado, 8 manejadores |
| Arrastre | `x: 72 → 236`, `y: 186 → 314`; Undo restaura 72/186 |
| Redimensionado | `660×336 → 495×253`; Undo restaura 660×336 |
| Rotación | `-31°`; Undo restaura 0° |
| Color y tamaño | `fill #ef4444`, `fontSize 96` |
| Fuente | `Georgia` aplicada al texto |
| Multiselección | 2 elementos; alinear izquierda usa los bounds de la selección |
| Capas | 11 filas; ocultar cambia `hidden: true` |
| Subida | SVG 400×300 → elemento 605×454, seleccionado |
| Plantilla | “Menos es más”, 6 elementos; Undo vuelve a 11 |
| Redimensionar página | 1080×1080 → 1920×1080; Undo vuelve a 1080×1080 |
| Exportación | 1080×1080 (1×) y 2160×2160 (2×), PNG válido |
| Transparencia | alfa 0 con fondo transparente; 255 con fondo sólido |
| Descarga real | `~/Downloads/Cartel-editorial.png`, 655 111 bytes, 2160×2160 |
| Texto en el sitio | `textarea` con el contenido, edición y undo |
| Presentación | entra/sale con Esc y botón |
| Quitar fondo | 56 % de píxeles transparentes; apply + undo |
| Borrador mágico | máscara 24 135 px; relleno 607 194 bytes + undo |
| Recorte | encuadre 80 % aplicado; 440 106 bytes + undo |
| PDF export | 211 617 bytes, 1 página, Quick Look renderiza |
| PDF import | página 1 de 1, imagen 810 594 bytes, doc 810×810 |
| Collage | 4 ranuras; 2 fotos reemplazadas en lote |
| Plantillas | 13 cartas, categorías Todos/Marketing/Redes/Documentos |
| Build Vercel | `npm run build` → `dist` 2,8 MB; 200 en `index.html` y worker |

Capturas finales:

- [Vista principal](../docs/lienzo-home.png)
- [Selección](../docs/lienzo-selection.png)
- [Posición](../docs/lienzo-position.png)
- [Capas](../docs/lienzo-layers.png)
- [Plantillas](../docs/lienzo-templates.png)
- [Exportación](../docs/lienzo-export.png)
- [PNG exportado](../docs/lienzo-png.png)

Capturas de pruebas intermedias en [`docs/evidence/`](evidence/README.md).

## 8. Límites conocidos

- **Un solo artboard.** No hay varias páginas ni folletos multipágina; sí hay presets y cambio
  de tamaño. La importación de PDF toma solo la primera página.
- **Quitar fondo y borrador mágico no son IA generativa.** Usan color/flood fill y difusión local;
  funcionan mejor con fondos uniformes y objetos pequeños sobre superficies continuas.
- **PDF:** la importación convierte la página en imagen, no en elementos nativos editables.
- **Correo:** no se exporta HTML para clientes de correo; se exporta PNG/PDF.
- **Sin colaboración ni nube.** Todo vive en `localStorage` y archivos JSON locales.
- **Sin edición vectorial de nodos.** Las formas son primitivas; no se editan sus vértices.
- **Sin recorte interactivo de imágenes.** Hay `cover`/`contain`, volteo y redondeo, pero no una
  herramienta de crop con mango propio.
- **Sin filtros ni IA.** No se implementan BG Remover, efectos ni animación.
- **Fuentes limitadas al sistema.** No se descargan fuentes web ni se permite subir fuentes,
  para mantener la aplicación offline y evitar dependencias.
- **Rendimiento:** el historial y el autoguardado serializan el documento; imágenes muy grandes
  pueden agotar la cuota de `localStorage`.
- **El clon es funcional, no un clon visual exacto.** La distribución, los colores y los flujos
  se inspiran en lo observado, pero la marca, los iconos, las plantillas y los recursos son
  propios.

## 9. Ampliaciones naturales

1. Varias páginas con miniaturas y reordenamiento.
2. Recorte de imagen con máscara y zoom/pan interno.
3. Grupos y selección anidada.
4. Exportación SVG y HTML de correo además de PNG/PDF.
5. Fuentes subidas por el usuario con `FontFace`.
6. Colaboración local vía `BroadcastChannel`.
7. Historial con etiquetas y panel de versiones.
8. Pruebas E2E con Playwright además de la API `window.__lienzo`.

## 10. Despliegue estático

El repositorio incluye un build determinista para Vercel:

```bash
npm run build   # genera dist/
node server.mjs dist
```

`build.mjs` copia `index.html`, `styles.css` y `js/` (incluido `js/vendor/pdfjs/`) a `dist/`.
`vercel.json` define:

```json
{
  "buildCommand": "npm run build",
  "installCommand": "echo \"Lienzo: sin dependencias\"",
  "outputDirectory": "dist",
  "cleanUrls": true
}
```

En Vercel, el proyecto debe usar:

- Framework Preset: **Other**
- Root Directory: `./`
- Build Command: **`npm run build`**
- Output Directory: **`dist`**
- Install Command: `echo "Sin dependencias"`

Si el proyecto conserva overrides antiguos (por ejemplo, Output Directory `.` o `public`), hay
que actualizarlos y hacer **Redeploy**. El build `dist` evita depender de la detección automática
de Vercel y reduce el despliegue a unos 2,8 MB.

El paquete `dist` no incluye `docs/`, `server.mjs` ni los lanzadores de macOS: solo la aplicación
necesaria para el navegador. La documentación y las evidencias quedan en GitHub.
