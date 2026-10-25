import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,gameAction,gameView} from '../dist-server/minigames.js';
const act=(g,id,type,data={},dm=false)=>gameAction(g,id,dm,{type,...data});
test('combined wall-clock clues yield exactly one accepted arrangement',()=>{
 const solutions=[];
 for(let a=1;a<=4;a++) for(let b=7;b<=10;b++) for(let c=3;c<=6;c++) {
  if((b-a+12)%12!==6 || (b-c+12)%12!==2 || c%2!==0) continue;
  for(let ma=35;ma<60;ma+=5) for(const mb of [10,15,20]) for(let mc=0;mc<60;mc+=5) {
   if((mb-ma+60)%60===30 && (mc+mb)%60===0 && (mc/5)%2===1) solutions.push([[a,ma],[b,mb],[c,mc]]);
  }
 }
 assert.equal(solutions.length,1);
 const g=newGame('unique','wallclock');
 assert.equal(act(g,'gm','start',{},true),null);
 for(const [clock,[hour,minute]] of solutions[0].entries()) assert.equal(act(g,'p','clock:set',{clock,hour,minute}),null);
 assert.equal(g.phase,'finished');
});
test('wall clocks validate times, cooperate, finish once and reset',()=>{
 const g=newGame('clock','wallclock');
 assert.ok(act(g,'p','start'));
 assert.equal(act(g,'gm','start',{},true),null);
 assert.equal(g.board.length,3);
 const initial=JSON.stringify(gameView(g,'p',false));
 assert.ok(!initial.includes('solution'));
 for(const data of [{clock:-1,hour:4,minute:20},{clock:3,hour:4,minute:20},{clock:0,hour:0,minute:20},{clock:0,hour:13,minute:20},{clock:0,hour:4,minute:60},{clock:0,hour:4,minute:1.5},{clock:0,hour:'4',minute:20}]) assert.ok(act(g,'p','clock:set',data));
 assert.ok(act(g,'p','clock:set',{clock:0,hour:5,minute:20}));
 assert.ok(act(g,'p','clock:set',{clock:0,hour:4,minute:20}));
 assert.deepEqual(g.board,['','','']);
 for(const [clock,hour,minute] of [[0,2,45],[1,8,15],[2,6,45]]) {
  assert.equal(act(g,clock===1?'q':'p','clock:set',{clock,hour,minute}),null);
  assert.equal(gameView(g,'q',false).board[clock],`${hour}:${String(minute).padStart(2,'0')}`);
 }
 assert.equal(g.phase,'finished');
 assert.ok(act(g,'p','clock:set',{clock:0,hour:4,minute:20}));
 assert.ok(act(g,'p','reset'));
 assert.equal(act(g,'gm','reset',{},true),null);
 assert.equal(act(g,'gm','start',{},true),null);
 assert.deepEqual(g.board,['','','']);
 assert.equal(g.round,2);
 assert.ok(act(newGame('other','seating'),'p','clock:set',{clock:0,hour:4,minute:20}));
});
