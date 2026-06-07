const router = require('express').Router();
const https = require('https');
const { AMAP_KEY } = require('../config');

const EMPTY_LOCATION = {
  lat: null,
  lng: null,
  name: '未设置位置',
  address: '',
};

function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// GET /api/location/default
// 先尝试高德 IP 定位，失败则返回空位置
router.get('/default', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket.remoteAddress
      || '';
    console.log('[location] client IP:', clientIp);
    const data = await httpsGet(
      `https://restapi.amap.com/v3/ip?key=${AMAP_KEY}&ip=${clientIp}&output=JSON`
    );
    console.log('[location] amap IP result:', data?.status, data?.province, data?.city);
    if (data && data.status === '1' && typeof data.rectangle === 'string' && data.rectangle) {
      const [lng, lat] = data.rectangle.split(';')[0].split(',').map(Number);
      if (lat && lng) {
        return res.json({
          lat, lng,
          name: data.city || data.province || '当前位置',
          address: [data.province, data.city, data.district].filter(Boolean).join('') || 'IP 定位',
          timestamp: Date.now(),
        });
      }
    }
  } catch (e) {}

  res.json({ ...EMPTY_LOCATION, timestamp: Date.now() });
});

module.exports = router;
