import { useEffect, useRef, useState } from 'react';

// Draf bersama yang tetap responsif saat diketik cepat.
// Perubahan lokal langsung tampil dan dicatat sebagai "menunggu". Gema dari server untuk perubahan kita sendiri
// diabaikan sampai server menyusul nilai terakhir kita, supaya gema lama tidak menimpa ketikan yang lebih baru.
// Perubahan yang bukan berasal dari kita (pemain lain) langsung dipakai.
export function useSyncedDraft<T>(server: T, key: (value: T) => string): [T, (value: T) => void] {
  const [local, setLocal] = useState(server);
  const pending = useRef<string[]>([]);
  const serverKey = key(server);
  useEffect(() => {
    const at = pending.current.indexOf(serverKey);
    if (at >= 0) {
      pending.current.splice(0, at + 1);
      if (!pending.current.length) setLocal(server);
    } else {
      pending.current = [];
      setLocal(server);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);
  const change = (value: T) => { pending.current.push(key(value)); setLocal(value); };
  return [local, change];
}
