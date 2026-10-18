import{parse,ready,reduce,evaluate,fmt,distributions,distributionMove,distribute}from './engine.js';
import{formatted as formatMath,activeStages,ungroup,proximityNeedsParens}from './presentation.js';
import{initLayout}from './layout.js';
import{createAnswerRound}from './answers.js';
import{createExpressionGenerator}from './generator.js';
const nextExpression=createExpressionGenerator();
let pendingAnswer=null;
let fractionBars=false;
try{fractionBars=localStorage.getItem('order-division-display')==='fraction';}catch{}
const $=id=>document.getElementById(id);let root,original='',busy=false,demonstrating=false,session=0,selected=null,moves=0,drag=null,seconds=0,ticking=false;
const colors={'+':'add','-':'subtract','*':'multiply','/':'divide','^':'exponent'},symbols={'+':'+','-':'−','*':'×','/':'÷'};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function minusToken(id){let el=span('−','minus-token');el.dataset.id=`minus:${id}`;el.tabIndex=0;el.role='button';el.setAttribute('aria-label','Drag minus to distribute');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();tap(el.dataset.id);}});return el;}
function tokens(n,parent=null,isPower=false){if(n.type==='number'){let el=document.createElement('span');el.className='num'+(isPower?' power':'');if(n.value<0)el.append(minusToken(n.id),document.createTextNode(fmt(-n.value)));else el.textContent=fmt(n.value);el.dataset.id=n.id;el.tabIndex=0;el.role='button';el.setAttribute('aria-label',(isPower?'Exponent ':'Number ')+fmt(n.value));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap(n.id);}});return [el];}
 if(n.type==='group'){let group=span('','math-group'),content=span('','math-row');group.dataset.id=`group:${n.id}`;content.append(...tokens(n.child));group.append(span(n.open,'paren'),content,span(n.close,'paren'));return [group];}
 if(n.type==='unary')return [n.sign==='-'?minusToken(n.id):span(n.sign,'op'),...tokens(n.child)];
 if(n.op==='/'&&fractionBars){let fraction=span('','fraction'),top=span('','numerator math-row'),bottom=span('','denominator math-row');top.append(...tokens(ungroup(n.left),n));bottom.append(...tokens(ungroup(n.right),n));fraction.append(top,bottom);return [fraction];}
 if(n.op==='^'){let sup=document.createElement('span');sup.className='sup';sup.append(...tokens(n.right,n,true));return [...(n.left.type==='number'&&n.left.value<0?[span('(','paren'),...tokens(n.left,n),span(')','paren')]:tokens(n.left,n)),sup];}
 if(n.op==='*'&&fractionBars){let product=span('','math-row proximity-product'),right=tokens(n.right,n),left=tokens(n.left,n);if(proximityNeedsParens(n.right)){let group=span('','math-group multiplication-group'),content=span('','math-row');content.append(...right);group.append(span('(','paren'),content,span(')','paren'));right=[group];}else for(const node of right)if(node.classList.contains('math-group'))node.classList.add('multiplication-group');for(const node of left)if(node.classList.contains('math-group'))node.classList.add('multiplication-group');product.append(...left,...right);return [product];}
 return [...tokens(n.left,n),n.op==='-'&&n.right.type==='group'?minusToken(n.id):span(symbols[n.op],'op '+colors[n.op]),...tokens(n.right,n)];}
function span(text,cls){let el=document.createElement('span');el.className=cls;el.textContent=text;return el;}
let fittedScale={key:null,size:80};
function fit(){
 const ex=$('expression'),arena=$('arena');
 if(!ex.children.length||!arena.clientWidth)return;
 const availableHeight=Math.max(32,arena.clientHeight-$('status').offsetHeight-$('answerSlot').offsetHeight-12);
 const availableWidth=ex.clientWidth-12;
 // Measure the rendered notation, including stacked fractions and powers.
 // Keep one scale through a calculation; reduce it only when notation needs room.
 function fits(size){
  ex.style.fontSize=size+'px';
  const outer=ex.getBoundingClientRect(),boxes=[...ex.children].map(el=>el.getBoundingClientRect());
  const left=Math.min(...boxes.map(r=>r.left)),right=Math.max(...boxes.map(r=>r.right));
  const top=Math.min(...boxes.map(r=>r.top)),bottom=Math.max(...boxes.map(r=>r.bottom));
  return ex.scrollWidth<=ex.clientWidth+1&&right-left<=availableWidth&&left>=outer.left+4&&right<=outer.right-4&&Math.max(ex.scrollHeight,bottom-top+24)<=availableHeight;
 }
 const work=document.querySelector('.workspace');
 const panelScale=Number(getComputedStyle(work).getPropertyValue('--panel-scale'))||1;
 const key=[session,Math.round(arena.clientWidth),Math.round(availableHeight),panelScale].join(':');
 const preferred=Math.max(16,Math.min(80*panelScale,availableHeight*.85));
 let low=16,high=Math.floor(key===fittedScale.key?Math.min(preferred,fittedScale.size):preferred);
 if(fits(high))low=high;
 else while(high-low>.5){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle;}
 const size=Math.max(16,Math.floor(low));
 fittedScale={key,size};ex.style.fontSize=size+'px';
}
function setEditorOpen(open){
 $('editor').hidden=!open;
 document.querySelector('.keyboard-panel').hidden=!open;
 $('sidebarDivider').hidden=!open;
 document.querySelector('aside').classList.toggle('steps-only',!open);
 $('custom').setAttribute('aria-expanded',String(open));
 requestAnimationFrame(fit);
}
function updateGuide(source){const stages=source&&distributions(root).some(m=>m.sourceId===source)?new Set(['G','M']):activeStages(root,fractionBars);document.querySelectorAll('[data-stage]').forEach(el=>{el.classList.toggle('active',stages.has(el.dataset.stage));el.setAttribute('aria-current',stages.has(el.dataset.stage)?'step':'false');});}
function render(old){let ex=$('expression');ex.replaceChildren(...tokens(root));ex.classList.toggle('complete',root.type==='number');fit();if(old)for(let el of ex.querySelectorAll('.num[data-id]')){let before=old.get(el.dataset.id);if(before){let r=el.getBoundingClientRect();el.animate([{transform:`translate(${before.x-r.x}px,${before.y-r.y}px)`},{transform:'translate(0,0)'}],{duration:460,easing:'cubic-bezier(.22,1,.36,1)'});}}
 updateGuide();
 $('status').textContent=root.type==='number'?'Complete. Every move accounted for.':demonstrating?'Watch the parts move together.':'Drag two numbers together to combine them.';
 $('modeTag').textContent=demonstrating?'DEMONSTRATION':root.type==='number'?'COMPLETE':'PRACTICE';}
function pair(a,b){return distributionMove(root,a,b)||ready(root).find(n=>(n.left.id===a&&n.right.id===b)||(n.left.id===b&&n.right.id===a));}
function elFor(id){return $('expression').querySelector(`[data-id="${id}"]`);}
function tap(id){if(busy||demonstrating||pendingAnswer)return;if(selected===null){selected=id;elFor(id)?.classList.add('selected');updateGuide(id);}else{let op=pair(selected,id);document.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));selected=null;if(op)requestMove(op);else updateGuide();}}
function snapshot(){return new Map([...$('expression').querySelectorAll('.num[data-id]')].map(el=>[el.dataset.id,el.getBoundingClientRect()]));}
function formatted(n){return formatMath(n,fractionBars);}
function addStep(initial=false){const row=document.createElement('div');row.className='step';row.expressionTree=structuredClone(root);let index=span(initial?'•':String(moves),'step-index');let expression=document.createElement('span');expression.className='step-expression';expression.innerHTML=formatted(root);row.append(index,expression);$('steps').append(row);row.scrollIntoView({block:'nearest',behavior:'smooth'});$('stepCount').textContent=moves+' move'+(moves===1?'':'s');return row;}
function clearAnswer(){
 pendingAnswer=null;$('answerForm').hidden=true;
 $('answerFeedback').textContent='';$('answerInput').value='';
 $('answerInput').disabled=false;$('answerSubmit').disabled=false;
 $('answerInput').removeAttribute('aria-invalid');
 document.querySelectorAll('.awaiting-answer').forEach(el=>el.classList.remove('awaiting-answer'));
}
function requestMove(op){
 if(busy||pendingAnswer)return;
 if(op.kind==='distribute'||demonstrating){perform(op);return;}
 const a=elFor(op.left.id),b=elFor(op.right.id);if(!a||!b)return;
 selected=null;document.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
 a.classList.add('awaiting-answer');b.classList.add('awaiting-answer');
 pendingAnswer={op,epoch:session,round:createAnswerRound(evaluate(op))};
 $('answerQuestion').textContent=`${fmt(op.left.value)} ${op.op==='^'?'to the power of':symbols[op.op]} ${fmt(op.right.value)} =`;
 $('answerFeedback').textContent='Enter the value of the highlighted parts.';
 $('answerForm').hidden=false;$('answerInput').focus({preventScroll:true});
 $('status').textContent='The expression stays here while you work out this step.';
}
$('answerForm').addEventListener('submit',async e=>{
 e.preventDefault();const pending=pendingAnswer;if(!pending||$('answerInput').disabled)return;
 const result=pending.round.submit($('answerInput').value);
 if(result.status==='invalid'){
  $('answerFeedback').textContent='Enter a number, decimal, or fraction.';$('answerInput').focus();return;
 }
 if(result.status==='retry'){
  $('answerInput').setAttribute('aria-invalid','true');
  $('answerFeedback').textContent='Not quite. Try once more.';$('answerInput').select();return;
 }
 if(!['correct','reveal'].includes(result.status))return;
 $('answerInput').disabled=true;$('answerSubmit').disabled=true;
 $('answerInput').removeAttribute('aria-invalid');
 const answer=fmt(evaluate(pending.op));
 $('answerInput').value=answer;
 $('answerFeedback').textContent=result.status==='correct'?'Correct. Combining…':`The value is ${answer}. Watch these parts combine.`;
 await wait(result.status==='correct'?350:1600);
 if(pending!==pendingAnswer||pending.epoch!==session)return;
 clearAnswer();await perform(pending.op);
});
$('answerInput').addEventListener('input',()=>{$('answerInput').removeAttribute('aria-invalid');});
async function perform(op){if(op.kind==='distribute')return performDistribution(op);if(busy)return;busy=true;selected=null;let epoch=session,a=elFor(op.left.id),b=elFor(op.right.id);if(!a||!b){busy=false;return;}let ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),cx=(ar.left+ar.width/2+br.left+br.width/2)/2,cy=(ar.top+ar.height/2+br.top+br.height/2)/2;
 const animate=(el,r)=>el.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${cx-r.left-r.width/2}px,${cy-r.top-r.height/2}px) scale(.84)`,offset:.78},{transform:`translate(${cx-r.left-r.width/2}px,${cy-r.top-r.height/2}px) scale(.92)`,opacity:0}],{duration:340,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
 animate(a,ar);animate(b,br);await wait(340);if(epoch!==session)return;let old=snapshot();root=reduce(root,op.id);moves++;render(old);let result=[...$('expression').querySelectorAll('.num')].find(el=>!old.has(el.dataset.id));result?.animate([{transform:'scale(.86)'},{transform:'scale(1.08)',offset:.65},{transform:'scale(1)'}],{duration:280,easing:'ease-out'});
 await finishMove(epoch);}
async function finishMove(epoch){await wait(330);if(epoch!==session)return;let row=addStep();row.style.opacity='0';let from=$('expression').getBoundingClientRect(),to=row.querySelector('.step-expression').getBoundingClientRect();let flight=span('','flight');flight.innerHTML=formatted(root);flight.style.left=from.left+from.width/2+'px';flight.style.top=from.top+from.height/2+'px';flight.style.fontSize='22px';document.body.append(flight);let fr=flight.getBoundingClientRect(),dx=to.left-fr.left,dy=to.top-fr.top;let anim=flight.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:.9},{transform:`translate(${dx*.45}px,${dy*.45-50}px) scale(.85)`,offset:.5,opacity:.85},{transform:`translate(${dx}px,${dy}px) scale(.64)`,opacity:0}],{duration:600,easing:'cubic-bezier(.35,0,.2,1)'});await anim.finished;flight.remove();if(epoch!==session)return;row.style.opacity='1';row.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});busy=false;if(root.type==='number'){ticking=false;$('timer').classList.remove('on');}}
async function performDistribution(move){
 if(busy)return;const source=elFor(move.sourceId),group=elFor(`group:${move.groupId}`);if(!source||!group)return;
 busy=true;selected=null;const epoch=session,from=source.getBoundingClientRect(),targets=[];
 function firstNumber(n){if(n.type==='number')return n.id;if(n.child)return firstNumber(n.child);return firstNumber(n.left);}
 function terms(n){if(n.type==='binary'&&'+-'.includes(n.op)){terms(n.left);terms(n.right);}else targets.push(elFor(firstNumber(n)));}
 terms(move.group.child);source.classList.add('drag-source');group.classList.add('distribution-target');updateGuide(move.sourceId);
 const flights=[];
 for(const target of targets){if(epoch!==session)break;if(!target)continue;const to=target.getBoundingClientRect(),ghost=span('−','flight distribution-minus');ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';ghost.style.fontSize=getComputedStyle(source).fontSize;document.body.append(ghost);const dx=to.left-from.left,dy=to.top-from.top;const anim=ghost.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${dx*.5}px,${dy*.5-35}px)`,offset:.5,opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.8)`,opacity:0}],{duration:460,easing:'ease-in-out'});flights.push(anim.finished.then(()=>ghost.remove()));await wait(140);}
 await Promise.all(flights);if(epoch!==session)return;const old=snapshot();root=distribute(root,move);moves++;render(old);await finishMove(epoch);
}
function load(text,keepDemo=false){try{let next=parse(text);clearAnswer();session++;root=next;original=text;busy=false;selected=null;if(!keepDemo){demonstrating=false;$('demo').innerHTML='Show Me How <span>▷</span>';}moves=0;seconds=0;$('timerRead').textContent='0:00';$('steps').replaceChildren();$('error').textContent='';render();addStep(true);return true;}catch(e){$('error').textContent=e.message;return false;}}
function generate(){
 const {text}=nextExpression($('level').value);
 load(text);setEditorOpen(false);
}
const tokenID=id=>id.includes(':')?id:Number(id);
function dropTarget(x,y,source){let hit=document.elementFromPoint(x,y)?.closest('#expression [data-id]'),first=hit;while(hit&&$('expression').contains(hit)){if(pair(source,tokenID(hit.dataset.id)))return hit;hit=hit.parentElement?.closest('[data-id]');}return first;}
function clearTargets(){document.querySelectorAll('.target,.distribution-target').forEach(el=>el.classList.remove('target','distribution-target'));}
$('expression').addEventListener('pointerdown',e=>{let target=e.target.closest('[data-id]');if(!target||busy||demonstrating||pendingAnswer)return;e.preventDefault();let r=target.getBoundingClientRect(),id=tokenID(target.dataset.id);drag={id,el:target,x:e.clientX,y:e.clientY,rect:r,ghost:null};updateGuide(id);$('expression').setPointerCapture(e.pointerId);});
$('expression').addEventListener('pointermove',e=>{if(!drag)return;if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){let g=drag.el.cloneNode(true);g.classList.add('drag-ghost');g.style.width=drag.rect.width+'px';g.style.height=drag.rect.height+'px';g.style.fontSize=getComputedStyle(drag.el).fontSize;document.body.append(g);drag.ghost=g;drag.el.classList.add('drag-source');}if(drag.ghost){drag.ghost.style.left=e.clientX-drag.rect.width/2+'px';drag.ghost.style.top=e.clientY-drag.rect.height/2+'px';clearTargets();let hit=dropTarget(e.clientX,e.clientY,drag.id),move=hit&&pair(drag.id,tokenID(hit.dataset.id));if(move?.kind==='distribute')elFor(`group:${move.groupId}`)?.classList.add('distribution-target');else if(move)hit.classList.add('target');}});
function release(e,cancel=false){if(!drag)return;let d=drag;drag=null;d.el.classList.remove('drag-source');clearTargets();if(d.ghost){let hit=dropTarget(e.clientX,e.clientY,d.id);d.ghost.remove();let op=hit&&!cancel?pair(d.id,tokenID(hit.dataset.id)):null;if(op)requestMove(op);else updateGuide();}else if(!cancel)tap(d.id);else updateGuide();}
$('expression').addEventListener('pointerup',release);$('expression').addEventListener('pointercancel',e=>release(e,true));
$('new').onclick=generate;$('level').onchange=generate;
$('custom').onclick=()=>{setEditorOpen($('editor').hidden);if(!$('editor').hidden)$('entry').focus();};
$('start').onclick=()=>{if(load($('entry').value))setEditorOpen(false);};$('entry').addEventListener('keydown',e=>{if(e.key==='Enter')$('start').click();if(e.key==='Escape')setEditorOpen(false);});
function insert(key){if(busy||demonstrating)return;setEditorOpen(true);let input=$('entry');let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;if(key==='⌫'){if(start===end)start=Math.max(0,start-1);input.setRangeText('',start,end,'end');}else if(key==='C')input.value='';else if(key==='↵'){if(load(input.value))setEditorOpen(false);return;}else input.setRangeText(key==='x²'?'^2':key,start,end,'end');input.focus();}
for(let key of ['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','^','+','(',')','[',']','x²','C','⌫','↵']){let b=document.createElement('button');b.textContent=key;b.className='÷×−+^x²'.includes(key)?'operator':key==='↵'?'enter':'';b.setAttribute('aria-label',({'⌫':'Backspace','↵':'Use expression','C':'Clear input','x²':'Square'})[key]||key);b.onclick=()=>insert(key);$('keys').append(b);}
$('help').onclick=()=>$('helpDialog').showModal();document.querySelector('.close').onclick=()=>$('helpDialog').close();
const answerHelp=document.createElement('p');answerHelp.textContent='After dragging a valid pair together, enter its value below the expression. You have two attempts. After two incorrect answers, the correct value appears and the parts combine automatically. Decimals and fractions such as 1/2 are accepted. Show Me How demonstrates without asking for answers.';$('helpDialog').append(answerHelp);
const distributionHelp=document.createElement('p');distributionHelp.textContent='Blue parentheses indicate multiplication by proximity. Drag just the minus onto its grouping to distribute it, or tap the minus and then a number inside the group. For example, −2(3 + 4) becomes 2(−3 − 4). The new expression is saved as its own step.';$('helpDialog').append(distributionHelp);
$('timer').onclick=()=>{ticking=!ticking;$('timerRead').hidden=false;$('timer').classList.toggle('on',ticking);};setInterval(()=>{if(ticking){seconds++;$('timerRead').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}},1000);
$('demo').onclick=async()=>{if(demonstrating){demonstrating=false;session++;busy=false;render();$('demo').innerHTML='Show Me How <span>▷</span>';return;}setEditorOpen(false);let text=original;ticking=false;$('timer').classList.remove('on');load(text,true);demonstrating=true;$('demo').textContent='Stop Demo';render();let epoch=session;await wait(650);while(demonstrating&&epoch===session&&root.type!=='number'){let op=ready(root)[0];if(!op)break;let a=elFor(op.left.id),b=elFor(op.right.id);if(!a||!b)break;a.classList.add('selected');let ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();let ghost=a.cloneNode(true);ghost.className+=' drag-ghost';ghost.style.left=ar.left+'px';ghost.style.top=ar.top+'px';ghost.style.fontSize=getComputedStyle(a).fontSize;ghost.style.width=ar.width+'px';ghost.style.height=ar.height+'px';document.body.append(ghost);let animation=ghost.animate([{transform:'translate(0,0)'},{transform:`translate(${br.left-ar.left}px,${br.top-ar.top-12}px)`,offset:.75},{transform:`translate(${br.left-ar.left}px,${br.top-ar.top}px)`}],{duration:800,easing:'ease-in-out',fill:'forwards'});await animation.finished;ghost.remove();a.classList.remove('selected');if(epoch!==session)break;await perform(op);await wait(450);}if(epoch===session){demonstrating=false;$('demo').innerHTML='Show Me How <span>▷</span>';render();}};
function setDivisionDisplay(useBars){if(busy||demonstrating||pendingAnswer)return;fractionBars=useBars;selected=null;try{localStorage.setItem('order-division-display',useBars?'fraction':'sign');}catch{}syncDivisionButtons();render();for(const row of $('steps').querySelectorAll('.step'))row.querySelector('.step-expression').innerHTML=formatted(row.expressionTree);}
function syncDivisionButtons(){$('divisionSign').setAttribute('aria-pressed',String(!fractionBars));$('fractionBar').setAttribute('aria-pressed',String(fractionBars));$('fractionBar').title='Use fraction bars and parentheses to indicate multiplication, such as -2(3+4)';}
$('divisionSign').onclick=()=>setDivisionDisplay(false);$('fractionBar').onclick=()=>setDivisionDisplay(true);
syncDivisionButtons();load('2(3+4)-7');initLayout(fit,()=>!busy&&!demonstrating&&!drag);
