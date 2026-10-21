import { loadImage } from './util.js';

/* ============================================================
   Canvas helpers
   ============================================================ */
function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return canvas;
}

export async function imageToCanvas(src, maxDim = 2000) {
  const img = await loadImage(src);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, maxDim / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, img, width: w, height: h, scale, naturalWidth: iw, naturalHeight: ih };
}

export function hexToRgb(hex) {
  const value = String(hex || '').replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function colorDistance(a, b) {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
}

/* ============================================================
   Background removal
   ============================================================ */
export function dominantBorderColor(imageData, width, height) {
  const data = imageData.data;
  const buckets = new Map();
  const step = Math.max(1, Math.round((width + height) / 600));
  const add = (x, y) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 24) return;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
  };
  for (let x = 0; x < width; x += step) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    add(0, y);
    add(width - 1, y);
  }
  let best = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best) return { r: 255, g: 255, b: 255, hex: '#ffffff', count: 0 };
  const r = Math.round(best.r / best.count);
  const g = Math.round(best.g / best.count);
  const b = Math.round(best.b / best.count);
  return { r, g, b, hex: rgbToHex(r, g, b), count: best.count };
}

function blurAlpha(alpha, width, height, radius) {
  const r = Math.max(0, Math.round(radius));
  if (!r) return alpha;
  const tmp = new Uint8ClampedArray(alpha.length);
  const out = new Uint8ClampedArray(alpha.length);
  // Horizontal box blur.
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    const row = y * width;
    for (let x = -r; x <= r; x += 1) {
      sum += alpha[row + Math.max(0, Math.min(width - 1, x))];
    }
    const norm = 2 * r + 1;
    for (let x = 0; x < width; x += 1) {
      tmp[row + x] = sum / norm;
      const add = alpha[row + Math.min(width - 1, x + r + 1)];
      const sub = alpha[row + Math.max(0, x - r)];
      sum += add - sub;
    }
  }
  // Vertical box blur.
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -r; y <= r; y += 1) {
      sum += tmp[Math.max(0, Math.min(height - 1, y)) * width + x];
    }
    const norm = 2 * r + 1;
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = sum / norm;
      const add = tmp[Math.min(height - 1, y + r + 1) * width + x];
      const sub = tmp[Math.max(0, y - r) * width + x];
      sum += add - sub;
    }
  }
  return out;
}

/**
 * Removes a connected background from the borders using a flood fill.
 * `tolerance` is a per-channel 0-255 distance. `mode='global'` removes every
 * pixel close to the dominant border color, even if disconnected.
 */
export async function removeBackground(src, {
  tolerance = 32,
  feather = 2,
  mode = 'edges',
  maxDim = 2000,
  backgroundHex = null,
} = {}) {
  const { canvas, ctx, width, height } = await imageToCanvas(src, maxDim);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const dominant = dominantBorderColor(imageData, width, height);
  const bg = backgroundHex ? hexToRgb(backgroundHex) : { r: dominant.r, g: dominant.g, b: dominant.b };
  const total = width * height;
  const alpha = new Uint8ClampedArray(total);
  for (let i = 0; i < total; i += 1) alpha[i] = data[i * 4 + 3];

  if (mode === 'global') {
    for (let i = 0; i < total; i += 1) {
      if (data[i * 4 + 3] < 8) {
        alpha[i] = 0;
        continue;
      }
      const distance = Math.max(
        Math.abs(data[i * 4] - bg.r),
        Math.abs(data[i * 4 + 1] - bg.g),
        Math.abs(data[i * 4 + 2] - bg.b),
      );
      if (distance <= tolerance) alpha[i] = 0;
    }
  } else {
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;
    const seed = (index) => {
      if (visited[index]) return;
      const p = index * 4;
      if (data[p + 3] < 8) {
        visited[index] = 1;
        alpha[index] = 0;
        queue[tail++] = index;
        return;
      }
      const distance = Math.max(
        Math.abs(data[p] - bg.r),
        Math.abs(data[p + 1] - bg.g),
        Math.abs(data[p + 2] - bg.b),
      );
      if (distance <= tolerance) {
        visited[index] = 1;
        alpha[index] = 0;
        queue[tail++] = index;
      }
    };
    for (let x = 0; x < width; x += 1) {
      seed(x);
      seed((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      seed(y * width);
      seed(y * width + width - 1);
    }
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = (index / width) | 0;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const n of neighbours) {
        if (n < 0 || visited[n]) continue;
        const p = n * 4;
        const distance = Math.max(
          Math.abs(data[p] - bg.r),
          Math.abs(data[p + 1] - bg.g),
          Math.abs(data[p + 2] - bg.b),
        );
        if (distance <= tolerance || data[p + 3] < 8) {
          visited[n] = 1;
          alpha[n] = 0;
          queue[tail++] = n;
        }
      }
    }
  }

  const smoothed = feather > 0 ? blurAlpha(alpha, width, height, feather) : alpha;
  for (let i = 0; i < total; i += 1) {
    data[i * 4 + 3] = smoothed[i];
  }
  ctx.putImageData(imageData, 0, 0);
  const out = canvas.toDataURL('image/png');
  let removed = 0;
  for (let i = 0; i < total; i += 1) if (alpha[i] === 0) removed += 1;
  return {
    src: out,
    width,
    height,
    background: backgroundHex || dominant.hex,
    removedRatio: removed / total,
  };
}

export async function sampleBackgroundColor(src) {
  const { ctx, width, height } = await imageToCanvas(src, 1200);
  const data = ctx.getImageData(0, 0, width, height);
  return dominantBorderColor(data, width, height);
}

/* ============================================================
   Magic eraser (diffusion inpainting)
   ============================================================ */
export async function inpaintFromMask(src, maskCanvas, {
  maxDim = 1600,
  iterations = 28,
} = {}) {
  const { canvas, ctx, width, height } = await imageToCanvas(src, maxDim);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const maskDraw = makeCanvas(width, height);
  const maskCtx = maskDraw.getContext('2d', { willReadFrequently: true });
  maskCtx.drawImage(maskCanvas, 0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  const indices = [];
  for (let i = 0; i < width * height; i += 1) {
    if (maskData[i * 4 + 3] > 40 || maskData[i * 4] > 150) {
      mask[i] = 1;
      indices.push(i);
    }
  }
  if (!indices.length) return { src, width, height, changed: 0 };

  // Average of boundary pixels around the mask.
  let br = 0; let bg = 0; let bb = 0; let count = 0;
  for (const index of indices) {
    const x = index % width;
    const y = (index / width) | 0;
    const neighbours = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y < height - 1 ? index + width : -1,
    ];
    for (const n of neighbours) {
      if (n < 0 || mask[n]) continue;
      const p = n * 4;
      br += data[p]; bg += data[p + 1]; bb += data[p + 2]; count += 1;
    }
  }
  if (!count) {
    for (let i = 0; i < width * height; i += 1) {
      if (mask[i]) continue;
      const p = i * 4;
      br += data[p]; bg += data[p + 1]; bb += data[p + 2]; count += 1;
    }
  }
  br /= Math.max(1, count); bg /= Math.max(1, count); bb /= Math.max(1, count);

  const work = new Uint8ClampedArray(data);
  const next = new Uint8ClampedArray(data);
  for (const index of indices) {
    const p = index * 4;
    work[p] = br; work[p + 1] = bg; work[p + 2] = bb;
    next[p] = br; next[p + 1] = bg; next[p + 2] = bb;
  }

  for (let iter = 0; iter < iterations; iter += 1) {
    for (const index of indices) {
      const x = index % width;
      const y = (index / width) | 0;
      let r = 0; let g = 0; let b = 0; let n = 0;
      if (x > 0) { const p = (index - 1) * 4; r += work[p]; g += work[p + 1]; b += work[p + 2]; n += 1; }
      if (x < width - 1) { const p = (index + 1) * 4; r += work[p]; g += work[p + 1]; b += work[p + 2]; n += 1; }
      if (y > 0) { const p = (index - width) * 4; r += work[p]; g += work[p + 1]; b += work[p + 2]; n += 1; }
      if (y < height - 1) { const p = (index + width) * 4; r += work[p]; g += work[p + 1]; b += work[p + 2]; n += 1; }
      if (!n) continue;
      const p = index * 4;
      next[p] = r / n; next[p + 1] = g / n; next[p + 2] = b / n;
    }
    // Swap and copy only masked pixels back.
    for (const index of indices) {
      const p = index * 4;
      work[p] = next[p]; work[p + 1] = next[p + 1]; work[p + 2] = next[p + 2];
    }
  }

  for (const index of indices) {
    const p = index * 4;
    data[p] = work[p]; data[p + 1] = work[p + 1]; data[p + 2] = work[p + 2];
    data[p + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return { src: canvas.toDataURL('image/png'), width, height, changed: indices.length };
}

/* ============================================================
   Crop
   ============================================================ */
export async function cropImage(src, crop, { maxDim = 3000 } = {}) {
  const { ctx, width, height } = await imageToCanvas(src, maxDim);
  const x = Math.round(Math.max(0, Math.min(1, crop.x)) * width);
  const y = Math.round(Math.max(0, Math.min(1, crop.y)) * height);
  const w = Math.max(1, Math.round(Math.max(0.01, Math.min(1, crop.w)) * width));
  const h = Math.max(1, Math.round(Math.max(0.01, Math.min(1, crop.h)) * height));
  const out = makeCanvas(w, h);
  out.getContext('2d').drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
  return { src: out.toDataURL('image/png'), width: w, height: h };
}

/* ============================================================
   Placeholders for collages and image slots
   ============================================================ */
export function makePlaceholderSrc(label = 'Foto', width = 600, height = 600, tone = 0) {
  const backgrounds = ['#e7e5e4', '#e2e8f0', '#f1f5f9', '#ede9fe'];
  const bg = backgrounds[tone % backgrounds.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${bg}"/>
    <rect x="24" y="24" width="552" height="552" rx="18" fill="none" stroke="#a8a29e" stroke-width="3" stroke-dasharray="12 10"/>
    <g fill="none" stroke="#78716c" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
      <rect x="210" y="204" width="180" height="140" rx="14"/>
      <circle cx="258" cy="250" r="16" fill="#78716c" stroke="none"/>
      <path d="m218 326 54-54 40 40 30-28 48 42"/>
    </g>
    <text x="300" y="420" text-anchor="middle" fill="#57534e" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700">${label}</text>
    <text x="300" y="458" text-anchor="middle" fill="#a8a29e" font-family="Helvetica, Arial, sans-serif" font-size="20">Subí una foto</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ============================================================
   Screen capture
   ============================================================ */
export async function captureScreenFrame() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('La captura de pantalla no está disponible en este navegador.');
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false,
  });
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 280));
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = makeCanvas(width, height);
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    return { src: canvas.toDataURL('image/png'), width, height };
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
}
