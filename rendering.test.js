import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,evaluate,ready,reduce} from './engine.js';
import {formatted,activeStages} from './presentation.js';
import {createAnswerRound} from './answers.js';
import {createExpressionGenerator} from './generator.js';
const clean=s=>s.replace(/ data-id="[^"]*"| tabindex="[^"]*"| role="[^"]*"| aria-label="[^"]*"/g,'');
test('interactive and saved math share identical layout for all notation combinations',()=>{
 for(const text of ['2(3+4)-7','2^3-4+3*2','(38+34)/3+3^2','2[3+(5-2)^2]-8','-2(3+4)','(2+3)/(4+5)'])
 for(const fractionBars of [false,true])for(const multiplicationStyle of ['times','dot','parentheses']){
  const tree=parse(text),options={fractionBars,multiplicationStyle};
  assert.equal(clean(formatted(tree,{...options,interactive:true})),formatted(tree,options));
 }
});
test('all numeric tokens retain interactive IDs including exponents and distributable signs',()=>{
 const s=formatted(parse('-2(3+4)+3^2'),{interactive:true});
 assert.match(s,/data-id="minus:/);assert.match(s,/class="math-exponent"/);assert.match(s,/aria-label="Exponent 2"/);
 assert.ok(!formatted(parse('2+3')).includes('data-id'));
});
test('notation toggles are independent',()=>{
 for(const fractionBars of [false,true])for(const multiplicationStyle of ['times','dot','parentheses']){
  const s=formatted(parse('2*3+4/2'),{fractionBars,multiplicationStyle});
  assert.equal(s.includes('class="fraction"'),fractionBars);
  assert.equal(s.includes('>×</span>'),multiplicationStyle==='times');
  assert.equal(s.includes('>·</span>'),multiplicationStyle==='dot');
  assert.equal(s.includes('proximity-product'),multiplicationStyle==='parentheses');
 }
});
test('independent legal operations remain available',()=>{
 const tree=parse('2+3+4*5');assert.deepEqual(ready(tree).map(n=>n.op),['+','*']);assert.deepEqual([...activeStages(tree)],['A','M']);
 for(const move of ready(tree))assert.equal(evaluate(reduce(structuredClone(tree),move.id)),evaluate(tree));
 assert.deepEqual(ready(parse('2+3*4')).map(n=>n.op),['*']);
});
test('generated expressions finish through arbitrary valid branches',()=>{
 const next=createExpressionGenerator();
 for(let level=1;level<=4;level++)for(let i=0;i<30;i++){
  let tree=parse(next(level).text),value=evaluate(tree),steps=0;
  while(tree.type!=='number'){const moves=ready(tree);assert.ok(moves.length);tree=reduce(tree,moves.at(-1).id);assert.ok(Math.abs(evaluate(tree)-value)<1e-8);assert.ok(++steps<50);}
 }
});
test('answer rounds accept correct values and reveal after two incorrect values',()=>{
 assert.equal(createAnswerRound(6).submit('6').status,'correct');const r=createAnswerRound(6);assert.equal(r.submit('5').status,'retry');assert.equal(r.submit('4').status,'reveal');
});
