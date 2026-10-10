import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function persistence(file: string, snapshot: () => unknown, status?: (value: 'saving'|'saved'|'error') => void) {
  let dirty = false;
  let writing: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function flush(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = undefined; }
    if (writing) { await writing; if (dirty) return flush(); return; }
    if (!dirty) return;
    dirty = false;
    const value = JSON.stringify(snapshot());
    writing = (async () => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file + '.tmp', value); await rename(file + '.tmp', file); })();
    try { await writing; if(!dirty) status?.('saved'); } catch (error) { dirty = true; status?.('error'); throw error; } finally { writing = undefined; }
    if (dirty) await flush();
  }
  function save() { dirty = true; status?.('saving'); if (!timer) timer = setTimeout(() => { timer = undefined; void flush().catch(error => console.error('Gagal menyimpan campaign:', error)); }, 200); }
  return { save, flush };
}
