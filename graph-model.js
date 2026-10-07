export const initialGraph = () => ({
  nodes: [
    { id: 'a', x: -360, y: -260 }, { id: 'b', x: 360, y: -260 },
    { id: 'c', x: 360, y: 100 }, { id: 'd', x: 170, y: 100 },
    { id: 'e', x: 170, y: 260 }, { id: 'f', x: -360, y: 260 },
  ],
  walls: [
    { id: 'w1', a: 'a', b: 'b' }, { id: 'w2', a: 'b', b: 'c' },
    { id: 'w3', a: 'c', b: 'd' }, { id: 'w4', a: 'd', b: 'e' },
    { id: 'w5', a: 'e', b: 'f' }, { id: 'w6', a: 'f', b: 'a' },
  ],
  opening: { wallId: 'w5', center: 0.5, width: 150, sill: 90, height: 150 },
  wallThickness: 38, wallHeight: 300,
});

export function wallGeometry(graph, wall) {
  const a = graph.nodes.find(node => node.id === wall.a);
  const b = graph.nodes.find(node => node.id === wall.b);
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  return { a, b, length, ux: dx / length, uy: dy / length, nx: dy / length, ny: -dx / length };
}

export function openingRange(graph, wall) {
  if (graph.opening.wallId !== wall.id) return null;
  const length = wallGeometry(graph, wall).length;
  const width = Math.min(graph.opening.width, Math.max(0, length - 60));
  const center = Math.max(width / 2 + 20, Math.min(length - width / 2 - 20, graph.opening.center * length));
  return { start: center - width / 2, end: center + width / 2, width };
}

export function validGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length < 3 || !Array.isArray(graph.walls)) return false;
  const ids = new Set(graph.nodes.map(node => node.id));
  if (!graph.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)) ||
      !graph.walls.every(wall => ids.has(wall.a) && ids.has(wall.b) && wallGeometry(graph, wall).length >= 80) ||
      !graph.walls.some(wall => wall.id === graph.opening?.wallId)) return false;
  for (let i = 0; i < graph.walls.length; i++) for (let j = i + 1; j < graph.walls.length; j++) {
    const first = wallGeometry(graph, graph.walls[i]), second = wallGeometry(graph, graph.walls[j]);
    if (segmentIntersection(first.a, first.b, second.a, second.b)) return false;
  }
  return true;
}

export function wallLayerPolygon(graph, wallIndex, start, end, inner, outer) {
  const wall = graph.walls[wallIndex], walls = graph.walls.filter(item => item.role !== 'interior'), exteriorIndex = walls.findIndex(item => item.id === wall.id), g = wallGeometry(graph, wall);
  const at = (s, offset) => ({ x: g.a.x + g.ux * s + g.nx * offset, y: g.a.y + g.uy * s + g.ny * offset });
  const intersect = (a, u, b, v) => {
    const cross = u.x * v.y - u.y * v.x;
    if (Math.abs(cross) < .001) return a;
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = (dx * v.y - dy * v.x) / cross;
    return { x: a.x + t * u.x, y: a.y + t * u.y };
  };
  const miter = (atEnd, offset) => {
    if (exteriorIndex < 0) return at(atEnd ? g.length : 0, offset);
    const neighbor = wallGeometry(graph, walls[(exteriorIndex + (atEnd ? 1 : walls.length - 1)) % walls.length]);
    const vertex = atEnd ? g.b : g.a;
    const a = { x: vertex.x + g.nx * offset, y: vertex.y + g.ny * offset };
    const b = { x: vertex.x + neighbor.nx * offset, y: vertex.y + neighbor.ny * offset };
    const p = intersect(a, { x: g.ux, y: g.uy }, b, { x: neighbor.ux, y: neighbor.uy });
    return Math.hypot(p.x - vertex.x, p.y - vertex.y) > Math.max(100, Math.abs(offset) * 4) ? a : p;
  };
  return [
    start === 0 ? miter(false, inner) : at(start, inner),
    end === g.length ? miter(true, inner) : at(end, inner),
    end === g.length ? miter(true, outer) : at(end, outer),
    start === 0 ? miter(false, outer) : at(start, outer),
  ];
}

export const isExteriorWall = wall => wall.role !== 'interior';
export const interiorThickness = 15;
export function exteriorWalls(graph) { return graph.walls.filter(isExteriorWall); }
export function pointInExterior(graph, point) {
  const nodes = exteriorWalls(graph).map(wall => graph.nodes.find(node => node.id === wall.a));
  let inside = false;
  for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
    const a = nodes[i], b = nodes[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const cross = (a, b) => a.x * b.y - a.y * b.x;
function segmentIntersection(a, b, c, d) {
  const u = { x: b.x - a.x, y: b.y - a.y }, v = { x: d.x - c.x, y: d.y - c.y };
  const denominator = cross(u, v);
  if (Math.abs(denominator) < 1e-8) return false;
  const w = { x: c.x - a.x, y: c.y - a.y };
  const t = cross(w, v) / denominator, s = cross(w, u) / denominator;
  return t > 1e-5 && t < 1 - 1e-5 && s > 1e-5 && s < 1 - 1e-5;
}
export function canAddInteriorWall(graph, aId, bId) {
  if (aId === bId) return false;
  const a = graph.nodes.find(node => node.id === aId), b = graph.nodes.find(node => node.id === bId);
  if (!a || !b || Math.hypot(a.x-b.x,a.y-b.y) < 80) return false;
  if (!pointInExterior(graph, { x:(a.x+b.x)/2, y:(a.y+b.y)/2 })) return false;
  for (const wall of graph.walls) {
    const g = wallGeometry(graph, wall);
    if ((wall.a === aId && wall.b === bId) || (wall.a === bId && wall.b === aId)) return false;
    if (segmentIntersection(a,b,g.a,g.b)) return false;
  }
  return true;
}
export function nextId(graph, prefix) {
  let index = 1;
  const used = new Set([...graph.nodes.map(node=>node.id),...graph.walls.map(wall=>wall.id)]);
  while (used.has(prefix+index)) index++;
  return prefix+index;
}
export function splitWall(graph, wallId, point) {
  const index=graph.walls.findIndex(wall=>wall.id===wallId);
  if(index<0)return null;
  const wall=graph.walls[index],g=wallGeometry(graph,wall);
  const distance=(point.x-g.a.x)*g.ux+(point.y-g.a.y)*g.uy;
  if(distance<80||g.length-distance<80)return null;
  const opening=openingRange(graph,wall);
  if(opening&&distance>opening.start-20&&distance<opening.end+20)return null;
  const node={id:nextId(graph,'n'),x:Math.round((g.a.x+g.ux*distance)/5)*5,y:Math.round((g.a.y+g.uy*distance)/5)*5};
  const firstLength=Math.hypot(node.x-g.a.x,node.y-g.a.y),secondLength=Math.hypot(node.x-g.b.x,node.y-g.b.y);
  if(firstLength<80||secondLength<80)return null;
  const second={...wall,id:nextId(graph,'w'),a:node.id};
  const originalB=wall.b;wall.b=node.id;second.b=originalB;
  graph.nodes.push(node);graph.walls.splice(index+1,0,second);
  if(graph.opening.wallId===wall.id){
    const center=graph.opening.center*g.length;
    if(center>firstLength){graph.opening.wallId=second.id;graph.opening.center=(center-firstLength)/secondLength;}
    else graph.opening.center=center/firstLength;
  }
  return node;
}
export function addInteriorWall(graph,aId,bId){
  if(!canAddInteriorWall(graph,aId,bId))return null;
  const wall={id:nextId(graph,'i'),a:aId,b:bId,role:'interior'};
  graph.walls.push(wall);return wall;
}
export function removeInteriorWall(graph,wallId){
  const index=graph.walls.findIndex(wall=>wall.id===wallId&&wall.role==='interior');
  if(index<0)return false;
  graph.walls.splice(index,1);
  return true;
}
export function recognizeRooms(graph){
  const outgoing=new Map(graph.nodes.map(node=>[node.id,[]]));
  const edges=[];
  for(const wall of graph.walls){
    const a=graph.nodes.find(node=>node.id===wall.a),b=graph.nodes.find(node=>node.id===wall.b);
    const forward={from:a.id,to:b.id,wallId:wall.id,angle:Math.atan2(b.y-a.y,b.x-a.x)};
    const reverse={from:b.id,to:a.id,wallId:wall.id,angle:Math.atan2(a.y-b.y,a.x-b.x)};
    outgoing.get(a.id).push(forward);outgoing.get(b.id).push(reverse);edges.push(forward,reverse);
  }
  for(const list of outgoing.values())list.sort((a,b)=>a.angle-b.angle);
  const visited=new Set(),rooms=[];
  const key=edge=>`${edge.wallId}:${edge.from}`;
  for(const start of edges){
    if(visited.has(key(start)))continue;
    const points=[],wallIds=[],local=new Set();let edge=start;
    for(let steps=0;steps<edges.length+1;steps++){
      const id=key(edge);if(local.has(id))break;
      local.add(id);visited.add(id);
      points.push(graph.nodes.find(node=>node.id===edge.from));wallIds.push(edge.wallId);
      const list=outgoing.get(edge.to),reverseIndex=list.findIndex(item=>item.to===edge.from&&item.wallId===edge.wallId);
      edge=list[(reverseIndex-1+list.length)%list.length];
    }
    if(key(edge)!==key(start)||points.length<3)continue;
    const area=points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0)/2;
    const center={x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length};
    if(area>100&&pointInExterior(graph,center))rooms.push({id:`room-${rooms.length+1}`,area:area/10000,points:points.map(p=>({x:p.x,y:p.y})),wallIds});
  }
  return rooms;
}

function lineHit(origin, direction, linePoint, lineDirection) {
  const cross = direction.x * lineDirection.y - direction.y * lineDirection.x;
  if (Math.abs(cross) < 1e-6) return null;
  const dx = linePoint.x - origin.x, dy = linePoint.y - origin.y;
  return (dx * lineDirection.y - dy * lineDirection.x) / cross;
}

// A beltéri fal réteg nélküli testének végpontjait a csatlakozó falhoz vágja.
export function interiorWallPolygon(graph, wall, exteriorThickness = 43.5) {
  const g = wallGeometry(graph, wall), half = interiorThickness / 2;
  const raw = (s, offset) => ({ x: g.a.x + g.ux * s + g.nx * offset, y: g.a.y + g.uy * s + g.ny * offset });
  const endpoints = [g.a, g.b].map((node, endIndex) => {
    const atEnd = endIndex === 1;
    const away = atEnd ? { x: -g.ux, y: -g.uy } : { x: g.ux, y: g.uy };
    const neighbors = graph.walls.filter(item => item.id !== wall.id && (item.a === node.id || item.b === node.id));
    const exterior = neighbors.filter(isExteriorWall);
    if (exterior.length) {
      return [-half, half].map(offset => {
        const origin = raw(atEnd ? g.length : 0, offset);
        let trim = 0;
        for (const item of exterior) {
          const other = wallGeometry(graph, item);
          const interiorFace = { x: other.a.x - other.nx * exteriorThickness / 2, y: other.a.y - other.ny * exteriorThickness / 2 };
          const hit = lineHit(origin, away, interiorFace, { x: other.ux, y: other.uy });
          if (hit !== null && hit > trim) trim = hit;
        }
        trim = Math.min(Math.max(trim, 0), g.length / 3);
        return { x: origin.x + away.x * trim, y: origin.y + away.y * trim };
      });
    }
    const others = neighbors.filter(item => item.role === 'interior');
    if (others.length === 1) {
      const otherWall = others[0], other = wallGeometry(graph, otherWall);
      const otherAway = otherWall.a === node.id ? { x: other.ux, y: other.uy } : { x: -other.ux, y: -other.uy };
      const dot = away.x * otherAway.x + away.y * otherAway.y;
      if (dot < -.999) return [raw(atEnd ? g.length : 0, -half), raw(atEnd ? g.length : 0, half)];
      const sine = Math.abs(away.x * otherAway.y - away.y * otherAway.x);
      if (sine < .1) return [raw(atEnd ? g.length : 0, -half), raw(atEnd ? g.length : 0, half)];
      const thisIndex = graph.walls.findIndex(item => item.id === wall.id);
      const otherIndex = graph.walls.findIndex(item => item.id === otherWall.id);
      if (thisIndex < otherIndex) {
        // A korábban rajzolt fal végigfut a sarok külső éléig.
        const extension = Math.min(half * (1 + Math.abs(dot)) / sine, g.length / 3);
        return [raw(atEnd ? g.length + extension : -extension, -half), raw(atEnd ? g.length + extension : -extension, half)];
      }
      // A csatlakozó fal két szélét külön a fogadó fal közeli síkjához vágjuk.
      const normal = { x: otherAway.y, y: -otherAway.x };
      const projection = away.x * normal.x + away.y * normal.y;
      const face = { x: node.x + normal.x * Math.sign(projection) * half, y: node.y + normal.y * Math.sign(projection) * half };
      return [-half, half].map(offset => {
        const origin = raw(atEnd ? g.length : 0, offset);
        const hit = lineHit(origin, away, face, otherAway);
        const trim = Math.min(Math.max(hit || 0, 0), g.length / 3);
        return { x: origin.x + away.x * trim, y: origin.y + away.y * trim };
      });
    }
    if (others.length >= 2) {
      // Többágú csomópont: minden oldal a szög szerint szomszédos fal oldalával metsződik.
      const rays = [{ id: wall.id, direction: away }, ...others.map(item => {
        const other = wallGeometry(graph, item);
        return { id: item.id, direction: item.a === node.id ? { x: other.ux, y: other.uy } : { x: -other.ux, y: -other.uy } };
      })].sort((a,b)=>Math.atan2(a.direction.y,a.direction.x)-Math.atan2(b.direction.y,b.direction.x));
      const currentIndex=rays.findIndex(item=>item.id===wall.id);
      const normal={x:away.y,y:-away.x};
      return [-half,half].map(offset=>{
        const awayOffset=atEnd?-offset:offset;
        const neighbor=rays[(currentIndex+(awayOffset>0?rays.length-1:1))%rays.length];
        const neighborNormal={x:neighbor.direction.y,y:-neighbor.direction.x};
        const neighborOffset=awayOffset>0?-half:half;
        const origin={x:node.x+normal.x*awayOffset,y:node.y+normal.y*awayOffset};
        const target={x:node.x+neighborNormal.x*neighborOffset,y:node.y+neighborNormal.y*neighborOffset};
        const hit=lineHit(origin,away,target,neighbor.direction);
        if(hit===null||Math.abs(hit)>6*half)return origin;
        return{x:origin.x+away.x*hit,y:origin.y+away.y*hit};
      });
    }
    return [raw(atEnd ? g.length : 0, -half), raw(atEnd ? g.length : 0, half)];
  });
  return [endpoints[0][0], endpoints[1][0], endpoints[1][1], endpoints[0][1]];
}
