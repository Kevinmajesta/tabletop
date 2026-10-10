import { Worker } from 'node:worker_threads';
import type { DiceRoll } from './dice-physics.js';
type Job = { sides:number; count:number; modifier:number; resolve:(roll:DiceRoll)=>void; reject:(error:Error)=>void };
export class DicePool {
  private queue: Job[] = [];
  private slots: { worker: Worker; job?: Job; timer?: ReturnType<typeof setTimeout> }[] = [];
  constructor(private size = 2) {}
  roll(sides:number,count:number,modifier:number) { return new Promise<DiceRoll>((resolve,reject) => { if(this.queue.length >= 8) { reject(new Error('Antrean dadu penuh.')); return; } this.queue.push({sides,count,modifier,resolve,reject}); this.drain(); }); }
  private create() {
    const development = import.meta.url.endsWith('.ts');
    const url = new URL(development ? './dice-worker.ts' : './dice-worker.js',import.meta.url);
    const worker = development ? new Worker(`import('tsx/esm/api').then(({tsImport})=>tsImport(${JSON.stringify(url.href)},${JSON.stringify(import.meta.url)}))`,{eval:true,resourceLimits:{maxOldGenerationSizeMb:96}}) : new Worker(url,{resourceLimits:{maxOldGenerationSizeMb:96}});
    const slot: typeof this.slots[number] = {worker};
    this.slots.push(slot);
    worker.on('message',(message:{roll?:DiceRoll;error?:string}) => { const job=slot.job; clearTimeout(slot.timer); slot.job=undefined; if(job) { if(message.roll) job.resolve(message.roll); else job.reject(new Error(message.error || 'Simulasi gagal.')); } worker.unref(); this.drain(); });
    const fail=(error:Error) => { if(!this.slots.includes(slot)) return; clearTimeout(slot.timer); slot.job?.reject(error); slot.job=undefined; this.slots=this.slots.filter(s=>s!==slot); void worker.terminate(); this.drain(); };
    worker.on('error',fail); worker.on('exit',code=>fail(new Error(`Worker dadu berhenti (${code}).`)));
    worker.unref();
    return slot;
  }
  private drain() {
    while(this.queue.length) {
      const slot=this.slots.find(s=>!s.job) || (this.slots.length<this.size ? this.create() : undefined);
      if(!slot) return;
      const job=this.queue.shift()!; slot.job=job; slot.worker.ref();
      slot.timer=setTimeout(()=>{ job.reject(new Error('Simulasi melewati batas waktu.')); slot.job=undefined; this.slots=this.slots.filter(s=>s!==slot); void slot.worker.terminate(); this.drain(); },15000);
      slot.worker.postMessage({sides:job.sides,count:job.count,modifier:job.modifier});
    }
  }
}
