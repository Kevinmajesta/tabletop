import type { BuildInput, Sheet } from '../server/characters';
import { revisedCatalog as catalog } from '../server/characters';
import { speciesGuide } from '../server/catalog/species-guide';
import { speciesSource } from '../server/catalog/motm';

export default function SpeciesCard({ build, sheet }: { build: BuildInput; sheet?: Sheet }) {
  const guide = speciesGuide(build, catalog);
  const movementNames: Record<string, string> = { swim: 'Renang', climb: 'Panjat', fly: 'Terbang' };
  return (
    <section className="species-guide" aria-label={`Tentang ${guide.name}`}>
      <div className="species-guide-heading">
        <div><span className="species-guide-eyebrow">SPECIES TERPILIH</span><h3>{guide.name}</h3></div>
        <span className="species-guide-book">{speciesSource(build.race) === 'motm' ? 'MotM 2022' : 'PHB 2024'}</span>
      </div>
      <p className="species-guide-overview">{guide.overview}</p>
      <dl className="species-guide-stats">
        <div><dt>Ukuran</dt><dd>{build.choices[speciesSource(build.race) === 'motm' ? 'motm.size' : 'race.size']?.[0] || guide.size}</dd></div>
        <div><dt>Tipe</dt><dd>{guide.type}</dd></div>
        <div><dt>Jalan</dt><dd>{sheet?.speed ?? guide.speed} ft</dd></div>
        {Object.entries(sheet?.movement || {}).map(([kind, speed]) => <div key={kind}><dt>{movementNames[kind] || kind}</dt><dd>{speed} ft</dd></div>)}
      </dl>
      <details key={`${build.race}:${build.subrace}`} className="species-guide-details">
        <summary>Trait &amp; kemampuan <span>{guide.traits.length} trait · lihat detail</span></summary>
        <div className="species-guide-traits">
          {guide.traits.map(trait => <div key={trait.index}><h4>{trait.name}</h4>{trait.desc?.map((text, i) => <p key={i}>{text}</p>)}</div>)}
          {!!sheet?.innateSpells?.length && <div><h4>Spell bawaan · level {build.level || 1}</h4><ul>{sheet.innateSpells.map(spell => <li key={spell.id}><strong>{catalog.spells.find(s => s.index === spell.id)?.name || spell.id}</strong><span>{spell.ability.toUpperCase()} · DC {spell.dc} · {spell.uses}</span></li>)}</ul></div>}
        </div>
      </details>
    </section>
  );
}
