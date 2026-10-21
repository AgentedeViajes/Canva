# Índice de evidencias

## Nota metodológica

Las capturas de `canva-*.png` provienen de la **sesión pública de observación** descrita en
[`../INVESTIGACION-REA.md`](../INVESTIGACION-REA.md). Se tomaron con REA
(`capture_web_screenshot`) o con el mismo endpoint CDP controlado durante la investigación.

No contienen credenciales ni datos de una cuenta: la sesión era anónima. El editor se cargó
desde una **plantilla pública**; el guardado/exportación real de Canva no se ejecutó.

Las capturas `clone-*.png` son pruebas de la aplicación Lienzo en estados intermedios
(selección, arrastre, rotación, etc.). Las capturas limpias y finales están en
[`../lienzo-home.png`](../lienzo-home.png), [`../lienzo-selection.png`](../lienzo-selection.png),
[`../lienzo-position.png`](../lienzo-position.png), [`../lienzo-layers.png`](../lienzo-layers.png),
[`../lienzo-templates.png`](../lienzo-templates.png), [`../lienzo-export.png`](../lienzo-export.png)
y [`../lienzo-png.png`](../lienzo-png.png).

## Canva — capturas de la observación

| Archivo | Qué muestra | Evidencia REA relacionada |
|---|---|---|
| `canva-home.png` | Portada pública; hero con una composición de editor y barra “Archivo / Redimensionar / Editar”. | `ev_b555f89c...` |
| `canva-template.png` | Página de plantilla pública “Navy Gold Futuristic Presentation” y el enlace “Usar plantilla”. | `ev_7272fa10...` |
| `canva-editor-login.png` | Modal “Log in to save your design” sobre el editor; confirma la barrera de guardado. | `ev_c8b0cde7...` (DOM) |
| `canva-editor.png` | Editor invitado ya sin modal: rail Templates/Elements/Text/Uploads/Apps, lienzo y páginas. | `ev_3a029bad...` |
| `canva-selected.png` | Titular seleccionado: caja violeta, 8 manejadores, rotación, toolbar Lock/Duplicate/Delete y barra de texto. | DOM del editor |
| `canva-moved.png` | Resultado de arrastrar un objeto; estado “Unsaved changes” y Undo disponible. | DOM del editor |
| `canva-resized.png` | Después de arrastrar la esquina inferior derecha; el panel numérico refleja el nuevo tamaño. | DOM del editor |
| `canva-rotated.png` | Después de rotar; el campo Rotate pasa a un ángulo negativo. | DOM del editor |
| `canva-position.png` | Panel Position: Arrange, Layers, Forward/Backward/To front/To back, Align to page y Advanced. | DOM del editor |
| `canva-image-toolbar.png` | Imagen de fondo seleccionada: Edit, BG Remover, Eraser, Color, Crop, Flip, Animate, Position. | DOM del editor |
| `canva-text-toolbar.png` | Barra de texto con fuente, tamaño, B/I/U/S, mayúsculas, alineación, spacing, efectos y posición. | DOM del editor |
| `canva-fonts.png` | Panel Font: Text styles, Document fonts, Recommended, Brand fonts (Pro), Popular, Upload a font, buscador. | DOM del editor |
| `canva-colors.png` | Panel Text color: búsqueda, Add a new color, eyedropper, Colors in this design, Photo colors y Default solid colors. | DOM del editor |
| `canva-layers.png` | Panel Layers: filtros All/Overlapping y lista ordenada de capas. | `ev_6af7f407...`, `ev_ebb565d2...` |
| `canva-file-menu.png` | Menú File: Create new design, Settings, Accessibility, Save, Download, Print, etc. | DOM del editor |
| `canva-download-panel.png` | Diálogo Download: tipo de archivo, presets Digital/Print, páginas All/This page/Custom y Advanced Settings. | DOM del editor |
| `canva-file-types.png` | Selector de formatos: PDF, PPTX, MP4, JPG, PNG, SVG (Pro), GIF. | DOM del editor |
| `canva-background-remover.png` | Herramienta pública “Background Remover”: una herramienta, casos People/Products/Animals/Objects/Logos, PNG transparente, Erase/Restore. | `ev_baa8bbbc...`, `ev_6d369e35...` |
| `canva-magic-eraser.png` | Herramienta pública “Magic Eraser”: cepillo sobre distracciones y edición dentro del photo editor. | `ev_216df37c...`, `ev_5d6a9735...` |
| `canva-pdf-editor.png` | Editor público de PDF: subir PDF, convertirlo en elementos editables y exportar PDF/JPG/PNG/PPT. | `ev_d5bf4070...`, `ev_d272ccc8...` |

## Lienzo — capturas de verificación

| Archivo | Qué muestra |
|---|---|
| `clone-drag.png` | Arrastre de un texto con la caja de selección siguiendo al objeto. |
| `clone-rotate.png` | Rotación aplicada mediante el manejador; caja rotada y toolbar. |
| `clone-style.png` | Cambio de color y tipografía desde el inspector. |
| `clone-text-edit.png` | Edición de texto en el sitio con `textarea` superpuesto. |
| `clone-upload.png` | Recurso SVG propio subido y seleccionado, con inspector de imagen. |
| `clone-multiselect.png` | Dos objetos seleccionados y alineados; caja envolvente común. |
| `clone-resize-dialog.png` | Diálogo de redimensionado con presets y escalado de contenido. |
| `clone-present.png` | Modo presentación a pantalla completa con salida por Esc. |
| `../lienzo-tools.png` | Panel Herramientas: quitar fondo, borrador mágico, recorte, captura, PDF y collage. |
| `../lienzo-bg-remove.png` | Diálogo de quitar fondo con vista previa, tolerancia, suavizado y color detectado. |
| `../lienzo-magic-eraser.png` | Borrador mágico con máscara roja pintada sobre la imagen. |
| `../lienzo-pdf-import.png` | PDF importado como página editable. |
| `../lienzo-collage.png` | Plantilla de collage con cuatro fotos y ranuras para rellenar. |
