import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initialGraph, wallGeometry, openingRange, validGraph } from './graph-model.js';

const storageKey = 'gyuricad:graph-v1';
let graph = initialGraph();
try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (validGraph(saved)) graph = saved; } catch {}
let selected = graph.opening.wallId;
let activeNode = null;
const canvas = document.querySelector('#graph-canvas');
const ctx = canvas.getContext('2d');
const paper = document.querySelector('#graph-paper');
const windowWidth = document.querySelector('#window-width');
const windowPosition = document.querySelector('#window-position');
let svg = '';
const map = (x, y, w, h) => ({ x: w / 2 + x * Math.min(w / 930, h / 700), y: h / 2 + y * Math.min(w / 930, h / 700) });
const distanceToSegment = (p, a, b) => { const dx = b.x-a.x, dy=b.y-a.y; const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy))); return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy); };

function draw2d() {
  const r=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#f7f4ec';ctx.fillRect(0,0,r.width,r.height);
  const pt=(x,y)=>map(x,y,r.width,r.height), scale=Math.min(r.width/930,r.height/700);
  ctx.strokeStyle='#dce0da';ctx.lineWidth=1;for(let x=pt(0,0).x%40;x<r.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,r.height);ctx.stroke();}for(let y=pt(0,0).y%40;y<r.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke();}
  for(const wall of graph.walls){const g=wallGeometry(graph,wall), gap=openingRange(graph,wall);const a=pt(g.a.x,g.a.y),b=pt(g.b.x,g.b.y);ctx.strokeStyle=wall.id===selected?'#c45e3d':'#35423e';ctx.lineWidth=Math.max(7,graph.wallThickness*scale);ctx.lineCap='square';const seg=(s,e)=>{ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*s/g.length,a.y+(b.y-a.y)*s/g.length);ctx.lineTo(a.x+(b.x-a.x)*e/g.length,a.y+(b.y-a.y)*e/g.length);ctx.stroke();};if(gap){seg(0,gap.start);seg(gap.end,g.length);ctx.strokeStyle='#5b9ba5';ctx.lineWidth=3;const s=gap.start/g.length,e=gap.end/g.length;ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*s,a.y+(b.y-a.y)*s);ctx.lineTo(a.x+(b.x-a.x)*e,a.y+(b.y-a.y)*e);ctx.stroke();}else seg(0,g.length);}
  for(const node of graph.nodes){const p=pt(node.x,node.y);ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#c45e3d';ctx.lineWidth=2;ctx.stroke();}
}

const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe5df');
const camera=new THREE.PerspectiveCamera(38,1,1,5000);camera.position.set(900,750,950);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.querySelector('#graph-3d').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,120,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight('#ffffff','#82948b',2.5));const light=new THREE.DirectionalLight('#fff4df',2.5);light.position.set(-500,900,500);scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:'#ccd5cc'}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const group=new THREE.Group();scene.add(group);
function box(length,height,thickness,mid,angle,color){if(length<=0||height<=0)return;const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,height,thickness),new THREE.MeshStandardMaterial({color,roughness:.82}));mesh.position.set(mid.x,mid.y,mid.z);mesh.rotation.y=angle;group.add(mesh);}
function draw3d(){while(group.children.length){const item=group.children.pop();item.geometry.dispose();item.material.dispose();}for(const wall of graph.walls){const g=wallGeometry(graph,wall), angle=-Math.atan2(g.uy,g.ux), gap=openingRange(graph,wall), point=(s,y)=>({x:g.a.x+g.ux*s,y,z:g.a.y+g.uy*s}), add=(s,e,h,y,color)=>box(e-s,h,graph.wallThickness,point((s+e)/2,y),angle,color);if(!gap){add(0,g.length,graph.wallHeight,graph.wallHeight/2,'#c8b3a0');continue;}add(0,gap.start,graph.wallHeight,graph.wallHeight/2,'#c8b3a0');add(gap.end,g.length,graph.wallHeight,graph.wallHeight/2,'#c8b3a0');add(gap.start,gap.end,graph.opening.sill,graph.opening.sill/2,'#c8b3a0');const head=graph.wallHeight-graph.opening.sill-graph.opening.height;add(gap.start,gap.end,head,graph.wallHeight-head/2,'#c8b3a0');add(gap.start+4,gap.end-4,graph.opening.height-8,graph.opening.sill+graph.opening.height/2,'#79aeb7');}}
function resize3d(){const el=document.querySelector('#graph-3d'),r=el.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
function animate(){controls.update();renderer.render(scene,camera);requestAnimationFrame(animate);}animate();

const fmt=n=>Number(n.toFixed(2));
function drawPaper(){const scale=.2, X=x=>fmt(210+x*scale),Y=y=>fmt(130+y*scale),t=graph.wallThickness*scale;let parts=[];for(const wall of graph.walls){const g=wallGeometry(graph,wall),gap=openingRange(graph,wall),rect=(s,e)=>{if(e<=s)return;const x=g.a.x+g.ux*s,y=g.a.y+g.uy*s;parts.push(`<rect class="wall" x="${X(x)}" y="${Y(y)-t/2}" width="${fmt((e-s)*scale)}" height="${fmt(t)}" transform="rotate(${fmt(Math.atan2(g.uy,g.ux)*180/Math.PI)} ${X(x)} ${Y(y)})"/>`);};if(gap){rect(0,gap.start);rect(gap.end,g.length);const p1={x:g.a.x+g.ux*gap.start,y:g.a.y+g.uy*gap.start},p2={x:g.a.x+g.ux*gap.end,y:g.a.y+g.uy*gap.end};parts.push(`<line class="window" x1="${X(p1.x)}" y1="${Y(p1.y)}" x2="${X(p2.x)}" y2="${Y(p2.y)}"/>`);}else rect(0,g.length);}
svg=`<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297"><style>.wall{fill:#535c58;stroke:#222b29;stroke-width:.3}.window{stroke:#4d91a0;stroke-width:.7}text{font-family:Arial,sans-serif;fill:#26312e}.frame{fill:none;stroke:#26312e;stroke-width:.3}</style><rect width="420" height="297" fill="white"/><rect class="frame" x="10" y="10" width="400" height="277"/>${parts.join('')}<line class="frame" x1="10" y1="265" x2="410" y2="265"/><text x="15" y="275" font-size="4">GyuriCAD · szerkeszthető falgráf</text><text x="15" y="282" font-size="3">Alaprajz · A3 · M 1:50</text><text x="350" y="279" font-size="4">04 / kísérlet</text></svg>`;paper.innerHTML=svg;}
function syncUi(){const wall=graph.walls.find(item=>item.id===selected),g=wallGeometry(graph,wall);document.querySelector('#selected-wall').textContent=wall.id;document.querySelector('#wall-length').textContent=`Hossz: ${(g.length/100).toFixed(2)} m`;windowWidth.value=graph.opening.width;windowPosition.value=Math.round(graph.opening.center*100);document.querySelector('#window-value').textContent=`${graph.opening.width} cm`;document.querySelector('#position-value').textContent=`${Math.round(graph.opening.center*100)}%`;}
function refresh(){localStorage.setItem(storageKey,JSON.stringify(graph));draw2d();draw3d();drawPaper();syncUi();}
function pointer(event){const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};}
canvas.addEventListener('pointerdown',event=>{const p=pointer(event),r=canvas.getBoundingClientRect();activeNode=graph.nodes.find(node=>{const q=map(node.x,node.y,r.width,r.height);return Math.hypot(p.x-q.x,p.y-q.y)<15;})?.id||null;if(activeNode){canvas.setPointerCapture(event.pointerId);return;}let best=18;for(const wall of graph.walls){const g=wallGeometry(graph,wall),a=map(g.a.x,g.a.y,r.width,r.height),b=map(g.b.x,g.b.y,r.width,r.height),d=distanceToSegment(p,a,b);if(d<best){best=d;selected=wall.id;}}draw2d();syncUi();});
canvas.addEventListener('pointermove',event=>{if(!activeNode)return;const p=pointer(event),r=canvas.getBoundingClientRect(),s=Math.min(r.width/930,r.height/700),node=graph.nodes.find(n=>n.id===activeNode),old={x:node.x,y:node.y};node.x=Math.round((p.x-r.width/2)/s/5)*5;node.y=Math.round((p.y-r.height/2)/s/5)*5;if(!validGraph(graph)){Object.assign(node,old);return;}refresh();});
canvas.addEventListener('pointerup',()=>activeNode=null);canvas.addEventListener('pointercancel',()=>activeNode=null);
document.querySelector('#assign-window').addEventListener('click',()=>{graph.opening.wallId=selected;refresh();});windowWidth.addEventListener('input',()=>{graph.opening.width=Number(windowWidth.value);refresh();});windowPosition.addEventListener('input',()=>{graph.opening.center=Number(windowPosition.value)/100;refresh();});document.querySelector('#reset').addEventListener('click',()=>{graph=initialGraph();selected=graph.opening.wallId;refresh();});document.querySelector('#download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='gyuricad-falgraf-a3.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});document.querySelector('#print').addEventListener('click',()=>window.print());window.addEventListener('resize',()=>{draw2d();resize3d();});resize3d();refresh();
