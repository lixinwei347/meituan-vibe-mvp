(function () {
  var API = window.location.hostname === 'localhost' ? 'http://localhost:4181' : '/meituan-api';
  var TRIP_ID = getTripId();
  var currentTemplate = 'fresh';
  var cards = [];
  var detailIndex = 0;
  var journalCover = null;
  var generationInFlight = false;

  function getSessionStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
    } catch (error) {}
    return null;
  }

  function readSessionValue(key) {
    var storage = getSessionStorage();
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeSessionValue(key, value) {
    var storage = getSessionStorage();
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch (error) {}
  }

  // ===== 画布拖拽 & 缩放 =====
  var canvasZoom = 0.58;
  var canvasPan = { x: 0, y: 0 };
  var canvasDragState = null;
  var canvasPointers = new Map();
  var canvasPinchState = null;

  var el = {
    canvasView: document.getElementById('canvas-view'),
    detailView: document.getElementById('detail-view'),
    canvasContainer: document.getElementById('journal-canvas'),
    canvasTransform: document.getElementById('canvas-transform'),
    canvasCards: document.getElementById('canvas-cards'),
    journalTitle: document.getElementById('journal-title'),
    journalSubtitle: document.getElementById('journal-subtitle'),
    btnBack: document.getElementById('btn-back'),
    btnHome: document.getElementById('btn-home'),
    btnShare: document.getElementById('btn-share'),
    btnSave: document.getElementById('btn-save'),
    templateRow: document.getElementById('template-row'),
    detailPhoto: document.getElementById('detail-photo'),
    detailKicker: document.getElementById('detail-kicker'),
    detailHeading: document.getElementById('detail-heading'),
    detailText: document.getElementById('detail-text'),
    detailTags: document.getElementById('detail-tags'),
    detailComments: document.getElementById('detail-comments'),
    detailLikes: document.getElementById('detail-likes'),
    detailTitle: document.getElementById('detail-title'),
    detailSubtitle: document.getElementById('detail-subtitle'),
    btnDetailBack: document.getElementById('btn-detail-back'),
    btnDetailPrev: document.getElementById('btn-detail-prev'),
    btnDetailNext: document.getElementById('btn-detail-next'),
    photoPopover: document.getElementById('photo-popover'),
    photoPopoverBg: document.getElementById('photo-popover-bg'),
    photoPopoverClose: document.getElementById('photo-popover-close'),
    photoPopoverImage: document.getElementById('photo-popover-image'),
    photoPopoverKicker: document.getElementById('photo-popover-kicker'),
    photoPopoverTitle: document.getElementById('photo-popover-title'),
    photoPopoverText: document.getElementById('photo-popover-text'),
    photoPopoverTags: document.getElementById('photo-popover-tags'),
  };

  // ==================== 模板引擎 ====================
  var TEMPLATES = {
    fresh: {
      name: '清新', coverTitle: '探店手帐',
      stopTemplates: [
        { match: '火锅', title: '热气腾腾的第{num}站', text: '锅底沸腾的那一刻，所有等待都值得。{name}的{feature}，人均¥{price}。{comment}' },
        { match: '咖啡', title: '下午{num}点的咖啡时光', text: '阳光穿过窗户，洒在杯沿。{name}，{feature}，这一刻慢下来就很好。{comment}' },
        { match: '甜品', title: '第{num}口甜', text: '{name}的{feature}。生活需要一点甜，人均¥{price}，这口刚刚好。{comment}' },
        { match: '酒吧|小酒馆|酒', title: '微醺的第{num}站', text: '夜色降临，{name}的{feature}。有人在这里把故事讲完。{comment}' },
        { match: '*', title: '旅途第{num}站：{name}', text: '{feature}。这是旅途里值得被记住的一站。{comment}' },
      ],
    },
    retro: {
      name: '复古', coverTitle: '老饕手记',
      stopTemplates: [
        { match: '火锅', title: '老店寻味 · 第{num}回', text: '{name}，京城老味道。{feature}，¥{price}一人。汤头翻滚间，是几代人的舌尖记忆。{comment}' },
        { match: '咖啡', title: '午后小记 · 第{num}杯', text: '穿过胡同，拐进{name}。{feature}，像极了老电影里的某个下午。{comment}' },
        { match: '甜品', title: '甜蜜旧事 · 第{num}味', text: '{name}的{feature}，¥{price}。甜是这座城市最温柔的口音。{comment}' },
        { match: '酒吧|小酒馆|酒', title: '夜色手帖 · 第{num}盏', text: '入夜，{name}的{feature}。一杯敬今晚，一杯敬同行。{comment}' },
        { match: '*', title: '旅途札记 · 第{num}页', text: '{name}。{feature}。这段记忆会泛黄，但不会褪色。{comment}' },
      ],
    },
    ins: {
      name: 'ins风', coverTitle: '探店日记',
      stopTemplates: [
        { match: '火锅', title: '🔥 第{num}家 必打卡火锅', text: '{name}直接封神！{feature}，¥{price}吃到撑。随手一拍就是爆款。{comment}' },
        { match: '咖啡', title: '☕️ 第{num}家 超出片咖啡馆', text: '{name}！{feature}！氛围感拉满，朋友圈素材+1。{comment}' },
        { match: '甜品', title: '🍰 第{num}家 甜品界天花板', text: '{name}！{feature}！¥{price}！冲就完了！{comment}' },
        { match: '酒吧|小酒馆|酒', title: '🍸 第{num}家 氛围感酒吧', text: '{name}，{feature}。氛围感直接拉满，收尾必选。{comment}' },
        { match: '*', title: '📍 第{num}站 必收藏', text: '{name}——{feature}。收藏不亏，去了就知道。{comment}' },
      ],
    },
  };

  function getStopTemplate(stopName) {
    var tmpls = TEMPLATES[currentTemplate].stopTemplates;
    for (var i = 0; i < tmpls.length; i++) {
      if (tmpls[i].match === '*') continue;
      if (new RegExp(tmpls[i].match, 'i').test(stopName)) return tmpls[i];
    }
    return tmpls[tmpls.length - 1];
  }

  function fill(str, vars) {
    var s = str;
    for (var k in vars) { if (vars.hasOwnProperty(k)) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k] || ''); }
    return s;
  }

  // ===== 画布变换 =====
  function applyCanvasTransform() {
    if (!el.canvasTransform) return;
    el.canvasTransform.style.transform = 'translate(' + Math.round(canvasPan.x) + 'px, ' + Math.round(canvasPan.y) + 'px) scale(' + canvasZoom.toFixed(2) + ')';
  }

  function clampCanvasPan(p, z) {
    z = z || canvasZoom;
    var maxX = 700 * z * 0.5;
    var maxY = 800 * z * 0.4;
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  }

  function setCanvasZoom(z) {
    canvasZoom = Math.min(2.0, Math.max(0.35, Number(z.toFixed(2))));
    canvasPan = clampCanvasPan(canvasPan, canvasZoom);
    applyCanvasTransform();
  }

  function centerCanvasInView(contentWidth, contentHeight) {
    if (!el.canvasContainer) return;
    var viewportWidth = el.canvasContainer.clientWidth || 390;
    var viewportHeight = el.canvasContainer.clientHeight || 560;
    canvasPan = {
      x: Math.round((viewportWidth - contentWidth * canvasZoom) / 2),
      y: Math.round((viewportHeight - contentHeight * canvasZoom) / 2),
    };
    applyCanvasTransform();
  }

  function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }

  function startCanvasDrag(e) {
    canvasPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (canvasPointers.size === 2) {
      var pts = Array.from(canvasPointers.values());
      canvasPinchState = { startDist: dist(pts[0], pts[1]), startZoom: canvasZoom, startPan: { x: canvasPan.x, y: canvasPan.y } };
      canvasDragState = null;
      return;
    }
    canvasDragState = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, panX: canvasPan.x, panY: canvasPan.y };
    el.canvasContainer.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveCanvasDrag(e) {
    if (canvasPointers.has(e.pointerId)) canvasPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (canvasPinchState && canvasPointers.size >= 2) {
      var pts = Array.from(canvasPointers.values()).slice(0, 2);
      var ratio = dist(pts[0], pts[1]) / Math.max(1, canvasPinchState.startDist);
      setCanvasZoom(canvasPinchState.startZoom * ratio);
      canvasPan = clampCanvasPan(canvasPinchState.startPan, canvasZoom);
      applyCanvasTransform();
      return;
    }
    if (!canvasDragState) return;
    canvasPan = clampCanvasPan({
      x: canvasDragState.panX + e.clientX - canvasDragState.startX,
      y: canvasDragState.panY + e.clientY - canvasDragState.startY
    });
    applyCanvasTransform();
  }

  function endCanvasDrag(e) {
    if (e && e.pointerId) canvasPointers.delete(e.pointerId);
    if (canvasPointers.size < 2) canvasPinchState = null;
    canvasDragState = null;
    el.canvasContainer.classList.remove('dragging');
  }

  // ==================== 数据加载 ====================

  function getTripId() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('tripId');
    // 如果是默认值 trip001 且 URL 里没有显式传，尝试从 sessionStorage 恢复
    if (!id || id === 'trip001') {
      var saved = readSessionValue('meituan_room');
      if (saved) return saved;
    }
    return id || 'trip001';
  }

  function getReturnTo() {
    var params = new URLSearchParams(window.location.search);
    return params.get('returnTo') || '13';
  }

  function mainAppUrl(screen) {
    var base = window.location.hostname === 'localhost' ? '../../../index.html' : '/meituan/index.html';
    var suffix = screen ? '#' + encodeURIComponent(screen) : '';
    writeSessionValue('meituan_room', TRIP_ID);
    writeSessionValue('vibe_roomCode', TRIP_ID);
    writeSessionValue('meituan_return_screen', screen || '13');
    return base + suffix;
  }

  function updateViewportScale() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.innerWidth <= 430) {
      document.documentElement.style.setProperty('--app-scale', '1');
      return;
    }
    var scale = Math.min((window.innerWidth - 32) / 390, (window.innerHeight - 32) / 844, 1);
    document.documentElement.style.setProperty('--app-scale', String(Math.max(0.72, scale)));
  }

  function photoSrc(p) {
    if (p.dataUrl || p.data_url) return p.dataUrl || p.data_url;
    if (p.url) {
      if (p.url.indexOf('http') === 0) return p.url;
      return API + p.url;
    }
    if (p.photoUrl) return p.photoUrl;
    return '';
  }

  async function init() {
    updateViewportScale();
    window.addEventListener('resize', updateViewportScale);

    el.btnBack.addEventListener('click', function() {
      window.location.href = mainAppUrl(getReturnTo());
    });
    el.btnHome.addEventListener('click', function() {
      window.location.href = (window.location.hostname === 'localhost' ? '../../../index.html' : '/meituan/index.html');
    });
    el.btnShare.addEventListener('click', handleShare);
    el.btnSave.addEventListener('click', handleSave);

    // 分享预览按钮
    var btnClose = document.getElementById('share-btn-close');
    var btnSaveImg = document.getElementById('share-btn-save');
    if (btnClose) btnClose.addEventListener('click', closeShare);
    if (btnSaveImg) btnSaveImg.addEventListener('click', saveShareCard);

    // 点击背景关闭
    var shareBg = document.querySelector('.share-overlay-bg');
    if (shareBg) shareBg.addEventListener('click', closeShare);

    // 刷新手帐按钮
    var btnRefresh = document.getElementById('btn-refresh');
    var loadingOverlay = document.getElementById('loading-overlay');
    var loadingText = document.getElementById('loading-text');
    var loadingProgress = document.getElementById('loading-progress');
    if (btnRefresh) btnRefresh.addEventListener('click', function() { runJournalGeneration({ force: true }); });

    el.btnDetailBack.addEventListener('click', showCanvas);
    el.btnDetailPrev.addEventListener('click', prevCard);
    el.btnDetailNext.addEventListener('click', nextCard);
    if (el.photoPopoverBg) el.photoPopoverBg.addEventListener('click', closePhotoPopover);
    if (el.photoPopoverClose) el.photoPopoverClose.addEventListener('click', closePhotoPopover);

    // 画布拖拽 & 缩放
    var zoomInBtn = document.getElementById('canvas-zoom-in');
    var zoomOutBtn = document.getElementById('canvas-zoom-out');
    var zoomResetBtn = document.getElementById('canvas-zoom-reset');
    if (zoomInBtn) zoomInBtn.addEventListener('click', function() { setCanvasZoom(canvasZoom + 0.15); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', function() { setCanvasZoom(canvasZoom - 0.15); });
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', function() { canvasZoom = 0.58; canvasPan = { x: 0, y: 0 }; applyCanvasTransform(); });

    if (el.canvasContainer && !el.canvasContainer.classList.contains('journal-canvas--sheet')) {
      el.canvasContainer.addEventListener('pointerdown', startCanvasDrag);
      el.canvasContainer.addEventListener('pointermove', moveCanvasDrag);
      el.canvasContainer.addEventListener('pointerup', endCanvasDrag);
      el.canvasContainer.addEventListener('pointercancel', endCanvasDrag);
      el.canvasContainer.addEventListener('pointerleave', endCanvasDrag);
      // 双击重置
      el.canvasContainer.addEventListener('dblclick', function() {
        canvasZoom = 0.58; canvasPan = { x: 0, y: 0 }; applyCanvasTransform();
      });
    }

    if (el.templateRow) {
      el.templateRow.addEventListener('click', function(e) {
        var chip = e.target.closest('.template-chip');
        if (!chip) return;
        var t = chip.dataset.template;
        if (t === currentTemplate) return;
        currentTemplate = t;
        // 更新按钮状态
        var chips = el.templateRow.querySelectorAll('.template-chip');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
        chip.classList.add('active');
        // 更新画布主题
        if (el.canvasContainer) {
          el.canvasContainer.classList.remove('template-fresh', 'template-retro', 'template-ins');
          el.canvasContainer.classList.add('template-' + t);
        }
        // 重新生成文案并渲染
        buildCardsFromData();
        renderCanvas();
      });
    }

    // 加载真实数据
    var photos = [], stops = [], reviews = [];
    var trip = null;
    var apiOk = false;
    try {
      var apiUrl = API + '/api/trips/' + TRIP_ID + '/journal?_=' + Date.now();
      var res = await fetch(apiUrl);
      if (res.ok) {
        var data = await res.json();
        trip = data.trip || null;
        photos = data.photos || [];
        reviews = data.reviews || [];
        stops = trip && Array.isArray(trip.stops) ? trip.stops : [];
        apiOk = true;
      }
    } catch (e) {
      console.warn('[journal] API fetch failed:', e.message || e);
    }
    // 如果 journal API 没照片，单独查 album API
    if (!apiOk || !photos.length) {
      try {
        var albumRes = await fetch(API + '/api/trips/' + TRIP_ID + '/photos?_=' + Date.now());
        if (albumRes.ok) { var ad = await albumRes.json(); photos = ad.photos || []; apiOk = true; }
      } catch (e2) {}
    }
    // 只有演示 trip001 才使用 mock 照片；弹幕/评论必须只来自真实用户数据
    if ((!apiOk || !photos.length) && TRIP_ID === 'trip001') {
      photos = getMockPhotos();
      reviews = [];
    }

    // 优先使用当前房间最终路线；没有路线时才从真实照片生成临时站点
    if (!stops.length && photos.length) {
      stops = photos.map(function(p, i) {
        var name = p.title || p.uploaderName || p.uploader_name || '';
        return { id: 'photo-' + i, name: name || ('第' + (i + 1) + '张'), price: '--', feature: p.uploaderName || p.uploader_name || '', tags: [] };
      });
    }

    console.log('[journal] TRIP_ID=' + TRIP_ID + ' photos=' + photos.length + ' stops=' + stops.length);

    // 更新统计标题
    el.journalSubtitle.textContent = photos.length + ' 张照片' + (reviews.length ? ' · ' + reviews.length + ' 条评论' : '');

    // 初始模板主题
    if (el.canvasContainer) el.canvasContainer.classList.add('template-fresh');

    buildCards(photos, stops, reviews);
    renderCanvas();

    if ((photos.length && photos.some(function(p) { return !(p.aiTitle || p.ai_title) || !(p.aiNarrative || p.ai_narrative); })) || (!photos.length && stops.length)) {
      setTimeout(function() { runJournalGeneration({ force: false }); }, 350);
    }
  }

  async function runJournalGeneration(options) {
    options = options || {};
    if (generationInFlight || (!_rawPhotos.length && !_rawStops.length)) return;

    var btnRefresh = document.getElementById('btn-refresh');
    var loadingOverlay = document.getElementById('loading-overlay');
    var loadingText = document.getElementById('loading-text');
    var loadingProgress = document.getElementById('loading-progress');
    var progressFill = document.getElementById('loading-progress-fill');
    var phases = [
      '读取当前房间行程…',
      '整理共享相册照片…',
      '生成每张照片故事…',
      '排版手帐页面…',
    ];
    var phaseIndex = 0;
    var percent = 8;
    var timer = null;

    function setProgress(value, text) {
      percent = Math.max(percent, Math.min(96, value));
      if (progressFill) progressFill.style.width = percent + '%';
      if (loadingProgress) loadingProgress.textContent = text || (percent + '%');
    }

    generationInFlight = true;
    if (btnRefresh) btnRefresh.classList.add('loading');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    if (loadingText) loadingText.textContent = options.force ? '正在重新生成手帐…' : '正在生成本次手帐…';
    setProgress(8, phases[0]);

    timer = setInterval(function() {
      phaseIndex = Math.min(phases.length - 1, phaseIndex + 1);
      setProgress(percent + 18, phases[phaseIndex]);
    }, 1100);

    try {
      var res = await fetch(API + '/api/trips/' + TRIP_ID + '/journal/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: currentTemplate }),
      });
      if (!res.ok) {
        var errData = await res.json();
        throw new Error(errData.error || '生成失败');
      }
      var data = await res.json();
      applyGeneratedJournal(data.journal || {});

      if (timer) clearInterval(timer);
      if (loadingText) loadingText.textContent = '手帐已更新';
      if (progressFill) progressFill.style.width = '100%';
      if (loadingProgress) loadingProgress.textContent = _rawPhotos.length ? (_rawPhotos.length + ' 张照片已排版') : (_rawStops.length + ' 个站点已排版');
      renderCanvas();

      setTimeout(function() {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        if (btnRefresh) btnRefresh.classList.remove('loading');
        generationInFlight = false;
      }, 900);
    } catch (err) {
      if (timer) clearInterval(timer);
      if (loadingText) loadingText.textContent = err.message || '生成失败';
      if (loadingProgress) loadingProgress.textContent = '可以稍后点“重新生成”再试';
      setTimeout(function() {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        if (btnRefresh) btnRefresh.classList.remove('loading');
        generationInFlight = false;
      }, 1800);
    }
  }

  function applyGeneratedJournal(journal) {
    cards = [];
    var generatedCards = journal.cards || [];
    var sourceCount = _rawStops.length || _rawPhotos.length || generatedCards.length;
    for (var i = 0; i < sourceCount; i++) {
      var ac = generatedCards[i] || {};
      var p = _rawPhotos[i] || {};
      var si = _rawStops.length ? Math.min(i, _rawStops.length - 1) : i;
      var stop = _rawStops[si] || {};
      var visualSource = Object.assign({}, stop, p);
      cards.push({
        id: stop.id || p.id || ('stop-' + (si + 1)),
        title: ac.title || p.aiTitle || p.ai_title || stop.name || p.title || '探店记录',
        text: ac.narrative || p.aiNarrative || p.ai_narrative || '这一刻值得收进手帐',
        photoSrc: photoSrc(visualSource),
        tone: p.tone || 'peach',
        uploaderName: p.uploaderName || p.uploader_name || '',
        likes: p.likes || 0,
        tags: ac.tags || [],
        stopName: stop.name || p.title || '',
        relatedReviews: getReviewsForStop(stop),
        stopNum: si + 1,
        aiGenerated: true,
      });
    }

    journalCover = journal.cover || null;
    var countText = _rawPhotos.length ? (_rawPhotos.length + '张') : (_rawStops.length + '站');
    el.journalTitle.textContent = ((journalCover && journalCover.title) || TEMPLATES[currentTemplate].coverTitle) + ' · ' + countText;
    el.journalSubtitle.textContent = (journalCover && journalCover.subtitle) || (_rawPhotos.length ? (_rawPhotos.length + ' 张照片') : (_rawStops.length + ' 个站点'));
  }

  // ==================== 构建卡片 ====================

  var _rawPhotos = [], _rawStops = [], _rawReviews = [];

  function buildCards(photos, stops, reviews) {
    _rawPhotos = photos; _rawStops = stops; _rawReviews = reviews;
    buildCardsFromData();
  }

  function buildCardsFromData() {
    var photos = _rawPhotos, stops = _rawStops, reviews = _rawReviews;
    var sourceCount = stops.length || photos.length;
    cards = [];
    for (var i = 0; i < sourceCount; i++) {
      var p = photos[i] || {};
      var si = stops.length ? Math.min(i, stops.length - 1) : i;
      var stop = stops[si] || {};
      var visualSource = Object.assign({}, stop, p);
      var tmpl = getStopTemplate(stop.name || '');
      var feature = stop.feature || (stop.tags || []).slice(0, 3).join(' / ') || '值得一去';
      var comment = '';
      var relatedReviews = getReviewsForStop(stop);
      if (relatedReviews.length) comment = '「' + relatedReviews[0].text + '」';
      // 优先用已缓存的 AI 数据（上传照片时后台生成的）
      var aiTitle = p.aiTitle || p.ai_title || '';
      var aiNarrative = p.aiNarrative || p.ai_narrative || '';
      var aiTags = [];
      try { aiTags = JSON.parse(p.aiTags || p.ai_tags || '[]'); } catch (e) {}
      var useAi = !!(aiTitle && aiNarrative);

      cards.push({
        id: stop.id || p.id || ('stop-' + (si + 1)),
        title: useAi ? aiTitle : fill(tmpl.title, { num: String(si + 1), name: stop.name || p.title || '', feature: feature, price: stop.price || '??', comment: comment }),
        text: useAi ? aiNarrative : fill(tmpl.text, { num: String(si + 1), name: stop.name || p.title || '', feature: feature, price: stop.price || '??', comment: comment }),
        photoSrc: photoSrc(visualSource),
        tone: p.tone || ['peach','mint','pink','blue'][i % 4],
        uploaderName: p.uploaderName || p.uploader_name || p.uploader || '',
        likes: p.likes || 0,
        tags: useAi ? aiTags : (stop.tags || ['探店','美食','旅行']).slice(0, 3),
        stopName: stop.name || '',
        relatedReviews: relatedReviews,
        stopNum: si + 1,
        aiGenerated: useAi,
      });
    }
  }

  // ==================== 画布 ====================

  function getJournalTime() {
    var d = new Date();
    return '今天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function getRouteHeadline() {
    var names = cards.map(function(c) { return c.stopName || c.title; }).filter(Boolean).slice(0, 3);
    return names.length ? names : ['共享相册', '探店瞬间', '成员回忆'];
  }

  function getMemoLines() {
    var lines = [];
    if (_rawReviews.length) {
      for (var i = 0; i < _rawReviews.length && lines.length < 5; i++) {
        var r = _rawReviews[i];
        if (!r.text) continue;
        lines.push({
          label: r.mood || r.userName || '行程弹幕',
          text: r.text,
        });
      }
    }
    return lines;
  }

  function getReviewsForStop(stop) {
    return _rawReviews.filter(function(r) {
      if (!r.text) return false;
      if (!r.targetStopId) return true;
      return stop && stop.id && r.targetStopId === stop.id;
    });
  }

  function renderPhotoButton(card, index, className) {
    if (!card) return '';
    var imageStyle = card.photoSrc ? 'style="background-image:url(\'' + card.photoSrc + '\')"' : '';
    return '<button class="' + className + '" data-index="' + index + '" type="button">' +
      '<span class="sheet-photo-step">第' + esc(card.stopNum || index + 1) + '站</span>' +
      '<span class="sheet-photo-image" ' + imageStyle + '></span>' +
      '<strong>' + esc(card.title || card.stopName || '共享相册') + '</strong>' +
    '</button>';
  }

  function getDecorPhotoCards() {
    return cards.filter(function(card) { return !!card.photoSrc; }).slice(0, 2);
  }

  function renderCanvas() {
    if (!cards.length) {
      if (el.canvasContainer) el.canvasContainer.classList.add('is-empty');
      if (el.canvasCards) el.canvasCards.classList.add('is-empty');
      el.canvasCards.innerHTML = '<div class="canvas-empty">' +
        '<div class="canvas-empty-icon">📔</div>' +
        '<h3>空白画布</h3>' +
        '<p>还没有照片，去共享相册拍几张吧</p>' +
        '<p class="canvas-empty-hint">拍照上传后，会自动为每张照片写手帐卡片</p>' +
      '</div>';
      el.journalSubtitle.textContent = '等待第一张照片';
      el.journalTitle.textContent = TEMPLATES[currentTemplate].coverTitle;
      canvasZoom = 0.58;
      centerCanvasInView(700, 800);
      return;
    }

    if (el.canvasContainer) el.canvasContainer.classList.remove('is-empty');
    if (el.canvasCards) el.canvasCards.classList.remove('is-empty');

    var routeNames = getRouteHeadline();
    var memoLines = getMemoLines();
    var stampChars = ['美', '团', '记'];
    var sheetTitle = (journalCover && journalCover.title) || '多人探店手帐';
    var routeList = cards.map(function(c, i) {
      return '<div class="sheet-stop">' +
        '<span>' + (i + 1) + '</span>' +
        '<div><strong>' + esc(c.stopName || c.title || ('第' + (i + 1) + '站')) + '</strong>' +
        '<p>' + esc(c.text || '这一刻值得收进手帐') + '</p></div>' +
      '</div>';
    }).join('');
    var memoHtml = memoLines.length ? memoLines.map(function(item) {
      return '<div class="sheet-memo-line">' +
        '<strong>' + esc(item.label) + '</strong>' +
        '<p>' + esc(item.text) + '</p>' +
      '</div>';
    }).join('') : '<div class="sheet-memo-empty">暂无成员弹幕</div>';
    var photoCards = getDecorPhotoCards();
    var mainPhoto = photoCards[0] || cards[0];
    var miniPhotos = photoCards.slice(1, 2).map(function(c, i) {
      return renderPhotoButton(c, i + 1, 'sheet-mini-photo sheet-mini-photo--' + (c.tone || 'peach'));
    }).join('');

    el.canvasCards.innerHTML =
      '<article class="journal-sheet">' +
        '<header class="sheet-head">' +
          '<div class="sheet-stamps">' + stampChars.map(function(ch) { return '<span>' + ch + '</span>'; }).join('') + '</div>' +
          '<div class="sheet-title-block"><h1>' + esc(sheetTitle) + '</h1><em>' + getJournalTime() + '</em></div>' +
        '</header>' +
        '<section class="sheet-hero">' +
          '<div class="sheet-main-photo-wrap">' + renderPhotoButton(mainPhoto, 0, 'sheet-main-photo') + '</div>' +
          '<div class="sheet-route-wrap">' +
            '<div class="sheet-route-bubble">' + routeNames.map(function(name) { return '<strong>' + esc(name) + ' →</strong>'; }).join('') + '</div>' +
            '<div class="sheet-stop-list">' + routeList + '</div>' +
          '</div>' +
        '</section>' +
        '<section class="sheet-lower">' +
          '<div class="sheet-memos"><h2>行程弹幕</h2>' + memoHtml + '</div>' +
          '<div class="sheet-photo-stack">' + miniPhotos + '</div>' +
        '</section>' +
      '</article>';

    el.journalTitle.textContent = ((journalCover && journalCover.title) || TEMPLATES[currentTemplate].coverTitle) + ' · ' + _rawPhotos.length + '张';

    // 绑定点击
    var stickers = el.canvasCards.querySelectorAll('[data-index]');
    for (var j = 0; j < stickers.length; j++) {
      stickers[j].addEventListener('pointerdown', function(e) {
        e.stopPropagation();
      });
      stickers[j].addEventListener('click', function(e) {
        e.stopPropagation();
        detailIndex = parseInt(this.dataset.index);
        showPhotoPopover(detailIndex);
      });
    }

    applyCanvasTransform();
  }

  // ==================== 卡片详情 ====================

  function showPhotoPopover(index) {
    var c = cards[index];
    if (!c || !el.photoPopover) return;
    detailIndex = index;
    el.photoPopoverImage.style.backgroundImage = c.photoSrc ? 'url(\'' + c.photoSrc + '\')' : '';
    el.photoPopoverKicker.textContent = '第' + c.stopNum + '站';
    el.photoPopoverTitle.textContent = c.title || c.stopName || '探店记录';
    el.photoPopoverText.textContent = c.text || '这一刻值得收进手帐';
    el.photoPopoverTags.innerHTML = (c.tags || []).slice(0, 4).map(function(t) {
      return '<span>' + esc(t) + '</span>';
    }).join('');
    el.photoPopover.classList.remove('hidden');
  }

  function closePhotoPopover() {
    if (!el.photoPopover) return;
    el.photoPopover.classList.add('hidden');
  }

  function showDetail() {
    var c = cards[detailIndex];
    if (!c) return;
    // 模板配色应用到详情
    el.detailView.className = 'screen template-' + currentTemplate;
    el.detailTitle.textContent = c.stopName || '卡片详情';
    el.detailSubtitle.textContent = '第' + (detailIndex + 1) + '张 · ' + TEMPLATES[currentTemplate].name;
    el.detailPhoto.style.backgroundImage = c.photoSrc ? 'url(\'' + c.photoSrc + '\')' : '';
    el.detailKicker.textContent = '第' + c.stopNum + '站';
    el.detailHeading.textContent = c.title;
    el.detailText.textContent = c.text;
    el.detailTags.innerHTML = c.tags.map(function(t) {
      return '<span>' + esc(t) + '</span>';
    }).join('');
    if (c.relatedReviews && c.relatedReviews.length) {
      el.detailComments.innerHTML = '<h3>💬 弹幕</h3>' + c.relatedReviews.map(function(r) {
        return '<div class="detail-comment-item"><strong>' + esc(r.userName || '匿名') + '</strong>：' + esc(r.text) + '</div>';
      }).join('');
    } else { el.detailComments.innerHTML = ''; }
    el.detailLikes.textContent = '♡ ' + c.likes + ' 赞 · ' + esc(c.uploaderName);
    el.btnDetailPrev.style.opacity = detailIndex > 0 ? '1' : '0.3';
    el.btnDetailNext.style.opacity = detailIndex < cards.length - 1 ? '1' : '0.3';
    el.canvasView.classList.add('hidden');
    el.detailView.classList.remove('hidden');
  }

  function showCanvas() {
    el.detailView.classList.add('hidden');
    el.canvasView.classList.remove('hidden');
  }

  function prevCard() { if (detailIndex > 0) { detailIndex--; showDetail(); } }
  function nextCard() { if (detailIndex < cards.length - 1) { detailIndex++; showDetail(); } }

  // ==================== Mock ====================

  function getMockStops() {
    return [
      { id: 'hotpot', name: '潮汕牛肉火锅 西单店', price: 96, feature: '现切牛肉 / 不太辣 / 适合聚餐', tags: ['不太辣','地铁直达','适合聚餐'] },
      { id: 'coffee', name: '城市露台咖啡', price: 42, feature: '露台景观 / 适合拍照 / 安静聊天', tags: ['拍照','可聊天'] },
      { id: 'dessert', name: '漫糖甜品工坊', price: 38, feature: '招牌布丁 / 饭后甜品 / 可打包', tags: ['少排队','适合拍照'] },
      { id: 'bar', name: '湖畔小酒馆', price: 88, feature: '夜景小酌 / 适合收尾', tags: ['夜景','适合收尾'] },
    ];
  }
  function getMockPhotos() {
    return [
      { id: 1, title: '火锅店合照', uploaderName: 'Xinwei', likes: 6, tone: 'peach', dataUrl: '' },
      { id: 2, title: '露台咖啡拉花', uploaderName: 'Yuki', likes: 3, tone: 'mint', dataUrl: '' },
      { id: 3, title: '甜品拼盘九宫格', uploaderName: 'Leo', likes: 8, tone: 'pink', dataUrl: '' },
      { id: 4, title: '湖畔夜景', uploaderName: 'Mia', likes: 5, tone: 'blue', dataUrl: '' },
    ];
  }
  function getMockReviews() {
    return [
      { userName: 'Xinwei', text: '牛肉真的嫩！' }, { userName: 'Yuki', text: '拍照超出片' },
      { userName: 'Leo', text: '四个人刚好' }, { userName: 'Mia', text: '完美收尾' },
    ];
  }
  function getMockMembers() {
    return [
      { id: 'u1', name: 'Xinwei', avatar: 'X', color: '#FFD700' },
      { id: 'u2', name: 'Yuki',   avatar: 'Y', color: '#4CAF50' },
      { id: 'u3', name: 'Leo',    avatar: 'L', color: '#2196F3' },
      { id: 'u4', name: 'Mia',    avatar: 'M', color: '#E91E63' },
    ];
  }

  // ==================== 工具 ====================

  async function handleShare() {
    var overlay = document.getElementById('share-overlay');
    var photoEl = document.getElementById('share-card-photo');
    var titleEl = document.getElementById('share-card-title');
    var statsEl = document.getElementById('share-card-stats');
    var routeEl = document.getElementById('share-card-route');

    // 填数据
    var first = cards[0];
    if (first && first.photoSrc) photoEl.style.backgroundImage = 'url(\'' + first.photoSrc + '\')';
    titleEl.textContent = el.journalTitle.textContent || '探店手帐';
    statsEl.innerHTML = '<span>📷 ' + cards.length + '张</span><span>📍 ' + cards.length + '站</span>';
    routeEl.textContent = cards.map(function(c) { return c.stopName; }).filter(Boolean).slice(0, 4).join(' → ') || '探店路线';

    overlay.classList.remove('hidden');
  }

  function closeShare() {
    document.getElementById('share-overlay').classList.add('hidden');
  }

  async function saveShareCard() {
    toast('正在生成图片…');
    try {
      var h2c = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default;
      var cvs = await h2c(document.getElementById('share-preview-card'), { backgroundColor: null, scale: 2 });
      var link = document.createElement('a');
      link.download = '手帐分享-' + TRIP_ID + '.png';
      link.href = cvs.toDataURL('image/png');
      link.click();
      toast('图片已保存');
    } catch (err) {
      toast('保存失败，请重试');
    }
  }

  async function handleSave() {
    toast('正在生成图片…');
    try {
      var h2c = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default;
      var cvs = await h2c(el.canvasView, { backgroundColor: '#efe0c5', scale: 2 });
      var link = document.createElement('a'); link.download = '手帐-' + TRIP_ID + '.png'; link.href = cvs.toDataURL('image/png'); link.click();
      toast('已保存');
    } catch (err) { window.print(); toast('请使用浏览器保存'); }
  }

  function esc(s) { if (!s) return ''; return ('' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function toast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(30,37,40,0.92);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;';
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(function() { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; });
    setTimeout(function() { t.remove(); }, 2500);
  }

  init();
})();
