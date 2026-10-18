import {fmt,ready} from './engine.js';
const colors={'+':'add','-':'subtract','*':'multiply','/':'divide','^':'exponent'};
const symbols={'+':'+','-':'−','*':'×','/':'÷'};
export const ungroup=n=>n.type==='group'?n.child:n;
export const proximityNeedsParens=n=>n.type!=='group'&&!(n.type==='binary'&&n.op==='^'&&n.left.type==='group');
export function formatted(n,fractionBars=false,multiplicationGrouping=false){
 if(n.type==='number')return `<span class="math-number">${fmt(n.value)}</span>`;
 if(n.type==='group')return `<span class="math-group${multiplicationGrouping?' multiplication-group':''}"><span class="paren">${n.open}</span><span class="math-row">${formatted(n.child,fractionBars)}</span><span class="paren">${n.close}</span></span>`;
 if(n.type==='unary')return n.sign+formatted(n.child,fractionBars);
 if(n.op==='/'&&fractionBars)return `<span class="fraction"><span class="numerator math-row">${formatted(ungroup(n.left),true)}</span><span class="denominator math-row">${formatted(ungroup(n.right),true)}</span></span>`;
 if(n.op==='^')return `<span class="power-expression">${n.left.type==='number'&&n.left.value<0?'('+formatted(n.left,fractionBars)+')':formatted(n.left,fractionBars,multiplicationGrouping)}<sup>${formatted(n.right,fractionBars)}</sup></span>`;
 if(n.op==='*'&&fractionBars){let right=formatted(n.right,true,true);if(proximityNeedsParens(n.right))right=`<span class="math-group multiplication-group"><span class="paren">(</span><span class="math-row">${right}</span><span class="paren">)</span></span>`;return `<span class="math-row proximity-product">${formatted(n.left,true,true)}${right}</span>`;}
 return formatted(n.left,fractionBars)+` <span class="op ${colors[n.op]}">${symbols[n.op]}</span> `+formatted(n.right,fractionBars);
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
