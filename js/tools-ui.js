import { icon } from './util.js';
import {
  captureScreenFrame, cropImage, imageToCanvas, inpaintFromMask,
  removeBackground, sampleBackgroundColor,
} from './image-tools.js';

export class ToolsUI {
  constructor({ store, dialog, toast, requestRender, onAddImage }) {
    this.store = store;
    this.dialog = dialog;
    this.title = document.getElementById('tool-title');
    this.subtitle = document.getElementById('tool-subtitle');
    this.body = document.getElementById('tool-body');
    this.actions = document.getElementById('tool-actions');
    this.toast = toast || (() => {});
    this.requestRender = requestRender || (() => {});
    this.onAddImage = onAddImage || (() => {});
    this.cleanup = null;
    this.currentElementId = null;
    this.busy = false;

    document.getElementById('tool-close').addEventListener('click', () => this.close());
    this.dialog.addEventListener('close', () => {
      if (this.cleanup) this.cleanup();
      this.cleanup = null;
      this.currentElementId = null;
      this.busy = false;
    });
  }

  close() {
    this.dialog.close();
  }

  open(type, element = null) {
    this.busy = false;
    if (element) this.currentElementId = element.id;
    if (type === 'background') return this.openBackground(element);
    if (type === 'eraser') return this.openEraser(element);
    if (type === 'capture') return this.openCapture();
    if (type === 'crop') return this.openCrop(element);
    return this.openBackground(element);
  }

  setHeader(title, subtitle) {
    this.title.textContent = title;
    this.subtitle.textContent = subtitle;
  }

  setActions(buttons) {
    this.actions.innerHTML = '';
    for (const button of buttons) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `btn ${button.primary ? 'btn-primary' : 'btn-ghost'}`;
      el.textContent = button.label;
      el.disabled = Boolean(button.disabled);
      el.addEventListener('click', button.onClick);
      this.actions.appendChild(el);
    }
  }

  setBusy(value) {
    this.busy = value;
    for (const button of this.actions.querySelectorAll('button')) {
      if (button.dataset.keepEnabled === 'true') continue;
      button.disabled = value;
    }
  }

  getElement() {
    return this.store.doc.elements.find((el) => el.id === this.currentElementId) || null;
  }

  openBackground(element) {
    if (!element || element.type !== 'image') {
      this.toast('Seleccioná una imagen para quitarle el fondo.', 2800);
      return;
    }
    this.setHeader('Quitar fondo', 'Detecta el fondo desde los bordes y genera un PNG transparente.');
    this.body.innerHTML = `
      <div class="tool-preview-wrap"><div class="tool-canvas-stack"><canvas id="bg-preview"></canvas></div></div>
      <div class="tool-controls">
        <label class="tool-control"><span>Tolerancia <b id="bg-tolerance-value">32</b></span><input id="bg-tolerance" type="range" min="4" max="120" step="1" value="32"></label>
        <label class="tool-control"><span>Suavizado de borde <b id="bg-feather-value">2</b></span><input id="bg-feather" type="range" min="0" max="8" step="1" value="2"></label>
        <label class="tool-control"><span>Modo</span><select id="bg-mode"><option value="edges">Fondo conectado a los bordes</option><option value="global">Todo el color de fondo</option></select></label>
        <label class="tool-control"><span>Color detectado</span><span class="tool-bg-chip"><i id="bg-swatch"></i><b id="bg-hex">—</b></span></label>
      </div>
      <p class="tool-hint">Funciona mejor con fondos uniformes o con degradados suaves. Si el sujeto toca el borde, subí o bajá la tolerancia y revisá el resultado.</p>
      <div class="tool-status" id="bg-status">Analizando fondo…</div>
    `;
    this.setActions([
      { label: 'Cancelar', onClick: () => this.close() },
      { label: 'Aplicar', primary: true, onClick: () => this.applyBackground() },
    ]);
    this.dialog.showModal();

    const canvas = document.getElementById('bg-preview');
    const tolerance = document.getElementById('bg-tolerance');
    const feather = document.getElementById('bg-feather');
    const mode = document.getElementById('bg-mode');
    const status = document.getElementById('bg-status');
    let previewTimer = null;
    let token = 0;
    let lastResult = null;

    const drawOriginal = async () => {
      const info = await imageToCanvas(element.src, 900);
      canvas.width = info.width;
      canvas.height = info.height;
      canvas.getContext('2d').drawImage(info.canvas, 0, 0);
      const bg = await sampleBackgroundColor(element.src);
      document.getElementById('bg-swatch').style.background = bg.hex;
      document.getElementById('bg-hex').textContent = bg.hex;
    };

    const runPreview = async () => {
      const id = ++token;
      status.classList.remove('error');
      status.textContent = 'Procesando vista previa…';
      try {
        const result = await removeBackground(element.src, {
          tolerance: Number(tolerance.value),
          feather: Number(feather.value),
          mode: mode.value,
          maxDim: 900,
        });
        if (id !== token) return;
        const img = new Image();
        img.onload = () => {
          if (id !== token) return;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          status.textContent = `Fondo detectado: ${result.background} · ${Math.round(result.removedRatio * 100)}% de píxeles transparentes.`;
        };
        img.src = result.src;
        lastResult = result;
      } catch (error) {
        if (id !== token) return;
        status.classList.add('error');
        status.textContent = error.message || 'No se pudo procesar la imagen.';
      }
    };

    const schedulePreview = () => {
      document.getElementById('bg-tolerance-value').textContent = tolerance.value;
      document.getElementById('bg-feather-value').textContent = feather.value;
      clearTimeout(previewTimer);
      previewTimer = setTimeout(runPreview, 180);
    };
    tolerance.addEventListener('input', schedulePreview);
    feather.addEventListener('input', schedulePreview);
    mode.addEventListener('change', schedulePreview);

    drawOriginal().then(runPreview).catch((error) => {
      status.textContent = error.message || 'No se pudo cargar la imagen.';
      status.classList.add('error');
    });

    this.applyBackground = async () => {
      if (this.busy) return;
      this.setBusy(true);
      const applyButton = [...this.actions.querySelectorAll('button')].find((b) => b.textContent === 'Aplicar');
      if (applyButton) applyButton.textContent = 'Aplicando…';
      status.textContent = 'Aplicando a resolución completa…';
      try {
        const result = await removeBackground(element.src, {
          tolerance: Number(tolerance.value),
          feather: Number(feather.value),
          mode: mode.value,
          maxDim: 2400,
        });
        this.store.apply((doc) => {
          const target = doc.elements.find((item) => item.id === element.id);
          if (!target) return;
          target.src = result.src;
          target.naturalWidth = result.width;
          target.naturalHeight = result.height;
          target.isPlaceholder = false;
          target.name = target.name || 'Imagen sin fondo';
        }, { label: 'Quitar fondo' });
        this.requestRender();
        this.toast('Fondo eliminado. El PNG conserva transparencia.');
        this.close();
      } catch (error) {
        status.classList.add('error');
        status.textContent = error.message || 'No se pudo aplicar.';
        this.setBusy(false);
        if (applyButton) applyButton.textContent = 'Aplicar';
      }
    };

    this.cleanup = () => {
      clearTimeout(previewTimer);
      token += 1;
    };
  }

  openEraser(element) {
    if (!element || element.type !== 'image') {
      this.toast('Seleccioná una imagen para usar el borrador mágico.', 2800);
      return;
    }
    this.setHeader('Borrador mágico', 'Pintá sobre el objeto o distracción y Lienzo rellenará la zona con su entorno.');
    this.body.innerHTML = `
      <div class="tool-preview-wrap"><div class="tool-canvas-stack">
        <canvas id="eraser-base"></canvas>
        <canvas id="eraser-mask" class="mask"></canvas>
      </div></div>
      <div class="tool-controls">
        <label class="tool-control"><span>Tamaño del pincel <b id="eraser-size-value">26</b> px</span><input id="eraser-size" type="range" min="6" max="90" step="1" value="26"></label>
        <div class="tool-control"><span>Máscara</span><button class="btn btn-soft btn-sm" id="eraser-clear" type="button">Borrar máscara</button></div>
      </div>
      <p class="tool-hint">El relleno se calcula con los píxeles que rodean la zona pintada. Funciona mejor en fondos simples, cielos, paredes o superficies continuas.</p>
      <div class="tool-status" id="eraser-status">Pintá con el mouse o el dedo sobre la zona a quitar.</div>
    `;
    this.setActions([
      { label: 'Cancelar', onClick: () => this.close() },
      { label: 'Aplicar', primary: true, onClick: () => this.applyEraser() },
    ]);
    this.dialog.showModal();

    const base = document.getElementById('eraser-base');
    const mask = document.getElementById('eraser-mask');
    const size = document.getElementById('eraser-size');
    const sizeValue = document.getElementById('eraser-size-value');
    const status = document.getElementById('eraser-status');
    const clear = document.getElementById('eraser-clear');
    let drawing = false;
    let lastPoint = null;
    let maskTouched = false;

    imageToCanvas(element.src, 900).then((info) => {
      base.width = info.width;
      base.height = info.height;
      base.getContext('2d').drawImage(info.canvas, 0, 0);
      mask.width = info.width;
      mask.height = info.height;
      mask.getContext('2d').clearRect(0, 0, mask.width, mask.height);
    }).catch(() => {
      status.textContent = 'No se pudo cargar la imagen.';
      status.classList.add('error');
    });

    const point = (event) => {
      const rect = mask.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (mask.width / rect.width),
        y: (event.clientY - rect.top) * (mask.height / rect.height),
      };
    };
    const paint = (from, to, width) => {
      const ctx = mask.getContext('2d');
      ctx.strokeStyle = 'rgba(239, 68, 68, .78)';
      ctx.fillStyle = 'rgba(239, 68, 68, .78)';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      maskTouched = true;
    };
    const down = (event) => {
      event.preventDefault();
      drawing = true;
      lastPoint = point(event);
      const width = Number(size.value) * (mask.width / Math.max(1, mask.getBoundingClientRect().width));
      paint(lastPoint, lastPoint, width);
      mask.setPointerCapture?.(event.pointerId);
    };
    const move = (event) => {
      if (!drawing) return;
      const next = point(event);
      const width = Number(size.value) * (mask.width / Math.max(1, mask.getBoundingClientRect().width));
      paint(lastPoint, next, width);
      lastPoint = next;
    };
    const up = () => { drawing = false; lastPoint = null; };
    mask.addEventListener('pointerdown', down);
    mask.addEventListener('pointermove', move);
    mask.addEventListener('pointerup', up);
    mask.addEventListener('pointercancel', up);
    mask.addEventListener('pointerleave', up);
    size.addEventListener('input', () => { sizeValue.textContent = size.value; });
    clear.addEventListener('click', () => {
      mask.getContext('2d').clearRect(0, 0, mask.width, mask.height);
      maskTouched = false;
      status.textContent = 'Máscara limpia. Pintá de nuevo.';
      status.classList.remove('error');
    });

    this.applyEraser = async () => {
      if (this.busy) return;
      if (!maskTouched) {
        this.toast('Pintá primero la zona que querés borrar.', 2400);
        return;
      }
      this.setBusy(true);
      status.textContent = 'Rellenando con el entorno…';
      status.classList.remove('error');
      try {
        const result = await inpaintFromMask(element.src, mask, { maxDim: 1800, iterations: 32 });
        this.store.apply((doc) => {
          const target = doc.elements.find((item) => item.id === element.id);
          if (!target) return;
          target.src = result.src;
          target.naturalWidth = result.width;
          target.naturalHeight = result.height;
          target.isPlaceholder = false;
        }, { label: 'Borrador mágico' });
        this.requestRender();
        this.toast('Zona rellenada. Podés deshacer si no te convence.');
        this.close();
      } catch (error) {
        status.textContent = error.message || 'No se pudo aplicar el relleno.';
        status.classList.add('error');
        this.setBusy(false);
      }
    };

    this.cleanup = () => {
      mask.removeEventListener('pointerdown', down);
      mask.removeEventListener('pointermove', move);
      mask.removeEventListener('pointerup', up);
      mask.removeEventListener('pointercancel', up);
      mask.removeEventListener('pointerleave', up);
    };
  }

  openCapture() {
    this.setHeader('Captura mágica', 'Capturá una ventana, pestaña o pantalla y agregala al lienzo.');
    this.body.innerHTML = `
      <div class="tool-preview-wrap dark" id="capture-preview">
        <div class="tool-empty" style="color:#a1a1aa">
          <div class="empty-icon" style="background:#27272a;border-color:#3f3f46;color:#a1a1aa">${icon('capture')}</div>
          <p style="margin:0">Elegí una ventana o pantalla.<br>El navegador te va a pedir permiso.</p>
        </div>
      </div>
      <p class="tool-hint">La captura se incorpora como una imagen editable. En macOS podés elegir una ventana o una pestaña del navegador.</p>
      <div class="tool-status" id="capture-status"></div>
    `;
    let captured = null;
    const preview = document.getElementById('capture-preview');
    const status = document.getElementById('capture-status');
    this.setActions([
      { label: 'Cancelar', onClick: () => this.close() },
      { label: 'Elegir ventana', onClick: async () => {
        status.textContent = 'Esperando permiso del navegador…';
        status.classList.remove('error');
        try {
          captured = await captureScreenFrame();
          preview.innerHTML = '';
          const img = document.createElement('img');
          img.src = captured.src;
          img.alt = 'Captura de pantalla';
          img.style.maxWidth = '100%';
          img.style.maxHeight = '48vh';
          img.style.borderRadius = '8px';
          preview.appendChild(img);
          status.textContent = `${captured.width} × ${captured.height} px capturados.`;
          const addButton = [...this.actions.querySelectorAll('button')].find((b) => b.textContent === 'Añadir al lienzo');
          if (addButton) addButton.disabled = false;
        } catch (error) {
          status.classList.add('error');
          status.textContent = error.name === 'NotAllowedError'
            ? 'Permiso cancelado. Volvé a intentar y elegí una ventana.'
            : (error.message || 'No se pudo capturar la pantalla.');
        }
      } },
      { label: 'Añadir al lienzo', primary: true, disabled: true, onClick: () => {
        if (!captured) return;
        this.onAddImage({ ...captured, name: 'Captura de pantalla' });
        this.toast('Captura agregada al lienzo.');
        this.close();
      } },
    ]);
    this.dialog.showModal();
  }

  openCrop(element) {
    if (!element || element.type !== 'image') {
      this.toast('Seleccioná una imagen para recortarla.', 2600);
      return;
    }
    this.setHeader('Recortar imagen', 'Ajustá el encuadre y aplicá el recorte.');
    this.body.innerHTML = `
      <div class="tool-preview-wrap"><div class="tool-canvas-stack" id="crop-stack">
        <canvas id="crop-canvas"></canvas>
        <div id="crop-box" style="position:absolute;border:2px solid #8b5cf6;box-shadow:0 0 0 9999px rgba(0,0,0,.35);cursor:move;left:10%;top:10%;width:80%;height:80%"></div>
      </div></div>
      <p class="tool-hint">Arrastrá el recuadro para moverlo. El recorte se aplica sobre la imagen original.</p>
      <div class="tool-status" id="crop-status">Encuadre inicial: 80% central.</div>
    `;
    this.setActions([
      { label: 'Cancelar', onClick: () => this.close() },
      { label: 'Aplicar recorte', primary: true, onClick: () => this.applyCrop() },
    ]);
    this.dialog.showModal();
    const canvas = document.getElementById('crop-canvas');
    const box = document.getElementById('crop-box');
    let imageInfo = null;
    let drag = null;
    imageToCanvas(element.src, 1200).then((info) => {
      imageInfo = info;
      canvas.width = info.width;
      canvas.height = info.height;
      canvas.getContext('2d').drawImage(info.canvas, 0, 0);
    }).catch(() => {
      document.getElementById('crop-status').textContent = 'No se pudo cargar la imagen.';
    });
    const onDown = (event) => {
      event.preventDefault();
      const rect = box.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, w: rect.width, h: rect.height, parent: box.parentElement.getBoundingClientRect() };
      box.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const parent = drag.parent;
      const maxX = parent.width - drag.w;
      const maxY = parent.height - drag.h;
      const left = Math.max(0, Math.min(maxX, drag.left - parent.left + dx));
      const top = Math.max(0, Math.min(maxY, drag.top - parent.top + dy));
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${drag.w}px`;
      box.style.height = `${drag.h}px`;
    };
    const onUp = () => { drag = null; };
    box.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    this.applyCrop = async () => {
      if (!imageInfo) return;
      const parent = box.parentElement.getBoundingClientRect();
      const rect = box.getBoundingClientRect();
      const crop = {
        x: (rect.left - parent.left) / parent.width,
        y: (rect.top - parent.top) / parent.height,
        w: rect.width / parent.width,
        h: rect.height / parent.height,
      };
      this.setBusy(true);
      try {
        const result = await cropImage(element.src, crop, { maxDim: 3000 });
        this.store.apply((doc) => {
          const target = doc.elements.find((item) => item.id === element.id);
          if (!target) return;
          target.src = result.src;
          target.naturalWidth = result.width;
          target.naturalHeight = result.height;
          target.isPlaceholder = false;
        }, { label: 'Recortar imagen' });
        this.requestRender();
        this.toast('Imagen recortada.');
        this.close();
      } catch (error) {
        document.getElementById('crop-status').textContent = error.message || 'No se pudo recortar.';
        this.setBusy(false);
      }
    };
    this.cleanup = () => {
      box.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }
}
