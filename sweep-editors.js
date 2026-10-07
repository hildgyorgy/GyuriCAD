import { changeSweep } from './sweep-model.js';

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  return { ctx, resize };
}

function drawBackground(ctx, width, height) {
  ctx.fillStyle = '#f3f0e8';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(31, 42, 41, .08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 20; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
  for (let y = 20; y < height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
  ctx.stroke();
}

export function createProfileEditor(canvas, recipe) {
  const { ctx, resize } = setupCanvas(canvas);
  let active = -1;

  const transform = () => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 90, rect.height / 75);
    return {
      toScreen: point => ({ x: rect.width / 2 + point.x * scale, y: rect.height / 2 - point.y * scale }),
      toWorld: point => ({ x: (point.x - rect.width / 2) / scale, y: -(point.y - rect.height / 2) / scale }),
    };
  };

  function draw() {
    resize();
    const rect = canvas.getBoundingClientRect();
    drawBackground(ctx, rect.width, rect.height);
    const { toScreen } = transform();
    const origin = toScreen({ x: 0, y: 0 });
    ctx.strokeStyle = 'rgba(31, 42, 41, .28)';
    ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(rect.width, origin.y); ctx.stroke();

    const points = recipe.profile.points.map(toScreen);
    ctx.strokeStyle = '#c45e3d';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();

    points.forEach((point, index) => {
      ctx.fillStyle = index === active ? '#1f2a29' : '#f7f4ec';
      ctx.strokeStyle = '#1f2a29';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }

  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const { toScreen } = transform();
    active = recipe.profile.points.findIndex(point => {
      const screen = toScreen(point);
      return Math.hypot(screen.x - position.x, screen.y - position.y) < 14;
    });
    if (active >= 0) canvas.setPointerCapture(event.pointerId);
    draw();
  });

  canvas.addEventListener('pointermove', event => {
    if (active < 0) return;
    const rect = canvas.getBoundingClientRect();
    const { toWorld } = transform();
    const next = toWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    changeSweep(model => {
      model.profile.points[active].x = Math.round(Math.max(-38, Math.min(38, next.x)));
      model.profile.points[active].y = Math.round(Math.max(-28, Math.min(28, next.y)));
    });
  });
  canvas.addEventListener('pointerup', () => { active = -1; draw(); });
  canvas.addEventListener('pointercancel', () => { active = -1; draw(); });
  window.addEventListener('resize', draw);
  window.addEventListener('gyuricad:sweep-changed', draw);
  draw();
}

export function createPathEditor(canvas, recipe) {
  const { ctx, resize } = setupCanvas(canvas);
  let active = -1;

  const transform = () => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 620, rect.height / 430);
    return {
      toScreen: point => ({ x: rect.width / 2 + point.x * scale, y: rect.height / 2 + point.z * scale }),
      toWorld: point => ({ x: (point.x - rect.width / 2) / scale, z: (point.y - rect.height / 2) / scale }),
    };
  };

  function draw() {
    resize();
    const rect = canvas.getBoundingClientRect();
    drawBackground(ctx, rect.width, rect.height);
    const { toScreen } = transform();
    const points = recipe.path.points.map(toScreen);

    ctx.strokeStyle = '#536766';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();

    points.forEach((point, index) => {
      ctx.fillStyle = index === active ? '#c45e3d' : '#f7f4ec';
      ctx.strokeStyle = '#1f2a29';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f2a29';
      ctx.font = '11px system-ui';
      ctx.fillText(String(index + 1), point.x + 11, point.y - 10);
    });
  }

  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const { toScreen } = transform();
    active = recipe.path.points.findIndex(point => {
      const screen = toScreen(point);
      return Math.hypot(screen.x - position.x, screen.y - position.y) < 16;
    });
    if (active >= 0) canvas.setPointerCapture(event.pointerId);
    draw();
  });

  canvas.addEventListener('pointermove', event => {
    if (active < 0) return;
    const rect = canvas.getBoundingClientRect();
    const { toWorld } = transform();
    const next = toWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    changeSweep(model => {
      model.path.points[active].x = Math.round(Math.max(-300, Math.min(300, next.x)) / 5) * 5;
      model.path.points[active].z = Math.round(Math.max(-200, Math.min(200, next.z)) / 5) * 5;
    });
  });
  canvas.addEventListener('pointerup', () => { active = -1; draw(); });
  canvas.addEventListener('pointercancel', () => { active = -1; draw(); });
  window.addEventListener('resize', draw);
  window.addEventListener('gyuricad:sweep-changed', draw);
  draw();
}
