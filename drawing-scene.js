import { resolveAssembly } from './resolver.js';
import { wallGeometry, openingRange, wallLayerPolygon, interiorWallPolygon, interiorThickness, recognizeRooms } from './graph-model.js';
const PAPER={width:420,height:297,margin:12,titleHeight:27};
const styleForLayer=layer=>layer.role==='structure'?'cut-structure':layer.role==='insulation'?'cut-insulation':layer.role.includes('finish')?'cut-finish':'cut-secondary';
export function buildPlanScene(project,options){
  const scale=Number(options.scale),assembly=resolveAssembly(project,options.detail),factor=10/scale,origin={x:210,y:132},point=(x,y)=>({x:origin.x+x*factor,y:origin.y+y*factor}),elements=[];
  for(const [wallIndex, wall] of project.graph.walls.entries()){
    const g=wallGeometry(project.graph,wall),gap=openingRange(project.graph,wall);
    const layers=wall.role==='interior'?[{innerOffset:0,outerOffset:interiorThickness,role:'interior'}]:assembly.layers;
    const total=wall.role==='interior'?interiorThickness:assembly.totalThickness;
    for(const layer of layers){
      const inner=layer.innerOffset-total/2,outer=layer.outerOffset-total/2;
      const polygon=(start,end)=>{if(end<=start)return;elements.push({type:'polygon',points:(wall.role==='interior'?interiorWallPolygon(project.graph,wall,assembly.totalThickness):wallLayerPolygon(project.graph,wallIndex,start,end,inner,outer)).map(p=>point(p.x,p.y)),style:styleForLayer(layer)});};
      if(gap){polygon(0,gap.start);polygon(gap.end,g.length);}else polygon(0,g.length);
    }
    if(gap){const a=point(g.a.x+g.ux*gap.start,g.a.y+g.uy*gap.start),b=point(g.a.x+g.ux*gap.end,g.a.y+g.uy*gap.end);elements.push({type:'line',x1:a.x,y1:a.y,x2:b.x,y2:b.y,style:'window'});}
    if(options.dimensions){const a=point(g.a.x,g.a.y),b=point(g.b.x,g.b.y),mid=point((g.a.x+g.b.x)/2+g.nx*70,(g.a.y+g.b.y)/2+g.ny*70);elements.push({type:'line',x1:a.x,y1:a.y,x2:b.x,y2:b.y,style:'dimension-line'});elements.push({type:'text',x:mid.x,y:mid.y,text:String(Math.round(g.length)),style:'dimension-label',anchor:'middle'});}
  }
  for(const room of recognizeRooms(project.graph)){const center={x:room.points.reduce((sum,p)=>sum+p.x,0)/room.points.length,y:room.points.reduce((sum,p)=>sum+p.y,0)/room.points.length},p=point(center.x,center.y);elements.push({type:'text',x:p.x,y:p.y,text:`${room.area.toFixed(1)} m²`,style:'room-data',anchor:'middle'});}
  elements.push({type:'north-arrow',x:395,y:28});
  const titleY=PAPER.height-PAPER.titleHeight;
  elements.push({type:'line',x1:12,y1:titleY,x2:408,y2:titleY,style:'title-line'});
  elements.push({type:'text',x:12,y:titleY+7,text:'GyuriCAD — Falgráf',style:'title-primary'});
  elements.push({type:'text',x:12,y:titleY+15,text:'Alaprajz',style:'title-secondary'});
  elements.push({type:'text',x:342,y:titleY+7,text:`M 1:${scale}`,style:'title-primary'});
  elements.push({type:'text',x:342,y:titleY+15,text:options.detail==='resolved'?'Rétegrendi feloldás':'Szerkezeti feloldás',style:'title-secondary'});
  return{paper:PAPER,scale,elements};
}
