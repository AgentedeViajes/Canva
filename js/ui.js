import {
  FONTS, FONT_WEIGHTS, FILL_SWATCHES, PAGE_PRESETS,
  clamp, degToRad, escapeHtml, icon, normalizeHex, radToDeg,
} from './util.js';
import {
  elementIcon, elementLabel, newTextPreset, shapePreset,
} from './model.js';
import { ensureImages, renderToCanvas } from './render.js';
import { getTemplates, templateById } from './templates.js';

const PANEL_TITLES = {
  templates: 'Plantillas',
  elements: 'Elementos',
  text: 'Texto',
  uploads: 'Subidos',
  layers: 'Capas',
  tools: 'Herramientas',
  background: 'Fondo',
};

export class UI {
  constructor({ store, callbacks = {} }) {
    this.store = store;
    this.callbacks = callbacks;
    this.activePanel = 'elements';
    this.inspectorTab = 'design';
    this.aspectLocked = false;
    this.templateFilter = 'Todos';
    this.uploads = [];
    this.templateThumbs = new Map();
    this.layerDragId = null;

    this.panel = document.getElementById('panel-content');
    this.panelTitle = document.getElementById('panel-title');
    this.sidePanel = document.getElementById('side-panel');
    this.inspector = document.getElementById('inspector-content');
    this.inspectorTabs = document.querySelectorAll('.inspector-tab');
    this.railButtons = document.querySelectorAll('.rail-btn[data-panel]');

    this.bind();
    this.prepareTemplates();
  }

  bind() {
    for (const btn of this.railButtons) {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        if (this.activePanel === panel && !this.sidePanel.classList.contains('collapsed')) {
          this.closePanel();
          return;
        }
        this.openPanel(panel);
      });
    }
    document.getElementById('panel-close').addEventListener('click', () => this.closePanel());
    for (const tab of this.inspectorTabs) {
      tab.addEventListener('click', () => {
        this.inspectorTab = tab.dataset.tab;
        for (const t of this.inspectorTabs) {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        }
        this.renderInspector(true);
      });
    }
    this.panel.addEventListener('click', (event) => this.onClick(event, true));
    this.inspector.addEventListener('click', (event) => this.onClick(event, false));
    this.panel.addEventListener('input', (event) => this.onInput(event, true));
    this.inspector.addEventListener('input', (event) => this.onInput(event, false));
    this.panel.addEventListener('change', (event) => this.onChange(event, true));
    this.inspector.addEventListener('change', (event) => this.onChange(event, false));
    this.panel.addEventListener('dragover', (event) => this.onPanelDragOver(event));
    this.panel.addEventListener('dragleave', (event) => this.onPanelDragLeave(event));
    this.panel.addEventListener('drop', (event) => this.onPanelDrop(event));
    this.panel.addEventListener('dragstart', (event) => this.onLayerDragStart(event));
    this.panel.addEventListener('dragend', () => {
      this.layerDragId = null;
      this.panel.querySelectorAll('.layer-row').forEach((row) => row.classList.remove('drag-over'));
    });
    this.panel.addEventListener('dragover', (event) => this.onLayerDragOver(event));
    this.panel.addEventListener('drop', (event) => this.onLayerDrop(event));
    this.inspector.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!this.inspector.contains(document.activeElement)) this.renderInspector(true);
      }, 40);
    });
  }

  openPanel(panel) {
    this.activePanel = panel;
    this.sidePanel.classList.remove('collapsed');
    document.querySelector('.app-body')?.classList.remove('panel-hidden');
    for (const btn of this.railButtons) {
      btn.classList.toggle('active', btn.dataset.panel === panel);
    }
    this.renderPanel(true);
  }

  closePanel() {
    this.sidePanel.classList.add('collapsed');
    document.querySelector('.app-body')?.classList.add('panel-hidden');
    for (const btn of this.railButtons) btn.classList.remove('active');
  }

  addUpload(upload) {
    if (!upload?.src) return;
    this.uploads = [upload, ...this.uploads.filter((item) => item.src !== upload.src)].slice(0, 16);
    if (this.activePanel === 'uploads') this.renderPanel();
  }

  async prepareTemplates() {
    const templates = getTemplates();
    for (const template of templates) {
      try {
        await ensureImages(template.doc.elements);
        const canvas = document.createElement('canvas');
        renderToCanvas(canvas, template.doc, { pixelRatio: 0.32 });
        this.templateThumbs.set(template.id, canvas.toDataURL('image/png'));
      } catch {
        /* thumbnails are cosmetic */
      }
    }
    if (this.activePanel === 'templates') this.renderPanel(true);
  }

  getTemplateThumb(doc, id) {
    if (this.templateThumbs.has(id)) return this.templateThumbs.get(id);
    try {
      const canvas = document.createElement('canvas');
      renderToCanvas(canvas, doc, { pixelRatio: 0.24 });
      const url = canvas.toDataURL('image/png');
      this.templateThumbs.set(id, url);
      return url;
    } catch {
      return '';
    }
  }

  renderPanel(force = false) {
    if (!force && this.panel.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    this.panelTitle.textContent = PANEL_TITLES[this.activePanel] || 'Elementos';
    if (this.activePanel === 'templates') this.renderTemplates();
    else if (this.activePanel === 'elements') this.renderElements();
    else if (this.activePanel === 'text') this.renderText();
    else if (this.activePanel === 'uploads') this.renderUploads();
    else if (this.activePanel === 'tools') this.renderTools();
    else if (this.activePanel === 'layers') this.renderLayers();
    else if (this.activePanel === 'background') this.renderBackground();
  }

  renderTemplates() {
    const all = getTemplates();
    const categories = ['Todos', ...new Set(all.map((template) => template.category).filter(Boolean))];
    if (!categories.includes(this.templateFilter)) this.templateFilter = 'Todos';
    const templates = this.templateFilter === 'Todos'
      ? all
      : all.filter((template) => template.category === this.templateFilter);
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label"><span>Empieza con una base</span><span class="link-btn" data-action="open-help">Consejos</span></div>
        <div class="filter-chips">
          ${categories.map((category) => `<button class="filter-chip ${this.templateFilter === category ? 'active' : ''}" data-action="filter-templates" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}
        </div>
        <div class="template-grid">
          ${templates.map((template) => `
            <button class="template-card" data-action="apply-template" data-id="${template.id}" title="Usar plantilla ${escapeHtml(template.name)}">
              <img class="template-thumb" src="${this.getTemplateThumb(template.doc, template.id)}" alt="${escapeHtml(template.name)}">
              <span>${escapeHtml(template.name)}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Documento</span></div>
        <div class="page-options">
          ${PAGE_PRESETS.slice(0, 4).map((preset) => `
            <button class="page-option ${this.store.doc.width === preset.width && this.store.doc.height === preset.height ? 'active' : ''}" data-action="page-preset" data-width="${preset.width}" data-height="${preset.height}">
              <span class="ratio" style="width:${preset.ratio === 'square' ? 22 : preset.ratio === 'portrait' || preset.ratio === 'story' ? 16 : 28}px;height:${preset.ratio === 'square' ? 22 : preset.ratio === 'story' ? 28 : 20}px"></span>
              ${preset.name}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Tu proyecto</span></div>
        <p style="margin:0;color:var(--muted);font-size:11.5px;line-height:1.55">Todo se guarda en tu navegador. Puedes abrir tus propios recursos desde <strong>Subidos</strong> y exportar el resultado final a PNG.</p>
      </div>
    `;
  }

  renderElements() {
    const shapes = [
      { kind: 'rect', label: 'Rectángulo', icon: 'square' },
      { kind: 'ellipse', label: 'Círculo', icon: 'circle' },
      { kind: 'triangle', label: 'Triángulo', icon: 'triangle' },
      { kind: 'star', label: 'Estrella', icon: 'star' },
      { kind: 'line', label: 'Línea', icon: 'line' },
      { kind: 'image', label: 'Imagen', icon: 'image' },
    ];
    const imageEls = this.store.doc.elements.filter((el) => el.type === 'image');
    const recent = imageEls.slice(-6).reverse();
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label"><span>Formas básicas</span></div>
        <div class="element-grid">
          ${shapes.map((shape) => `
            <button class="element-tile" data-action="${shape.kind === 'image' ? 'pick-upload' : 'add-shape'}" data-kind="${shape.kind}" title="Añadir ${shape.label.toLowerCase()}">
              ${icon(shape.icon)}<span>${shape.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Líneas y detalles</span></div>
        <div class="element-grid">
          <button class="element-tile" data-action="add-shape" data-kind="line">${icon('line')}<span>Línea</span></button>
          <button class="element-tile" data-action="add-shape" data-kind="rect">${icon('square')}<span>Marco</span></button>
          <button class="element-tile" data-action="add-shape" data-kind="ellipse">${icon('circle')}<span>Aro</span></button>
        </div>
      </div>
      ${recent.length ? `
        <div class="panel-section">
          <div class="section-label"><span>Imágenes del proyecto</span></div>
          <div class="upload-grid">
            ${recent.map((el) => `
              <button class="upload-card" data-action="select-element" data-id="${el.id}" title="Seleccionar ${escapeHtml(el.name || 'imagen')}">
                <img src="${el.src}" alt="">
                <span>${escapeHtml(el.name || 'Imagen')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="panel-section">
        <div class="section-label"><span>Atajo</span></div>
        <p style="margin:0;color:var(--muted);font-size:11.5px;line-height:1.55">Mantén <kbd>⇧</kbd> y haz clic para seleccionar varios elementos. Luego alinéalos desde <strong>Posición</strong>.</p>
      </div>
    `;
  }

  renderText() {
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label"><span>Añadir texto</span></div>
        <div class="text-presets">
          <button class="text-preset" data-action="add-text" data-kind="heading">
            <span class="caption">Título</span><strong>Añade un titular</strong>
          </button>
          <button class="text-preset" data-action="add-text" data-kind="subheading">
            <span class="caption">Subtítulo</span><span class="sub">Una línea con carácter</span>
          </button>
          <button class="text-preset" data-action="add-text" data-kind="body">
            <span class="caption">Párrafo</span><span class="body">Escribe una idea breve para tu diseño.</span>
          </button>
          <button class="text-preset" data-action="add-text" data-kind="caption">
            <span class="caption">Etiqueta</span><span class="body" style="letter-spacing:.16em;text-transform:uppercase">Texto pequeño</span>
          </button>
        </div>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Consejo</span></div>
        <p style="margin:0;color:var(--muted);font-size:11.5px;line-height:1.55">Haz doble clic sobre un texto del lienzo para editarlo en el sitio. Cambia tipografía, color y espaciado desde el panel <strong>Diseño</strong>.</p>
      </div>
    `;
  }

  renderTools() {
    const selected = this.store.selectedElements;
    const image = selected.find((el) => el.type === 'image') || null;
    const imageCard = image ? `
      <div class="image-selected-card">
        <img src="${image.src}" alt="">
        <div style="min-width:0">
          <strong>${escapeHtml(image.name || 'Imagen')}</strong>
          <span>${image.isPlaceholder ? 'Foto de collage sin rellenar' : `${image.naturalWidth || '?'} × ${image.naturalHeight || '?'} px`}</span>
        </div>
      </div>
    ` : '';
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="tool-section-title">Imagen</div>
        ${imageCard}
        <div class="tool-list">
          <button class="tool-item" data-action="image-bg-remove" ${image ? '' : 'disabled'}>
            <span class="tool-item-icon">${icon('magic')}</span>
            <span class="tool-item-text"><strong>Quitar fondo</strong><span>Recorte automático por bordes y PNG transparente.</span></span>
            <span class="tool-arrow">${icon('chevron')}</span>
          </button>
          <button class="tool-item" data-action="image-magic-eraser" ${image ? '' : 'disabled'}>
            <span class="tool-item-icon orange">${icon('crop')}</span>
            <span class="tool-item-text"><strong>Borrador mágico</strong><span>Pintá una zona y rellenala con su entorno.</span></span>
            <span class="tool-arrow">${icon('chevron')}</span>
          </button>
          <button class="tool-item" data-action="image-crop" ${image ? '' : 'disabled'}>
            <span class="tool-item-icon green">${icon('crop')}</span>
            <span class="tool-item-text"><strong>Recortar</strong><span>Ajustá el encuadre de una imagen.</span></span>
            <span class="tool-arrow">${icon('chevron')}</span>
          </button>
        </div>
        ${image ? '' : '<p class="tool-hint">Seleccioná una imagen en el lienzo o en Capas para habilitar estas herramientas.</p>'}
      </div>
      <div class="panel-section">
        <div class="tool-section-title">Captura y documentos</div>
        <div class="tool-list">
          <button class="tool-item" data-action="capture-screen">
            <span class="tool-item-icon">${icon('capture')}</span>
            <span class="tool-item-text"><strong>Captura mágica</strong><span>Capturá una ventana o pantalla y agregala.</span></span>
            <span class="tool-arrow">${icon('chevron')}</span>
          </button>
          <button class="tool-item" data-action="import-pdf">
            <span class="tool-item-icon orange">${icon('pdf')}</span>
            <span class="tool-item-text"><strong>Importar PDF</strong><span>Convertí la primera página en una imagen editable.</span></span>
            <span class="tool-arrow">${icon('chevron')}</span>
          </button>
          <button class="tool-item" data-action="export-pdf">
            <span class="tool-item-icon green">${icon('download')}</span>
            <span class="tool-item-text"><strong>Exportar PDF</strong><span>Descargá el diseño actual como documento PDF.</span></span>
            <span class="tool-arrow">${icon('chevron')}</span>
          </button>
        </div>
      </div>
      <div class="panel-section">
        <div class="tool-section-title">Collage de fotos</div>
        <div class="collage-choice-grid">
          <button class="collage-choice" data-action="create-collage" data-rows="1" data-cols="2"><span class="collage-preview-grid" style="grid-template-columns:1fr 1fr"><i></i><i></i></span>2 fotos</button>
          <button class="collage-choice" data-action="create-collage" data-rows="2" data-cols="2"><span class="collage-preview-grid" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr"><i></i><i></i><i></i><i></i></span>4 fotos</button>
          <button class="collage-choice" data-action="create-collage" data-rows="3" data-cols="3"><span class="collage-preview-grid" style="grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>9 fotos</button>
        </div>
        <button class="btn btn-soft btn-block btn-sm" data-action="fill-collage" style="margin-top:10px">${icon('upload')}Rellenar collage con fotos</button>
        <p class="tool-hint">Creá una cuadrícula y después reemplazá cada foto. También podés usar la plantilla Collage.</p>
      </div>
      <div class="panel-section">
        <div class="tool-section-title">Documentos y correo</div>
        <div class="tool-list">
          <button class="tool-item" data-action="apply-template" data-id="resume"><span class="tool-item-icon">${icon('text')}</span><span class="tool-item-text"><strong>Currículum</strong><span>Plantilla A4 editable.</span></span><span class="tool-arrow">${icon('chevron')}</span></button>
          <button class="tool-item" data-action="apply-template" data-id="document"><span class="tool-item-icon">${icon('pdf')}</span><span class="tool-item-text"><strong>Documento</strong><span>Informe visual de una página.</span></span><span class="tool-arrow">${icon('chevron')}</span></button>
          <button class="tool-item" data-action="apply-template" data-id="email"><span class="tool-item-icon">${icon('mail')}</span><span class="tool-item-text"><strong>Correo</strong><span>Newsletter vertical para exportar.</span></span><span class="tool-arrow">${icon('chevron')}</span></button>
        </div>
      </div>
    `;
  }

  renderUploads() {
    const unique = new Map();
    for (const upload of this.uploads) unique.set(upload.src, upload);
    for (const el of this.store.doc.elements) {
      if (el.type === 'image' && el.src && !unique.has(el.src)) {
        unique.set(el.src, { src: el.src, name: el.name || 'Imagen', naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight });
      }
    }
    const items = [...unique.values()];
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label"><span>Subir recurso</span></div>
        <div class="upload-drop" id="upload-drop" data-action="pick-upload">
          ${icon('upload')}
          <strong>Haz clic para subir</strong>
          <span>o arrastra imágenes aquí · PNG, JPG, WebP</span>
        </div>
      </div>
      ${items.length ? `
        <div class="panel-section">
          <div class="section-label"><span>Recursos</span><span class="link-btn" data-action="pick-upload">Añadir</span></div>
          <div class="upload-grid">
            ${items.map((item) => `
              <button class="upload-card" data-action="use-upload" data-src="${escapeHtml(item.src)}" data-name="${escapeHtml(item.name || 'Imagen')}" title="Añadir ${escapeHtml(item.name || 'imagen')} al lienzo">
                <img src="${item.src}" alt="">
                <span>${escapeHtml(item.name || 'Imagen')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="panel-section">
        <div class="section-label"><span>Privacidad</span></div>
        <p style="margin:0;color:var(--muted);font-size:11.5px;line-height:1.55">Las imágenes se incrustan en tu proyecto y se guardan localmente en este navegador. No se suben a ningún servidor.</p>
      </div>
    `;
  }

  renderLayers() {
    const elements = [...this.store.doc.elements].reverse();
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label"><span>Orden de capas</span><span class="link-btn" data-action="layers-front">Frente</span></div>
        <div class="layer-list">
          ${elements.length ? elements.map((el) => `
            <div class="layer-row ${this.store.selectedIds.includes(el.id) ? 'selected' : ''}" data-layer-id="${el.id}" draggable="true">
              <span class="layer-grip" title="Arrastrar para reordenar">${icon('grid')}</span>
              <span class="layer-thumb">${el.type === 'image' && el.src ? `<img src="${el.src}" alt="">` : icon(elementIcon(el))}</span>
              <span class="layer-name" title="${escapeHtml(el.name || elementLabel(el))}">${escapeHtml(el.name || elementLabel(el))}</span>
              <span class="layer-actions">
                <button class="layer-mini ${el.hidden ? 'on' : ''}" data-action="toggle-hidden" data-id="${el.id}" title="${el.hidden ? 'Mostrar' : 'Ocultar'}">${icon(el.hidden ? 'eye-off' : 'eye')}</button>
                <button class="layer-mini ${el.locked ? 'on' : ''}" data-action="toggle-lock" data-id="${el.id}" title="${el.locked ? 'Desbloquear' : 'Bloquear'}">${icon(el.locked ? 'lock' : 'unlock')}</button>
              </span>
            </div>
          `).join('') : `
            <div class="inspector-empty" style="padding:28px 10px">
              <div class="empty-icon">${icon('layers')}</div>
              <h3>Sin capas todavía</h3>
              <p>Añade texto, formas o imágenes para verlas aquí.</p>
            </div>
          `}
        </div>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Organización</span></div>
        <div class="arrange-grid">
          <button data-action="arrange" data-mode="forward">${icon('forward')}Traer adelante</button>
          <button data-action="arrange" data-mode="backward">${icon('backward')}Enviar atrás</button>
          <button data-action="arrange" data-mode="front">${icon('front')}Al frente</button>
          <button data-action="arrange" data-mode="back">${icon('back')}Al fondo</button>
        </div>
      </div>
    `;
  }

  renderBackground() {
    this.panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label"><span>Tamaño del lienzo</span></div>
        <div class="page-options">
          ${PAGE_PRESETS.map((preset) => `
            <button class="page-option ${this.store.doc.width === preset.width && this.store.doc.height === preset.height ? 'active' : ''}" data-action="page-preset" data-width="${preset.width}" data-height="${preset.height}">
              <span class="ratio" style="width:${preset.ratio === 'square' ? 22 : preset.ratio === 'portrait' || preset.ratio === 'story' ? 16 : 28}px;height:${preset.ratio === 'square' ? 22 : preset.ratio === 'story' ? 28 : 20}px"></span>
              ${preset.name}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-soft btn-block btn-sm" data-action="open-resize" style="margin-top:10px">${icon('fit')}Medidas personalizadas</button>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Color de fondo</span></div>
        <div class="color-row">
          <span class="color-preview" style="background:${this.store.doc.background}"><input type="color" id="bg-color" value="${this.store.doc.background}" aria-label="Color de fondo"></span>
          <input class="color-hex" id="bg-hex" type="text" value="${this.store.doc.background}" aria-label="Código de color de fondo">
        </div>
        <div class="swatch-grid" style="margin-top:12px">
          ${FILL_SWATCHES.map((color) => `<button class="swatch ${this.store.doc.background === color ? 'active' : ''}" style="background:${color}" data-action="set-bg" data-color="${color}" title="${color}"></button>`).join('')}
        </div>
      </div>
      <div class="panel-section">
        <div class="section-label"><span>Sugerencia</span></div>
        <p style="margin:0;color:var(--muted);font-size:11.5px;line-height:1.55">Para exportar con transparencia, elige <strong>Transparente</strong> en el diálogo de PNG. El color de fondo se conserva en el proyecto.</p>
      </div>
    `;
    const color = document.getElementById('bg-color');
    const hex = document.getElementById('bg-hex');
    color?.addEventListener('input', () => this.store.setBackground(color.value));
    hex?.addEventListener('change', () => {
      const value = normalizeHex(hex.value, this.store.doc.background);
      hex.value = value;
      this.store.setBackground(value);
    });
  }

  renderInspector(force = false) {
    if (!force && this.inspector.contains(document.activeElement) && document.activeElement.matches('input, select, textarea')) return;
    const selected = this.store.selectedElements;
    this.inspector.innerHTML = selected.length ? this.selectionInspector(selected) : this.documentInspector();
  }

  documentInspector() {
    const doc = this.store.doc;
    if (this.inspectorTab === 'position') {
      return `
        <div class="inspector-empty" style="padding-top:30px">
          <div class="empty-icon">${icon('cursor')}</div>
          <h3>Nada seleccionado</h3>
          <p>Selecciona un elemento del lienzo para ver sus medidas, alineación y orden de capa.</p>
        </div>
        <div class="inspector-section">
          <h3>Página</h3>
          <div class="field-row">
            <div class="field"><span>Ancho</span><div class="input-with-unit"><input type="text" value="${doc.width}" readonly><span class="unit">px</span></div></div>
            <div class="field"><span>Alto</span><div class="input-with-unit"><input type="text" value="${doc.height}" readonly><span class="unit">px</span></div></div>
          </div>
          <button class="btn btn-soft btn-block btn-sm" data-action="open-resize" style="margin-top:10px">${icon('fit')}Redimensionar lienzo</button>
        </div>
      `;
    }
    return `
      <div class="inspector-section" style="padding-top:4px">
        <div class="section-label"><span>Diseño de página</span></div>
        <div class="field"><span>Nombre del proyecto</span><input type="text" value="${escapeHtml(doc.name)}" data-scope="doc" data-prop="docName" maxlength="80"></div>
        <div class="field-row">
          <div class="field"><span>Ancho</span><div class="input-with-unit"><input type="text" value="${doc.width}" readonly><span class="unit">px</span></div></div>
          <div class="field"><span>Alto</span><div class="input-with-unit"><input type="text" value="${doc.height}" readonly><span class="unit">px</span></div></div>
        </div>
        <button class="btn btn-soft btn-block btn-sm" data-action="open-resize" style="margin-top:10px">${icon('fit')}Redimensionar</button>
      </div>
      <div class="inspector-section">
        <h3>Fondo</h3>
        <div class="color-row">
          <span class="color-preview" style="background:${doc.background}"><input type="color" value="${doc.background}" data-scope="doc" data-prop="docBackground" aria-label="Color de fondo"></span>
          <input class="color-hex" type="text" value="${doc.background}" data-scope="doc" data-prop="docBackgroundHex" aria-label="Color de fondo en hexadecimal">
        </div>
        <div class="mini-swatches">
          ${FILL_SWATCHES.slice(0, 12).map((color) => `<button class="mini-swatch" style="background:${color}" data-action="set-bg" data-color="${color}" title="${color}"></button>`).join('')}
        </div>
      </div>
      <div class="inspector-section">
        <h3>Exportar</h3>
        <p style="margin:0 0 10px;color:var(--muted);font-size:11.5px;line-height:1.5">PNG de alta calidad, con fondo o transparente, listo para tus propios recursos.</p>
        <button class="btn btn-dark btn-block" data-action="open-export">${icon('download')}Exportar PNG</button>
      </div>
      <div class="inspector-section">
        <h3>Atajos</h3>
        <div class="shortcut-list">
          <div><kbd>⌘ Z</kbd><span>Deshacer</span></div>
          <div><kbd>⇧ clic</kbd><span>Multiselección</span></div>
          <div><kbd>doble clic</kbd><span>Editar texto</span></div>
          <div><kbd>⌘ D</kbd><span>Duplicar</span></div>
        </div>
        <button class="link-btn" data-action="open-help" style="margin-top:10px">Ver todos los atajos</button>
      </div>
    `;
  }

  selectionInspector(selected) {
    const single = selected.length === 1;
    const el = selected[0];
    const allLocked = selected.every((item) => item.locked);
    const bounds = this.store.selectionBounds;
    const multiBadge = selected.length > 1
      ? `<div class="multi-badge">${icon('layers')}${selected.length} elementos seleccionados</div>`
      : '';
    const lockBanner = allLocked
      ? `<div class="lock-banner">${icon('lock')}<span>Elemento bloqueado. Desbloquéalo para moverlo o editarlo.</span></div>`
      : '';
    if (this.inspectorTab === 'position') {
      return `${multiBadge}${lockBanner}${this.positionPanel(selected, single, el, bounds, allLocked)}`;
    }
    return `${multiBadge}${lockBanner}${this.designPanel(selected, single, el)}`;
  }

  designPanel(selected, single, el) {
    const commonFill = selected.every((item) => item.fill === el.fill) ? el.fill : '#111827';
    const commonOpacity = selected.every((item) => item.opacity === el.opacity) ? el.opacity : 1;
    let typeSpecific = '';
    if (single && el.type === 'text') typeSpecific = this.textControls(el);
    else if (single && el.type === 'image') typeSpecific = this.imageControls(el);
    else if (single && ['rect', 'ellipse', 'triangle', 'star', 'line'].includes(el.type)) typeSpecific = this.shapeControls(el);
    else if (!single) {
      typeSpecific = `
        <div class="inspector-section">
          <h3>Color común</h3>
          ${this.colorControl('fill', commonFill, 'Relleno')}
          <p style="margin:8px 0 0;color:var(--muted);font-size:11px;line-height:1.45">El color se aplica a todos los elementos seleccionados.</p>
        </div>
      `;
    }
    return `
      ${typeSpecific}
      <div class="inspector-section">
        <h3>Apariencia</h3>
        <div class="field">
          <span>Opacidad · <b id="opacity-label">${Math.round(commonOpacity * 100)}%</b></span>
          <div class="slider-row">
            <input type="range" min="0" max="100" step="1" value="${Math.round(commonOpacity * 100)}" data-prop="opacity">
            <input class="num" type="number" min="0" max="100" value="${Math.round(commonOpacity * 100)}" data-prop="opacity">
          </div>
        </div>
        <div class="toggle-row"><span>Sombra suave</span><button class="toggle" data-action="toggle-shadow" aria-pressed="${el.shadow ? 'true' : 'false'}"></button></div>
        <div class="field" style="margin-top:10px"><span>Nombre de capa</span><input type="text" value="${escapeHtml(single ? el.name || elementLabel(el) : 'Selección')}" data-prop="elementName" ${single ? '' : 'disabled'}></div>
      </div>
      <div class="inspector-section">
        <h3>Acciones</h3>
        <div class="field-row">
          <button class="btn btn-soft btn-sm" data-action="duplicate">${icon('copy')}Duplicar</button>
          <button class="btn btn-danger btn-sm" data-action="delete">${icon('trash')}Eliminar</button>
        </div>
      </div>
    `;
  }

  textControls(el) {
    return `
      <div class="inspector-section" style="padding-top:2px">
        <h3>Tipografía</h3>
        <div class="field">
          <span>Fuente</span>
          <select data-prop="fontFamily">${this.fontOptions(el.fontFamily)}</select>
        </div>
        <div class="field-row">
          <div class="field"><span>Tamaño</span><input type="number" min="4" max="800" step="1" value="${Math.round(el.fontSize)}" data-prop="fontSize"></div>
          <div class="field"><span>Grosor</span><select data-prop="fontWeight">${FONT_WEIGHTS.map((weight) => `<option value="${weight.value}" ${Number(el.fontWeight) === weight.value ? 'selected' : ''}>${weight.label}</option>`).join('')}</select></div>
        </div>
        <div class="field" style="margin-top:9px"><span>Estilo</span>
          <div class="style-buttons">
            <button data-action="toggle-style" data-style="bold" class="${el.fontWeight >= 700 ? 'active' : ''}" title="Negrita">${icon('bold')}</button>
            <button data-action="toggle-style" data-style="italic" class="${el.fontStyle === 'italic' ? 'active' : ''}" title="Cursiva">${icon('italic')}</button>
            <button data-action="toggle-style" data-style="underline" class="${el.underline ? 'active' : ''}" title="Subrayado">${icon('underline')}</button>
            <button data-action="toggle-style" data-style="uppercase" class="${el.uppercase ? 'active' : ''}" title="Mayúsculas">${icon('text')}</button>
          </div>
        </div>
        <div class="field" style="margin-top:9px"><span>Alineación</span>
          <div class="segmented">
            <button data-action="text-align" data-value="left" class="${el.textAlign === 'left' ? 'active' : ''}" title="Izquierda">${icon('align-left')}</button>
            <button data-action="text-align" data-value="center" class="${el.textAlign === 'center' ? 'active' : ''}" title="Centro">${icon('align-center')}</button>
            <button data-action="text-align" data-value="right" class="${el.textAlign === 'right' ? 'active' : ''}" title="Derecha">${icon('align-right')}</button>
          </div>
        </div>
      </div>
      <div class="inspector-section">
        <h3>Color del texto</h3>
        ${this.colorControl('fill', el.fill, 'Color')}
        ${this.swatchRow('fill', el.fill)}
      </div>
      <div class="inspector-section">
        <h3>Espaciado</h3>
        <div class="field-row">
          <div class="field"><span>Interlineado</span><input type="number" min="0.4" max="3" step="0.05" value="${Number(el.lineHeight).toFixed(2)}" data-prop="lineHeight"></div>
          <div class="field"><span>Entreletra</span><div class="input-with-unit"><input type="number" min="-20" max="60" step="0.5" value="${el.letterSpacing}" data-prop="letterSpacing"><span class="unit">px</span></div></div>
        </div>
        <div class="field-row" style="margin-top:9px">
          <div class="field"><span>Alineación vertical</span><select data-prop="verticalAlign"><option value="top" ${el.verticalAlign === 'top' ? 'selected' : ''}>Arriba</option><option value="middle" ${el.verticalAlign === 'middle' ? 'selected' : ''}>Medio</option><option value="bottom" ${el.verticalAlign === 'bottom' ? 'selected' : ''}>Abajo</option></select></div>
          <div class="field" style="justify-content:flex-end"><button class="btn btn-soft btn-sm" data-action="fit-text">${icon('fit')}Ajustar caja</button></div>
        </div>
      </div>
      <div class="inspector-section">
        <h3>Contenido</h3>
        <div class="field"><span>Texto</span><textarea data-prop="text" rows="4" style="width:100%;border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:12px;resize:vertical;min-height:72px;line-height:1.45">${escapeHtml(el.text)}</textarea></div>
      </div>
    `;
  }

  imageControls(el) {
    return `
      <div class="inspector-section" style="padding-top:2px">
        <h3>Imagen</h3>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
          <img src="${el.src}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--line);flex:0 0 auto">
          <div style="min-width:0;flex:1">
            <div style="font-size:11.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(el.name || 'Imagen')}</div>
            <div style="font-size:10.5px;color:var(--muted);margin-top:2px">${el.naturalWidth || '?'} × ${el.naturalHeight || '?'} px</div>
            <button class="link-btn" data-action="replace-image" style="margin-top:4px">Reemplazar imagen</button>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><span>Ajuste</span><select data-prop="fit"><option value="cover" ${el.fit === 'cover' ? 'selected' : ''}>Rellenar</option><option value="contain" ${el.fit === 'contain' ? 'selected' : ''}>Contener</option></select></div>
          <div class="field"><span>Redondeo</span><div class="input-with-unit"><input type="number" min="0" max="500" step="1" value="${Math.round(el.radius || 0)}" data-prop="radius"><span class="unit">px</span></div></div>
        </div>
        <div class="field-row" style="margin-top:9px">
          <button class="btn btn-soft btn-sm" data-action="flip-x">${icon('flip-h')}Voltear H</button>
          <button class="btn btn-soft btn-sm" data-action="flip-y">${icon('flip-v')}Voltear V</button>
        </div>
        <div class="image-tools-row">
          <button class="btn btn-soft btn-sm" data-action="image-bg-remove">${icon('magic')}Quitar fondo</button>
          <button class="btn btn-soft btn-sm" data-action="image-magic-eraser">${icon('crop')}Borrador</button>
          <button class="btn btn-soft btn-sm" data-action="image-crop">${icon('crop')}Recortar</button>
        </div>
        ${el.isPlaceholder ? `<button class="btn btn-dark btn-block btn-sm" data-action="fill-collage" style="margin-top:8px">${icon('upload')}Rellenar esta foto</button>` : ''}
      </div>
    `;
  }

  shapeControls(el) {
    const isLine = el.type === 'line';
    return `
      <div class="inspector-section" style="padding-top:2px">
        <h3>Relleno y trazo</h3>
        ${!isLine ? this.colorControl('fill', el.fill, 'Relleno') : ''}
        ${!isLine ? this.swatchRow('fill', el.fill) : ''}
        <div style="height:10px"></div>
        ${this.colorControl('stroke', el.stroke === 'transparent' ? '#171717' : el.stroke, 'Trazo')}
        <div class="field-row" style="margin-top:9px">
          <div class="field"><span>Grosor</span><div class="input-with-unit"><input type="number" min="0" max="80" step="0.5" value="${el.strokeWidth || 0}" data-prop="strokeWidth"><span class="unit">px</span></div></div>
          <div class="field"><span>${el.type === 'rect' ? 'Esquinas' : 'Radio'}</span><div class="input-with-unit"><input type="number" min="0" max="500" step="1" value="${Math.round(el.radius || 0)}" data-prop="radius" ${el.type === 'rect' ? '' : 'disabled'}><span class="unit">px</span></div></div>
        </div>
        ${isLine ? `<div class="toggle-row"><span>Punta de flecha</span><button class="toggle" data-action="toggle-arrow" aria-pressed="${el.arrow ? 'true' : 'false'}"></button></div>` : ''}
      </div>
    `;
  }

  positionPanel(selected, single, el, bounds, allLocked) {
    const rotation = single ? radToDeg(el.rotation || 0) : 0;
    const x = single ? el.x : bounds?.x || 0;
    const y = single ? el.y : bounds?.y || 0;
    const w = single ? el.w : bounds?.w || 0;
    const h = single ? el.h : bounds?.h || 0;
    return `
      <div class="inspector-section" style="padding-top:14px">
        <div class="section-label"><span>Medidas</span>${single ? `<button class="link-btn" data-action="toggle-aspect">${icon(this.aspectLocked ? 'lock' : 'unlock')}${this.aspectLocked ? 'Proporción fija' : 'Proporción libre'}</button>` : ''}</div>
        <div class="field-row">
          <div class="field"><span>Ancho</span><div class="input-with-unit"><input type="number" min="1" step="1" value="${Math.round(w)}" data-prop="w" ${!single ? 'disabled' : ''}><span class="unit">px</span></div></div>
          <div class="field"><span>Alto</span><div class="input-with-unit"><input type="number" min="1" step="1" value="${Math.round(h)}" data-prop="h" ${!single ? 'disabled' : ''}><span class="unit">px</span></div></div>
        </div>
        <div class="field-row">
          <div class="field"><span>X</span><div class="input-with-unit"><input type="number" step="1" value="${Math.round(x)}" data-prop="x"><span class="unit">px</span></div></div>
          <div class="field"><span>Y</span><div class="input-with-unit"><input type="number" step="1" value="${Math.round(y)}" data-prop="y"><span class="unit">px</span></div></div>
        </div>
        <div class="field-row">
          <div class="field"><span>Rotación</span><div class="input-with-unit"><input type="number" step="1" value="${Math.round(rotation)}" data-prop="rotationDeg" ${!single ? 'disabled' : ''}><span class="unit">°</span></div></div>
          <div class="field"><span>Opacidad</span><div class="input-with-unit"><input type="number" min="0" max="100" step="1" value="${Math.round((single ? el.opacity : 1) * 100)}" data-prop="opacity"><span class="unit">%</span></div></div>
        </div>
      </div>
      <div class="inspector-section">
        <div class="section-label"><span>Alinear ${single ? 'a la página' : 'entre sí'}</span></div>
        <div class="align-grid">
          <button data-action="align" data-axis="left" title="Izquierda">${icon('align-left')}</button>
          <button data-action="align" data-axis="hcenter" title="Centro horizontal">${icon('align-center')}</button>
          <button data-action="align" data-axis="right" title="Derecha">${icon('align-right')}</button>
          <button data-action="align" data-axis="top" title="Arriba"><span style="transform:rotate(90deg);display:inline-flex">${icon('align-left')}</span></button>
          <button data-action="align" data-axis="vmiddle" title="Centro vertical"><span style="transform:rotate(90deg);display:inline-flex">${icon('align-center')}</span></button>
          <button data-action="align" data-axis="bottom" title="Abajo"><span style="transform:rotate(90deg);display:inline-flex">${icon('align-right')}</span></button>
        </div>
        ${selected.length >= 3 ? `<div class="field-row" style="margin-top:8px"><button class="btn btn-soft btn-sm" data-action="distribute" data-axis="horizontal">Distribuir H</button><button class="btn btn-soft btn-sm" data-action="distribute" data-axis="vertical">Distribuir V</button></div>` : ''}
      </div>
      <div class="inspector-section">
        <div class="section-label"><span>Organizar</span></div>
        <div class="arrange-grid">
          <button data-action="arrange" data-mode="forward">${icon('forward')}Adelante</button>
          <button data-action="arrange" data-mode="backward">${icon('backward')}Atrás</button>
          <button data-action="arrange" data-mode="front">${icon('front')}Al frente</button>
          <button data-action="arrange" data-mode="back">${icon('back')}Al fondo</button>
        </div>
      </div>
      <div class="inspector-section">
        <div class="field-row">
          <button class="btn ${allLocked ? 'btn-soft' : 'btn-soft'} btn-sm" data-action="toggle-flag" data-flag="locked">${icon(allLocked ? 'unlock' : 'lock')}${allLocked ? 'Desbloquear' : 'Bloquear'}</button>
          <button class="btn btn-soft btn-sm" data-action="toggle-flag" data-flag="hidden">${icon('eye-off')}Ocultar</button>
        </div>
      </div>
    `;
  }

  fontOptions(selectedValue) {
    const groups = new Map();
    for (const font of FONTS) {
      if (!groups.has(font.group)) groups.set(font.group, []);
      groups.get(font.group).push(font);
    }
    let options = '';
    for (const [group, fonts] of groups) {
      options += `<optgroup label="${escapeHtml(group)}">`;
      for (const font of fonts) {
        options += `<option value="${escapeHtml(font.value)}" ${selectedValue === font.value ? 'selected' : ''}>${escapeHtml(font.label)}</option>`;
      }
      options += '</optgroup>';
    }
    if (!FONTS.some((font) => font.value === selectedValue)) {
      options = `<option value="${escapeHtml(selectedValue)}" selected>Personalizada</option>${options}`;
    }
    return options;
  }

  colorControl(prop, value, label) {
    const hex = normalizeHex(value, '#111827');
    return `
      <div class="field">
        <span>${escapeHtml(label)}</span>
        <div class="color-row">
          <span class="color-preview" style="background:${hex}"><input type="color" value="${hex}" data-prop="${prop}" aria-label="${escapeHtml(label)}"></span>
          <input class="color-hex" type="text" value="${hex}" data-prop="${prop}Hex" aria-label="${escapeHtml(label)} en hexadecimal">
        </div>
      </div>
    `;
  }

  swatchRow(prop, current) {
    return `<div class="mini-swatches">${FILL_SWATCHES.slice(0, 14).map((color) => `<button class="mini-swatch" style="background:${color}" data-action="swatch" data-prop="${prop}" data-color="${color}" title="${color}"></button>`).join('')}</div>`;
  }

  /* ---------------- Events ---------------- */
  onClick(event, inPanel) {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      this.handleAction(action, actionEl, inPanel, event);
    }
    const row = event.target.closest('.layer-row');
    if (row && !event.target.closest('[data-action]')) {
      this.store.select([row.dataset.layerId], { toggle: event.shiftKey || event.metaKey });
    }
  }

  handleAction(action, el, inPanel, event) {
    const store = this.store;
    switch (action) {
      case 'add-shape':
        if (el.dataset.kind === 'image') this.callbacks.pickImage?.();
        else {
          const shape = shapePreset(el.dataset.kind, store.doc);
          store.addElement(shape);
          this.callbacks.fitSelection?.();
        }
        break;
      case 'add-text':
        store.addElement(newTextPreset(el.dataset.kind, store.doc));
        this.callbacks.fitSelection?.();
        break;
      case 'pick-upload':
        this.callbacks.pickImage?.();
        break;
      case 'image-bg-remove':
        this.callbacks.openImageTool?.('background');
        break;
      case 'image-magic-eraser':
        this.callbacks.openImageTool?.('eraser');
        break;
      case 'image-crop':
        this.callbacks.openImageTool?.('crop');
        break;
      case 'capture-screen':
        this.callbacks.openCapture?.();
        break;
      case 'import-pdf':
        this.callbacks.importPdf?.();
        break;
      case 'export-pdf':
        this.callbacks.exportPdf?.();
        break;
      case 'create-collage':
        this.callbacks.createCollage?.(Number(el.dataset.rows), Number(el.dataset.cols));
        break;
      case 'fill-collage':
        this.callbacks.fillCollage?.();
        break;
      case 'filter-templates':
        this.templateFilter = el.dataset.category || 'Todos';
        this.renderPanel(true);
        break;
      case 'use-upload':
        this.callbacks.useUpload?.(el.dataset.src, el.dataset.name);
        break;
      case 'select-element':
        store.select([el.dataset.id]);
        break;
      case 'apply-template': {
        const doc = templateById(el.dataset.id);
        store.replaceDoc(doc);
        this.callbacks.onDocumentReplaced?.(doc);
        this.callbacks.toast?.('Plantilla aplicada. Puedes deshacer con ⌘Z.');
        break;
      }
      case 'page-preset':
        store.resizePage(Number(el.dataset.width), Number(el.dataset.height), true);
        this.callbacks.onPageResized?.();
        break;
      case 'set-bg':
        store.setBackground(el.dataset.color);
        this.renderPanel();
        break;
      case 'layers-front':
        store.reorderSelected('front');
        break;
      case 'toggle-hidden':
        event.stopPropagation();
        store.toggleElementFlag(el.dataset.id, 'hidden');
        this.renderPanel();
        break;
      case 'toggle-lock':
        event.stopPropagation();
        store.toggleElementFlag(el.dataset.id, 'locked');
        this.renderPanel();
        break;
      case 'arrange':
        store.reorderSelected(el.dataset.mode);
        break;
      case 'align':
        store.alignSelected(el.dataset.axis);
        break;
      case 'distribute':
        store.distributeSelected(el.dataset.axis);
        break;
      case 'duplicate':
        store.duplicateSelected();
        break;
      case 'delete':
        store.deleteSelected();
        break;
      case 'open-export':
        this.callbacks.openExport?.();
        break;
      case 'open-resize':
        this.callbacks.openResize?.();
        break;
      case 'open-help':
        this.callbacks.openHelp?.();
        break;
      case 'toggle-style': {
        const style = el.dataset.style;
        const selected = store.selectedElements;
        if (!selected.length) break;
        if (style === 'bold') {
          const bold = selected.every((item) => Number(item.fontWeight) >= 700);
          store.updateSelected({ fontWeight: bold ? 400 : 700 }, { mergeKey: 'bold' });
        }
        if (style === 'italic') {
          const italic = selected.every((item) => item.fontStyle === 'italic');
          store.updateSelected({ fontStyle: italic ? 'normal' : 'italic' }, { mergeKey: 'italic' });
        }
        if (style === 'underline') store.updateSelected({ underline: !selected.every((item) => item.underline) }, { mergeKey: 'underline' });
        if (style === 'uppercase') store.updateSelected({ uppercase: !selected.every((item) => item.uppercase) }, { mergeKey: 'uppercase' });
        break;
      }
      case 'text-align':
        store.updateSelected({ textAlign: el.dataset.value }, { mergeKey: 'text-align' });
        break;
      case 'fit-text': {
        const selected = store.selectedElements[0];
        if (selected?.type === 'text') {
          const layout = this.callbacks.layoutText?.(selected);
          if (layout) store.updateSelected({ h: Math.max(12, layout.totalHeight + 2) });
        }
        break;
      }
      case 'replace-image':
        this.callbacks.pickImage?.({ replaceId: store.selectedIds[0] });
        break;
      case 'flip-x':
        store.updateSelected({ flipX: !store.selectedElements[0]?.flipX });
        break;
      case 'flip-y':
        store.updateSelected({ flipY: !store.selectedElements[0]?.flipY });
        break;
      case 'toggle-shadow': {
        const all = store.selectedElements.every((item) => item.shadow);
        store.updateSelected({ shadow: !all });
        break;
      }
      case 'toggle-arrow': {
        const all = store.selectedElements.every((item) => item.arrow);
        store.updateSelected({ arrow: !all });
        break;
      }
      case 'toggle-flag': {
        const flag = el.dataset.flag;
        const all = store.selectedElements.every((item) => item[flag]);
        store.apply((doc) => {
          for (const item of doc.elements) {
            if (store.selectedIds.includes(item.id)) item[flag] = !all;
          }
        }, { label: flag === 'locked' ? 'Bloquear' : 'Visibilidad' });
        break;
      }
      case 'toggle-aspect':
        this.aspectLocked = !this.aspectLocked;
        break;
      case 'swatch':
        store.updateSelected({ [el.dataset.prop]: el.dataset.color }, { mergeKey: `swatch-${el.dataset.prop}` });
        break;
      default:
        break;
    }
    if (inPanel && ['toggle-hidden', 'toggle-lock', 'arrange', 'layers-front', 'page-preset'].includes(action)) {
      this.renderPanel();
    }
    if (!inPanel) this.renderInspector();
  }

  onInput(event, inPanel) {
    const input = event.target;
    if (input.id === 'bg-color') return;
    if (input.id === 'bg-hex') return;
    const scope = input.dataset.scope;
    const prop = input.dataset.prop;
    if (!prop) return;
    if (scope === 'doc') {
      this.handleDocInput(input, prop);
      return;
    }
    const selected = this.store.selectedElements;
    if (!selected.length) return;

    if (prop.endsWith('Hex')) {
      const base = prop.slice(0, -3);
      if (/^#?[0-9a-f]{6}$/i.test(input.value.trim())) {
        const color = normalizeHex(input.value, selected[0]?.[base] || '#111827');
        this.store.updateSelected({ [base]: color }, { mergeKey: `color-${base}` });
      }
      return;
    }
    if (prop === 'text') {
      this.store.updateSelected({ text: input.value }, { mergeKey: 'text' });
      return;
    }
    if (prop === 'elementName') {
      const selectedSingle = selected.length === 1 ? selected[0] : null;
      if (selectedSingle) this.store.renameElement(selectedSingle.id, input.value);
      return;
    }

    const numericProps = new Set([
      'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'opacity', 'w', 'h',
      'x', 'y', 'rotationDeg', 'strokeWidth', 'radius',
    ]);
    if (numericProps.has(prop)) {
      let value = Number(input.value);
      if (Number.isNaN(value)) return;
      if (prop === 'opacity') value = clamp(value, 0, 100) / 100;
      if (prop === 'rotationDeg') value = degToRad(value);
      if (prop === 'w' || prop === 'h') {
        value = Math.max(1, value);
        const single = selected.length === 1 ? selected[0] : null;
        if (single && this.aspectLocked) {
          const ratio = single.w / Math.max(1, single.h);
          if (prop === 'w') this.store.updateSelected({ w: value, h: value / ratio }, { mergeKey: 'size' });
          else this.store.updateSelected({ h: value, w: value * ratio }, { mergeKey: 'size' });
        } else {
          this.store.updateSelected({ [prop]: value }, { mergeKey: prop });
        }
        return;
      }
      if ((prop === 'x' || prop === 'y') && selected.length > 1) {
        const b = this.store.selectionBounds;
        const current = prop === 'x' ? b.x : b.y;
        const delta = value - current;
        this.store.apply((doc) => {
          for (const item of doc.elements) {
            if (this.store.selectedIds.includes(item.id)) item[prop] += delta;
          }
        }, { label: 'Mover selección', mergeKey: 'multi-position' });
        return;
      }
      const patch = prop === 'rotationDeg' ? { rotation: value } : { [prop]: value };
      this.store.updateSelected(patch, { mergeKey: prop });
      return;
    }
    this.store.updateSelected({ [prop]: input.value }, { mergeKey: prop });
    if (prop === 'fontFamily' || prop === 'fit' || prop === 'verticalAlign') this.renderInspector();
  }

  handleDocInput(input, prop) {
    if (prop === 'docName') {
      this.store.renameDocument(input.value);
      this.callbacks.onDocumentRenamed?.(input.value);
      return;
    }
    if (prop === 'docBackground') {
      this.store.setBackground(input.value);
      return;
    }
    if (prop === 'docBackgroundHex' && /^#?[0-9a-f]{6}$/i.test(input.value.trim())) {
      this.store.setBackground(normalizeHex(input.value, this.store.doc.background));
    }
  }

  onChange(event, inPanel) {
    const input = event.target;
    if (input.dataset.prop === 'docBackgroundHex' || input.dataset.prop === 'fillHex' || input.dataset.prop === 'strokeHex') {
      const prop = input.dataset.prop.replace(/Hex$/, '');
      const fallback = input.dataset.scope === 'doc' ? this.store.doc.background : this.store.selectedElements[0]?.[prop] || '#111827';
      const color = normalizeHex(input.value, fallback);
      input.value = color;
      if (input.dataset.scope === 'doc') this.store.setBackground(color);
      else this.store.updateSelected({ [prop]: color });
    }
    if (input.dataset.scope === 'doc' && input.dataset.prop === 'docName') {
      this.store.renameDocument(input.value);
    }
    if (input.tagName === 'SELECT' && input.dataset.prop && input.dataset.scope !== 'doc') {
      this.store.updateSelected({ [input.dataset.prop]: input.value });
    }
    if (!inPanel) this.renderInspector(true);
    else this.renderPanel(true);
  }

  onPanelDragOver(event) {
    if (this.activePanel !== 'uploads') return;
    event.preventDefault();
    document.getElementById('upload-drop')?.classList.add('dragover');
  }

  onPanelDragLeave(event) {
    if (this.activePanel !== 'uploads') return;
    document.getElementById('upload-drop')?.classList.remove('dragover');
  }

  onPanelDrop(event) {
    if (this.activePanel !== 'uploads') return;
    if (event.target.closest('.layer-row')) return;
    event.preventDefault();
    document.getElementById('upload-drop')?.classList.remove('dragover');
    const files = [...(event.dataTransfer?.files || [])].filter((file) => file.type.startsWith('image/'));
    if (files.length) this.callbacks.uploadFiles?.(files);
  }

  onLayerDragStart(event) {
    const row = event.target.closest('.layer-row');
    if (!row) return;
    this.layerDragId = row.dataset.layerId;
    try {
      event.dataTransfer.setData('text/plain', this.layerDragId);
      event.dataTransfer.effectAllowed = 'move';
    } catch { /* ignore */ }
  }

  onLayerDragOver(event) {
    const row = event.target.closest('.layer-row');
    if (!row || !this.layerDragId) return;
    event.preventDefault();
    event.stopPropagation();
    this.panel.querySelectorAll('.layer-row').forEach((item) => item.classList.toggle('drag-over', item === row));
  }

  onLayerDrop(event) {
    const row = event.target.closest('.layer-row');
    if (!row || !this.layerDragId) return;
    event.preventDefault();
    event.stopPropagation();
    const targetId = row.dataset.layerId;
    if (targetId === this.layerDragId) return;
    const targetIndex = this.store.doc.elements.findIndex((el) => el.id === targetId);
    if (targetIndex >= 0) this.store.moveLayer(this.layerDragId, targetIndex);
    this.layerDragId = null;
    this.renderPanel(true);
  }
}
