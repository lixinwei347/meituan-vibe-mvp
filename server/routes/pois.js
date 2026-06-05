const router = require('express').Router();
const { nearbySearch, searchByPrefs, geocode } = require('../lib/amapSearch');

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

  let searchCenter = hasCoordinates(center) ? center : null;
  if (!searchCenter && prefs?.locationInput) {
    try {
      const geo = await geocode(prefs.locationInput);
      if (geo) searchCenter = geo;
    } catch (_) {}
  }

  if (searchCenter) {
    try {
      const pois = await searchByPrefs({ center: searchCenter, prefs, members, radius: 3000, mode: prefs?.mode });
      if (pois.length) return res.json(pois);
    } catch (e) {
      console.warn('[amap recommend] 失败，返回空结果:', e.message);
    }
  }

  res.json([]);
});

module.exports = router;
