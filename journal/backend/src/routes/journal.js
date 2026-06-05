const express = require('express');
const { getTrip, getPhotos, getReviews, getTemplates } = require('../db');
const { generateJournal } = require('../ai');

const router = express.Router();

// ===== 行程概览 =====
router.get('/api/trips/:tripId', (req, res) => {
  const trip = getTrip(req.params.tripId);
  res.json({ trip });
});

// ===== 手帐所需全部数据 =====
router.get('/api/trips/:tripId/journal', (req, res) => {
  const trip = getTrip(req.params.tripId);
  const photos = getPhotos(req.params.tripId);
  const reviews = getReviews(req.params.tripId);
  const templates = getTemplates();

  res.json({
    trip,
    photos,
    reviews,
    templates,
  });
});

// ===== AI 生成手帐 =====
router.post('/api/trips/:tripId/journal/ai-generate', async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const { template } = req.body;

    const trip = getTrip(tripId);
    const photos = getPhotos(tripId);
    const reviews = getReviews(tripId);

    if (!photos.length) {
      return res.status(400).json({ error: '该房间还没有照片，请先上传照片' });
    }

    const journal = await generateJournal({
      tripId,
      stops: trip.stops || [],
      photos,
      reviews,
      members: trip.members || [],
      template: template || 'fresh',
    }, (current, total, msg) => {
      console.log(`[AI] ${msg} (${current}/${total})`);
    });

    res.json({ journal });
  } catch (err) {
    console.error('[AI] 生成失败:', err.message);
    res.status(500).json({ error: err.message || 'AI 生成失败' });
  }
});

// ===== 模板列表 =====
router.get('/api/templates', (req, res) => {
  res.json({ templates: getTemplates() });
});

module.exports = router;
