import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { detailFromCameraDistance, resolveAssembly } from './resolver.js';
import { wallGeometry, openingRange, wallLayerPolygon, interiorWallPolygon, interiorThickness } from './graph-model.js';

export function createModelView(container, project, onDetailChange) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe4df');
  const camera=new THREE.PerspectiveCamera(38,1,1,5000);camera.position.set(750,620,850);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,125,0);controls.enableDamping=true;controls.minDistance=220;controls.maxDistance=2200;controls.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight('#f6fbf8','#82908b',2.3));const sun=new THREE.DirectionalLight('#fff7e7',3.2);sun.position.set(-500,900,450);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({color:'#cbd3cc',roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
  const building=new THREE.Group();scene.add(building);let currentDetail=null;
  const addPrism=(points,y0,y1,color,opacity=1)=>{
    if(y1<=y0)return;
    const n=points.length,vertices=[],indices=[];
    for(const y of [y0,y1])for(const p of points)vertices.push(p.x,y,p.y);
    for(let i=1;i<n-1;i++){indices.push(0,i+1,i);indices.push(n,n+i,n+i+1);}
    for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({color,roughness:.75,flatShading:true,side:THREE.DoubleSide,transparent:opacity<1,opacity});
    const mesh=new THREE.Mesh(geometry,material);building.add(mesh);
  };
  function clear(){for(const mesh of [...building.children]){building.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}}
  function rebuild(detail){
    clear();const assembly=resolveAssembly(project,detail),total=assembly.totalThickness,height=project.dimensions.wallHeight;
    project.graph.walls.forEach((wall,i)=>{
      const g=wallGeometry(project.graph,wall),gap=openingRange(project.graph,wall);
      const at=(s,offset)=>({x:g.a.x+g.ux*s+g.nx*offset,y:g.a.y+g.uy*s+g.ny*offset});
      const layers=wall.role==='interior'?[{innerOffset:0,outerOffset:interiorThickness,color:'#82918c'}]:assembly.layers;
      const wallTotal=wall.role==='interior'?interiorThickness:total;
      for(const layer of layers){
        const inner=layer.innerOffset-wallTotal/2,outer=layer.outerOffset-wallTotal/2;
        const polygon=wall.role==='interior'?interiorWallPolygon(project.graph,wall,total):wallLayerPolygon(project.graph,i,0,g.length,inner,outer);
        const first=[polygon[0],polygon[3]],last=[polygon[1],polygon[2]];
        const cap=s=>[at(s,inner),at(s,outer)];
        const slab=(left,right,y0,y1)=>addPrism([left[0],right[0],right[1],left[1]],y0,y1,layer.color);
        if(!gap){slab(first,last,0,height);continue;}
        slab(first,cap(gap.start),0,height);slab(cap(gap.end),last,0,height);
        slab(cap(gap.start),cap(gap.end),0,project.graph.opening.sill);
        slab(cap(gap.start),cap(gap.end),project.graph.opening.sill+project.graph.opening.height,height);
      }
      if(gap&&detail!=='intent'){
        const opening=project.graph.opening,s=gap.start,e=gap.end,frameOffset=detail==='system'?0:assembly.junction?.frameAxisFromInterior-total/2||0;
        const bar=(s0,s1,y0,y1,offset,thickness,color,opacity=1)=>addPrism([at(s0,offset-thickness/2),at(s1,offset-thickness/2),at(s1,offset+thickness/2),at(s0,offset+thickness/2)],y0,y1,color,opacity);
        bar(s+3,s+9,opening.sill,opening.sill+opening.height,frameOffset,7,'#f1eee7');
        bar(e-9,e-3,opening.sill,opening.sill+opening.height,frameOffset,7,'#f1eee7');
        bar(s+3,e-3,opening.sill,opening.sill+7,frameOffset,7,'#f1eee7');
        bar(s+3,e-3,opening.sill+opening.height-7,opening.sill+opening.height,frameOffset,7,'#f1eee7');
        bar(s+9,e-9,opening.sill+7,opening.sill+opening.height-7,frameOffset,2,'#91cbd2',.5);
        if(detail==='junction'){
          bar(s,e,opening.sill-3,opening.sill,0,total+10,'#a1aaa7');
          for(const [n,color] of [[-8,'#d05d4d'],[0,'#d7b949'],[8,'#4a8da1']]){
            bar(s+8,s+10,opening.sill+8,opening.sill+opening.height-8,frameOffset+n,2,color);
            bar(e-10,e-8,opening.sill+8,opening.sill+opening.height-8,frameOffset+n,2,color);
          }
        }
      }
    });onDetailChange(assembly);
  }
  function resize(){const r=container.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
  function animate(){controls.update();const detail=detailFromCameraDistance(camera.position.distanceTo(controls.target));if(detail!==currentDetail){currentDetail=detail;rebuild(detail);}renderer.render(scene,camera);requestAnimationFrame(animate);}
  window.addEventListener('resize',resize);window.addEventListener('gyuricad:model-changed',()=>rebuild(currentDetail||'system'));resize();animate();return{rebuild};
}
