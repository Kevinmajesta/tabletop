import { parentPort } from 'node:worker_threads';
import { randomInt } from 'node:crypto';
import { simulateRoll } from './dice-physics.js';

parentPort?.on('message',({ sides, count, modifier }: {sides:number;count:number;modifier:number}) => { try {
  parentPort?.postMessage({ roll: simulateRoll(sides, count, modifier, () => randomInt(0x100000000) / 0x100000000) });
} catch {
  parentPort?.postMessage({ error: 'Dadu belum berhenti. Coba lempar lagi.' });
} });
