import { project, updateProject, resetGraph } from './model.js';
import { wallGeometry, recognizeRooms, removeInteriorWall } from './graph-model.js';
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

let selectedWall = project.graph.opening.wallId;
const selectedEl = document.querySelector('[data-selected-wall]');
const wallLengthEl = document.querySelector('[data-wall-length]');
const openingWallEl = document.querySelector('[data-opening-wall]');
const widthInput = document.querySelector('[name="windowWidth"]');
const positionInput = document.querySelector('[name="windowPosition"]');
function syncControls() {
  const wall = project.graph.walls.find(item => item.id === selectedWall) || project.graph.walls[0];
  selectedWall = wall.id;
  selectedEl.textContent = wall.id;
  wallLengthEl.textContent = `${(wallGeometry(project.graph, wall).length / 100).toFixed(2)} m`;
  openingWallEl.textContent = project.graph.opening.wallId;
  document.querySelector('[data-room-count]').textContent = recognizeRooms(project.graph).length;
  document.querySelector('[data-delete-wall]').hidden = wall.role !== 'interior';
  document.querySelector('[data-assign-window]').disabled = wall.role === 'interior';
  widthInput.value = project.graph.opening.width;
  positionInput.value = Math.round(project.graph.opening.center * 100);
  document.querySelector('[data-window-width-value]').textContent = `${widthInput.value} cm`;
  document.querySelector('[data-window-position-value]').textContent = `${positionInput.value}%`;
}
const planView = createPlanView(document.querySelector('#plan-canvas'), project, assembly => {
  updateBadge(planBadge, assembly); renderResolutionState(assembly); renderLayers(assembly);
}, wall => { selectedWall = wall.id; syncControls(); }, message => { document.querySelector('[data-drawing-status]').textContent = message; });
createModelView(document.querySelector('#model-view'), project, assembly => {
  updateBadge(modelBadge, assembly);
  renderResolutionState(assembly);
  renderLayers(assembly);
});

wireRange('windowWidth', document.querySelector('[data-window-width-value]'),
  () => project.graph.opening.width, value => updateProject({ opening: { width: value } }));
wireRange('windowPosition', document.querySelector('[data-window-position-value]'),
  () => Math.round(project.graph.opening.center * 100),
  value => updateProject({ opening: { center: value / 100 } }), '%');
document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => {
  const tool = button.dataset.tool;
  planView.setTool(tool);
  document.querySelectorAll('[data-tool]').forEach(item => {
    item.setAttribute('aria-pressed', String(item.dataset.tool === tool));
    item.classList.toggle('secondary', item.dataset.tool !== tool);
  });
  document.querySelector('[data-drawing-status]').textContent = tool === 'wall'
    ? 'Kattints a kezdőpontra, majd a végpontra. Meglévő falhoz illesztéskor a fal kettéválik.'
    : 'Kattints egy falra, vagy húzd a sarokpontokat.';
}));
document.querySelector('[data-delete-wall]').addEventListener('click', () => {
  const graph = structuredClone(project.graph);
  if (removeInteriorWall(graph, selectedWall)) {
    selectedWall = graph.opening.wallId;
    updateProject({ graph }); planView.setSelected(selectedWall); syncControls();
  }
});
document.querySelector('[data-assign-window]').addEventListener('click', () => {
  updateProject({ opening: { wallId: selectedWall } }); syncControls();
});
document.querySelector('[data-reset-graph]').addEventListener('click', () => { resetGraph(); selectedWall = project.graph.opening.wallId; planView.setSelected(selectedWall); syncControls(); });
window.addEventListener('gyuricad:model-changed', syncControls);
acceptButton.addEventListener('click', () => {
  updateProject({ resolution: { status: 'confirmed', source: 'tervező által rögzítve' } });
});

document.querySelector('[data-reset]').addEventListener('click', () => {
  updateProject({ resolution: { status: 'suggested', source: 'deterministic masonry rule v0.1' } });
});
