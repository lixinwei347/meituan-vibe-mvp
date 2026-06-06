import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire('/Users/luchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const appUrl = `file://${resolve(import.meta.dirname, '..', 'index.html')}`;

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

async function runScenario({ initScript, run }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  if (initScript) {
    await page.addInitScript(initScript);
  }

  await page.route('https://webapi.amap.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.AMap = {
          Map: function () {
            return {
              setCenter() {},
              remove() {},
              add() {},
              setFitView() {},
              resize() {},
            };
          },
          Marker: function (opts = {}) {
            return {
              ...opts,
              on() {},
            };
          },
          Polyline: function (opts = {}) {
            return { ...opts };
          },
        };
      `,
    });
  });

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.waitForFunction(() => Boolean(window.__mtVibeTestState && window.__mtVibeRender));
  const result = await run(page);
  await page.close();

  if (errors.length) {
    throw new Error(`Browser console errors: ${errors.join('; ')}`);
  }
  return result;
}

const emptyState = await runScenario({
  initScript: () => {
    window.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/api/location/default')) {
        return { ok: true, json: async () => ({ lat: null, lng: null, name: '未设置位置', address: '' }) };
      }
      if (url.includes('/api/pois')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/route/plan')) {
        return { ok: true, json: async () => ({ selected: [], legs: [], totalDistanceLabel: '待选', aiPowered: false, empty: true }) };
      }
      return { ok: true, json: async () => ({}) };
    };
  },
  run: async (page) => {
    await page.evaluate(() => {
      window.RoomApi = undefined;
      if (window.MockApi) {
        window.MockApi.getPoiRecommendations = async () => [];
        window.MockApi.planRoute = async () => ({ selected: [], totalDistanceLabel: '待选' });
        window.MockApi.searchPois = async () => [];
      }
    });
    await page.click('#open-room-modal');
    await page.click('#create-room');
    await page.waitForTimeout(200);
    const roomFailureToast = await page.locator('#toast').textContent();
    const roomScreen = await page.locator('.screen:not(.hidden)').first().getAttribute('data-screen');

    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '09';
      window.__mtVibeTestState.currentMembers = [];
      window.__mtVibeTestState.recommendations = [];
      window.__mtVibeTestState.previewSelectedIds = [];
      window.__mtVibeTestState.previewPoiPool = [];
      window.__mtVibeTestState.selectedIds = [];
      window.__mtVibeTestState.routePlan = { selected: [], totalDistanceLabel: '待选' };
      window.__mtVibeRender();
    });
    const memberEmpty = await page.locator('#member-list .empty-state').textContent();

    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '11';
      window.__mtVibeRender();
    });
    const recommendationEmpty = await page.locator('#recommendation-list .empty-state').textContent();

    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '12';
      window.__mtVibeRender();
    });
    const routeEmpty = await page.locator('#route-list .empty-state').textContent();

    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '14';
      window.__mtVibeTestState.albumPhotos = [];
      window.__mtVibeRender();
    });
    const albumEmpty = await page.locator('#photo-grid .empty-state').textContent();

    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '18';
      window.__mtVibeTestState.activeTripHistoryId = null;
      window.__mtVibeTestState.notebook = null;
      window.__mtVibeRender();
    });
    const notebookEmpty = await page.locator('#notebook-card .empty-state, #notebook-card .notebook-empty').textContent();

    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '19';
      window.__mtVibeTestState.notebook = null;
      window.__mtVibeTestState.activeTripHistoryId = null;
      window.__mtVibeRender();
    });
    const mediaEmpty = await page.locator('#media-viewer-content').textContent();

    return { roomFailureToast, roomScreen, memberEmpty, recommendationEmpty, routeEmpty, albumEmpty, notebookEmpty, mediaEmpty };
  },
});

const mainFlow = await runScenario({
  initScript: () => {
    window.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/api/location/default')) {
        return { ok: true, json: async () => ({ lat: 39.905, lng: 116.391, name: '测试起点', address: '测试地址' }) };
      }
      if (url.includes('/api/pois')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/route/plan')) {
        return { ok: true, json: async () => ({ selected: [], legs: [], totalDistanceLabel: '待选', aiPowered: false, empty: true }) };
      }
      return { ok: true, json: async () => ({}) };
    };
  },
  run: async (page) => {
    await page.evaluate(() => {
      const listeners = { snapshot: [], memberJoined: [], memberUpdate: [], draftUpdate: [] };
      let sharedDraft = null;
      window.RoomApi = {
        memberId: 'member-self',
        async createRoom() {
          return { code: '4321' };
        },
        async joinRoom(code, { nickname, avatar }) {
          return {
            memberId: 'member-self',
            members: [
              { memberId: 'member-self', nickname: nickname || '我', avatar: avatar || '我', status: 'pending', prefSummary: '' },
              { memberId: 'member-friend', nickname: '好友', avatar: '好', status: 'submitted', prefSummary: '已提交偏好' },
            ],
            code,
          };
        },
        async submitPrefs() {
          return { ok: true };
        },
        async submitSelections(selectedPois) {
          sharedDraft = {
            version: 1,
            items: selectedPois.map((poi, index) => ({
              poi,
              selectedByMemberIds: index === 0 ? ['member-self', 'member-friend'] : ['member-self'],
            })),
            confirmedMemberIds: [],
            isFinalized: false,
            canEdit: true,
            allConfirmed: false,
          };
          return { ok: true, draft: sharedDraft };
        },
        async getDraft() {
          return sharedDraft;
        },
        async updateDraft(selectedPois) {
          sharedDraft = {
            ...(sharedDraft || {}),
            version: (sharedDraft?.version || 0) + 1,
            items: selectedPois.map((poi) => ({ poi, selectedByMemberIds: ['member-self'] })),
            confirmedMemberIds: [],
            isFinalized: false,
            canEdit: true,
            allConfirmed: false,
          };
          return { ok: true, draft: sharedDraft };
        },
        async confirmDraft() {
          sharedDraft = {
            ...(sharedDraft || {}),
            confirmedMemberIds: ['member-self', 'member-friend'],
            isFinalized: true,
            canEdit: false,
            allConfirmed: true,
          };
          return { ok: true, draft: sharedDraft, allConfirmed: true };
        },
        onSnapshot(cb) {
          listeners.snapshot.push(cb);
        },
        onMemberJoined(cb) {
          listeners.memberJoined.push(cb);
        },
        onMemberUpdate(cb) {
          listeners.memberUpdate.push(cb);
        },
        onDraftUpdate(cb) {
          listeners.draftUpdate.push(cb);
        },
      };
      if (window.MockApi) {
        const pois = [
          { id: 'poi-1', name: '测试火锅', category: '美食', subCategory: '火锅', rating: 4.7, price: 96, distanceLabel: '800m', tags: ['热闹', '适合聚餐'], mood: 'yellow', lat: 39.905, lng: 116.391 },
          { id: 'poi-2', name: '测试咖啡', category: '美食', subCategory: '咖啡', rating: 4.6, price: 38, distanceLabel: '1.2km', tags: ['安静', '聊天'], mood: 'mint', lat: 39.907, lng: 116.394 },
          { id: 'poi-3', name: '测试甜品', category: '美食', subCategory: '甜品', rating: 4.8, price: 42, distanceLabel: '1.6km', tags: ['打卡', '拍照'], mood: 'pink', lat: 39.909, lng: 116.396 },
        ];
        window.MockApi.getPoiRecommendations = async () => pois;
        window.MockApi.searchPois = async () => pois;
        window.MockApi.planRoute = async () => ({
          selected: pois.slice(0, 2),
          totalDistanceLabel: '2.0km',
          aiReason: '测试路线',
        });
      }
    });
    await page.click('#open-room-modal');
    await page.fill('#room-nickname-create', '测试');
    await page.click('#create-room');
    await page.waitForTimeout(300);
    const summaryScreen = await page.locator('.screen:not(.hidden)').first().getAttribute('data-screen');
    const memberCards = await page.locator('#member-list .member-card').count();

    await page.evaluate(() => {
      const pois = [
        { id: 'poi-1', name: '测试火锅', category: '美食', subCategory: '火锅', rating: 4.7, price: 96, distanceLabel: '800m', tags: ['热闹', '适合聚餐'], mood: 'yellow', lat: 39.905, lng: 116.391 },
        { id: 'poi-2', name: '测试咖啡', category: '美食', subCategory: '咖啡', rating: 4.6, price: 38, distanceLabel: '1.2km', tags: ['安静', '聊天'], mood: 'mint', lat: 39.907, lng: 116.394 },
        { id: 'poi-3', name: '测试甜品', category: '美食', subCategory: '甜品', rating: 4.8, price: 42, distanceLabel: '1.6km', tags: ['打卡', '拍照'], mood: 'pink', lat: 39.909, lng: 116.396 },
      ];
      window.__mtVibeTestState.screen = '11';
      window.__mtVibeTestState.recommendations = pois;
      window.__mtVibeTestState.previewPoiPool = [...pois];
      window.__mtVibeTestState.previewSelectedIds = [];
      window.__mtVibeTestState.previewIds = pois.map((poi) => poi.id);
      window.__mtVibeTestState.routePlan = { selected: [], totalDistanceLabel: '待选' };
      window.__mtVibeRender();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '10';
      window.__mtVibeRender();
    });
    const loadingSummary = await page.locator('#loading-member-summary').textContent();
    await page.evaluate(() => {
      window.__mtVibeTestState.screen = '11';
      window.__mtVibeRender();
    });
    await page.locator('.poi-card').nth(0).click();
    await page.locator('.poi-card').nth(1).click();
    await page.click('#next-step');
    await page.waitForTimeout(800);
    const routeScreen = await page.locator('.screen:not(.hidden)').first().getAttribute('data-screen');
    const routeCards = await page.locator('#route-list .route-card').count();

    await page.click('#confirm-route');
    await page.waitForTimeout(800);
    const liveScreen = await page.locator('.screen:not(.hidden)').first().getAttribute('data-screen');
    const startTripCount = await page.locator('#start-live-trip').count();
    if (startTripCount !== 1) {
      throw new Error('Live itinerary should expose a start trip action before execution');
    }
    await page.click('#start-live-trip');
    await page.waitForTimeout(300);
    const activeStopNameBefore = await page.locator('[data-active-stop] h3').textContent();
    await page.click('[data-complete-stop]');
    await page.waitForTimeout(300);
    const activeStopNameAfter = await page.locator('[data-active-stop] h3').textContent();

    await page.click('#end-trip');
    await page.waitForTimeout(300);
    await page.click('#generate-notebook');
    await page.waitForTimeout(200);
    await page.click('#confirm-end-trip');
    await page.waitForTimeout(500);
    const notebookScreen = await page.locator('.screen:not(.hidden)').first().getAttribute('data-screen');
    const notebookSheet = await page.locator('.notebook-card--sheet').count();

    return { summaryScreen, memberCards, loadingSummary, routeScreen, routeCards, liveScreen, notebookScreen, notebookSheet, activeStopNameBefore, activeStopNameAfter };
  },
});

await browser.close();

const result = { emptyState, mainFlow };
console.log(JSON.stringify(result, null, 2));

if (!emptyState.roomFailureToast?.includes('房间服务不可用') || emptyState.roomScreen !== '05') {
  throw new Error('Create room should stay on the modal and show an honest RoomApi failure when unavailable');
}
if (!emptyState.memberEmpty?.includes('等待成员加入')) {
  throw new Error('Member area should render a waiting empty state when no real members exist');
}
if (!emptyState.recommendationEmpty?.includes('暂无推荐结果')) {
  throw new Error('Recommendations UI should render an explicit empty state when no real recommendations exist');
}
if (!emptyState.routeEmpty?.includes('还没有路线')) {
  throw new Error('Route UI should render an explicit empty state when no route exists');
}
if (!emptyState.albumEmpty?.includes('还没有照片')) {
  throw new Error('Album should render an explicit empty state when no photos exist');
}
if (!emptyState.notebookEmpty?.includes('还没有生成 AI 手帐')) {
  throw new Error('Notebook should render an explicit empty state when no notebook exists');
}
if (!emptyState.mediaEmpty?.includes('暂无可预览内容')) {
  throw new Error('Media viewer should render an explicit empty state when no notebook media exists');
}
if (mainFlow.summaryScreen !== '09' || mainFlow.memberCards < 1) {
  throw new Error('Main flow should still render real members after a successful room create/join');
}
if (!mainFlow.loadingSummary?.includes('综合 2 位成员位置')) {
  throw new Error('Loading screen should render the actual member count in its AI route summary');
}
if (mainFlow.routeScreen !== '12' || mainFlow.routeCards < 2) {
  throw new Error('Main flow should still produce route cards after selecting recommendations');
}
if (mainFlow.liveScreen !== '13') {
  throw new Error('Main flow should still reach the live itinerary screen');
}
if (!mainFlow.activeStopNameBefore || !mainFlow.activeStopNameAfter || mainFlow.activeStopNameBefore === mainFlow.activeStopNameAfter) {
  throw new Error('Live itinerary should advance to the next stop after completing the current stop');
}
if (mainFlow.notebookScreen !== '18' || mainFlow.notebookSheet !== 1) {
  throw new Error('Main flow should still render the notebook sheet after ending the trip');
}
