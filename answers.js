// A bounded answer round is separate from movement/animation so other practice
// modes can reuse the same expression engine later.
export function parseAnswer(text){
 const normalized=String(text).trim().replace(/[−–]/g,'-');
 const parts=normalized.split('/');
 if(parts.length>2||!parts.every(p=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(p.trim())))return null;
 const value=Number(parts[0])/(parts.length===2?Number(parts[1]):1);
 return Number.isFinite(value)?value:null;
}
export function createAnswerRound(expected){
 let wrong=0,finished=false;
 return {submit(text){
  if(finished)return {status:'finished',wrong};
  const value=parseAnswer(text);
  if(value===null)return {status:'invalid',wrong};
  if(Math.abs(value-expected)<=Math.max(1e-9,Math.abs(expected)*5e-10)){
   finished=true;return {status:'correct',wrong};
  }
  wrong++;
  if(wrong===2){finished=true;return {status:'reveal',wrong};}
  return {status:'retry',wrong};
 }};
}
