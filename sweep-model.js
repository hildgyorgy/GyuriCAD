export const sweepRecipe = {
  id: 'sweep-001',
  operation: 'sweep',
  semantic: {
    kind: 'unclassified',
    label: 'Ismeretlen söpört elem',
    status: 'open',
  },
  profile: {
    unit: 'cm',
    closed: false,
    points: [
      { x: -20, y: 15 },
      { x: -20, y: 0 },
      { x: -12, y: -12 },
      { x: 12, y: -12 },
      { x: 20, y: 0 },
      { x: 20, y: 15 },
    ],
  },
  path: {
    unit: 'cm',
    points: [
      { x: -260, y: 120, z: -120 },
      { x: 40, y: 120, z: -120 },
      { x: 210, y: 120, z: 20 },
      { x: 210, y: 120, z: 190 },
    ],
  },
  appearance: {
    materialRole: 'unresolved-sheet',
    color: '#c66a43',
  },
  installation: {
    appliesWhen: 'gutter',
    supportType: 'gutter-bracket',
    supportSpacing: 90,
    firstSupportOffset: 25,
    status: 'suggested',
  },
};

export function changeSweep(mutator) {
  mutator(sweepRecipe);
  window.dispatchEvent(new CustomEvent('gyuricad:sweep-changed'));
}

export function classifySweep(kind) {
  changeSweep(recipe => {
    if (kind === 'gutter') {
      recipe.semantic = { kind: 'gutter', label: 'Fém ereszcsatorna', status: 'suggested' };
      recipe.appearance.materialRole = 'zinc-sheet';
      recipe.appearance.color = '#769398';
    } else {
      recipe.semantic = { kind: 'unclassified', label: 'Ismeretlen söpört elem', status: 'open' };
      recipe.appearance.materialRole = 'unresolved-sheet';
      recipe.appearance.color = '#c66a43';
    }
  });
}
