// 进程内房间存储（无 Redis，黑客松演示用）
const { nanoid } = require('nanoid');
const { ROOM_TTL_MS } = require('../config');

// rooms: code → { roomId, code, tripType, tripTime, routePref, ownerId, status, createdAt }
const rooms = new Map();

// members: code → Map(memberId → { memberId, nickname, avatar, status, prefs, prefSummary, location, submittedAt })
const membersMap = new Map();

// shared drafts: code → { version, items, confirmedMemberIds, isFinalized, origin, updatedAt }
const draftsMap = new Map();

// TTL 清理定时器
const timers = new Map();

// ---------- 工具 ----------

function resetTtl(code) {
  if (timers.has(code)) clearTimeout(timers.get(code));
  const t = setTimeout(() => {
    rooms.delete(code);
    membersMap.delete(code);
    draftsMap.delete(code);
    timers.delete(code);
    console.log(`[roomStore] 房间 ${code} 已过期自动清理`);
  }, ROOM_TTL_MS);
  timers.set(code, t);
}

function buildPrefSummary(prefs) {
  const parts = [];
  if (prefs.foods?.length)         parts.push(prefs.foods.slice(0, 2).join('/'));
  else if (prefs.categories?.length) parts.push(prefs.categories.slice(0, 2).join('/'));
  if (prefs.avoid?.length)         parts.push(`避${prefs.avoid[0]}`);
  if (prefs.locationInput)         parts.push(String(prefs.locationInput).slice(0, 6));
  return parts.join(' / ') || '偏好已提交';
}

// 生成不重复的 4 位数字房间码
async function generateRoomCode() {
  for (let i = 0; i < 50; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  throw new Error('无法生成唯一房间码，请稍后重试');
}

// ---------- 房间操作 ----------

async function createRoom({ tripType = '', tripTime = '', routePref = '', ownerId = '' } = {}) {
  const code = await generateRoomCode();
  const room = {
    roomId: nanoid(),
    code,
    tripType,
    tripTime,
    routePref,
    ownerId,
    status: 'waiting',
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  membersMap.set(code, new Map());
  resetTtl(code);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function getMembers(code) {
  const m = membersMap.get(code);
  if (!m) return [];
  return Array.from(m.values());
}

function getMember(code, memberId) {
  return membersMap.get(code)?.get(memberId) || null;
}

function normalizePoi(poi = {}) {
  return {
    id: String(poi.id || ''),
    name: poi.name || '未命名地点',
    category: poi.category || '',
    subCategory: poi.subCategory || '',
    rating: Number.isFinite(Number(poi.rating)) ? Number(poi.rating) : 0,
    price: Number.isFinite(Number(poi.price)) ? Number(poi.price) : 0,
    distance: Number.isFinite(Number(poi.distance)) ? Number(poi.distance) : null,
    distanceLabel: poi.distanceLabel || '',
    tags: Array.isArray(poi.tags) ? poi.tags.slice(0, 6) : [],
    lat: Number.isFinite(Number(poi.lat)) ? Number(poi.lat) : null,
    lng: Number.isFinite(Number(poi.lng)) ? Number(poi.lng) : null,
    photoUrl: poi.photoUrl || '',
    photoTitle: poi.photoTitle || '',
    address: poi.address || '',
  };
}

function normalizeSelectedPois(selectedPois = []) {
  return selectedPois
    .map(normalizePoi)
    .filter((poi) => poi.id);
}

function buildDraftFromSelections(code, version = 1) {
  const members = getMembers(code);
  const itemMap = new Map();
  members.forEach((member) => {
    (member.selectedPois || []).forEach((poi) => {
      if (!itemMap.has(poi.id)) {
        itemMap.set(poi.id, {
          poi,
          selectedByMemberIds: [member.memberId],
        });
        return;
      }
      itemMap.get(poi.id).selectedByMemberIds.push(member.memberId);
    });
  });
  return {
    version,
    items: Array.from(itemMap.values()),
    confirmedMemberIds: [],
    isFinalized: false,
    origin: 'memberSelections',
    updatedAt: Date.now(),
  };
}

function getSharedDraft(code) {
  return draftsMap.get(code) || null;
}

function mergeMemberSelectionsIntoDraft(currentDraft, memberId, selectedPois = []) {
  const nextMap = new Map();
  const nextOrder = [];

  (currentDraft?.items || []).forEach((item) => {
    const remainingMemberIds = (item.selectedByMemberIds || []).filter((id) => id !== memberId);
    if (!remainingMemberIds.length) return;
    nextMap.set(item.poi.id, {
      poi: item.poi,
      selectedByMemberIds: remainingMemberIds,
    });
    nextOrder.push(item.poi.id);
  });

  normalizeSelectedPois(selectedPois).forEach((poi) => {
    if (!nextMap.has(poi.id)) {
      nextMap.set(poi.id, {
        poi,
        selectedByMemberIds: [memberId],
      });
      nextOrder.push(poi.id);
      return;
    }
    const item = nextMap.get(poi.id);
    item.poi = { ...item.poi, ...poi };
    if (!item.selectedByMemberIds.includes(memberId)) {
      item.selectedByMemberIds.push(memberId);
    }
  });

  return nextOrder.map((id) => nextMap.get(id)).filter(Boolean);
}

// ---------- 成员操作 ----------

function addMember(code, { nickname = '匿名', avatar = '？' } = {}) {
  const room = getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');

  const memberId = nanoid(8);
  const member = {
    memberId,
    nickname,
    avatar,
    status: 'waiting',
    prefs: null,
    prefSummary: '',
    location: null,
    selectedPois: [],
    submittedAt: null,
  };
  membersMap.get(code).set(memberId, member);
  resetTtl(code);
  return member;
}

function submitPrefs(code, memberId, prefs) {
  const m = membersMap.get(code);
  if (!m) throw new Error('ROOM_NOT_FOUND');
  const member = m.get(memberId);
  if (!member) throw new Error('MEMBER_NOT_FOUND');

  member.prefs = prefs;
  member.status = 'submitted';
  member.prefSummary = buildPrefSummary(prefs);
  member.location = prefs.location || member.location || null;
  member.submittedAt = Date.now();
  resetTtl(code);
  return member;
}

function setMemberSelections(code, memberId, selectedPois = []) {
  const member = getMember(code, memberId);
  if (!member) throw new Error(getRoom(code) ? 'MEMBER_NOT_FOUND' : 'ROOM_NOT_FOUND');
  member.selectedPois = normalizeSelectedPois(selectedPois);
  const currentDraft = getSharedDraft(code);
  const nextVersion = currentDraft ? currentDraft.version + 1 : 1;
  const draft = currentDraft
    ? {
        version: nextVersion,
        items: mergeMemberSelectionsIntoDraft(currentDraft, memberId, member.selectedPois),
        confirmedMemberIds: [],
        isFinalized: false,
        origin: 'memberSelections',
        updatedAt: Date.now(),
      }
    : buildDraftFromSelections(code, nextVersion);
  draftsMap.set(code, draft);
  const room = getRoom(code);
  if (room) room.status = draft.items.length ? 'drafting' : room.status;
  resetTtl(code);
  return { member, draft };
}

function updateSharedDraft(code, memberId, selectedPois = []) {
  const room = getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  const member = getMember(code, memberId);
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  const currentDraft = getSharedDraft(code);
  if (currentDraft?.isFinalized || currentDraft?.confirmedMemberIds?.includes(memberId)) {
    throw new Error('DRAFT_LOCKED');
  }
  const previousItems = new Map((currentDraft?.items || []).map((item) => [item.poi.id, item]));
  const items = normalizeSelectedPois(selectedPois).map((poi) => ({
    poi,
    selectedByMemberIds: previousItems.get(poi.id)?.selectedByMemberIds?.slice() || [memberId],
  }));
  const draft = {
    version: (currentDraft?.version || 0) + 1,
    items,
    confirmedMemberIds: [],
    isFinalized: false,
    origin: 'manual',
    updatedAt: Date.now(),
  };
  draftsMap.set(code, draft);
  room.status = draft.items.length ? 'drafting' : room.status;
  resetTtl(code);
  return draft;
}

function confirmSharedDraft(code, memberId) {
  const room = getRoom(code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  const member = getMember(code, memberId);
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  const draft = getSharedDraft(code);
  if (!draft) throw new Error('DRAFT_NOT_FOUND');
  if (!draft.confirmedMemberIds.includes(memberId)) {
    draft.confirmedMemberIds.push(memberId);
  }
  const members = getMembers(code);
  draft.isFinalized = members.length > 0 && members.every((item) => draft.confirmedMemberIds.includes(item.memberId));
  draft.updatedAt = Date.now();
  if (draft.isFinalized) {
    room.status = 'confirmed';
  }
  resetTtl(code);
  return draft;
}

function buildDraftView(code, memberId = '') {
  const draft = getSharedDraft(code);
  if (!draft) return null;
  return {
    ...draft,
    canEdit: !draft.isFinalized && !draft.confirmedMemberIds.includes(memberId),
    allConfirmed: draft.isFinalized,
  };
}

function allMembersSubmitted(code) {
  const members = getMembers(code);
  return members.length > 0 && members.every((m) => m.status === 'submitted');
}

module.exports = {
  createRoom,
  getRoom,
  getMembers,
  getMember,
  getSharedDraft,
  buildDraftView,
  addMember,
  submitPrefs,
  setMemberSelections,
  updateSharedDraft,
  confirmSharedDraft,
  allMembersSubmitted,
};
