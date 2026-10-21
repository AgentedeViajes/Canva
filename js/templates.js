import { FONTS, deepClone } from './util.js';
import { makeElement, makeAbstractArtwork, starterDoc } from './model.js';

function baseDoc(name, background = '#ffffff') {
  return {
    schema: 1,
    name,
    width: 1080,
    height: 1080,
    background,
    elements: [],
    createdAt: new Date().toISOString(),
  };
}

function minimalTemplate() {
  const doc = baseDoc('Menos es más', '#f7f6f2');
  doc.elements = [
    makeElement('text', {
      name: 'Titular', x: 96, y: 128, w: 760, h: 380,
      text: 'MENOS', fontSize: 190, fontWeight: 900, lineHeight: 0.82,
      letterSpacing: -10, fill: '#111111', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Acento', x: 104, y: 465, w: 700, h: 150,
      text: 'es más.', fontSize: 116, fontStyle: 'italic', fontWeight: 400,
      fontFamily: FONTS[7].value, fill: '#111111', lineHeight: 0.95,
    }),
    makeElement('line', {
      name: 'Regla', x: 104, y: 660, w: 872, h: 2, stroke: '#111111', strokeWidth: 2,
    }),
    makeElement('text', {
      name: 'Descripción', x: 104, y: 692, w: 560, h: 100,
      text: 'Un sistema visual que respira. Menos ruido, más intención.',
      fontSize: 21, fontWeight: 400, lineHeight: 1.45, fill: '#52525b',
      fontFamily: FONTS[0].value,
    }),
    makeElement('ellipse', {
      name: 'Punto coral', x: 900, y: 700, w: 76, h: 76, fill: '#f97354',
    }),
    makeElement('text', {
      name: 'Pie', x: 104, y: 916, w: 860, h: 26,
      text: 'LIENZO · ESTUDIO DE DISEÑO · 2026', fontSize: 13, fontWeight: 700,
      letterSpacing: 3.2, uppercase: true, fill: '#71717a', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function manifestoTemplate() {
  const doc = baseDoc('Manifiesto', '#121212');
  doc.elements = [
    makeElement('ellipse', {
      name: 'Halo violeta', x: -160, y: 640, w: 540, h: 540,
      fill: '#4c1d95', opacity: 0.75,
    }),
    makeElement('ellipse', {
      name: 'Halo coral', x: 760, y: -190, w: 500, h: 500,
      fill: '#9a3412', opacity: 0.7,
    }),
    makeElement('star', {
      name: 'Estrella', x: 824, y: 710, w: 126, h: 126, fill: '#facc15', rotation: 0.12,
    }),
    makeElement('text', {
      name: 'Titular', x: 86, y: 176, w: 900, h: 520,
      text: 'HAZ\nLO QUE\nIMPORTA', fontSize: 154, fontWeight: 900, lineHeight: 0.84,
      letterSpacing: -7, fill: '#fafafa', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Bajada', x: 92, y: 700, w: 600, h: 80,
      text: 'Diseña con intención, no por inercia.',
      fontSize: 30, fontWeight: 400, fontFamily: FONTS[7].value, fontStyle: 'italic',
      fill: '#d4d4d8',
    }),
    makeElement('rect', {
      name: 'Píldora', x: 92, y: 834, w: 330, h: 66, radius: 33, fill: '#fafafa',
    }),
    makeElement('text', {
      name: 'Píldora texto', x: 92, y: 834, w: 330, h: 66,
      text: 'EMPIEZA HOY', fontSize: 17, fontWeight: 800, letterSpacing: 2.8,
      uppercase: true, textAlign: 'center', verticalAlign: 'middle',
      fill: '#111111', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function socialTemplate() {
  const doc = baseDoc('Nueva colección', '#f8f4ec');
  const art = makeAbstractArtwork();
  doc.elements = [
    makeElement('rect', {
      name: 'Panel violeta', x: 606, y: 0, w: 474, h: 1080, fill: '#312e81',
    }),
    makeElement('ellipse', {
      name: 'Sol', x: 690, y: 86, w: 320, h: 320, fill: '#facc15',
    }),
    makeElement('image', {
      name: 'Arte', x: 668, y: 448, w: 360, h: 470, src: art,
      naturalWidth: 600, naturalHeight: 780, radius: 180, fit: 'cover',
    }),
    makeElement('text', {
      name: 'Kicker', x: 72, y: 132, w: 420, h: 30,
      text: 'COLECCIÓN 01', fontSize: 17, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#57534e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Titular', x: 68, y: 200, w: 520, h: 430,
      text: 'NUEVA\nCOLEC-\nCIÓN', fontSize: 122, fontWeight: 900, lineHeight: 0.88,
      letterSpacing: -5, fill: '#171717', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Bajada', x: 74, y: 664, w: 440, h: 90,
      text: 'Piezas editables para tus proyectos propios.',
      fontSize: 24, lineHeight: 1.35, fontFamily: FONTS[7].value, fontStyle: 'italic',
      fill: '#44403c',
    }),
    makeElement('rect', {
      name: 'Botón', x: 74, y: 808, w: 300, h: 64, radius: 32, fill: '#171717',
    }),
    makeElement('text', {
      name: 'Botón texto', x: 74, y: 808, w: 300, h: 64,
      text: 'VER PIEZAS', fontSize: 16, fontWeight: 800, letterSpacing: 2.5,
      uppercase: true, textAlign: 'center', verticalAlign: 'middle',
      fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Pie', x: 74, y: 950, w: 440, h: 24,
      text: 'HECHO PARA CREAR · LIENZO', fontSize: 12, fontWeight: 700,
      letterSpacing: 3, uppercase: true, fill: '#a8a29e', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

export function getTemplates() {
  return [
    { id: 'editorial', name: 'Editorial', doc: starterDoc() },
    { id: 'minimal', name: 'Minimal', doc: minimalTemplate() },
    { id: 'manifesto', name: 'Manifiesto', doc: manifestoTemplate() },
    { id: 'social', name: 'Social', doc: socialTemplate() },
  ];
}

export function templateById(id) {
  const item = getTemplates().find((template) => template.id === id);
  return item ? deepClone(item.doc) : deepClone(starterDoc());
}
