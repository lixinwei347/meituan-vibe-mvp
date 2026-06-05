import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const https = require('node:https');

const routeModulePath = require.resolve('../server/routes/route');
const poisModulePath = require.resolve('../server/routes/pois');
const locationModulePath = require.resolve('../server/routes/location');
const amapModulePath = require.resolve('../server/lib/amapSearch');

function installCommonStubs(overrides = {}) {
  delete require.cache[routeModulePath];
  delete require.cache[poisModulePath];
  delete require.cache[locationModulePath];
  require.cache[amapModulePath] = {
    id: amapModulePath,
    filename: amapModulePath,
    loaded: true,
    exports: {
      nearbySearch: async () => [],
      searchByPrefs: async () => [],
      geocode: async () => null,
      distanceMeters: (a, b) => Math.round(Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 85000)),
      formatDistance: (meters) => (meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`),
      ...overrides,
    },
  };
}

function findLayer(router, method, path) {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method.toLowerCase()]);
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack.at(-1).handle;
}

async function request(router, method, path, body) {
  const url = new URL(`http://localhost${path}`);
  const req = {
    method: method.toUpperCase(),
    url: path,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
  };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  try {
    await findLayer(router, method, url.pathname)(req, res, (err) => {
      if (err) throw err;
    });
  } catch (error) {
    if (res.body === undefined) throw error;
  }

  return {
    status: res.statusCode,
    body: res.body,
  };
}

async function withHttpsRequestStub(factory, fn) {
  const originalRequest = https.request;
  https.request = factory;
  try {
    return await fn();
  } finally {
    https.request = originalRequest;
  }
}

installCommonStubs();
let locationRouter = require('../server/routes/location');
let locationRes = await request(locationRouter, 'GET', '/default');
assert.equal(locationRes.status, 200);
assert.equal(locationRes.body.lat, null);
assert.equal(locationRes.body.lng, null);
assert.equal(locationRes.body.name, '未设置位置');

installCommonStubs();
let poisRouter = require('../server/routes/pois');
let poisRes = await request(poisRouter, 'GET', '/');
assert.equal(poisRes.status, 200);
assert.deepEqual(poisRes.body, []);

const searchResult = [{ id: 'real-poi', name: 'Provider POI' }];
installCommonStubs({
  nearbySearch: async () => searchResult,
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'GET', '/search?q=%E7%81%AB%E9%94%85&lat=31.2&lng=121.5');
assert.deepEqual(poisRes.body, searchResult);

installCommonStubs({
  nearbySearch: async () => [],
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'GET', '/search?q=%E7%81%AB%E9%94%85');
assert.deepEqual(poisRes.body, []);

installCommonStubs({
  nearbySearch: async () => {
    throw new Error('provider offline');
  },
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'GET', '/search?q=%E7%81%AB%E9%94%85&lat=31.2&lng=121.5');
assert.deepEqual(poisRes.body, []);

const recommendationResult = [{ id: 'real-rec', name: 'Provider Recommendation' }];
installCommonStubs({
  geocode: async () => ({ lat: 30.1, lng: 120.2, name: '杭州东站' }),
  searchByPrefs: async ({ center }) => {
    assert.equal(center.name, '杭州东站');
    return recommendationResult;
  },
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'POST', '/recommendations', {
  prefs: { locationInput: '杭州东站' },
});
assert.deepEqual(poisRes.body, recommendationResult);

installCommonStubs({
  searchByPrefs: async () => [],
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'POST', '/recommendations', {
  center: { lat: 31.2, lng: 121.5, name: '上海' },
  prefs: {},
});
assert.deepEqual(poisRes.body, []);

installCommonStubs({
  searchByPrefs: async () => {
    throw new Error('provider offline');
  },
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'POST', '/recommendations', {
  center: { lat: 31.2, lng: 121.5, name: '上海' },
  prefs: {},
});
assert.deepEqual(poisRes.body, []);

installCommonStubs({
  searchByPrefs: async () => [],
});
let routeRouter = require('../server/routes/route');
let routeRes = await request(routeRouter, 'POST', '/plan', {
  origin: { lat: null, lng: null, name: '未设置位置' },
  selectedIds: ['hotpot'],
  selectedPois: [],
  prefs: {},
  respectOrder: true,
});
assert.equal(routeRes.status, 200);
assert.deepEqual(routeRes.body.selected, []);
assert.deepEqual(routeRes.body.legs, []);
assert.equal(routeRes.body.totalDistanceMeters, 0);
assert.equal(routeRes.body.totalDistanceLabel, '0m');
assert.equal(routeRes.body.aiPowered, false);
assert.equal(routeRes.body.empty, true);
assert.equal(routeRes.body.aiReason, '暂无可用地点，请先搜索或填写位置');

const selectedPois = [
  { id: 'manual-1', name: 'A', lat: 31.2, lng: 121.5 },
  { id: 'manual-2', name: 'B', lat: 31.201, lng: 121.503 },
];
installCommonStubs();
routeRouter = require('../server/routes/route');
routeRes = await request(routeRouter, 'POST', '/plan', {
  origin: { lat: 31.2, lng: 121.5, name: '起点' },
  selectedPois,
  selectedIds: selectedPois.map((poi) => poi.id),
  prefs: {},
  respectOrder: true,
});
assert.deepEqual(routeRes.body.selected.map((poi) => poi.id), ['manual-1', 'manual-2']);
assert.equal(routeRes.body.aiPowered, false);
assert.equal(routeRes.body.empty, undefined);

const aiFallbackSelectedPois = [
  { id: 'sel-1', name: 'One', lat: 31.2, lng: 121.5, subCategory: '火锅', rating: 4.6, price: 80, distanceLabel: '0m' },
  { id: 'sel-2', name: 'Two', lat: 31.201, lng: 121.502, subCategory: '咖啡', rating: 4.5, price: 35, distanceLabel: '200m' },
  { id: 'sel-3', name: 'Three', lat: 31.203, lng: 121.505, subCategory: '甜品', rating: 4.7, price: 40, distanceLabel: '450m' },
  { id: 'sel-4', name: 'Four', lat: 31.204, lng: 121.506, subCategory: '日料', rating: 4.8, price: 120, distanceLabel: '600m' },
];
installCommonStubs();
routeRouter = require('../server/routes/route');
routeRes = await withHttpsRequestStub(
  () => {
    const listeners = { error: [] };
    return {
      on(event, handler) {
        listeners[event]?.push(handler);
        return this;
      },
      write() {},
      end() {
        queueMicrotask(() => {
          for (const handler of listeners.error) handler(new Error('doubao offline'));
        });
      },
    };
  },
  () => request(routeRouter, 'POST', '/plan', {
    origin: { lat: null, lng: null, name: '未设置位置' },
    selectedPois: aiFallbackSelectedPois,
    selectedIds: aiFallbackSelectedPois.map((poi) => poi.id),
    prefs: {},
    respectOrder: false,
  }),
);
assert.equal(routeRes.status, 200);
assert.deepEqual(routeRes.body.selected.map((poi) => poi.id), aiFallbackSelectedPois.map((poi) => poi.id));
assert.equal(routeRes.body.aiPowered, false);
assert.equal(routeRes.body.empty, undefined);
assert.equal(routeRes.body.legs.length, aiFallbackSelectedPois.length);

console.log(JSON.stringify({
  location: locationRes.body,
  poisRootCount: 0,
  searchResultCount: searchResult.length,
  recommendationCount: recommendationResult.length,
  emptyRoute: 0,
  aiFallbackSelectedCount: routeRes.body.selected.length,
}, null, 2));
