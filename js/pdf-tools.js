import { clamp, downloadBlob, sanitizeFilename } from './util.js';
import { ensureImages, renderToCanvas } from './render.js';

const encoder = new TextEncoder();

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function escapePdfString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Builds a valid PDF 1.4 with one JPEG image per page. This is deliberately
 * dependency-free so the editor remains fully local.
 */
export function buildPdfFromJpegs(pages, { title = 'Lienzo' } = {}) {
  if (!pages.length) throw new Error('No hay páginas para exportar.');
  const chunks = [];
  let length = 0;
  const offsets = [];
  const add = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObj = (number) => {
    offsets[number] = length;
    add(`${number} 0 obj\n`);
  };
  const endObj = () => add('\nendobj\n');

  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const pageCount = pages.length;
  const infoNumber = 3 + pageCount * 3;

  beginObj(1);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  const pageRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  beginObj(2);
  add(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`);
  endObj();

  pages.forEach((page, i) => {
    const pageObj = 3 + i * 3;
    const contentObj = 4 + i * 3;
    const imageObj = 5 + i * 3;
    const pageW = page.pageWidth;
    const pageH = page.pageHeight;
    const content = `q\n${pageW.toFixed(3)} 0 0 ${pageH.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
    const contentBytes = encoder.encode(content);

    beginObj(pageObj);
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(3)} ${pageH.toFixed(3)}] /Resources << /XObject << /Im0 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    endObj();

    beginObj(contentObj);
    add(`<< /Length ${contentBytes.length} >>\nstream\n`);
    add(contentBytes);
    add('endstream');
    endObj();

    beginObj(imageObj);
    add(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`);
    add(page.jpeg);
    add('\nendstream');
    endObj();
  });

  beginObj(infoNumber);
  add(`<< /Title (${escapePdfString(title)}) /Producer (Lienzo) /Creator (Lienzo) >>`);
  endObj();

  const xrefOffset = length;
  add(`xref\n0 ${infoNumber + 1}\n`);
  add('0000000000 65535 f \n');
  for (let i = 1; i <= infoNumber; i += 1) {
    add(`${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`);
  }
  add(`trailer\n<< /Size ${infoNumber + 1} /Root 1 0 R /Info ${infoNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Blob(chunks.map((chunk) => (typeof chunk === 'string' ? encoder.encode(chunk) : chunk)).reduce((acc, chunk) => {
    acc.push(chunk);
    return acc;
  }, []), { type: 'application/pdf' });
}

function fitPageSize(width, height) {
  let pageW = width * 0.75;
  let pageH = height * 0.75;
  const max = 1200;
  const scale = Math.min(1, max / Math.max(pageW, pageH));
  return { pageW: Math.max(72, pageW * scale), pageH: Math.max(72, pageH * scale) };
}

export async function exportDocToPdf(doc, {
  scale = 2,
  filename = 'lienzo',
  download = true,
} = {}) {
  await ensureImages(doc.elements);
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  renderToCanvas(canvas, doc, { pixelRatio: scale, transparent: false });
  const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);
  const jpeg = dataUrlToBytes(jpegUrl);
  const { pageW, pageH } = fitPageSize(doc.width, doc.height);
  const blob = buildPdfFromJpegs([{
    jpeg,
    width: canvas.width,
    height: canvas.height,
    pageWidth: pageW,
    pageHeight: pageH,
  }], { title: doc.name || filename });
  if (download) {
    downloadBlob(blob, `${sanitizeFilename(filename, 'lienzo')}.pdf`);
  }
  return { blob, width: canvas.width, height: canvas.height, pageWidth: pageW, pageHeight: pageH };
}

export async function importPdfFirstPage(file, { scale = 2, maxWidth = 2200 } = {}) {
  const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const renderScale = Math.min(scale, maxWidth / baseViewport.width);
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return {
    src: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    pageWidth: baseViewport.width,
    pageHeight: baseViewport.height,
    numPages: pdf.numPages,
  };
}
