import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as characters from '../dist-server/characters.js';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';

const zero = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
test('starting wallet uses structured coin equipment, not notes or item prices', () => {
  assert.equal(typeof characters.startingCurrency, 'function');
  assert.deepEqual(characters.startingCurrency({ equipment: [{id:'gp',count:15},{id:'sp',count:3},{id:'gp',count:5},{id:'rope',count:1}], equipmentNotes:'500 GP' }), {...zero,gp:20,sp:3});
  assert.deepEqual(characters.startingCurrency({equipment:[],equipmentNotes:'500 GP'}), zero);
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
test('wallet socket authorizes, validates atomically, synchronizes, preserves and persists balances', {timeout:30000}, async () => {
  const data = mkdtempSync(path.join(process.env.TMPDIR, 'wallet-'));
  const port = 46000 + Math.floor(Math.random()*1000), base = `http://localhost:${port}`;
  let server; const sockets=[];
  async function start() {
    server=spawn(process.execPath,['dist-server/index.js'],{env:{...process.env,PORT:String(port),DATA_DIR:data},stdio:'ignore'});
    for(let i=0;i<100;i++){try {await fetch(base);return;} catch {await delay(100);}}
    throw new Error('server did not start');
  }
  async function stop() { for(const socket of sockets)socket.disconnect(); const exited=new Promise(resolve=>server.once('exit',resolve));server.kill();await exited; }
  try {
    await start();
    const room=await(await fetch(`${base}/api/rooms`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
    async function join(id,dm=false) {
      const socket=io(base);sockets.push(socket);let state;
      socket.on('room:state',s=>state=s);
      await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
      const result=await new Promise(resolve=>socket.emit('room:join',{roomId:room.id,name:id,playerId:id,playerSecret:`secret-${id}`,dmKey:dm?room.dmKey:''},resolve));
      assert.ok(!result.error);await delay(40);return {socket,get state(){return state;}};
    }
    let owner=await join('owner'),dm=await join('dm',true);const other=await join('other');
    const action=(who,payload)=>new Promise((resolve,reject)=>who.socket.timeout(3000).emit('character:action',payload,(err,result)=>err?reject(err):resolve(result)));
    const build={...characters.emptyBuild(),name:'Wallet hero'};
    for(let i=0;i<6;i++)for(const group of characters.buildGroups(build))if(!build.choices[group.key]){
      const used=Object.values(build.choices).flat();build.choices[group.key]=group.options.filter(o=>!['skill','language'].includes(group.kind)||!used.includes(o.id)).slice(0,group.count).map(o=>o.id);
    }
    build.choices['background.bonus.one']=['wis'];assert.deepEqual(characters.validateBuild(build).errors,[]);
    const created=await action(owner,{type:'create',build,currency:{...zero,gp:999999}});assert.equal(created.ok,true);await delay(50);
    const id=created.id, current=()=>owner.state.characters.find(c=>c.id===id);
    assert.deepEqual(current().currency,characters.startingCurrency(current().sheet));
    const wallet={cp:12,sp:34,ep:5,gp:67,pp:8};
    const set=(who,currency,revision=current().revision,extra={})=>action(who,{type:'currency',id,revision,currency,...extra});
    assert.ok((await set(other,wallet)).error);
    assert.ok((await action(owner,{type:'currency',id:'missing',revision:1,currency:wallet})).error);
    for(const invalid of [null,[],{}, {...wallet,cp:-1},{...wallet,sp:0.5},{...wallet,gp:Infinity},{...wallet,pp:Number.MAX_SAFE_INTEGER+1},{...wallet,cp:'2'},{...wallet,gold:2},{...wallet,hp:99}]){
      const before=structuredClone(current());assert.ok((await set(owner,invalid)).error);await delay(10);assert.deepEqual(current(),before);
    }
    const revision=current().revision;
    assert.equal((await set(owner,wallet,revision,{ownerId:'other',hp:999})).ok,true);await delay(50);
    assert.equal(current().ownerId,'owner');assert.notEqual(current().hp,999);assert.deepEqual(current().currency,wallet);
    assert.deepEqual(dm.state.characters[0].currency,wallet);assert.equal(other.state.characters.length,0);
    assert.ok((await set(owner,zero,revision)).error);
    assert.equal((await set(dm,{...wallet,cp:13})).ok,true);await delay(50);
    const expected={...wallet,cp:13};
    assert.equal((await action(owner,{type:'rebuild',id,revision:current().revision,build:{...build,name:'Renamed'}})).ok,true);await delay(50);
    assert.deepEqual(current().currency,expected);
    assert.equal((await action(owner,{type:'rest',rest:'long',id,revision:current().revision})).ok,true);await delay(50);
    assert.deepEqual(current().currency,expected);
    const file=path.join(data,'rooms.json');
    for(let i=0;i<50;i++){try{if(JSON.stringify(JSON.parse(readFileSync(file,'utf8'))[room.id].characters[0].currency)===JSON.stringify(expected))break;}catch{}await delay(100);}
    assert.deepEqual(JSON.parse(readFileSync(file,'utf8'))[room.id].characters[0].currency,expected);
    await stop();await start();owner=await join('owner');dm=await join('dm',true);assert.deepEqual(current().currency,expected);
    await stop();const saved=JSON.parse(readFileSync(file,'utf8'));delete saved[room.id].characters[0].currency;writeFileSync(file,JSON.stringify(saved));
    await start();owner=await join('owner');assert.deepEqual(current().currency,zero,'legacy characters default to zero, not starting wealth');
  } finally {if(server?.exitCode===null)await stop();rmSync(data,{recursive:true,force:true});}
});
