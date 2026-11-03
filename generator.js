import {parse,evaluate} from './engine.js?v=7';

// Structure and notation are independent. Each level uses a shuffled deck of
// families, with fresh small numbers on every draw and no recent exact repeats.
export const familyCount=12;
export function createExpressionGenerator(random=Math.random){
 const decks=new Map(),lastFamily=new Map(),recent=new Map();
 const int=(min,max)=>min+Math.floor(random()*(max-min+1));
 function shuffle(items){for(let i=items.length-1;i>0;i--){const j=int(0,i);[items[i],items[j]]=[items[j],items[i]];}return items;}
 function draw(level){let deck=decks.get(level);if(!deck?.length){deck=shuffle(Array.from({length:familyCount},(_,i)=>i));if(deck.at(-1)===lastFamily.get(level))[deck[0],deck[deck.length-1]]=[deck.at(-1),deck[0]];decks.set(level,deck);}const family=deck.pop();lastFamily.set(level,family);return family;}
 function build(level,family){
  const a=int(2,5),b=int(2,6),c=int(2,5),d=int(1,4),e=int(2,4);
  const group=()=>random()<.5?`(${b}+${c})`:`(${b+c}-${c})`;
  const g=group(),h=`(${d}+${e})`,square=`${int(2,5)}^2`;
  // A split sum makes exact division without copying the denominator's group.
  const total=b*c*e,part=int(2,total-2),sum=`(${part}+${total-part})`;
  const templates={
   1:[
    `${a}*${g}-${d}`,`${d}+${g}*${a}`,`${a}+(${b*c+d*c})/${c}`,
    `${a}*${b}+${c}*${d}`,`${a*b}/${b}+${c}*${e}`,
    `${sum}/${e}-${d}`,`${a*b+c}-${a}*${b}`,
    `${a}*(${b}*${c}-${d})`,`${a}*${g}+${d}*${e}`,
    `(${a*b}+${c*b})/${b}`,`${a*b+c}-${a*b}/${b}`,
    `${a*b*c}/${b}*${d}+${e}`
   ],
   2:[
    `${a}*${g}^2-${d}`,`${d}+${square}*${g}`,
    `${square}+${b}*${c}-${d}`,`${g}^2+${h}^2`,
    `${a}^3-${b}+${c}*${d}`,`(${a}^2+${b*c})/${c}+${d}`,
    `${sum}/${e}+${square}`,`${a}*(${b}^2+${c})-${d}`,
    `(${a}+${b}^2)*${c}`,`${g}^2-${a}*${b}+${d}`,
    `${a}^2*${b}+${c}^2*${d}`,`${a*b*c}/${c}+(${d}+${e})^2`
   ],
   3:[
    `${a}*[${b}+${h}^2]-${c}`,`[${a}*${g}+${d}]*${e}`,
    `${a}+[${b}*(${c}+${d})-${e}]`,`${g}*[${c}+${h}]-${a}`,
    `[${a}+(${b}*${c}-${d})]^2`,`${sum}/(${b}*${c})+${h}^2`,
    `(${a*b}+[${c}*${h}])/${b}`,`[${a}+${g}^2]/${c}+${d}`,
    `${a}*[${b}+${c}*${h}]-${d}`,`(${a}+${b})^2+[${c}*${h}]`,
    `${a*b*c}/[${b}+(${c*b-b})]+${square}`,`[${a}*${g}-${d}]+[${c}*${h}]`
   ],
   4:[
    `${a}*{${b}+[${c}+${h}]^2}-${e}*(${b}-${d})`,
    `[${a}*${g}-${d}]^2+${c}*${h}`,
    `{${a}+[${b}*(${c}+${d})]}*(${e}+${a})`,
    `[${a}+${g}^2]*[${e}+(${c}-${d})]`,
    `(${a*b*c}+${b}*[${c}+${h}])/${b}+${square}`,
    `${a}*{${b}+[${c}*(${d}+${e})-${d}]}+${square}`,
    `[${a}+${g}]*[${c}+${h}]-${e}^2`,
    `{[${a}+${g}]*${d}}^2-${b}*${h}`,
    `${sum}/[${b}*(${c+e}-${e})]+${a}*${h}^2`,
    `${a}+[(${b}+${c})^2-${d}]/${e}+${h}^2`,
    `([${a}*${g}]+[${c}*${h}])/(${d}+${e})`,
    `${a}*{[${b}+${h}]*${c}-${d}}-${e}*${g}`
   ]
  };
  return templates[level][family];
 }
 function suitable(tree){
  const value=evaluate(tree);
  if(!Number.isInteger(value)||value<0||value>500)return false;
  if(tree.type==='binary')return suitable(tree.left)&&suitable(tree.right);
  return !tree.child||suitable(tree.child);
 }
 return function nextExpression(level){
  level=Number(level);if(![1,2,3,4].includes(level))throw Error('Choose a level from 1 to 4.');
  const family=draw(level),history=recent.get(level)||[];
  for(let attempt=0;attempt<2000;attempt++){
   const text=build(level,family);
   if(!history.includes(text)&&suitable(parse(text))){history.push(text);recent.set(level,history.slice(-100));return {text,family};}
  }
  throw Error('Could not generate an expression. Please try again.');
 };
}

