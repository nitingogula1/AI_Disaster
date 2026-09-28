import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

const dir = new URL('./.generated/', import.meta.url);
await fs.mkdir(dir, { recursive: true });
const transpile = text => ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
await fs.writeFile(new URL('mockData.mjs', dir), transpile(await fs.readFile(new URL('../src/data/mockData.ts', import.meta.url), 'utf8')));
let source = await fs.readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8');
source = source.replaceAll("import.meta.env", "({})").replaceAll("'../data/mockData'", "'./mockData.mjs'");
await fs.writeFile(new URL('api.mjs', dir), transpile(source));
globalThis.localStorage = {getItem: () => null};
const { api, satelliteService, stacService, aiDetectionService, assetUrl } = await import(new URL('api.mjs', dir));
api.defaults.adapter = async () => { throw new Error('Backend offline'); };
test('satellite analysis failures reject instead of reporting completion', async () => {
  await assert.rejects(satelliteService.runFloodAnalysis('selected-scene'), /Backend offline/);
});
test('search failures are errors, not empty or mock results', async () => {
  await assert.rejects(stacService.search({bbox:[3,0,3.01,.01]}), /Backend offline/);
  await assert.rejects(satelliteService.getScenes(), /Backend offline/);
});
test('ingestion and AI failures remain failures', async () => {
  await assert.rejects(satelliteService.directIngest('selected-scene'), /Backend offline/);
  await assert.rejects(aiDetectionService.runDamageDetection({disaster_id:'test'}), /Backend offline/);
});
test('image and request URLs use the same relative API root', () => {
  assert.equal(api.defaults.baseURL, '/api/v1');
  assert.equal(assetUrl('/api/v1/satellite/products/id/mask'), '/api/v1/satellite/products/id/mask');
  assert.equal(assetUrl('https://example.org/image.png'), 'https://example.org/image.png');
});
