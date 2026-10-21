import { FONTS, deepClone } from './util.js';
import { makeElement, makeAbstractArtwork, starterDoc } from './model.js';
import { createCollageDoc } from './collage.js';

function baseDoc(name, background = '#ffffff', width = 1080, height = 1080) {
  return {
    schema: 1,
    name,
    width,
    height,
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

function storyTemplate() {
  const doc = baseDoc('Historia', '#0f172a', 1080, 1920);
  const art = makeAbstractArtwork();
  doc.elements = [
    makeElement('ellipse', {
      name: 'Halo coral', x: 620, y: -200, w: 620, h: 620, fill: '#be123c', opacity: 0.7,
    }),
    makeElement('ellipse', {
      name: 'Halo teal', x: -220, y: 1080, w: 620, h: 620, fill: '#0f766e', opacity: 0.6,
    }),
    makeElement('text', {
      name: 'Kicker', x: 86, y: 132, w: 780, h: 34,
      text: 'NUEVA TEMPORADA · 2026', fontSize: 22, fontWeight: 800,
      letterSpacing: 4.4, uppercase: true, fill: '#fda4af', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Titular', x: 80, y: 220, w: 900, h: 470,
      text: 'HISTORIA\nQUE SE\nCUENTA', fontSize: 142, fontWeight: 900, lineHeight: 0.84,
      letterSpacing: -6, fill: '#fafafa', fontFamily: FONTS[0].value,
    }),
    makeElement('image', {
      name: 'Arte', x: 220, y: 760, w: 640, h: 760, src: art,
      naturalWidth: 600, naturalHeight: 780, radius: 28, fit: 'cover',
    }),
    makeElement('text', {
      name: 'Bajada', x: 86, y: 1580, w: 720, h: 100,
      text: 'Una historia visual para detener el scroll.',
      fontSize: 34, fontFamily: FONTS[7].value, fontStyle: 'italic', fill: '#e4e4e7',
    }),
    makeElement('text', {
      name: 'Pie', x: 86, y: 1810, w: 600, h: 26,
      text: 'DESLIZÁ PARA VER MÁS', fontSize: 14, fontWeight: 700, letterSpacing: 3,
      uppercase: true, fill: '#a1a1aa', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function flyerTemplate() {
  const doc = baseDoc('Flyer de evento', '#fef3c7', 1240, 1754);
  doc.elements = [
    makeElement('ellipse', {
      name: 'Círculo coral', x: 900, y: 80, w: 280, h: 280, fill: '#f97354',
    }),
    makeElement('rect', {
      name: 'Banda negra', x: -100, y: 330, w: 1500, h: 440, fill: '#111827', rotation: -0.08,
    }),
    makeElement('text', {
      name: 'Kicker', x: 90, y: 140, w: 700, h: 32,
      text: 'SÁBADO 24 · 20:00 H', fontSize: 20, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#57534e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Titular', x: 70, y: 390, w: 1100, h: 300,
      text: 'NOCHE\nDE ARTE', fontSize: 170, fontWeight: 900, lineHeight: 0.82,
      letterSpacing: -6, fill: '#fef3c7', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Descripción', x: 90, y: 900, w: 720, h: 150,
      text: 'Música en vivo, arte emergente y una noche para encontrarnos.',
      fontSize: 34, lineHeight: 1.35, fontFamily: FONTS[7].value, fontStyle: 'italic',
      fill: '#292524',
    }),
    makeElement('image', {
      name: 'Imagen del evento', x: 760, y: 900, w: 390, h: 470,
      src: makeAbstractArtwork(), naturalWidth: 600, naturalHeight: 780,
      radius: 18, fit: 'cover',
    }),
    makeElement('line', {
      name: 'Regla', x: 90, y: 1480, w: 1060, h: 2, stroke: '#111827', strokeWidth: 2,
    }),
    makeElement('text', {
      name: 'Lugar', x: 90, y: 1510, w: 600, h: 50,
      text: 'GALERÍA CENTRAL · ENTRADA LIBRE', fontSize: 17, fontWeight: 700,
      letterSpacing: 2.4, uppercase: true, fill: '#57534e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Pie', x: 90, y: 1640, w: 800, h: 28,
      text: 'LIENZO · CULTURA Y DISEÑO', fontSize: 13, fontWeight: 700,
      letterSpacing: 3, uppercase: true, fill: '#78716c', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function logoTemplate() {
  const doc = baseDoc('Logo', '#f8f5ef', 500, 500);
  doc.elements = [
    makeElement('ellipse', {
      name: 'Disco', x: 150, y: 70, w: 200, h: 200, fill: '#171717',
    }),
    makeElement('text', {
      name: 'Monograma', x: 150, y: 70, w: 200, h: 200,
      text: 'L', fontSize: 128, fontWeight: 900, fontFamily: FONTS[7].value,
      textAlign: 'center', verticalAlign: 'middle', fill: '#f8f5ef',
    }),
    makeElement('text', {
      name: 'Marca', x: 70, y: 300, w: 360, h: 42,
      text: 'LIENZO', fontSize: 32, fontWeight: 900, letterSpacing: 8,
      textAlign: 'center', fill: '#171717', fontFamily: FONTS[0].value,
    }),
    makeElement('line', {
      name: 'Regla', x: 192, y: 352, w: 116, h: 2, stroke: '#a8a29e', strokeWidth: 1,
    }),
    makeElement('text', {
      name: 'Descriptor', x: 70, y: 370, w: 360, h: 24,
      text: 'ESTUDIO CREATIVO', fontSize: 11, fontWeight: 700, letterSpacing: 3.4,
      uppercase: true, textAlign: 'center', fill: '#78716c', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function collageTemplate() {
  const doc = createCollageDoc(2, 2);
  doc.name = 'Collage de fotos';
  return doc;
}

function brochureTemplate() {
  const doc = baseDoc('Folleto', '#f8fafc', 2480, 1754);
  const art = makeAbstractArtwork();
  doc.elements = [
    makeElement('rect', { name: 'Panel 1', x: 0, y: 0, w: 826, h: 1754, fill: '#0f766e' }),
    makeElement('rect', { name: 'Panel 2', x: 827, y: 0, w: 826, h: 1754, fill: '#ecfeff' }),
    makeElement('rect', { name: 'Panel 3', x: 1654, y: 0, w: 826, h: 1754, fill: '#fef3c7' }),
    makeElement('line', { name: 'Pliegue 1', x: 826, y: 0, w: 2, h: 1754, stroke: '#94a3b8', strokeWidth: 1 }),
    makeElement('line', { name: 'Pliegue 2', x: 1654, y: 0, w: 2, h: 1754, stroke: '#94a3b8', strokeWidth: 1 }),
    makeElement('text', {
      name: 'Kicker', x: 80, y: 90, w: 600, h: 30,
      text: 'FOLLETO · 2026', fontSize: 18, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#99f6e4', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Titular', x: 80, y: 160, w: 660, h: 480,
      text: 'UNA\nNUEVA\nMIRADA', fontSize: 128, fontWeight: 900, lineHeight: 0.84,
      letterSpacing: -5, fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Bajada', x: 80, y: 760, w: 600, h: 140,
      text: 'Ideas, recursos y diseño para proyectos que se sienten propios.',
      fontSize: 30, lineHeight: 1.35, fontFamily: FONTS[7].value, fontStyle: 'italic',
      fill: '#ccfbf1',
    }),
    makeElement('image', {
      name: 'Arte central', x: 980, y: 180, w: 520, h: 650, src: art,
      naturalWidth: 600, naturalHeight: 780, radius: 24, fit: 'cover',
    }),
    makeElement('text', {
      name: 'Título 2', x: 920, y: 900, w: 640, h: 80,
      text: 'Diseño con intención', fontSize: 44, fontWeight: 800,
      fill: '#0f172a', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Texto 2', x: 920, y: 1000, w: 600, h: 220,
      text: 'Cada pieza está pensada para editarse rápido: cambiá textos, colores y recursos sin empezar de cero.',
      fontSize: 25, lineHeight: 1.5, fill: '#475569', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Título 3', x: 1740, y: 160, w: 620, h: 100,
      text: 'CONTACTO', fontSize: 42, fontWeight: 900, letterSpacing: 2,
      fill: '#292524', fontFamily: FONTS[0].value,
    }),
    makeElement('line', { name: 'Regla', x: 1740, y: 280, w: 560, h: 2, stroke: '#a16207', strokeWidth: 2 }),
    makeElement('text', {
      name: 'Contacto', x: 1740, y: 320, w: 600, h: 260,
      text: 'hola@lienzo.studio\n+54 11 5555 5555\nlienzo.studio\n@lienzo.studio',
      fontSize: 27, lineHeight: 1.65, fill: '#44403c', fontFamily: FONTS[0].value,
    }),
    makeElement('rect', { name: 'Botón', x: 1740, y: 660, w: 360, h: 68, radius: 34, fill: '#171717' }),
    makeElement('text', {
      name: 'Botón texto', x: 1740, y: 660, w: 360, h: 68,
      text: 'HABLEMOS', fontSize: 16, fontWeight: 800, letterSpacing: 2.8,
      uppercase: true, textAlign: 'center', verticalAlign: 'middle',
      fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function resumeTemplate() {
  const doc = baseDoc('Currículum', '#ffffff', 1240, 1754);
  doc.elements = [
    makeElement('rect', { name: 'Columna', x: 0, y: 0, w: 400, h: 1754, fill: '#111827' }),
    makeElement('ellipse', { name: 'Avatar', x: 100, y: 100, w: 200, h: 200, fill: '#f97354' }),
    makeElement('text', {
      name: 'Nombre', x: 50, y: 360, w: 300, h: 130,
      text: 'JAVIER\nAGENTE', fontSize: 52, fontWeight: 900, lineHeight: 0.95,
      fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Puesto', x: 50, y: 510, w: 300, h: 40,
      text: 'DISEÑADOR & CREATIVO', fontSize: 14, fontWeight: 700, letterSpacing: 2,
      uppercase: true, fill: '#fda4af', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Contacto', x: 50, y: 620, w: 300, h: 250,
      text: 'hola@javier.studio\n+54 11 5555 5555\nBuenos Aires, AR\nlienzo.studio',
      fontSize: 16, lineHeight: 1.7, fill: '#d4d4d8', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Habilidades', x: 50, y: 1020, w: 300, h: 30,
      text: 'HABILIDADES', fontSize: 14, fontWeight: 800, letterSpacing: 3,
      uppercase: true, fill: '#a1a1aa', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Lista habilidades', x: 50, y: 1060, w: 300, h: 300,
      text: 'Dirección de arte\nDiseño editorial\nBranding\nTipografía\nFigma · Canvas',
      fontSize: 17, lineHeight: 1.8, fill: '#e4e4e7', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Perfil título', x: 470, y: 100, w: 700, h: 34,
      text: 'PERFIL', fontSize: 15, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#0f766e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Perfil', x: 470, y: 145, w: 680, h: 120,
      text: 'Diseñador multidisciplinario con foco en identidad visual, editorial y experiencias digitales. Me gusta convertir ideas complejas en sistemas simples.',
      fontSize: 21, lineHeight: 1.5, fill: '#3f3f46', fontFamily: FONTS[0].value,
    }),
    makeElement('line', { name: 'Regla 1', x: 470, y: 310, w: 680, h: 2, stroke: '#e4e4e7', strokeWidth: 2 }),
    makeElement('text', {
      name: 'Experiencia título', x: 470, y: 350, w: 700, h: 34,
      text: 'EXPERIENCIA', fontSize: 15, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#0f766e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Trabajo 1', x: 470, y: 400, w: 680, h: 100,
      text: '2023 — Actualidad · Estudio Lienzo\nDirección de arte y diseño de marca para proyectos culturales y digitales.',
      fontSize: 19, lineHeight: 1.5, fill: '#27272a', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Trabajo 2', x: 470, y: 540, w: 680, h: 100,
      text: '2020 — 2023 · Agencia Sur\nDiseño editorial, campañas y sistemas visuales para marcas emergentes.',
      fontSize: 19, lineHeight: 1.5, fill: '#52525b', fontFamily: FONTS[0].value,
    }),
    makeElement('line', { name: 'Regla 2', x: 470, y: 690, w: 680, h: 2, stroke: '#e4e4e7', strokeWidth: 2 }),
    makeElement('text', {
      name: 'Educación título', x: 470, y: 730, w: 700, h: 34,
      text: 'EDUCACIÓN', fontSize: 15, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#0f766e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Educación', x: 470, y: 780, w: 680, h: 100,
      text: 'Licenciatura en Diseño Gráfico\nUniversidad de Buenos Aires · 2016 — 2020',
      fontSize: 19, lineHeight: 1.5, fill: '#3f3f46', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Pie', x: 470, y: 1600, w: 680, h: 24,
      text: 'PORTFOLIO · LIENZO.STUDIO', fontSize: 12, fontWeight: 700,
      letterSpacing: 3, uppercase: true, fill: '#a1a1aa', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function businessCardTemplate() {
  const doc = baseDoc('Tarjeta personal', '#111827', 1050, 600);
  doc.elements = [
    makeElement('ellipse', { name: 'Acento', x: 760, y: -120, w: 360, h: 360, fill: '#f97354' }),
    makeElement('star', { name: 'Estrella', x: 820, y: 380, w: 90, h: 90, fill: '#facc15', rotation: 0.1 }),
    makeElement('text', {
      name: 'Nombre', x: 70, y: 100, w: 700, h: 150,
      text: 'JAVIER\nAGENTE', fontSize: 72, fontWeight: 900, lineHeight: 0.9,
      letterSpacing: -2, fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Puesto', x: 74, y: 270, w: 600, h: 30,
      text: 'DISEÑADOR GRÁFICO & DIRECTOR DE ARTE', fontSize: 13, fontWeight: 700,
      letterSpacing: 2.6, uppercase: true, fill: '#fda4af', fontFamily: FONTS[0].value,
    }),
    makeElement('line', { name: 'Regla', x: 74, y: 350, w: 360, h: 2, stroke: '#52525b', strokeWidth: 2 }),
    makeElement('text', {
      name: 'Contacto', x: 74, y: 390, w: 600, h: 120,
      text: 'hola@lienzo.studio\n+54 11 5555 5555\nlienzo.studio',
      fontSize: 18, lineHeight: 1.6, fill: '#d4d4d8', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function emailTemplate() {
  const doc = baseDoc('Correo', '#f5f3ff', 1200, 1600);
  const art = makeAbstractArtwork();
  doc.elements = [
    makeElement('rect', { name: 'Cabecera', x: 0, y: 0, w: 1200, h: 120, fill: '#312e81' }),
    makeElement('text', {
      name: 'Marca', x: 60, y: 0, w: 500, h: 120,
      text: 'LIENZO', fontSize: 24, fontWeight: 900, letterSpacing: 6,
      verticalAlign: 'middle', fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Mes', x: 900, y: 0, w: 240, h: 120,
      text: 'NEWSLETTER · 01', fontSize: 12, fontWeight: 700, letterSpacing: 2,
      uppercase: true, textAlign: 'right', verticalAlign: 'middle',
      fill: '#c7d2fe', fontFamily: FONTS[0].value,
    }),
    makeElement('image', {
      name: 'Hero', x: 60, y: 160, w: 1080, h: 460, src: art,
      naturalWidth: 600, naturalHeight: 780, radius: 20, fit: 'cover',
    }),
    makeElement('text', {
      name: 'Titular', x: 60, y: 690, w: 1000, h: 160,
      text: 'Ideas que abren\nnuevas conversaciones', fontSize: 58, fontWeight: 900,
      lineHeight: 0.98, letterSpacing: -2, fill: '#1e1b4b', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Cuerpo', x: 60, y: 890, w: 980, h: 170,
      text: 'Este mes exploramos identidad visual, tipografía y procesos creativos. Una selección breve para empezar la semana con otra mirada.',
      fontSize: 22, lineHeight: 1.5, fill: '#4c1d95', fontFamily: FONTS[0].value,
    }),
    makeElement('rect', { name: 'Botón', x: 60, y: 1110, w: 330, h: 70, radius: 35, fill: '#6d28d9' }),
    makeElement('text', {
      name: 'Botón texto', x: 60, y: 1110, w: 330, h: 70,
      text: 'LEER LA EDICIÓN', fontSize: 15, fontWeight: 800, letterSpacing: 2.2,
      uppercase: true, textAlign: 'center', verticalAlign: 'middle',
      fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('line', { name: 'Regla', x: 60, y: 1320, w: 1080, h: 2, stroke: '#ddd6fe', strokeWidth: 2 }),
    makeElement('text', {
      name: 'Pie', x: 60, y: 1360, w: 1080, h: 100,
      text: 'Recibís este correo porque te suscribiste a Lienzo.\nVer en el navegador · Cancelar suscripción',
      fontSize: 15, lineHeight: 1.6, fill: '#8b5cf6', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

function documentTemplate() {
  const doc = baseDoc('Documento', '#ffffff', 1240, 1754);
  const art = makeAbstractArtwork();
  doc.elements = [
    makeElement('rect', { name: 'Cabecera', x: 0, y: 0, w: 1240, h: 250, fill: '#0f766e' }),
    makeElement('text', {
      name: 'Kicker', x: 80, y: 50, w: 700, h: 30,
      text: 'INFORME · LIENZO STUDIO', fontSize: 13, fontWeight: 800, letterSpacing: 4,
      uppercase: true, fill: '#99f6e4', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Título', x: 80, y: 90, w: 900, h: 110,
      text: 'Diseño que\nse adapta', fontSize: 62, fontWeight: 900, lineHeight: 0.92,
      letterSpacing: -2, fill: '#ffffff', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Introducción', x: 80, y: 310, w: 700, h: 150,
      text: 'Un documento visual para ordenar ideas, presentar proyectos y compartir procesos sin perder claridad.',
      fontSize: 24, lineHeight: 1.5, fill: '#3f3f46', fontFamily: FONTS[0].value,
    }),
    makeElement('image', {
      name: 'Imagen', x: 830, y: 300, w: 330, h: 250, src: art,
      naturalWidth: 600, naturalHeight: 780, radius: 16, fit: 'cover',
    }),
    makeElement('line', { name: 'Regla', x: 80, y: 590, w: 1080, h: 2, stroke: '#d4d4d8', strokeWidth: 2 }),
    makeElement('text', {
      name: 'Sección 1', x: 80, y: 630, w: 500, h: 36,
      text: '01 · CONTEXTO', fontSize: 18, fontWeight: 800, letterSpacing: 3,
      uppercase: true, fill: '#0f766e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Texto 1', x: 80, y: 680, w: 480, h: 260,
      text: 'El punto de partida es entender qué necesita el proyecto y qué debe comunicar. A partir de ahí construimos un sistema flexible.',
      fontSize: 22, lineHeight: 1.55, fill: '#52525b', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Sección 2', x: 660, y: 630, w: 500, h: 36,
      text: '02 · PROCESO', fontSize: 18, fontWeight: 800, letterSpacing: 3,
      uppercase: true, fill: '#0f766e', fontFamily: FONTS[0].value,
    }),
    makeElement('text', {
      name: 'Texto 2', x: 660, y: 680, w: 500, h: 260,
      text: 'Exploramos referencias, probamos tipografías y definimos una dirección visual. Cada decisión se documenta para poder iterar.',
      fontSize: 22, lineHeight: 1.55, fill: '#52525b', fontFamily: FONTS[0].value,
    }),
    makeElement('rect', { name: 'Cita fondo', x: 80, y: 940, w: 1080, h: 190, radius: 18, fill: '#f0fdfa' }),
    makeElement('text', {
      name: 'Cita', x: 120, y: 980, w: 980, h: 110,
      text: '“Un buen sistema visual no se impone: se reconoce.”',
      fontSize: 36, fontFamily: FONTS[7].value, fontStyle: 'italic', fill: '#134e4a',
    }),
    makeElement('text', {
      name: 'Pie', x: 80, y: 1640, w: 1080, h: 28,
      text: 'LIENZO STUDIO · DOCUMENTO CONFIDENCIAL · PÁGINA 1', fontSize: 12, fontWeight: 700,
      letterSpacing: 3, uppercase: true, fill: '#a1a1aa', fontFamily: FONTS[0].value,
    }),
  ];
  return doc;
}

export function getTemplates() {
  return [
    { id: 'editorial', name: 'Editorial', category: 'Marketing', doc: starterDoc() },
    { id: 'minimal', name: 'Minimal', category: 'Marketing', doc: minimalTemplate() },
    { id: 'manifesto', name: 'Manifiesto', category: 'Redes', doc: manifestoTemplate() },
    { id: 'social', name: 'Instagram', category: 'Redes', doc: socialTemplate() },
    { id: 'story', name: 'Historia', category: 'Redes', doc: storyTemplate() },
    { id: 'flyer', name: 'Flyer', category: 'Marketing', doc: flyerTemplate() },
    { id: 'logo', name: 'Logo', category: 'Marketing', doc: logoTemplate() },
    { id: 'collage', name: 'Collage', category: 'Marketing', doc: collageTemplate() },
    { id: 'brochure', name: 'Folleto', category: 'Marketing', doc: brochureTemplate() },
    { id: 'resume', name: 'Currículum', category: 'Documentos', doc: resumeTemplate() },
    { id: 'business-card', name: 'Tarjeta', category: 'Marketing', doc: businessCardTemplate() },
    { id: 'email', name: 'Correo', category: 'Marketing', doc: emailTemplate() },
    { id: 'document', name: 'Documento', category: 'Documentos', doc: documentTemplate() },
  ];
}

export function templateById(id) {
  const item = getTemplates().find((template) => template.id === id);
  return item ? deepClone(item.doc) : deepClone(starterDoc());
}
