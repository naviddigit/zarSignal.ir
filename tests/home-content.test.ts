import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultHomeContent,parseHomeContent} from '../src/lib/home-content';
test('homepage content validates complete text and visibility without mutating defaults',()=>{
  const input=structuredClone(defaultHomeContent);input.texts.title='عنوان جدید';input.sections.hero=false;
  assert.equal(parseHomeContent(input)?.texts.title,'عنوان جدید');
  assert.equal(parseHomeContent(input)?.sections.hero,false);
  assert.equal(defaultHomeContent.sections.hero,true);
  input.texts.title='';assert.equal(parseHomeContent(input),null);
  input.texts.title='x'.repeat(301);assert.equal(parseHomeContent(input),null);
  assert.equal(parseHomeContent({texts:{},sections:{}}),null);
});
