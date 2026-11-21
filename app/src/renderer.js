const INK='#16121c';
const PALETTES={
  orchid:{top:'#282544',mid:'#df607e',bottom:'#ff9c6d',wash:'#b779d4'},
  heatwave:{top:'#51282e',mid:'#ee694c',bottom:'#f7ba75',wash:'#f39c6a'},
  deepsea:{top:'#102f45',mid:'#367e93',bottom:'#f17f72',wash:'#48bfc7'},
};
const TONES={rose:{color:'#e76f8a',alpha:.19},aqua:{color:'#38bec3',alpha:.19},gold:{color:'#f6b95b',alpha:.17},noir:{color:'#5d4e99',alpha:.22}};

function dimensions(format){
  if(format==='square')return {w:1080,h:1080};
  if(format==='portrait')return {w:1080,h:1350};
  return {w:1920,h:1080};
}

function panelShapes(w,h,count,layout){
  const n=layout==='split'?2:layout==='four'?4:3;
  const skew=layout==='split'?.055:layout==='four'?.025:.045;
  const cuts=Array.from({length:n+1},(_,i)=>i/n);
  return Array.from({length:n},(_,i)=>{
    const left=cuts[i]*w,right=cuts[i+1]*w;
    const dx=skew*w;
    const topLeft=i===0?0:left+dx*.52,topRight=i===n-1?w:right+dx*.52;
    const bottomLeft=i===0?0:left-dx*.48,bottomRight=i===n-1?w:right-dx*.48;
    return [[topLeft,0],[topRight,0],[bottomRight,h],[bottomLeft,h]];
  });
}

function pathPolygon(ctx,poly){ctx.beginPath();ctx.moveTo(poly[0][0],poly[0][1]);for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i][0],poly[i][1]);ctx.closePath();}
function imageFor(images,panel){return images.get(panel.photo)||images.get('samples/boulevard.jpg')||images.values().next().value||null;}
function fitPanelImage(ctx,img,poly,panel,w,h){
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  const x=Math.min(...xs),y=Math.min(...ys),bw=Math.max(...xs)-x,bh=Math.max(...ys)-y;
  if(!img||!img.complete||!img.naturalWidth){ctx.fillStyle=INK;ctx.fillRect(x,y,bw,bh);return;}
  const scale=Math.max(bw/img.naturalWidth,bh/img.naturalHeight)*(panel.zoom||1);
  const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  // Pan values stay normalized to the full crop range; half the overflow keeps every
  // crop inside the panel while the image is dragged right to its edge.
  const dx=x+(bw-dw)/2+(dw-bw)*(panel.panX||0)*.5,dy=y+(bh-dh)/2+(dh-bh)*(panel.panY||0)*.5;
  pathPolygon(ctx,poly);ctx.save();ctx.clip();
  ctx.filter='saturate(1.14) contrast(1.08)';ctx.drawImage(img,dx,dy,dw,dh);ctx.filter='none';
  const tone=TONES[panel.tone]||TONES.rose;
  ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=tone.alpha;ctx.fillStyle=tone.color;ctx.fillRect(x,y,bw,bh);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  const light=ctx.createLinearGradient(x,y,x+bw,y+bh);
  light.addColorStop(0,'rgba(255,209,187,.15)');light.addColorStop(.38,'rgba(232,106,156,.04)');light.addColorStop(1,'rgba(18,17,42,.29)');
  ctx.fillStyle=light;ctx.fillRect(x,y,bw,bh);ctx.restore();
}

function letterspaced(ctx,text,x,y,maxWidth,spacing,fontSize){
  const str=(text||'').trim().toUpperCase();if(!str)return;
  let size=fontSize,measured;
  const set=()=>{ctx.font=`900 ${size}px Arial,Helvetica,sans-serif`;measured=[...str].reduce((n,c)=>n+ctx.measureText(c).width,0)+Math.max(0,str.length-1)*spacing;};
  set();while(measured>maxWidth&&size>22){size-=2;set();}
  const squeeze=Math.min(1,maxWidth/measured);ctx.save();ctx.translate(x,y);ctx.scale(squeeze,1);
  let at=-measured/2;ctx.textAlign='left';ctx.textBaseline='alphabetic';
  for(const char of str){ctx.lineJoin='round';ctx.strokeStyle='#170f1b';ctx.lineWidth=Math.max(5,size*.045);ctx.shadowColor='rgba(18,8,20,.55)';ctx.shadowBlur=size*.14;ctx.shadowOffsetY=size*.04;ctx.strokeText(char,at,0);ctx.shadowBlur=0;const grad=ctx.createLinearGradient(0,-size,0,size*.14);grad.addColorStop(0,'#fff7ed');grad.addColorStop(.68,'#fff0e1');grad.addColorStop(1,'#ffd0c4');ctx.fillStyle=grad;ctx.fillText(char,at,0);at+=ctx.measureText(char).width+spacing;}
  ctx.restore();
}

function label(ctx,text,x,y,size,color='#fff4e9',spacing=2){
  ctx.save();ctx.font=`700 ${size}px Arial,Helvetica,sans-serif`;ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='middle';
  let at=x;for(const c of text.toUpperCase()){ctx.fillText(c,at,y);at+=ctx.measureText(c).width+spacing;}ctx.restore();
}

function drawBackdrop(ctx,w,h,palette){
  const p=PALETTES[palette]||PALETTES.orchid;
  const top=ctx.createLinearGradient(0,0,0,h*.72);top.addColorStop(0,p.top);top.addColorStop(.56,'rgba(18,15,27,.06)');top.addColorStop(1,'rgba(19,14,26,.13)');
  ctx.fillStyle=top;ctx.fillRect(0,0,w,h);
  const dusk=ctx.createLinearGradient(0,h*.45,0,h);dusk.addColorStop(0,'rgba(23,13,31,0)');dusk.addColorStop(.39,'rgba(36,13,34,.19)');dusk.addColorStop(.72,p.mid+'cc');dusk.addColorStop(1,'rgba(21,13,29,.98)');ctx.fillStyle=dusk;ctx.fillRect(0,0,w,h);
  const side=ctx.createLinearGradient(0,0,w,0);side.addColorStop(0,'rgba(16,13,28,.31)');side.addColorStop(.22,'rgba(16,13,28,0)');side.addColorStop(.8,'rgba(16,13,28,0)');side.addColorStop(1,'rgba(16,13,28,.35)');ctx.fillStyle=side;ctx.fillRect(0,0,w,h);
}

function drawGuides(ctx,w,h){
  const m=w*.028;ctx.save();ctx.strokeStyle='rgba(255,239,221,.68)';ctx.lineWidth=Math.max(2,w*.0013);ctx.strokeRect(m,m,w-2*m,h-2*m);
  const r=h*.008;ctx.fillStyle='#ffe5c8';for(const [x,y]of[[m,m],[w-m,m],[m,h-m],[w-m,h-m]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  // Three offset registration bars give the poster an original printed-object signature.
  ctx.globalAlpha=.64;ctx.fillRect(m,m+h*.019,w*.055,h*.003);ctx.globalAlpha=.28;ctx.fillRect(m,m+h*.026,w*.034,h*.002);ctx.restore();
}

function drawTexture(ctx,w,h){
  // A small deterministic stipple softens the digital gradients without a downloaded texture.
  ctx.save();ctx.globalAlpha=.10;ctx.fillStyle='#fff5de';
  let seed=18471;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const count=Math.round(w*h/8200);for(let i=0;i<count;i++){const x=rand()*w,y=rand()*h,s=rand()*Math.max(1,w*.0012);ctx.fillRect(x,y,s,s);}
  ctx.restore();
}

function drawDossierMark(ctx,w,h){
  const s=w*.018,x=w*.034,y=h*.075;ctx.save();ctx.translate(x,y);ctx.rotate(-.08);
  ctx.strokeStyle='rgba(255,226,205,.88)';ctx.lineWidth=Math.max(2,w*.0012);ctx.strokeRect(-s*.56,-s*.56,s*1.12,s*1.12);
  ctx.fillStyle='#ff987e';ctx.font=`italic ${s*.92}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('A',0,s*.03);
  ctx.restore();
}

function drawArtwork(canvas,model,images){
  const {w,h}=dimensions(model.format);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d',{alpha:false});ctx.clearRect(0,0,w,h);ctx.fillStyle=INK;ctx.fillRect(0,0,w,h);
  const shapes=panelShapes(w,h,model.panels.length,model.layout);
  model.panels.slice(0,shapes.length).forEach((panel,i)=>fitPanelImage(ctx,imageFor(images,panel),shapes[i],panel,w,h));
  // The split-color wash, inset keylines and controlled halo unify each independent photograph.
  drawBackdrop(ctx,w,h,model.palette);
  const gap=Math.max(5,w*.0042);ctx.save();ctx.lineJoin='bevel';ctx.lineCap='butt';ctx.strokeStyle='#ffecd8';ctx.lineWidth=gap;ctx.shadowColor='rgba(255,104,124,.75)';ctx.shadowBlur=w*.009;
  for(let i=1;i<shapes.length;i++){ctx.beginPath();ctx.moveTo(shapes[i][0][0],0);ctx.lineTo(shapes[i][3][0],h);ctx.stroke();}ctx.restore();
  // Fine horizon ticks, celestial arcs and crop-safe trim are all drawn from the app's own geometry.
  ctx.save();ctx.globalAlpha=.73;ctx.strokeStyle='rgba(255,224,205,.72)';ctx.lineWidth=Math.max(2,w*.0008);
  for(let i=0;i<9;i++){const x=w*.038+i*w*.009;ctx.beginPath();ctx.moveTo(x,h*.16);ctx.lineTo(x,h*(i%3===0?.185:.173));ctx.stroke();}
  const sunX=w*.79,sunY=h*.22,sunR=h*.058;ctx.strokeStyle='rgba(255,224,192,.46)';ctx.lineWidth=Math.max(2,w*.0014);ctx.beginPath();ctx.arc(sunX,sunY,sunR,Math.PI*1.06,Math.PI*1.91);ctx.stroke();ctx.beginPath();ctx.arc(sunX,sunY,sunR*.82,Math.PI*1.06,Math.PI*1.91);ctx.stroke();
  ctx.restore();
  drawDossierMark(ctx,w,h);
  const margin=w*.045,top=h*.075;
  label(ctx,'AFTERGLOW   /   CITY FILE 06',margin,top,w*.011,'#fff0e5',w*.0027);
  ctx.save();ctx.textAlign='right';ctx.textBaseline='middle';ctx.font=`700 ${w*.009}px Arial,Helvetica,sans-serif`;ctx.fillStyle='#ffe8dc';ctx.globalAlpha=.9;ctx.fillText('A STORY IN THREE ACTS',w-margin,top);ctx.restore();
  const titleY=h*.79, title=String(model.headline||'').trim();
  if(model.guides){ctx.save();ctx.strokeStyle='rgba(255,225,215,.28)';ctx.lineWidth=Math.max(2,w*.001);ctx.beginPath();ctx.moveTo(margin,h*.705);ctx.lineTo(w-margin,h*.705);ctx.stroke();ctx.restore();}
  label(ctx,'A LITTLE TROUBLE LOOKS GOOD ON YOU',margin,h*.705,w*.0095,'#ffe7df',w*.0021);
  letterspaced(ctx,title,w/2,titleY,w*.88,w*.012,h*.158);
  const sub=String(model.subtitle||'').trim().toUpperCase();
  if(sub){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${w*.014}px Arial,Helvetica,sans-serif`;ctx.fillStyle='#fff2e8';ctx.globalAlpha=.94;ctx.fillText(sub,w/2,h*.842);ctx.restore();}
  const footerY=h*.929;label(ctx,'ISSUE 06  ·  LAST LIGHT',margin,footerY,w*.008,'rgba(255,240,222,.78)',w*.0015);
  ctx.save();ctx.fillStyle='#ffd2be';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${w*.013}px Georgia,serif`;ctx.fillText('✳',w/2,footerY);ctx.restore();
  ctx.save();ctx.textAlign='right';ctx.textBaseline='middle';ctx.font=`700 ${w*.008}px Arial,Helvetica,sans-serif`;ctx.fillStyle='rgba(255,240,222,.78)';ctx.fillText('NO RULES AFTER SUNSET',w-margin,footerY);ctx.restore();
  drawTexture(ctx,w,h);if(model.guides)drawGuides(ctx,w,h);
}

window.AfterglowRenderer={drawArtwork,dimensions,panelShapes};
