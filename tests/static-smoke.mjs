import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const app = readFileSync(resolve(root, 'app.js'), 'utf8');

const requiredHtml = [
  'class="screen screen-18',
  'class="screen screen-19',
  'id="home-history-list"',
  'id="home-history-see-all"',
  'id="end-trip-dialog"',
  'id="end-trip-stats"',
  'id="confirm-end-trip"',
  'id="notebook-card"',
  'id="media-viewer-content"',
  'id="summary-progress-text"',
  'id="summary-progress-avatars"',
  'route-patch.css',
  'id="live-map13"',
  'id="live-map15"',
];

const requiredFunctions = [
  'function renderEndTripDialog',
  'function renderNotebook',
  'function renderHistory',
  'function renderSummaryProgress',
  'function shouldHydrateInitialRoutePlan',
  'async function requestRecommendationsForMode',
  'function renderLiveMapFallback',
  'function renderPoiVisual',
  'function finishTrip',
  'function generateNotebookFromTrip',
  'function saveNotebookImage',
  'function shareNotebook',
  'function createNotebookShareImage',
  'function stepMedia',
];

const forbiddenHtmlPatterns = [
  /房间码\s*8273/,
  /https:\/\/meituan\.example\/route-room\/8273/,
  /已生成邀请图片卡片（mock）/,
  /<span>林<\/span>/,
  /<span>雯<\/span>/,
  /<span>杰<\/span>/,
  /\bXinwei\b/,
  /\bYuki\b/,
  /\bLeo\b/,
  /3\/5\s*人已提交偏好/,
  /北京市西单大悦城/,
  /今天\s*20:48/,
];

const forbiddenAppPatterns = [
  /const\s+members\s*=\s*\[/,
  /const\s+initialAlbumPhotos\s*=\s*\[/,
  /locationInput:\s*['"]北京市西单大悦城['"]/,
  /\bXinwei\b/,
  /\bYuki\b/,
  /\bLeo\b/,
  /\bMia\b/,
  /火锅店第一张合照/,
  /城市露台咖啡拉花/,
  /甜品拼盘九宫格/,
  /成员路上随手拍/,
  /https:\/\/meituan\.example\/route-room\/\$\{code\}/,
  /今天\s*20:48/,
];

for (const needle of requiredHtml) {
  if (!html.includes(needle)) {
    throw new Error(`Missing HTML marker: ${needle}`);
  }
}

for (const needle of requiredFunctions) {
  if (!app.includes(needle)) {
    throw new Error(`Missing app function: ${needle}`);
  }
}

for (const pattern of forbiddenHtmlPatterns) {
  if (pattern.test(html)) {
    throw new Error(`Seeded HTML marker should be removed: ${pattern}`);
  }
}

for (const pattern of forbiddenAppPatterns) {
  if (pattern.test(app)) {
    throw new Error(`Seeded app marker should be removed: ${pattern}`);
  }
}

if (!app.includes('manualRouteOrder')) {
  throw new Error('Route ordering should distinguish AI optimized order from manual edits');
}

if (!app.includes('state.routePlan = nextRoutePlan') || !app.includes('shouldHydrateInitialRoutePlan')) {
  throw new Error('Bootstrap route hydration should be guarded to avoid overwriting in-progress route editing');
}

if (!app.includes('photoUrl') || !app.includes('renderPoiVisual')) {
  throw new Error('POI cards should support real photo rendering when the backend provides photoUrl');
}

if (!app.includes('const fun = [...new Set([...state.selectedPrefs.fun')) {
  throw new Error('Fun preference sync should use selected fun tags instead of the full default catalog');
}

if (!app.includes('state.recommendationRequestId += 1') || !app.includes('const requestId = state.recommendationRequestId')) {
  throw new Error('Recommendation refresh should guard against stale async filter responses');
}

if (html.includes('history-panel--notebook') || html.includes('id="notebook-history-list"')) {
  throw new Error('Notebook page should not show trip history');
}

if (app.includes("state.screen = '16'")) {
  throw new Error('End trip should open a dialog instead of navigating to a separate screen');
}

if (!app.includes('homeHistoryExpanded') || !app.includes('renderHistoryCards({ limit:')) {
  throw new Error('Home history should default to a limited list with see all support');
}

if (!app.includes('endTripChoice') || !app.includes('function confirmEndTrip')) {
  throw new Error('End trip dialog should support selection before confirmation');
}

if (!app.includes('notebook-card--sheet') || !app.includes('notebook-layout')) {
  throw new Error('Notebook should use the compact image-like scrapbook layout');
}

if (!app.includes('function getActiveNotebook') || !app.includes('trip?.notebook')) {
  throw new Error('History notebook reopen should resolve the notebook from the selected trip entry');
}

if (!app.includes('formatNotebookDate') || !app.includes('generatedAt')) {
  throw new Error('Notebook timestamp should be generated from trip completion time instead of a seeded literal');
}
