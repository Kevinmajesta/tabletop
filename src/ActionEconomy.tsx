export default function ActionEconomy({ castingTime, ritual = false, description = "" }: { castingTime?: string; ritual?: boolean; description?: string }) {
  if (!castingTime) {
    // Only explicit action-cost wording; the full rule retains triggers and conditions.
    const costs = [...description.matchAll(/\b(?:as (?:a|an)|use your|take (?:a|an)) (Bonus Action|Reaction|(?:Magic|Utilize|Attack|Influence|Search|Study|Help|Dodge|Dash|Disengage|Hide|Ready) action|action)\b/gi)];
    return <>{[...new Set(costs.map(match => /bonus/i.test(match[1]) ? "Aksi Bonus" : /reaction/i.test(match[1]) ? "Reaksi" : "Aksi"))].map(cost => <small key={cost} className="action-economy" title={description}>{cost} · lihat syarat</small>)}</>;
  }
  const label = /^(?:1 )?bonus action\b/i.test(castingTime) ? "Aksi Bonus"
    : /^(?:1 )?reaction\b/i.test(castingTime) ? "Reaksi"
    : /^(?:1 )?action\b/i.test(castingTime) ? "Aksi" : castingTime;
  return <><small className="action-economy" title={castingTime}>{label}</small>{ritual && <small className="action-economy" title="Jika dirapal sebagai ritual, tambahkan 10 menit pada casting time.">Ritual (+10 menit)</small>}</>;
}
