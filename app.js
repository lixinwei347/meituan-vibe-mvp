(() => {
const { getAllPois, getPoiById, getPoiRecommendations, getUserContext, planRoute, searchPois } = window.MockApi;

const preferenceSets = {
  foods: ['火锅', '粤菜', '川湘菜', '烧烤', '日料'],
  avoid: ['不吃辣', '忌香菜', '不吃葱蒜', '海鲜过敏'],
  fun: ['剧本杀', '密室逃脱', '电竞', '美甲美睫', '户外攀岩'],
};

const state = {
  screen: '04',
  origin: null,
  filters: ['综合最优', '美食', '玩乐', '近地铁'],
  activeFilter: '综合最优',
  recommendations: [],
  previewIds: [],
  previewSelectedIds: [],
  previewPoiPool: [],   // 跨 tab 的 POI 总池，用于查找已选 POI 对象
  searchResults: [],
  searchQuery: '',
  selectedIds: [],
  routePlan: null,
  manualRouteOrder: false,
  homeHistoryExpanded: false,
  showEndDialog: false,
  endTripChoice: 'notebook',
  loadingTimer: null,
  tripStarted: false,
  tripExecutionStarted: false,
  activeStopIndex: 0,
  completedStopIds: [],
  currentTripId: null,
  tripBarrage: [],
  storeComments: {},
  commentTarget: 'trip',
  navigation: {
    active: false,
    stopId: null,
    mode: '',
    summary: null,
    status: 'idle',
  },
  albumPhotos: [],
  likedPhotoIds: new Set(),
  historyTrips: [],
  activeTripHistoryId: null,
  notebook: null,
  mediaViewer: {
    index: 0,
  },
  tripEnded: false,
  roomCode: null,       // 真实房间码（创建/加入后写入）
  memberId: null,       // 本人在房间里的 memberId
  currentMembers: [],   // 房间成员列表（WS 实时更新）
  sharedDraft: null,    // screen12 共享行程草稿
  roomMode: 'create',   // screen05 模式：'create' | 'join'
  recommendationRequestId: 0,
  recommendationLoading: false,
  recommendationCache: {},
  selectedPrefs: {
    categories: [],
    fun: [],
    avoid: [],
    startHour: 18,
    foods: [],
    foodsInput: '',
    avoidInput: '',
    funInput: '',
    locationInput: '',
  },
};

const el = {
  screen04: document.querySelector('.screen-04'),
  screen05: document.querySelector('.screen-05'),
  screen06: document.querySelector('.screen-06'),
  screen07: document.querySelector('.screen-07'),
  screen08: document.querySelector('.screen-08'),
  screen09: document.querySelector('.screen-09'),
  screen10: document.querySelector('.screen-10'),
  screen11: document.querySelector('.screen-11'),
  screen12: document.querySelector('.screen-12'),
  screen13: document.querySelector('.screen-13'),
  screen14: document.querySelector('.screen-14'),
  screen15: document.querySelector('.screen-15'),
  screen18: document.querySelector('.screen-18'),
  screen19: document.querySelector('.screen-19'),
  back04: document.getElementById('back04'),
  back05: document.getElementById('back05'),
  back06: document.getElementById('back06'),
  back07: document.getElementById('back07'),
  back08: document.getElementById('back08'),
  back09: document.getElementById('back09'),
  back10: document.getElementById('back10'),
  back11: document.getElementById('back11'),
  back12: document.getElementById('back12'),
  back13: document.getElementById('back13'),
  back14: document.getElementById('back14'),
  back15: document.getElementById('back15'),
  back18: document.getElementById('back18'),
  closeMedia: document.getElementById('close-media'),
  openRoomModal: document.getElementById('open-room-modal'),
  quickJoinRoom: document.getElementById('quick-join-room'),
  createRoom: document.getElementById('create-room'),
  joinRoom: document.getElementById('join-room'),
  roomCodeInput: document.getElementById('room-code-input'),
  roomNicknameCreate: document.getElementById('room-nickname-create'),
  roomNicknameJoin: document.getElementById('room-nickname-join'),
  roomPanelCreate: document.getElementById('room-panel-create'),
  roomPanelJoin: document.getElementById('room-panel-join'),
  roomCodeBadge: document.getElementById('room-code-badge'),
  shareCode: document.querySelector('.share-code'),
  sendInvite: document.getElementById('send-invite'),
  addInviteFriend: document.getElementById('add-invite-friend'),
  saveRoomSettings: document.getElementById('save-room-settings'),
  copyRoomLink: document.getElementById('copy-room-link'),
  startPreferences: document.getElementById('start-preferences'),
  tripTypeGrid: document.getElementById('trip-type-grid'),
  tripTypeCustom: document.getElementById('trip-type-custom'),
  tripTimeInput: document.getElementById('trip-time-input'),
  routePrefInput: document.getElementById('route-pref-input'),
  optionSheet: document.getElementById('option-sheet'),
  optionSheetTitle: document.getElementById('option-sheet-title'),
  optionList: document.getElementById('option-list'),
  locationInput: document.getElementById('location-input'),
  locationAutocomplete: document.getElementById('location-autocomplete'),
  submitPrefs: document.getElementById('submit-prefs'),
  buildRoute: document.getElementById('build-route'),
  skipLoading: document.getElementById('skip-loading'),
  aiReasonBar: document.getElementById('ai-reason-bar'),
  foodChips: document.getElementById('food-chips'),
  avoidChips: document.getElementById('avoid-chips'),
  funChips: document.getElementById('fun-chips'),
  foodInput: document.getElementById('food-input'),
  avoidInput: document.getElementById('avoid-input'),
  funInput: document.getElementById('fun-input'),
  memberList: document.getElementById('member-list'),
  summaryMapVisual: document.getElementById('summary-map-visual'),
  summaryProgressText: document.getElementById('summary-progress-text'),
  summaryProgressAvatars: document.getElementById('summary-progress-avatars'),
  loadingMemberSummary: document.getElementById('loading-member-summary'),
  loadingDots: document.getElementById('loading-dots'),
  nextStep: document.getElementById('next-step'),
  addMore: document.getElementById('add-more'),
  confirmRoute: document.getElementById('confirm-route'),
  itineraryList: document.getElementById('itinerary-list'),
  commentPreviewList: document.getElementById('comment-preview-list'),
  tripBarrage: document.getElementById('trip-barrage'),
  tripBarragePreview: document.getElementById('trip-barrage-preview'),
  openAlbum: document.getElementById('open-album'),
  openCommentPanel: document.getElementById('open-comment-panel'),
  endTrip: document.getElementById('end-trip'),
  albumCount: document.getElementById('album-count'),
  photoGrid: document.getElementById('photo-grid'),
  albumPickCard: document.getElementById('album-pick-card'),
  albumCameraCard: document.getElementById('album-camera-card'),
  albumPickBottom: document.getElementById('album-pick-bottom'),
  albumCameraBottom: document.getElementById('album-camera-bottom'),
  albumFileInput: document.getElementById('album-file-input'),
  albumCameraInput: document.getElementById('album-camera-input'),
  commentTargets: document.getElementById('comment-targets'),
  commentInput: document.getElementById('comment-input'),
  commentDestination: document.getElementById('comment-destination'),
  publishComment: document.getElementById('publish-comment'),
  commentSheet: document.querySelector('.comment-sheet'),
  commentSheetTitle: document.querySelector('.comment-sheet h2'),
  commentInputHint: document.querySelector('.comment-input-wrap span'),
  recommendationList: document.getElementById('recommendation-list'),
  routeList: document.getElementById('route-list'),
  filterRow: document.getElementById('filter-row'),
  previewSelectedBar: document.getElementById('preview-selected-bar'),
  previewSelectedNames: document.getElementById('preview-selected-names'),
  selectAllRecommendations: document.getElementById('select-all-recommendations'),
  toast: document.getElementById('toast'),
  map11: document.getElementById('map11'),
  map12: document.getElementById('map12'),
  liveMap13: document.getElementById('live-map13'),
  liveMap15: document.getElementById('live-map15'),
  routeDistance: document.getElementById('route-distance'),
  startLiveTrip: document.getElementById('start-live-trip'),
  poiSearch: document.getElementById('poi-search'),
  searchResults: document.getElementById('search-results'),
  homeHistoryList: document.getElementById('home-history-list'),
  homeHistorySeeAll: document.getElementById('home-history-see-all'),
  endTripDialog: document.getElementById('end-trip-dialog'),
  endTripStats: document.getElementById('end-trip-stats'),
  generateNotebook: document.getElementById('generate-notebook'),
  skipNotebook: document.getElementById('skip-notebook'),
  confirmEndTrip: document.getElementById('confirm-end-trip'),
  cancelEndTrip: document.getElementById('cancel-end-trip'),
  notebookCard: document.getElementById('notebook-card'),
  notebookRouteList: document.getElementById('notebook-route-list'),
  notebookMediaGrid: document.getElementById('notebook-media-grid'),
  notebookComments: document.getElementById('notebook-comments'),
  shareNotebook: document.getElementById('share-notebook'),
  saveNotebook: document.getElementById('save-notebook'),
  notebookHome: document.getElementById('notebook-home'),
  mediaViewerContent: document.getElementById('media-viewer-content'),
  mediaTitle: document.getElementById('media-title'),
  mediaMeta: document.getElementById('media-meta'),
  mediaPrev: document.getElementById('media-prev'),
  mediaNext: document.getElementById('media-next'),
};

const map11 = createMapAdapter(el.map11, handleMapPoiClick);
const map12 = createMapAdapter(el.map12, handleMapPoiClick);
const liveMap13 = createMapAdapter(el.liveMap13);
const liveMap15 = createMapAdapter(el.liveMap15);

let loadingAnimationFrame = 0;
let eventsBound = false;
let liveMapResizeFrame = 0;

if (typeof window !== 'undefined') {
  window.__mtVibeTestState = state;
  window.__mtVibeRender = render;
}

function shouldHydrateInitialRoutePlan(snapshot) {
  return (
    state.screen === snapshot.screen &&
    state.screen === '04' &&
    state.selectedIds.length === snapshot.selectedCount &&
    state.selectedIds.length === 0 &&
    state.roomCode === snapshot.roomCode &&
    !state.tripStarted
  );
}

function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function getMemberLocation(member) {
  if (hasCoordinates(member?.location)) {
    return {
      lat: Number(member.location.lat),
      lng: Number(member.location.lng),
      name: member.location.name || member.nickname || '成员位置',
      address: member.location.address || '',
    };
  }
  if (hasCoordinates(member)) {
    return {
      lat: Number(member.lat),
      lng: Number(member.lng),
      name: member.name || member.nickname || '成员位置',
      address: member.address || '',
    };
  }
  return null;
}

function getMembersCenter(members = state.currentMembers) {
  const points = (members || []).map(getMemberLocation).filter(Boolean);
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    name: '成员中心',
    address: '成员聚合位置',
  };
}

function isSharedDraftMode() {
  return Boolean(state.roomCode && state.sharedDraft && state.screen === '12');
}

function getCurrentMemberName(memberId) {
  return state.currentMembers.find((member) => member.memberId === memberId)?.nickname || '成员';
}

function canEditSharedDraft() {
  if (!state.sharedDraft || !state.memberId) return true;
  return !state.sharedDraft.isFinalized && !(state.sharedDraft.confirmedMemberIds || []).includes(state.memberId);
}

function getSharedDraftPois() {
  return (state.sharedDraft?.items || []).map((item) => item.poi).filter(Boolean);
}

function getSelectedByLabel(poiId) {
  const item = state.sharedDraft?.items?.find((draftItem) => draftItem.poi.id === poiId);
  if (!item?.selectedByMemberIds?.length) return '';
  const names = item.selectedByMemberIds.map(getCurrentMemberName).filter(Boolean);
  if (!names.length) return '';
  if (names.length <= 3) return `来自 ${names.join('、')} 的选择`;
  return `来自 ${names.slice(0, 3).join('、')} 等 ${names.length} 人的选择`;
}

function applySharedDraftState(draft) {
  state.sharedDraft = draft || null;
  if (!draft) return;
  const selected = getSharedDraftPois();
  state.selectedIds = selected.map((poi) => poi.id);
  state.routePlan = {
    ...(state.routePlan || {}),
    selected,
    totalDistanceLabel: draft.isFinalized ? '已确认' : `协同调整中 · 第 ${draft.version} 版`,
  };
  selected.forEach((poi) => {
    if (!state.previewPoiPool.find((item) => item.id === poi.id)) {
      state.previewPoiPool.push(poi);
    }
  });
}

function syncPreviewSelectionFromSharedDraft() {
  const selected = getSharedDraftPois();
  if (!selected.length) return;
  selected.forEach((poi) => {
    if (!state.previewPoiPool.find((item) => item.id === poi.id)) {
      state.previewPoiPool.push(poi);
    }
  });
  state.previewSelectedIds = selected.map((poi) => poi.id);
}

function startTripFromRoute(currentRoute) {
  if (!currentRoute.length) {
    showToast('请先添加至少一个地点');
    return false;
  }
  state.selectedIds = currentRoute.map((poi) => poi.id);
  state.routePlan = { ...state.routePlan, selected: currentRoute };
  state.tripStarted = true;
  state.tripExecutionStarted = false;
  state.activeStopIndex = 0;
  state.completedStopIds = [];
  resetNavigationState();
  state.tripEnded = false;
  state.activeTripHistoryId = null;
  state.currentTripId = `trip-${Date.now()}`;
  state.screen = '13';
  render();
  showToast('行程已开始 🎉');
  return true;
}

async function syncSharedDraft(selectedPois) {
  if (!window.RoomApi || !state.roomCode) return;
  const response = await window.RoomApi.updateDraft(selectedPois);
  applySharedDraftState(response.draft);
}

function isAiBundleRecommendation(item) {
  return Boolean(item?.isAiBundle && Array.isArray(item.bundleItems));
}

function getRecommendationReason() {
  const bundle = state.activeFilter === '综合最优'
    ? state.recommendations.find(isAiBundleRecommendation)
    : null;
  return bundle?.aiReason || '';
}

function getRecommendationLoadingCopy() {
  return state.activeFilter === '综合最优'
    ? 'AI 正在综合成员偏好并生成方案卡...'
    : '正在加载推荐结果...';
}

function getComprehensiveBundlePois() {
  const seen = new Set();
  return state.recommendations
    .filter(isAiBundleRecommendation)
    .flatMap((item) => item.bundleItems || [])
    .filter((poi) => {
      if (!poi?.id || seen.has(poi.id)) return false;
      seen.add(poi.id);
      return true;
    });
}

const RECOMMENDATION_CACHE_VERSION = 2;

function getRecommendationCacheSignature(mode) {
  const memberSnapshot = (state.currentMembers || []).map((member) => ({
    memberId: member.memberId,
    status: member.status,
    prefSummary: member.prefSummary,
    prefs: member.prefs,
    location: member.location,
  }));
  return JSON.stringify({
    version: RECOMMENDATION_CACHE_VERSION,
    mode,
    origin: hasCoordinates(state.origin) ? {
      lat: Number(state.origin.lat).toFixed(4),
      lng: Number(state.origin.lng).toFixed(4),
    } : null,
    prefs: state.selectedPrefs,
    members: memberSnapshot,
  });
}

function syncPreviewPoolFromRecommendations() {
  if (!Array.isArray(state.previewPoiPool)) state.previewPoiPool = [];
  const poolIds = new Set(state.previewPoiPool.map((poi) => poi.id));
  state.recommendations.forEach((item) => {
    if (isAiBundleRecommendation(item)) {
      item.bundleItems.forEach((poi) => {
        if (!poolIds.has(poi.id)) {
          poolIds.add(poi.id);
          state.previewPoiPool.push(poi);
        }
      });
      return;
    }
    if (!poolIds.has(item.id)) {
      poolIds.add(item.id);
      state.previewPoiPool.push(item);
    }
  });
}

function updateLiveMapSize() {
  if (typeof window === 'undefined') return;
  const viewportHeight = window.innerHeight || 844;
  const viewportWidth = window.innerWidth || 390;
  const nextHeight = Math.max(150, Math.min(220, Math.round(Math.min(viewportHeight * 0.24, viewportWidth * 0.48))));
  document.querySelectorAll('.screen-13 .live-map, .screen-15 .live-map').forEach((map) => {
    map.style.height = `${nextHeight}px`;
  });
}

function syncLiveMapViewport() {
  if (typeof window === 'undefined') return;
  updateLiveMapSize();
  if (liveMapResizeFrame) cancelAnimationFrame(liveMapResizeFrame);
  liveMapResizeFrame = requestAnimationFrame(() => {
    liveMap13.resize?.();
    liveMap15.resize?.();
    if (state.screen === '13' || state.screen === '15') {
      renderLiveMap(getLiveStops());
    }
  });
}

async function bootstrap() {
  updateViewportScale();
  if (typeof window !== 'undefined') window.addEventListener('resize', updateViewportScale);
  bindEvents();
  syncPreferenceModel();
  render();

  const bootstrapSnapshot = {
    screen: state.screen,
    selectedCount: state.selectedIds.length,
    roomCode: state.roomCode,
  };

  try {
    state.origin = await resolveUserLocation();
    await refreshRecommendations();
    const nextRoutePlan = await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: false });
    if (shouldHydrateInitialRoutePlan(bootstrapSnapshot)) {
      state.routePlan = nextRoutePlan;
    }
  } catch (error) {
    console.error('初始化位置和推荐数据失败，已回退到用户上下文', error);
    state.origin = await getUserContext();
    await refreshRecommendations();
  }
  render();
}

// 高德 AutoComplete 位置联想搜索绑定
function bindLocationAutocomplete() {
  const input = el.locationInput;
  const list  = el.locationAutocomplete;
  if (!input || !list) return;

  let ac = null;
  let debounceTimer = null;

  // 懒初始化 AutoComplete 插件（高德加载后才能 new）
  function getAC() {
    if (ac) return ac;
    if (typeof AMap === 'undefined' || !AMap.AutoComplete) return null;
    ac = new AMap.AutoComplete({ city: '全国', datatype: 'poi' });
    return ac;
  }

  function showSuggestions(tips) {
    list.innerHTML = tips.map((tip) => {
      const name    = tip.name || '';
      const address = tip.address || tip.district || '';
      return `<li data-name="${name}" data-address="${address}">
        <strong>${name}</strong>
        ${address ? `<span>${address}</span>` : ''}
      </li>`;
    }).join('');
    list.classList.add('is-open');

    list.querySelectorAll('li').forEach((item) => {
      item.addEventListener('click', () => {
        const name = item.dataset.name;
        const addr = item.dataset.address;
        input.value = name;
        state.selectedPrefs.locationInput = name;
        // 如果 tip 带经纬度，同步更新 state.origin
        const tip = tips.find((t) => t.name === name);
        if (tip?.location) {
          state.origin = {
            lat: tip.location.lat,
            lng: tip.location.lng,
            name,
            address: addr,
          };
        }
        list.classList.remove('is-open');
        list.innerHTML = '';
      });
    });
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    state.selectedPrefs.locationInput = input.value;
    clearTimeout(debounceTimer);
    if (!q) {
      list.classList.remove('is-open');
      list.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(() => {
      const plugin = getAC();
      if (!plugin) return;
      plugin.search(q, (status, result) => {
        if (status === 'complete' && result.tips?.length) {
          showSuggestions(result.tips.slice(0, 6));
        } else {
          list.classList.remove('is-open');
        }
      });
    }, 200);
  });

  // 点击外部关闭联想列表
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.classList.remove('is-open');
    }
  });
}

// 注册 WebSocket 房间事件（成员加入/偏好提交）
function registerRoomWsListeners() {
  if (!window.RoomApi) return;

  // 加入时服务端下发当前成员快照
  window.RoomApi.onSnapshot((msg) => {
    if (msg.members) {
      state.currentMembers = msg.members;
    }
    if (msg.draft) applySharedDraftState(msg.draft);
    render();
  });

  // 有新成员加入房间
  window.RoomApi.onMemberJoined((msg) => {
    if (msg.members) {
      state.currentMembers = msg.members;
      render();
      showToast(`${msg.member?.nickname || '新成员'} 加入了房间`);
    }
  });

  // 有成员提交偏好
  window.RoomApi.onMemberUpdate((msg) => {
    if (msg.members) {
      state.currentMembers = msg.members;
    }
    if (msg.draft) applySharedDraftState(msg.draft);
    render();
    if (msg.allSubmitted) showToast('所有成员已提交偏好！');
  });

  window.RoomApi.onDraftUpdate((msg) => {
    if (msg.members) state.currentMembers = msg.members;
    if (msg.draft) applySharedDraftState(msg.draft);
    if (msg.trigger === 'draftFinalized') {
      const currentRoute = state.routePlan?.selected?.length
        ? state.routePlan.selected
        : getSharedDraftPois();
      startTripFromRoute(currentRoute);
      return;
    }
    render();
    if (msg.trigger === 'draftConfirmed') {
      showToast(`${getCurrentMemberName(msg.actorMemberId)} 已确认当前版本`);
    } else if (msg.trigger === 'draftMutation') {
      showToast('共享行程已更新，确认状态已重置');
    }
  });
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  el.openRoomModal.addEventListener('click', () => {
    state.roomMode = 'create';
    state.screen = '05';
    render();
  });

  el.quickJoinRoom.addEventListener('click', () => {
    state.roomMode = 'join';
    state.screen = '05';
    render();
  });

  el.createRoom.addEventListener('click', async () => {
    const nickname = (el.roomNicknameCreate?.value || '').trim() || '房主';
    const avatar = nickname.charAt(0).toUpperCase();
    if (!window.RoomApi) {
      showToast('房间服务不可用');
      return;
    }
    try {
      showToast('创建中...');
      const roomData = await window.RoomApi.createRoom({});
      state.roomCode = roomData.code;
      const joinData = await window.RoomApi.joinRoom(roomData.code, { nickname, avatar });
      state.memberId = joinData.memberId;
      state.currentMembers = joinData.members || [];
      registerRoomWsListeners();
      state.screen = '09';
      render();
    } catch (e) {
      console.warn('创建房间失败', e);
      showToast('创建房间失败，请稍后重试');
    }
  });

  el.joinRoom.addEventListener('click', async () => {
    const code = el.roomCodeInput.value.trim();
    if (!/^\d{4}$/.test(code)) {
      showToast('请输入 4 位房间码');
      el.roomCodeInput.focus();
      return;
    }
    const nickname = (el.roomNicknameJoin?.value || '').trim() || '匿名';
    // 取昵称首字母大写作为头像字符
    const avatar = nickname.charAt(0).toUpperCase();
    if (!window.RoomApi) {
      showToast('房间服务不可用');
      return;
    }
    try {
      showToast('加入中...');
      const data = await window.RoomApi.joinRoom(code, { nickname, avatar });
      state.roomCode = code;
      state.memberId = data.memberId;
      state.currentMembers = data.members || [];
      registerRoomWsListeners();
      state.screen = '09';
      render();
      showToast(`已加入房间 ${code}`);
      return;
    } catch (e) {
      const msg = e.message === 'ROOM_NOT_FOUND' ? '房间不存在' : '加入失败，请重试';
      showToast(msg);
      return;
    }
  });

  el.saveRoomSettings.addEventListener('click', () => {
    // 房间已在 screen05 创建，这里只跳到邀请页
    state.screen = '07';
    render();
  });

  el.copyRoomLink.addEventListener('click', () => {
    copyInviteLink();
  });

  el.sendInvite.addEventListener('click', () => {
    generateInviteImage();
  });

  el.addInviteFriend.addEventListener('click', () => {
    generateInviteImage();
  });

  el.startPreferences.addEventListener('click', () => {
    state.screen = '08';
    render();
  });

  el.tripTypeGrid.querySelectorAll('[data-trip-type]').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('is-selected');
      if (!el.tripTypeGrid.querySelectorAll('[data-trip-type].is-selected').length) {
        button.classList.add('is-selected');
      }
    });
  });

  el.tripTypeCustom.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = el.tripTypeCustom.value.trim();
    if (!value) return;
    const exists = [...el.tripTypeGrid.querySelectorAll('[data-trip-type]')].some((button) => button.dataset.tripType === value);
    if (!exists) {
      const button = document.createElement('button');
      button.className = 'trip-type-card trip-type-card--custom is-selected';
      button.dataset.tripType = value;
      button.type = 'button';
      button.innerHTML = `<span>＋</span><strong>${value}</strong>`;
      button.addEventListener('click', () => button.classList.toggle('is-selected'));
      el.tripTypeGrid.appendChild(button);
    }
    el.tripTypeCustom.value = '';
  });

  document.querySelectorAll('.switch').forEach((button) => {
    button.addEventListener('click', () => button.classList.toggle('is-on'));
  });

  // 快捷位置按钮
  document.querySelectorAll('[data-location]').forEach((button) => {
    button.addEventListener('click', () => {
      el.locationInput.value = button.dataset.location;
      state.selectedPrefs.locationInput = button.dataset.location;
      showToast(`已选择：${button.dataset.location}`);
    });
  });

  // 实时定位按钮
  const gpsBtn = document.getElementById('use-gps-btn');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', async () => {
      if (!navigator.geolocation) {
        showToast('当前浏览器不支持定位');
        return;
      }
      gpsBtn.disabled = true;
      gpsBtn.querySelector('strong').textContent = '定位中...';
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 30_000,
          });
        });
        const { latitude: lat, longitude: lng } = pos.coords;
        state.origin = { lat, lng, name: '当前位置', address: '实时定位结果' };
        el.locationInput.value = `当前位置（${lat.toFixed(4)}, ${lng.toFixed(4)}）`;
        state.selectedPrefs.locationInput = el.locationInput.value;
        showToast('✅ 定位成功');
      } catch (e) {
        const msg = e.code === 1 ? '定位权限被拒绝，请在浏览器设置中允许' : '定位失败，请手动输入位置';
        showToast(msg);
      } finally {
        gpsBtn.disabled = false;
        gpsBtn.querySelector('strong').textContent = '使用实时定位';
      }
    });
  }

  // 高德 AutoComplete 位置联想搜索
  bindLocationAutocomplete();

  document.querySelectorAll('[data-open-sheet]').forEach((row) => {
    row.addEventListener('click', () => openOptionSheet(row.dataset.openSheet));
  });

  el.optionSheet.addEventListener('click', (event) => {
    if (event.target === el.optionSheet) closeOptionSheet();
  });

  el.submitPrefs.addEventListener('click', async () => {
    syncPreferenceModel();
    // 若已加入房间，同步偏好到后端
    if (window.RoomApi && window.RoomApi.memberId) {
      try {
        const location = hasCoordinates(state.origin)
          ? {
              lat: Number(state.origin.lat),
              lng: Number(state.origin.lng),
              name: state.origin.name || state.selectedPrefs.locationInput || '当前位置',
              address: state.origin.address || '',
              source: 'client',
            }
          : null;
        await window.RoomApi.submitPrefs({ ...state.selectedPrefs, location });
      } catch (e) {
        console.warn('偏好同步失败（继续本地流程）', e);
      }
    }
    state.screen = '09';
    render();
  });

  el.buildRoute.addEventListener('click', () => {
    syncPreferenceModel();
    state.screen = '10';
    render();
    startLoadingSequence();
  });

  el.skipLoading.addEventListener('click', () => {
    finishLoadingSequence();
  });

  if (el.selectAllRecommendations) {
    el.selectAllRecommendations.addEventListener('click', () => {
      toggleSelectAllRecommendations();
    });
  }

  el.back04.addEventListener('click', () => showToast('已经是第一屏了'));
  el.back05.addEventListener('click', () => {
    state.screen = '04';
    render();
  });
  el.back06.addEventListener('click', () => {
    state.screen = '05';
    render();
  });
  el.back07.addEventListener('click', () => {
    state.screen = '06';
    render();
  });
  el.back08.addEventListener('click', () => {
    state.screen = '09';
    render();
  });
  el.back09.addEventListener('click', () => {
    state.screen = '05';
    render();
  });
  el.back10.addEventListener('click', () => {
    clearLoadingSequence();
    state.screen = '09';
    render();
  });

  el.nextStep.addEventListener('click', async () => {
    if (!state.previewSelectedIds.length) {
      showToast('请先选择想加入行程的店铺');
      return;
    }
    // 点「下一步」时才调 AI 规划路线，并显示 loading
    el.nextStep.disabled = true;
    el.nextStep.textContent = 'AI 规划中…';
    try {
      // 把跨 tab 选中的 POI 完整对象传给后端（让 AI 在这些里排序）
      const selectedPois = state.previewSelectedIds
        .map((id) => state.previewPoiPool.find((p) => p.id === id) || getPoiById(id))
        .filter(Boolean);

      if (window.RoomApi && state.roomCode) {
        const draftResp = await window.RoomApi.submitSelections(selectedPois);
        applySharedDraftState(draftResp.draft);
      }

      // 先按用户当前所选渲染 screen12，避免等待 AI 时出现空白调整页
      state.routePlan = {
        ...(state.routePlan || {}),
        selected: state.sharedDraft?.items?.length ? getSharedDraftPois() : selectedPois,
        totalDistanceLabel: state.sharedDraft?.items?.length ? `协同调整中 · 第 ${state.sharedDraft.version} 版` : (state.routePlan?.totalDistanceLabel || '规划中…'),
      };
      state.selectedIds = state.routePlan.selected.map((poi) => poi.id);
      state.manualRouteOrder = false;
      state.screen = '12';
      render();

      if (window.RoomApi && state.roomCode) {
        return;
      }

      const plannedRoute = await planRoute({
        origin: await ensureOrigin(),
        selectedIds: selectedPois.map((p) => p.id),
        selectedPois,           // 把完整对象传给后端，AI 只在这些里排序
        prefs: state.selectedPrefs,
        members: state.currentMembers,
        respectOrder: false,
      });

      // 若 AI 返回空（异常），保留用户已选顺序
      if (plannedRoute?.selected?.length) {
        state.routePlan = plannedRoute;
        state.selectedIds = plannedRoute.selected.map((poi) => poi.id);
        render();
      }
    } catch (e) {
      showToast('AI 排序失败，已保留当前顺序');
    } finally {
      el.nextStep.disabled = false;
      el.nextStep.textContent = '下一步 →';
    }
  });

  el.back12.addEventListener('click', () => {
    if (isSharedDraftMode() && !canEditSharedDraft()) {
      showToast('你已确认当前版本，请等待新变更后再编辑');
      return;
    }
    if (state.roomCode && state.sharedDraft) {
      syncPreviewSelectionFromSharedDraft();
    }
    state.screen = '11';
    render();
  });

  el.back11.addEventListener('click', () => {
    state.screen = '10';
    render();
  });

  el.addMore.addEventListener('click', () => {
    if (isSharedDraftMode() && !canEditSharedDraft()) {
      showToast('你已确认当前版本，请等待新变更后再编辑');
      return;
    }
    if (state.roomCode && state.sharedDraft) {
      syncPreviewSelectionFromSharedDraft();
    }
    state.screen = '11';
    render();
    showToast('可继续挑选更多店铺');
  });

  el.confirmRoute.addEventListener('click', async () => {
    if (state.roomCode && state.sharedDraft && !state.sharedDraft.isFinalized) {
      try {
        const response = await window.RoomApi.confirmDraft();
        applySharedDraftState(response.draft);
        if (response.allConfirmed) {
          startTripFromRoute(getSharedDraftPois());
        } else {
          render();
          showToast('你已确认当前版本');
        }
      } catch (error) {
        showToast('确认失败，请稍后重试');
      }
      return;
    }
    // 直接用当前排好的路线出发，不重新调 AI
    const currentRoute = state.routePlan?.selected?.length
      ? state.routePlan.selected
      : state.selectedIds.map((id) => state.previewPoiPool?.find((p) => p.id === id) || getPoiById(id)).filter(Boolean);
    startTripFromRoute(currentRoute);
  });

  if (el.startLiveTrip) {
    el.startLiveTrip.addEventListener('click', () => {
      const stops = getLiveStops();
      if (!stops.length) {
        showToast('请先确认至少一个行程点位');
        return;
      }
      state.tripExecutionStarted = true;
      state.activeStopIndex = Math.min(state.activeStopIndex, Math.max(0, stops.length - 1));
      renderItinerary();
      showToast('行程已开始，正在展示当前站');
    });
  }

  el.back13.addEventListener('click', () => {
    state.screen = '12';
    render();
  });

  el.openAlbum.addEventListener('click', () => {
    const tripId = state.roomCode || state.currentTripId || 'trip001';
    window.location.href = `journal/frontend/album/album.html?tripId=${tripId}&userName=${encodeURIComponent(state.myName || '我')}`;
  });

  el.openCommentPanel.addEventListener('click', () => {
    state.screen = '15';
    render();
  });

  el.endTrip.addEventListener('click', () => {
    state.showEndDialog = true;
    state.endTripChoice = 'notebook';
    render();
  });

  el.back14.addEventListener('click', () => {
    state.screen = '13';
    render();
  });

  el.back15.addEventListener('click', () => {
    state.screen = '13';
    render();
  });

  el.back18.addEventListener('click', () => {
    state.screen = '04';
    render();
  });

  el.generateNotebook.addEventListener('click', () => {
    state.endTripChoice = 'notebook';
    renderEndTripDialog();
  });

  el.skipNotebook.addEventListener('click', () => {
    state.endTripChoice = 'finish';
    renderEndTripDialog();
  });

  el.confirmEndTrip.addEventListener('click', confirmEndTrip);
  el.cancelEndTrip.addEventListener('click', closeEndTripDialog);
  el.endTripDialog.addEventListener('click', (event) => {
    if (event.target === el.endTripDialog) closeEndTripDialog();
  });
  el.homeHistorySeeAll.addEventListener('click', () => {
    state.homeHistoryExpanded = !state.homeHistoryExpanded;
    renderHistory();
  });

  el.shareNotebook.addEventListener('click', () => shareNotebook());
  el.saveNotebook.addEventListener('click', () => saveNotebookImage());
  el.notebookHome.addEventListener('click', () => {
    state.screen = '04';
    render();
  });
  el.closeMedia.addEventListener('click', () => {
    state.screen = '18';
    render();
  });
  el.mediaPrev.addEventListener('click', () => {
    stepMedia(-1);
  });
  el.mediaNext.addEventListener('click', () => {
    stepMedia(1);
  });

  el.albumPickCard.addEventListener('click', () => el.albumFileInput.click());
  el.albumPickBottom.addEventListener('click', () => el.albumFileInput.click());
  el.albumCameraCard.addEventListener('click', () => openCameraUpload());
  el.albumCameraBottom.addEventListener('click', () => openCameraUpload());
  el.albumFileInput.addEventListener('change', () => handleAlbumFiles(el.albumFileInput.files, '相册'));
  el.albumCameraInput.addEventListener('change', () => handleAlbumFiles(el.albumCameraInput.files, '拍照'));

  el.publishComment.addEventListener('click', () => publishComment());
  el.screen15.addEventListener('click', (event) => {
    const path = event.composedPath();
    const sheet = document.querySelector('.comment-sheet');
    if (path.includes(sheet) || path.includes(el.back15)) return;
    closeCommentPanel();
  });

  bindPreferenceInputs();
  bindSearchInput();
}

async function refreshRecommendations() {
  state.selectedPrefs.mode = state.activeFilter;
  return requestRecommendationsForMode(state.activeFilter);
}

async function requestRecommendationsForMode(mode = state.activeFilter) {
  const signature = getRecommendationCacheSignature(mode);
  const cached = state.recommendationCache[mode];
  if (cached && cached.signature === signature) {
    state.activeFilter = mode;
    state.recommendations = cached.data;
    state.previewIds = cached.data.slice(0, 3).map((poi) => poi.id);
    syncPreviewPoolFromRecommendations();
    if (state.screen === '11') renderRecommendations();
    return cached.data;
  }
  state.recommendationRequestId += 1;
  const requestId = state.recommendationRequestId;
  state.recommendationLoading = true;
  if (state.screen === '11') renderRecommendations();
  try {
    const origin = await ensureOrigin();
    const recommendations = await getPoiRecommendations({
      center: origin,
      prefs: {
        ...state.selectedPrefs,
        mode,
      },
      members: state.currentMembers,
    });
    if (requestId !== state.recommendationRequestId) {
      return null;
    }
    state.activeFilter = mode;
    state.recommendations = recommendations;
    state.previewIds = recommendations.slice(0, 3).map((poi) => poi.id);
    syncPreviewPoolFromRecommendations();
    state.recommendationCache[mode] = {
      signature,
      data: recommendations,
    };
    return recommendations;
  } finally {
    if (requestId === state.recommendationRequestId) {
      state.recommendationLoading = false;
    }
  }
}

async function resolveSearchCenter() {
  const memberCenter = getMembersCenter();
  if (memberCenter) return memberCenter;
  return ensureOrigin();
}

async function applyPoiSelection(poiId, { respectOrder = false, toast = true } = {}) {
  if (isSharedDraftMode() && !canEditSharedDraft()) {
    showToast('你已确认当前版本，请等待新变更后再编辑');
    return;
  }
  // 从 pool 或 mock 里找 POI 对象
  const poi = state.previewPoiPool?.find((p) => p.id === poiId)
    || state.searchResults?.find((p) => p.id === poiId)
    || getPoiById(poiId);
  const wasSelected = state.selectedIds.includes(poiId);
  toggleSelection(poiId);
  state.manualRouteOrder = respectOrder;

  // 本地直接更新 routePlan.selected，不再重新调 AI
  if (!wasSelected && poi) {
    // 添加
    const current = state.routePlan?.selected || [];
    if (!current.find((p) => p.id === poiId)) {
      state.routePlan = { ...state.routePlan, selected: [...current, poi], totalDistanceLabel: '已调整' };
    }
    // 新 POI 也存入 pool
    if (state.previewPoiPool && !state.previewPoiPool.find((p) => p.id === poiId)) {
      state.previewPoiPool.push(poi);
    }
  } else {
    // 移除
    if (state.routePlan?.selected) {
      state.routePlan.selected = state.routePlan.selected.filter((p) => p.id !== poiId);
      state.routePlan.totalDistanceLabel = state.routePlan.selected.length ? '已调整' : '待选';
    }
  }
  state.selectedIds = (state.routePlan?.selected || []).map((p) => p.id);
  if (isSharedDraftMode()) {
    await syncSharedDraft(state.routePlan?.selected || []);
  }
  renderRecommendations();
  renderRoute();
  drawMaps();
  if (toast && poi) {
    showToast(wasSelected ? `已移除 ${poi.name}` : `已添加 ${poi.name}`);
  }
}

async function handleMapPoiClick(poi) {
  if (state.screen === '11') {
    await togglePreviewPoiSelection(poi.id);
    return;
  }
  await applyPoiSelection(poi.id, { respectOrder: false });
}

async function togglePreviewPoiSelection(poiId) {
  // screen11 仅更新勾选状态，不调 AI——等「下一步」时才规划路线
  const set = new Set(state.previewSelectedIds);
  if (set.has(poiId)) set.delete(poiId);
  else set.add(poiId);
  state.previewSelectedIds = [...set];

  // 从跨 tab 的 pool 里查找已选 POI（不依赖当前 tab 的 recommendations）
  const selectedPois = state.previewSelectedIds
    .map((id) => state.previewPoiPool.find((p) => p.id === id) || getPoiById(id))
    .filter(Boolean);
  state.routePlan = {
    selected: selectedPois,
    totalDistanceLabel: selectedPois.length ? '已选 ' + selectedPois.length + ' 个' : '待选',
  };
  state.manualRouteOrder = false;
  renderRecommendations();
  drawMaps();
}

async function togglePreviewBundleSelection(bundleId) {
  const bundle = state.recommendations.find((item) => item.id === bundleId && isAiBundleRecommendation(item));
  if (!bundle) return;
  bundle.bundleItems.forEach((poi) => {
    if (!state.previewPoiPool.find((item) => item.id === poi.id)) state.previewPoiPool.push(poi);
  });
  const bundleIds = bundle.bundleItems.map((poi) => poi.id);
  const selectedSet = new Set(state.previewSelectedIds);
  const isFullySelected = bundleIds.every((id) => selectedSet.has(id));
  if (isFullySelected) {
    bundleIds.forEach((id) => selectedSet.delete(id));
  } else {
    bundleIds.forEach((id) => selectedSet.add(id));
  }
  state.previewSelectedIds = [...selectedSet];
  const selectedPois = state.previewSelectedIds
    .map((id) => state.previewPoiPool.find((poi) => poi.id === id) || getPoiById(id))
    .filter(Boolean);
  state.routePlan = {
    ...(state.routePlan || {}),
    selected: selectedPois,
    totalDistanceLabel: selectedPois.length ? `已选 ${selectedPois.length} 个` : '待选',
    aiReason: bundle.aiReason || '',
  };
  state.manualRouteOrder = false;
  renderRecommendations();
  drawMaps();
}

function toggleSelectAllRecommendations() {
  const allPois = getComprehensiveBundlePois();
  if (!allPois.length) return;
  const allIds = allPois.map((poi) => poi.id);
  const isFullySelected = allIds.every((id) => state.previewSelectedIds.includes(id));
  state.previewSelectedIds = isFullySelected ? [] : allIds;
  state.routePlan = {
    ...(state.routePlan || {}),
    selected: isFullySelected ? [] : allPois,
    totalDistanceLabel: isFullySelected ? '待选' : `已选 ${allPois.length} 个`,
  };
  state.manualRouteOrder = false;
  renderRecommendations();
  drawMaps();
}

function render() {
  state.routePlan = state.routePlan || { selected: [] };
  el.screen04.classList.toggle('hidden', state.screen !== '04');
  el.screen05.classList.toggle('hidden', state.screen !== '05');
  // screen05 内部面板：根据 roomMode 显示创建或加入
  if (el.roomPanelCreate) el.roomPanelCreate.classList.toggle('hidden', state.roomMode !== 'create');
  if (el.roomPanelJoin)   el.roomPanelJoin.classList.toggle('hidden',   state.roomMode !== 'join');
  el.screen06.classList.toggle('hidden', state.screen !== '06');
  el.screen07.classList.toggle('hidden', state.screen !== '07');
  el.screen08.classList.toggle('hidden', state.screen !== '08');
  el.screen09.classList.toggle('hidden', state.screen !== '09');
  el.screen10.classList.toggle('hidden', state.screen !== '10');
  el.screen11.classList.toggle('hidden', state.screen !== '11');
  el.screen12.classList.toggle('hidden', state.screen !== '12');
  el.screen13.classList.toggle('hidden', state.screen !== '13');
  el.screen14.classList.toggle('hidden', state.screen !== '14');
  el.screen15.classList.toggle('hidden', state.screen !== '15');
  el.screen18.classList.toggle('hidden', state.screen !== '18');
  el.screen19.classList.toggle('hidden', state.screen !== '19');

  // 更新 screen07 上的房间码展示
  if (el.shareCode && state.roomCode) {
    el.shareCode.innerHTML = `<span>#</span> 房间码 ${state.roomCode}`;
  }
  // 更新 screen09 顶栏房间号 badge
  if (el.roomCodeBadge) {
    el.roomCodeBadge.textContent = state.roomCode ? `# ${state.roomCode}` : '';
  }

  renderSummaryMapPins();
  renderSummaryProgress();
  renderLoadingSummary();
  renderPreferences();
  renderMembers();
  renderLoadingDots();
  renderFilters();
  renderSearch();
  renderRecommendations();
  renderRoute();
  renderItinerary();
  renderAlbum();
  renderCommentTargets();
  renderEndTripDialog();
  renderNotebook();
  renderMediaViewer();
  renderHistory();
  drawMaps();
  if (state.screen === '13' || state.screen === '15') {
    syncLiveMapViewport();
  }
  if (typeof window !== 'undefined') {
    window.__mtVibeTestState = state;
    window.__mtVibeRender = render;
  }
}

function getStopComment(stopId) {
  return state.storeComments[stopId]?.at(-1) || '';
}

function getLiveStopComments(stop) {
  const existing = state.storeComments[stop.id] || [];
  if (existing.length) return existing.slice(-3).reverse();
  const seeds = [
    `${getShortStopName(stop.name)} 口碑稳定，适合按当前节奏落脚。`,
    stop.tags ? `${stop.tags.split(' · ')[0]} 的反馈比较集中，适合当前行程氛围。` : '当前站反馈偏正向，适合继续推进行程。',
    stop.price ? `${stop.price}，评论里提到性价比和顺路程度都不错。` : '这站的评论重点在顺路和体验稳定。',
  ];
  return seeds.slice(0, 2);
}

function getActiveLiveStopIndex(stops = getLiveStops()) {
  if (!stops.length) return 0;
  return Math.max(0, Math.min(state.activeStopIndex, stops.length - 1));
}

function getLiveStops() {
  const routeStops = state.routePlan?.selected?.length
    ? state.routePlan.selected
    : state.selectedIds.map((id) => getPoiById(id)).filter(Boolean);
  if (!routeStops.length) return [];
  return routeStops.map((poi, index) => normalizeLiveStop(poi, index));
}

// 根据 POI 类别推算色调
function poiTone(poi) {
  if (poi.mood) return poi.mood;
  const sub = poi.subCategory || poi.category || '';
  if (['火锅', '烧烤', '川湘菜'].includes(sub)) return 'peach';
  if (['咖啡', '粤菜', '日料'].includes(sub)) return 'mint';
  if (['甜品', '美甲美睫'].includes(sub)) return 'pink';
  if (['剧本杀', '密室逃脱', '电竞'].includes(sub)) return 'blue';
  return 'yellow';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPoiVisual(poi, { className = 'poi-icon', fallbackText, badgeText, showBadge = false } = {}) {
  const mood = poi.mood || poiTone(poi);
  const label = badgeText || poi.subCategory || poi.category || fallbackText || '地点';
  const alt = escapeHtml(`${poi.name} 图片`);
  if (poi.photoUrl) {
    const safeUrl = escapeHtml(poi.photoUrl);
    return `
      <div class="${className} ${className}--image ${mood}">
        <img src="${safeUrl}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" />
        ${showBadge && label ? `<span>${escapeHtml(label)}</span>` : ''}
      </div>
    `;
  }
  return `<div class="${className} ${mood}">${escapeHtml(fallbackText || label)}</div>`;
}

function normalizeLiveStop(poi, index) {
  // 月销量：优先用后端字段，否则按评分推算
  const sales = poi.monthlySales
    ? `月售 ${poi.monthlySales}+`
    : `月售 ${Math.max(300, Math.round(poi.rating * 420))}+`;
  // 评价数：优先用后端字段，否则按评分推算
  const reviewBase = poi.reviewCount ?? Math.round(poi.rating * 50 + (poi.price || 0) / 2);
  return {
    id: poi.id,
    number: index + 1,
    name: poi.name,
    tone: poiTone(poi),
    meta: `${poi.rating?.toFixed(1) ?? '—'}分 · ¥${poi.price}/人${poi.distanceLabel ? ` · 距离${poi.distanceLabel}` : ''}`,
    tags: poi.tags?.length ? poi.tags.join(' · ') : (poi.subCategory || poi.category || ''),
    sales,
    reviewBase,
    price: `人均 ¥${poi.price}`,
    salesLine: `${sales} · 评价 ${reviewBase} 条 · 人均 ¥${poi.price}`,
    latest: '',
    lat: poi.lat,
    lng: poi.lng,
    photoUrl: poi.photoUrl || '',
  };
}

function renderItinerary() {
  const stops = getLiveStops();
  const activeIndex = getActiveLiveStopIndex(stops);
  const currentStop = stops[activeIndex] || null;
  const html = stops.length
    ? state.tripExecutionStarted
      ? renderCurrentLiveStop(currentStop, activeIndex, stops)
      : stops.map((stop, index) => renderItineraryStop(stop, index, stops.length)).join('')
    : '<div class="trip-empty">当前行程还没有点位，可返回调整页继续添加</div>';
  el.itineraryList.innerHTML = html;
  el.commentPreviewList.innerHTML = stops.length
    ? stops.map((stop, index) => renderItineraryStop(stop, index, stops.length, { compact: true })).join('')
    : '<div class="trip-empty">当前行程还没有点位，可返回调整页继续添加</div>';
  const latestBarrage = state.tripBarrage.at(-1) || '';
  el.tripBarrage.textContent = latestBarrage;
  el.tripBarragePreview.textContent = latestBarrage;
  el.tripBarrage.classList.toggle('is-active', Boolean(latestBarrage));
  el.tripBarragePreview.classList.toggle('is-active', Boolean(latestBarrage));
  renderLiveMap(stops);
  renderLiveTripTips(stops, activeIndex);

  if (el.startLiveTrip) {
    const allCompleted = stops.length > 0 && state.completedStopIds.length >= stops.length;
    el.startLiveTrip.disabled = !stops.length || state.tripExecutionStarted;
    el.startLiveTrip.textContent = allCompleted ? '行程已完成' : (state.tripExecutionStarted ? '进行中' : '开始行程');
  }

  if (el.openCommentPanel) {
    el.openCommentPanel.innerHTML = '<span>◎</span>发送弹幕';
  }

  document.querySelectorAll('[data-nav-stop]').forEach((button) => {
    button.addEventListener('click', () => {
      const stop = stops.find((item) => item.id === button.dataset.navStop);
      if (!stop) {
        showToast('正在导航');
        return;
      }
      openOptionSheet('navigation', { stopId: stop.id });
    });
  });

  document.querySelectorAll('[data-live-move-up],[data-live-move-down]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      await moveLiveStop(button.dataset.liveMoveUp || button.dataset.liveMoveDown, Boolean(button.dataset.liveMoveUp));
    });
  });

  document.querySelectorAll('[data-live-delete]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      await deleteLiveStop(button.dataset.liveDelete);
    });
  });

  document.querySelectorAll('[data-complete-stop]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      completeLiveStop(button.dataset.completeStop);
    });
  });
}

function renderLiveTripTips(stops, activeIndex) {
  const currentStop = stops[activeIndex];
  const text = stops.length
    ? state.tripExecutionStarted && currentStop
      ? `当前执行第 ${activeIndex + 1}/${stops.length} 站：${currentStop.name}`
      : `${stops.length} 个点位已串联，右侧导航从当前位置直达该店铺`
    : '当前行程还没有点位，可返回调整页继续添加';
  document.querySelectorAll('.live-trip-tip').forEach((tip) => {
    tip.innerHTML = `<span>⌖</span>${text}`;
  });
}

function renderLiveMap(stops) {
  const navigationStop = state.navigation.active
    ? stops.find((stop) => stop.id === state.navigation.stopId)
    : null;
  if (typeof AMap !== 'undefined') {
    document.querySelectorAll('.screen-13 .live-map, .screen-15 .live-map').forEach((map) => {
      map.classList.add('is-real');
    });
    const origin = state.origin || { lat: 39.905, lng: 116.391, name: '当前位置' };
    const points = stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
    }));
    const options = {
      origin,
      points,
      selectedPoints: points,
      hideUnselected: true,
      routeFromOrigin: true,
      showOriginMarker: true,
    };
    if (navigationStop && state.navigation.mode) {
      const navigationPayload = {
        origin,
        destination: {
          lat: navigationStop.lat,
          lng: navigationStop.lng,
          name: navigationStop.name,
        },
        mode: state.navigation.mode,
        stopId: navigationStop.id,
      };
      liveMap13.renderNavigation(navigationPayload);
      liveMap15.renderNavigation(navigationPayload);
      return;
    }
    liveMap13.render(options);
    liveMap15.render(options);
    return;
  }
  renderLiveMapFallback(stops);
}

function renderLiveMapFallback(stops) {
  document.querySelectorAll('.screen-13 .live-map, .screen-15 .live-map').forEach((map) => {
    map.classList.remove('is-real');
  });
  const maps = document.querySelectorAll('.screen-13 .live-map, .screen-15 .live-map');
  maps.forEach((map) => {
    const fallback = map.querySelector('.live-map-fallback') || map;
    const polyline = fallback.querySelector('.route-line polyline');
    const mePin = fallback.querySelector('.map-pin--me');
    const pins = [...fallback.querySelectorAll('[data-live-pin]')];
    const geometry = projectLiveMap(stops);

    if (polyline) polyline.setAttribute('points', geometry.points);

    if (mePin) {
      positionMapPin(mePin, geometry.originPoint, 24);
      mePin.classList.toggle('is-hidden', state.tripStarted && !stops.length);
    }

    pins.forEach((pin, index) => {
      const point = geometry.stopPoints[index];
      if (!point) {
        pin.classList.add('is-hidden');
        return;
      }
      pin.classList.remove('is-hidden');
      positionMapPin(pin, point, 30);
    });
  });
}

function projectLiveMap(stops) {
  const mapWidth = 340;
  const mapHeight = 150;
  const padX = 28;
  const padY = 18;
  const origin = state.origin && Number.isFinite(state.origin.lat) && Number.isFinite(state.origin.lng)
    ? state.origin
    : { lat: 39.905, lng: 116.391 };
  const points = [origin, ...stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))];

  if (!points.length || (!state.tripStarted && !stops.length)) {
    return {
      originPoint: { x: 44, y: 118 },
      stopPoints: [],
      points: '40,130 65,117 187,91 289,72 310,134',
    };
  }

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes) - 0.0008;
  const maxLat = Math.max(...latitudes) + 0.0008;
  const minLng = Math.min(...longitudes) - 0.0008;
  const maxLng = Math.max(...longitudes) + 0.0008;
  const spanLat = Math.max(maxLat - minLat, 0.0001);
  const spanLng = Math.max(maxLng - minLng, 0.0001);

  const project = (point) => {
    const x = padX + ((point.lng - minLng) / spanLng) * (mapWidth - padX * 2);
    const y = mapHeight - padY - ((point.lat - minLat) / spanLat) * (mapHeight - padY * 2);
    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
    };
  };

  const projected = points.map(project);
  return {
    originPoint: projected[0],
    stopPoints: projected.slice(1),
    points: projected.map((point) => `${point.x},${point.y}`).join(' '),
  };
}

function positionMapPin(pin, point, size) {
  pin.style.left = `${(point.x - size / 2).toFixed(1)}px`;
  pin.style.top = `${(point.y - size / 2).toFixed(1)}px`;
}

function renderItineraryStop(stop, index, total, { compact = false } = {}) {
  const count = state.storeComments[stop.id]?.length || 0;
  const reviewCount = stop.reviewBase + count;
  const salesLine = `${stop.sales} · 评价 ${reviewCount} 条 · ${stop.price}`;
  const latestComment = getStopComment(stop.id);
  const done = state.completedStopIds.includes(stop.id);
  return `
    <article class="trip-stop ${compact ? 'trip-stop--compact' : ''} ${done ? 'is-completed' : ''}">
      <div class="stop-number">${stop.number}</div>
      ${renderPoiVisual(stop, { className: 'stop-photo', fallbackText: '图片', badgeText: stop.tags.split(' · ')[0] || '推荐' })}
      <div class="stop-info">
        <h3>${stop.name}</h3>
        <p class="stop-feature poi-meta">${salesLine}</p>
        <p class="stop-stats poi-tags">${stop.tags}</p>
        ${latestComment ? `<p class="stop-latest-comment">💬 ${latestComment}</p>` : ''}
      </div>
      <div class="live-stop-actions ${compact ? 'is-hidden' : ''}">
        <button class="nav-chip" data-nav-stop="${stop.id}" type="button"><span>⌖</span>导航</button>
        <div class="live-edit-actions">
          <button class="live-edit-btn" data-live-move-up="${stop.id}" ${index === 0 ? 'disabled' : ''} type="button">↑</button>
          <button class="live-edit-btn" data-live-move-down="${stop.id}" ${index === total - 1 ? 'disabled' : ''} type="button">↓</button>
          <button class="live-edit-btn live-edit-btn--delete" data-live-delete="${stop.id}" type="button">×</button>
        </div>
      </div>
    </article>
  `;
}

function renderCurrentLiveStop(stop, index, stops) {
  if (!stop) {
    return `<div class="trip-empty">当前行程已全部完成，可直接结束并生成手帐</div>`;
  }
  const comments = getLiveStopComments(stop);
  const reviewCount = stop.reviewBase + (state.storeComments[stop.id]?.length || 0);
  const nextStop = stops[index + 1];
  const navigationSummary = getNavigationSummaryForStop(stop);
  return `
    <article class="trip-stop trip-stop--focus" data-active-stop="${stop.id}">
      <div class="trip-stop-focus-head">
        <span class="focus-stage">当前行程</span>
        <span class="focus-progress">第 ${index + 1}/${stops.length} 站</span>
      </div>
      <div class="trip-stop-focus-main">
        ${renderPoiVisual(stop, { className: 'stop-photo stop-photo--focus', fallbackText: '图片', badgeText: stop.tags.split(' · ')[0] || '推荐', showBadge: true })}
        <div class="stop-info stop-info--focus">
          <h3>${stop.name}</h3>
          <p class="stop-feature poi-meta">${stop.meta}</p>
          <p class="stop-stats poi-tags">${stop.tags}</p>
          <div class="focus-stats">
            <span>评论 ${reviewCount} 条</span>
            <span>${stop.sales}</span>
          </div>
        </div>
      </div>
      <div class="focus-comments">
        <strong>当前站评论</strong>
        ${comments.map((comment) => `<p>• ${escapeHtml(comment)}</p>`).join('')}
      </div>
      ${navigationSummary ? `
        <div class="navigation-summary">
          <strong>${navigationSummary.modeLabel}导航中</strong>
          <div class="navigation-summary-pills">
            ${navigationSummary.distanceText ? `<span>${navigationSummary.distanceText}</span>` : ''}
            ${navigationSummary.durationText ? `<span>${navigationSummary.durationText}</span>` : ''}
            ${navigationSummary.costText ? `<span>${navigationSummary.costText}</span>` : ''}
          </div>
          ${navigationSummary.detailText ? `<p>${escapeHtml(navigationSummary.detailText)}</p>` : ''}
        </div>
      ` : ''}
      <div class="trip-upnext trip-upnext--focus">
        <strong>后续站点</strong>
        <div class="trip-upnext-list">
          ${stops.map((item, itemIndex) => `
            <span class="trip-upnext-pill ${itemIndex === index ? 'is-active' : ''} ${state.completedStopIds.includes(item.id) ? 'is-done' : ''}">${itemIndex + 1}. ${escapeHtml(getShortStopName(item.name))}</span>
          `).join('')}
        </div>
      </div>
      <div class="focus-next-hint">${nextStop ? `完成后将自动切换到下一站：${escapeHtml(nextStop.name)}` : '这是最后一站，完成后可直接结束行程'}</div>
      <div class="focus-actions">
        <button class="nav-chip nav-chip--wide" data-nav-stop="${stop.id}" type="button"><span>⌖</span>导航前往</button>
        <button class="primary-btn trip-complete-btn" data-complete-stop="${stop.id}" type="button">行程完成</button>
      </div>
    </article>
  `;
}

async function moveLiveStop(id, isUp) {
  const currentIndex = state.selectedIds.indexOf(id);
  if (currentIndex < 0) return;
  const next = state.selectedIds.slice();
  const targetIndex = isUp ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return;
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  state.selectedIds = next;
  state.manualRouteOrder = true;
  state.routePlan = await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: true });
  renderItinerary();
  renderRoute();
  drawMaps();
  showToast('行程顺序已调整');
}

async function deleteLiveStop(id) {
  const stop = getLiveStops().find((item) => item.id === id);
  state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
  state.previewSelectedIds = state.previewSelectedIds.filter((selectedId) => selectedId !== id);
  state.completedStopIds = state.completedStopIds.filter((completedId) => completedId !== id);
  if (state.navigation.stopId === id) resetNavigationState();
  state.manualRouteOrder = true;
  state.routePlan = state.selectedIds.length
    ? await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: true })
    : { selected: [], totalDistanceLabel: '待选' };
  state.activeStopIndex = Math.max(0, Math.min(state.activeStopIndex, state.selectedIds.length - 1));
  renderItinerary();
  renderRoute();
  renderRecommendations();
  drawMaps();
  showToast(stop ? `已删除 ${stop.name}` : '已删除点位');
}

function completeLiveStop(stopId) {
  const stops = getLiveStops();
  const currentIndex = getActiveLiveStopIndex(stops);
  const currentStop = stops[currentIndex];
  if (!currentStop || currentStop.id !== stopId) return;
  if (state.navigation.stopId === stopId) resetNavigationState();
  if (!state.completedStopIds.includes(stopId)) {
    state.completedStopIds.push(stopId);
  }
  if (currentIndex < stops.length - 1) {
    state.activeStopIndex = currentIndex + 1;
    renderItinerary();
    showToast(`已完成 ${currentStop.name}，切换到下一站`);
    return;
  }
  renderItinerary();
  showToast('全部行程已完成，可结束并生成手帐');
}

function renderAlbum() {
  el.albumCount.textContent = `${state.albumPhotos.length}张`;
  if (!state.albumPhotos.length) {
    el.photoGrid.innerHTML = '<div class="empty-state">还没有照片，上传后会显示在这里</div>';
    return;
  }
  el.photoGrid.innerHTML = state.albumPhotos.map((photo) => `
    <article class="photo-card photo-card--${photo.tone}" ${photo.url ? `style="background-image: linear-gradient(180deg, rgba(255,255,255,.38), rgba(255,255,255,.76)), url('${photo.url}')"` : ''}>
      <div class="photo-card-top">
        <span>${photo.badge}</span>
        <button class="photo-like ${state.likedPhotoIds.has(photo.id) ? 'is-liked' : ''}" data-photo-like="${photo.id}" type="button" aria-label="点赞照片">${state.likedPhotoIds.has(photo.id) ? '♥' : '♡'}</button>
      </div>
      <div>
        <h3>${photo.title}</h3>
        <p>${formatPhotoMeta(photo)}</p>
      </div>
    </article>
  `).join('');

  el.photoGrid.querySelectorAll('[data-photo-like]').forEach((button) => {
    button.addEventListener('click', () => togglePhotoLike(button.dataset.photoLike));
  });
}

function formatPhotoMeta(photo) {
  const likes = photo.likes || 0;
  return `${photo.meta} · ${likes} 赞`;
}

function togglePhotoLike(photoId) {
  const photo = state.albumPhotos.find((item) => item.id === photoId);
  if (!photo) return;
  if (state.likedPhotoIds.has(photoId)) {
    state.likedPhotoIds.delete(photoId);
    photo.likes = Math.max(0, (photo.likes || 0) - 1);
  } else {
    state.likedPhotoIds.add(photoId);
    photo.likes = (photo.likes || 0) + 1;
  }
  renderAlbum();
}

function openCameraUpload() {
  el.albumCameraInput.click();
  showToast('正在唤起相机');
}

function handleAlbumFiles(files, source) {
  const list = Array.from(files || []);
  if (!list.length) return;
  const next = list.map((file, index) => ({
    id: `local-${Date.now()}-${index}`,
    title: source === '拍照' ? '现场新拍照片' : file.name.replace(/\.[^.]+$/, '').slice(0, 12) || '新上传照片',
    meta: `我 · 刚刚 · ${source}`,
    likes: 0,
    tone: index % 2 ? 'mint' : 'peach',
    badge: '新',
    url: URL.createObjectURL(file),
  }));
  state.albumPhotos = [...next, ...state.albumPhotos];
  el.albumFileInput.value = '';
  el.albumCameraInput.value = '';
  renderAlbum();
  showToast(`已上传 ${list.length} 张照片`);
}

function renderCommentTargets() {
  const barrageOnlyMode = true;
  state.commentTarget = 'trip';

  if (el.commentSheetTitle) {
    el.commentSheetTitle.textContent = barrageOnlyMode ? '发送弹幕' : '发表评论';
    el.commentSheetTitle.classList.toggle('hidden', barrageOnlyMode);
  }
  if (el.publishComment) {
    el.publishComment.textContent = barrageOnlyMode ? '➤ 发送弹幕' : '➤ 发布评论';
  }
  if (el.commentInput) {
    el.commentInput.placeholder = barrageOnlyMode
      ? '写一句实时弹幕，发送后会展示在地图上'
      : '写一句评论，选择店铺会进入商户评论；不选店铺则发到行程弹幕';
  }
  if (el.commentInputHint) {
    el.commentInputHint.textContent = barrageOnlyMode
      ? '发送后会覆盖地图上的当前行程弹幕'
      : '选择店铺后，评论会进入对应商户评论区';
    el.commentInputHint.classList.toggle('hidden', barrageOnlyMode);
  }
  if (el.commentSheet) {
    el.commentSheet.classList.toggle('comment-sheet--barrage', barrageOnlyMode);
  }
  if (el.commentTargets) {
    el.commentTargets.classList.toggle('hidden', barrageOnlyMode);
  }
  if (el.commentDestination) {
    el.commentDestination.classList.toggle('hidden', barrageOnlyMode);
  }

  if (barrageOnlyMode) {
    return;
  }

  if (!el.commentTargets || !el.commentDestination) {
    return;
  }

  const liveStops = getLiveStops();
  const validTargets = new Set(['trip', ...liveStops.map((stop) => stop.id)]);
  if (!validTargets.has(state.commentTarget)) state.commentTarget = 'trip';

  el.commentTargets.innerHTML = [
    '<button class="comment-target" data-comment-target="trip" type="button"><span>◎</span>行程弹幕</button>',
    ...liveStops.map((stop) => `<button class="comment-target" data-comment-target="${stop.id}" type="button"><span>⌂</span>${getShortStopName(stop.name)}</button>`),
  ].join('');

  el.commentTargets.querySelectorAll('[data-comment-target]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.commentTarget === state.commentTarget);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      state.commentTarget = button.dataset.commentTarget;
      renderCommentTargets();
      el.commentInput.focus();
    });
  });
  const targetStop = liveStops.find((stop) => stop.id === state.commentTarget);
  const label = {
    trip: '行程弹幕，会在地图上滚动展示',
  }[state.commentTarget] || `${targetStop?.name || '店铺'}，进入对应商户评论区`;
  el.commentDestination.innerHTML = `<span>↪</span>当前发布到：${label}`;
}

function getShortStopName(name) {
  return name
    .replace(/\s+/g, '')
    .replace(/西单店|工坊|小馆|茶餐厅|咖啡|火锅|美甲美睫|密室逃脱|剧本社|电竞馆|烧烤屋/g, (match) => match.includes('店') ? '店' : match)
    .slice(0, 4);
}

const NAVIGATION_MODES = [
  { mode: 'walking', label: '步行' },
  { mode: 'transit', label: '公共交通' },
  { mode: 'taxi', label: '打车' },
  { mode: 'driving', label: '驾车' },
];

function getNavigationModeLabel(mode) {
  return NAVIGATION_MODES.find((item) => item.mode === mode)?.label || '导航';
}

function formatNavigationDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)}km`;
  return `${Math.round(meters)}m`;
}

function formatNavigationDuration(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remain = minutes % 60;
    return remain ? `${hours}小时${remain}分钟` : `${hours}小时`;
  }
  return `${minutes}分钟`;
}

function normalizeNavigationSummary(mode, raw = {}) {
  const summary = {
    mode,
    modeLabel: getNavigationModeLabel(mode),
    distanceText: formatNavigationDistance(raw.distance),
    durationText: formatNavigationDuration(raw.duration),
    costText: raw.costText || '',
    detailText: raw.detailText || '',
  };
  return summary;
}

function getNavigationSummaryForStop(stop) {
  if (!stop || !state.navigation.active || state.navigation.stopId !== stop.id) return null;
  return state.navigation.summary;
}

function resetNavigationState() {
  state.navigation = {
    active: false,
    stopId: null,
    mode: '',
    summary: null,
    status: 'idle',
  };
}

function publishComment() {
  const content = el.commentInput.value.trim();
  if (!content) {
    el.commentInput.focus();
    showToast('先写一句评论');
    return;
  }
  if (state.commentTarget === 'trip') {
    state.tripBarrage.push(`我：${content}`);
    showToast('已发布到行程弹幕');
  } else {
    state.storeComments[state.commentTarget] = state.storeComments[state.commentTarget] || [];
    state.storeComments[state.commentTarget].push(content);
    showToast('已发布到商户评论');
  }
  el.commentInput.value = '';
  state.screen = '13';
  render();
}

function closeCommentPanel() {
  state.screen = '13';
  render();
}

function closeEndTripDialog() {
  state.showEndDialog = false;
  render();
}

function confirmEndTrip() {
  if (state.endTripChoice === 'notebook') {
    state.showEndDialog = false;
    const tripId = state.roomCode || state.currentTripId || 'trip001';
    window.location.href = `journal/frontend/journal/journal.html?tripId=${tripId}`;
    return;
  }
  finishTrip({ notebookGenerated: false });
  state.showEndDialog = false;
  state.screen = '04';
  render();
  showToast('行程已结束，已加入历史行程');
}

function renderEndTripDialog() {
  if (el.endTripDialog) el.endTripDialog.classList.toggle('hidden', !state.showEndDialog);
  if (!el.endTripStats) return;
  const stops = getLiveStops();
  const commentCount = state.tripBarrage.length + Object.values(state.storeComments).reduce((sum, list) => sum + list.length, 0);
  el.endTripStats.innerHTML = [
    ['点位', `${stops.length} 个`],
    ['照片', `${state.albumPhotos.length} 张`],
    ['评论', `${commentCount} 条`],
  ].map(([label, value]) => `
    <div class="end-stat">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `).join('');
  el.generateNotebook.classList.toggle('is-selected', state.endTripChoice === 'notebook');
  el.skipNotebook.classList.toggle('is-selected', state.endTripChoice === 'finish');
  if (el.confirmEndTrip) {
    el.confirmEndTrip.textContent = state.endTripChoice === 'notebook' ? '确认生成电子手帐' : '确认直接结束';
  }
}

function formatNotebookDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = value.getMonth() + 1;
  const day = value.getDate();
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${month}月${day}日 ${weekdays[value.getDay()]} ${hours}:${minutes}`;
}

function getActiveNotebook() {
  if (state.activeTripHistoryId) {
    const trip = state.historyTrips.find((item) => item.id === state.activeTripHistoryId);
    if (trip?.notebook) return trip.notebook;
  }
  return state.notebook;
}

function generateNotebookFromTrip() {
  const stops = getLiveStops();
  const routeTitle = stops.map((stop) => getShortStopName(stop.name)).join(' → ') || '周末美食路线';
  const generatedAt = new Date();
  state.notebook = {
    id: `notebook-${Date.now()}`,
    title: '周末美食探店 AI 手帐',
    date: formatNotebookDate(generatedAt),
    generatedAt: generatedAt.toISOString(),
    routeTitle,
    stops,
    photos: state.albumPhotos.slice(0, 6),
    tripComments: state.tripBarrage.slice(-4),
    storeComments: Object.entries(state.storeComments)
      .flatMap(([storeId, list]) => list.slice(-2).map((text) => ({ storeId, text })))
      .slice(-6),
  };
  finishTrip({ notebookGenerated: true });
}

function finishTrip({ notebookGenerated }) {
  const stops = getLiveStops();
  const existingId = state.currentTripId || `trip-${Date.now()}`;
  const notebook = notebookGenerated ? state.notebook : null;
  const history = {
    id: existingId,
    title: '周末美食探店',
    subtitle: stops.map((stop) => getShortStopName(stop.name)).join(' · ') || '行程已结束',
    meta: `${stops.length} 个点位 · ${state.albumPhotos.length} 张照片`,
    notebookGenerated,
    photos: state.albumPhotos.slice(0, 3),
    notebook,
  };
  state.historyTrips = [history, ...state.historyTrips.filter((item) => item.id !== existingId)].slice(0, 5);
  state.activeTripHistoryId = existingId;
  state.tripEnded = true;
  state.tripStarted = false;
  state.tripExecutionStarted = false;
  resetNavigationState();
  state.activeStopIndex = 0;
  state.completedStopIds = [];
}

function renderNotebook() {
  if (!el.notebookCard) return;
  const notebook = getActiveNotebook();
  if (!notebook) {
    el.notebookCard.innerHTML = '<div class="notebook-empty empty-state">还没有生成 AI 手帐</div>';
    return;
  }
  el.notebookCard.className = 'notebook-card notebook-card--sheet';
  el.notebookCard.innerHTML = `
    <header class="notebook-paper-head">
      <div class="paper-stamp-row" aria-hidden="true">
        <span>美</span><span>团</span><span>记</span>
      </div>
      <div class="paper-title">
        <strong>多人探店手帐</strong>
        <em>${notebook.date}</em>
      </div>
    </header>
    <div class="notebook-layout">
      <div class="notebook-polaroid notebook-polaroid--main" id="notebook-main-photo"></div>
      <section class="notebook-hand-route">
        <h2>${notebook.routeTitle}</h2>
        <div class="notebook-route-list" id="notebook-route-list"></div>
      </section>
      <div class="notebook-media-grid" id="notebook-media-grid"></div>
      <section class="notebook-comments" id="notebook-comments"></section>
    </div>
  `;
  el.notebookRouteList = document.getElementById('notebook-route-list');
  el.notebookMediaGrid = document.getElementById('notebook-media-grid');
  el.notebookComments = document.getElementById('notebook-comments');
  const mainPhoto = notebook.photos[0];
  const mainPhotoEl = document.getElementById('notebook-main-photo');
  if (mainPhotoEl && mainPhoto?.url) {
    mainPhotoEl.style.backgroundImage = `url('${mainPhoto.url}')`;
  }
  if (mainPhotoEl) {
    mainPhotoEl.innerHTML = `<button data-open-media="0" type="button"><span>${mainPhoto?.title || '行程封面'}</span></button>`;
  }
  el.notebookRouteList.innerHTML = notebook.stops.slice(0, 3).map((stop, index) => `
    <div class="notebook-stop">
      <span>${index + 1}</span>
      <strong>${stop.name}</strong>
      <em>${getStopComment(stop.id) || stop.tags}</em>
    </div>
  `).join('');
  el.notebookMediaGrid.innerHTML = notebook.photos.slice(1, 4).map((photo, photoIndex) => {
    const index = photoIndex + 1;
    return `
    <button class="notebook-media notebook-media--${photo.tone}" data-open-media="${index}" type="button" ${photo.url ? `style="background-image: url('${photo.url}')"` : ''}>
      <strong>${photo.title}</strong>
    </button>
  `;
  }).join('');
  const comments = [
    ...notebook.tripComments.map((text) => ({ label: '行程弹幕', text })),
    ...notebook.storeComments.map((item) => ({ label: getShortStopName(getPoiById(item.storeId)?.name || '商户'), text: item.text })),
  ].slice(-6);
  el.notebookComments.innerHTML = comments.map((item) => `
    <div class="notebook-comment">
      <span>${item.label}</span>
      <p>${item.text}</p>
    </div>
  `).join('');
  el.notebookCard.querySelectorAll('[data-open-media]').forEach((button) => {
    button.addEventListener('click', () => openMediaViewer(Number(button.dataset.openMedia)));
  });
}

function renderHistory() {
  const homeLimit = state.homeHistoryExpanded ? Infinity : 2;
  if (el.homeHistoryList) el.homeHistoryList.innerHTML = renderHistoryCards({ limit: homeLimit });
  if (el.homeHistorySeeAll) {
    const shouldShow = state.historyTrips.length > 2;
    el.homeHistorySeeAll.classList.toggle('hidden', !shouldShow);
    el.homeHistorySeeAll.textContent = state.homeHistoryExpanded ? '收起' : 'See all';
  }
  document.querySelectorAll('[data-history-trip]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTripHistoryId = button.dataset.historyTrip;
      const trip = state.historyTrips.find((item) => item.id === state.activeTripHistoryId);
      if (trip?.notebook) state.screen = '18';
      else state.screen = '04';
      render();
    });
  });
}

function renderHistoryCards({ compact = false, limit = Infinity } = {}) {
  if (!state.historyTrips.length) {
    return `<div class="history-empty">${compact ? '暂无历史行程' : '结束行程后会出现在这里'}</div>`;
  }
  return state.historyTrips.slice(0, limit).map((trip) => `
    <button class="history-card ${compact ? 'history-card--compact' : ''}" data-history-trip="${trip.id}" type="button">
      <div class="history-cover">
        ${(trip.photos || []).slice(0, 2).map((photo) => `<span class="history-thumb history-thumb--${photo.tone}"></span>`).join('')}
      </div>
      <div>
        <strong>${trip.title}</strong>
        <span>${trip.subtitle}</span>
        <em>${trip.meta}</em>
      </div>
    </button>
  `).join('');
}

function openMediaViewer(index) {
  const notebook = getActiveNotebook();
  if (!notebook?.photos?.length) return;
  state.mediaViewer.index = Math.max(0, Math.min(index, notebook.photos.length - 1));
  state.screen = '19';
  renderMediaViewer();
  render();
}

function renderMediaViewer() {
  const notebook = getActiveNotebook();
  if (!el.mediaViewerContent) return;
  if (!notebook?.photos?.length) {
    el.mediaViewerContent.className = 'media-viewer-content media-viewer-content--empty';
    el.mediaViewerContent.style.backgroundImage = '';
    el.mediaViewerContent.textContent = '暂无可预览内容';
    el.mediaTitle.textContent = '媒体预览';
    el.mediaMeta.textContent = '生成手帐后可查看照片或视频';
    return;
  }
  const photo = notebook.photos[state.mediaViewer.index];
  el.mediaViewerContent.className = `media-viewer-content media-viewer-content--${photo.tone}`;
  el.mediaViewerContent.style.backgroundImage = photo.url
    ? `linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.28)), url('${photo.url}')`
    : '';
  el.mediaViewerContent.textContent = photo.mediaType === 'video' ? '视频预览' : '照片预览';
  el.mediaTitle.textContent = photo.title;
  el.mediaMeta.textContent = formatPhotoMeta(photo);
}

function stepMedia(direction) {
  const notebook = getActiveNotebook();
  if (!notebook?.photos?.length) return;
  const length = notebook.photos.length;
  state.mediaViewer.index = (state.mediaViewer.index + direction + length) % length;
  renderMediaViewer();
}

async function shareNotebook() {
  if (!getActiveNotebook()) return;
  const dataUrl = createNotebookShareImage();
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'meituan-ai-notebook.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: '我的美团电子手帐' });
      return;
    }
  } catch (error) {
    console.warn('分享图片失败，已降级为下载', error);
  }
  downloadDataUrl(dataUrl, 'meituan-ai-notebook.png');
  showToast('已生成手帐图片，可保存后分享');
}

function saveNotebookImage() {
  if (!getActiveNotebook()) return;
  downloadDataUrl(createNotebookShareImage(), 'meituan-ai-notebook.png');
  showToast('已保存手帐图片');
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function createNotebookShareImage() {
  const notebook = getActiveNotebook();
  if (!notebook) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1680;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(58, 54);
  ctx.rotate(-0.035);
  ctx.fillStyle = '#fffdf2';
  roundRect(ctx, 0, 0, 964, 1560, 18);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(148, 116);
  ['美', '团', '记'].forEach((char, index) => {
    ctx.fillStyle = '#e95712';
    roundRect(ctx, index * 142, 0, 112, 94, 4);
    ctx.fill();
    ctx.fillStyle = '#fffdf2';
    ctx.font = '900 58px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, index * 142 + 56, 50);
  });
  ctx.restore();

  ctx.fillStyle = '#111';
  ctx.font = '900 56px "PingFang SC", sans-serif';
  ctx.fillText('多人探店手帐', 604, 162);
  ctx.fillStyle = '#11a8a8';
  roundRect(ctx, 772, 132, 82, 62, 14);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = '900 46px "PingFang SC", sans-serif';
  ctx.fillText(notebook.routeTitle || '今日路线', 604, 238);

  drawPolaroid(ctx, 126, 330, 384, 330, '#ffe2d2', notebook.photos[0]?.title || '共享相册');
  drawPolaroid(ctx, 582, 885, 314, 250, '#dff4ea', notebook.photos[1]?.title || '精选照片');
  drawPolaroid(ctx, 574, 1178, 304, 238, '#fbe1ec', notebook.photos[2]?.title || '成员合照');

  ctx.save();
  ctx.translate(658, 388);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 5;
  ctx.strokeRect(-12, -36, 250, 84);
  ctx.fillStyle = '#111';
  ctx.font = '900 38px "PingFang SC", sans-serif';
  ctx.fillText('路线亮点', 26, 20);
  ctx.restore();

  notebook.stops.slice(0, 4).forEach((stop, index) => {
    const x = index < 2 ? 620 : 116;
    const y = index < 2 ? 500 + index * 176 : 840 + (index - 2) * 238;
    ctx.fillStyle = '#111';
    ctx.font = '900 34px "PingFang SC", sans-serif';
    ctx.fillText(`${index + 1}. ${getShortStopName(stop.name)}`, x, y);
    drawStars(ctx, x, y + 42, Math.max(3, 5 - (index % 2)));
    ctx.fillStyle = '#e95712';
    ctx.font = '900 34px "PingFang SC", sans-serif';
    ctx.fillText(index % 2 ? '人均 ¥88' : '推荐!', x + 4, y + 92);
    ctx.fillStyle = '#333';
    ctx.font = '700 25px "PingFang SC", sans-serif';
    wrapCanvasText(ctx, getStopComment(stop.id) || stop.tags || '今天这站很适合朋友一起去', x, y + 140, 360, 38, 2);
  });

  notebook.tripComments.slice(-2).forEach((text, index) => {
    ctx.fillStyle = '#111';
    ctx.font = '800 28px "PingFang SC", sans-serif';
    wrapCanvasText(ctx, text.replace(/^我：/, ''), 126, 1380 + index * 70, 340, 38, 2);
  });

  return canvas.toDataURL('image/png');
}

function drawPolaroid(ctx, x, y, width, height, fill, label) {
  ctx.save();
  ctx.rotate(x > 500 ? 0.035 : -0.04);
  ctx.fillStyle = '#f7f0dc';
  roundRect(ctx, x - 18, y - 18, width + 36, height + 70, 6);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, width, height, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.fillRect(x + 22, y + 22, width - 44, height - 44);
  ctx.fillStyle = '#111';
  ctx.font = '900 24px "PingFang SC", sans-serif';
  ctx.fillText(label.slice(0, 10), x + 24, y + height + 44);
  ctx.restore();
}

function drawStars(ctx, x, y, count) {
  ctx.fillStyle = '#ffb300';
  ctx.font = '900 30px sans-serif';
  for (let i = 0; i < count; i += 1) {
    ctx.fillText('★', x + i * 32, y);
  }
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const chars = String(text).split('');
  let line = '';
  let lineCount = 0;
  for (const char of chars) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = char;
      lineCount += 1;
      if (lineCount >= maxLines) return;
    } else {
      line = next;
    }
  }
  if (line && lineCount < maxLines) ctx.fillText(line, x, y + lineCount * lineHeight);
}

function renderPreferences() {
  el.foodChips.innerHTML = renderChipButtons(preferenceSets.foods, state.selectedPrefs.foods, 'foods');
  el.avoidChips.innerHTML = renderChipButtons(preferenceSets.avoid, state.selectedPrefs.avoid, 'avoid');
  el.funChips.innerHTML = renderChipButtons(preferenceSets.fun, state.selectedPrefs.fun, 'fun');

  el.locationInput.value = state.selectedPrefs.locationInput;
  el.foodInput.value = state.selectedPrefs.foodsInput;
  el.avoidInput.value = state.selectedPrefs.avoidInput;
  el.funInput.value = state.selectedPrefs.funInput;

  [el.foodChips, el.avoidChips, el.funChips].forEach((container) => {
    container.querySelectorAll('[data-chip-group]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.dataset.chipGroup;
        const value = button.dataset.chipValue;
        const list = state.selectedPrefs[group];
        const next = new Set(list);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        state.selectedPrefs[group] = [...next];
        renderPreferences();
      });
    });
  });
}

function renderChipButtons(values, selectedValues, group) {
  return values
    .map((value) => `<button class="chip-option ${selectedValues.includes(value) ? 'is-selected' : ''}" data-chip-group="${group}" data-chip-value="${value}">${value}</button>`)
    .join('');
}

function syncPreferenceModel() {
  const tokenize = (text) =>
    text
      .split(/[\s,，、/|;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const foods = [...new Set([...state.selectedPrefs.foods, ...tokenize(state.selectedPrefs.foodsInput)])];
  const avoid = [...new Set([...state.selectedPrefs.avoid, ...tokenize(state.selectedPrefs.avoidInput)])];
  const fun = [...new Set([...state.selectedPrefs.fun, ...tokenize(state.selectedPrefs.funInput)])];

  state.selectedPrefs.categories = foods;
  state.selectedPrefs.avoid = avoid;
  state.selectedPrefs.fun = fun;
}

function bindPreferenceInputs() {
  const update = (field, value) => {
    state.selectedPrefs[field] = value;
  };
  el.locationInput.addEventListener('input', () => update('locationInput', el.locationInput.value));
  el.foodInput.addEventListener('input', () => update('foodsInput', el.foodInput.value));
  el.avoidInput.addEventListener('input', () => update('avoidInput', el.avoidInput.value));
  el.funInput.addEventListener('input', () => update('funInput', el.funInput.value));
  bindManualChipInput(el.foodInput, 'foods', 'foodsInput');
  bindManualChipInput(el.avoidInput, 'avoid', 'avoidInput');
  bindManualChipInput(el.funInput, 'fun', 'funInput');
}

function bindManualChipInput(input, group, inputField) {
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    if (!preferenceSets[group].includes(value)) preferenceSets[group].push(value);
    if (!state.selectedPrefs[group].includes(value)) state.selectedPrefs[group].push(value);
    state.selectedPrefs[inputField] = '';
    input.value = '';
    renderPreferences();
  });
}

// screen09 地图卡片成员 pin（用真实成员，无成员时隐藏）
function renderSummaryMapPins() {
  if (!el.summaryMapVisual) return;
  // 清除旧 pin（保留 summary-route-line）
  el.summaryMapVisual.querySelectorAll('.summary-pin').forEach((p) => p.remove());

  const list = state.currentMembers.length ? state.currentMembers : [];
  if (!list.length) return;

  // pin 样式类循环（最多 3 种颜色）
  const pinClasses = ['summary-pin--home', 'summary-pin--food', 'summary-pin--play'];
  list.slice(0, 5).forEach((member, i) => {
    const pin = document.createElement('span');
    pin.className = `summary-pin ${pinClasses[i % pinClasses.length]}`;
    pin.textContent = member.avatar || member.nickname?.charAt(0) || '?';
    el.summaryMapVisual.prepend(pin);
  });
}

function renderSummaryProgress() {
  if (!el.summaryProgressText || !el.summaryProgressAvatars) return;

  const list = state.currentMembers;
  const submitted = list.filter((member) => member.status === 'submitted' || member.status === '已提交').length;
  const total = list.length;

  el.summaryProgressText.textContent = total ? `${submitted}/${total} 人已提交偏好` : '等待成员加入';
  el.summaryProgressAvatars.innerHTML = list.slice(0, 5).map((member, index) => {
    const tone = member.memberId
      ? (member.memberId === state.memberId ? 'black' : 'green')
      : ['black', 'green', 'orange'][index % 3];
    return `<span class="avatar-dot ${tone}"></span>`;
  }).join('');
}

function getCurrentMemberCount() {
  if (Array.isArray(state.currentMembers) && state.currentMembers.length > 0) {
    return state.currentMembers.length;
  }
  return state.memberId ? 1 : 0;
}

function renderLoadingSummary() {
  if (!el.loadingMemberSummary) return;
  const count = getCurrentMemberCount();
  el.loadingMemberSummary.textContent = count
    ? `综合 ${count} 位成员位置、预算和口味偏好`
    : '综合成员位置、预算和口味偏好';
}

function renderMembers() {
  const list = state.currentMembers;
  if (!list.length) {
    el.memberList.innerHTML = '<div class="empty-state">等待成员加入后再一起填写偏好</div>';
    return;
  }
  el.memberList.innerHTML = list
    .map((member, index) => {
      const isSelf    = member.memberId === state.memberId;
      const name      = member.nickname || '未命名成员';
      const avatarCh  = member.avatar;
      const tone      = isSelf ? 'yellow' : 'blue';
      const photo     = 'food';
      const statusRaw = member.status;
      const statusCN  = statusRaw === 'submitted' ? '已提交' : (statusRaw === '已提交' ? '已提交' : '待确认');
      const summary   = member.prefSummary || (statusCN === '已提交' ? '点击修改偏好 →' : '点击填写偏好 →');
      const tags      = [];
      const selfClass = isSelf ? ' member-card--self' : '';
      const selfAttr  = isSelf ? ' data-self="true"' : '';
      const metaStyle = isSelf && statusCN === '已提交' ? ' style="color:#28b978;font-weight:600"' : '';
      return `
        <article class="member-card member-card--status member-card--${photo}${selfClass} ${index === 0 ? 'is-owner' : ''}"${selfAttr}>
          <div class="member-photo">
            <span class="avatar ${tone}">${avatarCh}</span>
          </div>
          <div>
            <div class="member-name">${name}${isSelf ? '<em>我</em>' : (index === 0 ? '<em>房主</em>' : '')}</div>
            <div class="member-meta"${metaStyle}>${summary}</div>
            ${tags.length ? `<div class="member-pref-tags">${tags.map((t) => `<span>${t}</span>`).join('')}</div>` : ''}
          </div>
          <div class="member-tag ${statusCN === '已提交' ? 'member-tag--done' : 'member-tag--wait'}">${statusCN}</div>
        </article>`;
    })
    .join('');

  // 点击自己的名片 → 进入偏好填写页（无论是否已提交，均可修改）
  el.memberList.querySelectorAll('[data-self="true"]').forEach((card) => {
    card.addEventListener('click', () => {
      state.screen = '08';
      render();
    });
  });
}

function renderLoadingDots() {
  el.loadingDots.innerHTML = ['','', ''].map(() => '<span></span>').join('');
}

function updateViewportScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.innerWidth <= 430) {
    document.documentElement.style.setProperty('--app-scale', '1');
    updateLiveMapSize();
    return;
  }
  const scale = Math.min((window.innerWidth - 32) / 390, (window.innerHeight - 32) / 844, 1);
  document.documentElement.style.setProperty('--app-scale', String(Math.max(0.72, scale)));
  updateLiveMapSize();
}

function startLoadingSequence() {
  clearLoadingSequence();
  state.loadingTimer = setTimeout(() => {
    finishLoadingSequence();
  }, 1500);
}

async function finishLoadingSequence() {
  clearLoadingSequence();
  try {
    await refreshRecommendations();
    state.previewIds = state.recommendations.slice(0, 3).map((poi) => poi.id);
    state.previewSelectedIds = [];
    state.previewPoiPool = [];
    syncPreviewPoolFromRecommendations();
    state.routePlan = { selected: [], totalDistanceLabel: '待选' };
  } catch (error) {
    console.error('生成 AI 路线失败', error);
    state.previewIds = [];
    state.previewSelectedIds = [];
    state.previewPoiPool = [];
    state.routePlan = { selected: [], totalDistanceLabel: '待选' };
  }
  state.screen = '11';
  render();
  const reason = getRecommendationReason() || state.routePlan?.aiReason;
  if (el.aiReasonBar) {
    if (reason) {
      el.aiReasonBar.textContent = reason;
      el.aiReasonBar.classList.add('is-visible');
    } else {
      el.aiReasonBar.classList.remove('is-visible');
    }
  }
}

function clearLoadingSequence() {
  if (state.loadingTimer) clearTimeout(state.loadingTimer);
  state.loadingTimer = null;
}

function renderFilters() {
  el.filterRow.innerHTML = state.filters
    .map((filter) => `<button class="chip ${filter === state.activeFilter ? 'is-active' : ''}" data-filter="${filter}">${filter}</button>`)
    .join('');

  el.filterRow.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', async () => {
        const nextMode = button.dataset.filter;
        state.activeFilter = nextMode;
        renderFilters();
        const recommendations = await requestRecommendationsForMode(nextMode);
        if (!recommendations) return;
        // 把新 tab 的 POI 合并进总池（不清空已选）
        const poolIds = new Set(state.previewPoiPool.map((p) => p.id));
        state.recommendations.forEach((p) => { if (!poolIds.has(p.id)) state.previewPoiPool.push(p); });
        renderFilters();
        renderRecommendations();
        drawMaps();
    });
  });
}

async function renderSearch() {
  if (!el.searchResults) return;
  if (state.screen !== '12') {
    el.searchResults.classList.add('hidden');
    el.searchResults.innerHTML = '';
    return;
  }
  const query = state.searchQuery.trim();
  if (!query) {
    state.searchResults = [];
    el.searchResults.classList.add('hidden');
    el.searchResults.innerHTML = '';
  } else {
    state.searchResults = await searchPois(query, await resolveSearchCenter());
    el.searchResults.classList.remove('hidden');
    el.searchResults.innerHTML = state.searchResults.map((poi) => renderSearchItem(poi)).join('');
  }
  el.searchResults.querySelectorAll('[data-search-poi]').forEach((item) => {
    item.addEventListener('click', async () => {
      await applyPoiSelection(item.dataset.searchPoi, { respectOrder: false, toast: true });
      state.screen = '12';
      render();
    });
  });
}

function renderSearchItem(poi) {
  const selected = state.selectedIds.includes(poi.id);
  return `
    <article class="search-result ${selected ? 'is-selected' : ''}" data-search-poi="${poi.id}">
      <div>
        <div class="search-result-title">${poi.name}</div>
        <div class="search-result-meta">${poi.category} · ${poi.rating.toFixed(1)}分 · ¥${poi.price}/人 · ${poi.distanceLabel || formatDistanceApprox(poi)}</div>
      </div>
      <div class="search-result-indicator ${selected ? 'is-on' : ''}">${selected ? '✓' : ''}</div>
    </article>
  `;
}

function renderRecommendations() {
  const items = state.screen === '11'
    ? state.recommendations          // 显示当前 tab 全部结果（不限3条）
    : state.recommendations.length
      ? state.recommendations
      : [];
  if (state.screen === '11' && state.recommendationLoading && state.activeFilter === '综合最优') {
    el.recommendationList.innerHTML = `
      <article class="poi-card poi-card--bundle poi-card--loading">
        <div class="poi-icon peach">AI</div>
        <div>
          <h3 class="poi-title">方案生成中</h3>
          <div class="poi-meta">${getRecommendationLoadingCopy()}</div>
          <div class="poi-tags">正在汇总成员偏好、品类诉求和顺路程度</div>
        </div>
        <div class="select-circle">…</div>
      </article>
    `;
    el.routeDistance.textContent = '生成中';
    if (el.previewSelectedBar) el.previewSelectedBar.classList.remove('is-visible');
    if (el.aiReasonBar) el.aiReasonBar.classList.remove('is-visible');
    return;
  }
  if (!items.length) {
    el.recommendationList.innerHTML = '<div class="empty-state">暂无推荐结果，请先填写位置或稍后重试</div>';
    el.routeDistance.textContent = '待选';
    if (el.previewSelectedBar) el.previewSelectedBar.classList.remove('is-visible');
    if (el.aiReasonBar) el.aiReasonBar.classList.remove('is-visible');
    return;
  }
  el.recommendationList.innerHTML = items
    .map((poi) => {
      if (isAiBundleRecommendation(poi)) {
        const bundleIds = poi.bundleItems.map((item) => item.id);
        const checked = bundleIds.length > 0 && bundleIds.every((id) => state.previewSelectedIds.includes(id));
        const primaryPoi = poi.bundleItems[0] || poi;
        const bundleLabel = poi.tags?.[0] || '综合最优';
        const bundleRating = Number.isFinite(primaryPoi.rating) ? `${primaryPoi.rating.toFixed(1)}分` : '评分待补充';
        const bundlePrice = Number.isFinite(primaryPoi.price) ? `¥${primaryPoi.price}/人` : '价格待补充';
        const bundleMeta = `${bundleLabel} · ${bundleRating} · ${bundlePrice} · ${primaryPoi.distanceLabel || formatDistanceApprox(primaryPoi)}`;
        const bundleTags = (primaryPoi.tags || []).join(' · ') || primaryPoi.subCategory || primaryPoi.category || '';
        return `
          <article class="poi-card poi-card--bundle ${checked ? 'is-selected' : ''}" data-bundle-id="${poi.id}">
            ${renderPoiVisual({ ...primaryPoi, mood: 'peach' }, { className: 'poi-icon', fallbackText: primaryPoi.subCategory || primaryPoi.category || '地点', badgeText: bundleLabel, showBadge: true })}
            <div>
              <h3 class="poi-title">${primaryPoi.name}</h3>
              <div class="poi-meta">${bundleMeta}</div>
              <div class="poi-tags">${bundleTags}</div>
              ${poi.aiReason ? `<div class="poi-bundle-reason">${poi.aiReason}</div>` : ''}
            </div>
            <div class="select-circle ${checked ? 'is-on' : ''}">${checked ? '✓' : ''}</div>
          </article>
        `;
      }
      const checked = state.screen === '11' ? state.previewSelectedIds.includes(poi.id) : state.selectedIds.includes(poi.id);
      return `
        <article class="poi-card ${checked ? 'is-selected' : ''}" data-poi-id="${poi.id}">
          ${renderPoiVisual(poi, { className: 'poi-icon', fallbackText: poi.subCategory || '地点' })}
          <div>
            <h3 class="poi-title">${poi.name}</h3>
            <div class="poi-meta">${poi.rating.toFixed(1)}分 · ¥${poi.price}/人 · 距离${poi.distanceLabel || formatDistanceApprox(poi)}</div>
            <div class="poi-tags">${poi.tags.join(' · ')}</div>
          </div>
          <div class="select-circle ${checked ? 'is-on' : ''}">${checked ? '✓' : ''}</div>
        </article>
      `;
    })
    .join('');

  el.recommendationList.querySelectorAll('[data-poi-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      if (state.screen === '11') {
        await togglePreviewPoiSelection(card.dataset.poiId);
        return;
      }
      await applyPoiSelection(card.dataset.poiId, { respectOrder: false, toast: false });
    });
  });
  el.recommendationList.querySelectorAll('[data-bundle-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      await togglePreviewBundleSelection(card.dataset.bundleId);
    });
  });

  el.routeDistance.textContent = state.screen === '11' && !state.previewSelectedIds.length ? '待选' : (state.routePlan?.totalDistanceLabel || '3.6km');

  if (el.aiReasonBar) {
    const reason = getRecommendationReason();
    if (state.screen === '11' && state.activeFilter !== '综合最优' && reason) {
      el.aiReasonBar.textContent = reason;
      el.aiReasonBar.classList.add('is-visible');
    } else {
      el.aiReasonBar.classList.remove('is-visible');
    }
  }

  // 更新已选悬浮条
  if (state.screen === '11' && el.previewSelectedBar && el.previewSelectedNames) {
    const isComprehensive = state.activeFilter === '综合最优';
    const allBundlePois = isComprehensive ? getComprehensiveBundlePois() : [];
    const selectedPois = state.previewSelectedIds
      .map((id) => state.previewPoiPool.find((p) => p.id === id) || getPoiById(id))
      .filter(Boolean);
    if (el.selectAllRecommendations) {
      el.selectAllRecommendations.classList.toggle('is-visible', isComprehensive && allBundlePois.length > 0);
      const isFullySelected = allBundlePois.length > 0 && allBundlePois.every((poi) => state.previewSelectedIds.includes(poi.id));
      el.selectAllRecommendations.textContent = isFullySelected ? '取消全选' : '一键全选';
    }
    if (selectedPois.length) {
      el.previewSelectedNames.innerHTML = `<strong>已选 ${selectedPois.length} 个：</strong>${selectedPois.map((p) => p.name).join('、')}`;
      el.previewSelectedBar.classList.add('is-visible');
    } else if (isComprehensive && allBundlePois.length) {
      el.previewSelectedNames.innerHTML = `<strong>综合最优</strong> 可一键选中当前全部 ${allBundlePois.length} 个推荐店铺`;
      el.previewSelectedBar.classList.add('is-visible');
    } else {
      el.previewSelectedBar.classList.remove('is-visible');
    }
  } else if (el.previewSelectedBar) {
    el.previewSelectedBar.classList.remove('is-visible');
  }
}

function renderRoute() {
  const selected = isSharedDraftMode()
    ? getSharedDraftPois()
    : state.routePlan?.selected?.length
      ? state.routePlan.selected
    : state.selectedIds.map((id) => getPoiById(id) || state.previewPoiPool?.find((p) => p.id === id)).filter(Boolean);
  if (!selected.length) {
    el.routeList.innerHTML = '<div class="empty-state">还没有路线，请先选择地点</div>';
    return;
  }
  const isLocked = isSharedDraftMode() && !canEditSharedDraft();
  const confirmedCount = state.sharedDraft?.confirmedMemberIds?.length || 0;
  const memberCount = state.currentMembers.length || 1;

  el.routeList.innerHTML = selected
    .map((poi, index) => {
      const mood = poi.mood || 'yellow';
      const rating = poi.rating ? poi.rating.toFixed(1) : '—';
      const price  = poi.price ? `¥${poi.price}/人` : '价格待定';
      // 过滤掉纯地址标签（高德返回的 tags 可能是地址），只保留语义标签
      const meaningfulTags = (poi.tags || []).filter((t) => t && t.length < 15 && !/^\d|市$|区$|路\d|层$/.test(t));
      const tagsHtml = meaningfulTags.length
        ? meaningfulTags.join(' · ')
        : (poi.subCategory || poi.category || '');
      const selectedBy = isSharedDraftMode() ? getSelectedByLabel(poi.id) : '';
      // 距离信息
      const distInfo = poi.distanceLabel ? `距起点 ${poi.distanceLabel}` : '';

      return `
        <article class="poi-card route-card route-card--poi ${isLocked ? 'is-readonly' : ''}" data-route-id="${poi.id}" draggable="${isLocked ? 'false' : 'true'}">
          ${renderPoiVisual({ ...poi, mood }, { className: 'poi-icon', fallbackText: poi.subCategory || '地点' })}
          <div class="route-info route-info--poi-card">
            <h3 class="poi-title"><span class="route-order-badge">${index + 1}</span>${poi.name}</h3>
            <div class="poi-meta">${rating}分 · ${price}${distInfo ? ' · ' + distInfo : ''}</div>
            ${tagsHtml ? `<div class="poi-tags">${tagsHtml}</div>` : ''}
            ${selectedBy ? `<div class="poi-tags route-source">${selectedBy}</div>` : ''}
          </div>
          <div class="route-actions">
            <div class="drag-handle" aria-hidden="true">⋮⋮</div>
            <div class="route-action-buttons">
              <button class="route-move" data-move-up="${poi.id}" aria-label="上移" ${isLocked ? 'disabled' : ''}>↑</button>
              <button class="route-move" data-move-down="${poi.id}" aria-label="下移" ${isLocked ? 'disabled' : ''}>↓</button>
              <button class="route-delete" data-delete-route="${poi.id}" aria-label="删除 ${poi.name}" ${isLocked ? 'disabled' : ''}>×</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  if (el.confirmRoute && state.screen === '12' && state.roomCode && state.sharedDraft) {
    if (state.sharedDraft.isFinalized) {
      el.confirmRoute.textContent = `全部已确认，开始行程`;
      el.confirmRoute.disabled = selected.length === 0;
    } else if (canEditSharedDraft()) {
      el.confirmRoute.textContent = `确认行程（${confirmedCount}/${memberCount}）`;
      el.confirmRoute.disabled = selected.length === 0;
    } else {
      el.confirmRoute.textContent = `已确认，等待其他成员（${confirmedCount}/${memberCount}）`;
      el.confirmRoute.disabled = true;
    }
  }
  if (state.screen === '12') {
    if (el.addMore) el.addMore.disabled = isLocked;
    if (el.poiSearch) el.poiSearch.disabled = isLocked;
  }

  bindRouteDnD();
  bindRouteMoves();
  bindRouteDeletes();
}

function bindRouteDnD() {
  if (isSharedDraftMode() && !canEditSharedDraft()) return;
  const cards = [...el.routeList.querySelectorAll('[data-route-id]')];
  cards.forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', card.dataset.routeId);
    });
    card.addEventListener('dragover', (event) => event.preventDefault());
    card.addEventListener('drop', async (event) => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData('text/plain');
      const toId = card.dataset.routeId;
      if (!fromId || fromId === toId) return;
      const fromIndex = state.selectedIds.indexOf(fromId);
      const toIndex = state.selectedIds.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) return;
      const next = state.selectedIds.slice();
      next.splice(toIndex, 0, next.splice(fromIndex, 1)[0]);
      state.selectedIds = next;
      state.manualRouteOrder = true;
      // 本地重排 selected，不重新调 AI/高德
      if (state.routePlan?.selected?.length) {
        const pool = [...(state.previewPoiPool || []), ...(state.routePlan.selected || [])];
        state.routePlan.selected = next.map((id) => pool.find((p) => p.id === id)).filter(Boolean);
      }
      if (isSharedDraftMode()) {
        await syncSharedDraft(state.routePlan?.selected || []);
      }
      renderRoute();
      drawMaps();
      showToast('顺序已调整');
    });
  });
}

function bindRouteMoves() {
  el.routeList.querySelectorAll('[data-move-up],[data-move-down]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (isSharedDraftMode() && !canEditSharedDraft()) return;
      const id = button.dataset.moveUp || button.dataset.moveDown;
      const currentIndex = state.selectedIds.indexOf(id);
      if (currentIndex < 0) return;
      const next = state.selectedIds.slice();
      if (button.dataset.moveUp && currentIndex > 0) {
        [next[currentIndex - 1], next[currentIndex]] = [next[currentIndex], next[currentIndex - 1]];
      } else if (button.dataset.moveDown && currentIndex < next.length - 1) {
        [next[currentIndex + 1], next[currentIndex]] = [next[currentIndex], next[currentIndex + 1]];
      } else {
        return;
      }
      state.selectedIds = next;
      state.manualRouteOrder = true;
      // 本地重排，不重新调 AI
      if (state.routePlan?.selected?.length) {
        const pool = [...(state.previewPoiPool || []), ...(state.routePlan.selected || [])];
        state.routePlan.selected = next.map((id) => pool.find((p) => p.id === id)).filter(Boolean);
      }
      if (isSharedDraftMode()) {
        await syncSharedDraft(state.routePlan?.selected || []);
      }
      renderRoute();
      drawMaps();
    });
  });
}

function bindRouteDeletes() {
  el.routeList.querySelectorAll('[data-delete-route]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (isSharedDraftMode() && !canEditSharedDraft()) return;
      const id = button.dataset.deleteRoute;
      const deletedPoi = state.routePlan?.selected?.find((p) => p.id === id)
        || getPoiById(id)
        || state.previewPoiPool?.find((p) => p.id === id);
      state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
      state.previewSelectedIds = state.previewSelectedIds.filter((sid) => sid !== id);
      state.manualRouteOrder = false;
      // 本地直接移除，不重新调 AI
      if (state.routePlan?.selected) {
        state.routePlan.selected = state.routePlan.selected.filter((p) => p.id !== id);
        state.routePlan.totalDistanceLabel = state.routePlan.selected.length ? '已调整' : '待选';
      }
      if (isSharedDraftMode()) {
        await syncSharedDraft(state.routePlan?.selected || []);
      }
      renderRoute();
      renderRecommendations();
      drawMaps();
      showToast(deletedPoi ? `已删除 ${deletedPoi.name}` : '已删除点位');
    });
  });
}

function drawMaps() {
  const selectedPois = state.routePlan?.selected?.length
    ? state.routePlan.selected
    : state.selectedIds.map((id) => state.previewPoiPool?.find((p) => p.id === id) || getPoiById(id)).filter(Boolean);
  const previewPois = state.previewSelectedIds.map((id) => state.previewPoiPool?.find((p) => p.id === id) || getPoiById(id)).filter(Boolean);
  const selectedPreviewPois = state.previewSelectedIds.length && state.routePlan?.selected?.length
    ? state.routePlan.selected
    : previewPois;
  const memberCenter = getMembersCenter();
  map11.render({
    origin: memberCenter || state.origin,
    points: previewPois,
    selectedPoints: selectedPreviewPois,
    hideUnselected: false,
    showMemberRoutes: !state.previewSelectedIds.length,
    routeFromOrigin: false,
    routeLabel: state.routePlan?.totalDistanceLabel,
  });
  map12.render({
    origin: state.origin,
    points: selectedPois,
    selectedPoints: selectedPois,
    hideUnselected: true,
    routeFromOrigin: false,
    routeLabel: state.routePlan?.totalDistanceLabel,
  });
}

function toggleSelection(poiId) {
  const set = new Set(state.selectedIds);
  if (set.has(poiId)) set.delete(poiId);
  else set.add(poiId);
  state.selectedIds = [...set];
}

function bindSearchInput() {
  if (!el.poiSearch) return;
  el.poiSearch.addEventListener('input', async () => {
    state.searchQuery = el.poiSearch.value;
    await renderSearch();
  });
}

function openOptionSheet(type, context = {}) {
  const config = {
    time: {
      title: '选择出行时间',
      input: el.tripTimeInput,
      className: 'option-list option-list--picker',
    },
    route: {
      title: '选择路线偏好',
      input: el.routePrefInput,
      className: 'option-list option-list--route',
      values: [
        { label: '少走路 · 高分优先' },
        { label: '地铁直达 · 少排队' },
        { label: '预算友好 · 拍照出片' },
        { label: '甜品收尾 · 可聊天' },
      ],
    },
    navigation: {
      title: '选择导航方式',
      className: 'option-list option-list--route',
      values: NAVIGATION_MODES,
    },
  }[type];
  if (!config) return;
  el.optionSheetTitle.textContent = config.title;
  el.optionList.className = config.className;
  if (type === 'time') {
    const now = new Date();
    const date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    el.optionList.innerHTML = `
      <label class="calendar-field"><span>日期</span><input id="trip-date-picker" type="date" value="${yyyy}-${mm}-${dd}" /></label>
      <label class="calendar-field"><span>时间</span><input id="trip-clock-picker" type="time" value="14:00" /></label>
      <button class="option-confirm" id="trip-time-confirm">确认出行时间</button>
    `;
    el.optionList.querySelector('#trip-time-confirm').addEventListener('click', () => {
      const dateValue = el.optionList.querySelector('#trip-date-picker').value;
      const timeValue = el.optionList.querySelector('#trip-clock-picker').value || '14:00';
      config.input.value = formatTripDateTime(dateValue, timeValue);
      closeOptionSheet();
      showToast('已更新出行时间');
    });
    el.optionSheet.classList.remove('hidden');
    return;
  }
  if (type === 'navigation') {
    el.optionList.innerHTML = config.values
      .map((item) => `<button class="option-item" data-nav-mode="${item.mode}">${item.label}</button>`)
      .join('');
    el.optionList.querySelectorAll('[data-nav-mode]').forEach((button) => {
      button.addEventListener('click', async () => {
        closeOptionSheet();
        await startNavigation(context.stopId, button.dataset.navMode);
      });
    });
    el.optionSheet.classList.remove('hidden');
    return;
  }
  el.optionList.innerHTML = [
    ...config.values.map((item) => `<button class="option-item" data-option-value="${item.label}">${item.label}</button>`),
    `<label class="custom-option"><span>自定义</span><input id="route-custom-input" placeholder="比如：先吃饭再玩、避开排队" /></label>`,
    `<button class="option-confirm" id="route-custom-confirm">确认路线偏好</button>`,
  ].join('');
  el.optionList.querySelectorAll('[data-option-value]').forEach((button) => {
    button.addEventListener('click', () => {
      config.input.value = button.dataset.optionValue;
      closeOptionSheet();
      showToast('已更新设置');
    });
  });
  el.optionList.querySelector('#route-custom-confirm').addEventListener('click', () => {
    const custom = el.optionList.querySelector('#route-custom-input').value.trim();
    if (!custom) {
      el.optionList.querySelector('#route-custom-input').focus();
      return;
    }
    config.input.value = custom;
    closeOptionSheet();
    showToast('已更新路线偏好');
  });
  el.optionSheet.classList.remove('hidden');
}

function formatTripDateTime(dateValue, timeValue) {
  if (!dateValue) return `${timeValue} 开始`;
  const date = new Date(`${dateValue}T00:00:00`);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]} ${timeValue} 开始`;
}

async function ensureOrigin() {
  if (state.origin?.lat && state.origin?.lng) return state.origin;
  state.origin = await getUserContext();
  return state.origin;
}

function closeOptionSheet() {
  el.optionSheet.classList.add('hidden');
}

async function startNavigation(stopId, mode) {
  const stop = getLiveStops().find((item) => item.id === stopId);
  if (!stop) {
    showToast('未找到目的地');
    return;
  }
  const origin = await ensureOrigin();
  if (!hasCoordinates(origin) || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) {
    showToast('缺少起点或终点位置信息');
    return;
  }

  state.navigation.active = true;
  state.navigation.stopId = stopId;
  state.navigation.mode = mode;
  state.navigation.status = 'loading';
  state.navigation.summary = normalizeNavigationSummary(mode, {
    detailText: `正在规划从 ${origin.name || state.selectedPrefs.locationInput || '起点'} 到 ${stop.name} 的路线`,
  });
  render();

  const destination = { lat: stop.lat, lng: stop.lng, name: stop.name, address: '' };
  renderLiveMap(getLiveStops());
  showToast(`正在规划${getNavigationModeLabel(mode)}路线`);
}

async function copyInviteLink() {
  const code = state.roomCode || '----';
  const base = typeof window !== 'undefined' && window.location ? `${window.location.origin}${window.location.pathname}` : '';
  const link = base ? `${base}#room=${code}` : `#room=${code}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast('邀请链接已复制');
  } catch (error) {
    showToast(`已生成邀请链接：${code}`);
  }
}

function generateInviteImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFD100';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  ctx.font = '900 54px sans-serif';
  ctx.fillText('待设置路线', 72, 150);
  ctx.font = '800 30px sans-serif';
  ctx.fillText(`房间码 ${state.roomCode || '----'}`, 72, 224);
  ctx.fillText('待设置时间 · 待设置主题 · 等待成员加入', 72, 286);
  ctx.fillStyle = '#fff';
  roundRect(ctx, 72, 350, 606, 370, 36);
  ctx.fill();
  ctx.fillStyle = '#FF5A22';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(170, 560);
  ctx.bezierCurveTo(300, 420, 440, 650, 580, 470);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = '900 34px sans-serif';
  ctx.fillText('等待成员补充偏好后生成路线亮点', 126, 790);
  ctx.font = '700 26px sans-serif';
  ctx.fillText('创建房间后分享给朋友，一起补充偏好', 126, 840);

  const link = document.createElement('a');
  link.download = `meituan-route-invite-${state.roomCode || 'room'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('已生成邀请图片卡片');
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove('show'), 1800);
}

function formatDistanceApprox(poi) {
  if (!state.origin) return '近';
  const latMeters = 111000;
  const lngMeters = 85000;
  const meters = Math.hypot((poi.lat - state.origin.lat) * latMeters, (poi.lng - state.origin.lng) * lngMeters);
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

async function resolveUserLocation() {
  if (window.location.protocol === 'file:') return { ...await getUserContext() };
  if (!navigator.geolocation) return { ...await getUserContext() };
  return new Promise((resolve) => {
    let settled = false;
    const fallback = async () => {
      if (settled) return;
      settled = true;
      resolve(await getUserContext());
    };
    const timer = setTimeout(fallback, 10_000);
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: '当前位置',
            address: '浏览器定位结果',
          });
        },
        fallback,
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    } catch (error) {
      clearTimeout(timer);
      fallback();
    }
  });
}

function createMapAdapter(container, onPointClick) {
  // 如果高德 SDK 未加载，降级到 canvas fallback
  if (typeof AMap === 'undefined') {
    return createCanvasMapAdapter(container, onPointClick);
  }

  const amap = new AMap.Map(container, {
    zoom: 14,
    center: [116.391, 39.905],
    mapStyle: 'amap://styles/fresh',
    resizeEnable: true,
  });

  let amapMarkers = [];
  let amapPolyline = null;
  let amapMemberMarkers = [];
  let amapOriginMarker = null;
  let lastRenderPayload = null;
  let navigationService = null;
  let navigationSignature = '';

  function clearNavigationService() {
    if (navigationService?.clear) {
      try { navigationService.clear(); } catch {}
    }
    navigationService = null;
    navigationSignature = '';
  }

  function clearOverlays() {
    if (amapMarkers.length) { amap.remove(amapMarkers); amapMarkers = []; }
    if (amapPolyline) { amap.remove(amapPolyline); amapPolyline = null; }
    if (amapMemberMarkers.length) { amap.remove(amapMemberMarkers); amapMemberMarkers = []; }
    if (amapOriginMarker) { amap.remove(amapOriginMarker); amapOriginMarker = null; }
    clearNavigationService();
  }

  function loadAmapPlugin(pluginName) {
    return new Promise((resolve, reject) => {
      try {
        AMap.plugin(pluginName, () => resolve());
      } catch (error) {
        reject(error);
      }
    });
  }

  function inferTransitCity(origin) {
    const source = [origin?.address, origin?.name, state.selectedPrefs.locationInput]
      .filter(Boolean)
      .join(' ');
    const direct = source.match(/([\u4e00-\u9fa5]{2,}市)/);
    if (direct) return direct[1];
    if (/北京|朝阳|海淀|东城|西城|丰台|通州|昌平/.test(source)) return '北京市';
    if (/上海|浦东|徐汇|静安|黄浦/.test(source)) return '上海市';
    if (/广州|天河|越秀|海珠/.test(source)) return '广州市';
    if (/深圳|南山|福田|罗湖/.test(source)) return '深圳市';
    return '北京市';
  }

  function buildNavigationSummaryFromResult(mode, result) {
    const summary = { distance: null, duration: null, costText: '', detailText: '' };
    if (mode === 'walking') {
      const route = result?.routes?.[0];
      summary.distance = route?.distance;
      summary.duration = route?.time;
      summary.detailText = route?.steps?.[0]?.instruction || '已生成步行路线';
    } else if (mode === 'transit') {
      const plan = result?.plans?.[0];
      summary.distance = plan?.distance;
      summary.duration = plan?.time;
      const walkDistance = plan?.walking_distance;
      if (Number.isFinite(walkDistance)) summary.costText = `步行 ${formatNavigationDistance(walkDistance)}`;
      summary.detailText = plan?.segments?.map((segment) => {
        if (segment?.transit?.name) return segment.transit.name;
        if (segment?.walking?.instruction) return segment.walking.instruction;
        return '';
      }).filter(Boolean).slice(0, 2).join(' · ') || '已生成公共交通路线';
    } else {
      const route = result?.routes?.[0];
      summary.distance = route?.distance;
      summary.duration = route?.time;
      const fee = route?.taxi_cost ?? result?.taxi_cost ?? route?.cost;
      if (Number.isFinite(fee)) summary.costText = `约 ¥${Math.round(fee)}`;
      summary.detailText = route?.steps?.[0]?.instruction || (mode === 'taxi' ? '已生成打车路线' : '已生成驾车路线');
    }
    return normalizeNavigationSummary(mode, summary);
  }

  function syncNavigationState(stopId, mode, status, result) {
    if (state.navigation.stopId !== stopId || state.navigation.mode !== mode) return;
    state.navigation.status = status;
    if (status === 'ready') {
      state.navigation.summary = buildNavigationSummaryFromResult(mode, result);
      render();
      showToast(`${getNavigationModeLabel(mode)}路线已生成`);
      return;
    }
    if (status === 'error') {
      state.navigation.summary = normalizeNavigationSummary(mode, {
        detailText: '路线规划失败，请尝试其他方式',
      });
      render();
      showToast('路线规划失败，请稍后重试');
    }
  }

  // 成员头像标记（showMemberRoutes 时展示，用真实成员）
  function drawAMapMemberRoutes(origin) {
    const colors = ['#ff8a1f', '#28b978', '#8a63df', '#3b82f6', '#ec4899'];
    const members = (state.currentMembers || [])
      .slice(0, 5)
      .map((member, index) => {
        const point = getMemberLocation(member);
        if (!point) return null;
        return {
          lat: point.lat,
          lng: point.lng,
          name: member.avatar || member.nickname?.charAt(0) || '?',
          color: colors[index % colors.length],
        };
      })
      .filter(Boolean);
    if (!members.length) return { lat: origin.lat, lng: origin.lng };

    members.forEach((m) => {
      const marker = new AMap.Marker({
        position: [m.lng, m.lat],
        content: `<div style="width:28px;height:28px;border-radius:50%;background:${m.color};color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)">${m.name}</div>`,
        anchor: 'center',
      });
      amapMemberMarkers.push(marker);
    });
    amap.add(amapMemberMarkers);
    // 返回中心汇聚点（取均值）
    return {
      lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
    };
  }

  return {
    render({ origin, points = [], selectedPoints = [], hideUnselected = false, showMemberRoutes = false, routeFromOrigin = true, showOriginMarker = false }) {
      lastRenderPayload = { origin, points, selectedPoints, hideUnselected, showMemberRoutes, routeFromOrigin, showOriginMarker };
      clearOverlays();
      const safeOrigin = origin || { lat: 39.905, lng: 116.391 };
      amap.setCenter([safeOrigin.lng, safeOrigin.lat]);

      if (showOriginMarker) {
        amapOriginMarker = new AMap.Marker({
          position: [safeOrigin.lng, safeOrigin.lat],
          content: '<div style="width:22px;height:22px;border-radius:50%;background:#197cff;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.22)">我</div>',
          anchor: 'center',
          zIndex: 140,
        });
        amap.add(amapOriginMarker);
      }

      // 成员路线（汇聚动画）
      let hub = null;
      if (showMemberRoutes) {
        hub = drawAMapMemberRoutes(safeOrigin);
        if (amapMemberMarkers.length) {
          const fitOverlays = [
            ...(showOriginMarker && amapOriginMarker ? [amapOriginMarker] : []),
            ...amapMemberMarkers,
          ];
          if (fitOverlays.length > 1) amap.setFitView(fitOverlays, false, [30, 30, 30, 30]);
        }
      }

      // 路线折线
      const routeStart = routeFromOrigin ? safeOrigin : (showMemberRoutes ? hub : null);
      if (selectedPoints.length >= 1) {
        const pathPoints = routeStart ? [routeStart, ...selectedPoints] : selectedPoints;
        if (pathPoints.length >= 2) {
          amapPolyline = new AMap.Polyline({
            path: pathPoints.map((p) => [p.lng, p.lat]),
            strokeColor: '#ff5a22',
            strokeWeight: 4,
            strokeOpacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
          });
          amap.add(amapPolyline);
        }
      }

      // POI 标记
      const visiblePoints = hideUnselected ? selectedPoints : points;
      visiblePoints.forEach((point, index) => {
        const isSelected = selectedPoints.some((p) => p.id === point.id);
        const bg = isSelected ? '#ff5a22' : '#fff';
        const color = isSelected ? '#fff' : '#333';
        const border = isSelected ? '#ff5a22' : '#ddd';
        const marker = new AMap.Marker({
          position: [point.lng, point.lat],
          content: `<div style="background:${bg};color:${color};border:1.5px solid ${border};padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15)">${index + 1}. ${point.name}</div>`,
          anchor: 'bottom-center',
          zIndex: isSelected ? 120 : 100,
        });
        marker.on('click', () => { if (typeof onPointClick === 'function') onPointClick(point); });
        amapMarkers.push(marker);
      });
      if (amapMarkers.length) {
        amap.add(amapMarkers);
        const fitOverlays = [
          ...(showOriginMarker && amapOriginMarker ? [amapOriginMarker] : []),
          ...amapMemberMarkers,
          ...amapMarkers,
          ...(amapPolyline ? [amapPolyline] : []),
        ];
        if (fitOverlays.length > 1) amap.setFitView(fitOverlays, false, [30, 30, 30, 30]);
      }
    },
    async renderNavigation({ origin, destination, mode, stopId }) {
      const safeOrigin = origin || { lat: 39.905, lng: 116.391 };
      const signature = JSON.stringify({
        origin: [Number(safeOrigin.lng).toFixed(6), Number(safeOrigin.lat).toFixed(6)],
        destination: [Number(destination.lng).toFixed(6), Number(destination.lat).toFixed(6)],
        mode,
        stopId,
      });
      if (navigationSignature === signature && navigationService) return;
      clearOverlays();
      navigationSignature = signature;
      amap.setCenter([safeOrigin.lng, safeOrigin.lat]);

      try {
        if (mode === 'walking') {
          await loadAmapPlugin('AMap.Walking');
          navigationService = new AMap.Walking({ map: amap, hideMarkers: false, autoFitView: true });
        } else if (mode === 'transit') {
          await loadAmapPlugin('AMap.Transfer');
          navigationService = new AMap.Transfer({
            map: amap,
            city: inferTransitCity(origin),
            nightflag: true,
            policy: AMap.TransferPolicy.LEAST_TIME,
          });
        } else {
          await loadAmapPlugin('AMap.Driving');
          navigationService = new AMap.Driving({
            map: amap,
            hideMarkers: false,
            autoFitView: true,
            policy: AMap.DrivingPolicy.LEAST_TIME,
          });
        }
        navigationService.search(
          new AMap.LngLat(safeOrigin.lng, safeOrigin.lat),
          new AMap.LngLat(destination.lng, destination.lat),
          (status, result) => {
            if (status === 'complete') {
              syncNavigationState(stopId, mode, 'ready', result);
            } else {
              syncNavigationState(stopId, mode, 'error');
            }
          }
        );
      } catch (error) {
        syncNavigationState(stopId, mode, 'error');
      }
    },
    clearNavigation() {
      clearNavigationService();
    },
    resize() {
      amap.resize();
      if (state.navigation.active) return;
      if (lastRenderPayload) this.render(lastRenderPayload);
    },
  };
}

// Canvas fallback（高德未加载时兜底）
function createCanvasMapAdapter(canvas, onPointClick) {
  const ctx = canvas.getContext('2d');
  const size = { width: canvas.width, height: canvas.height };
  const latRange = 0.012;
  const lngRange = 0.017;
  let lastMarkers = [];

  function project(point, origin) {
    const left = size.width * 0.18;
    const top = size.height * 0.15;
    const width = size.width * 0.64;
    const height = size.height * 0.66;
    const x = left + ((point.lng - origin.lng) / lngRange + 0.5) * width;
    const y = top + (0.5 - (point.lat - origin.lat) / latRange) * height;
    return { x, y };
  }

  function hitTest(x, y) {
    return lastMarkers.find((marker) => Math.hypot(marker.x - x, marker.y - y) <= marker.radius + 4) || null;
  }

  canvas.addEventListener('click', (event) => {
    if (typeof onPointClick !== 'function') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const marker = hitTest(x, y);
    if (marker) onPointClick(marker.point);
  });

  function drawBackground(origin) {
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#eef1ec';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    ctx.save();
    ctx.translate(size.width * 0.1, size.height * 0.3);
    ctx.rotate(-0.12);
    ctx.fillRect(-80, -8, size.width * 1.1, 16);
    ctx.restore();
    ctx.save();
    ctx.translate(size.width * 0.28, -10);
    ctx.rotate(0.17);
    ctx.fillRect(-16, 0, 16, size.height * 1.08);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillRect(0, 0, size.width, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath();
      ctx.moveTo(16, 26 + i * 26);
      ctx.lineTo(size.width - 16, 26 + i * 26);
      ctx.stroke();
    }
  }

  function getMemberPoints(origin) {
    const realMembers = state.currentMembers || [];
    const fills  = ['#ff8a1f', '#28b978', '#8a63df', '#3b82f6', '#ec4899'];
    const glows  = ['rgba(255,138,31,.24)', 'rgba(40,185,120,.24)', 'rgba(138,99,223,.24)', 'rgba(59,130,246,.24)', 'rgba(236,72,153,.24)'];
    return realMembers.slice(0, 5).map((member, index) => {
      const point = getMemberLocation(member);
      if (!point) return null;
      return {
        lat: point.lat,
        lng: point.lng,
        name: member.avatar || member.nickname?.charAt(0) || '?',
        fill: fills[index % fills.length],
        glow: glows[index % glows.length],
      };
    }).filter(Boolean);
  }

  function getCenterPoint(points) {
    return {
      lat: points.reduce((sum, item) => sum + item.lat, 0) / points.length,
      lng: points.reduce((sum, item) => sum + item.lng, 0) / points.length,
      name: '中心',
    };
  }

  function drawMemberRoutes(origin) {
    const memberPoints = getMemberPoints(origin).sort((a, b) => a.lng - b.lng);
    if (!memberPoints.length) return origin; // 无真实成员时跳过
    const hub = getCenterPoint(memberPoints);
    const memberCoords = memberPoints.map((member) => ({ ...project(member, origin), member }));
    ctx.strokeStyle = 'rgba(255, 90, 34, 0.52)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const meanX = memberCoords.reduce((sum, point) => sum + point.x, 0) / memberCoords.length;
    const meanY = memberCoords.reduce((sum, point) => sum + point.y, 0) / memberCoords.length;
    const varianceX = memberCoords.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const varianceY = memberCoords.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    ctx.beginPath();
    if (varianceX >= varianceY) {
      const slope = memberCoords.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / Math.max(varianceX, 1);
      const minX = Math.max(20, Math.min(...memberCoords.map((point) => point.x)) - 24);
      const maxX = Math.min(size.width - 20, Math.max(...memberCoords.map((point) => point.x)) + 24);
      ctx.moveTo(minX, meanY + slope * (minX - meanX));
      ctx.lineTo(maxX, meanY + slope * (maxX - meanX));
    } else {
      const slope = memberCoords.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / Math.max(varianceY, 1);
      const minY = Math.max(20, Math.min(...memberCoords.map((point) => point.y)) - 24);
      const maxY = Math.min(size.height - 20, Math.max(...memberCoords.map((point) => point.y)) + 24);
      ctx.moveTo(meanX + slope * (minY - meanY), minY);
      ctx.lineTo(meanX + slope * (maxY - meanY), maxY);
    }
    ctx.stroke();
    memberCoords.forEach((coord) => {
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = coord.member.glow;
      ctx.arc(coord.x, coord.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = coord.member.fill;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.arc(coord.x, coord.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '900 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(coord.member.name, coord.x, coord.y + 1);
      ctx.restore();
    });
    return hub;
  }

  function drawRoute(points, origin, startPoint = null) {
    if (!points.length) return;
    const routePoints = startPoint ? [startPoint, ...points] : points;
    if (routePoints.length < 2) return;
    const coords = routePoints.map((point) => project(point, origin));
    ctx.strokeStyle = '#ff5a22';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    coords.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  function drawMarker(point, index, origin, selected = false, showLabel = true) {
    const { x, y } = project(point, origin);
    const radius = selected ? 17 : 12;
    lastMarkers.push({ id: point.id, x, y, radius, point });
    if (selected) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.fillStyle = '#ff5a22';
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.arc(x, y, radius - 1.5, 0, Math.PI * 2);
      ctx.stroke();
      if (!showLabel) return;
      ctx.fillStyle = '#fff';
      ctx.font = '900 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), x, y + 1);
      return;
    }
    ctx.beginPath();
    ctx.fillStyle = 'rgba(170, 170, 170, 0.88)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!showLabel) return;
    ctx.fillStyle = '#fff';
    ctx.font = '900 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), x, y + 1);
  }

  return {
    render({ origin, points = [], selectedPoints = [], hideUnselected = false, showMemberRoutes = false, routeFromOrigin = true }) {
      const safeOrigin = origin || getMembersCenter() || { lat: 39.905, lng: 116.391 };
      lastMarkers = [];
      drawBackground(safeOrigin);
      const hub = showMemberRoutes ? drawMemberRoutes(safeOrigin) : null;
      drawRoute(selectedPoints, safeOrigin, routeFromOrigin ? safeOrigin : (showMemberRoutes ? hub : null));
      const visiblePoints = hideUnselected ? selectedPoints : points;
      visiblePoints.forEach((point, index) => {
        const selected = selectedPoints.some((selectedPoi) => selectedPoi.id === point.id);
        drawMarker(point, index, safeOrigin, selected, hideUnselected || selected);
      });
    },
    resize() {},
  };
}

bootstrap();
})();
