import { detailFrom2DZoom, resolveAssembly } from './resolver.js';
import { wallGeometry, openingRange, validGraph, wallLayerPolygon, interiorThickness, interiorWallPolygon, recognizeRooms, pointInExterior, splitWall, addInteriorWall, nextId } from './graph-model.js';
import { updateProject } from './model.js';

export function createPlanView(canvas, project, onDetailChange, onSelectionChange = () => {}, onDrawingStatus = () => {}) {
  const ctx = canvas.getContext('2d');
  let zoom = 1, pan = { x: 0, y: 0 }, drag = null, last = null, selected = project.graph.opening.wallId;
  let currentDetail = null, tool = 'select', pending = null, preview = null;
  const view = () => canvas.getBoundingClientRect();
  const scale = () => 0.57 * zoom;
  const screen = (x,y) => { const r=view(); return { x:r.width/2+pan.x+x*scale(), y:r.height/2+pan.y+y*scale() }; };
  const world = (x,y) => { const r=view(); return { x:(x-r.width/2-pan.x)/scale(), y:(y-r.height/2-pan.y)/scale() }; };
  const distance = (p,a,b) => { const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy); };
  function draw() {
    const r=view(),dpr=window.devicePixelRatio||1;
    if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f3f0e8';ctx.fillRect(0,0,r.width,r.height);
    const detail=detailFrom2DZoom(zoom),assembly=resolveAssembly(project,detail);
    if(detail!==currentDetail){currentDetail=detail;onDetailChange(assembly);}
    const s=scale();ctx.strokeStyle='#dce0d9';ctx.lineWidth=1;const step=100*s;
    for(let x=(r.width/2+pan.x)%step;x<r.width;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,r.height);ctx.stroke();}
    for(let y=(r.height/2+pan.y)%step;y<r.height;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke();}
    const rooms=recognizeRooms(project.graph);
    for(const room of rooms){
      const center={x:room.points.reduce((a,p)=>a+p.x,0)/room.points.length,y:room.points.reduce((a,p)=>a+p.y,0)/room.points.length},p=screen(center.x,center.y);
      ctx.fillStyle='#89918a';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(`${room.area.toFixed(1)} m²`,p.x,p.y);
    }
    for(const [wallIndex, wall] of project.graph.walls.entries()){
      const g=wallGeometry(project.graph,wall),gap=openingRange(project.graph,wall),layers=assembly.layers;
      const wallLayers=wall.role==='interior'?[{innerOffset:0,outerOffset:interiorThickness,color:'#82918c'}]:layers;
      const wallTotal=wall.role==='interior'?interiorThickness:assembly.totalThickness;
      for(const layer of wallLayers.slice().reverse()){
        const inner=layer.innerOffset-wallTotal/2,outer=layer.outerOffset-wallTotal/2;
        const polygon=(start,end)=>{if(end<=start)return;const footprint=wall.role==='interior'?interiorWallPolygon(project.graph,wall,assembly.totalThickness):wallLayerPolygon(project.graph,wallIndex,start,end,inner,outer);const points=footprint.map(p=>screen(p.x,p.y));ctx.fillStyle=layer.color;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();};
        if(gap){polygon(0,gap.start);polygon(gap.end,g.length);}else polygon(0,g.length);
      }
      if(gap){const a=screen(g.a.x+g.ux*gap.start,g.a.y+g.uy*gap.start),b=screen(g.a.x+g.ux*gap.end,g.a.y+g.uy*gap.end);ctx.strokeStyle='#5c9dab';ctx.lineWidth=Math.max(2,2*s);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(detail==='junction'){ctx.strokeStyle='#d05d4d';ctx.lineWidth=2;for(const p of [a,b]){ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.stroke();}}}
      if(wall.id===selected&&tool==='select'){const a=screen(g.a.x,g.a.y),b=screen(g.b.x,g.b.y);ctx.strokeStyle='#c45e3d';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
    }
    if(tool==='wall'&&pending){const a=screen(pending.x,pending.y),b=screen((preview||pending).x,(preview||pending).y);ctx.strokeStyle='#2f7880';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
    for(const node of project.graph.nodes){const p=screen(node.x,node.y);ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.45)';ctx.fill();ctx.strokeStyle='#c45e3d';ctx.lineWidth=1.5;ctx.stroke();}
  }
  const local=e=>{const r=view();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  function candidate(p,graph=project.graph){
    const w=world(p.x,p.y),radius=16/scale();
    const node=graph.nodes.find(n=>Math.hypot(n.x-w.x,n.y-w.y)<radius);
    if(node)return{x:node.x,y:node.y,type:'node',id:node.id};
    let best=null,limit=radius;
    for(const wall of graph.walls){const g=wallGeometry(graph,wall),t=Math.max(0,Math.min(g.length,(w.x-g.a.x)*g.ux+(w.y-g.a.y)*g.uy));const q={x:g.a.x+g.ux*t,y:g.a.y+g.uy*t},d=Math.hypot(q.x-w.x,q.y-w.y);if(d<limit&&t>=80&&g.length-t>=80){best={...q,type:'wall',id:wall.id};limit=d;}}
    if(best)return best;
    const point={x:Math.round(w.x/5)*5,y:Math.round(w.y/5)*5,type:'free'};
    return pointInExterior(graph,point)?point:null;
  }
  function materialize(graph,point){
    if(point.type==='node')return point.id;
    if(point.type==='wall'){
      const wall=graph.walls.find(item=>item.id===point.id);
      if(wall){const node=splitWall(graph,wall.id,point);if(node)return node.id;}
      const nearest=graph.walls.find(item=>{const g=wallGeometry(graph,item);return distance(point,g.a,g.b)<5;});
      if(nearest){const node=splitWall(graph,nearest.id,point);if(node)return node.id;}
      return null;
    }
    const node={id:nextId(graph,'n'),x:point.x,y:point.y};graph.nodes.push(node);return node.id;
  }
  function drawClick(p){
    const hit=candidate(p);if(!hit){onDrawingStatus('Csak az épület belsejében kezdhetsz vagy fejezhetsz be falat.');return;}
    if(!pending){pending=hit;preview=hit;onDrawingStatus('Kezdőpont rögzítve. Kattints a fal végpontjára; Esc: megszakítás.');draw();return;}
    const graph=structuredClone(project.graph),a=materialize(graph,pending),b=materialize(graph,hit);
    if(!a||!b||!addInteriorWall(graph,a,b)){onDrawingStatus('A fal túl rövid, keresztezi a meglévő falat, vagy kilóg az épületből.');return;}
    pending=null;preview=null;updateProject({graph});onDrawingStatus(`${recognizeRooms(graph).length} felismert helyiség · új belső fal elkészült.`);
  }
  canvas.addEventListener('pointerdown',e=>{
    const p=local(e);
    if(tool==='wall'){drawClick(p);return;}
    const node=project.graph.nodes.find(n=>{const q=screen(n.x,n.y);return Math.hypot(p.x-q.x,p.y-q.y)<15;});
    if(node){drag={type:'node',id:node.id};canvas.setPointerCapture(e.pointerId);return;}
    let nearest=16;for(const wall of project.graph.walls){const g=wallGeometry(project.graph,wall),d=distance(p,screen(g.a.x,g.a.y),screen(g.b.x,g.b.y));if(d<nearest){nearest=d;selected=wall.id;onSelectionChange(wall);}}
    drag={type:'pan'};last=p;canvas.setPointerCapture(e.pointerId);draw();
  });
  canvas.addEventListener('pointermove',e=>{
    const p=local(e);
    if(tool==='wall'){preview=candidate(p)||world(p.x,p.y);draw();return;}
    if(!drag)return;
    if(drag.type==='pan'){pan.x+=p.x-last.x;pan.y+=p.y-last.y;last=p;draw();return;}
    const node=project.graph.nodes.find(n=>n.id===drag.id),old={x:node.x,y:node.y},w=world(p.x,p.y);
    node.x=Math.round(w.x/5)*5;node.y=Math.round(w.y/5)*5;
    if(!validGraph(project.graph)){Object.assign(node,old);return;}
    window.dispatchEvent(new CustomEvent('gyuricad:model-changed'));localStorage.setItem('gyuricad:house-graph-v1',JSON.stringify(project.graph));
  });
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pending){pending=null;preview=null;onDrawingStatus('Falrajzolás megszakítva.');draw();}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(5.2,Math.max(.48,zoom*(e.deltaY<0?1.12:.89)));draw();},{passive:false});
  window.addEventListener('resize',draw);window.addEventListener('gyuricad:model-changed',draw);onSelectionChange(project.graph.walls.find(w=>w.id===selected));draw();
  return {redraw:draw,getSelectedWall:()=>selected,setTool(value){tool=value;pending=null;preview=null;canvas.style.cursor=value==='wall'?'crosshair':'default';draw();},setSelected(id){selected=id;draw();}};
}
