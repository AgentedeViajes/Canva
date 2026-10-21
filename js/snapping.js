import { selectionBounds } from './model.js';

/**
 * Collect candidate alignment coordinates from the page and from every
 * non-excluded element. Both edges and centers participate, mirroring the
 * alignment guides observed in Canva's editor.
 */
export function snapTargets(doc, excludeIds = []) {
  const exclude = new Set(excludeIds);
  const xs = [
    { pos: 0, kind: 'page-edge', label: 'Borde izquierdo' },
    { pos: doc.width / 2, kind: 'page-center', label: 'Centro horizontal' },
    { pos: doc.width, kind: 'page-edge', label: 'Borde derecho' },
  ];
  const ys = [
    { pos: 0, kind: 'page-edge', label: 'Borde superior' },
    { pos: doc.height / 2, kind: 'page-center', label: 'Centro vertical' },
    { pos: doc.height, kind: 'page-edge', label: 'Borde inferior' },
  ];
  for (const el of doc.elements) {
    if (el.hidden || exclude.has(el.id)) continue;
    const b = selectionBounds([el]);
    if (!b) continue;
    xs.push(
      { pos: b.x, kind: 'element-edge', id: el.id },
      { pos: b.x + b.w / 2, kind: 'element-center', id: el.id },
      { pos: b.x + b.w, kind: 'element-edge', id: el.id },
    );
    ys.push(
      { pos: b.y, kind: 'element-edge', id: el.id },
      { pos: b.y + b.h / 2, kind: 'element-center', id: el.id },
      { pos: b.y + b.h, kind: 'element-edge', id: el.id },
    );
  }
  return { xs, ys };
}

function bestDelta(edges, targets, threshold) {
  let best = null;
  for (const edge of edges) {
    for (const target of targets) {
      const delta = target.pos - edge.pos;
      const distance = Math.abs(delta);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { delta, distance, target, edge };
      }
    }
  }
  return best;
}

/**
 * Snap a moving rectangle. Returns the correction to apply plus guides.
 * `threshold` is in document pixels; callers usually pass 6 / zoom.
 */
export function calculateSnap(rect, doc, excludeIds, threshold = 6) {
  const { xs, ys } = snapTargets(doc, excludeIds);
  const xEdges = [
    { pos: rect.x, name: 'left' },
    { pos: rect.x + rect.w / 2, name: 'center' },
    { pos: rect.x + rect.w, name: 'right' },
  ];
  const yEdges = [
    { pos: rect.y, name: 'top' },
    { pos: rect.y + rect.h / 2, name: 'middle' },
    { pos: rect.y + rect.h, name: 'bottom' },
  ];
  const bx = bestDelta(xEdges, xs, threshold);
  const by = bestDelta(yEdges, ys, threshold);
  const guides = [];
  if (bx) guides.push({ axis: 'x', pos: bx.target.pos, kind: bx.target.kind });
  if (by) guides.push({ axis: 'y', pos: by.target.pos, kind: by.target.kind });
  return {
    dx: bx ? bx.delta : 0,
    dy: by ? by.delta : 0,
    guides,
    snappedX: Boolean(bx),
    snappedY: Boolean(by),
  };
}

export function snapCoordinate(value, axis, doc, excludeIds, threshold = 6) {
  const { xs, ys } = snapTargets(doc, excludeIds);
  const targets = axis === 'x' ? xs : ys;
  let best = null;
  for (const target of targets) {
    const distance = Math.abs(target.pos - value);
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { pos: target.pos, distance, target };
    }
  }
  return best ? best.pos : value;
}
