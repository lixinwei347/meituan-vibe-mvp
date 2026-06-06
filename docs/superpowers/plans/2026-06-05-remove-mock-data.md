# Remove Mock Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all runtime mock/demo data from `meituan-vibe-mvp` while preserving explicit empty and error states.

**Architecture:** The backend becomes the only source of POIs, recommendations, route plans, and location context. The frontend stops seeding fake data and instead renders empty or error states whenever the backend returns empty payloads or failures. Test fixtures are updated to assert honest no-data behavior rather than demo-filled screens.

**Tech Stack:** Vanilla JS frontend, static HTML/CSS, Express backend, Node-based smoke tests, Playwright browser smoke test.

---

## File Structure

- `app.js`
  Runtime frontend state and flow orchestration. Remove seeded mock content, remove local room-mode fallback, and add empty/error handling for members, album, recommendations, routes, and bootstrap flows.
- `index.html`
  Static shell. Replace demo room code, invite copy, and mock alert behavior with neutral placeholders that do not surface fabricated data before JS updates the DOM.
- `real-api.js`
  Frontend API adapter. Preserve interface shape but stop relying on backend mock semantics; ensure empty responses are handled consistently.
- `mock-api.js`
  Obsolete runtime mock API. Delete after removing any runtime or test dependency.
- `server/routes/location.js`
  Replace fake fixed location with a neutral "location unknown" response.
- `server/routes/pois.js`
  Remove local mock POI fallback and return only provider results or empty arrays.
- `server/routes/route.js`
  Remove mock route fallback and return a structured empty route response when no real POI candidates are available.
- `server/data/pois.js`
  Remove if no longer needed anywhere after backend mock fallback deletion.
- `tests/static-smoke.mjs`
  Keep structural checks but stop assuming seeded content.
- `tests/route-plan.mjs`
  Replace direct `mock-api.js` test with route/empty-contract coverage around real backend modules or route helpers.
- `tests/browser-smoke.mjs`
  Update flow assertions so they work with no seeded demo content and no fake local room fallback.

---

### Task 1: Remove Backend Mock Fallbacks

**Files:**
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/location.js`
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/pois.js`
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/route.js`
- Test: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs`

- [ ] **Step 1: Write the failing backend contract test**

```js
import { strict as assert } from 'node:assert';
import locationRouter from '../server/routes/location.js';
import poisRouter from '../server/routes/pois.js';
import routeRouter from '../server/routes/route.js';

test('location endpoint no longer returns fixed Beijing coordinates', async () => {
  const res = await callRouter(locationRouter, 'GET', '/default');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.lat, null);
  assert.equal(res.body.lng, null);
  assert.equal(res.body.name, '未设置位置');
});

test('route planning returns an empty contract instead of mock route data when no candidates exist', async () => {
  const res = await callRouter(routeRouter, 'POST', '/plan', {
    origin: { lat: null, lng: null, name: '未设置位置' },
    selectedPois: [],
    prefs: {},
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.selected, []);
  assert.deepEqual(res.body.legs, []);
  assert.equal(res.body.aiPowered, false);
  assert.equal(res.body.empty, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs`

Expected: FAIL because the current test still loads `mock-api.js` and/or the backend still emits fixed mock values.

- [ ] **Step 3: Replace location and POI fallback behavior with empty contracts**

```js
// server/routes/location.js
const router = require('express').Router();

router.get('/default', (_req, res) => {
  res.json({
    lat: null,
    lng: null,
    name: '未设置位置',
    address: '',
    source: 'empty',
    timestamp: Date.now(),
  });
});

module.exports = router;
```

```js
// server/routes/pois.js
const router = require('express').Router();
const { nearbySearch, searchByPrefs, geocode } = require('../lib/amapSearch');

const EMPTY_RESULTS = [];
const DEFAULT_CENTER = { lat: 39.905, lng: 116.391 };

router.get('/', (_req, res) => {
  res.json(EMPTY_RESULTS);
});

router.get('/search', async (req, res) => {
  const { q = '', lat, lng } = req.query;
  const center = (lat && lng)
    ? { lat: parseFloat(lat), lng: parseFloat(lng) }
    : DEFAULT_CENTER;

  if (!q.trim()) return res.json(EMPTY_RESULTS);

  try {
    const pois = await nearbySearch({ center, keywords: q.trim(), radius: 5000, limit: 8 });
    return res.json(pois);
  } catch (e) {
    console.warn('[amap search] real search failed:', e.message);
    return res.json(EMPTY_RESULTS);
  }
});

router.post('/recommendations', async (req, res) => {
  const { center, prefs, members } = req.body || {};
  let searchCenter = (center?.lat && center?.lng) ? center : DEFAULT_CENTER;

  if (prefs?.locationInput && searchCenter === DEFAULT_CENTER) {
    try {
      const geo = await geocode(prefs.locationInput);
      if (geo) searchCenter = geo;
    } catch (_) {}
  }

  try {
    const pois = await searchByPrefs({ center: searchCenter, prefs, members, radius: 3000, mode: prefs?.mode });
    return res.json(pois);
  } catch (e) {
    console.warn('[amap recommend] real search failed:', e.message);
    return res.json(EMPTY_RESULTS);
  }
});

module.exports = router;
```

- [ ] **Step 4: Replace mock route fallback with empty route response**

```js
// server/routes/route.js
function buildEmptyRoute(origin, reason) {
  return {
    origin,
    selected: [],
    legs: [],
    totalDistanceMeters: 0,
    totalDistanceLabel: '0m',
    aiReason: reason,
    aiPowered: false,
    empty: true,
  };
}

router.post('/plan', async (req, res) => {
  const { origin, prefs, members } = req.body || {};
  const fallbackOrigin = (origin?.lat && origin?.lng)
    ? origin
    : { lat: null, lng: null, name: '未设置位置', address: '' };

  let candidatePois = [];

  if (req.body?.selectedPois?.length) {
    candidatePois = req.body.selectedPois;
  } else {
    try {
      candidatePois = await searchByPrefs({
        center: fallbackOrigin.lat && fallbackOrigin.lng ? fallbackOrigin : { lat: 39.905, lng: 116.391 },
        prefs: { ...prefs, mode: prefs?.mode || '综合最优' },
        members,
        radius: 3000,
      });
    } catch (e) {
      console.warn('[amap] real search failed:', e.message);
    }
  }

  if (!candidatePois.length) {
    return res.json(buildEmptyRoute(fallbackOrigin, '暂无可用地点，请先搜索或填写位置'));
  }

  // keep existing AI / greedy ordering logic for real POIs only
});
```

- [ ] **Step 5: Rewrite the route-plan test around the new contract**

```js
import assert from 'node:assert/strict';
import { createRequestHarness } from './support/router-harness.mjs';
import locationRouter from '../server/routes/location.js';
import routeRouter from '../server/routes/route.js';

const locationRes = await createRequestHarness(locationRouter).get('/default');
assert.equal(locationRes.body.lat, null);
assert.equal(locationRes.body.lng, null);
assert.equal(locationRes.body.name, '未设置位置');

const routeRes = await createRequestHarness(routeRouter).post('/plan', {
  origin: { lat: null, lng: null, name: '未设置位置' },
  selectedPois: [],
  prefs: {},
});

assert.equal(routeRes.statusCode, 200);
assert.equal(routeRes.body.empty, true);
assert.deepEqual(routeRes.body.selected, []);
assert.deepEqual(routeRes.body.legs, []);
assert.equal(routeRes.body.aiReason, '暂无可用地点，请先搜索或填写位置');
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs`

Expected: PASS with no dependency on `mock-api.js`.

- [ ] **Step 7: Commit**

```bash
git add /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/location.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/pois.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/route.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs
git commit -m "refactor: remove backend mock fallbacks"
```

### Task 2: Remove Frontend Seeded Mock State

**Files:**
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/app.js`
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/index.html`
- Test: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

- [ ] **Step 1: Write the failing structural test**

```js
const forbiddenAppMarkers = [
  "const members = [",
  "const initialAlbumPhotos = [",
  "locationInput: '北京市西单大悦城'",
];

const forbiddenHtmlMarkers = [
  '房间码 8273',
  'https://meituan.example/route-room/8273',
  '已生成邀请图片卡片（mock）',
];

for (const needle of forbiddenAppMarkers) {
  if (app.includes(needle)) throw new Error(`Mock marker still present in app.js: ${needle}`);
}

for (const needle of forbiddenHtmlMarkers) {
  if (html.includes(needle)) throw new Error(`Mock marker still present in index.html: ${needle}`);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

Expected: FAIL because the seeded member/photo/location data and HTML demo strings still exist.

- [ ] **Step 3: Remove seeded state from `app.js`**

```js
const state = {
  screen: '04',
  origin: null,
  recommendations: [],
  previewPoiPool: [],
  searchResults: [],
  selectedIds: [],
  routePlan: null,
  historyTrips: [],
  notebook: null,
  albumPhotos: [],
  currentMembers: [],
  selectedPrefs: {
    categories: [],
    fun: [],
    avoid: [],
    startHour: 18,
    foods: [],
    foodsInput: '',
    avoidInput: '',
    funInput: '',
    locationInput: '',
  },
};
```

```js
function renderMembers() {
  const list = state.currentMembers;
  if (!list.length) {
    el.memberList.innerHTML = '<div class="empty-state">等待成员加入后再填写偏好</div>';
    return;
  }

  el.memberList.innerHTML = list.map((member, index) => {
    const isSelf = member.memberId === state.memberId;
    const tone = isSelf ? 'yellow' : 'blue';
    const statusCN = member.status === 'submitted' ? '已提交' : '待确认';
    const summary = member.prefSummary || (isSelf ? '点击填写偏好 →' : '尚未填写偏好');
    return `
      <article class="member-card member-card--status member-card--food ${index === 0 ? 'is-owner' : ''}"${isSelf ? ' data-self="true"' : ''}>
        <div class="member-photo"><span class="avatar ${tone}">${member.avatar}</span></div>
        <div>
          <div class="member-name">${member.nickname}${isSelf ? '<em>我</em>' : ''}</div>
          <div class="member-meta">${summary}</div>
        </div>
        <div class="member-tag ${statusCN === '已提交' ? 'member-tag--done' : 'member-tag--wait'}">${statusCN}</div>
      </article>`;
  }).join('');
}
```

- [ ] **Step 4: Replace static HTML demo content with neutral placeholders**

```html
<div class="share-code"><span>#</span> 房间码 <span id="share-room-code">----</span></div>
```

```js
if (button.id === 'copy-room-link') {
  return;
}

if (button.id === 'send-invite') {
  return;
}
```

The static inline script should stop copying demo URLs or showing mock alerts because `app.js` owns those actions.

- [ ] **Step 5: Run the structural test to verify it passes**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

Expected: PASS with all required structural markers still present and all forbidden mock markers removed.

- [ ] **Step 6: Commit**

```bash
git add /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/app.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/index.html \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs
git commit -m "refactor: remove seeded frontend mock state"
```

### Task 3: Add Honest Empty and Error States to Frontend Flows

**Files:**
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/app.js`
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/styles.css`
- Test: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs`

- [ ] **Step 1: Write the failing browser smoke expectations**

```js
const emptyRecommendations = await page.locator('#recommendation-list .empty-state').count();
const emptyMembers = await page.locator('#member-list .empty-state').count();

if (emptyMembers !== 1) throw new Error('Expected member empty state before others join');
if (emptyRecommendations !== 1) throw new Error('Expected recommendation empty state when no real data is available');
```

- [ ] **Step 2: Run the browser smoke test to verify it fails**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs`

Expected: FAIL because the current UI still expects seeded cards or fills fake content.

- [ ] **Step 3: Remove local room fallback and add empty rendering**

```js
el.createRoom.addEventListener('click', async () => {
  const nickname = (el.roomNicknameCreate?.value || '').trim() || '房主';
  const avatar = nickname.charAt(0).toUpperCase();

  if (!window.RoomApi) {
    showToast('房间服务不可用');
    return;
  }

  try {
    showToast('创建中...');
    const roomData = await window.RoomApi.createRoom({});
    const joinData = await window.RoomApi.joinRoom(roomData.code, { nickname, avatar });
    state.roomCode = roomData.code;
    state.memberId = joinData.memberId;
    state.currentMembers = joinData.members || [];
    registerRoomWsListeners();
    state.screen = '09';
    render();
  } catch (e) {
    console.warn('创建房间失败', e);
    showToast('创建房间失败，请稍后重试');
  }
});
```

```js
function renderRecommendationList() {
  if (!state.recommendations.length) {
    el.recommendationList.innerHTML = '<div class="empty-state">暂无推荐结果，请填写位置或稍后重试</div>';
    return;
  }

  // keep existing card rendering for real data
}

function renderRouteList() {
  if (!state.routePlan?.selected?.length) {
    el.routeList.innerHTML = '<div class="empty-state">暂无路线，请先选择地点</div>';
    return;
  }

  // keep existing route-card rendering for real data
}

function renderNotebook() {
  if (!state.notebook) {
    el.notebookCard.innerHTML = '<div class="empty-state">暂无行程手账</div>';
    return;
  }

  if (!state.notebook.photos.length) {
    el.notebookMediaGrid.innerHTML = '<div class="empty-state">暂无照片内容</div>';
  }
}
```

- [ ] **Step 4: Add a shared visual style for empty states**

```css
.empty-state {
  padding: 16px;
  border-radius: 16px;
  background: rgba(17, 17, 17, 0.05);
  color: rgba(17, 17, 17, 0.65);
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}
```

- [ ] **Step 5: Run the browser smoke test to verify it passes**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs`

Expected: PASS with no console errors and with empty states rendered where real data is absent.

- [ ] **Step 6: Commit**

```bash
git add /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/app.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/styles.css \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs
git commit -m "feat: add honest empty states for no-data flows"
```

### Task 4: Remove Obsolete Mock Runtime Files and References

**Files:**
- Modify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/real-api.js`
- Delete: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/mock-api.js`
- Delete: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/data/pois.js` (only if no longer referenced)
- Test: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

- [ ] **Step 1: Write the failing dead-reference check**

```js
const forbiddenReferences = [
  'mock-api.js',
  'server/data/pois',
  '已使用 mock 数据兜底',
  '使用本地 mock',
  'hardcoded mock',
];

for (const needle of forbiddenReferences) {
  if (app.includes(needle) || html.includes(needle) || routeTest.includes(needle)) {
    throw new Error(`Obsolete mock reference still present: ${needle}`);
  }
}
```

- [ ] **Step 2: Run the dead-reference check to verify it fails**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

Expected: FAIL because runtime code and tests still mention mock files or mock fallback messages.

- [ ] **Step 3: Remove obsolete files and update API comments**

```js
// real-api.js
/**
 * real-api.js — backend API client
 *
 * window.MockApi is preserved only as a legacy interface name for app.js
 * compatibility. It must never point to local fabricated data.
 */
```

```bash
rm /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/mock-api.js
rm /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/data/pois.js
```

If `server/data/pois.js` is still needed for a non-mock helper, replace it first with a renamed helper module that contains only neutral utility logic and no seeded POI dataset.

- [ ] **Step 4: Run the dead-reference check to verify it passes**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

Expected: PASS with no runtime references to mock-only files or mock-only log strings.

- [ ] **Step 5: Commit**

```bash
git add /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/real-api.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs
git add -u /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/mock-api.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/data/pois.js
git commit -m "chore: remove obsolete mock runtime files"
```

### Task 5: Final Verification

**Files:**
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/app.js`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/index.html`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/real-api.js`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/location.js`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/pois.js`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/route.js`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs`
- Verify: `/Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs`

- [ ] **Step 1: Run static smoke**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs`

Expected: PASS

- [ ] **Step 2: Run route contract test**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs`

Expected: PASS

- [ ] **Step 3: Run browser smoke**

Run: `node /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs`

Expected: PASS

- [ ] **Step 4: Verify no mock references remain**

Run: `rg -n "mock|hardcoded mock|8273|meituan.example/route-room|已使用 mock 数据兜底|使用本地 mock" /Users/luchen/Downloads/hackathon/meituan-vibe-mvp`

Expected: No runtime references in shipping code. Any remaining hits must be intentional test text or archived docs only.

- [ ] **Step 5: Commit final verification-only adjustments if needed**

```bash
git add /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/app.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/index.html \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/real-api.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/location.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/pois.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/server/routes/route.js \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/static-smoke.mjs \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/route-plan.mjs \
  /Users/luchen/Downloads/hackathon/meituan-vibe-mvp/tests/browser-smoke.mjs
git commit -m "test: verify no-mock runtime contract"
```

---

## Self-Review

### Spec Coverage

- Backend mock fallback removal: Task 1
- Frontend seeded fake data removal: Task 2
- Empty/error state behavior: Task 3
- Obsolete mock file/reference cleanup: Task 4
- Verification against acceptance criteria: Task 5

No spec section is currently uncovered.

### Placeholder Scan

- No `TODO`, `TBD`, or "similar to previous task" placeholders remain.
- Every task includes file paths, commands, and concrete code direction.

### Type Consistency

- Empty route contract consistently uses `empty`, `selected`, `legs`, `aiReason`, and `aiPowered`.
- Neutral location contract consistently uses `lat`, `lng`, `name`, `address`, and `source`.
- Frontend empty state markup consistently uses `.empty-state`.
