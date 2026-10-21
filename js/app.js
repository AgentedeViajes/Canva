import {
  PAGE_PRESETS, clamp, deepClone, downloadBlob, downloadText,
  loadImage, readFileAsDataURL, sanitizeFilename, uid,
} from './util.js';
import {
  emptyDoc, imageElementFromFile, makeElement, newTextPreset, shapePreset, starterDoc,
} from './model.js';
import {
  ensureImages, layoutText, renderPreview, renderToCanvas, setImageListener,
} from './render.js';
import { Store } from './store.js';
import { UI } from './ui.js';
import { CanvasInteractions } from './interactions.js';
import { getTemplates } from './templates.js';
import { createCollageDoc, collageSlots } from './collage.js';
import { exportDocToPdf, importPdfFirstPage } from './pdf-tools.js';
import { ToolsUI } from './tools-ui.js';

/* ============================================================
   Boot
   ============================================================ */
const initial = starterDoc();
const store = new Store(initial);
store.loadSaved();

const view = { zoom: 1, onZoomDelta: null };
let clipboard = [];
let pendingReplaceId = null;
let pendingCollageFill = false;
let presenting = false;
let uiScheduled = false;
let sceneScheduled = false;
let lastSavedLabel = 'Guardado';

const canvas = document.getElementById('scene');
const stage = document.getElementById('stage');
const stageWrap = document.getElementById('stage-wrap');
const canvasScroll = document.getElementById('canvas-scroll');
const overlay = document.getElementById('overlay');
const selectionLayer = document.getElementById('selection-layer');
const guidesLayer = document.getElementById('guides-layer');
const marquee = document.getElementById('marquee');
const textEditor = document.getElementById('text-editor');
const zoomValue = document.getElementById('zoom-value');
const pageDims = document.getElementById('page-dims');
const saveStatus = document.getElementById('save-status');
const docTitleInput = document.getElementById('doc-title');
const undoBtn = document.getElementById('btn-undo');
const redoBtn = document.getElementById('btn-redo');
const snapBtn = document.getElementById('btn-snap');
const fileInput = document.getElementById('file-input');
const pdfInput = document.getElementById('pdf-input');
const jsonInput = document.getElementById('json-input');
const toolDialog = document.getElementById('tool-dialog');
const exportDialog = document.getElementById('export-dialog');
const resizeDialog = document.getElementById('resize-dialog');
const helpDialog = document.getElementById('help-dialog');

/* ============================================================
   Helpers
   ============================================================ */
function showToast(message, ms = 2800, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`.trim();
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.className = 'toast'; }, ms);
}

function setSaveState(state) {
  if (!saveStatus) return;
  saveStatus.classList.remove('saving', 'error');
  if (state === 'saving') {
    saveStatus.classList.add('saving');
    saveStatus.innerHTML = '<span class="status-dot"></span>Guardando…';
  } else if (state === 'error') {
    saveStatus.classList.add('error');
    saveStatus.innerHTML = '<span class="status-dot"></span>Sin espacio local';
  } else {
    lastSavedLabel = 'Guardado';
    saveStatus.innerHTML = '<span class="status-dot"></span>Guardado';
  }
}
store.onSaveState = setSaveState;

function updateChrome() {
  undoBtn.disabled = !store.canUndo;
  redoBtn.disabled = !store.canRedo;
  if (document.activeElement !== docTitleInput) docTitleInput.value = store.doc.name;
  pageDims.textContent = `${store.doc.width} × ${store.doc.height} px`;
  zoomValue.textContent = `${Math.round(view.zoom * 100)}%`;
  snapBtn.classList.toggle('active', store.snapping);
  snapBtn.setAttribute('aria-pressed', String(store.snapping));
  document.title = `${store.doc.name} — Lienzo`;
}

function scheduleScene() {
  if (sceneScheduled) return;
  sceneScheduled = true;
  requestAnimationFrame(() => {
    sceneScheduled = false;
    renderScene();
  });
}

function scheduleUI() {
  if (uiScheduled) return;
  uiScheduled = true;
  requestAnimationFrame(() => {
    uiScheduled = false;
    ui.renderPanel();
    ui.renderInspector();
    updateChrome();
  });
}

/* ============================================================
   Render
   ============================================================ */
function renderScene() {
  const doc = store.doc;
  const zoom = view.zoom;
  const width = Math.max(40, doc.width * zoom);
  const height = Math.max(40, doc.height * zoom);
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;
  stageWrap.style.width = `${width}px`;
  stageWrap.style.height = `${height}px`;
  const dpr = window.devicePixelRatio || 1;
  const pixelRatio = clamp(zoom * dpr, 1, 2.5);
  renderToCanvas(canvas, doc, { pixelRatio, editingId: interactions.editingId });
  interactions.renderOverlay();
  updateChrome();
}

function fitToScreen() {
  const rect = canvasScroll.getBoundingClientRect();
  const availableW = Math.max(200, rect.width - 110);
  const availableH = Math.max(200, rect.height - 130);
  const doc = store.doc;
  let zoom = Math.min(availableW / doc.width, availableH / doc.height);
  zoom = clamp(zoom, 0.06, 1.6);
  view.zoom = Math.round(zoom * 100) / 100;
  renderScene();
  zoomValue.textContent = `${Math.round(view.zoom * 100)}%`;
}

function setZoom(next, anchorEvent) {
  const old = view.zoom;
  const zoom = clamp(Math.round(next * 100) / 100, 0.06, 4);
  if (zoom === old) return;
  let anchorOffsetX = null;
  let anchorOffsetY = null;
  if (anchorEvent) {
    const rect = canvasScroll.getBoundingClientRect();
    anchorOffsetX = anchorEvent.clientX - rect.left;
    anchorOffsetY = anchorEvent.clientY - rect.top;
  }
  view.zoom = zoom;
  renderScene();
  if (anchorOffsetX != null) {
    const ratio = zoom / old;
    canvasScroll.scrollLeft = (canvasScroll.scrollLeft + anchorOffsetX) * ratio - anchorOffsetX;
    canvasScroll.scrollTop = (canvasScroll.scrollTop + anchorOffsetY) * ratio - anchorOffsetY;
  }
  zoomValue.textContent = `${Math.round(view.zoom * 100)}%`;
}

view.onZoomDelta = (delta, clientX, clientY) => {
  setZoom(view.zoom + delta, { clientX, clientY });
};

/* ============================================================
   UI + interactions
   ============================================================ */
const ui = new UI({
  store,
  callbacks: {
    toast: showToast,
    getTemplates,
    pickImage: (options = {}) => pickImage(options),
    uploadFiles: (files) => uploadFiles(files),
    useUpload: (src, name) => useUpload(src, name),
    openExport: () => openExportDialog(),
    openResize: () => openResizeDialog(),
    openHelp: () => helpDialog.showModal(),
    fitSelection: () => fitToScreen(),
    onDocumentReplaced: () => { fitToScreen(); ui.renderPanel(true); ui.renderInspector(true); updateChrome(); },
    onPageResized: () => { fitToScreen(); ui.renderPanel(true); ui.renderInspector(true); updateChrome(); },
    openImageTool: (type) => toolsUI.open(type, store.selectedElements.find((el) => el.type === 'image')),
    openCapture: () => toolsUI.open('capture'),
    importPdf: () => pdfInput.click(),
    exportPdf: () => exportPdfNow(),
    createCollage: (rows, cols) => createCollage(rows, cols),
    fillCollage: () => fillCollage(),
    onDocumentRenamed: (name) => {
      if (document.activeElement !== docTitleInput) docTitleInput.value = name;
      document.title = `${name} — Lienzo`;
    },
    layoutText,
  },
});

const interactions = new CanvasInteractions({
  canvas,
  stage,
  overlay,
  selectionLayer,
  guidesLayer,
  marquee,
  textEditor,
  scroll: canvasScroll,
  store,
  view,
  requestRender: scheduleScene,
  requestScene: scheduleScene,
  showToast,
  onPositionTab: () => {
    const tab = document.querySelector('.inspector-tab[data-tab="position"]');
    if (tab) tab.click();
  },
});

const toolsUI = new ToolsUI({
  store,
  dialog: toolDialog,
  toast: showToast,
  requestRender: scheduleScene,
  onAddImage: (image) => {
    const el = imageElementFromFile({
      src: image.src,
      naturalWidth: image.width,
      naturalHeight: image.height,
      name: image.name || 'Captura de pantalla',
      doc: store.doc,
    });
    el.name = image.name || 'Captura de pantalla';
    el.isPlaceholder = false;
    store.addElement(el);
    scheduleScene();
  },
});

setImageListener(() => scheduleScene());

/* ============================================================
   Store → UI
   ============================================================ */
store.subscribe((type) => {
  if (type === 'live') {
    scheduleScene();
    return;
  }
  scheduleScene();
  scheduleUI();
  if (type === 'selection') {
    ui.renderInspector(true);
    ui.renderPanel();
  }
  if (type === 'page' || type === 'load') {
    requestAnimationFrame(fitToScreen);
  }
  if (type === 'change' || type === 'commit' || type === 'load') {
    updateChrome();
  }
});

/* ============================================================
   Top bar
   ============================================================ */
docTitleInput.addEventListener('change', () => {
  store.renameDocument(docTitleInput.value);
  docTitleInput.value = store.doc.name;
  updateChrome();
});
docTitleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    docTitleInput.blur();
  }
});

undoBtn.addEventListener('click', () => store.undo());
redoBtn.addEventListener('click', () => store.redo());

document.getElementById('btn-snap').addEventListener('click', () => {
  store.snapping = !store.snapping;
  updateChrome();
  showToast(store.snapping ? 'Ajuste magnético activado' : 'Ajuste magnético desactivado', 1600);
});

document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(view.zoom + 0.1));
document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(view.zoom - 0.1));
document.getElementById('btn-fit').addEventListener('click', fitToScreen);
zoomValue.addEventListener('click', () => { view.zoom = 1; renderScene(); });

/* File menu */
const fileMenu = document.getElementById('file-menu');
document.getElementById('btn-file').addEventListener('click', (event) => {
  event.stopPropagation();
  const expanded = fileMenu.hidden;
  fileMenu.hidden = !expanded;
  document.getElementById('btn-file').setAttribute('aria-expanded', String(expanded));
});
document.addEventListener('click', (event) => {
  if (!fileMenu.hidden && !event.target.closest('.menu-anchor')) {
    fileMenu.hidden = true;
    document.getElementById('btn-file').setAttribute('aria-expanded', 'false');
  }
});
fileMenu.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  fileMenu.hidden = true;
  document.getElementById('btn-file').setAttribute('aria-expanded', 'false');
  const action = button.dataset.action;
  if (action === 'new') newDocument();
  if (action === 'reset') resetDesign();
  if (action === 'export') openExportDialog();
  if (action === 'export-pdf') exportPdfNow();
  if (action === 'import-pdf') pdfInput.click();
  if (action === 'capture') toolsUI.open('capture');
  if (action === 'save-json') saveProject();
  if (action === 'open-json') jsonInput.click();
});

document.getElementById('btn-home').addEventListener('click', newDocument);
document.getElementById('btn-resize').addEventListener('click', openResizeDialog);
document.getElementById('btn-export').addEventListener('click', openExportDialog);
document.getElementById('btn-export-top').addEventListener('click', openExportDialog);
document.getElementById('btn-help').addEventListener('click', () => helpDialog.showModal());
document.getElementById('btn-present').addEventListener('click', enterPresentMode);

/* ============================================================
   File input / upload
   ============================================================ */
function pickImage(options = {}) {
  pendingCollageFill = false;
  pendingReplaceId = options.replaceId || null;
  fileInput.value = '';
  fileInput.click();
}

fileInput.addEventListener('change', async () => {
  const files = [...(fileInput.files || [])];
  if (!files.length) return;
  if (pendingCollageFill) {
    pendingCollageFill = false;
    await fillCollageWithFiles(files);
  } else if (pendingReplaceId) {
    const id = pendingReplaceId;
    pendingReplaceId = null;
    const file = files[0];
    await replaceImageWithFile(id, file);
  } else {
    await uploadFiles(files);
  }
  fileInput.value = '';
});

pdfInput.addEventListener('change', async () => {
  const file = pdfInput.files?.[0];
  if (!file) return;
  pdfInput.value = '';
  await importPdfFile(file);
});


async function loadImageMeta(file) {
  const src = await readFileAsDataURL(file);
  const img = await loadImage(src);
  return {
    src,
    name: file.name.replace(/\.[^.]+$/, '') || 'Imagen',
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  };
}

async function uploadFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  if (!images.length) {
    showToast('Selecciona un archivo de imagen (PNG, JPG o WebP).', 2600, 'error');
    return;
  }
  try {
    const metas = [];
    for (const file of images) {
      const meta = await loadImageMeta(file);
      metas.push(meta);
      ui.addUpload(meta);
    }
    const added = [];
    store.apply((doc) => {
      for (const meta of metas) {
        const el = imageElementFromFile({ ...meta, doc });
        el.x += added.length * 18;
        el.y += added.length * 18;
        doc.elements.push(el);
        added.push(el.id);
      }
    }, { label: 'Añadir imagen' });
    if (added.length) store.select(added);
    showToast(`${metas.length} imagen${metas.length > 1 ? 'es añadidas' : ' añadida'} al lienzo.`);
    ui.renderPanel();
    ui.renderInspector(true);
  } catch (error) {
    console.error(error);
    showToast('No se pudo procesar la imagen.', 3000, 'error');
  }
}

async function replaceImageWithFile(id, file) {
  try {
    const meta = await loadImageMeta(file);
    store.apply((doc) => {
      const el = doc.elements.find((item) => item.id === id);
      if (!el) return;
      el.src = meta.src;
      el.name = meta.name;
      el.naturalWidth = meta.naturalWidth;
      el.naturalHeight = meta.naturalHeight;
      el.isPlaceholder = false;
    }, { label: 'Reemplazar imagen' });
    ui.addUpload(meta);
    showToast('Imagen reemplazada.');
  } catch {
    showToast('No se pudo reemplazar la imagen.', 3000, 'error');
  }
}

function useUpload(src, name) {
  const known = ui.uploads.find((item) => item.src === src)
    || store.doc.elements.find((el) => el.src === src);
  const meta = {
    src,
    name: name || known?.name || 'Imagen',
    naturalWidth: known?.naturalWidth || 0,
    naturalHeight: known?.naturalHeight || 0,
  };
  const selectedPlaceholder = store.selectedElements.find((el) => el.type === 'image' && el.isPlaceholder);
  if (selectedPlaceholder) {
    store.apply((doc) => {
      const target = doc.elements.find((item) => item.id === selectedPlaceholder.id);
      if (!target) return;
      target.src = meta.src;
      target.name = meta.name;
      target.naturalWidth = meta.naturalWidth;
      target.naturalHeight = meta.naturalHeight;
      target.isPlaceholder = false;
    }, { label: 'Rellenar foto' });
    showToast('Foto de collage rellenada.');
    return;
  }
  const el = imageElementFromFile({ ...meta, doc: store.doc });
  store.addElement(el);
  ui.renderPanel();
  showToast('Imagen añadida. Arrástrala para colocarla.');
}

/* Drag and drop on the workspace */
let dragDepth = 0;
window.addEventListener('dragenter', (event) => {
  if (![...(event.dataTransfer?.types || [])].includes('Files')) return;
  dragDepth += 1;
  document.body.classList.add('file-drag');
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) document.body.classList.remove('file-drag');
});
window.addEventListener('dragover', (event) => {
  if (![...(event.dataTransfer?.types || [])].includes('Files')) return;
  event.preventDefault();
});
window.addEventListener('drop', async (event) => {
  if (!event.dataTransfer?.files?.length) return;
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('file-drag');
  await uploadFiles(event.dataTransfer.files);
});

/* ============================================================
   Collage, PDF and image tools
   ============================================================ */
function fillCollage() {
  const slots = collageSlots(store.doc);
  if (!slots.length) {
    showToast('No hay fotos de collage para rellenar. Creá una cuadrícula primero.', 3000, 'error');
    return;
  }
  const selected = store.selectedElements.find((el) => el.type === 'image' && el.isPlaceholder);
  if (selected) {
    const index = slots.findIndex((slot) => slot.id === selected.id);
    if (index >= 0) {
      pendingReplaceId = selected.id;
      fileInput.value = '';
      fileInput.click();
      return;
    }
  }
  pendingCollageFill = true;
  fileInput.value = '';
  fileInput.click();
}

async function fillCollageWithFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/')).slice(0, 30);
  if (!images.length) {
    showToast('Seleccioná imágenes para rellenar el collage.', 2600, 'error');
    return;
  }
  try {
    const metas = [];
    for (const file of images) metas.push(await loadImageMeta(file));
    const slots = collageSlots(store.doc);
    if (!slots.length) {
      await uploadFiles(images);
      return;
    }
    const filledIds = [];
    store.apply((doc) => {
      const currentSlots = collageSlots(doc);
      metas.forEach((meta, index) => {
        const slot = currentSlots[index];
        if (!slot) return;
        const target = doc.elements.find((el) => el.id === slot.id);
        if (!target) return;
        target.src = meta.src;
        target.name = meta.name;
        target.naturalWidth = meta.naturalWidth;
        target.naturalHeight = meta.naturalHeight;
        target.isPlaceholder = false;
        target.fit = 'cover';
        filledIds.push(target.id);
        ui.addUpload(meta);
      });
    }, { label: 'Rellenar collage' });
    store.select(filledIds);
    ui.renderPanel();
    showToast(`${filledIds.length} foto${filledIds.length === 1 ? '' : 's'} colocada${filledIds.length === 1 ? '' : 's'} en el collage.`);
  } catch (error) {
    console.error(error);
    showToast('No se pudieron procesar las fotos del collage.', 3200, 'error');
  }
}

function createCollage(rows = 2, cols = 2) {
  const doc = createCollageDoc(rows, cols);
  store.replaceDoc(doc);
  docTitleInput.value = doc.name;
  fitToScreen();
  ui.renderPanel(true);
  ui.renderInspector(true);
  showToast(`Collage ${rows}×${cols} creado. Usá “Rellenar collage” para agregar tus fotos.`);
}

async function importPdfFile(file) {
  showToast('Importando PDF… puede tardar unos segundos.', 2600);
  try {
    const result = await importPdfFirstPage(file, { scale: 2 });
    const id = uid('image');
    store.apply((doc) => {
      const wasEmpty = doc.elements.length === 0;
      if (wasEmpty) {
        doc.width = Math.round(result.pageWidth);
        doc.height = Math.round(result.pageHeight);
        doc.background = '#ffffff';
      }
      const image = makeElement('image', {
        id,
        name: `PDF · ${file.name.replace(/\.[^.]+$/, '')}`,
        x: wasEmpty ? 0 : Math.round(doc.width * 0.08),
        y: wasEmpty ? 0 : Math.round(doc.height * 0.08),
        w: wasEmpty ? doc.width : Math.round(doc.width * 0.84),
        h: wasEmpty ? doc.height : Math.round(doc.height * 0.84),
        src: result.src,
        naturalWidth: result.width,
        naturalHeight: result.height,
        fit: wasEmpty ? 'cover' : 'contain',
        radius: 0,
      });
      doc.elements.push(image);
    }, { label: 'Importar PDF' });
    store.select([id]);
    fitToScreen();
    ui.renderPanel(true);
    ui.renderInspector(true);
    showToast(`PDF importado: página 1 de ${result.numPages}.`);
  } catch (error) {
    console.error(error);
    showToast(`No se pudo importar el PDF: ${error.message || 'archivo inválido'}`, 4200, 'error');
  }
}

async function exportPdfNow() {
  try {
    showToast('Generando PDF…', 1800);
    await exportDocToPdf(store.doc, {
      scale: 2,
      filename: store.doc.name || 'lienzo',
      download: true,
    });
    showToast('PDF exportado.');
    store.flushSave();
  } catch (error) {
    console.error(error);
    showToast('No se pudo exportar el PDF.', 3200, 'error');
  }
}

/* ============================================================
   Document actions
   ============================================================ */
function newDocument() {
  if (store.doc.elements.length && !window.confirm('¿Crear un lienzo nuevo? Podrás deshacerlo con ⌘Z.')) return;
  const doc = emptyDoc(1080, 1080);
  doc.name = 'Sin título';
  store.replaceDoc(doc, { history: true });
  docTitleInput.value = doc.name;
  fitToScreen();
  ui.openPanel('templates');
  showToast('Lienzo nuevo creado.');
}

function resetDesign() {
  if (!window.confirm('¿Reiniciar el diseño con la plantilla editorial? Se puede deshacer.')) return;
  const doc = starterDoc();
  store.replaceDoc(doc);
  docTitleInput.value = doc.name;
  fitToScreen();
  ui.renderPanel(true);
  ui.renderInspector(true);
  showToast('Diseño reiniciado.');
}

function saveProject() {
  const name = sanitizeFilename(store.doc.name, 'lienzo-proyecto');
  downloadText(store.toJSON(), `${name}.json`);
  showToast('Proyecto descargado como JSON.');
}

jsonInput.addEventListener('change', async () => {
  const file = jsonInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const doc = parsed.doc || parsed;
    store.replaceDoc(doc);
    docTitleInput.value = store.doc.name;
    fitToScreen();
    showToast('Proyecto abierto.');
  } catch {
    showToast('El archivo no es un proyecto válido.', 3200, 'error');
  }
  jsonInput.value = '';
});

/* ============================================================
   Resize dialog
   ============================================================ */
const resizePresets = document.getElementById('resize-presets');
const resizeWidth = document.getElementById('resize-width');
const resizeHeight = document.getElementById('resize-height');
const resizeScaleContent = document.getElementById('resize-scale-content');

for (const preset of PAGE_PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preset-btn';
  button.dataset.width = preset.width;
  button.dataset.height = preset.height;
  button.dataset.ratio = preset.ratio;
  button.innerHTML = `<strong>${preset.name}</strong><span>${preset.width} × ${preset.height}</span>`;
  button.addEventListener('click', () => {
    resizeWidth.value = preset.width;
    resizeHeight.value = preset.height;
    resizePresets.querySelectorAll('.preset-btn').forEach((btn) => btn.classList.toggle('active', btn === button));
  });
  resizePresets.appendChild(button);
}

function openResizeDialog() {
  resizeWidth.value = store.doc.width;
  resizeHeight.value = store.doc.height;
  resizeScaleContent.checked = true;
  resizePresets.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.width) === store.doc.width && Number(btn.dataset.height) === store.doc.height);
  });
  resizeDialog.showModal();
}

document.getElementById('btn-apply-resize').addEventListener('click', (event) => {
  event.preventDefault();
  const width = clamp(Number(resizeWidth.value) || store.doc.width, 100, 8000);
  const height = clamp(Number(resizeHeight.value) || store.doc.height, 100, 8000);
  store.resizePage(width, height, resizeScaleContent.checked);
  resizeDialog.close();
  fitToScreen();
  showToast(`Lienzo redimensionado a ${width} × ${height} px.`);
});

/* ============================================================
   Export dialog
   ============================================================ */
const exportPreviewCanvas = document.getElementById('export-preview-canvas');
const exportScale = document.getElementById('export-scale');
const exportBackground = document.getElementById('export-background');
const exportName = document.getElementById('export-name');
const exportMeta = document.getElementById('export-meta');

function updateExportMeta() {
  const scale = Number(exportScale.value) || 1;
  const transparent = exportBackground.value === 'transparent';
  const w = Math.round(store.doc.width * scale);
  const h = Math.round(store.doc.height * scale);
  const optionLabels = [
    `1× — ${Math.round(store.doc.width)} px`,
    `2× — ${Math.round(store.doc.width * 2)} px`,
    `3× — ${Math.round(store.doc.width * 3)} px`,
  ];
  [...exportScale.options].forEach((option, index) => {
    if (optionLabels[index]) option.textContent = optionLabels[index];
  });
  exportMeta.innerHTML = `<strong>${w} × ${h} px</strong>${transparent ? 'Fondo transparente' : 'Con fondo del diseño'}<br>Formato PNG · 8 bits`;
  renderPreview(exportPreviewCanvas, store.doc, 178, 178, transparent);
}

function openExportDialog() {
  exportName.value = sanitizeFilename(store.doc.name, 'lienzo-diseno');
  exportScale.value = '2';
  exportBackground.value = 'solid';
  updateExportMeta();
  exportDialog.showModal();
  requestAnimationFrame(updateExportMeta);
}

exportScale.addEventListener('change', updateExportMeta);
exportBackground.addEventListener('change', updateExportMeta);

document.getElementById('btn-download').addEventListener('click', async (event) => {
  event.preventDefault();
  const button = document.getElementById('btn-download');
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = 'Generando PNG…';
  try {
    await exportPNG({
      scale: Number(exportScale.value) || 1,
      transparent: exportBackground.value === 'transparent',
      filename: exportName.value,
    });
    exportDialog.close();
  } catch (error) {
    console.error(error);
    showToast('No se pudo generar el PNG.', 3200, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});

async function renderExportCanvas({ scale = 1, transparent = false } = {}) {
  await ensureImages(store.doc.elements);
  if (document.fonts?.ready) await document.fonts.ready;
  const exportCanvas = document.createElement('canvas');
  renderToCanvas(exportCanvas, store.doc, { pixelRatio: scale, transparent });
  return exportCanvas;
}

async function exportPNG({ scale = 2, transparent = false, filename = 'lienzo-diseno', download = true } = {}) {
  const exportCanvas = await renderExportCanvas({ scale, transparent });
  const blob = await new Promise((resolve, reject) => {
    exportCanvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG vacío'))), 'image/png');
  });
  if (download) {
    downloadBlob(blob, `${sanitizeFilename(filename, 'lienzo-diseno')}.png`);
    showToast(`PNG exportado (${exportCanvas.width} × ${exportCanvas.height} px).`);
    store.flushSave();
  }
  return { blob, width: exportCanvas.width, height: exportCanvas.height, canvas: exportCanvas };
}

async function exportDataURL(options = {}) {
  const canvasEl = await renderExportCanvas(options);
  return canvasEl.toDataURL('image/png');
}

/* ============================================================
   Present mode
   ============================================================ */
function enterPresentMode() {
  if (presenting) return;
  presenting = true;
  document.body.classList.add('presenting');
  const exit = document.createElement('button');
  exit.id = 'present-exit';
  exit.className = 'present-exit';
  exit.textContent = 'Salir (Esc)';
  exit.addEventListener('click', exitPresentMode);
  document.body.appendChild(exit);
  fitToScreen();
  setTimeout(fitToScreen, 60);
  showToast('Modo presentación · Esc para salir', 2400);
}

function exitPresentMode() {
  presenting = false;
  document.body.classList.remove('presenting');
  document.getElementById('present-exit')?.remove();
  fitToScreen();
}

/* ============================================================
   Keyboard
   ============================================================ */
window.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
  if (typing) return;
  if (document.querySelector('dialog[open]')) {
    if (event.key === 'Escape' && presenting) exitPresentMode();
    return;
  }
  const mod = event.metaKey || event.ctrlKey;
  if (event.key === 'Escape') {
    if (presenting) { exitPresentMode(); return; }
    store.clearSelection();
    return;
  }
  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
    return;
  }
  if (mod && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    store.redo();
    return;
  }
  if (mod && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    store.duplicateSelected();
    return;
  }
  if (mod && event.key.toLowerCase() === 'a') {
    event.preventDefault();
    store.selectAll();
    return;
  }
  if (mod && event.key.toLowerCase() === 'c') {
    if (store.selectedElements.length) {
      clipboard = deepClone(store.selectedElements);
      showToast(`${clipboard.length} elemento${clipboard.length > 1 ? 's copiados' : ' copiado'}.`, 1400);
    }
    return;
  }
  if (mod && event.key.toLowerCase() === 'x') {
    if (store.selectedElements.length) {
      clipboard = deepClone(store.selectedElements);
      store.deleteSelected();
    }
    return;
  }
  if (mod && event.key.toLowerCase() === 'v') {
    if (!clipboard.length) return;
    event.preventDefault();
    const ids = [];
    store.apply((doc) => {
      for (const source of clipboard) {
        const copy = deepClone(source);
        copy.id = uid(source.type);
        copy.x += 28;
        copy.y += 28;
        copy.locked = false;
        copy.name = `${source.name || 'Elemento'} copia`;
        doc.elements.push(copy);
        ids.push(copy.id);
      }
    }, { label: 'Pegar' });
    store.select(ids);
    showToast('Elementos pegados.');
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (store.selectedIds.length) {
      event.preventDefault();
      store.deleteSelected();
    }
    return;
  }
  if (mod && event.key === ']') {
    event.preventDefault();
    store.reorderSelected(event.shiftKey ? 'front' : 'forward');
    return;
  }
  if (mod && event.key === '[') {
    event.preventDefault();
    store.reorderSelected(event.shiftKey ? 'back' : 'backward');
    return;
  }
  if (mod && (event.key === '=' || event.key === '+')) {
    event.preventDefault();
    setZoom(view.zoom + 0.1);
    return;
  }
  if (mod && event.key === '-') {
    event.preventDefault();
    setZoom(view.zoom - 0.1);
    return;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    if (!store.selectedIds.length) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -step;
    if (event.key === 'ArrowRight') dx = step;
    if (event.key === 'ArrowUp') dy = -step;
    if (event.key === 'ArrowDown') dy = step;
    store.apply((doc) => {
      for (const el of doc.elements) {
        if (!store.selectedIds.includes(el.id) || el.locked) continue;
        el.x += dx;
        el.y += dy;
      }
    }, { label: 'Mover', mergeKey: 'nudge' });
  }
});

/* ============================================================
   Resize handling
   ============================================================ */
window.addEventListener('resize', () => {
  if (presenting) fitToScreen();
});

/* ============================================================
   Initial paint
   ============================================================ */
ui.openPanel('elements');
ui.renderInspector(true);
updateChrome();
requestAnimationFrame(() => {
  fitToScreen();
  renderScene();
});
if (document.fonts?.ready) {
  document.fonts.ready.then(() => scheduleScene());
}
setTimeout(() => {
  fitToScreen();
  ui.renderPanel(true);
  ui.renderInspector(true);
}, 120);

/* ============================================================
   Debug API (used by the browser verification pass)
   ============================================================ */
window.__lienzo = {
  store,
  ui,
  interactions,
  view,
  fitToScreen,
  renderScene,
  uploadFiles,
  useUpload,
  exportPdfNow,
  importPdfFile,
  createCollage,
  fillCollage,
  toolsUI,
  exportDataURL,
  exportPNG,
  addText: (kind = 'heading') => store.addElement(newTextPreset(kind, store.doc)),
  addShape: (kind = 'rect') => store.addElement(shapePreset(kind, store.doc)),
  selectElement: (id) => store.select([id]),
  setZoom,
  getState: () => ({
    doc: deepClone(store.doc),
    selectedIds: [...store.selectedIds],
    zoom: view.zoom,
    canUndo: store.canUndo,
    canRedo: store.canRedo,
  }),
};
