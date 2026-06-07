const express = require('express');
const { getTrip, getPhotos, getReviews, getTemplates, saveAiCard } = require('../db');
const { generateJournal } = require('../ai');
const { getRoomTrip } = require('../roomClient');

const router = express.Router();

// ===== 行程概览 =====
router.get('/api/trips/:tripId', async (req, res) => {
  const trip = await resolveTrip(req.params.tripId);
  res.json({ trip });
});

// ===== 手帐所需全部数据 =====
router.get('/api/trips/:tripId/journal', async (req, res) => {
  const trip = await resolveTrip(req.params.tripId);
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

    const trip = await resolveTrip(tripId);
    const photos = getPhotos(tripId);
    const reviews = getReviews(tripId);

    if (!photos.length && !(trip.stops || []).length) {
      return res.status(400).json({ error: '当前房间还没有照片或路线，暂时无法生成手帐' });
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

    (journal.cards || []).forEach((card) => {
      if (!card.photoId) return;
      saveAiCard(card.photoId, {
        title: card.title,
        narrative: card.narrative,
        tags: card.tags,
      });
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

async function resolveTrip(tripId) {
  const roomTrip = await getRoomTrip(tripId);
  if (roomTrip) return roomTrip;
  return getTrip(tripId);
}
