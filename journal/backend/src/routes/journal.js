const express = require('express');
const { getTrip, getPhotos, getReviews, getTemplates, generateJournal } = require('../db');

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

// ===== 生成手帐 =====
router.post('/api/trips/:tripId/journal/generate', (req, res) => {
  const { templateId } = req.body;
  const journal = generateJournal(req.params.tripId, templateId);

  // 模拟 AI 处理延迟（后续替换为真实 AI 调用）
  setTimeout(() => {
    res.json({ journal });
  }, 1500);
});

// ===== 模板列表 =====
router.get('/api/templates', (req, res) => {
  res.json({ templates: getTemplates() });
});

module.exports = router;
