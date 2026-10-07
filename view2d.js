import { detailFrom2DZoom, resolveAssembly } from './resolver.js';

export function createPlanView(canvas, project, onDetailChange) {
  const ctx = canvas.getContext('2d');
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  let dragging = false;
  let lastPointer = null;
  let currentDetail = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function worldToScreen(x, y, width, height) {
    const scale = 0.62 * zoom;
    return { x: width / 2 + pan.x + x * scale, y: height / 2 + pan.y + y * scale };
  }

  function drawRing(layer, width, depth, opening, viewportWidth, viewportHeight) {
    const inner = layer.innerOffset;
    const outer = layer.outerOffset;
    const outerLeft = -width / 2 - outer;
    const outerRight = width / 2 + outer;
    const outerTop = -depth / 2 - outer;
    const outerBottom = depth / 2 + outer;
    const innerLeft = -width / 2 - inner;
    const innerRight = width / 2 + inner;
    const innerTop = -depth / 2 - inner;
    const innerBottom = depth / 2 + inner;
    ctx.fillStyle = layer.color;

    const fillWorldRect = (x1, y1, x2, y2) => {
      const a = worldToScreen(x1, y1, viewportWidth, viewportHeight);
      const b = worldToScreen(x2, y2, viewportWidth, viewportHeight);
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    };

    fillWorldRect(outerLeft, outerTop, outerRight, innerTop);
    fillWorldRect(outerLeft, innerTop, innerLeft, innerBottom);
    fillWorldRect(innerRight, innerTop, outerRight, innerBottom);

    if (opening?.wall === 'south') {
      const centerX = -width / 2 + opening.center * width;
      const openingLeft = centerX - opening.width / 2;
      const openingRight = centerX + opening.width / 2;
      fillWorldRect(outerLeft, innerBottom, openingLeft, outerBottom);
      fillWorldRect(openingRight, innerBottom, outerRight, outerBottom);
    } else {
      fillWorldRect(outerLeft, innerBottom, outerRight, outerBottom);
    }
  }

  function drawWindow(opening, assembly, width, depth, viewportWidth, viewportHeight) {
    const centerX = -width / 2 + opening.center * width;
    const x1 = centerX - opening.width / 2;
    const x2 = centerX + opening.width / 2;
    const total = assembly.totalThickness;
    const inside = worldToScreen(x1, depth / 2, viewportWidth, viewportHeight);
    const outside = worldToScreen(x2, depth / 2 + total, viewportWidth, viewportHeight);

    ctx.save();
    ctx.strokeStyle = '#d9f1f2';
    ctx.lineWidth = 1.2;
    if (assembly.level.key === 'intent') {
      ctx.strokeRect(inside.x, inside.y, outside.x - inside.x, outside.y - inside.y);
    } else {
      const y1 = worldToScreen(0, depth / 2 + total * 0.48, viewportWidth, viewportHeight).y;
      const y2 = worldToScreen(0, depth / 2 + total * 0.56, viewportWidth, viewportHeight).y;
      ctx.beginPath();
      ctx.moveTo(inside.x, y1); ctx.lineTo(outside.x, y1);
      ctx.moveTo(inside.x, y2); ctx.lineTo(outside.x, y2);
      ctx.stroke();
    }

    if (['resolved', 'junction'].includes(assembly.level.key)) {
      const frameDepth = 8 * 0.62 * zoom;
      const frameWidth = 7 * 0.62 * zoom;
      const frameAxis = assembly.junction?.frameAxisFromInterior ?? 24;
      const frameY = worldToScreen(0, depth / 2 + frameAxis, viewportWidth, viewportHeight).y;
      ctx.fillStyle = '#f4f2ec';
      ctx.strokeStyle = '#28302f';
      ctx.fillRect(inside.x, frameY, frameWidth, frameDepth);
      ctx.strokeRect(inside.x, frameY, frameWidth, frameDepth);
      ctx.fillRect(outside.x - frameWidth, frameY, frameWidth, frameDepth);
      ctx.strokeRect(outside.x - frameWidth, frameY, frameWidth, frameDepth);

      const sillY = worldToScreen(0, depth / 2 + total + 3, viewportWidth, viewportHeight).y;
      ctx.strokeStyle = '#9aa9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(inside.x - 6, sillY);
      ctx.lineTo(outside.x + 6, sillY);
      ctx.stroke();

      if (assembly.level.key === 'junction') {
        const rule = assembly.junction;
        const scale = 0.62 * zoom;
        const returnDepth = Math.max(3, rule.insulationReturn * scale);
        const exteriorY = worldToScreen(0, depth / 2 + total, viewportWidth, viewportHeight).y;
        const frameOuterY = frameY + frameDepth;

        ctx.fillStyle = '#e5b94e';
        ctx.fillRect(inside.x, Math.min(frameOuterY, exteriorY), returnDepth, Math.abs(exteriorY - frameOuterY));
        ctx.fillRect(outside.x - returnDepth, Math.min(frameOuterY, exteriorY), returnDepth, Math.abs(exteriorY - frameOuterY));

        const sealPositions = [frameY - 2, frameY + frameDepth / 2, frameY + frameDepth + 2];
        rule.seals.forEach((seal, index) => {
          ctx.strokeStyle = seal.color;
          ctx.lineWidth = Math.max(1.4, 0.8 * zoom);
          ctx.beginPath();
          ctx.moveTo(inside.x - 4, sealPositions[index]);
          ctx.lineTo(inside.x + frameWidth + 4, sealPositions[index]);
          ctx.moveTo(outside.x - frameWidth - 4, sealPositions[index]);
          ctx.lineTo(outside.x + 4, sealPositions[index]);
          ctx.stroke();
        });

        ctx.fillStyle = '#28302f';
        const anchorSize = Math.max(2, 1.2 * zoom);
        ctx.fillRect(inside.x + frameWidth + 3, frameY + frameDepth / 2 - anchorSize / 2, anchorSize * 2.2, anchorSize);
        ctx.fillRect(outside.x - frameWidth - 3 - anchorSize * 2.2, frameY + frameDepth / 2 - anchorSize / 2, anchorSize * 2.2, anchorSize);
      }
    }
    ctx.restore();
  }

  function drawGrid(width, height) {
    const spacing = Math.max(24, 62 * zoom);
    ctx.strokeStyle = 'rgba(34, 47, 46, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (width / 2 + pan.x) % spacing; x < width; x += spacing) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = (height / 2 + pan.y) % spacing; y < height; y += spacing) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f3f0e8';
    ctx.fillRect(0, 0, width, height);
    drawGrid(width, height);

    const detail = detailFrom2DZoom(zoom);
    const assembly = resolveAssembly(project, detail);
    if (detail !== currentDetail) {
      currentDetail = detail;
      onDetailChange(assembly);
    }

    const { interiorWidth, interiorDepth } = project.dimensions;
    const opening = project.openings[0];
    assembly.layers.slice().reverse().forEach(layer => {
      drawRing(layer, interiorWidth, interiorDepth, opening, width, height);
    });
    drawWindow(opening, assembly, interiorWidth, interiorDepth, width, height);

    ctx.strokeStyle = 'rgba(31, 42, 41, 0.35)';
    ctx.lineWidth = 1;
    const roomA = worldToScreen(-interiorWidth / 2, -interiorDepth / 2, width, height);
    const roomB = worldToScreen(interiorWidth / 2, interiorDepth / 2, width, height);
    ctx.strokeRect(roomA.x, roomA.y, roomB.x - roomA.x, roomB.y - roomA.y);
  }

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = Math.min(5.2, Math.max(0.48, zoom * (event.deltaY < 0 ? 1.12 : 0.89)));
    draw();
  }, { passive: false });

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    pan.x += event.clientX - lastPointer.x;
    pan.y += event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  window.addEventListener('resize', resize);
  window.addEventListener('gyuricad:model-changed', draw);
  resize();
  return { redraw: draw };
}
