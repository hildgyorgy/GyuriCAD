const DETAIL_LEVELS = {
  intent: { key: 'intent', label: 'Tér', description: 'A modell csak a térbeli szándékot mutatja.' },
  system: { key: 'system', label: 'Szerkezet', description: 'A teherhordó mag és a termikus burok különválik.' },
  resolved: { key: 'resolved', label: 'Rétegrend', description: 'A javasolt szerkezet minden ismert rétege megjelenik.' },
  junction: { key: 'junction', label: 'Csomópont', description: 'A nyílás körül megjelennek a beépítés kapcsolati szabályai.' },
};

const RESOLVED_LAYERS = [
  { id: 'interior-plaster', name: 'Belső vakolat', role: 'interior-finish', thickness: 1.5, color: '#e8dfd4' },
  { id: 'ceramic-core', name: 'Vázkerámia', role: 'structure', thickness: 30, color: '#bd5232' },
  { id: 'adhesive', name: 'Kiegyenlítés / ragasztó', role: 'bond', thickness: 1, color: '#a9a69f' },
  { id: 'mineral-wool', name: 'Ásványgyapot', role: 'insulation', thickness: 10, color: '#e5b94e' },
  { id: 'base-render', name: 'Hálózott alapvakolat', role: 'exterior-finish', thickness: 0.7, color: '#d8d0c3' },
  { id: 'finish-render', name: 'Színvakolat', role: 'exterior-finish', thickness: 0.3, color: '#f2eee6' },
];

const sumThickness = layers => layers.reduce((sum, layer) => sum + layer.thickness, 0);

const WINDOW_JUNCTION = {
  id: 'window-installation-01',
  status: 'suggested',
  frameDepth: 8,
  frameFace: 7,
  frameAxisFromInterior: 33.5,
  insulationReturn: 3,
  exteriorSillProjection: 4,
  interiorBoardProjection: 3,
  seals: [
    { id: 'inside-seal', name: 'Belső lég- és párazáró csatlakozás', color: '#d05d4d' },
    { id: 'middle-joint', name: 'Hő- és hangszigetelt szerelési hézag', color: '#d7b949' },
    { id: 'outside-seal', name: 'Külső csapóesőálló, páraáteresztő zárás', color: '#4a8da1' },
  ],
};

export function resolveAssembly(project, level) {
  const resolvedThickness = sumThickness(RESOLVED_LAYERS);
  let layers;

  if (level === 'intent') {
    layers = [{ id: 'wall-intent', name: 'Külső teherhordó fal', role: 'intent', thickness: resolvedThickness, color: '#56605f' }];
  } else if (level === 'system') {
    const structure = RESOLVED_LAYERS.slice(0, 2);
    const envelope = RESOLVED_LAYERS.slice(2);
    layers = [
      { id: 'structural-system', name: 'Belső felület + szerkezeti mag', role: 'structure', thickness: sumThickness(structure), color: '#bd5232' },
      { id: 'thermal-envelope', name: 'Termikus burok + külső felület', role: 'insulation', thickness: sumThickness(envelope), color: '#e5b94e' },
    ];
  } else {
    layers = RESOLVED_LAYERS.map(layer => ({ ...layer }));
  }

  let offset = 0;
  const positionedLayers = layers.map(layer => {
    const positioned = { ...layer, innerOffset: offset, outerOffset: offset + layer.thickness };
    offset += layer.thickness;
    return positioned;
  });

  return {
    level: DETAIL_LEVELS[level],
    status: project.resolution.status,
    source: project.resolution.source,
    totalThickness: resolvedThickness,
    layers: positionedLayers,
    openings: project.openings.map(opening => ({ ...opening })),
    junction: level === 'junction' ? structuredClone(WINDOW_JUNCTION) : null,
  };
}

export function detailFrom2DZoom(zoom) {
  if (zoom < 0.9) return 'intent';
  if (zoom < 2.15) return 'system';
  if (zoom < 3.25) return 'resolved';
  return 'junction';
}

export function detailFromCameraDistance(distance) {
  if (distance > 1250) return 'intent';
  if (distance > 700) return 'system';
  if (distance > 500) return 'resolved';
  return 'junction';
}
