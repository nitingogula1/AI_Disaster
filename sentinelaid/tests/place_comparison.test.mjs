import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const dir = new URL('./.generated/', import.meta.url);
await fs.mkdir(dir, { recursive: true });
const transpile = text => ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
await fs.writeFile(new URL('mockData.mjs', dir), transpile(await fs.readFile(new URL('../src/data/mockData.ts', import.meta.url), 'utf8')));
let source = await fs.readFile(new URL('../src/services/api.ts', import.meta.url), 'utf8');
source = source.replaceAll("import.meta.env", "({})").replaceAll("'../data/mockData'", "'./mockData.mjs'");
await fs.writeFile(new URL('api.mjs', dir), transpile(source));
globalThis.localStorage = {getItem: () => null};

const { api, satelliteService, placesService } = await import(new URL('api.mjs', dir));

test('placesService.searchPlaces calls /places/search and handles responses', async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/places/search');
    assert.equal(config.params.q, 'Khulna');
    return {
      status: 200,
      data: {
        success: true,
        data: {
          places: [{
            name: 'Khulna, Bangladesh',
            latitude: 22.8456,
            longitude: 89.5403,
            bbox: [89.31, 21.54, 90.04, 22.12]
          }],
          provider: 'coordinates',
          google_configured: false,
          message: 'Direct geographic coordinates parsed.'
        }
      }
    };
  };

  const res = await placesService.searchPlaces('Khulna');
  assert.equal(res.places.length, 1);
  assert.equal(res.places[0].name, 'Khulna, Bangladesh');
  assert.equal(res.places[0].latitude, 22.8456);
});

test('placesService.getStatus reports provider status', async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/places/status');
    return {
      status: 200,
      data: {
        success: true,
        data: {
          google_maps_configured: false,
          provider: 'nominatim_fallback',
          manual_entry_supported: true,
          instructions: 'Configure GOOGLE_MAPS_API_KEY in .env'
        }
      }
    };
  };

  const status = await placesService.getStatus();
  assert.equal(status.google_maps_configured, false);
  assert.equal(status.manual_entry_supported, true);
});

test('satelliteService.compareScenes posts payload to /satellite/compare', async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/satellite/compare');
    assert.equal(config.method, 'post');
    const body = JSON.parse(config.data);
    assert.equal(body.pre_scene_id, 'pre-001');
    assert.equal(body.post_scene_id, 'post-002');
    assert.equal(body.method, 'MNDWI');
    return {
      status: 200,
      data: {
        success: true,
        data: {
          pre_area_km2: 12.5,
          post_area_km2: 28.2,
          newly_flooded_area_km2: 15.7,
          percentage_change: 125.6,
          polygon_count: 8,
          difference_geojson: { type: 'FeatureCollection', features: [] },
          difference_mask_preview: '/api/v1/satellite/previews/diff.png',
          processing_status: 'COMPLETED'
        }
      }
    };
  };

  const res = await satelliteService.compareScenes({
    pre_scene_id: 'pre-001',
    post_scene_id: 'post-002',
    method: 'MNDWI',
    threshold: 0.05
  });
  assert.equal(res.pre_area_km2, 12.5);
  assert.equal(res.post_area_km2, 28.2);
  assert.equal(res.newly_flooded_area_km2, 15.7);
  assert.equal(res.polygon_count, 8);
  assert.equal(res.processing_status, 'COMPLETED');
});
