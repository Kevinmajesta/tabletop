import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,gameAction,gameView} from '../dist-server/minigames.js';
const act=(g,id,type,data={},dm=false)=>gameAction(g,id,dm,{type,...data});
test('two-room puzzle enforces teams, hides other room, exchanges keys and finishes without circular locks',()=>{
 const g=newGame('c','cooprooms');
 assert.ok(act(g,'gm','start',{},true));
 assert.ok(act(g,'gm','coop:assign',{teams:[['a','b'],['b','d']]},true));
 assert.equal(act(g,'gm','coop:assign',{teams:[['a','b'],['c','d']]},true),null);
 assert.equal(act(g,'gm','start',{},true),null);
 assert.ok(act(g,'c','coop:crossword',{id:'7M',answer:'KONSER'}));
 assert.ok(act(g,'a','coop:cipher',{answer:'anything'}));
 assert.ok(act(g,'x','coop:seat',{seat:0,name:'ANI'}));
 let a=gameView(g,'a',false),b=gameView(g,'c',false),x=gameView(g,'x',false);
 assert.ok(a.coop.crossword);assert.equal(a.coop.cipher,undefined);assert.equal(b.coop.crossword,undefined);assert.equal(x.coop.cipher,undefined);assert.equal(x.coop.seats.length,0);
 assert.ok(!JSON.stringify(a).includes('KAPKG'));assert.ok(!JSON.stringify(b).includes('answer'));
 const first='HANA BERADA TIGA KURSI SEARAH JARUM JAM DARI BUDI';
 assert.equal(act(g,'c','coop:cipher',{answer:first}),null);
 assert.ok(act(g,'c','coop:cipher',{answer:'IWAN BERADA EMPAT KURSI SEARAH JARUM JAM DARI FANI DAN DODI BERADA DUA KURSI SEARAH JARUM JAM DARI BUDI'}));
 for(const id of ['7M','5T','9T','15M','12T']) {const e=g.coop.crossword.crosswordEntries.find(e=>e.id===id);assert.equal(act(g,'a','coop:crossword',{id,answer:e.answer}),null);}
 assert.equal(act(g,'c','coop:cipher',{answer:'IWAN BERADA EMPAT KURSI SEARAH JARUM JAM DARI FANI DAN DODI BERADA DUA KURSI SEARAH JARUM JAM DARI BUDI'}),null);
 assert.equal(gameView(g,'a',false).coop.clues.length,4);
 const last = gameView(g,'c',false).coop;
 assert.match(last.cipher, /Transposisi/);
 assert.doesNotMatch(last.cipher, /Vigenere/);
 assert.equal(last.fragments.length, 9);
 assert.equal(new Set(last.fragments.map(f => f.name)).size, 9);
 assert.ok(last.fragments.every(f => f.text.length > 0));
 assert.equal(gameView(g,'a',false).coop.fragments, undefined);
 assert.equal(gameView(g,'x',false).coop.fragments, undefined);
 assert.ok(act(g,'d','coop:cipher',{answer:'CAHAYA FAJAR'}));
 const alphabetical=['ANI','BUDI','CITRA','DODI','EKA','FANI','GALIH','HANA','IWAN'];
 for(const [seat,name] of alphabetical.entries())assert.equal(act(g,'b','coop:seat',{seat,name}),null);
 assert.equal(g.coop.seatDone,false);
 for(let seat=0;seat<9;seat++)act(g,'b','coop:seat',{seat,name:''});
 const names=['HANA','CITRA','IWAN','ANI','GALIH','EKA','BUDI','FANI','DODI'];
 assert.notDeepEqual(last.fragments.map(f => f.name), names);
 assert.equal(names.map(name => last.fragments.find(f => f.name === name).text).join(''), 'CAHAYAFAJAR');
 assert.doesNotMatch(gameView(g,'a',false).coop.reward || '', /Vigenere/);
 for(const [seat,name] of names.entries())assert.equal(act(g,'b','coop:seat',{seat,name}),null);
 assert.ok(gameView(g,'a',false).coop.reward);assert.equal(gameView(g,'c',false).coop.reward,undefined);
 assert.equal(act(g,'d','coop:cipher',{answer:'CAHAYA FAJAR'}),null);
 assert.ok(act(g,'a','coop:final',{answer:'CAHAYA FAJAR'}));
 for(const e of g.coop.crossword.crosswordEntries)act(g,'a','coop:crossword',{id:e.id,answer:e.answer});
 assert.equal(act(g,'a','coop:final',{answer:'CAHAYA FAJAR'}),null);assert.equal(g.phase,'finished');
 assert.equal(act(g,'gm','reset',{},true),null);assert.equal(g.coop,undefined);
});

test('actual seating constraints have one solution; neither room alone determines it',async()=>{
 const {seatRules,seatSolution}=await import('../dist-server/seat-puzzle.js');
 const names=['ANI','BUDI','CITRA','DODI','EKA','FANI','GALIH','HANA','IWAN'];
 const solutions=[],counts={chairs:0,cipher:0};let checked=0;
 function matches(rule,p){const a=p.indexOf(rule.a);if(rule.kind==='seat')return a===rule.value;const b=p.indexOf(rule.b);return rule.kind==='clockwise'?(b-a+9)%9===rule.value:Math.min((b-a+9)%9,(a-b+9)%9)===rule.value;}
 function visit(prefix,left){if(!left.length){checked++;if(seatRules.every(r=>matches(r,prefix)))solutions.push(prefix);for(const room of ['chairs','cipher'])if(seatRules.filter(r=>room==='chairs'?r.room==='chairs':r.room!=='chairs').every(r=>matches(r,prefix)))counts[room]++;return;}for(const name of left)visit([...prefix,name],left.filter(n=>n!==name));}
 visit([],names);assert.equal(checked,362880);assert.equal(solutions.length,1);assert.deepEqual(solutions[0],seatSolution);assert.ok(counts.chairs>1);assert.ok(counts.cipher>1);assert.notDeepEqual(seatSolution,names);
});
