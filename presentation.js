import {fmt,ready} from './engine.js';
const colors={'+':'add','-':'subtract','*':'multiply','/':'divide','^':'exponent'};
const symbols={'+':'+','-':'−','*':'×','/':'÷'};
const ungroup=n=>n.type==='group'?n.child:n;
const proximityNeedsParens=n=>n.type!=='group'&&!(n.type==='binary'&&n.op==='^'&&n.left.type==='group');
// Shared markup contract: baseline rows, local powers, axis-centered fractions.
// Workspace, steps, and animation copies differ only in scale/interactivity.
export function formatted(n,{fractionBars=false,multiplicationStyle='times',interactive=false}={}){
 const data=(id,label)=>interactive?` data-id="${id}" tabindex="0" role="button" aria-label="${label}"`:'';
 const minus=id=>`<span class="minus-token"${data('minus:'+id,'Drag minus to distribute')}>−</span>`;
 function group(open,body,close,multiply=false,id=null){
  return `<span class="math-group${multiply?' multiplication-group':''}"${interactive&&id!==null?` data-id="group:${id}"`:''}><span class="paren">${open}</span><span class="math-row">${body}</span><span class="paren">${close}</span></span>`;
 }
 function render(n,multiply=false,power=false){
  if(n.type==='number')return `<span class="math-number num${power?' power':''}"${data(n.id,(power?'Exponent ':'Number ')+fmt(n.value))}>${n.value<0?minus(n.id)+fmt(-n.value):fmt(n.value)}</span>`;
  if(n.type==='group')return group(n.open,render(n.child),n.close,multiply,n.id);
  if(n.type==='unary')return (n.sign==='-'?minus(n.id):'<span class="op">+</span>')+render(n.child);
  if(n.op==='/'&&fractionBars)return `<span class="fraction"><span class="numerator math-row">${render(ungroup(n.left))}</span><span class="denominator math-row">${render(ungroup(n.right))}</span></span>`;
  if(n.op==='^'){
   const base=n.left.type==='number'&&n.left.value<0?group('(',render(n.left),')'):render(n.left,multiply);
   return `<span class="math-power">${base}<sup class="math-exponent">${render(n.right,false,true)}</sup></span>`;
  }
  if(n.op==='*'&&multiplicationStyle==='parentheses'){
   const right=proximityNeedsParens(n.right)?group('(',render(n.right),')',true):render(n.right,true);
   return `<span class="math-row proximity-product">${render(n.left,true)}${right}</span>`;
  }
  const symbol=n.op==='*'&&multiplicationStyle==='dot'?'·':symbols[n.op];
  const operator=n.op==='-'&&n.right.type==='group'?minus(n.id):`<span class="op ${colors[n.op]}">${symbol}</span>`;
  return render(n.left)+operator+render(n.right);
 }
 return `<span class="math-row">${render(n)}</span>`;
}
export function activeStages(root,fractionBars=false){
 const ops=ready(root),ids=new Set(ops.map(n=>n.id)),stages=new Set(ops.map(n=>({'^':'E','*':'M','/':'D','+':'A','-':'S'})[n.op]));
 function visit(n,grouped=false){
  if(ids.has(n.id)&&grouped)stages.add('G');
  if(n.type==='group')visit(n.child,true);
  else if(n.type==='binary'){const inside=grouped||(fractionBars&&n.op==='/');visit(n.left,inside);visit(n.right,inside);}
  else if(n.child)visit(n.child,grouped);
 }
 visit(root);return stages;
}

