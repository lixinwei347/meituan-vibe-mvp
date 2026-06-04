// Mock 数据 —— 开发阶段用，后面替换为真实 DB 查询

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

const initialPhotos = [
  { id: 'p1', url: '', title: '火锅店第一张合照',   uploader: 'u1', description: '开吃前先来一张！',     likes: 6, createdAt: '2026-06-02T14:35:00Z' },
  { id: 'p2', url: '', title: '城市露台咖啡拉花',   uploader: 'u2', description: '拉花太好看了',         likes: 3, createdAt: '2026-06-02T16:40:00Z' },
  { id: 'p3', url: '', title: '甜品拼盘九宫格',     uploader: 'u3', description: '每一样都好吃',         likes: 8, createdAt: '2026-06-02T18:10:00Z' },
  { id: 'p4', url: '', title: '湖畔夜景',           uploader: 'u4', description: '完美收尾',             likes: 5, createdAt: '2026-06-02T19:45:00Z' },
];

const initialReviews = [
  { id: 'r1', userId: 'u1', userName: 'Xinwei', text: '牛肉真的嫩，不蘸料都好吃！',     mood: '推荐', targetStopId: 'hotpot',  createdAt: '2026-06-02T15:00:00Z' },
  { id: 'r2', userId: 'u3', userName: 'Leo',    text: '锅底不辣但很香，广东人友好',     mood: '开心', targetStopId: 'hotpot',  createdAt: '2026-06-02T15:10:00Z' },
  { id: 'r3', userId: 'u2', userName: 'Yuki',   text: '露台拍照超出片，咖啡也不错',     mood: '推荐', targetStopId: 'coffee',  createdAt: '2026-06-02T16:50:00Z' },
  { id: 'r4', userId: 'u4', userName: 'Mia',    text: '招牌布丁已收藏，下次还来',       mood: '开心', targetStopId: 'dessert', createdAt: '2026-06-02T18:20:00Z' },
  { id: 'r5', userId: 'u3', userName: 'Leo',    text: '甜品拼盘量好大，四个人刚好',     mood: '推荐', targetStopId: 'dessert', createdAt: '2026-06-02T18:25:00Z' },
];

const journalTemplates = [
  { id: 'fresh',   name: '清新',  primaryColor: '#7EC8A8', bgColor: '#F5FAF8', font: 'system-ui' },
  { id: 'retro',   name: '复古',  primaryColor: '#C4956A', bgColor: '#FDF5EB', font: 'Georgia, serif' },
  { id: 'ins',     name: 'ins风', primaryColor: '#E87D7D', bgColor: '#FDF5F5', font: 'Helvetica, Arial' },
];

// ===== 有状态的 mock（内存中，重启就重置）=====

let photos = [...initialPhotos];
let reviews = [...initialReviews];
let photoIdCounter = 10;

// ===== 模拟查询函数（后面替换为真实 DB 查询）=====

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

function getPhotos(tripId) {
  return photos.map(p => ({
    ...p,
    uploaderName: members.find(m => m.id === p.uploader)?.name || '未知',
  }));
}

function addPhoto({ tripId, filename, uploaderId, title, description }) {
  const photo = {
    id: `p${photoIdCounter++}`,
    url: `/uploads/${filename}`,
    title: title || '未命名',
    uploader: uploaderId,
    description: description || '',
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  photos = [photo, ...photos];
  return photo;
}

function toggleLike(photoId) {
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return null;
  photo.likes += 1;
  return photo;
}

function getReviews(tripId) {
  return reviews;
}

function getTemplates() {
  return journalTemplates;
}

function generateJournal(tripId, templateId = 'fresh') {
  const trip = getTrip(tripId);
  const template = journalTemplates.find(t => t.id === templateId) || journalTemplates[0];

  // 按点赞数排序选高质量照片
  const topPhotos = [...photos].sort((a, b) => b.likes - a.likes).slice(0, 6);

  // 按时间排序所有评价
  const sortedReviews = [...reviews].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // 生成 AI 文案（mock 阶段用规则拼）
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
    reviews: sortedReviews,
    coverText,
    highlightText,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getTrip,
  getPhotos,
  addPhoto,
  toggleLike,
  getReviews,
  getTemplates,
  generateJournal,
};
