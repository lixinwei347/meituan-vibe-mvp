const router = require('express').Router();
const {
  createRoom,
  getRoom,
  getMembers,
  addMember,
  submitPrefs,
  allMembersSubmitted,
  setMemberSelections,
  buildDraftView,
  updateSharedDraft,
  confirmSharedDraft,
} = require('../lib/roomStore');
const { broadcastAll } = require('../ws/server');
const { geocode } = require('../lib/amapSearch');

function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

async function resolveMemberLocation(payload = {}) {
  if (hasCoordinates(payload.location)) {
    return {
      lat: Number(payload.location.lat),
      lng: Number(payload.location.lng),
      name: payload.location.name || payload.locationInput || '成员位置',
      address: payload.location.address || '',
      source: payload.location.source || 'client',
    };
  }

  if (!payload.locationInput) return null;

  try {
    const geo = await geocode(payload.locationInput);
    if (!geo) return null;
    return {
      lat: Number(geo.lat),
      lng: Number(geo.lng),
      name: geo.name || payload.locationInput,
      address: geo.address || '',
      source: 'geocode',
    };
  } catch (_) {
    return null;
  }
}

// POST /api/rooms — 创建房间
router.post('/', async (req, res, next) => {
  try {
    const { tripType = '', tripTime = '', routePref = '' } = req.body;
    const room = await createRoom({ tripType, tripTime, routePref });
    res.json({ code: room.code, roomId: room.roomId, status: room.status });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:code — 获取房间详情
router.get('/:code', (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  const members = getMembers(req.params.code);
  const draft = buildDraftView(req.params.code);
  res.json({ ...room, members, draft });
});

// POST /api/rooms/:code/join — 加入房间
router.post('/:code/join', (req, res) => {
  try {
    const { nickname = '匿名', avatar = '？' } = req.body;
    const member = addMember(req.params.code, { nickname, avatar });
    const members = getMembers(req.params.code);
    res.json({ memberId: member.memberId, member, members });
  } catch (err) {
    if (err.message === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
    }
    throw err;
  }
});

// POST /api/rooms/:code/members/:memberId/selections — 提交上一步已选店铺
router.post('/:code/members/:memberId/selections', (req, res) => {
  const { code, memberId } = req.params;
  try {
    const { member, draft } = setMemberSelections(code, memberId, req.body?.selectedPois || []);
    const members = getMembers(code);
    const payload = { type: 'draftUpdate', member, members, draft: buildDraftView(code), trigger: 'memberSelections' };
    broadcastAll(code, payload);
    res.json({ ok: true, member, members, draft: buildDraftView(code) });
  } catch (err) {
    if (err.message === 'ROOM_NOT_FOUND') return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
    if (err.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
    throw err;
  }
});

// GET /api/rooms/:code/draft — 获取共享行程草稿
router.get('/:code/draft', (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  const memberId = String(req.query.memberId || '');
  const draft = buildDraftView(req.params.code, memberId);
  if (!draft) return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
  res.json(draft);
});

// PUT /api/rooms/:code/draft — 全量更新共享草稿
router.put('/:code/draft', (req, res) => {
  const { code } = req.params;
  const { memberId = '', selectedPois = [] } = req.body || {};
  try {
    const draft = updateSharedDraft(code, memberId, selectedPois);
    const members = getMembers(code);
    const payload = { type: 'draftUpdate', members, draft: buildDraftView(code), trigger: 'draftMutation', actorMemberId: memberId };
    broadcastAll(code, payload);
    res.json({ ok: true, draft: buildDraftView(code, memberId), members });
  } catch (err) {
    if (err.message === 'ROOM_NOT_FOUND') return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
    if (err.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
    if (err.message === 'DRAFT_LOCKED') return res.status(409).json({ error: 'DRAFT_LOCKED' });
    throw err;
  }
});

// POST /api/rooms/:code/draft/confirm — 当前成员确认当前版本
router.post('/:code/draft/confirm', (req, res) => {
  const { code } = req.params;
  const { memberId = '' } = req.body || {};
  try {
    const draft = confirmSharedDraft(code, memberId);
    const members = getMembers(code);
    const payload = { type: 'draftUpdate', members, draft: buildDraftView(code), trigger: draft.isFinalized ? 'draftFinalized' : 'draftConfirmed', actorMemberId: memberId };
    broadcastAll(code, payload);
    res.json({ ok: true, draft: buildDraftView(code, memberId), members, allConfirmed: draft.isFinalized, canEdit: !draft.isFinalized && !draft.confirmedMemberIds.includes(memberId) });
  } catch (err) {
    if (err.message === 'ROOM_NOT_FOUND') return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
    if (err.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
    if (err.message === 'DRAFT_NOT_FOUND') return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
    throw err;
  }
});

// POST /api/rooms/:code/members/:memberId/prefs — 提交成员偏好
router.post('/:code/members/:memberId/prefs', async (req, res) => {
  const { code, memberId } = req.params;
  try {
    const location = await resolveMemberLocation(req.body);
    const member = submitPrefs(code, memberId, { ...req.body, location });
    const members = getMembers(code);
    const submitted = allMembersSubmitted(code);

    // WebSocket 广播
    broadcastAll(code, { type: 'memberUpdate', member, members, allSubmitted: submitted });
    if (submitted) {
      broadcastAll(code, { type: 'allSubmitted', trigger: 'canBuildRoute' });
    }

    res.json({ ok: true, allSubmitted: submitted, member, members });
  } catch (err) {
    if (err.message === 'ROOM_NOT_FOUND') return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
    if (err.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
    throw err;
  }
});

module.exports = router;
