import {
  FONTS, PAGE_PRESETS, clamp, deepClone, rotatePoint, uid,
} from './util.js';

export const ELEMENT_TYPES = ['text', 'rect', 'ellipse', 'triangle', 'star', 'line', 'image'];

const BASE_ELEMENT = {
  id: '',
  type: 'rect',
  name: '',
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  fill: '#111827',
  stroke: 'transparent',
  strokeWidth: 0,
  radius: 0,
  shadow: false,
};

export const TEXT_DEFAULTS = {
  text: 'Escribe algo',
  fontFamily: FONTS[0].value,
  fontSize: 64,
  fontWeight: 700,
  fontStyle: 'normal',
  underline: false,
  uppercase: false,
  textAlign: 'left',
  verticalAlign: 'top',
  lineHeight: 1.1,
  letterSpacing: 0,
};

export const IMAGE_DEFAULTS = {
  src: '',
  naturalWidth: 0,
  naturalHeight: 0,
  fit: 'cover',
  flipX: false,
  flipY: false,
  radius: 0,
};

export function makeElement(type, patch = {}) {
  const base = { ...BASE_ELEMENT, id: uid(type), type, ...patch };
  if (type === 'text') Object.assign(base, TEXT_DEFAULTS, patch, { type });
  if (type === 'image') Object.assign(base, IMAGE_DEFAULTS, patch, { type, fill: 'transparent' });
  if (type === 'line') Object.assign(base, { fill: 'transparent', stroke: '#111827', strokeWidth: 6, h: 4 }, patch, { type });
  if (!base.name) base.name = elementLabel(base);
  return base;
}

export function elementLabel(el) {
  if (!el) return 'Elemento';
  if (el.type === 'text') {
    const first = String(el.text || '').split('\n').find((line) => line.trim());
    return (first || 'Texto').trim().slice(0, 34);
  }
  if (el.type === 'image') return el.name || 'Imagen';
  const labels = {
    rect: 'Rectángulo',
    ellipse: 'Círculo',
    triangle: 'Triángulo',
    star: 'Estrella',
    line: 'Línea',
  };
  return el.name || labels[el.type] || 'Elemento';
}

export function elementIcon(el) {
  if (!el) return 'cursor';
  return {
    text: 'text',
    rect: 'square',
    ellipse: 'circle',
    triangle: 'triangle',
    star: 'star',
    line: 'line',
    image: 'image',
  }[el.type] || 'square';
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function makeAbstractArtwork() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="780" viewBox="0 0 600 780">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#241b4f"/>
      </linearGradient>
      <linearGradient id="blob" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2dd4bf"/><stop offset=".48" stop-color="#6366f1"/><stop offset="1" stop-color="#f472b6"/>
      </linearGradient>
      <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#fb923c"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="34"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect width="600" height="780" fill="url(#bg)"/>
    <circle cx="300" cy="300" r="218" fill="url(#blob)" opacity=".88" filter="url(#blur)"/>
    <circle cx="410" cy="180" r="120" fill="#22d3ee" opacity=".20" filter="url(#soft)"/>
    <path d="M-40 610 C 90 480, 220 730, 360 560 S 560 430, 680 520 L 680 820 L -40 820 Z" fill="#0f172a" opacity=".92"/>
    <path d="M-30 660 C 120 560, 220 760, 380 620 S 560 500, 660 580" fill="none" stroke="url(#arc)" stroke-width="2" opacity=".85"/>
    <path d="M-20 700 C 120 610, 240 790, 400 670" fill="none" stroke="#f8fafc" stroke-width="1" opacity=".35"/>
    <g fill="none" stroke="#f8fafc" stroke-width="1.3" opacity=".55">
      <circle cx="300" cy="300" r="140"/><circle cx="300" cy="300" r="182"/>
      <path d="M300 110v380M110 300h380"/>
    </g>
    <g fill="#fde68a">
      <circle cx="300" cy="118" r="3.2"/><circle cx="482" cy="300" r="3.2"/>
      <circle cx="300" cy="482" r="3.2"/><circle cx="118" cy="300" r="3.2"/>
    </g>
    <g transform="translate(52 618)">
      <rect width="72" height="4" rx="2" fill="#fde68a"/>
      <text x="0" y="58" fill="#f8fafc" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="6">EDICIÓN</text>
      <text x="0" y="94" fill="#f8fafc" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="6">LIBRE</text>
    </g>
    <g transform="translate(446 692)">
      <circle cx="38" cy="38" r="38" fill="none" stroke="#f8fafc" stroke-width="1.4"/>
      <path d="M20 38h36M38 20v36" stroke="#f8fafc" stroke-width="1.4"/>
    </g>
  </svg>`;
  return svgDataUrl(svg);
}

export function starterDoc() {
  const art = makeAbstractArtwork();
  const elements = [
    makeElement('ellipse', {
      name: 'Círculo coral', x: 760, y: -150, w: 500, h: 500,
      fill: '#f97354', rotation: 0.08,
    }),
    makeElement('image', {
      name: 'Recurso abstracto', x: 690, y: 505, w: 304, h: 396,
      src: art, naturalWidth: 600, naturalHeight: 780, radius: 22, fit: 'cover',
    }),
    makeElement('ellipse', {
      name: 'Aro', x: 808, y: 768, w: 176, h: 176,
      fill: 'transparent', stroke: '#171717', strokeWidth: 2,
    }),
    makeElement('star', {
      name: 'Estrella', x: 812, y: 286, w: 112, h: 112,
      fill: '#facc15', rotation: 0.12,
    }),
    makeElement('text', {
      name: 'Titular', x: 72, y: 186, w: 660, h: 336,
      text: 'CREA\nSIN\nLÍMITES', fontSize: 128, fontWeight: 900,
      fontFamily: FONTS[0].value, lineHeight: 0.86, letterSpacing: -4,
      fill: '#171717', textAlign: 'left',
    }),
    makeElement('text', {
      name: 'Antetítulo', x: 78, y: 108, w: 520, h: 32,
      text: 'ESTUDIO CREATIVO · 2026', fontSize: 18, fontWeight: 700,
      fontFamily: FONTS[0].value, letterSpacing: 4.2, uppercase: true,
      fill: '#57534e',
    }),
    makeElement('text', {
      name: 'Bajada', x: 78, y: 535, w: 590, h: 70,
      text: 'Diseño que se siente tuyo.', fontSize: 38, fontWeight: 400,
      fontFamily: FONTS[7].value, fontStyle: 'italic', fill: '#44403c',
    }),
    makeElement('line', {
      name: 'Línea', x: 78, y: 626, w: 286, h: 3,
      stroke: '#171717', strokeWidth: 2,
    }),
    makeElement('text', {
      name: 'Microtexto', x: 78, y: 650, w: 430, h: 24,
      text: 'HAZ CLIC · ARRASTRA · CREA', fontSize: 13, fontWeight: 700,
      fontFamily: FONTS[0].value, letterSpacing: 2.4, uppercase: true,
      fill: '#78716c',
    }),
    makeElement('rect', {
      name: 'Botón', x: 78, y: 842, w: 380, h: 70,
      fill: '#171717', radius: 35,
    }),
    makeElement('text', {
      name: 'Texto del botón', x: 78, y: 842, w: 380, h: 70,
      text: 'EMPIEZA A CREAR', fontSize: 18, fontWeight: 700,
      fontFamily: FONTS[0].value, letterSpacing: 2.2, uppercase: true,
      fill: '#ffffff', textAlign: 'center', verticalAlign: 'middle',
    }),
  ];
  return {
    schema: 1,
    name: 'Cartel editorial',
    width: 1080,
    height: 1080,
    background: '#f4efe6',
    elements,
    createdAt: new Date().toISOString(),
  };
}

export function emptyDoc(width = 1080, height = 1080) {
  return {
    schema: 1,
    name: 'Sin título',
    width,
    height,
    background: '#ffffff',
    elements: [],
    createdAt: new Date().toISOString(),
  };
}

export function getElement(doc, id) {
  return doc.elements.find((el) => el.id === id) || null;
}

export function getSelected(doc, ids) {
  const set = new Set(ids);
  return doc.elements.filter((el) => set.has(el.id));
}

export function elementCorners(el) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const local = [
    [-el.w / 2, -el.h / 2],
    [el.w / 2, -el.h / 2],
    [el.w / 2, el.h / 2],
    [-el.w / 2, el.h / 2],
  ];
  return local.map(([x, y]) => {
    const r = rotatePoint(x, y, el.rotation || 0);
    return { x: cx + r.x, y: cy + r.y };
  });
}

export function selectionBounds(elements) {
  if (!elements || !elements.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    for (const p of elementCorners(el)) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pointInElement(el, point, pad = 0) {
  if (!el || el.hidden) return false;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const p = rotatePoint(point.x - cx, point.y - cy, -(el.rotation || 0));
  const hw = Math.max(el.w / 2, 1) + pad;
  const hh = Math.max(el.h / 2, 1) + pad;
  if (el.type === 'ellipse') {
    return (p.x * p.x) / (hw * hw) + (p.y * p.y) / (hh * hh) <= 1;
  }
  if (el.type === 'line') {
    const dist = Math.abs(p.y);
    return Math.abs(p.x) <= hw && dist <= Math.max(7, (el.strokeWidth || 2) / 2 + 4);
  }
  return Math.abs(p.x) <= hw && Math.abs(p.y) <= hh;
}

export function hitTest(doc, point, { skipLocked = false } = {}) {
  for (let i = doc.elements.length - 1; i >= 0; i -= 1) {
    const el = doc.elements[i];
    if (el.hidden) continue;
    if (skipLocked && el.locked) continue;
    if (pointInElement(el, point)) return el;
  }
  return null;
}

export function elementIntersectsRect(el, rect) {
  const b = selectionBounds([el]);
  if (!b) return false;
  return !(b.x + b.w < rect.x || b.x > rect.x + rect.w || b.y + b.h < rect.y || b.y > rect.y + rect.h);
}

export function clampElementToDocument(el, doc, margin = 0) {
  const b = selectionBounds([el]);
  if (!b) return el;
  const dx = b.x < -margin ? -margin - b.x : b.x + b.w > doc.width + margin ? doc.width + margin - (b.x + b.w) : 0;
  const dy = b.y < -margin ? -margin - b.y : b.y + b.h > doc.height + margin ? doc.height + margin - (b.y + b.h) : 0;
  el.x += dx;
  el.y += dy;
  return el;
}

export function duplicateElement(el, offset = 22) {
  return {
    ...deepClone(el),
    id: uid(el.type),
    x: el.x + offset,
    y: el.y + offset,
    locked: false,
    name: `${elementLabel(el)} copia`,
  };
}

export function newTextPreset(kind, doc) {
  const w = doc.width;
  const h = doc.height;
  const base = {
    x: Math.round(w * 0.16),
    y: Math.round(h * 0.32),
    w: Math.round(w * 0.68),
  };
  if (kind === 'heading') {
    return makeElement('text', {
      ...base, h: Math.round(h * 0.2), text: 'Tu título aquí',
      fontSize: Math.round(w * 0.082), fontWeight: 800, lineHeight: 0.98,
      letterSpacing: -2, fill: '#171717', name: 'Título',
    });
  }
  if (kind === 'subheading') {
    return makeElement('text', {
      ...base, h: Math.round(h * 0.12), text: 'Un subtítulo que acompaña',
      fontSize: Math.round(w * 0.038), fontWeight: 500, lineHeight: 1.15,
      fontFamily: FONTS[7].value, fontStyle: 'italic', fill: '#3f3f46', name: 'Subtítulo',
    });
  }
  if (kind === 'body') {
    return makeElement('text', {
      ...base, h: Math.round(h * 0.16), text: 'Escribe un párrafo breve para contar tu idea. Puedes cambiar la tipografía, el color y el tamaño desde el panel de la derecha.',
      fontSize: Math.round(w * 0.021), fontWeight: 400, lineHeight: 1.45,
      fill: '#52525b', name: 'Párrafo',
    });
  }
  return makeElement('text', {
    ...base, h: 40, text: 'ETIQUETA', fontSize: Math.round(w * 0.016),
    fontWeight: 700, letterSpacing: 3, uppercase: true, fill: '#71717a', name: 'Etiqueta',
  });
}

export function shapePreset(kind, doc) {
  const size = Math.round(Math.min(doc.width, doc.height) * 0.28);
  const x = Math.round((doc.width - size) / 2);
  const y = Math.round((doc.height - size) / 2);
  if (kind === 'line') {
    return makeElement('line', {
      x: Math.round(doc.width * 0.2), y: Math.round(doc.height * 0.5),
      w: Math.round(doc.width * 0.6), h: 3, stroke: '#171717', strokeWidth: 3,
    });
  }
  if (kind === 'rect') {
    return makeElement('rect', { x, y, w: size, h: Math.round(size * 0.66), radius: 12, fill: '#f97354' });
  }
  if (kind === 'ellipse') {
    return makeElement('ellipse', { x, y, w: size, h: size, fill: '#6366f1' });
  }
  if (kind === 'triangle') {
    return makeElement('triangle', { x, y, w: size, h: size, fill: '#facc15' });
  }
  if (kind === 'star') {
    return makeElement('star', { x, y, w: size, h: size, fill: '#171717' });
  }
  return makeElement('rect', { x, y, w: size, h: size, fill: '#171717' });
}

export function imageElementFromFile({ src, naturalWidth, naturalHeight, doc, name }) {
  const maxW = doc.width * 0.56;
  const maxH = doc.height * 0.56;
  const ratio = (naturalWidth || 1) / (naturalHeight || 1);
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return makeElement('image', {
    name: name || 'Imagen',
    x: Math.round((doc.width - w) / 2),
    y: Math.round((doc.height - h) / 2),
    w: Math.round(w),
    h: Math.round(h),
    src,
    naturalWidth,
    naturalHeight,
    radius: 0,
    fit: 'cover',
  });
}

export function normalizeDoc(input) {
  if (!input || typeof input !== 'object') throw new Error('Documento inválido');
  const width = clamp(Number(input.width) || 1080, 100, 8000);
  const height = clamp(Number(input.height) || 1080, 100, 8000);
  const background = typeof input.background === 'string' && /^#[0-9a-f]{6}$/i.test(input.background)
    ? input.background.toLowerCase() : '#ffffff';
  const elements = Array.isArray(input.elements) ? input.elements : [];
  const normalized = [];
  for (const raw of elements) {
    if (!raw || !ELEMENT_TYPES.includes(raw.type)) continue;
    const el = makeElement(raw.type, { ...raw });
    for (const key of Object.keys(BASE_ELEMENT)) {
      if (key === 'type' || key === 'id') continue;
      if (el[key] === undefined) el[key] = BASE_ELEMENT[key];
    }
    el.id = typeof raw.id === 'string' && raw.id ? raw.id : uid(raw.type);
    el.x = Number.isFinite(Number(raw.x)) ? Number(raw.x) : 0;
    el.y = Number.isFinite(Number(raw.y)) ? Number(raw.y) : 0;
    el.w = Math.max(1, Number(raw.w) || 100);
    el.h = Math.max(1, Number(raw.h) || 100);
    el.rotation = Number(raw.rotation) || 0;
    el.opacity = clamp(Number(raw.opacity) ?? 1, 0, 1);
    el.locked = Boolean(raw.locked);
    el.hidden = Boolean(raw.hidden);
    el.fill = typeof raw.fill === 'string' ? raw.fill : BASE_ELEMENT.fill;
    el.stroke = typeof raw.stroke === 'string' ? raw.stroke : BASE_ELEMENT.stroke;
    el.strokeWidth = clamp(Number(raw.strokeWidth) || 0, 0, 200);
    el.radius = clamp(Number(raw.radius) || 0, 0, 1000);
    if (el.type === 'text') {
      el.text = String(raw.text ?? TEXT_DEFAULTS.text);
      el.fontFamily = raw.fontFamily || TEXT_DEFAULTS.fontFamily;
      el.fontSize = clamp(Number(raw.fontSize) || 64, 4, 1000);
      el.fontWeight = clamp(Number(raw.fontWeight) || 700, 100, 900);
      el.fontStyle = raw.fontStyle === 'italic' ? 'italic' : 'normal';
      el.underline = Boolean(raw.underline);
      el.uppercase = Boolean(raw.uppercase);
      el.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'left';
      el.verticalAlign = ['top', 'middle', 'bottom'].includes(raw.verticalAlign) ? raw.verticalAlign : 'top';
      el.lineHeight = clamp(Number(raw.lineHeight) || 1.1, 0.4, 4);
      el.letterSpacing = clamp(Number(raw.letterSpacing) || 0, -100, 200);
    }
    if (el.type === 'image') {
      el.src = String(raw.src || '');
      el.naturalWidth = Number(raw.naturalWidth) || 0;
      el.naturalHeight = Number(raw.naturalHeight) || 0;
      el.fit = raw.fit === 'contain' ? 'contain' : 'cover';
      el.flipX = Boolean(raw.flipX);
      el.flipY = Boolean(raw.flipY);
    }
    if (!el.name) el.name = elementLabel(el);
    normalized.push(el);
  }
  return {
    schema: 1,
    name: String(input.name || 'Sin título').slice(0, 80),
    width,
    height,
    background,
    elements: normalized,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function documentToJSON(doc) {
  return JSON.stringify({ ...doc, schema: 1 }, null, 2);
}

// Kept for compatibility with older imports; util.js exposes the same helper.
export { PAGE_PRESETS };
