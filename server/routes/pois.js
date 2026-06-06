const router = require('express').Router();
const { nearbySearch, searchByPrefs, geocode } = require('../lib/amapSearch');
const https = require('https');
const { DOUBAO_API_KEY, DOUBAO_MODEL } = require('../config');

const DOUBAO_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';

function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function parseCenter(lat, lng) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return null;
  }
  return { lat: parsedLat, lng: parsedLng };
}

function getMembersCenter(members = []) {
  const points = members
    .map((member) => member?.location)
    .filter(hasCoordinates);
  if (!points.length) return null;
  const lat = points.reduce((sum, point) => sum + Number(point.lat), 0) / points.length;
  const lng = points.reduce((sum, point) => sum + Number(point.lng), 0) / points.length;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    name: '成员中心',
    address: '成员聚合位置',
  };
}

const COMPREHENSIVE_SLOTS = [
  { key: 'meal', label: '美食-正餐', keywords: ['火锅', '日料', '粤菜', '川湘', '烧烤', '烤肉', '西餐', '正餐', '餐厅', '吃饭'], searchKeywords: '火锅|日料|粤菜|川湘|烧烤|烤肉|西餐' },
  { key: 'light', label: '美食-轻食', keywords: ['咖啡', '甜品', '奶茶', '下午茶', '轻食', '面包', '蛋糕'], searchKeywords: '咖啡|甜品|奶茶|下午茶' },
  { key: 'ktv', label: '玩乐-KTV', keywords: ['ktv', 'k歌', '唱歌'], searchKeywords: 'KTV' },
  { key: 'escape', label: '玩乐-密室/剧本杀', keywords: ['密室', '剧本杀', '推理'], searchKeywords: '密室|剧本杀' },
  { key: 'movie', label: '玩乐-电影', keywords: ['电影', '影院'], searchKeywords: '电影|影院' },
  { key: 'gaming', label: '玩乐-游戏/电竞', keywords: ['电竞', '游戏', '电玩', '游戏厅'], searchKeywords: '电竞|游戏厅|电玩' },
  { key: 'sports', label: '玩乐-运动/户外', keywords: ['攀岩', '运动', '户外', '羽毛球', '滑冰', '篮球', '骑行', '徒步'], searchKeywords: '攀岩|运动|户外|羽毛球|滑冰|篮球|骑行' },
  { key: 'casual', label: '玩乐-休闲', keywords: ['桌游', '棋牌', '酒吧', '休闲', '美甲', '美睫', 'spa', '逛街'], searchKeywords: '桌游|棋牌|酒吧|美甲|美睫|SPA|休闲' },
];

function collectComprehensiveTokens(prefs = {}, members = []) {
  const values = [];
  if (prefs.foods?.length) values.push(...prefs.foods);
  if (prefs.fun?.length) values.push(...prefs.fun);
  if (prefs.categories?.length) values.push(...prefs.categories);
  members.forEach((member) => {
    if (member?.prefs?.foods?.length) values.push(...member.prefs.foods);
    if (member?.prefs?.fun?.length) values.push(...member.prefs.fun);
    if (member?.prefs?.categories?.length) values.push(...member.prefs.categories);
    if (member?.prefSummary) values.push(...String(member.prefSummary).split(/[/\s,，、]+/));
  });
  return values.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
}

function deriveComprehensiveSlots(prefs = {}, members = []) {
  const tokens = collectComprehensiveTokens(prefs, members);
  const slots = COMPREHENSIVE_SLOTS
    .map((slot) => {
      const matchedTokens = tokens.filter((token) => slot.keywords.some((keyword) => token.includes(keyword)));
      return matchedTokens.length ? { ...slot, matchedTokens: [...new Set(matchedTokens)] } : null;
    })
    .filter(Boolean);
  if (slots.length) return slots;
  if (tokens.some((token) => token.includes('美食') || token.includes('吃'))) {
    return [{ ...COMPREHENSIVE_SLOTS[0], matchedTokens: ['吃饭'] }];
  }
  if (tokens.some((token) => token.includes('玩') || token.includes('娱乐'))) {
    return [{ ...COMPREHENSIVE_SLOTS[3], matchedTokens: ['玩乐'] }];
  }
  return [];
}

function scorePoi(poi) {
  return (Number(poi.rating) || 0) * 100 - (Number(poi.distance) || 0) / 10;
}

function buildBundleCard(selected, aiReason, slotLabels, title = '') {
  const avgRating = selected.length ? selected.reduce((sum, poi) => sum + (Number(poi.rating) || 0), 0) / selected.length : 0;
  const avgPrice = selected.length ? selected.reduce((sum, poi) => sum + (Number(poi.price) || 0), 0) / selected.length : 0;
  return {
    id: `ai-plan-${selected.map((poi) => poi.id).join('-')}`,
    isAiBundle: true,
    name: title || `AI 综合最优方案 · ${selected.length} 站`,
    category: '综合最优',
    subCategory: 'AI方案',
    rating: Number(avgRating.toFixed(1)),
    price: Math.round(avgPrice),
    distanceLabel: `${selected.length} 个点位`,
    tags: slotLabels,
    photoUrl: selected[0]?.photoUrl || '',
    bundleItems: selected,
    aiReason,
  };
}

function resolveSlotPhotoUrl(selectedPoi, slotCandidates = []) {
  if (selectedPoi?.photoUrl) return selectedPoi.photoUrl;
  return slotCandidates.find((candidate) => candidate?.photoUrl)?.photoUrl || '';
}

function classifyPoiToSlot(poi, slots = []) {
  const text = [poi.name, poi.category, poi.subCategory, ...(poi.tags || [])].join(' ').toLowerCase();
  return slots.find((slot) => slot.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) || null;
}

function buildBundleFromGeneralPois(pois, slots) {
  if (!slots.length || !pois.length) return [];
  const grouped = new Map();
  slots.forEach((slot) => grouped.set(slot.key, []));
  pois.forEach((poi) => {
    const slot = classifyPoiToSlot(poi, slots);
    if (slot) grouped.get(slot.key)?.push(poi);
  });
  const selected = slots.map((slot) => {
    const candidates = (grouped.get(slot.key) || []).slice().sort((a, b) => scorePoi(b) - scorePoi(a));
    const poi = candidates[0] || null;
    return poi ? { slot, poi } : null;
  }).filter(Boolean);
  if (!selected.length) return [];
  return selected.map(({ slot, poi }) => buildBundleCard(
    [poi],
    '',
    [slot.label],
    poi.name,
  ));
}

async function fetchSlotCandidates(center, slot, radius) {
  const queryCandidates = [
    ...new Set([
      ...(slot.matchedTokens || []),
      slot.searchKeywords,
    ].filter(Boolean)),
  ].slice(0, 4);
  const responses = await Promise.all(queryCandidates.map(async (keywords) => {
    try {
      return await nearbySearch({ center, keywords, radius, limit: 6 });
    } catch (e) {
      console.warn('[ai comprehensive] 搜索失败:', slot.label, keywords, e.message);
      return [];
    }
  }));
  const seen = new Set();
  const candidates = [];
  responses.flat().forEach((poi) => {
    if (!poi?.id || seen.has(poi.id)) return;
    seen.add(poi.id);
    candidates.push(poi);
  });
  return { ...slot, candidates };
}

function buildComprehensivePrompt(slotCandidates, members = []) {
  const memberLines = members.length
    ? members.map((member) => `- ${member.nickname || member.memberId || '成员'}：${member.prefSummary || '已提交偏好'}${member.prefs?.foods?.length ? `；美食 ${member.prefs.foods.join('/')}` : ''}${member.prefs?.fun?.length ? `；玩乐 ${member.prefs.fun.join('/')}` : ''}`).join('\n')
    : '（暂无成员偏好摘要）';
  const slotLines = slotCandidates.map((slot, slotIndex) => {
    const lines = slot.candidates.map((poi, poiIndex) => `${poiIndex + 1}. ${poi.name}（评分${poi.rating?.toFixed?.(1) || poi.rating}，¥${poi.price}，${poi.distanceLabel || ''}，${poi.tags?.join(' / ') || ''}）`).join('\n');
    return `### ${slotIndex + 1}. ${slot.label}\n${lines}`;
  }).join('\n\n');

  return `你是一个多人路线推荐助手。现在需要生成 1 张“综合最优”方案卡。

要求：
1. 每个细分类必须且只能选 1 个地点
2. 只从该细分类给出的候选中选择
3. 返回一句简洁的中文标题
4. 每个细分类都返回一段中文推荐理由，只解释这个细分类为什么推荐这个店，要明确体现综合了哪些成员的偏好
5. 只返回 JSON

返回格式：
{
  "title": "方案标题",
  "selections": {
    "细分类A": "地点名A",
    "细分类B": "地点名B"
  },
  "reasons": {
    "细分类A": "只解释这个细分类为什么推荐这个店，要体现综合了哪些成员的偏好",
    "细分类B": "只解释这个细分类为什么推荐这个店，要体现综合了哪些成员的偏好"
  }
}

成员偏好：
${memberLines}

候选如下：
${slotLines}`;
}

function callDoubao(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: DOUBAO_MODEL,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
    });
    const url = new URL(DOUBAO_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API_KEY}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`豆包响应解析失败: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseComprehensiveResult(apiRes, slotCandidates) {
  try {
    const msgItem = (apiRes?.output || []).find((item) => item.type === 'message');
    const textItem = (msgItem?.content || []).find((item) => item.type === 'output_text');
    const text = textItem?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const selected = slotCandidates.map((slot) => {
      const selectedName = parsed?.selections?.[slot.label];
      const poi = slot.candidates.find((poi) => poi.name === selectedName || poi.name.includes(selectedName) || selectedName?.includes?.(poi.name));
      return poi ? { slot, poi } : null;
    }).filter(Boolean);
    if (selected.length !== slotCandidates.length) return null;
    return {
      title: parsed.title || '',
      selected,
      reasons: parsed.reasons || {},
    };
  } catch (_) {
    return null;
  }
}

async function buildComprehensiveRecommendation({ center, prefs, members, radius = 3000 }) {
  const slots = deriveComprehensiveSlots(prefs, members);
  if (!slots.length) return [];

  const slotCandidates = (await Promise.all(slots.map((slot) => fetchSlotCandidates(center, slot, radius))))
    .filter((slot) => slot.candidates.length);
  if (!slotCandidates.length) return [];

  let title = '';
  let selected = [];
  let reasons = {};
  try {
    const result = parseComprehensiveResult(await callDoubao(buildComprehensivePrompt(slotCandidates, members)), slotCandidates);
    if (result) {
      title = result.title;
      selected = result.selected;
      reasons = result.reasons;
    }
  } catch (e) {
    console.warn('[ai comprehensive] 豆包失败，降级本地选择:', e.message);
  }

  if (!selected.length) {
    selected = slotCandidates.map((slot) => {
      const poi = slot.candidates.slice().sort((a, b) => scorePoi(b) - scorePoi(a))[0];
      return poi ? { slot, poi } : null;
    }).filter(Boolean);
    title = '';
    reasons = {};
  }

  if (!selected.length) return [];
  return selected.map(({ slot, poi }) => {
    const fallbackPhotoUrl = resolveSlotPhotoUrl(
      poi,
      slotCandidates.find((candidateSlot) => candidateSlot.label === slot.label)?.candidates || [],
    );
    const cardPoi = fallbackPhotoUrl && !poi.photoUrl
      ? { ...poi, photoUrl: fallbackPhotoUrl }
      : poi;
    return buildBundleCard(
      [cardPoi],
    reasons?.[slot.label] || '',
    [slot.label],
    poi.name,
    );
  });
}

// GET /api/pois — 当前不返回本地静态 POI
router.get('/', (_req, res) => {
  res.json([]);
});

// GET /api/pois/search?q=&lat=&lng= — 关键词搜索（仅真实提供方）
router.get('/search', async (req, res) => {
  const { q = '', lat, lng } = req.query;
  const keywords = q.trim();
  const center = parseCenter(lat, lng);

  if (keywords && hasCoordinates(center)) {
    try {
      const pois = await nearbySearch({ center, keywords, radius: 5000, limit: 8 });
      if (pois.length) return res.json(pois);
    } catch (e) {
      console.warn('[amap search] 失败，返回空结果:', e.message);
    }
  }
  res.json([]);
});

// POST /api/pois/recommendations — 推荐（仅真实提供方）
router.post('/recommendations', async (req, res) => {
  const { center, prefs, members } = req.body || {};

  let searchCenter = hasCoordinates(center) ? center : getMembersCenter(members);
  if (!searchCenter && prefs?.locationInput) {
    try {
      const geo = await geocode(prefs.locationInput);
      if (geo) searchCenter = geo;
    } catch (_) {}
  }

  if (searchCenter) {
    try {
      if (prefs?.mode === '综合最优') {
        const plan = await buildComprehensiveRecommendation({ center: searchCenter, prefs, members, radius: 3000 });
        if (plan.length) return res.json(plan);
        const fallbackSlots = deriveComprehensiveSlots(prefs, members);
        const generalPois = await searchByPrefs({ center: searchCenter, prefs, members, radius: 3000, mode: '综合最优' });
        const fallbackPlan = buildBundleFromGeneralPois(generalPois, fallbackSlots);
        if (fallbackPlan.length) return res.json(fallbackPlan);
        return res.json([]);
      }
      const pois = await searchByPrefs({ center: searchCenter, prefs, members, radius: 3000, mode: prefs?.mode });
      if (pois.length) return res.json(pois);
    } catch (e) {
      console.warn('[amap recommend] 失败，返回空结果:', e.message);
    }
  }

  res.json([]);
});

module.exports = router;
