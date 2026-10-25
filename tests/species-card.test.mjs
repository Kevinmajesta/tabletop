import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { tsImport } from 'tsx/esm/api';
import { emptyBuild, revisedCatalog, deriveSheet } from '../dist-server/characters.js';

test('selected species card renders book, metadata, collapsed traits and innate spells', async () => {
  assert.ok(existsSync(new URL('../src/SpeciesCard.tsx', import.meta.url)), 'selected species card exists');
  const { default: SpeciesCard } = await tsImport('../src/SpeciesCard.tsx', import.meta.url);
  const { createElement } = await import('react');
  for (const race of revisedCatalog.races) {
    const html = renderToStaticMarkup(createElement(SpeciesCard, { build: {...emptyBuild(), race: race.index, level: 5} }));
    assert.ok(html.includes(race.name.replace(' (MotM 2022)', '')), race.index);
    assert.match(html, /<details/);
    assert.doesNotMatch(html, /<details[^>]* open/);
    assert.match(html, /Trait &amp; kemampuan/);
    assert.match(html, /Ukuran/);
  }
  const fairy = renderToStaticMarkup(createElement(SpeciesCard, { build: {...emptyBuild(), race: 'motm:fairy', level: 5}, sheet: deriveSheet({...emptyBuild(), race: 'motm:fairy', level: 5}) }));
  assert.match(fairy, /MotM 2022/);
  assert.match(fairy, /Faerie Fire/);
  assert.match(fairy, /Enlarge/);
  assert.match(fairy, /Terbang/);
});
