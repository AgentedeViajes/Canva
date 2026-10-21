import { clamp, deepClone, debounce } from './util.js';
import {
  duplicateElement, elementLabel, normalizeDoc, selectionBounds, getSelected,
} from './model.js';

const HISTORY_LIMIT = 80;
const STORAGE_KEY = 'lienzo.project.v1';

export class Store {
  constructor(doc) {
    this.doc = normalizeDoc(doc);
    this.selectedIds = [];
    this.past = [];
    this.future = [];
    this.listeners = new Set();
    this.liveSnapshot = null;
    this.liveLabel = null;
    this.lastMerge = null;
    this.storageKey = STORAGE_KEY;
    this.onSaveState = null;
    this.snapping = true;
    this._save = debounce(() => this.flushSave(), 550);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type, detail = {}) {
    for (const fn of this.listeners) {
      try {
        fn(type, this, detail);
      } catch (error) {
        console.error('Listener error', error);
      }
    }
  }

  get selectedElements() {
    return getSelected(this.doc, this.selectedIds);
  }

  get selectionBounds() {
    return selectionBounds(this.selectedElements);
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  get dirty() {
    return this.past.length > 0;
  }

  pushPast(snapshot) {
    this.past.push(snapshot);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
  }

  scheduleSave() {
    if (typeof this.onSaveState === 'function') this.onSaveState('saving');
    this._save();
  }

  flushSave() {
    try {
      const payload = JSON.stringify({ doc: this.doc, savedAt: Date.now() });
      localStorage.setItem(this.storageKey, payload);
      if (typeof this.onSaveState === 'function') this.onSaveState('saved');
    } catch (error) {
      console.error('No se pudo guardar el proyecto', error);
      if (typeof this.onSaveState === 'function') this.onSaveState('error');
    }
  }

  loadSaved() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.doc) return false;
      const doc = normalizeDoc(parsed.doc);
      if (!doc.elements.length) return false;
      this.doc = doc;
      this.selectedIds = [];
      this.past = [];
      this.future = [];
      this.emit('load');
      return true;
    } catch (error) {
      console.warn('Proyecto guardado inválido; se usará la plantilla inicial.', error);
      return false;
    }
  }

  select(ids, { additive = false, toggle = false } = {}) {
    const existing = new Set(this.doc.elements.map((el) => el.id));
    let next = Array.from(new Set((ids || []).filter((id) => existing.has(id))));
    if (toggle) {
      next = [...this.selectedIds];
      for (const id of ids || []) {
        const index = next.indexOf(id);
        if (index >= 0) next.splice(index, 1);
        else next.push(id);
      }
    } else if (additive) {
      next = Array.from(new Set([...this.selectedIds, ...next]));
    }
    this.selectedIds = next;
    this.emit('selection');
  }

  selectAll() {
    this.selectedIds = this.doc.elements.filter((el) => !el.hidden).map((el) => el.id);
    this.emit('selection');
  }

  clearSelection() {
    if (!this.selectedIds.length) return;
    this.selectedIds = [];
    this.emit('selection');
  }

  apply(mutator, { label = 'Cambio', mergeKey = null, history = true, silent = false } = {}) {
    if (history) {
      const now = Date.now();
      const canMerge = mergeKey
        && this.lastMerge
        && this.lastMerge.key === mergeKey
        && now - this.lastMerge.time < 700;
      if (!canMerge) {
        this.pushPast(deepClone(this.doc));
        this.future = [];
      }
      this.lastMerge = mergeKey ? { key: mergeKey, time: now } : null;
    }
    const draft = deepClone(this.doc);
    mutator(draft);
    this.doc = draft;
    if (!silent) {
      this.emit('change', { label });
      this.scheduleSave();
    }
  }

  updateSelected(patch, { mergeKey = null, history = true } = {}) {
    if (!this.selectedIds.length) return;
    const locked = this.selectedElements.every((el) => el.locked);
    if (locked) return;
    this.apply((doc) => {
      for (const el of doc.elements) {
        if (!this.selectedIds.includes(el.id) || el.locked) continue;
        Object.assign(el, patch);
        if (patch.text !== undefined) el.name = el.name || elementLabel(el);
      }
    }, { mergeKey, history });
  }

  addElement(el, { select = true } = {}) {
    this.apply((doc) => {
      doc.elements.push(el);
    }, { label: 'Añadir elemento' });
    if (select) this.select([el.id]);
    return el;
  }

  deleteSelected() {
    if (!this.selectedIds.length) return;
    const ids = new Set(this.selectedIds.filter((id) => {
      const el = this.doc.elements.find((e) => e.id === id);
      return el && !el.locked;
    }));
    if (!ids.size) return;
    this.apply((doc) => {
      doc.elements = doc.elements.filter((el) => !ids.has(el.id));
    }, { label: 'Eliminar' });
    this.selectedIds = this.selectedIds.filter((id) => !ids.has(id));
    this.emit('selection');
  }

  duplicateSelected() {
    if (!this.selectedIds.length) return;
    const source = this.selectedElements;
    const additions = [];
    this.apply((doc) => {
      let offsetIndex = 0;
      for (const el of source) {
        const copy = duplicateElement(el, 24 + offsetIndex * 8);
        copy.id = `${el.type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        doc.elements.push(copy);
        additions.push(copy.id);
        offsetIndex += 1;
      }
    }, { label: 'Duplicar' });
    this.select(additions);
  }

  reorderSelected(mode) {
    if (!this.selectedIds.length) return;
    const selected = new Set(this.selectedIds);
    this.apply((doc) => {
      let elements = doc.elements;
      if (mode === 'front') {
        const picked = elements.filter((el) => selected.has(el.id));
        const rest = elements.filter((el) => !selected.has(el.id));
        elements = [...rest, ...picked];
      } else if (mode === 'back') {
        const picked = elements.filter((el) => selected.has(el.id));
        const rest = elements.filter((el) => !selected.has(el.id));
        elements = [...picked, ...rest];
      } else if (mode === 'forward') {
        for (let i = elements.length - 2; i >= 0; i -= 1) {
          if (selected.has(elements[i].id) && !selected.has(elements[i + 1].id)) {
            [elements[i], elements[i + 1]] = [elements[i + 1], elements[i]];
          }
        }
      } else if (mode === 'backward') {
        for (let i = 1; i < elements.length; i += 1) {
          if (selected.has(elements[i].id) && !selected.has(elements[i - 1].id)) {
            [elements[i], elements[i - 1]] = [elements[i - 1], elements[i]];
          }
        }
      }
      doc.elements = elements;
    }, { label: mode === 'front' ? 'Traer al frente' : mode === 'back' ? 'Enviar al fondo' : mode === 'forward' ? 'Traer adelante' : 'Enviar atrás' });
  }

  moveLayer(id, toIndex) {
    const from = this.doc.elements.findIndex((el) => el.id === id);
    if (from < 0) return;
    const target = clamp(toIndex, 0, this.doc.elements.length - 1);
    if (from === target) return;
    this.apply((doc) => {
      const [el] = doc.elements.splice(from, 1);
      doc.elements.splice(target, 0, el);
    }, { label: 'Reordenar capas' });
  }

  alignSelected(axis) {
    const elements = this.selectedElements.filter((el) => !el.locked);
    if (!elements.length) return;
    const isSingle = elements.length === 1;
    const bounds = isSingle
      ? { x: 0, y: 0, w: this.doc.width, h: this.doc.height }
      : selectionBounds(elements);
    if (!bounds) return;
    this.apply((doc) => {
      for (const el of doc.elements) {
        if (!this.selectedIds.includes(el.id) || el.locked) continue;
        const b = selectionBounds([el]);
        if (!b) continue;
        if (axis === 'left') el.x += bounds.x - b.x;
        if (axis === 'hcenter') el.x += bounds.x + bounds.w / 2 - (b.x + b.w / 2);
        if (axis === 'right') el.x += bounds.x + bounds.w - (b.x + b.w);
        if (axis === 'top') el.y += bounds.y - b.y;
        if (axis === 'vmiddle') el.y += bounds.y + bounds.h / 2 - (b.y + b.h / 2);
        if (axis === 'bottom') el.y += bounds.y + bounds.h - (b.y + b.h);
      }
    }, { label: 'Alinear' });
  }

  distributeSelected(axis) {
    const elements = this.selectedElements.filter((el) => !el.locked);
    if (elements.length < 3) return;
    const sorted = [...elements].sort((a, b) => {
      const ba = selectionBounds([a]);
      const bb = selectionBounds([b]);
      return axis === 'horizontal'
        ? (ba.x + ba.w / 2) - (bb.x + bb.w / 2)
        : (ba.y + ba.h / 2) - (bb.y + bb.h / 2);
    });
    const first = selectionBounds([sorted[0]]);
    const last = selectionBounds([sorted[sorted.length - 1]]);
    const start = axis === 'horizontal' ? first.x + first.w / 2 : first.y + first.h / 2;
    const end = axis === 'horizontal' ? last.x + last.w / 2 : last.y + last.h / 2;
    const step = (end - start) / (sorted.length - 1);
    this.apply((doc) => {
      sorted.forEach((source, index) => {
        const el = doc.elements.find((e) => e.id === source.id);
        if (!el || el.locked) return;
        const b = selectionBounds([el]);
        const target = start + step * index;
        if (axis === 'horizontal') el.x += target - (b.x + b.w / 2);
        else el.y += target - (b.y + b.h / 2);
      });
    }, { label: 'Distribuir' });
  }

  setBackground(color) {
    this.apply((doc) => { doc.background = color; }, { label: 'Fondo', mergeKey: 'background' });
  }

  resizePage(width, height, scaleContent) {
    const w = clamp(Math.round(width), 100, 8000);
    const h = clamp(Math.round(height), 100, 8000);
    const sx = w / this.doc.width;
    const sy = h / this.doc.height;
    this.apply((doc) => {
      if (scaleContent) {
        const uniform = Math.min(sx, sy);
        for (const el of doc.elements) {
          el.x *= sx;
          el.y *= sy;
          el.w *= sx;
          el.h *= sy;
          el.fontSize *= uniform;
          el.letterSpacing *= uniform;
          el.strokeWidth *= uniform;
          el.radius *= uniform;
        }
      }
      doc.width = w;
      doc.height = h;
    }, { label: 'Redimensionar diseño' });
    this.emit('page');
  }

  renameDocument(name) {
    this.apply((doc) => { doc.name = String(name || 'Sin título').slice(0, 80); }, { label: 'Renombrar', mergeKey: 'doc-name' });
  }

  renameElement(id, name) {
    this.apply((doc) => {
      const el = doc.elements.find((e) => e.id === id);
      if (el) el.name = String(name || elementLabel(el)).slice(0, 60);
    }, { label: 'Renombrar capa' });
  }

  toggleElementFlag(id, flag) {
    const el = this.doc.elements.find((e) => e.id === id);
    if (!el) return;
    this.apply((doc) => {
      const target = doc.elements.find((e) => e.id === id);
      if (target) target[flag] = !target[flag];
    }, { label: flag === 'hidden' ? 'Visibilidad' : 'Bloqueo' });
    const current = this.doc.elements.find((e) => e.id === id);
    if (flag === 'hidden' && current && current.hidden) {
      this.selectedIds = this.selectedIds.filter((sid) => sid !== id);
      this.emit('selection');
    }
  }

  beginLive(label = 'Transformar') {
    if (this.liveSnapshot) return;
    this.liveSnapshot = deepClone(this.doc);
    this.liveLabel = label;
  }

  updateLive(mutator) {
    if (!this.liveSnapshot) this.beginLive();
    const draft = deepClone(this.doc);
    mutator(draft);
    this.doc = draft;
    this.emit('live');
    this.scheduleSave();
  }

  endLive() {
    if (!this.liveSnapshot) return;
    const changed = JSON.stringify(this.liveSnapshot) !== JSON.stringify(this.doc);
    if (changed) {
      this.pushPast(this.liveSnapshot);
      this.future = [];
    }
    this.liveSnapshot = null;
    this.lastMerge = null;
    this.emit('commit', { label: this.liveLabel || 'Transformar' });
    this.scheduleSave();
  }

  cancelLive() {
    if (!this.liveSnapshot) return;
    this.doc = this.liveSnapshot;
    this.liveSnapshot = null;
    this.emit('change');
  }

  undo() {
    if (this.liveSnapshot) this.endLive();
    if (!this.past.length) return;
    this.future.push(deepClone(this.doc));
    this.doc = this.past.pop();
    this.selectedIds = this.selectedIds.filter((id) => this.doc.elements.some((el) => el.id === id));
    this.lastMerge = null;
    this.emit('change', { label: 'Deshacer' });
    this.emit('selection');
    this.scheduleSave();
  }

  redo() {
    if (!this.future.length) return;
    this.past.push(deepClone(this.doc));
    this.doc = this.future.pop();
    this.selectedIds = this.selectedIds.filter((id) => this.doc.elements.some((el) => el.id === id));
    this.lastMerge = null;
    this.emit('change', { label: 'Rehacer' });
    this.emit('selection');
    this.scheduleSave();
  }

  replaceDoc(doc, { history = true, select = [] } = {}) {
    const normalized = normalizeDoc(doc);
    if (history) {
      this.pushPast(deepClone(this.doc));
      this.future = [];
    }
    this.doc = normalized;
    this.selectedIds = select.filter((id) => normalized.elements.some((el) => el.id === id));
    this.liveSnapshot = null;
    this.emit('change', { label: 'Cargar documento' });
    this.emit('selection');
    this.emit('page');
    this.scheduleSave();
  }

  toJSON() {
    return JSON.stringify({ schema: 1, ...this.doc }, null, 2);
  }
}
