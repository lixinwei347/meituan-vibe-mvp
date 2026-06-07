const DEFAULT_ROOM_API = process.env.MEITUAN_ROOM_API || 'http://127.0.0.1:3000/api/rooms';

function normalizeMember(member = {}) {
  return {
    id: member.memberId || member.id || '',
    name: member.nickname || member.name || '匿名',
    avatar: member.avatar || '',
    prefSummary: member.prefSummary || '',
    location: member.location || null,
  };
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeStop(item = {}, index) {
  const poi = item.poi || item;
  const lat = toFiniteNumber(poi.lat);
  const lng = toFiniteNumber(poi.lng);
  return {
    id: String(poi.id || `stop-${index + 1}`),
    name: poi.name || `第${index + 1}站`,
    category: poi.category || '',
    price: poi.price || '--',
    feature: poi.subCategory || poi.category || poi.address || '值得一去',
    tags: Array.isArray(poi.tags) ? poi.tags.slice(0, 6) : [],
    photoUrl: poi.photoUrl || '',
    photoTitle: poi.photoTitle || '',
    lat,
    lng,
    address: poi.address || '',
    selectedByMemberIds: item.selectedByMemberIds || [],
  };
}

async function getRoomTrip(tripId) {
  if (!tripId || tripId === 'trip001') return null;

  const url = `${DEFAULT_ROOM_API}/${encodeURIComponent(tripId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const room = await res.json();
    const draftItems = room.draft && Array.isArray(room.draft.items) ? room.draft.items : [];
    const stops = draftItems.map(normalizeStop);
    const members = Array.isArray(room.members) ? room.members.map(normalizeMember) : [];

    return {
      id: tripId,
      title: room.tripType || '多人探店手帐',
      date: room.tripTime || '',
      source: 'room',
      room,
      members,
      stops,
      route: {
        preference: room.routePref || '',
        finalized: Boolean(room.draft && room.draft.isFinalized),
        version: room.draft ? room.draft.version : 0,
        trajectory: stops
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((s) => ({ lat: s.lat, lng: s.lng, name: s.name })),
      },
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { getRoomTrip };
