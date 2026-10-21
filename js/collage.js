import { FONTS, deepClone } from './util.js';
import { makeElement } from './model.js';
import { makePlaceholderSrc } from './image-tools.js';

export function collageSlots(doc) {
  return doc.elements
    .filter((el) => el.type === 'image' && Number.isFinite(Number(el.collageSlot)))
    .sort((a, b) => Number(a.collageSlot) - Number(b.collageSlot));
}

export function buildCollageElements(doc, {
  rows = 2,
  cols = 2,
  margin = 48,
  gap = 16,
  top = 148,
  bottom = 40,
  title = 'MIS MOMENTOS',
} = {}) {
  const elements = [];
  if (title) {
    elements.push(makeElement('text', {
      name: 'Título del collage',
      x: margin,
      y: 58,
      w: doc.width - margin * 2,
      h: 40,
      text: title,
      fontSize: Math.max(18, Math.round(doc.width * 0.026)),
      fontWeight: 800,
      fontFamily: FONTS[0].value,
      letterSpacing: 4,
      uppercase: true,
      textAlign: 'center',
      fill: '#292524',
    }));
  }
  const availableW = doc.width - margin * 2;
  const availableH = doc.height - top - bottom;
  const cellW = (availableW - gap * (cols - 1)) / cols;
  const cellH = (availableH - gap * (rows - 1)) / rows;
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      index += 1;
      const x = margin + col * (cellW + gap);
      const y = top + row * (cellH + gap);
      elements.push(makeElement('image', {
        name: `Foto ${index}`,
        x,
        y,
        w: cellW,
        h: cellH,
        src: makePlaceholderSrc(`Foto ${index}`, Math.round(cellW), Math.round(cellH), index - 1),
        naturalWidth: Math.round(cellW),
        naturalHeight: Math.round(cellH),
        fit: 'cover',
        radius: 10,
        isPlaceholder: true,
        collageSlot: index,
      }));
    }
  }
  return elements;
}

export function createCollageDoc(rows = 2, cols = 2) {
  const doc = {
    schema: 1,
    name: `Collage ${rows}×${cols}`,
    width: 1080,
    height: 1080,
    background: '#f6f2ea',
    elements: [],
    createdAt: new Date().toISOString(),
  };
  doc.elements = buildCollageElements(doc, {
    rows,
    cols,
    title: rows === 3 ? 'RECUERDOS' : 'MIS MOMENTOS',
  });
  return doc;
}

export function addCollageToDoc(doc, rows = 2, cols = 2) {
  const draft = deepClone(doc);
  const elements = buildCollageElements(draft, { rows, cols, title: 'MIS MOMENTOS' });
  draft.elements = [...draft.elements.filter((el) => !Number.isFinite(Number(el.collageSlot))), ...elements];
  return draft;
}
