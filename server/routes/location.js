const router = require('express').Router();

const EMPTY_LOCATION = {
  lat: null,
  lng: null,
  name: '未设置位置',
  address: '',
};

// GET /api/location/default — 未设置默认位置
router.get('/default', (_req, res) => {
  res.json({ ...EMPTY_LOCATION, timestamp: Date.now() });
});

module.exports = router;
