import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {io} from 'socket.io-client';
test('four clients receive only assigned room and cannot act in other room',async()=>{
 const data=mkdtempSync(join(process.env.TMPDIR||tmpdir(),'coop-'));const port=45000+Math.floor(Math.random()*1000),base=`http://localhost:${port}`;
 const server=spawn(process.execPath,['dist-server/index.js'],{env:{...process.env,PORT:String(port),DATA_DIR:data},stdio:'ignore'});const sockets=[];
 try {
  for(let i=0;i<100;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  const room=await(await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  async function connect(id,gm=false){const s=io(base);sockets.push(s);const client={s,state:null};s.on('room:state',v=>client.state=v);await new Promise(r=>s.once('connect',r));await new Promise(r=>s.emit('room:join',{roomId:room.id,name:id,playerId:id,playerSecret:'secret-'+id,dmKey:gm?room.dmKey:''},r));return client;}
  const gm=await connect('gm',true),a=await connect('a'),b=await connect('b'),c=await connect('c'),d=await connect('d');
  const act=(client,p)=>new Promise(r=>client.s.emit('minigame:action',p,r));
  assert.ok((await act(gm,{type:'create',kind:'cooprooms'})).ok);
  await new Promise(r=>setTimeout(r,100));const tokenId=gm.state.minigames.find(g=>g.kind==='cooprooms').tokenId;
  assert.ok((await act(gm,{tokenId,type:'coop:assign',teams:[['a','b'],['c','d']]})).ok);
  assert.ok((await act(gm,{tokenId,type:'start'})).ok);await new Promise(r=>setTimeout(r,100));
  for(const client of [a,b]) {const view=client.state.minigames.find(g=>g.tokenId===tokenId);assert.equal(view.coop.room,'chairs');assert.ok(view.coop.crossword);assert.equal(view.coop.cipher,undefined);}
  for(const client of [c,d]) {const view=client.state.minigames.find(g=>g.tokenId===tokenId);assert.equal(view.coop.room,'cipher');assert.ok(view.coop.cipher);assert.equal(view.coop.crossword,undefined);}
  assert.ok((await act(c,{tokenId,type:'coop:seat',seat:0,name:'ANI'})).error);
  assert.ok((await act(a,{tokenId,type:'coop:crossword',id:'7M',answer:'KONSER'})).ok);await new Promise(r=>setTimeout(r,100));
  assert.ok(b.state.minigames.find(g=>g.tokenId===tokenId).coop.crossword.crosswordSolved.includes('7M'));
 }finally{sockets.forEach(s=>s.disconnect());server.kill();await new Promise(r=>server.once('exit',r));rmSync(data,{recursive:true,force:true});}
});
