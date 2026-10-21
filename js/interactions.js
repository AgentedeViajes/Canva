import {
  clamp, deepClone, icon, radToDeg, rotatePoint,
} from './util.js';
import {
  elementIntersectsRect, elementLabel, hitTest,
  selectionBounds,
} from './model.js';
import { calculateSnap } from './snapping.js';
import { layoutText } from './render.js';

const HANDLE_CURSORS = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
  sw: 'nesw-resize', w: 'ew-resize',
};

export class CanvasInteractions {
  constructor({
    canvas, stage, overlay, selectionLayer, guidesLayer, marquee, textEditor,
    scroll, store, view, requestRender, requestScene, showToast, onPositionTab,
  }) {
    this.canvas = canvas;
    this.stage = stage;
    this.overlay = overlay;
    this.selectionLayer = selectionLayer;
    this.guidesLayer = guidesLayer;
    this.marquee = marquee;
    this.textEditor = textEditor;
    this.scroll = scroll;
    this.store = store;
    this.view = view;
    this.requestRender = requestRender || (() => {});
    this.requestScene = requestScene || (() => {});
    this.showToast = showToast || (() => {});
    this.onPositionTab = onPositionTab || (() => {});

    this.mode = null;
    this.drag = null;
    this.pan = null;
    this.spaceDown = false;
    this.editingId = null;
    this.editingInitial = null;
    this.guides = [];

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onDoubleClick = this.onDoubleClick.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
    this._onSelectionPointerDown = this.onSelectionPointerDown.bind(this);
    this._onSelectionClick = this.onSelectionClick.bind(this);
    this._onTextInput = this.onTextInput.bind(this);
    this._onTextBlur = this.onTextBlur.bind(this);
    this._onTextKeyDown = this.onTextKeyDown.bind(this);

    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('dblclick', this._onDoubleClick);
    this.scroll.addEventListener('wheel', this._onWheel, { passive: false });
    this.selectionLayer.addEventListener('pointerdown', this._onSelectionPointerDown);
    this.selectionLayer.addEventListener('click', this._onSelectionClick);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.textEditor.addEventListener('input', this._onTextInput);
    this.textEditor.addEventListener('blur', this._onTextBlur);
    this.textEditor.addEventListener('keydown', this._onTextKeyDown);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('dblclick', this._onDoubleClick);
    this.scroll.removeEventListener('wheel', this._onWheel);
    this.selectionLayer.removeEventListener('pointerdown', this._onSelectionPointerDown);
    this.selectionLayer.removeEventListener('click', this._onSelectionClick);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.textEditor.removeEventListener('input', this._onTextInput);
    this.textEditor.removeEventListener('blur', this._onTextBlur);
    this.textEditor.removeEventListener('keydown', this._onTextKeyDown);
  }

  get zoom() {
    return this.view.zoom || 1;
  }

  pointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * this.store.doc.width,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * this.store.doc.height,
    };
  }

  isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  onKeyDown(event) {
    if (this.isTypingTarget(event.target)) return;
    if (event.code === 'Space' && !this.spaceDown) {
      this.spaceDown = true;
      this.scroll.classList.add('panning');
      event.preventDefault();
    }
  }

  onKeyUp(event) {
    if (event.code === 'Space') {
      this.spaceDown = false;
      this.scroll.classList.remove('panning');
    }
  }

  onWheel(event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      this.view.onZoomDelta?.(event.deltaY > 0 ? -0.1 : 0.1, event.clientX, event.clientY);
    }
  }

  onPointerDown(event) {
    if (event.button === 2) return;
    if (this.editingId) {
      // A click outside the inline editor commits the text; the click is then
      // allowed to continue as a normal canvas interaction.
      this.textEditor.blur();
    }
    if (event.button === 1 || this.spaceDown) {
      event.preventDefault();
      this.mode = 'pan';
      this.pan = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        scrollLeft: this.scroll.scrollLeft,
        scrollTop: this.scroll.scrollTop,
      };
      this.scroll.classList.add('panning');
      return;
    }
    if (event.button !== 0) return;

    const point = this.pointFromEvent(event);
    const hit = hitTest(this.store.doc, point);
    const additive = event.shiftKey || event.metaKey;

    if (!hit) {
      if (!additive) this.store.clearSelection();
      this.mode = 'marquee';
      this.drag = {
        start: point,
        current: point,
        additive,
        initialSelection: [...this.store.selectedIds],
      };
      this.marquee.hidden = false;
      this.updateMarquee(point, point);
      this.canvas.setPointerCapture?.(event.pointerId);
      return;
    }

    if (event.shiftKey || event.metaKey) {
      this.store.select([hit.id], { toggle: true });
    } else if (!this.store.selectedIds.includes(hit.id)) {
      this.store.select([hit.id]);
    }

    if (hit.locked) {
      this.showToast('Este elemento está bloqueado. Desbloquéalo en Capas o en el panel de posición.');
      return;
    }
    if (!this.store.selectedIds.includes(hit.id)) return;

    this.beginMove(point);
    this.canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  beginMove(point) {
    const selected = this.store.selectedElements.filter((el) => !el.locked);
    if (!selected.length) return;
    this.mode = 'move';
    this.store.beginLive('Mover');
    this.drag = {
      start: point,
      initial: deepClone(selected),
      bounds: selectionBounds(selected),
      ids: selected.map((el) => el.id),
    };
    this.guides = [];
    this.clearGuides();
  }

  onSelectionPointerDown(event) {
    const handle = event.target.closest('[data-handle]');
    const rotate = event.target.closest('[data-rotate]');
    if (!handle && !rotate) return;
    event.preventDefault();
    event.stopPropagation();
    const selected = this.store.selectedElements;
    if (selected.length !== 1) return;
    const el = selected[0];
    if (el.locked) {
      this.showToast('Desbloquea el elemento para transformarlo.');
      return;
    }
    if (handle) this.beginResize(handle.dataset.handle, event);
    else this.beginRotate(event);
  }

  beginResize(handle, event) {
    const el = this.store.selectedElements[0];
    if (!el) return;
    this.mode = 'resize';
    this.store.beginLive('Redimensionar');
    this.drag = {
      handle,
      initial: deepClone(el),
      start: this.pointFromEvent(event),
    };
    this.clearGuides();
  }

  beginRotate(event) {
    const el = this.store.selectedElements[0];
    if (!el) return;
    const center = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
    const point = this.pointFromEvent(event);
    this.mode = 'rotate';
    this.store.beginLive('Rotar');
    this.drag = {
      initial: deepClone(el),
      center,
      startAngle: Math.atan2(point.y - center.y, point.x - center.x),
    };
    this.clearGuides();
  }

  onPointerMove(event) {
    if (this.mode === 'pan' && this.pan) {
      const dx = event.clientX - this.pan.startClientX;
      const dy = event.clientY - this.pan.startClientY;
      this.scroll.scrollLeft = this.pan.scrollLeft - dx;
      this.scroll.scrollTop = this.pan.scrollTop - dy;
      return;
    }
    if (!this.mode) return;

    if (this.mode === 'marquee') {
      const point = this.pointFromEvent(event);
      this.drag.current = point;
      this.updateMarquee(this.drag.start, point);
      return;
    }

    if (this.mode === 'move') {
      this.doMove(event);
      return;
    }
    if (this.mode === 'resize') {
      this.doResize(event);
      return;
    }
    if (this.mode === 'rotate') {
      this.doRotate(event);
    }
  }

  onPointerUp(event) {
    if (this.mode === 'pan') {
      this.mode = null;
      this.pan = null;
      this.scroll.classList.remove('panning');
      return;
    }
    if (this.mode === 'marquee') {
      const { start, current, additive, initialSelection } = this.drag;
      this.marquee.hidden = true;
      const rect = {
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        w: Math.abs(current.x - start.x),
        h: Math.abs(current.y - start.y),
      };
      this.mode = null;
      this.drag = null;
      if (rect.w < 4 && rect.h < 4) {
        if (!additive) this.store.clearSelection();
        return;
      }
      const hits = this.store.doc.elements
        .filter((el) => !el.hidden && elementIntersectsRect(el, rect))
        .map((el) => el.id);
      const ids = additive ? [...new Set([...initialSelection, ...hits])] : hits;
      this.store.select(ids);
      return;
    }
    if (this.mode === 'move' || this.mode === 'resize' || this.mode === 'rotate') {
      this.mode = null;
      this.drag = null;
      this.store.endLive();
      this.clearGuides();
      this.requestRender();
    }
  }

  doMove(event) {
    const point = this.pointFromEvent(event);
    const { initial, bounds, ids } = this.drag;
    if (!bounds) return;
    let dx = point.x - this.drag.start.x;
    let dy = point.y - this.drag.start.y;
    let snap = null;
    if (this.store.snapping) {
      snap = calculateSnap(
        { x: bounds.x + dx, y: bounds.y + dy, w: bounds.w, h: bounds.h },
        this.store.doc,
        ids,
        6 / Math.max(0.2, this.zoom),
      );
      dx += snap.dx;
      dy += snap.dy;
    }
    const initialById = new Map(initial.map((el) => [el.id, el]));
    this.store.updateLive((doc) => {
      for (const el of doc.elements) {
        const init = initialById.get(el.id);
        if (!init || el.locked) continue;
        el.x = init.x + dx;
        el.y = init.y + dy;
      }
    });
    if (snap) this.showGuides(snap.guides);
    this.requestRender();
  }

  doResize(event) {
    const { initial, handle } = this.drag;
    const point = this.pointFromEvent(event);
    const cx = initial.x + initial.w / 2;
    const cy = initial.y + initial.h / 2;
    const local = rotatePoint(point.x - cx, point.y - cy, -(initial.rotation || 0));

    let newW = initial.w;
    let newH = initial.h;
    if (handle.includes('e')) newW = local.x + initial.w / 2;
    if (handle.includes('w')) newW = initial.w / 2 - local.x;
    if (handle.includes('s')) newH = local.y + initial.h / 2;
    if (handle.includes('n')) newH = initial.h / 2 - local.y;
    newW = Math.max(12, newW);
    newH = Math.max(12, newH);

    const isCorner = handle.length === 2;
    if (event.shiftKey && isCorner) {
      const ratio = initial.w / Math.max(1, initial.h);
      if (newW / newH > ratio) newH = newW / ratio;
      else newW = newH * ratio;
    }

    let anchorX = 0;
    let anchorY = 0;
    if (handle.includes('e')) anchorX = -initial.w / 2;
    if (handle.includes('w')) anchorX = initial.w / 2;
    if (handle.includes('s')) anchorY = -initial.h / 2;
    if (handle.includes('n')) anchorY = initial.h / 2;

    const anchorRotated = rotatePoint(anchorX, anchorY, initial.rotation || 0);
    const anchorScene = { x: cx + anchorRotated.x, y: cy + anchorRotated.y };

    let centerX = 0;
    let centerY = 0;
    if (handle.includes('e')) centerX = newW / 2;
    if (handle.includes('w')) centerX = -newW / 2;
    if (handle.includes('s')) centerY = newH / 2;
    if (handle.includes('n')) centerY = -newH / 2;
    const centerRotated = rotatePoint(centerX, centerY, initial.rotation || 0);
    const newCenter = { x: anchorScene.x + centerRotated.x, y: anchorScene.y + centerRotated.y };
    const newX = newCenter.x - newW / 2;
    const newY = newCenter.y - newH / 2;

    this.store.updateLive((doc) => {
      const el = doc.elements.find((item) => item.id === initial.id);
      if (!el) return;
      el.x = newX;
      el.y = newY;
      el.w = newW;
      el.h = newH;
    });
    this.requestRender();
  }

  doRotate(event) {
    const { initial, center, startAngle } = this.drag;
    const point = this.pointFromEvent(event);
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    let rotation = initial.rotation + (angle - startAngle);
    if (event.shiftKey) {
      const step = Math.PI / 12;
      rotation = Math.round(rotation / step) * step;
    }
    rotation = Math.atan2(Math.sin(rotation), Math.cos(rotation));
    this.store.updateLive((doc) => {
      const el = doc.elements.find((item) => item.id === initial.id);
      if (!el) return;
      el.rotation = rotation;
    });
    this.requestRender();
  }

  updateMarquee(a, b) {
    const rect = {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    };
    const z = this.zoom;
    this.marquee.style.left = `${rect.x * z}px`;
    this.marquee.style.top = `${rect.y * z}px`;
    this.marquee.style.width = `${rect.w * z}px`;
    this.marquee.style.height = `${rect.h * z}px`;
    this.marquee.hidden = false;
  }

  showGuides(guides) {
    this.clearGuides();
    const z = this.zoom;
    this.guides = guides || [];
    for (const guide of this.guides) {
      const line = document.createElement('div');
      line.className = `guide ${guide.axis === 'x' ? 'vertical' : 'horizontal'}`;
      if (guide.axis === 'x') line.style.left = `${guide.pos * z}px`;
      else line.style.top = `${guide.pos * z}px`;
      this.guidesLayer.appendChild(line);
    }
  }

  clearGuides() {
    this.guidesLayer.replaceChildren();
    this.guides = [];
  }

  onDoubleClick(event) {
    if (this.isTypingTarget(event.target)) return;
    const point = this.pointFromEvent(event);
    const hit = hitTest(this.store.doc, point);
    if (!hit) return;
    if (hit.locked) {
      this.showToast('Este elemento está bloqueado.');
      return;
    }
    this.store.select([hit.id]);
    if (hit.type === 'text') {
      this.startTextEditing(hit);
    }
  }

  startTextEditing(el) {
    if (!el || el.type !== 'text') return;
    if (this.editingId) this.stopTextEditing();
    this.editingId = el.id;
    this.editingInitial = deepClone(el);
    this.store.beginLive('Editar texto');
    const editor = this.textEditor;
    editor.hidden = false;
    editor.value = el.text || '';
    this.styleTextEditor(el);
    editor.focus();
    editor.select();
    this.renderOverlay();
    this.requestRender();
  }

  styleTextEditor(el) {
    const z = this.zoom;
    const editor = this.textEditor;
    const fontSize = Math.max(1, el.fontSize) * z;
    editor.style.left = `${el.x * z}px`;
    editor.style.top = `${el.y * z}px`;
    editor.style.width = `${Math.max(12, el.w * z)}px`;
    editor.style.height = `${Math.max(12, el.h * z)}px`;
    editor.style.transform = `rotate(${el.rotation || 0}rad)`;
    editor.style.fontFamily = el.fontFamily;
    editor.style.fontSize = `${fontSize}px`;
    editor.style.fontWeight = String(el.fontWeight || 400);
    editor.style.fontStyle = el.fontStyle || 'normal';
    editor.style.lineHeight = `${fontSize * (el.lineHeight || 1.1)}px`;
    editor.style.letterSpacing = `${(el.letterSpacing || 0) * z}px`;
    editor.style.textAlign = el.textAlign || 'left';
    editor.style.textTransform = el.uppercase ? 'uppercase' : 'none';
    editor.style.textDecoration = el.underline ? 'underline' : 'none';
    editor.style.color = el.fill && el.fill !== 'transparent' ? el.fill : '#111827';
  }

  onTextInput() {
    if (!this.editingId) return;
    const current = this.store.doc.elements.find((el) => el.id === this.editingId);
    if (!current) return;
    const text = this.textEditor.value;
    const layout = layoutText({ ...current, text });
    const minHeight = Math.max((current.fontSize || 16) * (current.lineHeight || 1.1) + 2, layout.totalHeight + 2);
    this.store.updateLive((doc) => {
      const el = doc.elements.find((item) => item.id === this.editingId);
      if (!el) return;
      el.text = text;
      el.h = Math.max(el.h, minHeight);
      el.name = elementLabel(el);
    });
    const updated = this.store.doc.elements.find((el) => el.id === this.editingId);
    if (updated) {
      this.textEditor.style.height = `${Math.max(12, updated.h * this.zoom)}px`;
      this.styleTextEditor(updated);
    }
    this.requestRender();
  }

  onTextKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.stopTextEditing();
    }
  }

  onTextBlur() {
    if (this.editingId) this.stopTextEditing();
  }

  stopTextEditing() {
    if (!this.editingId) return;
    const id = this.editingId;
    this.editingId = null;
    this.textEditor.hidden = true;
    this.textEditor.value = '';
    this.store.endLive();
    const el = this.store.doc.elements.find((item) => item.id === id);
    if (el && !String(el.text || '').trim()) {
      // An entirely empty text box is removed, matching common editor behavior.
      this.store.deleteSelected();
    }
    this.editingInitial = null;
    this.renderOverlay();
    this.requestRender();
  }

  onSelectionClick(event) {
    const button = event.target.closest('[data-sel-action]');
    if (!button) return;
    event.stopPropagation();
    const action = button.dataset.selAction;
    if (action === 'lock') {
      const elements = this.store.selectedElements;
      const shouldLock = !elements.every((el) => el.locked);
      this.store.apply((doc) => {
        for (const el of doc.elements) {
          if (this.store.selectedIds.includes(el.id)) el.locked = shouldLock;
        }
      }, { label: shouldLock ? 'Bloquear' : 'Desbloquear' });
    } else if (action === 'duplicate') {
      this.store.duplicateSelected();
    } else if (action === 'delete') {
      this.store.deleteSelected();
    } else if (action === 'position') {
      this.onPositionTab();
    } else if (action === 'edit') {
      const el = this.store.selectedElements[0];
      if (el?.type === 'text') this.startTextEditing(el);
    }
    this.requestRender();
  }

  renderOverlay() {
    this.selectionLayer.replaceChildren();
    if (this.editingId) return;
    const selected = this.store.selectedElements;
    if (!selected.length) return;
    const z = this.zoom;

    if (selected.length === 1) {
      const el = selected[0];
      const box = document.createElement('div');
      box.className = 'selection-box';
      box.style.left = `${el.x * z}px`;
      box.style.top = `${el.y * z}px`;
      box.style.width = `${el.w * z}px`;
      box.style.height = `${el.h * z}px`;
      box.style.transform = `rotate(${el.rotation || 0}rad)`;
      for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
        const h = document.createElement('div');
        h.className = 'handle';
        h.dataset.handle = handle;
        h.style.cursor = HANDLE_CURSORS[handle];
        h.title = `Redimensionar (${handle})`;
        box.appendChild(h);
      }
      const rotate = document.createElement('div');
      rotate.className = 'rotate-handle';
      rotate.dataset.rotate = 'true';
      rotate.title = 'Rotar (⇧ para pasos de 15°)';
      rotate.innerHTML = icon('rotate');
      box.appendChild(rotate);
      this.selectionLayer.appendChild(box);
      this.renderToolbar(el, true);
    } else {
      const b = selectionBounds(selected);
      if (!b) return;
      const box = document.createElement('div');
      box.className = 'selection-box multi';
      box.style.left = `${b.x * z}px`;
      box.style.top = `${b.y * z}px`;
      box.style.width = `${b.w * z}px`;
      box.style.height = `${b.h * z}px`;
      this.selectionLayer.appendChild(box);
      this.renderToolbar(selected[0], false);
    }
  }

  renderToolbar(anchor, single) {
    const selected = this.store.selectedElements;
    if (!selected.length) return;
    const allLocked = selected.every((el) => el.locked);
    const b = selectionBounds(selected);
    if (!b) return;
    const z = this.zoom;
    const stageWidth = this.store.doc.width * z;
    const stageHeight = this.store.doc.height * z;

    const toolbar = document.createElement('div');
    toolbar.className = 'selection-toolbar';
    toolbar.innerHTML = `
      <button data-sel-action="lock" title="${allLocked ? 'Desbloquear' : 'Bloquear'}" class="${allLocked ? 'active' : ''}">${icon(allLocked ? 'unlock' : 'lock')}</button>
      <button data-sel-action="duplicate" title="Duplicar (⌘D)">${icon('copy')}</button>
      <button data-sel-action="delete" title="Eliminar (⌫)">${icon('trash')}</button>
      ${single && anchor.type === 'text' ? `<div class="toolbar-sep"></div><button data-sel-action="edit" title="Editar texto">${icon('text')}</button>` : ''}
      <div class="toolbar-sep"></div>
      <button data-sel-action="position" title="Posición y organización">${icon('more')}</button>
    `;
    this.selectionLayer.appendChild(toolbar);

    const toolbarWidth = 150 + (single && anchor.type === 'text' ? 34 : 0);
    const rawTop = b.y * z - 46;
    const placeBelow = rawTop < 8;
    toolbar.style.left = `${clamp(b.x * z + (b.w * z) / 2 - toolbarWidth / 2, 8, Math.max(8, stageWidth - toolbarWidth - 8))}px`;
    toolbar.style.top = `${placeBelow ? Math.min(stageHeight - 42, (b.y + b.h) * z + 10) : rawTop}px`;
  }
}
