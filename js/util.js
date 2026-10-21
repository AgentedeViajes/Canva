export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const degToRad = (d) => (d * Math.PI) / 180;
export const radToDeg = (r) => (r * 180) / Math.PI;

let uidCounter = 0;
export function uid(prefix = 'el') {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function debounce(fn, wait = 250) {
  let timer = null;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(timer);
  wrapped.flush = (...args) => {
    clearTimeout(timer);
    fn(...args);
  };
  return wrapped;
}

export function rotatePoint(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

export const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
export const formatNum = (n) => {
  const v = round(n, 1);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

export function normalizeHex(value, fallback = '#000000') {
  if (typeof value !== 'string') return fallback;
  let v = value.trim();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function icon(name, cls = '') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

export const FONTS = [
  { label: 'Inter', value: '"Inter", "SF Pro Text", system-ui, -apple-system, "Segoe UI", sans-serif', group: 'Sans serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif', group: 'Sans serif' },
  { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif', group: 'Sans serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif', group: 'Sans serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Tahoma, sans-serif', group: 'Sans serif' },
  { label: 'Futura', value: 'Futura, "Avenir Next", Avenir, sans-serif', group: 'Sans serif' },
  { label: 'Avenir Next', value: '"Avenir Next", Avenir, "Segoe UI", sans-serif', group: 'Sans serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif', group: 'Serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif', group: 'Serif' },
  { label: 'Palatino', value: '"Palatino Linotype", Palatino, "Book Antiqua", serif', group: 'Serif' },
  { label: 'Garamond', value: 'Garamond, "Baskerville", "Times New Roman", serif', group: 'Serif' },
  { label: 'Baskerville', value: 'Baskerville, "Baskerville Old Face", Georgia, serif', group: 'Serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace', group: 'Monoespaciada' },
  { label: 'Menlo', value: 'Menlo, Monaco, "Courier New", monospace', group: 'Monoespaciada' },
  { label: 'Impact', value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', group: 'Display' },
  { label: 'Optima', value: 'Optima, Candara, "Segoe UI", sans-serif', group: 'Display' },
];

export const FONT_WEIGHTS = [
  { label: 'Light 300', value: 300 },
  { label: 'Regular 400', value: 400 },
  { label: 'Medium 500', value: 500 },
  { label: 'Semibold 600', value: 600 },
  { label: 'Bold 700', value: 700 },
  { label: 'Extra bold 800', value: 800 },
  { label: 'Black 900', value: 900 },
];

export const PALETTE = [
  '#111827', '#374151', '#6b7280', '#d1d5db', '#f9fafb', '#ffffff',
  '#e11d48', '#f97316', '#f59e0b', '#facc15', '#84cc16', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#ec4899', '#f43f5e', '#7c2d12', '#a16207', '#365314', '#064e3b',
  '#134e4a', '#164e63', '#1e3a8a', '#312e81', '#4c1d95', '#701a75',
];

export const FILL_SWATCHES = [
  '#111827', '#3f3f46', '#a1a1aa', '#ffffff', '#f4efe6', '#fee2e2',
  '#f97354', '#fb923c', '#facc15', '#bef264', '#34d399', '#14b8a6',
  '#38bdf8', '#6366f1', '#a78bfa', '#e879f9', '#f472b6', '#fda4af',
];

export const PAGE_PRESETS = [
  { id: 'square', name: 'Instagram', width: 1080, height: 1080, ratio: 'square', category: 'Redes' },
  { id: 'story', name: 'Historia', width: 1080, height: 1920, ratio: 'story', category: 'Redes' },
  { id: 'portrait', name: 'Retrato', width: 1080, height: 1350, ratio: 'portrait', category: 'Redes' },
  { id: 'banner', name: 'Portada', width: 1200, height: 628, ratio: 'landscape', category: 'Redes' },
  { id: 'flyer', name: 'Flyer', width: 1240, height: 1754, ratio: 'portrait', category: 'Marketing' },
  { id: 'logo', name: 'Logo', width: 500, height: 500, ratio: 'square', category: 'Marketing' },
  { id: 'collage', name: 'Collage', width: 1080, height: 1080, ratio: 'square', category: 'Marketing' },
  { id: 'business-card', name: 'Tarjeta', width: 1050, height: 600, ratio: 'landscape', category: 'Marketing' },
  { id: 'brochure', name: 'Folleto', width: 2480, height: 1754, ratio: 'landscape', category: 'Marketing' },
  { id: 'email', name: 'Correo', width: 1200, height: 1600, ratio: 'portrait', category: 'Marketing' },
  { id: 'resume', name: 'Currículum', width: 1240, height: 1754, ratio: 'portrait', category: 'Documentos' },
  { id: 'document', name: 'Documento', width: 1240, height: 1754, ratio: 'portrait', category: 'Documentos' },
  { id: 'presentation', name: 'Presentación', width: 1920, height: 1080, ratio: 'landscape', category: 'Documentos' },
  { id: 'a4', name: 'A4', width: 2480, height: 3508, ratio: 'portrait', category: 'Documentos' },
];

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text, filename, type = 'application/json') {
  downloadBlob(new Blob([text], { type }), filename);
}

export function sanitizeFilename(name, fallback = 'lienzo-diseno') {
  const cleaned = String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

export function clampText(value, max = 5000) {
  return String(value ?? '').slice(0, max);
}
