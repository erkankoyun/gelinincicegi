import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findAnswers } from '../public/assets/wedding-info-data.js';
const entries=JSON.parse(readFileSync(new URL('../public/assets/wedding-guide.json',import.meta.url),'utf8'));
test('the independent wedding guide answers US planning and guest questions',()=>{
  for(const [question,id] of [
    ['How do I plan my wedding budget?','budget'],
    ['What should I ask a wedding venue?','venues'],
    ['What should I wear as a wedding guest?','guest-attire'],
    ['How do I choose a wedding gift?','gifts'],
    ['We need a rain plan for an outdoor ceremony','weather'],
    ['How should I arrange the seating chart?','seating'],
  ])assert.equal(findAnswers(question,entries)[0]?.id,id,question);
  assert.deepEqual(findAnswers('quantum gravity',entries),[]);
});
