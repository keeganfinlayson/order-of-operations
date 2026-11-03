export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function panelSizes(width,height,workspaceShare=.72,keyboardShare=.52,stacked=false){
 const available=Math.max(1,(stacked?height:width)-14);
 const workMin=stacked?420:320,sideMin=stacked?330:230;
 const low=Math.min(workMin,available*.55),high=Math.max(low,available-Math.min(sideMin,available*.45));
 const workspace=clamp(available*workspaceShare,low,high);
 const sidebarHeight=stacked?available-workspace:height;
 const usable=Math.max(1,sidebarHeight-14);
 const keyboard=clamp(usable*keyboardShare,Math.min(190,usable*.6),Math.max(Math.min(190,usable*.6),usable-Math.min(120,usable*.4)));
 return {workspace,keyboard,available,sidebarHeight};
}
export function fontSizes(width,height){
 const scale=clamp(Math.sqrt(Math.max(1,width*height)/(800*560)),.85,1.35);
 return {scale};
}
export function initLayout(onResize,canResize=()=>true){
 const main=document.querySelector('main'),work=document.querySelector('.workspace'),aside=document.querySelector('aside');
 const keyboard=document.querySelector('.keyboard-panel'),steps=document.querySelector('.steps-panel'),vertical=document.getElementById('workspaceDivider'),horizontal=document.getElementById('sidebarDivider');
 const media=matchMedia('(max-width:740px)');
 let state={desktop:.72,stacked:.55,keyboard:.52};
 try{let saved=JSON.parse(localStorage.getItem('order-panel-sizes'));for(let key of Object.keys(state))if(Number.isFinite(saved?.[key]))state[key]=clamp(saved[key],.1,.9);}catch{}
 let frame=0;
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;scaleFonts();});}
 function apply(){
  const r=main.getBoundingClientRect(),stacked=media.matches;
  const size=panelSizes(r.width,r.height,state[stacked?'stacked':'desktop'],state.keyboard,stacked);
  main.style.setProperty('--workspace-size',size.workspace+'px');aside.style.setProperty('--keyboard-size',size.keyboard+'px');
  vertical.setAttribute('aria-orientation',stacked?'horizontal':'vertical');
  vertical.setAttribute('aria-valuenow',String(Math.round(size.workspace/size.available*100)));
  horizontal.setAttribute('aria-valuenow',String(Math.round(size.keyboard/Math.max(1,size.sidebarHeight-14)*100)));
  schedule();
 }
 function scaleFonts(){
  let r=work.getBoundingClientRect(),fonts=fontSizes(r.width,r.height);
  work.style.setProperty('--panel-scale',fonts.scale);
  let kr=keyboard.getBoundingClientRect(),ks=clamp(Math.sqrt(kr.width*kr.height/(310*290)),.8,1.5);
  keyboard.style.setProperty('--key-scale',ks);
  let sr=steps.getBoundingClientRect(),ss=clamp(Math.sqrt(sr.width*sr.height/(310*280)),.85,1.5);
  steps.style.setProperty('--step-scale',ss);
  work.classList.toggle('compact-workspace',r.width<610);onResize();
 }
 function persist(){try{localStorage.setItem('order-panel-sizes',JSON.stringify(state));}catch{}}
 function attach(handle,side){
  let active=null;
  handle.addEventListener('pointerdown',e=>{if(!canResize()||e.button!==0)return;e.preventDefault();active=e.pointerId;handle.setPointerCapture(e.pointerId);handle.classList.add('resizing');document.body.classList.add('resizing-panels');});
  handle.addEventListener('pointermove',e=>{if(active!==e.pointerId)return;const box=(side?aside:main).getBoundingClientRect();
   if(side)state.keyboard=clamp((e.clientY-box.top)/Math.max(1,box.height-14),.1,.9);
   else state[media.matches?'stacked':'desktop']=clamp((media.matches?e.clientY-box.top:e.clientX-box.left)/Math.max(1,(media.matches?box.height:box.width)-14),.1,.9);
   apply();
  });
  function finish(e){if(active!==e.pointerId)return;active=null;handle.classList.remove('resizing');document.body.classList.remove('resizing-panels');persist();}
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
  handle.addEventListener('keydown',e=>{if(!canResize())return;let delta=({ArrowLeft:-.03,ArrowRight:.03,ArrowUp:-.03,ArrowDown:.03})[e.key];if(delta===undefined)return;e.preventDefault();let key=side?'keyboard':media.matches?'stacked':'desktop';state[key]=clamp(state[key]+delta,.1,.9);apply();persist();});
  handle.addEventListener('dblclick',()=>{if(!canResize())return;state[side?'keyboard':media.matches?'stacked':'desktop']=side ? .52 : media.matches ? .55 : .72;apply();persist();});
 }
 attach(vertical,false);attach(horizontal,true);
 const observer=new ResizeObserver(schedule);[work,keyboard,steps].forEach(el=>observer.observe(el));
 const mainObserver=new ResizeObserver(apply);mainObserver.observe(main);media.addEventListener('change',apply);window.addEventListener('resize',apply);apply();
}

