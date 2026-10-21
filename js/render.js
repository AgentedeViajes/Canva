import { FONTS, clamp } from './util.js';

/* ============================================================
   Image cache
   ============================================================ */
const imageCache = new Map();
let imageListener = null;

export function setImageListener(fn) {
  imageListener = fn;
}

export function getImageRecord(src) {
  if (!src) return null;
  let record = imageCache.get(src);
  if (record) return record;
  record = { status: 'loading', img: null, promise: null };
  imageCache.set(src, record);
  record.promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      record.status = 'ready';
      record.img = img;
      if (imageListener) imageListener();
      resolve(img);
    };
    img.onerror = () => {
      record.status = 'error';
      if (imageListener) imageListener();
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = src;
  });
  record.promise.catch(() => {});
  return record;
}

export async function ensureImages(elements) {
  const pending = [];
  for (const el of elements) {
    if (el.type !== 'image' || !el.src) continue;
    const record = getImageRecord(el.src);
    if (record && record.status !== 'ready' && record.promise) pending.push(record.promise);
  }
  if (pending.length) {
    await Promise.allSettled(pending);
  }
}

export function imageState(src) {
  const record = imageCache.get(src);
  return record ? record.status : 'idle';
}

/* ============================================================
   Text measurement & layout
   ============================================================ */
const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

export function textFont(el) {
  const style = el.fontStyle === 'italic' ? 'italic ' : '';
  const weight = clamp(Number(el.fontWeight) || 400, 100, 900);
  const size = Math.max(1, Number(el.fontSize) || 16);
  return `${style}${weight} ${size}px ${el.fontFamily || FONTS[0].value}`;
}

function applyLetterSpacing(ctx, value) {
  // Canvas2D letterSpacing is available in Chromium, Safari 17+ and recent Firefox.
  try {
    ctx.letterSpacing = `${Number(value) || 0}px`;
  } catch {
    /* older engines simply ignore the property */
  }
}

function wrapParagraph(ctx, paragraph, maxWidth) {
  if (paragraph === '') return [''];
  const words = paragraph.split(/(\s+)/).filter((part) => part !== '');
  const lines = [];
  let current = '';
  const pushLongWord = (word) => {
    let chunk = '';
    for (const char of word) {
      const test = chunk + char;
      if (chunk && ctx.measureText(test).width > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = test;
      }
    }
    return chunk;
  };
  for (const word of words) {
    if (/^\s+$/.test(word)) {
      if (current !== '') current += ' ';
      continue;
    }
    const candidate = current + word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current.trim() !== '') lines.push(current.replace(/\s+$/, ''));
      if (ctx.measureText(word).width > maxWidth) {
        current = pushLongWord(word);
      } else {
        current = word;
      }
    }
  }
  if (current !== '' || lines.length === 0) lines.push(current.replace(/\s+$/, ''));
  return lines;
}

export function layoutText(el) {
  const ctx = measureCtx;
  ctx.save();
  ctx.font = textFont(el);
  applyLetterSpacing(ctx, el.letterSpacing);
  const maxWidth = Math.max(8, Number(el.w) || 8);
  const paragraphs = String(el.text ?? '').split('\n');
  const lines = [];
  for (const paragraph of paragraphs) {
    lines.push(...wrapParagraph(ctx, paragraph, maxWidth));
  }
  const lineHeight = Math.max(1, (Number(el.fontSize) || 16) * (Number(el.lineHeight) || 1.1));
  ctx.restore();
  return {
    lines,
    lineHeight,
    totalHeight: lines.length * lineHeight,
    width: maxWidth,
  };
}

export function measureTextHeight(el, text = el.text, width = el.w) {
  return layoutText({ ...el, text, w: width }).totalHeight;
}

/* ============================================================
   Path helpers
   ============================================================ */
function roundedRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(Number(radius) || 0, Math.min(w, h) / 2));
  if (!r) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const outerX = w / 2;
  const outerY = h / 2;
  const inner = 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const factor = i % 2 === 0 ? 1 : inner;
    const x = cx + Math.cos(angle) * outerX * factor;
    const y = cy + Math.sin(angle) * outerY * factor;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function applyPaint(ctx, el) {
  const fill = el.fill || 'transparent';
  const stroke = el.stroke || 'transparent';
  const sw = Number(el.strokeWidth) || 0;
  if (fill !== 'transparent' && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (sw > 0 && stroke !== 'transparent' && stroke !== 'none') {
    ctx.lineWidth = sw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/* ============================================================
   Element drawing
   ============================================================ */
export function drawElement(ctx, el, { editingId = null } = {}) {
  if (!el || el.hidden) return;
  const w = Math.max(0.5, el.w);
  const h = Math.max(0.5, el.h);
  const cx = el.x + w / 2;
  const cy = el.y + h / 2;

  ctx.save();
  ctx.globalAlpha = clamp(Number(el.opacity) ?? 1, 0, 1);
  ctx.translate(cx, cy);
  ctx.rotate(Number(el.rotation) || 0);
  ctx.translate(-w / 2, -h / 2);

  if (el.shadow) {
    ctx.shadowColor = 'rgba(15, 23, 42, .28)';
    ctx.shadowBlur = Math.max(8, Math.min(w, h) * 0.08);
    ctx.shadowOffsetY = Math.max(3, Math.min(w, h) * 0.025);
  }

  switch (el.type) {
    case 'text':
      drawText(ctx, el, w, h, editingId === el.id);
      break;
    case 'rect':
      ctx.beginPath();
      roundedRectPath(ctx, 0, 0, w, h, el.radius);
      applyPaint(ctx, el);
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      applyPaint(ctx, el);
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      applyPaint(ctx, el);
      break;
    case 'star':
      starPath(ctx, w, h);
      applyPaint(ctx, el);
      break;
    case 'line':
      drawLine(ctx, el, w, h);
      break;
    case 'image':
      drawImageElement(ctx, el, w, h);
      break;
    default:
      ctx.beginPath();
      roundedRectPath(ctx, 0, 0, w, h, el.radius);
      applyPaint(ctx, el);
  }
  ctx.restore();
}

function drawText(ctx, el, w, h, isEditing) {
  const layout = layoutText({ ...el, w });
  const { lines, lineHeight } = layout;
  const fontSize = Math.max(1, Number(el.fontSize) || 16);
  let startY = 0;
  if (el.verticalAlign === 'middle') startY = (h - layout.totalHeight) / 2;
  if (el.verticalAlign === 'bottom') startY = h - layout.totalHeight;

  ctx.save();
  ctx.font = textFont(el);
  applyLetterSpacing(ctx, el.letterSpacing);
  ctx.textBaseline = 'top';
  ctx.textAlign = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'right' : 'left';
  const alignX = el.textAlign === 'center' ? w / 2 : el.textAlign === 'right' ? w : 0;

  if (isEditing) {
    ctx.restore();
    return;
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = el.uppercase ? lines[i].toUpperCase() : lines[i];
    const y = startY + i * lineHeight;
    if (el.fill && el.fill !== 'transparent' && el.fill !== 'none') {
      ctx.fillStyle = el.fill;
      ctx.fillText(line, alignX, y);
    }
    if (Number(el.strokeWidth) > 0 && el.stroke && el.stroke !== 'transparent') {
      ctx.lineWidth = Number(el.strokeWidth);
      ctx.strokeStyle = el.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, alignX, y);
    }
    if (el.underline) {
      const metrics = ctx.measureText(line);
      const lineW = metrics.width;
      let x0 = alignX;
      if (el.textAlign === 'center') x0 = alignX - lineW / 2;
      if (el.textAlign === 'right') x0 = alignX - lineW;
      const uy = y + fontSize * 1.02;
      ctx.beginPath();
      ctx.moveTo(x0, uy);
      ctx.lineTo(x0 + lineW, uy);
      ctx.lineWidth = Math.max(1, fontSize * 0.055);
      ctx.strokeStyle = el.fill || '#111827';
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLine(ctx, el, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.lineWidth = Math.max(1, Number(el.strokeWidth) || 2);
  ctx.strokeStyle = el.stroke && el.stroke !== 'transparent' ? el.stroke : '#111827';
  ctx.lineCap = 'round';
  ctx.stroke();
  if (el.arrow) {
    const size = Math.max(7, ctx.lineWidth * 4);
    ctx.beginPath();
    ctx.moveTo(w - size, h / 2 - size * 0.6);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w - size, h / 2 + size * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawImageElement(ctx, el, w, h) {
  const record = getImageRecord(el.src);
  const img = record && record.status === 'ready' ? record.img : null;

  ctx.save();
  if (el.radius > 0) {
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, w, h, el.radius);
    ctx.clip();
  }
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(0, 0, w, h);

  if (!img) {
    // Loading / missing image placeholder.
    ctx.save();
    ctx.fillStyle = '#a1a1aa';
    const label = record && record.status === 'error' ? 'Imagen no disponible' : 'Cargando imagen…';
    ctx.font = `500 ${Math.max(10, Math.min(18, w * 0.06))}px ${FONTS[0].value}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
    ctx.restore();
    ctx.restore();
    return;
  }

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  ctx.save();
  if (el.flipX || el.flipY) {
    ctx.translate(el.flipX ? w : 0, el.flipY ? h : 0);
    ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  }
  if (el.fit === 'contain') {
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }
  ctx.restore();
  ctx.restore();
}

/* ============================================================
   Scene rendering
   ============================================================ */
export function renderDoc(ctx, doc, { transparent = false, editingId = null } = {}) {
  ctx.save();
  if (!transparent) {
    ctx.fillStyle = doc.background || '#ffffff';
    ctx.fillRect(0, 0, doc.width, doc.height);
  }
  for (const el of doc.elements) {
    if (el.hidden) continue;
    drawElement(ctx, el, { editingId });
  }
  ctx.restore();
}

export function renderToCanvas(canvas, doc, {
  pixelRatio = 1,
  transparent = false,
  editingId = null,
} = {}) {
  const ratio = Math.max(0.05, Number(pixelRatio) || 1);
  const width = Math.max(1, Math.round(doc.width * ratio));
  const height = Math.max(1, Math.round(doc.height * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.scale(ratio, ratio);
  renderDoc(ctx, doc, { transparent, editingId });
  return canvas;
}

export function renderThumbnail(canvas, doc, maxW = 160, maxH = 160) {
  const scale = Math.min(maxW / doc.width, maxH / doc.height);
  const dpr = window.devicePixelRatio || 1;
  renderToCanvas(canvas, doc, { pixelRatio: scale * dpr });
  canvas.style.width = `${Math.round(doc.width * scale)}px`;
  canvas.style.height = `${Math.round(doc.height * scale)}px`;
  return canvas;
}

export function renderPreview(canvas, doc, maxW = 180, maxH = 180, transparent = false) {
  const scale = Math.min(maxW / doc.width, maxH / doc.height);
  const dpr = window.devicePixelRatio || 1;
  renderToCanvas(canvas, doc, { pixelRatio: scale * dpr, transparent });
  canvas.style.width = `${Math.round(doc.width * scale)}px`;
  canvas.style.height = `${Math.round(doc.height * scale)}px`;
  return canvas;
}
