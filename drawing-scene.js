import { resolveAssembly } from './resolver.js';

const PAPER = { width: 420, height: 297, margin: 12, titleHeight: 27 };

function styleForLayer(layer) {
  if (layer.role === 'structure') return 'cut-structure';
  if (layer.role === 'insulation') return 'cut-insulation';
  if (layer.role.includes('finish')) return 'cut-finish';
  return 'cut-secondary';
}

export function buildPlanScene(project, options) {
  const scale = Number(options.scale);
  const assembly = resolveAssembly(project, options.detail);
  const factor = 10 / scale;
  const { interiorWidth: width, interiorDepth: depth } = project.dimensions;
  const total = assembly.totalThickness;
  const outerWidth = width + total * 2;
  const outerDepth = depth + total * 2;
  const drawingAreaHeight = PAPER.height - PAPER.titleHeight;
  const origin = { x: PAPER.width / 2, y: drawingAreaHeight / 2 - 2 };
  const elements = [];

  const point = (x, y) => ({ x: origin.x + x * factor, y: origin.y + y * factor });
  const rect = (x1, y1, x2, y2, style) => {
    const a = point(x1, y1);
    const b = point(x2, y2);
    elements.push({ type: 'rect', x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, style });
  };

  const opening = project.openings[0];
  const openingCenter = -width / 2 + opening.center * width;
  const openingLeft = openingCenter - opening.width / 2;
  const openingRight = openingCenter + opening.width / 2;

  assembly.layers.forEach(layer => {
    const inner = layer.innerOffset;
    const outer = layer.outerOffset;
    const style = styleForLayer(layer);
    const outerLeft = -width / 2 - outer;
    const outerRight = width / 2 + outer;
    const outerTop = -depth / 2 - outer;
    const outerBottom = depth / 2 + outer;
    const innerLeft = -width / 2 - inner;
    const innerRight = width / 2 + inner;
    const innerTop = -depth / 2 - inner;
    const innerBottom = depth / 2 + inner;

    rect(outerLeft, outerTop, outerRight, innerTop, style);
    rect(outerLeft, innerTop, innerLeft, innerBottom, style);
    rect(innerRight, innerTop, outerRight, innerBottom, style);
    rect(outerLeft, innerBottom, openingLeft, outerBottom, style);
    rect(openingRight, innerBottom, outerRight, outerBottom, style);
  });

  const roomA = point(-width / 2, -depth / 2);
  const roomB = point(width / 2, depth / 2);
  elements.push({ type: 'rect', x: roomA.x, y: roomA.y, width: roomB.x - roomA.x, height: roomB.y - roomA.y, style: 'room-boundary' });

  const glassY1 = point(0, depth / 2 + total * 0.48).y;
  const glassY2 = point(0, depth / 2 + total * 0.56).y;
  const windowX1 = point(openingLeft, 0).x;
  const windowX2 = point(openingRight, 0).x;
  elements.push({ type: 'line', x1: windowX1, y1: glassY1, x2: windowX2, y2: glassY1, style: 'window' });
  elements.push({ type: 'line', x1: windowX1, y1: glassY2, x2: windowX2, y2: glassY2, style: 'window' });

  elements.push({ type: 'text', x: origin.x, y: origin.y - 2, text: 'KÍSÉRLETI TÉR', style: 'room-name', anchor: 'middle' });
  elements.push({ type: 'text', x: origin.x, y: origin.y + 3, text: `${(width * depth / 10000).toFixed(2)} m²`, style: 'room-data', anchor: 'middle' });

  if (options.dimensions) {
    const outerLeft = point(-width / 2 - total, 0).x;
    const outerRight = point(width / 2 + total, 0).x;
    const outerTop = point(0, -depth / 2 - total).y;
    const outerBottom = point(0, depth / 2 + total).y;
    const dimY = outerBottom + 10;
    const dimX = outerRight + 10;
    elements.push({ type: 'dimension-horizontal', x1: outerLeft, x2: outerRight, objectY: outerBottom, y: dimY, text: String(Math.round(outerWidth)) });
    elements.push({ type: 'dimension-vertical', y1: outerTop, y2: outerBottom, objectX: outerRight, x: dimX, text: String(Math.round(outerDepth)) });

    const openingDimY = outerBottom + 4.5;
    elements.push({ type: 'dimension-horizontal', x1: windowX1, x2: windowX2, objectY: outerBottom, y: openingDimY, text: String(Math.round(opening.width)) });
  }

  elements.push({ type: 'north-arrow', x: PAPER.width - 25, y: 28 });

  const titleY = PAPER.height - PAPER.titleHeight;
  elements.push({ type: 'line', x1: PAPER.margin, y1: titleY, x2: PAPER.width - PAPER.margin, y2: titleY, style: 'title-line' });
  elements.push({ type: 'text', x: PAPER.margin, y: titleY + 7, text: 'GyuriCAD — Kísérlet 03', style: 'title-primary' });
  elements.push({ type: 'text', x: PAPER.margin, y: titleY + 15, text: 'Földszinti alaprajz', style: 'title-secondary' });
  elements.push({ type: 'text', x: PAPER.width - 78, y: titleY + 7, text: `M 1:${scale}`, style: 'title-primary' });
  elements.push({ type: 'text', x: PAPER.width - 78, y: titleY + 15, text: options.detail === 'resolved' ? 'Rétegrendi feloldás' : 'Szerkezeti feloldás', style: 'title-secondary' });
  elements.push({ type: 'text', x: PAPER.width - 25, y: titleY + 15, text: 'A3', style: 'title-secondary' });

  return {
    paper: PAPER,
    scale,
    modelRevision: 'prototype-live',
    elements,
  };
}
