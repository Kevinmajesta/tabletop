import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(new URL('../src/BoardTools.tsx', import.meta.url), 'utf8');
const shape = source.slice(source.indexOf('  function shape('), source.indexOf('  const path = draft'));
function render(kind, dm, previewTokenId, open = false) {
  const code = ts.transpileModule(`${shape}\nshape(mark, 'portal-id');`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const node = runInNewContext(code, {
    React, dm, previewTokenId, width: 800, height: 600, tool: 'select',
    selectedMarkId: null, selectMark() {}, action() {},
    mark: { kind, open, a: { x: 20, y: 30 }, b: { x: 20, y: 60 }, text: '' },
  });
  return renderToStaticMarkup(node);
}

test('wall outlines stay DM-only without hiding ordinary drawing lines', () => {
  assert.equal(render('wall', false, null), '');
  assert.equal(render('wall', true, 'preview-token'), '');
  assert.match(render('wall', true, null), /#ffc1b4/);
  assert.match(render('line', false, null), /<line/);
});

test('door and window outlines stay DM-only, including token vision preview', () => {
  for (const kind of ['door', 'window']) {
    for (const open of [false, true]) {
      assert.equal(render(kind, false, null, open), '', `${kind} hidden for player`);
      assert.equal(render(kind, true, 'preview-token', open), '', `${kind} hidden in player preview`);
      assert.match(render(kind, true, null, open), /board-portal/, `${kind} visible for DM`);
    }
  }
});
