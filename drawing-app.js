import { project, updateProject } from './model.js';
import { buildPlanScene } from './drawing-scene.js';

const paper = document.querySelector('[data-paper]');
const scaleSelect = document.querySelector('[name="scale"]');
const detailSelect = document.querySelector('[name="detail"]');
const dimensionsInput = document.querySelector('[name="dimensions"]');
const sceneStats = document.querySelector('[data-scene-stats]');
let currentSvg = '';

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function renderElement(element) {
  const style = escapeXml(element.style || '');
  if (element.type === 'rect') {
    return `<rect class="${style}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}"/>`;
  }
  if (element.type === 'line') {
    return `<line class="${style}" x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}"/>`;
  }
  if (element.type === 'text') {
    return `<text class="${style}" x="${element.x}" y="${element.y}" text-anchor="${element.anchor || 'start'}">${escapeXml(element.text)}</text>`;
  }
  if (element.type === 'dimension-horizontal') {
    const tick = 1.5;
    return `<g class="dimension">
      <line x1="${element.x1}" y1="${element.objectY}" x2="${element.x1}" y2="${element.y + 2}"/>
      <line x1="${element.x2}" y1="${element.objectY}" x2="${element.x2}" y2="${element.y + 2}"/>
      <line x1="${element.x1}" y1="${element.y}" x2="${element.x2}" y2="${element.y}"/>
      <line x1="${element.x1 - tick}" y1="${element.y + tick}" x2="${element.x1 + tick}" y2="${element.y - tick}"/>
      <line x1="${element.x2 - tick}" y1="${element.y + tick}" x2="${element.x2 + tick}" y2="${element.y - tick}"/>
      <text x="${(element.x1 + element.x2) / 2}" y="${element.y - 1.2}" text-anchor="middle">${escapeXml(element.text)}</text>
    </g>`;
  }
  if (element.type === 'dimension-vertical') {
    const tick = 1.5;
    return `<g class="dimension">
      <line x1="${element.objectX}" y1="${element.y1}" x2="${element.x + 2}" y2="${element.y1}"/>
      <line x1="${element.objectX}" y1="${element.y2}" x2="${element.x + 2}" y2="${element.y2}"/>
      <line x1="${element.x}" y1="${element.y1}" x2="${element.x}" y2="${element.y2}"/>
      <line x1="${element.x - tick}" y1="${element.y1 + tick}" x2="${element.x + tick}" y2="${element.y1 - tick}"/>
      <line x1="${element.x - tick}" y1="${element.y2 + tick}" x2="${element.x + tick}" y2="${element.y2 - tick}"/>
      <text x="${element.x - 1.3}" y="${(element.y1 + element.y2) / 2}" text-anchor="middle" transform="rotate(-90 ${element.x - 1.3} ${(element.y1 + element.y2) / 2})">${escapeXml(element.text)}</text>
    </g>`;
  }
  if (element.type === 'north-arrow') {
    return `<g class="north-arrow" transform="translate(${element.x} ${element.y})">
      <path d="M 0 9 L 0 -9 M -3 -3 L 0 -9 L 3 -3"/>
      <text x="0" y="14" text-anchor="middle">N</text>
    </g>`;
  }
  return '';
}

function sceneToSvg(scene) {
  const { width, height } = scene.paper;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" role="img" aria-label="GyuriCAD A3 alaprajz">
    <defs>
      <pattern id="insulation" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M0 2 Q1 0 2 2 T4 2" fill="none" stroke="#6d7471" stroke-width="0.18"/>
      </pattern>
      <pattern id="secondary" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="#8d9390" stroke-width="0.16"/>
      </pattern>
      <style>
        .sheet { fill:#fff; stroke:#1f2927; stroke-width:.25; }
        .cut-structure { fill:#4d5552; stroke:#151b1a; stroke-width:.35; }
        .cut-insulation { fill:url(#insulation); stroke:#303937; stroke-width:.25; }
        .cut-finish { fill:#f5f3ed; stroke:#303937; stroke-width:.18; }
        .cut-secondary { fill:url(#secondary); stroke:#303937; stroke-width:.22; }
        .room-boundary { fill:none; stroke:#7b8481; stroke-width:.13; }
        .window { stroke:#306876; stroke-width:.25; fill:none; }
        .dimension { stroke:#2a3331; stroke-width:.18; fill:none; }
        .dimension text { stroke:none; fill:#1f2927; font:2.5px Arial, sans-serif; }
        .room-name { fill:#1f2927; font:bold 3.2px Arial, sans-serif; letter-spacing:.3px; }
        .room-data { fill:#4f5956; font:2.5px Arial, sans-serif; }
        .title-line { stroke:#1f2927; stroke-width:.35; }
        .title-primary { fill:#1f2927; font:bold 3.4px Arial, sans-serif; }
        .title-secondary { fill:#4f5956; font:2.5px Arial, sans-serif; }
        .north-arrow { stroke:#1f2927; stroke-width:.3; fill:none; }
        .north-arrow text { stroke:none; fill:#1f2927; font:bold 3px Arial, sans-serif; }
      </style>
    </defs>
    <rect class="sheet" x=".5" y=".5" width="${width - 1}" height="${height - 1}"/>
    ${scene.elements.map(renderElement).join('\n')}
  </svg>`;
}

function options() {
  return {
    scale: Number(scaleSelect.value),
    detail: detailSelect.value,
    dimensions: dimensionsInput.checked,
  };
}

function render() {
  const scene = buildPlanScene(project, options());
  currentSvg = sceneToSvg(scene);
  paper.innerHTML = currentSvg;
  sceneStats.textContent = `${scene.elements.length} vektoros rajzi elem · A3 fekvő · M 1:${scene.scale}`;
}

function wireRange(name, output, getter, setter, suffix = ' cm') {
  const input = document.querySelector(`[name="${name}"]`);
  input.value = getter();
  const show = () => { output.textContent = `${input.value}${suffix}`; };
  show();
  input.addEventListener('input', () => { show(); setter(Number(input.value)); });
}

scaleSelect.addEventListener('change', render);
detailSelect.addEventListener('change', render);
dimensionsInput.addEventListener('change', render);
window.addEventListener('gyuricad:model-changed', render);

wireRange('drawingWidth', document.querySelector('[data-width-value]'),
  () => project.dimensions.interiorWidth,
  value => updateProject({ dimensions: { interiorWidth: value } }));
wireRange('drawingDepth', document.querySelector('[data-depth-value]'),
  () => project.dimensions.interiorDepth,
  value => updateProject({ dimensions: { interiorDepth: value } }));
wireRange('drawingWindow', document.querySelector('[data-window-value]'),
  () => project.openings[0].width,
  value => updateProject({ opening: { width: value } }));

document.querySelector('[data-download-svg]').addEventListener('click', () => {
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${currentSvg}`], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gyuricad-alaprajz-1-${scaleSelect.value}.svg`;
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector('[data-print]').addEventListener('click', () => window.print());
render();
