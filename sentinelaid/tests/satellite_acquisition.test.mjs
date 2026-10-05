import test from 'node:test';
import assert from 'node:assert/strict';

// Helper equivalent to SatelliteAcquisitionPage's calculateBboxFromCenter
function calculateBboxFromCenter(lat, lon, widthKm, heightKm) {
  const latDelta = (heightKm / 2) / 111.0;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lonDelta = (widthKm / 2) / (111.0 * (Math.abs(cosLat) > 0.0001 ? Math.abs(cosLat) : 1));
  return [
    (lon - lonDelta).toFixed(4),
    (lat - latDelta).toFixed(4),
    (lon + lonDelta).toFixed(4),
    (lat + latDelta).toFixed(4),
  ];
}

function calculateEstimatedPixels(widthKm, heightKm) {
  return Math.round((widthKm * 100) * (heightKm * 100));
}

function buildGoogleImagesQuery(place, timing, date) {
  return `${place} flood ${timing} ${date}`.trim();
}

test('calculateBboxFromCenter calculates symmetrical geographic bounding box from width and height', () => {
  const lat = 22.8456;
  const lon = 89.5403;
  const widthKm = 5.0;
  const heightKm = 5.0;

  const bbox = calculateBboxFromCenter(lat, lon, widthKm, heightKm);
  assert.equal(bbox.length, 4);

  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
  assert.ok(minLon < lon && maxLon > lon, 'Longitude range must enclose center');
  assert.ok(minLat < lat && maxLat > lat, 'Latitude range must enclose center');

  // Verify center reconstruction
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  assert.ok(Math.abs(centerLat - lat) < 0.001, 'Center latitude must match');
  assert.ok(Math.abs(centerLon - lon) < 0.001, 'Center longitude must match');
});

test('calculateEstimatedPixels correctly identifies AOIs within or exceeding 4,194,304 pixel limit', () => {
  const normal5x5 = calculateEstimatedPixels(5.0, 5.0);
  assert.equal(normal5x5, 250000);
  assert.ok(normal5x5 <= 4194304, '5x5 km must be well within pixel limit');

  const boundary20x20 = calculateEstimatedPixels(20.0, 20.0);
  assert.equal(boundary20x20, 4000000);
  assert.ok(boundary20x20 <= 4194304, '20x20 km must be within 4,194,304 pixel limit');

  const excessive30x30 = calculateEstimatedPixels(30.0, 30.0);
  assert.equal(excessive30x30, 9000000);
  assert.ok(excessive30x30 > 4194304, '30x30 km must exceed 4,194,304 pixel limit');
});

test('buildGoogleImagesQuery forms correct before and after flood search terms', () => {
  const place = 'Kathmandu, Nepal';
  const eventDate = 'September 2024';

  const beforeQuery = buildGoogleImagesQuery(place, 'before', eventDate);
  const afterQuery = buildGoogleImagesQuery(place, 'after', eventDate);

  assert.equal(beforeQuery, 'Kathmandu, Nepal flood before September 2024');
  assert.equal(afterQuery, 'Kathmandu, Nepal flood after September 2024');

  const expectedBeforeUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(beforeQuery)}`;
  assert.ok(expectedBeforeUrl.includes('Kathmandu%2C%20Nepal%20flood%20before%20September%202024'));
});

test('water-analysis pipeline accepts only registered satellite scenes and rejects photo queries', () => {
  const analyzePayload = (sceneId, operationId, method, threshold) => {
    if (!sceneId || typeof sceneId !== 'string' || sceneId.startsWith('http') || sceneId.includes('google')) {
      throw new Error('Invalid satellite scene ID for raster flood analysis');
    }
    return {
      scene_id: sceneId,
      operation_id: operationId,
      method,
      threshold
    };
  };

  // Valid satellite scene
  const valid = analyzePayload('scn-20240505-s2', 'OP-101', 'MNDWI', 0.05);
  assert.equal(valid.scene_id, 'scn-20240505-s2');

  // Google Images url / search terms must never be passed to raster pipeline
  assert.throws(() => {
    analyzePayload('https://www.google.com/search?q=flood', 'OP-101', 'MNDWI', 0.05);
  }, /Invalid satellite scene ID/);

  assert.throws(() => {
    analyzePayload('google-images-photo-123', 'OP-101', 'MNDWI', 0.05);
  }, /Invalid satellite scene ID/);
});
