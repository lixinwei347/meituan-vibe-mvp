import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const https = require('node:https');

const routeModulePath = require.resolve('../server/routes/route');
const poisModulePath = require.resolve('../server/routes/pois');
const locationModulePath = require.resolve('../server/routes/location');
const roomsModulePath = require.resolve('../server/routes/rooms');
const roomStoreModulePath = require.resolve('../server/lib/roomStore');
const amapModulePath = require.resolve('../server/lib/amapSearch');
const wsModulePath = require.resolve('../server/ws/server');

function installCommonStubs(overrides = {}) {
  delete require.cache[routeModulePath];
  delete require.cache[poisModulePath];
  delete require.cache[locationModulePath];
  delete require.cache[roomsModulePath];
  delete require.cache[roomStoreModulePath];
  delete require.cache[wsModulePath];
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
  require.cache[wsModulePath] = {
    id: wsModulePath,
    filename: wsModulePath,
    loaded: true,
    exports: {
      broadcast: () => {},
      broadcastAll: () => {},
    },
  };
}

function matchRoutePath(routePath, actualPath) {
  const keys = [];
  const pattern = routePath
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment;
    })
    .join('/');
  const match = actualPath.match(new RegExp(`^${pattern}$`));
  if (!match) return null;
  const params = {};
  keys.forEach((key, index) => {
    params[key] = decodeURIComponent(match[index + 1]);
  });
  return params;
}

function findLayer(router, method, path) {
  for (const entry of router.stack) {
    if (!entry.route?.methods?.[method.toLowerCase()]) continue;
    const params = matchRoutePath(entry.route.path, path);
    if (params) {
      return { handle: entry.route.stack.at(-1).handle, params };
    }
  }
  throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
}

async function request(router, method, path, body) {
  const url = new URL(`http://localhost${path}`);
  const req = {
    method: method.toUpperCase(),
    url: path,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    params: {},
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
    const layer = findLayer(router, method, url.pathname);
    req.params = layer.params;
    await layer.handle(req, res, (err) => {
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

const comprehensiveCandidates = {
  '火锅|日料|粤菜|川湘|烧烤|烤肉|西餐': [
    { id: 'meal-1', name: '牛肉火锅', category: '美食', subCategory: '正餐', rating: 4.8, price: 120, distance: 400, distanceLabel: '400m', tags: ['聚餐'], lat: 30.1001, lng: 120.2001, photoUrl: '' },
    { id: 'meal-1b', name: '炉边火锅', category: '美食', subCategory: '正餐', rating: 4.7, price: 118, distance: 460, distanceLabel: '460m', tags: ['聚餐'], lat: 30.10015, lng: 120.20015, photoUrl: 'https://img.example.com/meal-1b.jpg' },
  ],
  '咖啡|甜品|奶茶|下午茶': [
    { id: 'light-1', name: '山野咖啡', category: '美食', subCategory: '轻食', rating: 4.7, price: 38, distance: 260, distanceLabel: '260m', tags: ['轻松'], lat: 30.1002, lng: 120.2002, photoUrl: 'https://img.example.com/light-1.jpg' },
  ],
  '密室|剧本杀': [
    { id: 'fun-1', name: '谜境剧本杀', category: '玩乐', subCategory: '剧本杀', rating: 4.9, price: 168, distance: 900, distanceLabel: '900m', tags: ['沉浸式'], lat: 30.1003, lng: 120.2003, photoUrl: 'https://img.example.com/fun-1.jpg' },
  ],
};
installCommonStubs({
  nearbySearch: async ({ keywords }) => comprehensiveCandidates[keywords] || [],
});
poisRouter = require('../server/routes/pois');
poisRes = await withHttpsRequestStub(
  (_options, callback) => {
    return {
      on() { return this; },
      write() {},
      end() {
        queueMicrotask(() => {
          const payload = JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      title: '火锅+咖啡+剧本杀顺路方案',
                      selections: {
                        '美食-正餐': '牛肉火锅',
                        '美食-轻食': '山野咖啡',
                        '玩乐-密室/剧本杀': '谜境剧本杀',
                      },
                      reasons: {
                        '美食-正餐': '综合了想吃火锅成员的正餐偏好，牛肉火锅评分高且适合多人聚餐。',
                        '美食-轻食': '考虑到有人偏好咖啡和轻食，这家咖啡店距离近、适合衔接后续行程。',
                        '玩乐-密室/剧本杀': '针对想玩剧本杀的成员，这家店口碑高，且和前序餐饮顺路。',
                      },
                    }),
                  },
                ],
              },
            ],
          });
          const response = {
            on(event, handler) {
              if (event === 'data') queueMicrotask(() => handler(payload));
              if (event === 'end') queueMicrotask(handler);
              return this;
            },
          };
          callback(response);
        });
      },
    };
  },
  () => request(poisRouter, 'POST', '/recommendations', {
    center: { lat: 30.1, lng: 120.2, name: '杭州东站' },
    prefs: { mode: '综合最优', foods: ['火锅', '咖啡'], fun: ['剧本杀'] },
    members: [
      { memberId: 'm1', prefs: { foods: ['火锅'] } },
      { memberId: 'm2', prefs: { foods: ['咖啡'], fun: ['剧本杀'] } },
    ],
  }),
);
assert.equal(poisRes.body.length, 3);
assert.equal(poisRes.body.every((item) => item.isAiBundle), true);
assert.deepEqual(poisRes.body.map((item) => item.bundleItems[0].id), ['meal-1', 'light-1', 'fun-1']);
assert.equal(poisRes.body.every((item) => item.bundleItems.length === 1), true);
assert.deepEqual(poisRes.body.map((item) => item.photoUrl), [
  'https://img.example.com/meal-1b.jpg',
  'https://img.example.com/light-1.jpg',
  'https://img.example.com/fun-1.jpg',
]);
assert.deepEqual(poisRes.body.map((item) => item.bundleItems[0].photoUrl), [
  'https://img.example.com/meal-1b.jpg',
  'https://img.example.com/light-1.jpg',
  'https://img.example.com/fun-1.jpg',
]);
assert.equal(poisRes.body[0].aiReason.includes('火锅成员'), true);
assert.equal(poisRes.body[1].aiReason.includes('咖啡'), true);
assert.equal(poisRes.body[2].aiReason.includes('剧本杀'), true);

const comprehensiveFallbackCandidates = {
  '烧烤': [
    { id: 'meal-2', name: '炭火烧烤', category: '美食', subCategory: '正餐', rating: 4.6, price: 98, distance: 320, distanceLabel: '320m', tags: ['夜宵'], lat: 30.1011, lng: 120.2011 },
  ],
  '奶茶': [
    { id: 'light-2', name: '山茶奶铺', category: '美食', subCategory: '轻食', rating: 4.5, price: 22, distance: 180, distanceLabel: '180m', tags: ['解腻'], lat: 30.1012, lng: 120.2012 },
  ],
  '电影': [
    { id: 'movie-1', name: '星幕影城', category: '玩乐', subCategory: '电影', rating: 4.7, price: 58, distance: 650, distanceLabel: '650m', tags: ['大片'], lat: 30.1013, lng: 120.2013 },
  ],
};
installCommonStubs({
  nearbySearch: async ({ keywords }) => comprehensiveFallbackCandidates[keywords] || [],
});
poisRouter = require('../server/routes/pois');
poisRes = await withHttpsRequestStub(
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
  () => request(poisRouter, 'POST', '/recommendations', {
    center: { lat: 30.1, lng: 120.2, name: '杭州东站' },
    prefs: { mode: '综合最优', foods: ['烧烤', '奶茶'], fun: ['电影'] },
    members: [],
  }),
);
assert.equal(poisRes.body.length, 3);
assert.deepEqual(poisRes.body.map((item) => item.bundleItems[0].id), ['meal-2', 'light-2', 'movie-1']);
assert.equal(poisRes.body.every((item) => item.aiReason === ''), true);

const comprehensiveGeneralFallback = [
  { id: 'meal-3', name: '川湘小馆', category: '美食', subCategory: '川湘', rating: 4.5, price: 88, distance: 350, distanceLabel: '350m', tags: ['下饭'], lat: 30.1021, lng: 120.2021 },
  { id: 'light-3', name: '晴天甜品', category: '美食', subCategory: '甜品', rating: 4.6, price: 26, distance: 150, distanceLabel: '150m', tags: ['轻松'], lat: 30.1022, lng: 120.2022 },
  { id: 'fun-3', name: '银河影城', category: '玩乐', subCategory: '电影', rating: 4.7, price: 49, distance: 720, distanceLabel: '720m', tags: ['热门'], lat: 30.1023, lng: 120.2023 },
];
installCommonStubs({
  nearbySearch: async () => [],
  searchByPrefs: async () => comprehensiveGeneralFallback,
});
poisRouter = require('../server/routes/pois');
poisRes = await request(poisRouter, 'POST', '/recommendations', {
  center: { lat: 30.1, lng: 120.2, name: '杭州东站' },
  prefs: { mode: '综合最优', foods: ['川湘', '甜品'], fun: ['电影'] },
  members: [],
});
assert.equal(poisRes.body.length, 3);
assert.equal(poisRes.body.every((item) => item.isAiBundle), true);
assert.deepEqual(poisRes.body.map((item) => item.bundleItems[0].id), ['meal-3', 'light-3', 'fun-3']);
assert.equal(poisRes.body.every((item) => item.aiReason === ''), true);

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

installCommonStubs({
  searchByPrefs: async ({ center }) => {
    assert.deepEqual(center, { lat: 31.21, lng: 121.49, name: '成员中心', address: '成员聚合位置' });
    return [];
  },
});
routeRouter = require('../server/routes/route');
routeRes = await request(routeRouter, 'POST', '/plan', {
  origin: { lat: null, lng: null, name: '未设置位置' },
  selectedIds: [],
  selectedPois: [],
  prefs: {},
  members: [
    { memberId: 'm1', location: { lat: 31.2, lng: 121.5, name: '成员 A' } },
    { memberId: 'm2', location: { lat: 31.22, lng: 121.48, name: '成员 B' } },
  ],
  respectOrder: false,
});
assert.equal(routeRes.status, 200);
assert.equal(routeRes.body.origin.lat, 31.21);
assert.equal(routeRes.body.origin.lng, 121.49);
assert.equal(routeRes.body.origin.name, '成员中心');
assert.equal(routeRes.body.empty, true);

installCommonStubs({
  geocode: async (input) => {
    assert.equal(input, '杭州东站');
    return { lat: 30.25, lng: 120.17, name: '杭州东站', address: '杭州东站' };
  },
});
let roomsRouter = require('../server/routes/rooms');
let createRoomRes = await request(roomsRouter, 'POST', '/', {});
assert.equal(createRoomRes.status, 200);
const roomCode = createRoomRes.body.code;
let joinRoomRes = await request(roomsRouter, 'POST', `/${roomCode}/join`, { nickname: '测试', avatar: '测' });
assert.equal(joinRoomRes.status, 200);
const memberId = joinRoomRes.body.memberId;
let submitPrefsRes = await request(roomsRouter, 'POST', `/${roomCode}/members/${memberId}/prefs`, {
  foods: ['火锅'],
  locationInput: '杭州东站',
  location: { lat: 31.23, lng: 121.47, name: '实时定位', address: '设备定位结果' },
});
assert.equal(submitPrefsRes.status, 200);
assert.equal(submitPrefsRes.body.member.location.lat, 31.23);
assert.equal(submitPrefsRes.body.member.location.lng, 121.47);
assert.equal(submitPrefsRes.body.member.location.name, '实时定位');

installCommonStubs({
  geocode: async (input) => {
    assert.equal(input, '杭州东站');
    return { lat: 30.25, lng: 120.17, name: '杭州东站', address: '杭州东站' };
  },
});
roomsRouter = require('../server/routes/rooms');
createRoomRes = await request(roomsRouter, 'POST', '/', {});
joinRoomRes = await request(roomsRouter, 'POST', `/${createRoomRes.body.code}/join`, { nickname: '文本定位', avatar: '文' });
submitPrefsRes = await request(roomsRouter, 'POST', `/${createRoomRes.body.code}/members/${joinRoomRes.body.memberId}/prefs`, {
  foods: ['咖啡'],
  locationInput: '杭州东站',
});
assert.equal(submitPrefsRes.status, 200);
assert.equal(submitPrefsRes.body.member.location.lat, 30.25);
assert.equal(submitPrefsRes.body.member.location.lng, 120.17);
assert.equal(submitPrefsRes.body.member.location.name, '杭州东站');

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

installCommonStubs();
roomsRouter = require('../server/routes/rooms');
createRoomRes = await request(roomsRouter, 'POST', '/', {});
assert.equal(createRoomRes.status, 200);
const sharedRoomCode = createRoomRes.body.code;
const joinAliceRes = await request(roomsRouter, 'POST', `/${sharedRoomCode}/join`, { nickname: '小李', avatar: '李' });
const joinBobRes = await request(roomsRouter, 'POST', `/${sharedRoomCode}/join`, { nickname: '阿明', avatar: '明' });
const memberAlice = joinAliceRes.body.memberId;
const memberBob = joinBobRes.body.memberId;
const hotpotPoi = { id: 'poi-hotpot', name: '八先生涮肉房', category: '美食', subCategory: '正餐', rating: 4.8, price: 126, distanceLabel: '560m', photoUrl: 'https://img.example.com/hotpot.jpg' };
const coffeePoi = { id: 'poi-coffee', name: '山野咖啡', category: '美食', subCategory: '轻食', rating: 4.7, price: 39, distanceLabel: '220m', photoUrl: 'https://img.example.com/coffee.jpg' };
const escapePoi = { id: 'poi-escape', name: '谜境剧本杀', category: '玩乐', subCategory: '剧本杀', rating: 4.9, price: 168, distanceLabel: '900m', photoUrl: 'https://img.example.com/escape.jpg' };

let selectionRes = await request(
  roomsRouter,
  'POST',
  `/${sharedRoomCode}/members/${memberAlice}/selections`,
  { selectedPois: [hotpotPoi, coffeePoi] },
);
assert.equal(selectionRes.status, 200);
assert.equal(selectionRes.body.draft.items.length, 2);
assert.deepEqual(selectionRes.body.draft.items.map((item) => item.poi.id), ['poi-hotpot', 'poi-coffee']);
assert.deepEqual(selectionRes.body.draft.items[0].selectedByMemberIds, [memberAlice]);

selectionRes = await request(
  roomsRouter,
  'POST',
  `/${sharedRoomCode}/members/${memberBob}/selections`,
  { selectedPois: [hotpotPoi, escapePoi] },
);
assert.equal(selectionRes.status, 200);
assert.deepEqual(selectionRes.body.draft.items.map((item) => item.poi.id), ['poi-hotpot', 'poi-coffee', 'poi-escape']);
assert.deepEqual(selectionRes.body.draft.items.find((item) => item.poi.id === 'poi-hotpot')?.selectedByMemberIds, [memberAlice, memberBob]);
assert.equal(selectionRes.body.draft.version, 2);

let draftRes = await request(roomsRouter, 'GET', `/${sharedRoomCode}/draft`);
assert.equal(draftRes.status, 200);
assert.equal(draftRes.body.allConfirmed, false);
assert.equal(draftRes.body.canEdit, true);

let confirmRes = await request(roomsRouter, 'POST', `/${sharedRoomCode}/draft/confirm`, { memberId: memberAlice });
assert.equal(confirmRes.status, 200);
assert.deepEqual(confirmRes.body.draft.confirmedMemberIds, [memberAlice]);
assert.equal(confirmRes.body.canEdit, false);
assert.equal(confirmRes.body.allConfirmed, false);

let updateDraftRes = await request(roomsRouter, 'PUT', `/${sharedRoomCode}/draft`, {
  memberId: memberBob,
  selectedPois: [escapePoi, coffeePoi],
});
assert.equal(updateDraftRes.status, 200);
assert.equal(updateDraftRes.body.draft.version, 3);
assert.deepEqual(updateDraftRes.body.draft.confirmedMemberIds, []);
assert.deepEqual(updateDraftRes.body.draft.items.map((item) => item.poi.id), ['poi-escape', 'poi-coffee']);

selectionRes = await request(
  roomsRouter,
  'POST',
  `/${sharedRoomCode}/members/${memberAlice}/selections`,
  { selectedPois: [coffeePoi, escapePoi] },
);
assert.equal(selectionRes.status, 200);
assert.equal(selectionRes.body.draft.version, 4);
assert.deepEqual(selectionRes.body.draft.items.map((item) => item.poi.id), ['poi-escape', 'poi-coffee']);
assert.equal(selectionRes.body.draft.items.some((item) => item.poi.id === 'poi-hotpot'), false);

confirmRes = await request(roomsRouter, 'POST', `/${sharedRoomCode}/draft/confirm`, { memberId: memberAlice });
assert.equal(confirmRes.status, 200);
confirmRes = await request(roomsRouter, 'POST', `/${sharedRoomCode}/draft/confirm`, { memberId: memberBob });
assert.equal(confirmRes.status, 200);
assert.equal(confirmRes.body.allConfirmed, true);
assert.equal(confirmRes.body.draft.isFinalized, true);

const lockedUpdateRes = await request(roomsRouter, 'PUT', `/${sharedRoomCode}/draft`, {
  memberId: memberAlice,
  selectedPois: [hotpotPoi],
});
assert.equal(lockedUpdateRes.status, 409);
assert.equal(lockedUpdateRes.body.error, 'DRAFT_LOCKED');

console.log(JSON.stringify({
  location: locationRes.body,
  poisRootCount: 0,
  searchResultCount: searchResult.length,
  recommendationCount: recommendationResult.length,
  emptyRoute: 0,
  roomLocationSaved: true,
  aiFallbackSelectedCount: routeRes.body.selected.length,
}, null, 2));

process.exit(0);
