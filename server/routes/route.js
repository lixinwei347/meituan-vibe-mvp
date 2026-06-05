const router  = require('express').Router();
const https   = require('https');
const { searchByPrefs, geocode, distanceMeters, formatDistance } = require('../lib/amapSearch');
const { DOUBAO_API_KEY, DOUBAO_MODEL } = require('../config');

const DOUBAO_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';

// ---------- 豆包调用 ----------

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
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`豆包响应解析失败: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------- 构造 prompt ----------

function buildPrompt({ origin, pois, members, prefs }) {
  const poisDesc = pois.map((p, i) =>
    `${i + 1}. ${p.name}（${p.subCategory}，评分${p.rating.toFixed(1)}，人均¥${p.price}，距起点${p.distanceLabel}，地址：${p.address || ''}）`
  ).join('\n');

  const memberDesc = members?.length
    ? members.map((m) => `- ${m.nickname}：${m.prefSummary || '未填写偏好'}`).join('\n')
    : '（无成员偏好信息）';

  const avoidDesc = (() => {
    const avoids = new Set();
    if (prefs?.avoid?.length) prefs.avoid.forEach((a) => avoids.add(a));
    members?.forEach((m) => m.prefs?.avoid?.forEach((a) => avoids.add(a)));
    return avoids.size ? [...avoids].join('、') : '无';
  })();

  return `你是一个多人出行路线规划助手。请根据成员偏好，从候选地点中挑选最合适的 3～4 个，规划成一条出行路线。

## 起点
${origin.name || '当前位置'}（${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}）

## 成员偏好
${memberDesc}

## 综合忌口
${avoidDesc}

## 候选地点（共 ${pois.length} 个，均为起点附近真实地点）
${poisDesc}

## 要求
1. 选出 3～4 个最适合所有成员的地点，综合考虑：偏好匹配度、评分、距离、忌口规避
2. 按步行最顺路的顺序排列（减少折返）
3. 只返回 JSON，不要有任何其他文字，格式：
{
  "selected": ["地点名1", "地点名2", "地点名3"],
  "reason": "一句话说明推荐理由，体现对成员偏好的考虑"
}`;
}

// ---------- 解析豆包返回 ----------

function parseDoubaoResult(apiRes, pois) {
  try {
    const msgItem  = (apiRes?.output || []).find((o) => o.type === 'message');
    const textItem = (msgItem?.content || []).find((c) => c.type === 'output_text');
    const text     = textItem?.text || '';
    const match    = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('未找到 JSON');
    const parsed   = JSON.parse(match[0]);
    const names    = parsed.selected || [];
    const selected = names
      .map((name) => pois.find((p) => p.name === name || p.name.includes(name) || name.includes(p.name)))
      .filter(Boolean);
    // 去重
    const seen = new Set();
    const unique = selected.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    return { selected: unique, reason: parsed.reason || '' };
  } catch (e) {
    console.warn('[doubao] 解析失败，降级到算法排序:', e.message);
    return null;
  }
}

// ---------- 构造路线返回结构 ----------

function buildRouteResult(origin, orderedPois, aiReason, aiPowered) {
  const legs = [];
  let prev = origin;
  for (const poi of orderedPois) {
    const meters = hasCoordinates(prev) && hasCoordinates(poi) ? distanceMeters(prev, poi) : 0;
    legs.push({
      from: prev.name ?? '起点',
      to: poi.name,
      distanceMeters: meters,
      distanceLabel: formatDistance(meters),
      walkMinutes: Math.max(2, Math.round(meters / 80)),
    });
    prev = poi;
  }
  const totalMeters = legs.reduce((s, l) => s + l.distanceMeters, 0);
  return {
    origin,
    selected: orderedPois,
    legs,
    totalDistanceMeters: totalMeters,
    totalDistanceLabel: formatDistance(totalMeters),
    aiReason,
    aiPowered,
  };
}

function buildEmptyRoute(origin, aiReason) {
  return {
    origin,
    selected: [],
    legs: [],
    totalDistanceMeters: 0,
    totalDistanceLabel: '0m',
    aiReason,
    aiPowered: false,
    empty: true,
  };
}

function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function normalizeOrigin(origin) {
  if (hasCoordinates(origin)) {
    return {
      lat: Number(origin.lat),
      lng: Number(origin.lng),
      name: origin.name || '当前位置',
      address: origin.address || '',
    };
  }
  return {
    lat: null,
    lng: null,
    name: origin?.name || '未设置位置',
    address: origin?.address || '',
  };
}

function resolveRouteOrigin(origin, pois = []) {
  if (hasCoordinates(origin)) return origin;
  const firstPoi = pois.find((poi) => hasCoordinates(poi));
  if (!firstPoi) return origin;
  return {
    lat: Number(firstPoi.lat),
    lng: Number(firstPoi.lng),
    name: origin?.name || '未设置位置',
    address: origin?.address || '',
  };
}

// ---------- 贪心最短路径（降级用）----------

function greedyOrder(origin, pois) {
  const remaining = [...pois];
  const ordered = [];
  let cursor = origin;
  while (remaining.length) {
    remaining.sort((a, b) => distanceMeters(cursor, a) - distanceMeters(cursor, b));
    const next = remaining.shift();
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}

// ---------- 路由 ----------

// POST /api/route/plan
router.post('/plan', async (req, res) => {
  const { origin, prefs, respectOrder, members } = req.body || {};
  const selectedPois = Array.isArray(req.body?.selectedPois) ? req.body.selectedPois.filter(Boolean) : [];
  const fallbackOrigin = normalizeOrigin(origin);

  // ── 1. 若用户填了位置文字但没有经纬度，先地理编码 ──
  let searchCenter = hasCoordinates(fallbackOrigin) ? fallbackOrigin : null;
  const locationText = prefs?.locationInput;
  if (locationText && !searchCenter) {
    try {
      const geo = await geocode(locationText);
      if (geo) {
        searchCenter = {
          lat: Number(geo.lat),
          lng: Number(geo.lng),
          name: geo.name || locationText,
          address: geo.address || '',
        };
      }
    } catch (e) {
      console.warn('[geocode] 失败，使用原始 origin:', e.message);
    }
  }

  let routeOrigin = searchCenter || fallbackOrigin;

  // 用户手动拖排且已传真实 POI → 保持顺序，不调 AI
  if (respectOrder && selectedPois.length) {
    routeOrigin = resolveRouteOrigin(routeOrigin, selectedPois);
    return res.json(buildRouteResult(routeOrigin, selectedPois, '已按手动顺序生成路线', false));
  }

  // ── 2. 获取候选 POI ──
  let candidatePois = [];

  // 用户已在 screen11 选了具体 POI → 直接用，不重新搜索
  // 前端会把完整 POI 对象放在 selectedPois 字段传来
  if (selectedPois.length) {
    candidatePois = selectedPois;
    console.log(`[route] 使用用户选中的 ${candidatePois.length} 个 POI`);
  } else if (searchCenter) {
    // 没有具体选中 → 高德周边搜索
    try {
      candidatePois = await searchByPrefs({
        center: searchCenter,
        prefs: { ...prefs, mode: prefs?.mode || '综合最优' },
        members,
        radius: 3000,
      });
      console.log(`[amap] 搜索到 ${candidatePois.length} 个真实 POI`);
    } catch (e) {
      console.warn('[amap] 周边搜索失败，返回空路线:', e.message);
    }
  }

  // 如果搜索失败或无结果，返回结构化空路线
  if (!candidatePois.length) {
    return res.json(buildEmptyRoute(routeOrigin, '暂无可用地点，请先搜索或填写位置'));
  }

  routeOrigin = resolveRouteOrigin(routeOrigin, candidatePois);

  // ── 3. 豆包 AI 选路线 ──
  try {
    const prompt   = buildPrompt({ origin: routeOrigin, pois: candidatePois, members, prefs });
    console.log('[doubao] 路线规划请求中...');
    const apiRes   = await callDoubao(prompt);
    const aiResult = parseDoubaoResult(apiRes, candidatePois);

    if (aiResult && aiResult.selected.length >= 2) {
      console.log('[doubao] AI 路线：', aiResult.selected.map((p) => p.name).join(' → '));
      return res.json(buildRouteResult(routeOrigin, aiResult.selected, aiResult.reason, true));
    }
  } catch (e) {
    console.warn('[doubao] 调用失败，降级到贪心算法:', e.message);
  }

  // ── 4. 降级：贪心算法排序真实 POI ──
  const fallbackPool = selectedPois.length
    ? candidatePois
    : candidatePois.slice(0, 5).slice(0, 3);
  const ordered = greedyOrder(routeOrigin, fallbackPool);
  return res.json(buildRouteResult(
    routeOrigin,
    ordered,
    '已根据距离和偏好自动排序（算法模式）',
    false,
  ));
});

module.exports = router;
