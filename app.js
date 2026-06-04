(() => {
const { getAllPois, getPoiById, getPoiRecommendations, getUserContext, planRoute, searchPois } = window.MockApi;

const preferenceSets = {
  foods: ['火锅', '粤菜', '川湘菜', '烧烤', '日料'],
  avoid: ['不吃辣', '忌香菜', '不吃葱蒜', '海鲜过敏'],
  fun: ['剧本杀', '密室逃脱', '电竞', '美甲美睫', '户外攀岩'],
};

const members = [
  { name: 'Xinwei', avatar: 'X', tone: 'yellow', photo: 'food', summary: '火锅 / 不太辣 / 100以内', status: '已提交', tags: ['火锅', '西单', '少走路'] },
  { name: 'Yuki', avatar: 'Y', tone: 'green', photo: 'dessert', summary: '粤菜 / 甜品 / 想拍照', status: '已提交', tags: ['甜品', '拍照', '清淡'] },
  { name: 'Leo', avatar: 'L', tone: 'blue', photo: 'play', summary: '咖啡 / 少排队 / 近地铁', status: '待确认', tags: ['咖啡', '电竞', '近地铁'] },
];

const itineraryStops = [
  {
    id: 'hotpot',
    number: 1,
    name: '潮汕牛肉火锅 西单店',
    tone: 'peach',
    feature: '现切牛肉 / 不太辣 / 适合聚餐',
    sales: '月售 3200+',
    reviewBase: 467,
    price: '人均 ¥96',
    latest: '牛肉很嫩',
  },
  {
    id: 'coffee',
    number: 2,
    name: '城市露台咖啡',
    tone: 'mint',
    feature: '露台景观 / 适合拍照 / 安静聊天',
    sales: '月售 860+',
    reviewBase: 214,
    price: '人均 ¥42',
    latest: '露台很适合拍照',
  },
  {
    id: 'dessert',
    number: 3,
    name: '漫糖甜品工坊',
    tone: 'pink',
    feature: '招牌布丁 / 饭后甜品 / 可打包',
    sales: '月售 1900+',
    reviewBase: 301,
    price: '人均 ¥36',
    latest: '招牌布丁已收藏',
  },
  {
    id: 'bar',
    number: 4,
    name: '湖畔小酒馆',
    tone: 'yellow',
    feature: '夜景小酌 / 适合收尾 / 可临时加站',
    sales: '月售 740+',
    reviewBase: 127,
    price: '人均 ¥88',
    latest: '适合收尾聊天',
  },
];

const initialAlbumPhotos = [
  { id: 'p1', title: '火锅店第一张合照', meta: 'Xinwei · 刚刚', likes: 6, tone: 'peach', badge: '新', mediaType: 'image' },
  { id: 'p2', title: '城市露台咖啡拉花', meta: 'Yuki · 2分钟前', likes: 3, tone: 'mint', badge: '封面', mediaType: 'image' },
  { id: 'p3', title: '甜品拼盘九宫格', meta: 'Leo · 8分钟前', likes: 8, tone: 'pink', badge: 'live', mediaType: 'image' },
  { id: 'p4', title: '成员路上随手拍', meta: 'Mia · 12分钟前', likes: 2, tone: 'blue', badge: 'LIVE', mediaType: 'image' },
];

const state = {
  screen: '04',
  origin: null,
  filters: ['综合最优', '美食', '玩乐', '近地铁'],
  activeFilter: '综合最优',
  recommendations: [],
  previewIds: [],
  previewSelectedIds: [],
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
  currentTripId: null,
  roomCode: '',
  myName: '',
  tripBarrage: ['Leo：我快到了'],
  storeComments: {
    hotpot: ['牛肉很嫩'],
    coffee: ['露台很适合拍照'],
    dessert: ['招牌布丁已收藏'],
    bar: ['适合收尾聊天'],
  },
  commentTarget: 'trip',
  albumPhotos: initialAlbumPhotos.slice(),
  likedPhotoIds: new Set(),
  historyTrips: [],
  activeTripHistoryId: null,
  notebook: null,
  mediaViewer: {
    index: 0,
  },
  tripEnded: false,
  selectedPrefs: {
    categories: ['火锅', '咖啡', '甜品', '剧本杀', '烧烤'],
    fun: ['剧本杀', '密室逃脱', '电竞', '美甲美睫', '户外攀岩'],
    avoid: ['香菜', '葱蒜'],
    startHour: 18,
    foods: ['火锅', '粤菜', '川湘菜'],
    foodsInput: '',
    avoidInput: '',
    funInput: '',
    locationInput: '北京市西单大悦城',
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
  submitPrefs: document.getElementById('submit-prefs'),
  buildRoute: document.getElementById('build-route'),
  skipLoading: document.getElementById('skip-loading'),
  foodChips: document.getElementById('food-chips'),
  avoidChips: document.getElementById('avoid-chips'),
  funChips: document.getElementById('fun-chips'),
  foodInput: document.getElementById('food-input'),
  avoidInput: document.getElementById('avoid-input'),
  funInput: document.getElementById('fun-input'),
  memberList: document.getElementById('member-list'),
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
  recommendationList: document.getElementById('recommendation-list'),
  routeList: document.getElementById('route-list'),
  filterRow: document.getElementById('filter-row'),
  toast: document.getElementById('toast'),
  map11: document.getElementById('map11'),
  map12: document.getElementById('map12'),
  routeDistance: document.getElementById('route-distance'),
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

let loadingAnimationFrame = 0;
let eventsBound = false;

async function bootstrap() {
  updateViewportScale();
  if (typeof window !== 'undefined') window.addEventListener('resize', updateViewportScale);

  // 从独立页面跳回时恢复状态（如 ?room=1111#13）
  var hash = window.location.hash;
  var params = new URLSearchParams(window.location.search);
  var roomFromUrl = params.get('room');
  if (roomFromUrl) {
    state.roomCode = roomFromUrl;
    state.currentTripId = roomFromUrl;
  }
  if (hash && /^#\d{2}$/.test(hash)) {
    state.screen = hash.slice(1);
  }
  // 清理 URL 参数避免刷新时重复
  if (roomFromUrl || (hash && /^#\d{2}$/.test(hash))) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  bindEvents();
  syncPreferenceModel();
  render();

  try {
    state.origin = await resolveUserLocation();
    await refreshRecommendations();
    state.routePlan = await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: false });
  } catch (error) {
    console.error('初始化位置和推荐数据失败，已使用 mock 数据兜底', error);
    state.origin = await getUserContext();
    await refreshRecommendations();
  }
  render();
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  el.openRoomModal.addEventListener('click', () => {
    state.screen = '05';
    render();
  });

  el.quickJoinRoom.addEventListener('click', () => {
    state.screen = '05';
    render();
  });

  el.createRoom.addEventListener('click', () => {
    state.screen = '06';
    render();
  });

  el.joinRoom.addEventListener('click', () => {
    const code = el.roomCodeInput.value.trim();
    if (!/^\d{4}$/.test(code)) {
      showToast('请输入 4 位房间码');
      el.roomCodeInput.focus();
      return;
    }
    state.roomCode = code;
    state.currentTripId = code;
    state.screen = '08';
    render();
    showToast(`已加入房间 ${code}`);
  });

  el.saveRoomSettings.addEventListener('click', () => {
    // 创建房间时生成 4 位房间码
    state.roomCode = String(Math.floor(1000 + Math.random() * 9000));
    state.currentTripId = state.roomCode;
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

  document.querySelectorAll('[data-location]').forEach((button) => {
    button.addEventListener('click', () => {
      el.locationInput.value = button.dataset.location;
      state.selectedPrefs.locationInput = button.dataset.location;
      showToast('已选择 mock 位置');
    });
  });

  document.querySelectorAll('[data-open-sheet]').forEach((row) => {
    row.addEventListener('click', () => openOptionSheet(row.dataset.openSheet));
  });

  el.optionSheet.addEventListener('click', (event) => {
    if (event.target === el.optionSheet) closeOptionSheet();
  });

  el.submitPrefs.addEventListener('click', () => {
    syncPreferenceModel();
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
    state.screen = '07';
    render();
  });
  el.back09.addEventListener('click', () => {
    state.screen = '08';
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
    state.routePlan = await planRoute({ origin: await ensureOrigin(), selectedIds: state.previewSelectedIds, prefs: state.selectedPrefs, respectOrder: false });
    state.selectedIds = state.routePlan.selected.map((poi) => poi.id);
    state.manualRouteOrder = false;
    state.screen = '12';
    render();
  });

  el.back12.addEventListener('click', () => {
    state.screen = '11';
    render();
  });

  el.back11.addEventListener('click', () => {
    state.screen = '10';
    render();
  });

  el.addMore.addEventListener('click', () => {
    state.screen = '11';
    render();
    showToast('可继续挑选更多店铺');
  });

  el.confirmRoute.addEventListener('click', async () => {
    const currentRoute = state.routePlan?.selected?.length ? state.routePlan.selected : state.selectedIds.map((id) => getPoiById(id)).filter(Boolean);
    state.selectedIds = currentRoute.map((poi) => poi.id);
    state.routePlan = state.selectedIds.length
      ? await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: state.manualRouteOrder })
      : { selected: [], totalDistanceLabel: '待选' };
    state.selectedIds = state.routePlan.selected.map((poi) => poi.id);
    state.tripStarted = true;
    state.tripEnded = false;
    state.activeTripHistoryId = null;
    // 房间码优先：没加入房间才用时间戳
    state.currentTripId = state.roomCode || `trip-${Date.now()}`;
    state.screen = '13';
    render();
    showToast('行程已开始');
  });

  el.back13.addEventListener('click', () => {
    state.screen = '12';
    render();
  });

  el.openAlbum.addEventListener('click', () => {
    // 跳转到独立的共享相册页面，用房间码做 tripId
    const tripId = state.roomCode || state.currentTripId || 'trip001';
    const name = state.myName || state.selectedPrefs.locationInput || '我';
    window.location.href = `journal/frontend/album/album.html?tripId=${tripId}&userName=${encodeURIComponent(name)}`;
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

  // screen-14 已迁移到独立 album.html，保留兼容
  if (el.back14) {
    el.back14.addEventListener('click', () => {
      state.screen = '13';
      render();
    });
  }

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

  // screen-14 已迁移到独立 album.html
  if (el.albumPickCard) el.albumPickCard.addEventListener('click', () => el.albumFileInput.click());
  if (el.albumPickBottom) el.albumPickBottom.addEventListener('click', () => el.albumFileInput.click());
  if (el.albumCameraCard) el.albumCameraCard.addEventListener('click', () => openCameraUpload());
  if (el.albumCameraBottom) el.albumCameraBottom.addEventListener('click', () => openCameraUpload());
  if (el.albumFileInput) el.albumFileInput.addEventListener('change', () => handleAlbumFiles(el.albumFileInput.files, '相册'));
  if (el.albumCameraInput) el.albumCameraInput.addEventListener('change', () => handleAlbumFiles(el.albumCameraInput.files, '拍照'));

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
  const origin = await ensureOrigin();
  state.recommendations = await getPoiRecommendations({ center: origin, prefs: state.selectedPrefs });
  state.previewIds = state.recommendations.slice(0, 3).map((poi) => poi.id);
}

async function applyPoiSelection(poiId, { respectOrder = false, toast = true } = {}) {
  const poi = getPoiById(poiId);
  const wasSelected = state.selectedIds.includes(poiId);
  toggleSelection(poiId);
  state.manualRouteOrder = respectOrder;
  const origin = await ensureOrigin();
  state.routePlan = await planRoute({
    origin,
    selectedIds: state.selectedIds,
    prefs: state.selectedPrefs,
    respectOrder,
  });
  state.selectedIds = state.routePlan.selected.map((item) => item.id);
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
  const set = new Set(state.previewSelectedIds);
  if (set.has(poiId)) set.delete(poiId);
  else set.add(poiId);
  state.previewSelectedIds = [...set];
  const origin = await ensureOrigin();
  state.routePlan = state.previewSelectedIds.length
    ? await planRoute({ origin, selectedIds: state.previewSelectedIds, prefs: state.selectedPrefs, respectOrder: false })
    : { selected: [], totalDistanceLabel: '待选' };
  state.manualRouteOrder = false;
  renderRecommendations();
  drawMaps();
}

function render() {
  state.routePlan = state.routePlan || { selected: [] };
  el.screen04.classList.toggle('hidden', state.screen !== '04');
  el.screen05.classList.toggle('hidden', state.screen !== '05');
  el.screen06.classList.toggle('hidden', state.screen !== '06');
  el.screen07.classList.toggle('hidden', state.screen !== '07');
  // 动态更新邀请页的房间码
  if (state.screen === '07') {
    const shareCode = document.getElementById('share-room-code');
    if (shareCode && state.roomCode) {
      shareCode.innerHTML = `<span>#</span> 房间码 ${state.roomCode}`;
    }
  }
  el.screen08.classList.toggle('hidden', state.screen !== '08');
  el.screen09.classList.toggle('hidden', state.screen !== '09');
  el.screen10.classList.toggle('hidden', state.screen !== '10');
  el.screen11.classList.toggle('hidden', state.screen !== '11');
  el.screen12.classList.toggle('hidden', state.screen !== '12');
  el.screen13.classList.toggle('hidden', state.screen !== '13');
  if (el.screen14) el.screen14.classList.toggle('hidden', state.screen !== '14');
  el.screen15.classList.toggle('hidden', state.screen !== '15');
  el.screen18.classList.toggle('hidden', state.screen !== '18');
  el.screen19.classList.toggle('hidden', state.screen !== '19');

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
  renderHistory();
  drawMaps();
}

function getStopComment(stopId) {
  return state.storeComments[stopId]?.at(-1) || itineraryStops.find((stop) => stop.id === stopId)?.latest || '';
}

function getLiveStops() {
  const routeStops = state.routePlan?.selected?.length
    ? state.routePlan.selected
    : state.selectedIds.map((id) => getPoiById(id)).filter(Boolean);
  if (!routeStops.length) return state.tripStarted ? [] : itineraryStops;
  return routeStops.map((poi, index) => normalizeLiveStop(poi, index));
}

function normalizeLiveStop(poi, index) {
  const fallback = itineraryStops.find((stop) => stop.id === poi.id);
  const sales = fallback?.sales || `月售 ${Math.max(520, Math.round(poi.rating * 420))}+`;
  const reviewBase = fallback?.reviewBase || Math.round(poi.rating * 45 + poi.price);
  return {
    id: poi.id,
    number: index + 1,
    name: poi.name,
    tone: poi.mood || fallback?.tone || 'yellow',
    meta: `${poi.rating.toFixed(1)}分 · ¥${poi.price}/人${poi.distanceLabel ? ` · 距离${poi.distanceLabel}` : ''}`,
    tags: poi.tags?.length ? poi.tags.join(' · ') : fallback?.feature || '',
    sales,
    reviewBase,
    price: `人均 ¥${poi.price}`,
    salesLine: `${sales} · 评价 ${reviewBase} 条 · 人均 ¥${poi.price}`,
    latest: fallback?.latest || '',
    lat: poi.lat,
    lng: poi.lng,
  };
}

function renderItinerary() {
  const stops = getLiveStops();
  const html = stops.length
    ? stops.map((stop, index) => renderItineraryStop(stop, index, stops.length)).join('')
    : '<div class="trip-empty">当前行程还没有点位，可返回调整页继续添加</div>';
  el.itineraryList.innerHTML = html;
  el.commentPreviewList.innerHTML = html;
  const latestBarrage = state.tripBarrage.at(-1) || 'Leo：我快到了';
  el.tripBarrage.textContent = latestBarrage;
  el.tripBarragePreview.textContent = latestBarrage;
  renderLiveMap(stops);
  renderLiveTripTips(stops.length);

  document.querySelectorAll('[data-nav-stop]').forEach((button) => {
    button.addEventListener('click', () => {
      const stop = stops.find((item) => item.id === button.dataset.navStop);
      showToast(stop ? `正在导航到 ${stop.name}` : '正在导航');
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
}

function renderLiveTripTips(count) {
  const text = count
    ? `${count} 个点位已串联，右侧导航从当前位置直达该店铺`
    : '当前行程还没有点位，可返回调整页继续添加';
  document.querySelectorAll('.live-trip-tip').forEach((tip) => {
    tip.innerHTML = `<span>⌖</span>${text}`;
  });
}

function renderLiveMap(stops) {
  const maps = document.querySelectorAll('.screen-13 .live-map, .screen-15 .live-map');
  maps.forEach((map) => {
    const polyline = map.querySelector('.route-line polyline');
    const mePin = map.querySelector('.map-pin--me');
    const pins = [...map.querySelectorAll('[data-live-pin]')];
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

function renderItineraryStop(stop, index, total) {
  const count = state.storeComments[stop.id]?.length || 0;
  const reviewCount = stop.reviewBase + count;
  const salesLine = `${stop.sales} · 评价 ${reviewCount} 条 · ${stop.price}`;
  return `
    <article class="trip-stop">
      <div class="stop-number">${stop.number}</div>
      <div class="stop-photo stop-photo--${stop.tone}">图片</div>
      <div class="stop-info">
        <h3>${stop.name}</h3>
        <p class="stop-feature poi-meta">${salesLine}</p>
        <p class="stop-stats poi-tags">${stop.tags}</p>
      </div>
      <div class="live-stop-actions">
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
  state.manualRouteOrder = true;
  state.routePlan = state.selectedIds.length
    ? await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: true })
    : { selected: [], totalDistanceLabel: '待选' };
  renderItinerary();
  renderRoute();
  renderRecommendations();
  drawMaps();
  showToast(stop ? `已删除 ${stop.name}` : '已删除点位');
}

function renderAlbum() {
  if (!el.albumCount || !el.photoGrid) return; // screen-14 已迁移
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
    generateNotebookFromTrip();  // 内部已调用 finishTrip({ notebookGenerated: true })
    state.showEndDialog = false;
    // 跳转到独立的手帐页面，用房间码做 tripId
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

function generateNotebookFromTrip() {
  const stops = getLiveStops();
  const routeTitle = stops.map((stop) => getShortStopName(stop.name)).join(' → ') || '周末美食路线';
  state.notebook = {
    id: `notebook-${Date.now()}`,
    title: '周末美食探店 AI 手帐',
    date: '今天 20:48',
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
  const history = {
    id: existingId,
    title: '周末美食探店',
    subtitle: stops.map((stop) => getShortStopName(stop.name)).join(' · ') || '行程已结束',
    meta: `${stops.length} 个点位 · ${state.albumPhotos.length} 张照片`,
    notebookGenerated,
    photos: state.albumPhotos.slice(0, 3),
  };
  state.historyTrips = [history, ...state.historyTrips.filter((item) => item.id !== existingId)].slice(0, 5);
  state.activeTripHistoryId = existingId;
  state.tripEnded = true;
  state.tripStarted = false;
}

function renderNotebook() {
  if (!el.notebookCard) return;
  if (!state.notebook) {
    el.notebookCard.innerHTML = '<div class="notebook-empty">结束行程后可生成 AI 手帐</div>';
    return;
  }
  const notebook = state.notebook;
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
    mainPhotoEl.innerHTML = `<button data-open-media="0" type="button"><span>${mainPhoto?.title || '火锅店第一张合照'}</span></button>`;
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
      if (state.notebook) {
        const tripId = button.dataset.historyTrip || 'trip001';
        window.location.href = `journal/frontend/journal/journal.html?tripId=${tripId}`;
      } else {
        state.screen = '04';
        render();
      }
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
  if (!state.notebook?.photos?.length) return;
  state.mediaViewer.index = Math.max(0, Math.min(index, state.notebook.photos.length - 1));
  state.screen = '19';
  renderMediaViewer();
  render();
}

function renderMediaViewer() {
  if (!state.notebook?.photos?.length || !el.mediaViewerContent) return;
  const photo = state.notebook.photos[state.mediaViewer.index];
  el.mediaViewerContent.className = `media-viewer-content media-viewer-content--${photo.tone}`;
  el.mediaViewerContent.style.backgroundImage = photo.url
    ? `linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.28)), url('${photo.url}')`
    : '';
  el.mediaViewerContent.textContent = photo.mediaType === 'video' ? '视频预览' : '照片预览';
  el.mediaTitle.textContent = photo.title;
  el.mediaMeta.textContent = formatPhotoMeta(photo);
}

function stepMedia(direction) {
  if (!state.notebook?.photos?.length) return;
  const length = state.notebook.photos.length;
  state.mediaViewer.index = (state.mediaViewer.index + direction + length) % length;
  renderMediaViewer();
}

async function shareNotebook() {
  if (!state.notebook) return;
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
  if (!state.notebook) return;
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
  ctx.fillText(state.notebook.routeTitle || '今日路线', 604, 238);

  drawPolaroid(ctx, 126, 330, 384, 330, '#ffe2d2', state.notebook.photos[0]?.title || '共享相册');
  drawPolaroid(ctx, 582, 885, 314, 250, '#dff4ea', state.notebook.photos[1]?.title || '精选照片');
  drawPolaroid(ctx, 574, 1178, 304, 238, '#fbe1ec', state.notebook.photos[2]?.title || '成员合照');

  ctx.save();
  ctx.translate(658, 388);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 5;
  ctx.strokeRect(-12, -36, 250, 84);
  ctx.fillStyle = '#111';
  ctx.font = '900 38px "PingFang SC", sans-serif';
  ctx.fillText('路线亮点', 26, 20);
  ctx.restore();

  state.notebook.stops.slice(0, 4).forEach((stop, index) => {
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

  state.notebook.tripComments.slice(-2).forEach((text, index) => {
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
  const fun = [...new Set([...preferenceSets.fun, ...tokenize(state.selectedPrefs.funInput)])];

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

function renderMembers() {
  el.memberList.innerHTML = members
    .map(
      (member, index) => `
        <article class="member-card member-card--status member-card--${member.photo} ${index === 0 ? 'is-owner' : ''}">
          <div class="member-photo">
            <span class="avatar ${member.tone}">${member.avatar}</span>
          </div>
          <div>
            <div class="member-name">${member.name}${index === 0 ? '<em>房主</em>' : ''}</div>
            <div class="member-meta">${member.summary}</div>
            <div class="member-pref-tags">${member.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
          </div>
          <div class="member-tag ${member.status === '已提交' ? 'member-tag--done' : 'member-tag--wait'}">${member.status}</div>
        </article>
      `,
    )
    .join('');
}

function renderLoadingDots() {
  el.loadingDots.innerHTML = ['','', ''].map(() => '<span></span>').join('');
}

function updateViewportScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.innerWidth <= 430) {
    document.documentElement.style.setProperty('--app-scale', '1');
    return;
  }
  const scale = Math.min((window.innerWidth - 32) / 390, (window.innerHeight - 32) / 844, 1);
  document.documentElement.style.setProperty('--app-scale', String(Math.max(0.72, scale)));
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
    if (!state.recommendations.length) {
      await refreshRecommendations();
    }
    state.previewIds = (state.recommendations.length ? state.recommendations : getAllPois()).slice(0, 3).map((poi) => poi.id);
    state.previewSelectedIds = [];
    state.routePlan = { selected: [], totalDistanceLabel: '待选' };
  } catch (error) {
    console.error('生成 AI 路线失败，已使用兜底推荐', error);
    state.previewIds = getAllPois().slice(0, 3).map((poi) => poi.id);
    state.previewSelectedIds = [];
    state.routePlan = { selected: [], totalDistanceLabel: '待选' };
  }
  state.screen = '11';
  render();
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
        state.activeFilter = button.dataset.filter;
        state.selectedPrefs.mode = state.activeFilter;
        state.recommendations = await getPoiRecommendations({ center: await ensureOrigin(), prefs: state.selectedPrefs });
        state.previewIds = state.recommendations.slice(0, 3).map((poi) => poi.id);
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
    el.searchResults.classList.add('hidden');
    el.searchResults.innerHTML = '';
  } else {
    state.searchResults = await searchPois(query, await ensureOrigin());
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
    ? state.recommendations.slice(0, 3)
    : state.recommendations.length
      ? state.recommendations
      : getAllPois().slice(0, 5);
  el.recommendationList.innerHTML = items
    .map((poi, index) => {
      const checked = state.screen === '11' ? state.previewSelectedIds.includes(poi.id) : state.selectedIds.includes(poi.id);
      return `
        <article class="poi-card ${checked ? 'is-selected' : ''}" data-poi-id="${poi.id}">
          <div class="poi-icon ${poi.mood}">${poi.subCategory}</div>
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

  el.routeDistance.textContent = state.screen === '11' && !state.previewSelectedIds.length ? '待选' : (state.routePlan?.totalDistanceLabel || '3.6km');
}

function renderRoute() {
  const selected = state.routePlan?.selected?.length ? state.routePlan.selected : state.selectedIds.map((id) => getPoiById(id)).filter(Boolean);
  el.routeList.innerHTML = selected
    .map((poi, index) => {
      const num = index + 1;
      return `
        <article class="route-card" data-route-id="${poi.id}" draggable="true">
          <div class="poi-icon ${poi.mood}">图片</div>
          <div>
            <h3 class="poi-title">${poi.name}</h3>
            <div class="poi-meta">${poi.eta}:00 · ${poi.rating.toFixed(1)}分 · ¥${poi.price}/人</div>
            <div class="poi-tags">${poi.tags.join(' · ')}</div>
          </div>
          <div class="route-actions">
            <div class="drag-handle">⋮⋮</div>
            <button class="route-move" data-move-up="${poi.id}">↑</button>
            <button class="route-move" data-move-down="${poi.id}">↓</button>
            <button class="route-delete" data-delete-route="${poi.id}" aria-label="删除 ${poi.name}">×</button>
          </div>
        </article>
      `;
    })
    .join('');

  bindRouteDnD();
  bindRouteMoves();
  bindRouteDeletes();
}

function bindRouteDnD() {
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
      state.routePlan = await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: true });
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
      state.routePlan = await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: true });
      renderRoute();
      drawMaps();
    });
  });
}

function bindRouteDeletes() {
  el.routeList.querySelectorAll('[data-delete-route]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const id = button.dataset.deleteRoute;
      const poi = getPoiById(id);
      state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
      state.previewSelectedIds = state.previewSelectedIds.filter((selectedId) => selectedId !== id);
      state.manualRouteOrder = false;
      state.routePlan = state.selectedIds.length
        ? await planRoute({ origin: await ensureOrigin(), selectedIds: state.selectedIds, prefs: state.selectedPrefs, respectOrder: false })
        : { selected: [], totalDistanceLabel: '待选' };
      state.selectedIds = state.routePlan.selected.map((item) => item.id);
      renderRoute();
      renderRecommendations();
      drawMaps();
      showToast(poi ? `已删除 ${poi.name}` : '已删除点位');
    });
  });
}

function drawMaps() {
  const selectedPois = state.routePlan?.selected?.length
    ? state.routePlan.selected
    : state.selectedIds.map((id) => getPoiById(id)).filter(Boolean);
  const previewPois = state.previewSelectedIds.map((id) => getPoiById(id)).filter(Boolean);
  const selectedPreviewPois = state.previewSelectedIds.length && state.routePlan?.selected?.length
    ? state.routePlan.selected
    : previewPois;
  map11.render({
    origin: state.origin,
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

function openOptionSheet(type) {
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

async function copyInviteLink() {
  const link = 'https://meituan.example/route-room/8273';
  try {
    await navigator.clipboard.writeText(link);
    showToast('邀请链接已复制');
  } catch (error) {
    showToast('已生成邀请链接：8273');
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
  ctx.fillText('周末美食路线', 72, 150);
  ctx.font = '800 30px sans-serif';
  ctx.fillText(`房间码 ${state.roomCode || '8273'}`, 72, 224);
  ctx.fillText('周六 14:00 · 美食 · 最多5人', 72, 286);
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
  ctx.fillText('高分餐厅 + 饭后甜品', 126, 790);
  ctx.font = '700 26px sans-serif';
  ctx.fillText('扫码加入，一起补充偏好', 126, 840);

  const link = document.createElement('a');
  link.download = 'meituan-route-invite-8273.png';
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
    const timer = setTimeout(fallback, 900);
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
        { enableHighAccuracy: true, timeout: 900, maximumAge: 30_000 },
      );
    } catch (error) {
      clearTimeout(timer);
      fallback();
    }
  });
}

function createMapAdapter(canvas, onPointClick) {
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
    return [
      { lat: origin.lat + 0.0038, lng: origin.lng - 0.0062, name: 'X', fill: '#ff8a1f', glow: 'rgba(255, 138, 31, 0.24)' },
      { lat: origin.lat - 0.0024, lng: origin.lng - 0.0044, name: 'Y', fill: '#28b978', glow: 'rgba(40, 185, 120, 0.24)' },
      { lat: origin.lat + 0.0016, lng: origin.lng + 0.0058, name: 'L', fill: '#8a63df', glow: 'rgba(138, 99, 223, 0.24)' },
    ];
  }

  function getCenterPoint(points) {
    return {
      lat: points.reduce((sum, item) => sum + item.lat, 0) / points.length,
      lng: points.reduce((sum, item) => sum + item.lng, 0) / points.length,
      name: '中心',
    };
  }

  function drawMemberRoutes(origin) {
    const memberPoints = [
      ...getMemberPoints(origin).sort((a, b) => a.lng - b.lng),
    ];
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
      const safeOrigin = origin || { lat: 39.905, lng: 116.391 };
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
  };
}

bootstrap();
})();
