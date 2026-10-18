let uid=0;
const number=v=>({type:'number',value:v,id:++uid});
export function parse(text){
 text=text.replace(/[×xX]/g,'*').replace(/÷/g,'/').replace(/[−–]/g,'-').replace(/[²³]/g,c=>'^'+(c==='²'?2:3));
 let raw=text.match(/\d+(?:\.\d+)?|[+*/^(){}\[\]-]|\S/g)||[], ts=[];
 for(let i=0;i<raw.length;i++){
  let t=raw[i],prev=raw[i-1];
  if(i && /[)\]}]/.test(prev) && /^\d/.test(t))ts.push('^');
  else if(i && ((/^\d/.test(prev)||/[)\]}]/.test(prev)) && /[([{]/.test(t)))ts.push('*');
  ts.push(t);
 }
 let pos=0; const peek=()=>ts[pos];
 function atom(){let t=ts[pos++];if(t===undefined)throw Error('Finish the expression first.');
 if(/^\d+(\.\d+)?$/.test(t))return number(Number(t));
 if('([{'.includes(t)){let child=expr(0),close={'(':')','[':']','{':'}'}[t];if(ts[pos++]!==close)throw Error('Check the grouping symbols.');return {type:'group',child,open:t,close,id:++uid};}
 if(t==='-'||t==='+'){return {type:'unary',sign:t,child:expr(25),id:++uid};}
 throw Error('Use numbers, operation signs, and grouping symbols only.');}
 const prec={'+':10,'-':10,'*':20,'/':20,'^':30};
 function expr(min){let a=atom();while(prec[peek()]>=min){let op=ts[pos++],b=expr(prec[op]+(op==='^'?0:1));a={type:'binary',left:a,right:b,op,id:++uid};}return a;}
 if(!ts.length)throw Error('Enter an expression.'); if(ts.length>100)throw Error('Try a shorter expression.');
 let root=expr(0);if(pos!==ts.length)throw Error('Check the expression for a missing operation.');
 const value=evaluate(root);if(!Number.isFinite(value)||Math.abs(value)>1e9)throw Error('Use an expression with a finite result smaller than one billion.');return normalize(root);
}
export function evaluate(n){if(n.type==='number')return n.value;if(n.type==='group')return evaluate(n.child);if(n.type==='unary')return (n.sign==='-'?-1:1)*evaluate(n.child);let a=evaluate(n.left),b=evaluate(n.right);return ({'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b,'^':()=>a**b})[n.op]();}
export function normalize(n){if(n.type==='group'){n.child=normalize(n.child);if(n.child.type==='number')return n.child;}if(n.type==='unary'){n.child=normalize(n.child);if(n.child.type==='number')return number(evaluate(n));}if(n.type==='binary'){n.left=normalize(n.left);n.right=normalize(n.right);}return n;}
export function ready(root){let candidates=[];function walk(n,depth=0){if(n.type==='binary'){if(n.left.type==='number'&&n.right.type==='number')candidates.push({n,depth,priority:n.op==='^'?3:'*/'.includes(n.op)?2:1});else{walk(n.left,depth);walk(n.right,depth);}}else if(n.child)walk(n.child,depth+(n.type==='group'?1:0));}walk(root);if(!candidates.length)return [];let depth=Math.max(...candidates.map(c=>c.depth));candidates=candidates.filter(c=>c.depth===depth);let priority=Math.max(...candidates.map(c=>c.priority));return candidates.filter(c=>c.priority===priority).map(c=>c.n);}
export function reduce(root,id){if(root.id===id)return number(evaluate(root));if(root.type==='binary'){root.left=reduce(root.left,id);root.right=reduce(root.right,id);}else if(root.child)root.child=reduce(root.child,id);return normalize(root);}
const binary=(op,left,right)=>({type:'binary',op,left,right,id:++uid});
function negateSum(n){
 if(n.type==='number')return number(-n.value);
 if(n.type==='unary')return n.sign==='-'?n.child:negateSum(n.child);
 if(n.type==='binary'&&(n.op==='+'||n.op==='-'))return binary(n.op==='+'?'-':'+',negateSum(n.left),n.right);
 if(n.type==='binary'&&n.op==='*')return binary('*',negateSum(n.left),n.right);
 return {type:'unary',sign:'-',child:n,id:++uid};
}
export function distributions(root){
 const out=[];
 const eligible=g=>g?.type==='group'&&g.child.type==='binary'&&'+-'.includes(g.child.op);
 function visit(n){
  if(n.type==='unary'&&n.sign==='-'&&eligible(n.child))out.push({kind:'distribute',sourceId:`minus:${n.id}`,groupId:n.child.id,nodeId:n.id,mode:'unary',group:n.child});
  if(n.type==='binary'){
   if(n.op==='*'&&n.left.type==='number'&&n.left.value<0&&eligible(n.right))out.push({kind:'distribute',sourceId:`minus:${n.left.id}`,groupId:n.right.id,nodeId:n.id,mode:'factor',group:n.right});
   if(n.op==='-'&&eligible(n.right))out.push({kind:'distribute',sourceId:`minus:${n.id}`,groupId:n.right.id,nodeId:n.id,mode:'subtract',group:n.right});
   visit(n.left);visit(n.right);
  }else if(n.child)visit(n.child);
 }
 visit(root);return out;
}
export function distributionMove(root,a,b){
 function contains(n,id){return n.id===id||(n.type==='binary'&&(contains(n.left,id)||contains(n.right,id)))||(n.child&&contains(n.child,id));}
 return distributions(root).find(move=>{const target=a===move.sourceId?b:b===move.sourceId?a:null;return target!==null&&(target===`group:${move.groupId}`||(typeof target==='number'&&contains(move.group,target)));});
}
export function distribute(root,move){
 if(root.id===move.nodeId){
  if(move.mode==='unary'){root.child.child=negateSum(root.child.child);return normalize(root.child);}
  root.right.child=negateSum(root.right.child);
  if(move.mode==='factor')root.left=number(-root.left.value);else root.op='+';
  return normalize(root);
 }
 if(root.type==='binary'){root.left=distribute(root.left,move);root.right=distribute(root.right,move);}else if(root.child)root.child=distribute(root.child,move);
 return normalize(root);
}
export const fmt=v=>Number.isInteger(v)?String(v):String(Number(v.toPrecision(10)));
export function label(n){if(n.type==='number')return fmt(n.value);if(n.type==='group')return n.open+label(n.child)+n.close;if(n.type==='unary')return n.sign+label(n.child);return label(n.left)+({'*':' × ','/':' ÷ ','^':'^','+':' + ','-':' − '}[n.op])+label(n.right);}
export function stage(n){let groups=[];function walk(t,depth=0){if(t.type==='group'){groups.push({node:t,depth:depth+1});walk(t.child,depth+1);}else if(t.type==='binary'){walk(t.left,depth);walk(t.right,depth);}else if(t.child)walk(t.child,depth);}walk(n);if(groups.length)return 'G';let r=ready(n);if(r.some(t=>t.op==='^'))return 'E';if(r.some(t=>'*/'.includes(t.op)))return 'MD';return n.type==='number'?'done':'AS';}
