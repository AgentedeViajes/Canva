# Guía de uso de Lienzo

## Arranque

```bash
cd /Users/javier/Desktop/CLON
npm start
```

Abre <http://127.0.0.1:4173>. La aplicación funciona sin conexión y guarda el proyecto en
`localStorage`.

## Mapa de la interfaz

- **Barra superior:** nombre del proyecto, Archivo, Redimensionar, Exportar, Undo/Redo,
  Presentar y Exportar PNG.
- **Rail izquierdo:** Plantillas, Elementos, Texto, Subidos, Capas, Fondo y Ayuda.
- **Panel lateral:** contenido de la herramienta activa.
- **Lienzo:** área de edición; el zoom se controla abajo a la derecha.
- **Inspector derecho:** pestañas **Diseño** y **Posición** para el objeto seleccionado.
- **Barra inferior:** ajuste magnético, dimensiones, zoom y ajustar a pantalla.

## Añadir contenido

### Texto

1. Pulsa **Texto** en el rail.
2. Elige Título, Subtítulo, Párrafo o Etiqueta.
3. El texto aparece centrado y seleccionado.
4. Haz doble clic sobre él para editarlo en el sitio.

### Formas

1. Pulsa **Elementos**.
2. Elige Rectángulo, Círculo, Triángulo, Estrella o Línea.
3. Ajusta relleno, trazo, grosor, esquinas y opacidad en **Diseño**.

### Imágenes propias

- **Subidos → Haz clic para subir** o arrastra una imagen a la ventana.
- Se admiten PNG, JPG, WebP y SVG.
- Cada imagen se incrusta en el proyecto; no se envía a ningún servidor.
- Desde el inspector puedes reemplazarla, cambiar entre Rellenar/Contener, voltearla y
  redondear sus esquinas.

## Herramientas de imagen y documentos

Pulsá **Herramientas** en el rail izquierdo. Las acciones de imagen se habilitan cuando hay una
imagen seleccionada.

### Quitar fondo

1. Seleccioná una imagen.
2. **Herramientas → Quitar fondo**.
3. Ajustá **Tolerancia** y **Suavizado de borde**.
4. Probá los modos **Fondo conectado a los bordes** o **Todo el color de fondo**.
5. Pulsá **Aplicar**. Se genera un PNG transparente.
6. Podés deshacer con **⌘ Z**.

Funciona mejor con fondos uniformes; no es un modelo de IA.

### Borrador mágico

1. Seleccioná una imagen.
2. **Herramientas → Borrador mágico**.
3. Ajustá el tamaño del pincel.
4. Pintá sobre el objeto o distracción.
5. Pulsá **Aplicar**; la zona se rellena con los píxeles del entorno.
6. **Borrar máscara** limpia lo pintado.

### Recortar

1. Seleccioná una imagen.
2. **Herramientas → Recortar**.
3. Arrastrá el recuadro para moverlo.
4. **Aplicar recorte**.

### Captura mágica

1. **Herramientas → Captura mágica**.
2. **Elegir ventana** y autorizá el permiso del navegador.
3. Cuando aparezca la vista previa, **Añadir al lienzo**.

Requiere que la app se sirva por `http://localhost` o HTTPS.

## Collage de fotos

1. **Herramientas → Collage**.
2. Elegí 2, 4 o 9 fotos.
3. Se crea una cuadrícula con ranuras.
4. Pulsá **Rellenar collage con fotos** y seleccioná varias imágenes.
5. También podés seleccionar una ranura y usar **Rellenar esta foto** desde el inspector.

## PDF y documentos

- **Importar PDF:** **Archivo → Importar PDF…** o **Herramientas → Importar PDF**. Se convierte
  la **primera página** en una imagen editable sobre la que podés escribir y dibujar.
- **Exportar PDF:** **Archivo → Exportar PDF…** o **Herramientas → Exportar PDF**. Genera un PDF
  con el diseño actual.
- **Plantillas de documento:** Documento, Currículum, Folleto y Correo.
- **Exportar PNG:** para correos, la exportación es como imagen PNG o PDF; no se genera HTML para
  clientes de correo.

## Plantillas por categoría

En **Plantillas** podés filtrar por **Todos, Marketing, Redes y Documentos**:

- Instagram, Historia, Flyer, Logo, Collage, Folleto, Currículum, Tarjeta, Correo, Documento,
  Editorial, Minimal y Manifiesto.

Cada plantilla se puede editar y deshacer como cualquier diseño.

## Seleccionar, mover y transformar

| Acción | Cómo |
|---|---|
| Seleccionar | Clic sobre el objeto. |
| Selección múltiple | **⇧ clic** o **⌘ clic**; también arrastra una marquesina en vacío. |
| Mover | Arrastra el objeto; se mueve toda la selección. |
| Mover con precisión | Flechas (1 px) o **⇧ flechas** (10 px). |
| Redimensionar | Arrastra uno de los 8 manejadores. |
| Mantener proporción | **⇧** mientras arrastras una esquina. |
| Rotar | Arrastra el manejador circular inferior. |
| Rotar en pasos | **⇧** mientras rotas (15°). |
| Deseleccionar | Clic en vacío o **Esc**. |
| Duplicar | **⌘ D** o el botón de la barra flotante. |
| Eliminar | **⌫** o el botón de la barra flotante. |
| Bloquear | Candado de la barra flotante o **Posición → Bloquear**. |

### Guías y ajuste

El botón **Imán** de la barra inferior activa las guías. Al mover un objeto, sus bordes y centros
se alinean con la página y con los demás objetos; aparece una guía rosa cuando hay coincidencia.

### Edición de texto

- **Doble clic** en un texto.
- Escribe y pulsa **Esc** o haz clic fuera para confirmar.
- El texto vacío se elimina.
- En **Diseño** puedes ajustar fuente, tamaño, peso, estilos, alineación, color, interlineado,
  espaciado y alineación vertical.
- **Ajustar caja** recalcula la altura del cuadro al contenido.

## Organizar

### Posición

Pestaña **Posición** del inspector:

- **Medidas:** Ancho, Alto, X, Y, Rotación, Opacidad.
- **Proporción fija:** candado junto a “Medidas”.
- **Alinear a la página:** izquierda, centro, derecha, arriba, medio, abajo.
- **Alinear entre sí:** las mismas seis opciones cuando hay varios objetos.
- **Distribuir:** horizontal o vertical con 3+ objetos.
- **Organizar:** Adelante, Atrás, Al frente, Al fondo.
- **Bloquear / Ocultar.**

### Capas

1. Pulsa **Capas**.
2. La fila superior es el objeto más adelante en Z.
3. Haz clic para seleccionar.
4. Usa el ojo para mostrar/ocultar y el candado para bloquear.
5. Arrastra una fila para reordenar.
6. Usa los botones inferiores para enviar al frente o al fondo.

## Color y tipografía

- **Color de texto / relleno / trazo:** selector nativo, código hexadecimal y muestras rápidas.
- **Fondo de página:** panel **Fondo** o inspector sin selección.
- **Tipografía:** 16 familias del sistema, tamaño, peso, negrita, cursiva, subrayado,
  mayúsculas, alineación y espaciado.

## Deshacer y rehacer

- **⌘ Z** deshacer.
- **⇧ ⌘ Z** rehacer.
- Botones de flecha en la barra superior.
- El historial guarda 80 estados y agrupa gestos continuos.

## Exportar a PNG

1. Pulsa **Exportar PNG**.
2. Elige la calidad: 1×, 2× o 3×.
3. Elige **Fondo del diseño** o **Transparente**.
4. Cambia el nombre si quieres.
5. Pulsa **Descargar PNG**.

La exportación renderiza el lienzo completo fuera de pantalla, espera fuentes e imágenes y
descarga el archivo. Ejemplo: un lienzo de 1080×1080 a 2× produce 2160×2160 px.

## Redimensionar el lienzo

- **Redimensionar** en la barra superior.
- Presets: Publicación, Presentación, Historia, Retrato, Portada, A4.
- Medidas personalizadas de 100 a 8000 px.
- **Escalar los elementos proporcionalmente** está activado por defecto.
- Se puede deshacer.

## Plantillas y proyecto

- **Plantillas:** cuatro diseños originales; al aplicar uno se puede deshacer.
- **Archivo → Guardar proyecto (.json):** descarga el documento.
- **Archivo → Abrir proyecto:** carga un JSON de Lienzo.
- **Archivo → Nuevo:** lienzo en blanco.
- **Archivo → Reiniciar diseño:** vuelve a la plantilla Editorial.
- El autoguardado se indica con “Guardando…” / “Guardado” en la barra superior.

## Modo presentación

Pulsa **Presentar** para ocultar la UI y ver el diseño a pantalla completa. Sal con **Esc** o con
el botón **Salir (Esc)**.

## Atajos

| Atajo | Acción |
|---|---|
| `⌘ Z` | Deshacer |
| `⇧ ⌘ Z` | Rehacer |
| `⌘ D` | Duplicar |
| `⌘ A` | Seleccionar todo |
| `⌘ C` / `⌘ X` / `⌘ V` | Copiar / cortar / pegar |
| `⌫` | Eliminar |
| `Esc` | Deseleccionar / salir de presentación |
| `⇧` + clic | Selección múltiple |
| `⌘ ]` / `⌘ [` | Traer adelante / enviar atrás |
| `⇧ ⌘ ]` / `⇧ ⌘ [` | Al frente / al fondo |
| Flechas | Mover 1 px |
| `⇧` + flechas | Mover 10 px |
| `⌘ +` / `⌘ -` | Zoom |
| Espacio + arrastrar | Mover el lienzo |
| `⌘` + rueda | Zoom |

## Solución de problemas

- **La página queda vacía o no carga los módulos:** usa `npm start` y abre
  `http://127.0.0.1:4173`; no abras `index.html` con `file://`.
- **No aparece un cambio guardado:** revisa que el navegador permita `localStorage`; el estado
  se muestra en la barra superior.
- **“Sin espacio local”:** las imágenes incrustadas ocupan cuota. Elimina recursos no usados o
  descarga el proyecto como JSON.
- **Una fuente se ve distinta:** Lienzo usa fuentes instaladas en el sistema; si una familia no
  existe, el navegador aplica el fallback indicado.
- **No se puede mover un objeto:** puede estar bloqueado; usa el candado en Capas o en Posición.
