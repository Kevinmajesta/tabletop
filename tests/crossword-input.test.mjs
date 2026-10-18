import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crosswordEdit } from '../src/crossword-input.mjs';
test('cell edit moves within selected word and submits complete words without mutating shared letters', () => {
 const entry={id:'4M',cells:[15,16,17,18,19]};
 const letters=Array(225).fill('');
 let result=crosswordEdit(letters,entry,15,'s');
 assert.equal(result.letters[15],'S');assert.equal(result.next,16);assert.equal(result.answer,null);assert.equal(letters[15],'');
 for(const [cell,value] of [[16,'a'],[17,'w'],[18,'a'],[19,'h']]) result=crosswordEdit(result.letters,entry,cell,value);
 assert.equal(result.answer,'SAWAH');assert.equal(result.next,19);
 assert.equal(crosswordEdit(result.letters,entry,19,'').answer,null);
 assert.equal(crosswordEdit(letters,entry,15,'1').letters[15],'');
});
