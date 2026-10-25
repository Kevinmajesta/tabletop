import type { Character } from '../server/characters';

const coins = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export default function CurrencyWallet({ currency, disabled, onSave }: {
  currency: Character['currency'];
  disabled: boolean;
  onSave: (currency: NonNullable<Character['currency']>) => void;
}) {
  return <form className="currency-wallet" onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(coins.map(coin => [coin, Number(data.get(coin))])) as NonNullable<Character['currency']>;
    if (coins.every(coin => Number.isSafeInteger(values[coin]) && values[coin] >= 0)) onSave(values);
  }}>
    <h3>Uang</h3>
    <p>Saldo saat ini; perlengkapan awal di bawah tetap menjadi riwayat build. Tidak ada konversi otomatis.</p>
    <fieldset disabled={disabled}>
      <legend>Saldo koin</legend>
      <div className="currency-balances">
        {coins.map(coin => <label key={coin}>{coin.toUpperCase()}<input name={coin} aria-label={`Saldo ${coin.toUpperCase()}`} type="number" required min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={currency?.[coin] ?? 0} /></label>)}
      </div>
      <button type="submit">Simpan uang</button>
    </fieldset>
  </form>;
}
