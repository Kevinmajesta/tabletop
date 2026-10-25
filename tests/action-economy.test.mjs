import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('feature badges use explicit rule wording, not names or passive mentions', async () => {
  assert.match(await render({ description: 'As a Bonus Action, regain HP if conscious.' }), /Aksi Bonus/);
  assert.match(await render({ description: 'You can use your Reaction when hit.' }), /Reaksi/);
  assert.match(await render({ description: 'As a Magic action, teleport.' }), /Aksi/);
  assert.equal(await render({ description: 'You gain a bonus to damage rolls.' }), '');
  assert.equal(await render({ description: 'Enemies cannot take Reactions.' }), '');
});

const render = async props => {
  const { default: ActionEconomy } = await tsImport('../src/ActionEconomy.tsx', import.meta.url);
  return renderToStaticMarkup(createElement(ActionEconomy, props));
};

test('casting time is visible with source reaction trigger intact', async () => {
  assert.match(await render({ castingTime: '1 action' }), />Aksi</);
  assert.match(await render({ castingTime: 'Action' }), />Aksi</);
  assert.match(await render({ castingTime: 'Bonus Action' }), />Aksi Bonus</);
  assert.match(await render({ castingTime: 'Reaction' }), />Reaksi</);
  assert.match(await render({ castingTime: '1 bonus action' }), />Aksi Bonus</);
  const reaction = await render({ castingTime: '1 reaction, which you take when hit' });
  assert.match(reaction, />Reaksi</);
  assert.match(reaction, /which you take when hit/);
  assert.match(await render({ castingTime: '1 minute', ritual: true }), /1 minute/);
  assert.match(await render({ castingTime: '1 minute', ritual: true }), /Ritual \(\+10 menit\)/);
});
