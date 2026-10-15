import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStoryBackgrounds } from '../src/lib/story-backgrounds';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const background = { id: 'blue', title: 'آبی', start: '#07111f', end: '#172a42', imageUrl: '', enabled: true };
test('story backgrounds validate colors, public image addresses and stable unique ids', () => {
  assert.deepEqual(parseStoryBackgrounds([background]), [background]);
  assert.equal(parseStoryBackgrounds([{ ...background, imageUrl: '/images/story.webp' }])[0].imageUrl, '/images/story.webp');
  assert.equal(parseStoryBackgrounds([{ ...background, imageUrl: 'https://images.example.org/story.png' }]).length, 1);
  for (const imageUrl of ['javascript:alert(1)', '//example.org/bg.png', '/\\example.org/bg', 'http://example.org/bg', 'https://u:p@example.org/bg']) assert.throws(() => parseStoryBackgrounds([{ ...background, imageUrl }]));
  assert.throws(() => parseStoryBackgrounds([background, background]));
  assert.throws(() => parseStoryBackgrounds([{ ...background, start: 'red' }]));
});
test('saving story backgrounds requires admin and persists only validated content', async () => {
  let admin = false, saved: unknown = null;
  const module = { exports: {} as typeof import('../src/app/admin/(protected)/story-backgrounds/actions') };
  const source = ts.transpileModule(readFileSync('src/app/admin/(protected)/story-backgrounds/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(source, { module, exports: module.exports, Error, require: (name: string) => {
    if (name === '@/server/admin-auth') return { requireAdmin: async () => { if (!admin) throw new Error('unauthorized'); } };
    if (name === '@/lib/story-backgrounds') return { parseStoryBackgrounds };
    if (name === '@/server/story-backgrounds') return { storyBackgroundsKey: 'test-backgrounds' };
    if (name === 'next/cache') return { revalidatePath: () => {} };
    return { db: { integrationSetting: { upsert: async (value: unknown) => { saved = value; } } } };
  } });
  const form = new FormData(); form.set('backgrounds', JSON.stringify([background]));
  await assert.rejects(() => module.exports.saveStoryBackgrounds(form), /unauthorized/); assert.equal(saved, null);
  admin = true; form.set('backgrounds', JSON.stringify([{ ...background, imageUrl: 'javascript:bad' }]));
  assert.ok((await module.exports.saveStoryBackgrounds(form)).error); assert.equal(saved, null);
  form.set('backgrounds', JSON.stringify([background])); assert.equal((await module.exports.saveStoryBackgrounds(form)).saved, true); assert.ok(saved);
});
