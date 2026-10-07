export const project = {
  id: 'house-001',
  name: 'Négyfalú kísérleti ház',
  dimensions: { interiorWidth: 720, interiorDepth: 520, wallHeight: 300 },
  intent: {
    wallRole: 'external-load-bearing',
    construction: 'masonry',
    exteriorFinish: 'rendered',
    thermalGoal: 'low-energy',
  },
  resolution: {
    status: 'suggested',
    source: 'deterministic masonry rule v0.1',
  },
  openings: [{
    id: 'window-01',
    kind: 'window',
    wall: 'south',
    center: 0.52,
    width: 150,
    sill: 90,
    height: 150,
    installation: 'thermal-plane',
  }],
};

export function updateProject(patch) {
  if (patch.dimensions) Object.assign(project.dimensions, patch.dimensions);
  if (patch.opening) Object.assign(project.openings[0], patch.opening);
  if (patch.resolution) Object.assign(project.resolution, patch.resolution);
  window.dispatchEvent(new CustomEvent('gyuricad:model-changed'));
}
