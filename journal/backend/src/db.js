const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);

// ===== 开启 WAL 模式，支持并发读写 =====
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== 建表（不存在则创建）=====
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    data_url TEXT DEFAULT NULL,
    title TEXT NOT NULL DEFAULT '未命名',
    uploader_name TEXT NOT NULL DEFAULT '匿名',
    likes INTEGER NOT NULL DEFAULT 0,
    tone TEXT NOT NULL DEFAULT 'peach',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    ai_title TEXT DEFAULT NULL,
    ai_narrative TEXT DEFAULT NULL,
    ai_tags TEXT DEFAULT NULL,
    ai_generated_at TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT '匿名',
    text TEXT NOT NULL DEFAULT '',
    mood TEXT NOT NULL DEFAULT '开心',
    target_stop_id TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photo_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    photo_id INTEGER NOT NULL,
    user_name TEXT NOT NULL DEFAULT '匿名',
    text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_photo_comments ON photo_comments(photo_id);

  CREATE INDEX IF NOT EXISTS idx_photos_trip ON photos(trip_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_trip ON reviews(trip_id);

  CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    trip_type TEXT DEFAULT '',
    trip_time TEXT DEFAULT '',
    route_pref TEXT DEFAULT '',
    owner_id TEXT DEFAULT '',
    status TEXT DEFAULT 'waiting',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS room_members (
    member_id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    nickname TEXT DEFAULT '匿名',
    avatar TEXT DEFAULT '?',
    status TEXT DEFAULT 'waiting',
    prefs_json TEXT DEFAULT NULL,
    pref_summary TEXT DEFAULT '',
    location_json TEXT DEFAULT NULL,
    selected_pois_json TEXT DEFAULT '[]',
    submitted_at INTEGER DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS room_drafts (
    code TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    items_json TEXT DEFAULT '[]',
    confirmed_member_ids_json TEXT DEFAULT '[]',
    is_finalized INTEGER NOT NULL DEFAULT 0,
    origin TEXT DEFAULT 'memberSelections',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_room_members_code ON room_members(code);
`);

// 迁移：给旧表添加 AI 字段
try { db.exec('ALTER TABLE photos ADD COLUMN ai_title TEXT DEFAULT NULL'); } catch (e) {}
try { db.exec('ALTER TABLE photos ADD COLUMN ai_narrative TEXT DEFAULT NULL'); } catch (e) {}
try { db.exec('ALTER TABLE photos ADD COLUMN ai_tags TEXT DEFAULT NULL'); } catch (e) {}
try { db.exec('ALTER TABLE photos ADD COLUMN ai_generated_at TEXT DEFAULT NULL'); } catch (e) {}

// ===== 种子数据（只在表为空时插入）=====
const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos').get();
if (photoCount.count === 0) {
  const insertPhoto = db.prepare(`
    INSERT INTO photos (trip_id, url, data_url, title, uploader_name, likes, tone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedPhotos = [
    ['trip001', '', '', '火锅店第一张合照',   'Xinwei', 6, 'peach', '2026-06-02T14:35:00'],
    ['trip001', '', '', '城市露台咖啡拉花',   'Yuki',   3, 'mint',  '2026-06-02T16:40:00'],
    ['trip001', '', '', '甜品拼盘九宫格',     'Leo',    8, 'pink',  '2026-06-02T18:10:00'],
    ['trip001', '', '', '湖畔夜景',           'Mia',    5, 'blue',  '2026-06-02T19:45:00'],
  ];

  const insertMany = db.transaction(() => {
    for (const p of seedPhotos) {
      insertPhoto.run(...p);
    }
  });
  insertMany();

  console.log('📦 已写入种子数据');
}

// ===== 照片查询 =====
function getPhotos(tripId) {
  return db.prepare(`
    SELECT id, trip_id AS tripId, url, data_url AS dataUrl, title,
           uploader_name AS uploaderName, likes, tone, created_at AS createdAt,
           ai_title AS aiTitle, ai_narrative AS aiNarrative, ai_tags AS aiTags, ai_generated_at AS aiGeneratedAt
    FROM photos WHERE trip_id = ?
    ORDER BY created_at DESC
  `).all(tripId);
}

function addPhoto({ tripId, url, dataUrl, title, uploaderName, tone }) {
  const result = db.prepare(`
    INSERT INTO photos (trip_id, url, data_url, title, uploader_name, tone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tripId, url || '', dataUrl || '', title || '未命名', uploaderName || '匿名', tone || 'peach');

  return db.prepare(`
    SELECT id, trip_id AS tripId, url, data_url AS dataUrl, title,
           uploader_name AS uploaderName, likes, tone, created_at AS createdAt
    FROM photos WHERE id = ?
  `).get(result.lastInsertRowid);
}

function toggleLike(photoId) {
  const result = db.prepare('UPDATE photos SET likes = likes + 1 WHERE id = ?').run(photoId);
  if (result.changes === 0) return null;
  return db.prepare(`
    SELECT id, trip_id AS tripId, url, data_url AS dataUrl, title,
           uploader_name AS uploaderName, likes, tone, created_at AS createdAt
    FROM photos WHERE id = ?
  `).get(photoId);
}

function getPhotoById(photoId) {
  return db.prepare(`
    SELECT id, trip_id AS tripId, url, data_url AS dataUrl, title,
           uploader_name AS uploaderName, likes, tone, created_at AS createdAt,
           ai_title AS aiTitle, ai_narrative AS aiNarrative, ai_tags AS aiTags, ai_generated_at AS aiGeneratedAt
    FROM photos WHERE id = ?
  `).get(photoId);
}

// 存 AI 生成的卡片数据
function saveAiCard(photoId, { title, narrative, tags }) {
  db.prepare(`
    UPDATE photos SET ai_title = ?, ai_narrative = ?, ai_tags = ?, ai_generated_at = datetime('now')
    WHERE id = ?
  `).run(title || '', narrative || '', JSON.stringify(tags || []), photoId);
}

// 找还没 AI 生成的照片
function getPhotosNeedingAi() {
  return db.prepare(`
    SELECT id, trip_id AS tripId, url, data_url AS dataUrl, title,
           uploader_name AS uploaderName, likes, tone, created_at AS createdAt
    FROM photos WHERE ai_generated_at IS NULL
    ORDER BY created_at ASC
  `).all();
}

// ===== 评论查询 =====
function getReviews(tripId) {
  return db.prepare(`
    SELECT id, trip_id AS tripId, user_name AS userName, text, mood,
           target_stop_id AS targetStopId, created_at AS createdAt
    FROM reviews WHERE trip_id = ?
    ORDER BY created_at ASC
  `).all(tripId);
}

function addReview({ tripId, userName, text, mood, targetStopId }) {
  const result = db.prepare(`
    INSERT INTO reviews (trip_id, user_name, text, mood, target_stop_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(tripId, userName || '匿名', text || '', mood || '开心', targetStopId || null);

  return db.prepare(`
    SELECT id, trip_id AS tripId, user_name AS userName, text, mood,
           target_stop_id AS targetStopId, created_at AS createdAt
    FROM reviews WHERE id = ?
  `).get(result.lastInsertRowid);
}

// ===== 行程数据（mock，后面接真实 DB）=====
const members = [
  { id: 'u1', name: 'Xinwei', avatar: 'X', color: '#FFD700' },
  { id: 'u2', name: 'Yuki',   avatar: 'Y', color: '#4CAF50' },
  { id: 'u3', name: 'Leo',    avatar: 'L', color: '#2196F3' },
  { id: 'u4', name: 'Mia',    avatar: 'M', color: '#E91E63' },
];

const stops = [
  { id: 'hotpot',  name: '潮汕牛肉火锅 西单店', type: '美食', subType: '火锅',   lat: 39.9057, lng: 116.3954, rating: 4.7, price: 96,  duration: '14:30-16:00', tags: ['不太辣', '地铁直达', '适合聚餐'] },
  { id: 'coffee',  name: '城市露台咖啡',        type: '美食', subType: '咖啡',   lat: 39.9039, lng: 116.3982, rating: 4.8, price: 42,  duration: '16:20-17:30', tags: ['拍照', '可聊天'] },
  { id: 'dessert', name: '漫糖甜品工坊',        type: '美食', subType: '甜品',   lat: 39.9019, lng: 116.3992, rating: 4.6, price: 38,  duration: '17:50-18:40', tags: ['少排队', '适合拍照'] },
  { id: 'bar',     name: '湖畔小酒馆',          type: '美食', subType: '酒吧',   lat: 39.8998, lng: 116.3968, rating: 4.5, price: 88,  duration: '19:00-20:30', tags: ['夜景', '适合收尾'] },
];

const journalTemplates = [
  { id: 'fresh',   name: '清新',  primaryColor: '#7EC8A8', bgColor: '#F5FAF8', font: 'system-ui' },
  { id: 'retro',   name: '复古',  primaryColor: '#C4956A', bgColor: '#FDF5EB', font: 'Georgia, serif' },
  { id: 'ins',     name: 'ins风', primaryColor: '#E87D7D', bgColor: '#FDF5F5', font: 'Helvetica, Arial' },
];

function getTrip(tripId) {
  return {
    id: tripId,
    title: '周末美食探店',
    date: '2026-06-02',
    members,
    stops,
    route: {
      distance: '3.6km',
      trajectory: stops.map(s => ({ lat: s.lat, lng: s.lng, name: s.name })),
    },
  };
}

function getTemplates() {
  return journalTemplates;
}

function generateJournal(tripId, templateId = 'fresh') {
  const trip = getTrip(tripId);
  const template = journalTemplates.find(t => t.id === templateId) || journalTemplates[0];
  const photos = getPhotos(tripId);
  const reviews = getReviews(tripId);

  const topPhotos = [...photos].sort((a, b) => b.likes - a.likes).slice(0, 6);
  const coverText = `和${trip.members.length}位朋友的美食之旅`;
  const highlightText = topPhotos[0]?.description || '最受欢迎的一站';

  return {
    tripId,
    title: trip.title,
    date: trip.date,
    template,
    members: trip.members,
    route: trip.route,
    stops: trip.stops,
    photos: topPhotos,
    reviews,
    coverText,
    highlightText,
    generatedAt: new Date().toISOString(),
  };
}

// ===== 照片评论 =====
function getPhotoComments(photoId) {
  return db.prepare(`
    SELECT id, trip_id AS tripId, photo_id AS photoId, user_name AS userName,
           text, created_at AS createdAt
    FROM photo_comments WHERE photo_id = ?
    ORDER BY created_at ASC
  `).all(photoId);
}

function addPhotoComment({ tripId, photoId, userName, text }) {
  const result = db.prepare(`
    INSERT INTO photo_comments (trip_id, photo_id, user_name, text)
    VALUES (?, ?, ?, ?)
  `).run(tripId, photoId, userName || '匿名', text || '');

  return db.prepare(`
    SELECT id, trip_id AS tripId, photo_id AS photoId, user_name AS userName,
           text, created_at AS createdAt
    FROM photo_comments WHERE id = ?
  `).get(result.lastInsertRowid);
}

module.exports = {
  getPhotos,
  addPhoto,
  toggleLike,
  getPhotoById,
  saveAiCard,
  getPhotosNeedingAi,
  getReviews,
  getPhotoComments,
  addPhotoComment,
  addReview,
  getTrip,
  getTemplates,
  generateJournal,
};
