import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyBuild } from '../dist-server/characters.js';

test('choice labels preserve catalog names and format raw ability and feature ids', async () => {
  const { choiceLabel } = await tsImport('../src/character-labels.ts', import.meta.url);
  assert.equal(choiceLabel({ id: 'necrotic-shroud', name: 'necrotic-shroud' }), 'Necrotic Shroud');
  for (const id of ['int', 'wis', 'cha']) assert.equal(choiceLabel({ id, name: id }), id.toUpperCase());
  assert.equal(choiceLabel({ id: 'light', name: 'Light' }), 'Light');
});

test('wallet renders five bounded balances without changing starting equipment', async () => {
  const { default: CurrencyWallet } = await tsImport('../src/CurrencyWallet.tsx', import.meta.url);
  const html = renderToStaticMarkup(createElement(CurrencyWallet, { currency: { cp: 1, sp: 2, ep: 3, gp: 4, pp: 5 }, disabled: false, onSave() {} }));
  for (const [index, coin] of ['cp', 'sp', 'ep', 'gp', 'pp'].entries()) {
    assert.ok(html.includes(`name="${coin}"`));
    assert.ok(html.includes(`value="${index + 1}"`));
  }
  assert.match(html, /min="0"/);
  assert.match(html, /Simpan uang/);
});

test('ASI and class spell errors have matching focusable wizard targets', () => {
  const source = readFileSync(new URL('../src/Characters.tsx', import.meta.url), 'utf8');
  assert.match(source, /id="character-choice-asi\.4" tabIndex=\{-1\}/);
  assert.match(source, /id=\{`character-choice-\$\{key\}`\} tabIndex=\{-1\}/);
});

test('species card shows a chosen size and preserves the unchosen overview', async () => {
  const { default: SpeciesCard } = await tsImport('../src/SpeciesCard.tsx', import.meta.url);
  for (const [race, key] of [['motm:aasimar', 'motm.size'], ['aasimar', 'race.size']]) {
    const build = { ...emptyBuild(), race, choices: {} };
    assert.match(renderToStaticMarkup(createElement(SpeciesCard, { build })), /<dd>Medium \/ Small<\/dd>/);
    build.choices[key] = ['Small'];
    const html = renderToStaticMarkup(createElement(SpeciesCard, { build }));
    assert.match(html, /<dd>Small<\/dd>/);
    assert.doesNotMatch(html, /<dd>Medium \/ Small<\/dd>/);
  }
});
