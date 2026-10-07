import { project, updateProject } from './model.js';
import { createPlanView } from './view2d.js';
import { createModelView } from './view3d.js';

const statusEl = document.querySelector('[data-resolution-status]');
const sourceEl = document.querySelector('[data-resolution-source]');
const acceptButton = document.querySelector('[data-accept]');
const layerList = document.querySelector('[data-layer-list]');
const junctionPanel = document.querySelector('[data-junction-panel]');
const junctionList = document.querySelector('[data-junction-list]');
const planBadge = document.querySelector('[data-plan-badge]');
const modelBadge = document.querySelector('[data-model-badge]');

function renderResolutionState(assembly) {
  statusEl.textContent = assembly.status === 'confirmed' ? 'Rögzített döntés' : 'Javasolt feloldás';
  statusEl.dataset.state = assembly.status;
  sourceEl.textContent = assembly.source;
  acceptButton.hidden = assembly.status === 'confirmed';
}

function renderLayers(assembly) {
  layerList.innerHTML = assembly.layers.map(layer => `
    <li>
      <span class="layer-swatch" style="--swatch:${layer.color}"></span>
      <span>${layer.name}</span>
      <strong>${layer.thickness.toFixed(1)} cm</strong>
    </li>
  `).join('');

  junctionPanel.hidden = !assembly.junction;
  if (assembly.junction) {
    const rule = assembly.junction;
    junctionList.innerHTML = `
      <li><span>Tok tengelye a belső síktól</span><strong>${rule.frameAxisFromInterior.toFixed(1)} cm</strong></li>
      <li><span>Hőszigetelés kávára fordulása</span><strong>${rule.insulationReturn.toFixed(1)} cm</strong></li>
      ${rule.seals.map(seal => `
        <li><span class="rule-swatch" style="--swatch:${seal.color}"></span><span>${seal.name}</span></li>
      `).join('')}
    `;
  }
}

function updateBadge(element, assembly) {
  element.querySelector('strong').textContent = assembly.level.label;
  element.querySelector('span').textContent = assembly.level.description;
}

function wireRange(name, valueElement, getter, setter, suffix = ' cm') {
  const input = document.querySelector(`[name="${name}"]`);
  const updateLabel = () => { valueElement.textContent = `${input.value}${suffix}`; };
  input.value = getter();
  updateLabel();
  input.addEventListener('input', () => {
    updateLabel();
    setter(Number(input.value));
  });
}

createPlanView(document.querySelector('#plan-canvas'), project, assembly => {
  updateBadge(planBadge, assembly);
  renderResolutionState(assembly);
  renderLayers(assembly);
});

createModelView(document.querySelector('#model-view'), project, assembly => {
  updateBadge(modelBadge, assembly);
  renderResolutionState(assembly);
  renderLayers(assembly);
});

wireRange('width', document.querySelector('[data-width-value]'),
  () => project.dimensions.interiorWidth,
  value => updateProject({ dimensions: { interiorWidth: value } }));
wireRange('depth', document.querySelector('[data-depth-value]'),
  () => project.dimensions.interiorDepth,
  value => updateProject({ dimensions: { interiorDepth: value } }));
wireRange('windowWidth', document.querySelector('[data-window-width-value]'),
  () => project.openings[0].width,
  value => updateProject({ opening: { width: value } }));
wireRange('windowPosition', document.querySelector('[data-window-position-value]'),
  () => Math.round(project.openings[0].center * 100),
  value => updateProject({ opening: { center: value / 100 } }), '%');

acceptButton.addEventListener('click', () => {
  updateProject({ resolution: { status: 'confirmed', source: 'tervező által rögzítve' } });
});

document.querySelector('[data-reset]').addEventListener('click', () => {
  updateProject({ resolution: { status: 'suggested', source: 'deterministic masonry rule v0.1' } });
});
