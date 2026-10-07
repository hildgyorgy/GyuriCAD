import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { detailFromCameraDistance, resolveAssembly } from './resolver.js';

export function createModelView(container, project, onDetailChange) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe4df');

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
  camera.position.set(750, 620, 850);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 125, 0);
  controls.enableDamping = true;
  controls.minDistance = 280;
  controls.maxDistance = 1800;
  controls.maxPolarAngle = Math.PI * 0.48;

  scene.add(new THREE.HemisphereLight('#f6fbf8', '#82908b', 2.3));
  const sun = new THREE.DirectionalLight('#fff7e7', 3.2);
  sun.position.set(-500, 900, 450);
  sun.castShadow = true;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: '#cbd3cc', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const buildingGroup = new THREE.Group();
  scene.add(buildingGroup);
  let currentDetail = null;

  function clearBuilding() {
    while (buildingGroup.children.length) {
      const child = buildingGroup.children.pop();
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  function addBox(size, position, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 }),
    );
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    buildingGroup.add(mesh);
  }

  function addHorizontalWall(zSign, layer, opening) {
    const { interiorWidth: width, interiorDepth: depth, wallHeight: height } = project.dimensions;
    const thickness = layer.thickness;
    const z = zSign * (depth / 2 + layer.innerOffset + thickness / 2);
    const fullLength = width + 2 * layer.outerOffset;
    const hasOpening = zSign > 0 && opening?.wall === 'south';

    if (!hasOpening) {
      addBox({ x: fullLength, y: height, z: thickness }, { x: 0, y: height / 2, z }, layer.color);
      return;
    }

    const center = -width / 2 + opening.center * width;
    const leftEdge = -fullLength / 2;
    const rightEdge = fullLength / 2;
    const openingLeft = center - opening.width / 2;
    const openingRight = center + opening.width / 2;
    const leftLength = openingLeft - leftEdge;
    const rightLength = rightEdge - openingRight;

    addBox({ x: leftLength, y: height, z: thickness }, { x: leftEdge + leftLength / 2, y: height / 2, z }, layer.color);
    addBox({ x: rightLength, y: height, z: thickness }, { x: openingRight + rightLength / 2, y: height / 2, z }, layer.color);
    addBox({ x: opening.width, y: opening.sill, z: thickness }, { x: center, y: opening.sill / 2, z }, layer.color);
    const headHeight = Math.max(0, height - opening.sill - opening.height);
    if (headHeight > 0) {
      addBox(
        { x: opening.width, y: headHeight, z: thickness },
        { x: center, y: opening.sill + opening.height + headHeight / 2, z },
        layer.color,
      );
    }
  }

  function addVerticalWall(xSign, layer) {
    const { interiorWidth: width, interiorDepth: depth, wallHeight: height } = project.dimensions;
    const thickness = layer.thickness;
    const x = xSign * (width / 2 + layer.innerOffset + thickness / 2);
    const length = depth + 2 * layer.innerOffset;
    addBox({ x: thickness, y: height, z: length }, { x, y: height / 2, z: 0 }, layer.color);
  }

  function addWindowDetail(opening, assembly) {
    if (assembly.level.key === 'intent') return;
    const { interiorWidth: width, interiorDepth: depth } = project.dimensions;
    const center = -width / 2 + opening.center * width;
    const total = assembly.totalThickness;
    const z = depth / 2 + total * 0.56;
    const isDetailed = ['resolved', 'junction'].includes(assembly.level.key);
    const frameColor = isDetailed ? '#f1eee7' : '#8cb8bc';
    const frameDepth = isDetailed ? 8 : 2;
    const side = isDetailed ? 7 : 3;

    addBox({ x: side, y: opening.height, z: frameDepth }, { x: center - opening.width / 2 + side / 2, y: opening.sill + opening.height / 2, z }, frameColor);
    addBox({ x: side, y: opening.height, z: frameDepth }, { x: center + opening.width / 2 - side / 2, y: opening.sill + opening.height / 2, z }, frameColor);
    addBox({ x: opening.width, y: side, z: frameDepth }, { x: center, y: opening.sill + side / 2, z }, frameColor);
    addBox({ x: opening.width, y: side, z: frameDepth }, { x: center, y: opening.sill + opening.height - side / 2, z }, frameColor);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(opening.width - side * 2, opening.height - side * 2, 1.2),
      new THREE.MeshPhysicalMaterial({ color: '#98ced1', transparent: true, opacity: 0.45, roughness: 0.15 }),
    );
    glass.position.set(center, opening.sill + opening.height / 2, z);
    buildingGroup.add(glass);

    if (isDetailed) {
      addBox(
        { x: opening.width + 18, y: 3, z: total + 12 },
        { x: center, y: opening.sill - 1.5, z: depth / 2 + total / 2 + 4 },
        '#9da8a5',
      );
    }

    if (assembly.level.key === 'junction') {
      const rule = assembly.junction;
      const openingLeft = center - opening.width / 2;
      const openingRight = center + opening.width / 2;
      const frameZ = depth / 2 + rule.frameAxisFromInterior;
      const returnDepth = Math.max(4, total - rule.frameAxisFromInterior);
      const returnZ = frameZ + returnDepth / 2;

      addBox(
        { x: rule.insulationReturn, y: opening.height, z: returnDepth },
        { x: openingLeft + rule.insulationReturn / 2, y: opening.sill + opening.height / 2, z: returnZ },
        '#e5b94e',
      );
      addBox(
        { x: rule.insulationReturn, y: opening.height, z: returnDepth },
        { x: openingRight - rule.insulationReturn / 2, y: opening.sill + opening.height / 2, z: returnZ },
        '#e5b94e',
      );
      addBox(
        { x: opening.width, y: rule.insulationReturn, z: returnDepth },
        { x: center, y: opening.sill + opening.height - rule.insulationReturn / 2, z: returnZ },
        '#e5b94e',
      );

      const sealZ = [frameZ - frameDepth / 2 - 1.2, frameZ, frameZ + frameDepth / 2 + 1.2];
      rule.seals.forEach((seal, index) => {
        addBox(
          { x: 1.8, y: opening.height - 12, z: 1.8 },
          { x: openingLeft + side + 1.2, y: opening.sill + opening.height / 2, z: sealZ[index] },
          seal.color,
        );
        addBox(
          { x: 1.8, y: opening.height - 12, z: 1.8 },
          { x: openingRight - side - 1.2, y: opening.sill + opening.height / 2, z: sealZ[index] },
          seal.color,
        );
      });

      addBox(
        { x: opening.width + rule.interiorBoardProjection * 2, y: 3, z: rule.frameAxisFromInterior + rule.interiorBoardProjection },
        { x: center, y: opening.sill + 2, z: depth / 2 + (rule.frameAxisFromInterior - rule.interiorBoardProjection) / 2 },
        '#d9c7ab',
      );
    }
  }

  function rebuild(detail) {
    clearBuilding();
    const assembly = resolveAssembly(project, detail);
    const opening = project.openings[0];
    assembly.layers.forEach(layer => {
      addHorizontalWall(-1, layer, opening);
      addHorizontalWall(1, layer, opening);
      addVerticalWall(-1, layer);
      addVerticalWall(1, layer);
    });
    addWindowDetail(opening, assembly);
    onDetailChange(assembly);
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
    const detail = detailFromCameraDistance(distance);
    if (detail !== currentDetail) {
      currentDetail = detail;
      rebuild(detail);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('gyuricad:model-changed', () => rebuild(currentDetail || 'system'));
  resize();
  animate();
  return { rebuild };
}
