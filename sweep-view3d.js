import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DETAIL_LEVELS = {
  intent: { key: 'intent', label: 'Szándék', description: 'Csak a tervezett vezetési útvonal látszik.' },
  form: { key: 'form', label: 'Forma', description: 'A profil az útvonal mentén felületté válik.' },
  construction: { key: 'construction', label: 'Szerkezet', description: 'Megjelennek a profilszelvények és az illesztési helyek.' },
  installation: { key: 'installation', label: 'Beépítés', description: 'A tartóvasak kiosztási szabályból generálódnak.' },
};

function detailFromDistance(distance) {
  if (distance > 1180) return 'intent';
  if (distance > 760) return 'form';
  if (distance > 430) return 'construction';
  return 'installation';
}

function frameAt(recipe, pathIndex) {
  const path = recipe.path.points;
  const previous = path[Math.max(0, pathIndex - 1)];
  const next = path[Math.min(path.length - 1, pathIndex + 1)];
  let tx = next.x - previous.x;
  let tz = next.z - previous.z;
  const horizontalLength = Math.hypot(tx, tz) || 1;
  tx /= horizontalLength;
  tz /= horizontalLength;
  return { normalX: -tz, normalZ: tx };
}

function profilePointToWorld(pathPoint, frame, profilePoint) {
  return new THREE.Vector3(
    pathPoint.x + frame.normalX * profilePoint.x,
    pathPoint.y + profilePoint.y,
    pathPoint.z + frame.normalZ * profilePoint.x,
  );
}

function makeSweepGeometry(recipe) {
  const profile = recipe.profile.points;
  const path = recipe.path.points;
  const vertices = [];
  const indices = [];

  path.forEach((point, pathIndex) => {
    const frame = frameAt(recipe, pathIndex);
    profile.forEach(profilePoint => {
      const vertex = profilePointToWorld(point, frame, profilePoint);
      vertices.push(vertex.x, vertex.y, vertex.z);
    });
  });

  const profileSegments = recipe.profile.closed ? profile.length : profile.length - 1;
  for (let ring = 0; ring < path.length - 1; ring += 1) {
    for (let segment = 0; segment < profileSegments; segment += 1) {
      const nextSegment = (segment + 1) % profile.length;
      const a = ring * profile.length + segment;
      const b = ring * profile.length + nextSegment;
      const c = (ring + 1) * profile.length + nextSegment;
      const d = (ring + 1) * profile.length + segment;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function samplePath(recipe, distanceAlongPath) {
  const points = recipe.path.points;
  let remaining = distanceAlongPath;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
    if (remaining <= length) {
      const factor = length ? remaining / length : 0;
      const tangent = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z).normalize();
      const horizontal = new THREE.Vector2(tangent.x, tangent.z).normalize();
      return {
        point: new THREE.Vector3(
          THREE.MathUtils.lerp(start.x, end.x, factor),
          THREE.MathUtils.lerp(start.y, end.y, factor),
          THREE.MathUtils.lerp(start.z, end.z, factor),
        ),
        normal: new THREE.Vector3(-horizontal.y, 0, horizontal.x),
      };
    }
    remaining -= length;
  }
  return null;
}

function pathLength(recipe) {
  return recipe.path.points.slice(1).reduce((total, point, index) => {
    const previous = recipe.path.points[index];
    return total + Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
  }, 0);
}

export function createSweepView(container, recipe, onDetailChange = () => {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe4df');
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 4000);
  camera.position.set(520, 430, 620);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 110, 0);
  controls.enableDamping = true;
  controls.minDistance = 180;
  controls.maxDistance = 1600;

  scene.add(new THREE.HemisphereLight('#ffffff', '#70817c', 2.5));
  const key = new THREE.DirectionalLight('#fff4de', 3.3);
  key.position.set(-400, 800, 500);
  key.castShadow = true;
  scene.add(key);

  const grid = new THREE.GridHelper(1400, 28, '#70817c', '#aeb9b3');
  grid.position.y = 0;
  scene.add(grid);

  const generated = new THREE.Group();
  scene.add(generated);
  let currentDetail = null;

  function clearGenerated() {
    while (generated.children.length) {
      const child = generated.children.pop();
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  function addPathGuide(showMarkers) {
    const pathPoints = recipe.path.points.map(point => new THREE.Vector3(point.x, point.y, point.z));
    const pathLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pathPoints),
      new THREE.LineBasicMaterial({ color: '#22302e' }),
    );
    generated.add(pathLine);

    if (!showMarkers) return;
    recipe.path.points.forEach(point => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(5, 18, 12),
        new THREE.MeshStandardMaterial({ color: '#f3eee4' }),
      );
      marker.position.set(point.x, point.y, point.z);
      generated.add(marker);
    });
  }

  function addSweepSurface() {
    const geometry = makeSweepGeometry(recipe);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: recipe.appearance.color,
        roughness: 0.58,
        metalness: recipe.semantic.kind === 'gutter' ? 0.45 : 0.05,
        side: THREE.DoubleSide,
      }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    generated.add(mesh);
    return geometry;
  }

  function addConstructionLines() {
    recipe.path.points.forEach((pathPoint, index) => {
      const frame = frameAt(recipe, index);
      const points = recipe.profile.points.map(profilePoint => profilePointToWorld(pathPoint, frame, profilePoint));
      generated.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: '#263331' }),
      ));
    });
  }

  function addSupports() {
    const { supportSpacing, firstSupportOffset } = recipe.installation;
    const total = pathLength(recipe);
    const isConfirmedGutter = recipe.semantic.kind === 'gutter';

    for (let distance = firstSupportOffset; distance < total - firstSupportOffset; distance += supportSpacing) {
      const sample = samplePath(recipe, distance);
      if (!sample) continue;
      const bracketPoints = recipe.profile.points.map(profilePoint => {
        const scaledX = profilePoint.x * 1.1;
        const loweredY = profilePoint.y - 3;
        return new THREE.Vector3(
          sample.point.x + sample.normal.x * scaledX,
          sample.point.y + loweredY,
          sample.point.z + sample.normal.z * scaledX,
        );
      });
      const curve = new THREE.CatmullRomCurve3(bracketPoints, false, 'centripetal');
      const bracket = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 1.8, 7, false),
        new THREE.MeshStandardMaterial({
          color: isConfirmedGutter ? '#263331' : '#c45e3d',
          roughness: 0.7,
          metalness: isConfirmedGutter ? 0.55 : 0.05,
          transparent: !isConfirmedGutter,
          opacity: isConfirmedGutter ? 1 : 0.3,
        }),
      );
      bracket.castShadow = true;
      generated.add(bracket);
    }
  }

  function rebuild(detail = currentDetail || 'form') {
    clearGenerated();
    if (detail === 'intent') {
      addPathGuide(true);
    } else {
      addSweepSurface();
      addPathGuide(detail === 'form');
      if (['construction', 'installation'].includes(detail)) addConstructionLines();
      if (detail === 'installation') addSupports();
    }
    if (detail === 'installation' && recipe.semantic.kind !== 'gutter') {
      onDetailChange({
        ...DETAIL_LEVELS.installation,
        description: 'Feltételezett ereszcsatorna-beépítés: a tartóvasak még csak javaslatok.',
      });
    } else {
      onDetailChange(DETAIL_LEVELS[detail]);
    }
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }

  function animate() {
    controls.update();
    const distance = camera.position.distanceTo(controls.target);
    const detail = detailFromDistance(distance);
    if (detail !== currentDetail) {
      currentDetail = detail;
      rebuild(detail);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('gyuricad:sweep-changed', () => rebuild());
  resize();
  animate();
}
