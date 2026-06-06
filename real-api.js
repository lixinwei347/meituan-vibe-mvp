/**
 * real-api.js — 后端 API 客户端
 *
 * 保留 `window.MockApi` 这个历史接口名，仅用于兼容现有 app.js。
 * 它只代理真实后端响应，不再指向任何本地演示数据。
 *
 * `window.RoomApi` 提供房间管理调用。
 */
(() => {
  // 自动检测后端地址（同 origin 即可）
  const API_BASE = `${location.origin}/api`;
  const WS_URL = `${location.origin.replace(/^http/, 'ws')}/ws`;

  // ---------- POI 预加载缓存（兼容 app.js 的同步调用） ----------
  let _poisCache = null;

  async function _preloadPois() {
    try {
      const resp = await fetch(`${API_BASE}/pois`);
      _poisCache = await resp.json();
    } catch (e) {
      console.warn('[real-api] POI 预加载失败，同步函数将返回空', e);
      _poisCache = [];
    }
  }

  // ---------- 兼容接口 ----------

  async function getUserContext() {
    const resp = await fetch(`${API_BASE}/location/default`);
    return resp.json();
  }

  async function getPoiRecommendations({ center, prefs, members } = {}) {
    const resp = await fetch(`${API_BASE}/pois/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ center, prefs, members }),
    });
    return resp.json();
  }

  async function planRoute({ origin, selectedIds, selectedPois, prefs, respectOrder } = {}) {
    // 把房间成员偏好一起传给后端，供 AI 参考
    const members = _roomCode ? await RoomApi.getRoom(_roomCode).then(r => r?.members).catch(() => null) : null;
    const resp = await fetch(`${API_BASE}/route/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, selectedIds, selectedPois, prefs, respectOrder, members }),
    });
    return resp.json();
  }

  async function searchPois(query = '', center = {}) {
    const params = new URLSearchParams({
      q: query,
      ...(center.lat != null && { lat: center.lat }),
      ...(center.lng != null && { lng: center.lng }),
    });
    const resp = await fetch(`${API_BASE}/pois/search?${params}`);
    return resp.json();
  }

  // 异步版（供外部显式 await 调用）
  async function getAllPois() {
    if (_poisCache) return _poisCache.slice();
    await _preloadPois();
    return (_poisCache || []).slice();
  }

  // 同步版（兼容 app.js 里直接调用 getAllPois().slice(0, n) 的地方）
  // app.js 解构时会拿到这个同步版
  function getAllPoisSync() {
    return (_poisCache || []).slice();
  }

  // 同步版 getPoiById（兼容 app.js 里的同步调用）
  function getPoiById(id) {
    return (_poisCache || []).find((p) => p.id === id) || null;
  }

  // ---------- WebSocket 连接管理 ----------

  let _ws = null;
  let _wsReady = false;
  let _pendingSend = [];          // 连接成功前的待发消息
  let _callbacks = {};            // type → [fn, ...]

  let _roomCode = null;
  let _memberId = null;

  function _saveSession() {
    if (_roomCode) sessionStorage.setItem('vibe_roomCode', _roomCode);
    if (_memberId) sessionStorage.setItem('vibe_memberId', _memberId);
  }

  function _restoreSession() {
    _roomCode = sessionStorage.getItem('vibe_roomCode');
    _memberId = sessionStorage.getItem('vibe_memberId');
  }

  function _onMsg(type, cb) {
    if (!_callbacks[type]) _callbacks[type] = [];
    _callbacks[type].push(cb);
  }

  function _emit(type, payload) {
    (_callbacks[type] || []).forEach((cb) => cb(payload));
  }

  function _wsSend(msg) {
    const str = JSON.stringify(msg);
    if (_ws && _wsReady) {
      _ws.send(str);
    } else {
      _pendingSend.push(str);
    }
  }

  function _connectWs() {
    if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;

    _ws = new WebSocket(WS_URL);
    _wsReady = false;

    _ws.addEventListener('open', () => {
      _wsReady = true;
      // 发送积压消息
      while (_pendingSend.length) _ws.send(_pendingSend.shift());
      // 若之前有 session，重新加入房间
      if (_roomCode && _memberId) {
        _ws.send(JSON.stringify({ type: 'join', roomCode: _roomCode, memberId: _memberId }));
      }
    });

    _ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      _emit(msg.type, msg);
    });

    _ws.addEventListener('close', () => {
      _wsReady = false;
      // 5 秒后自动重连
      setTimeout(_connectWs, 5000);
    });

    _ws.addEventListener('error', (e) => {
      console.warn('[real-api] WS error:', e);
    });
  }

  // ---------- RoomApi（房间管理扩展接口） ----------

  const RoomApi = {
    // 创建房间
    async createRoom({ tripType = '', tripTime = '', routePref = '' } = {}) {
      const resp = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripType, tripTime, routePref }),
      });
      const data = await resp.json();
      _roomCode = data.code;
      _saveSession();
      // 建立 WS 并加入房间（创建者暂无 memberId，先只建连接）
      _connectWs();
      return data; // { code, roomId, status }
    },

    // 加入房间
    async joinRoom(code, { nickname = '匿名', avatar = '？' } = {}) {
      const resp = await fetch(`${API_BASE}/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'JOIN_FAILED');
      }
      const data = await resp.json();
      _roomCode = code;
      _memberId = data.memberId;
      _saveSession();
      // 建立 WS 并加入房间
      _connectWs();
      _wsSend({ type: 'join', roomCode: code, memberId: data.memberId });
      return data; // { memberId, member, members }
    },

    // 提交偏好
    async submitPrefs(prefs) {
      if (!_roomCode || !_memberId) throw new Error('未加入房间');
      const resp = await fetch(`${API_BASE}/rooms/${_roomCode}/members/${_memberId}/prefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      return resp.json(); // { ok, allSubmitted, member, members }
    },

    async submitSelections(selectedPois) {
      if (!_roomCode || !_memberId) throw new Error('未加入房间');
      const resp = await fetch(`${API_BASE}/rooms/${_roomCode}/members/${_memberId}/selections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPois }),
      });
      return resp.json();
    },

    async getDraft() {
      if (!_roomCode) throw new Error('未加入房间');
      const resp = await fetch(`${API_BASE}/rooms/${_roomCode}/draft?memberId=${encodeURIComponent(_memberId || '')}`);
      if (!resp.ok) throw new Error('DRAFT_NOT_FOUND');
      return resp.json();
    },

    async updateDraft(selectedPois) {
      if (!_roomCode || !_memberId) throw new Error('未加入房间');
      const resp = await fetch(`${API_BASE}/rooms/${_roomCode}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: _memberId, selectedPois }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'DRAFT_UPDATE_FAILED');
      }
      return resp.json();
    },

    async confirmDraft() {
      if (!_roomCode || !_memberId) throw new Error('未加入房间');
      const resp = await fetch(`${API_BASE}/rooms/${_roomCode}/draft/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: _memberId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'DRAFT_CONFIRM_FAILED');
      }
      return resp.json();
    },

    // 获取房间信息
    async getRoom(code) {
      const resp = await fetch(`${API_BASE}/rooms/${code || _roomCode}`);
      if (!resp.ok) return null;
      return resp.json();
    },

    // 当前房间码（只读）
    get roomCode() { return _roomCode; },
    get memberId() { return _memberId; },

    // WebSocket 事件监听
    onSnapshot(cb)      { _onMsg('snapshot', cb); },
    onMemberJoined(cb)  { _onMsg('memberJoined', cb); },
    onMemberUpdate(cb)  { _onMsg('memberUpdate', cb); },
    onDraftUpdate(cb)   { _onMsg('draftUpdate', cb); },
    onAllSubmitted(cb)  { _onMsg('allSubmitted', cb); },
    onPing(cb)          { _onMsg('ping', cb); },
  };

  // ---------- 启动：预加载 POI 缓存 ----------
  _restoreSession();
  _preloadPois();

  // ---------- 挂载到 window ----------

  // 兼容旧接口名，实际只走真实后端
  window.MockApi = {
    getAllPois: getAllPoisSync,   // 同步版，兼容 app.js 直接调用
    getPoiById,
    getPoiRecommendations,
    getUserContext,
    planRoute,
    searchPois,
  };

  // RoomApi：新增，供后续扩展 app.js 时调用
  window.RoomApi = RoomApi;

  console.log('[real-api] 已加载，后端地址:', API_BASE);
})();
