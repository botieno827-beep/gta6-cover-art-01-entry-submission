const {drawArtwork:drawArtCanvas,dimensions:artworkDimensions,panelShapes:getPanelShapes}=window.AfterglowRenderer;

const canvas=document.querySelector('#artwork');
const ctx=canvas.getContext('2d');
const $=selector=>document.querySelector(selector);
const photos=[
  {id:'samples/boulevard.jpg',name:'PALM MOTEL',src:'./samples/boulevard.jpg'},
  {id:'samples/pier.jpg',name:'BLUE HOUR',src:'./samples/pier.jpg'},
];
const imageBank=new Map();
const makePanel=(photo,name)=>({photo,tone:'rose',zoom:1,panX:0,panY:0,name});
const centerPanel=makePanel(photos[1].id,'Panel two');centerPanel.tone='aqua';
const oceanPanel=makePanel(photos[1].id,'Panel three');oceanPanel.tone='gold';oceanPanel.zoom=1.28;oceanPanel.panX=-.88;
let state={format:'landscape',layout:'triptych',palette:'orchid',guides:true,headline:'NEON SAINTS',subtitle:'THE NIGHT BELONGS TO US',panels:[makePanel(photos[0].id,'Panel one'),centerPanel,oceanPanel]};
let selected=0,activePhoto=photos[0].id;
const undoStack=[],redoStack=[];
let textSnapshot=null,textTimer=0,drag=null,toastTimer=0;

function clone(value){return JSON.parse(JSON.stringify(value));}
function snapshot(){return clone(state);}
function changed(before){undoStack.push(before);if(undoStack.length>70)undoStack.shift();redoStack.length=0;syncHistoryButtons();}
function edit(fn){const before=snapshot();fn();if(JSON.stringify(before)!==JSON.stringify(state)){changed(before);paint();}}
function scheduleText(key,value){if(textSnapshot===null)textSnapshot=snapshot();state[key]=value;clearTimeout(textTimer);textTimer=setTimeout(()=>{if(JSON.stringify(textSnapshot)!==JSON.stringify(state))changed(textSnapshot);textSnapshot=null;},350);renderArtwork();updateHistoryOnly();}
function updateHistoryOnly(){syncHistoryButtons();}
function flushText(){clearTimeout(textTimer);if(textSnapshot&&JSON.stringify(textSnapshot)!==JSON.stringify(state))changed(textSnapshot);textSnapshot=null;}
function undo(){flushText();if(!undoStack.length)return;redoStack.push(snapshot());state=undoStack.pop();selected=Math.min(selected,state.panels.length-1);activePhoto=state.panels[selected]?.photo||activePhoto;$('#headline').value=state.headline;$('#subtitle').value=state.subtitle;paint();}
function redo(){flushText();if(!redoStack.length)return;undoStack.push(snapshot());state=redoStack.pop();selected=Math.min(selected,state.panels.length-1);activePhoto=state.panels[selected]?.photo||activePhoto;$('#headline').value=state.headline;$('#subtitle').value=state.subtitle;paint();}
function syncHistoryButtons(){$('#undo').disabled=undoStack.length===0;$('#redo').disabled=redoStack.length===0;}
function tell(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2500);}
function findPhoto(id){return photos.find(photo=>photo.id===id)||photos[0];}
function loadImage(photo){if(imageBank.has(photo.id))return Promise.resolve(imageBank.get(photo.id));return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{imageBank.set(photo.id,image);resolve(image);};image.onerror=()=>reject(new Error(`Could not read ${photo.name}.`));image.src=photo.src;});}

async function renderArtwork(showSelection=true){
  const loaded=new Map();
  for(const panel of state.panels){const photo=findPhoto(panel.photo);if(photo&&imageBank.has(photo.id))loaded.set(photo.id,imageBank.get(photo.id));}
  drawArtCanvas(canvas,state,loaded);
  if(showSelection&&!drag)drawSelectedOutline();
}

function drawSelectedOutline(){
  const w=canvas.width,h=canvas.height,shapes=getPanelShapes(w,h,state.panels.length,state.layout),poly=shapes[selected];if(!poly)return;
  ctx.save();ctx.beginPath();ctx.moveTo(...poly[0]);for(let i=1;i<poly.length;i++)ctx.lineTo(...poly[i]);ctx.closePath();ctx.strokeStyle='rgba(255,237,228,.42)';ctx.lineWidth=Math.max(2,w*.0013);ctx.setLineDash([w*.004,w*.003]);ctx.stroke();ctx.setLineDash([]);
  const r=w*.004;for(const [x,y]of[poly[0],poly[1],poly[2],poly[3]]){ctx.fillStyle='#ffe1cd';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}

function updatePanelUI(){
  const holder=$('#panel-list');holder.replaceChildren();
  state.panels.forEach((panel,index)=>{
    const photo=findPhoto(panel.photo),button=document.createElement('button');button.type='button';button.className=`panel-card${index===selected?' selected':''}`;button.setAttribute('aria-label',`Select panel ${index+1}, photo ${photo.name}`);button.setAttribute('aria-pressed',String(index===selected));
    const img=document.createElement('img');img.src=photo.src;img.alt='';const b=document.createElement('b');b.textContent=`PANEL 0${index+1}`;const small=document.createElement('small');small.textContent=photo.name;button.append(img,b,small);button.addEventListener('click',()=>selectPanel(index));holder.append(button);
  });
  $('#selected-label').textContent=`0${selected+1} / 0${state.panels.length}`;
  $('#selected-name').textContent=`Panel ${['one','two','three','four','five','six'][selected]||String(selected+1)}`;
  $('#selected-thumb').style.backgroundImage=`url("${findPhoto(state.panels[selected]?.photo).src}")`;
  $('#zoom').value=Math.round((state.panels[selected]?.zoom||1)*100);$('#zoom-value').textContent=`${$('#zoom').value}%`;
  document.querySelectorAll('.tone-chip').forEach(el=>el.classList.toggle('selected',el.dataset.tone===state.panels[selected]?.tone));
}

function updatePhotoTray(){
  const tray=$('#photo-tray');tray.replaceChildren();
  photos.forEach(photo=>{
    const button=document.createElement('button');button.type='button';button.className=`photo-card${photo.id===state.panels[selected]?.photo?' active':''}`;button.setAttribute('aria-label',`Use ${photo.name} in selected panel`);button.title=`Assign ${photo.name} to selected panel`;
    const img=document.createElement('img');img.src=photo.src;img.alt='';const label=document.createElement('span');label.textContent=photo.name;button.append(img,label);
    button.addEventListener('click',()=>{activePhoto=photo.id;edit(()=>{state.panels[selected].photo=photo.id;state.panels[selected].panX=0;state.panels[selected].panY=0;});tell(`${photo.name} · PANEL 0${selected+1}`);});tray.append(button);
  });
  $('#photo-count').textContent=`0${photos.length} READY`;
}

function paint(){
  const {w,h}=artworkDimensions(state.format);if(canvas.width!==w||canvas.height!==h)canvas.width=w,canvas.height=h;
  $('#canvas-size').textContent=`${w} × ${h} PX`;$('#format').value=state.format;$('#layout').value=state.layout;$('#palette').value=state.palette;if(document.activeElement!==$('#headline'))$('#headline').value=state.headline;if(document.activeElement!==$('#subtitle'))$('#subtitle').value=state.subtitle;$('#guide-lines').checked=state.guides;
  renderArtwork();updatePanelUI();updatePhotoTray();syncHistoryButtons();
}

function selectPanel(index){if(index<0||index>=state.panels.length)return;flushText();selected=index;activePhoto=state.panels[selected].photo;renderArtwork();updatePanelUI();updatePhotoTray();}
function panelAt(x,y){const shapes=getPanelShapes(canvas.width,canvas.height,state.panels.length,state.layout);for(let i=0;i<shapes.length;i++){const p=shapes[i];let inside=false;for(let a=0,b=p.length-1;a<p.length;b=a++){const [xi,yi]=p[a],[xj,yj]=p[b];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;}if(inside)return i;}return Math.min(state.panels.length-1,Math.floor(x/canvas.width*state.panels.length));}
function canvasPoint(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};}
function dragPan(){if(!drag)return;const panel=state.panels[selected],w=canvas.width,h=canvas.height,poly=getPanelShapes(w,h,state.panels.length,state.layout)[selected];if(!poly)return;const bw=Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0])),bh=h,photo=findPhoto(panel.photo),image=imageBank.get(photo.id);if(!image)return;const s=Math.max(bw/image.naturalWidth,bh/image.naturalHeight)*panel.zoom,ow=image.naturalWidth*s-bw,oh=image.naturalHeight*s-bh;panel.panX=Math.max(-.95,Math.min(.95,drag.panX+(drag.current.x-drag.start.x)/Math.max(1,ow)*2));panel.panY=Math.max(-.95,Math.min(.95,drag.panY+(drag.current.y-drag.start.y)/Math.max(1,oh)*2));}

async function addFiles(files){
  const list=[...files].filter(file=>file.type.startsWith('image/'));
  if(!list.length){tell('Choose a photo file to add.');return;}
  flushText();const before=snapshot();let added=0;
  for(const file of list){const id=`local-${crypto.randomUUID()}`,photo={id,name:file.name.replace(/\.[^.]+$/,'').slice(0,18).toUpperCase()||'MY PHOTO',src:URL.createObjectURL(file)};try{await loadImage(photo);photos.push(photo);added++;}catch{URL.revokeObjectURL(photo.src);tell(`Couldn't load ${file.name}.`);}}
  if(!added)return;
  activePhoto=photos.at(-1).id;state.panels[selected].photo=activePhoto;state.panels[selected].panX=0;state.panels[selected].panY=0;changed(before);paint();tell(`${added} LOCAL PHOTO${added===1?'':'S'} ADDED`);
}

function setPanelCount(count,layout){edit(()=>{state.layout=layout;while(state.panels.length<count)state.panels.push(makePanel(activePhoto||photos[0].id,`Panel ${state.panels.length+1}`));state.panels.length=count;selected=Math.min(selected,count-1);});}
function filename(){const {w,h}=artworkDimensions(state.format);const title=(state.headline||'Afterglow').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'afterglow';return`afterglow-${title}-${w}x${h}.png`;}

function exportArtwork(){
  flushText();renderArtwork(false);canvas.toBlob(blob=>{
    if(!blob){tell('The PNG could not be created. Try again.');return;}
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename();anchor.click();setTimeout(()=>URL.revokeObjectURL(url),3000);tell(`EXPORTED · ${artworkDimensions(state.format).w} × ${artworkDimensions(state.format).h} PNG`);renderArtwork();
    window.dispatchEvent(new CustomEvent('afterglow:exported',{detail:{width:canvas.width,height:canvas.height,bytes:blob.size,name:anchor.download}}));
  },'image/png');
}

$('#photo-import').addEventListener('change',event=>{addFiles(event.target.files);event.target.value='';});
$('#add-panel').addEventListener('click',()=>{const count=Math.min(4,state.panels.length+1);setPanelCount(count,count===2?'split':count===4?'four':'triptych');});
$('#format').addEventListener('change',event=>edit(()=>{state.format=event.target.value;}));
$('#layout').addEventListener('change',event=>{const layout=event.target.value,count=layout==='split'?2:layout==='four'?4:3;setPanelCount(count,layout);});
$('#palette').addEventListener('change',event=>edit(()=>{state.palette=event.target.value;}));
$('#headline').addEventListener('input',event=>scheduleText('headline',event.target.value));
$('#subtitle').addEventListener('input',event=>scheduleText('subtitle',event.target.value));
$('#guide-lines').addEventListener('change',event=>edit(()=>{state.guides=event.target.checked;}));
$('#zoom').addEventListener('input',event=>{if(zoomBefore===null)zoomBefore=snapshot();state.panels[selected].zoom=Number(event.target.value)/100;$('#zoom-value').textContent=`${event.target.value}%`;renderArtwork();});
$('#zoom').addEventListener('change',()=>{const before=zoomBefore;if(before)changed(before);zoomBefore=null;});
let zoomBefore=null;$('#zoom').addEventListener('pointerdown',()=>{flushText();zoomBefore=snapshot();});
document.querySelectorAll('.tone-chip').forEach(button=>button.addEventListener('click',()=>edit(()=>{state.panels[selected].tone=button.dataset.tone;})));
$('#undo').addEventListener('click',undo);$('#redo').addEventListener('click',redo);$('#export').addEventListener('click',exportArtwork);
canvas.addEventListener('pointerdown',event=>{event.preventDefault();flushText();const point=canvasPoint(event),hit=panelAt(point.x,point.y);selectPanel(hit);drag={start:point,current:point,panX:state.panels[selected].panX,panY:state.panels[selected].panY,before:snapshot(),moved:false};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(!drag)return;const next=canvasPoint(event);if(Math.hypot(next.x-drag.start.x,next.y-drag.start.y)>3)drag.moved=true;drag.current=next;if(drag.moved){dragPan();renderArtwork();}});
canvas.addEventListener('pointerup',()=>{if(!drag)return;const old=drag;if(old.moved)changed(old.before);drag=null;renderArtwork();updatePanelUI();updatePhotoTray();});
canvas.addEventListener('pointercancel',()=>{if(!drag)return;const old=drag;state=old.before;drag=null;paint();});
canvas.addEventListener('wheel',event=>{event.preventDefault();flushText();const before=snapshot();state.panels[selected].zoom=Math.max(1,Math.min(2.4,state.panels[selected].zoom+(event.deltaY<0?.05:-.05)));changed(before);paint();},{passive:false});
window.addEventListener('keydown',event=>{const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();redo();}else if(!typing&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();const before=snapshot();state.panels[selected].panX=Math.max(-.95,Math.min(.95,state.panels[selected].panX+(event.key==='ArrowRight'?.03:-.03)));changed(before);paint();}});
for(const type of ['dragenter','dragover'])document.addEventListener(type,event=>{event.preventDefault();document.body.classList.add('dragover');});
for(const type of ['dragleave','drop'])document.addEventListener(type,event=>{event.preventDefault();document.body.classList.remove('dragover');if(type==='drop')addFiles(event.dataTransfer.files);});

async function boot(){
  try{for(const photo of photos)await loadImage(photo);paint();window.afterglow={export:exportArtwork,getSize:()=>({...artworkDimensions(state.format)}),getState:()=>clone(state)};window.dispatchEvent(new Event('afterglow:ready'));}
  catch(error){tell(error.message);}
}
boot();
