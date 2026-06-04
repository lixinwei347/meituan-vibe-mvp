const express = require('express');
const multer = require('multer');
const path = require('path');
const { getPhotos, addPhoto, toggleLike, getPhotoComments, addPhotoComment } = require('../db');

const router = express.Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB，手机照片较大

// multer 错误处理：文件过大
function handleUpload(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '照片过大，请选择小于 20MB 的文件' });
      }
      return res.status(400).json({ error: '上传失败: ' + err.message });
    }
    next();
  });
}

// ===== 照片列表 =====
router.get('/api/trips/:tripId/photos', (req, res) => {
  const photos = getPhotos(req.params.tripId);
  res.json({ photos });
});

// ===== 上传照片（支持两种方式）=====
// 1. multipart 文件上传
router.post('/api/trips/:tripId/photos', handleUpload, (req, res) => {
  const { title, uploaderName, tone } = req.body;

  if (req.file) {
    // 文件上传 → url 指向本地文件
    const photo = addPhoto({
      tripId: req.params.tripId,
      url: `/uploads/${req.file.filename}`,
      title,
      uploaderName,
      tone,
    });
    return res.status(201).json({ photo });
  }

  // 2. base64 上传（data_url 字段）
  const { dataUrl } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: '请选择照片或提供 base64 数据' });
  }

  const photo = addPhoto({
    tripId: req.params.tripId,
    dataUrl,
    title,
    uploaderName,
    tone,
  });
  res.status(201).json({ photo });
});

// ===== 点赞 =====
router.post('/api/photos/:photoId/like', (req, res) => {
  const photo = toggleLike(req.params.photoId);
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  res.json({ photo });
});

// ===== 添加评论 =====
const { addReview, getReviews } = require('../db');

router.get('/api/trips/:tripId/reviews', (req, res) => {
  const reviews = getReviews(req.params.tripId);
  res.json({ reviews });
});

router.post('/api/trips/:tripId/reviews', (req, res) => {
  const { userName, text, mood, targetStopId } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  const review = addReview({
    tripId: req.params.tripId,
    userName,
    text: text.trim(),
    mood,
    targetStopId,
  });
  res.status(201).json({ review });
});

// ===== 照片评论 =====
router.get('/api/photos/:photoId/comments', (req, res) => {
  const comments = getPhotoComments(Number(req.params.photoId));
  res.json({ comments });
});

router.post('/api/photos/:photoId/comments', (req, res) => {
  const { userName, text, tripId } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  const comment = addPhotoComment({
    tripId: tripId || 'unknown',
    photoId: Number(req.params.photoId),
    userName,
    text: text.trim(),
  });
  res.status(201).json({ comment });
});

module.exports = router;
