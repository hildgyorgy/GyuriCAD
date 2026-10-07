import { initialGraph, validGraph } from './graph-model.js';
const key = 'gyuricad:house-graph-v1';
const initial = initialGraph();
function storedGraph() { try { const value = JSON.parse(localStorage.getItem(key)); if (validGraph(value)) return value; } catch {} return initialGraph(); }
export const project = {
  id: 'house-001', name: 'Szerkeszthető kísérleti ház',
  graph: storedGraph(),
  dimensions: { wallHeight: 300 },
  intent: { wallRole: 'external-load-bearing', construction: 'masonry', exteriorFinish: 'rendered', thermalGoal: 'low-energy' },
  resolution: { status: 'suggested', source: 'deterministic masonry rule v0.1' },
};
export function updateProject(patch) {
  if (patch.graph) project.graph = patch.graph;
  if (patch.dimensions) Object.assign(project.dimensions, patch.dimensions);
  if (patch.opening) Object.assign(project.graph.opening, patch.opening);
  if (patch.resolution) Object.assign(project.resolution, patch.resolution);
  localStorage.setItem(key, JSON.stringify(project.graph));
  window.dispatchEvent(new CustomEvent('gyuricad:model-changed'));
}
export function resetGraph() { updateProject({ graph: initialGraph() }); }
window.addEventListener('storage', event => {
  if (event.key !== key || !event.newValue) return;
  try {
    const graph = JSON.parse(event.newValue);
    if (validGraph(graph)) { project.graph = graph; window.dispatchEvent(new CustomEvent('gyuricad:model-changed')); }
  } catch {}
});
