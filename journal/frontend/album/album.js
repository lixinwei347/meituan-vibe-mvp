(function () {
  const API = window.location.hostname === 'localhost' ? 'http://localhost:4181' : '/meituan-api';
  const TRIP_ID = getTripId();
  const USER_NAME = getUserName();
  const POLL_INTERVAL = 3000; // 3 秒轮询

  // 用于检测新照片
  let lastPhotoIds = new Set();
  let lastLikeCounts = {};
  let currentPhotos = []; // 当前照片列表，供预览使用

  const el = {
    pickCard: document.getElementById('album-pick-card'),
    cameraCard: document.getElementById('album-camera-card'),
    pickBottom: document.getElementById('album-pick-bottom'),
    cameraBottom: document.getElementById('album-camera-bottom'),
    fileInput: document.getElementById('album-file-input'),
    cameraInput: document.getElementById('album-camera-input'),
    backBtn: document.querySelector('.trip-back'),
    photoGrid: document.getElementById('photo-grid'),
    albumCount: document.getElementById('album-count'),
    liveStatus: document.querySelector('.album-live-status'),
    previewOverlay: document.getElementById('photo-preview'),
    previewImg: document.getElementById('preview-img'),
    previewInfo: document.getElementById('preview-info'),
    previewClose: document.getElementById('preview-close'),
    previewPrev: document.getElementById('preview-prev'),
    previewNext: document.getElementById('preview-next'),
    danmakuLayer: document.getElementById('danmaku-stage'),
    previewCommentInput: document.getElementById('preview-comment-input'),
    previewCommentSend: document.getElementById('preview-comment-send'),
  };

  // ===== URL 参数解析 =====
  function getTripId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('tripId') || 'trip001';
  }

  function getUserName() {
    var params = new URLSearchParams(window.location.search);
    return params.get('userName') || '我';
  }

  // ===== API 调用 =====
  async function fetchPhotos() {
    try {
      var res = await fetch(API + '/api/trips/' + TRIP_ID + '/photos');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      return data.photos || [];
    } catch (err) {
      console.warn('[album] 获取照片失败:', err.message);
      return null;
    }
  }

  // 用 FormData 上传原始文件（不用 base64，文件太大 JSON 传不过去）
  async function uploadPhotoAPI(file, title, tone) {
    try {
      var formData = new FormData();
      formData.append('photo', file);
      formData.append('title', title || '未命名');
      formData.append('uploaderName', USER_NAME);
      formData.append('tone', tone || 'peach');

      var res = await fetch(API + '/api/trips/' + TRIP_ID + '/photos', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        var errText = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + errText);
      }
      var data = await res.json();
      return data.photo;
    } catch (err) {
      console.error('[album] 上传失败:', err.message);
      return null;
    }
  }

  async function likePhotoAPI(photoId) {
    try {
      var res = await fetch(API + '/api/photos/' + photoId + '/like', { method: 'POST' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      return data.photo;
    } catch (err) {
      console.warn('[album] 点赞失败:', err.message);
      return null;
    }
  }

  // ===== 构建照片图片 URL =====
  function photoSrc(p) {
    // 优先级：本地 base64 > 后端文件路径
    if (p.dataUrl || p.data_url) return p.dataUrl || p.data_url;
    if (p.url) {
      // 后端返回的 url 如 "/uploads/photo-xxx.jpg"
      // 需要补上 API 前缀
      if (p.url.indexOf('http') === 0) return p.url;
      return API + p.url;
    }
    return '';
  }

  // ===== 是否有变化 =====
  function hasChanges(photos) {
    var currentIds = new Set(photos.map(function(p) { return String(p.id); }));
    if (currentIds.size !== lastPhotoIds.size) return true;

    // 检测新增
    var ids = Array.from(currentIds);
    for (var i = 0; i < ids.length; i++) {
      if (!lastPhotoIds.has(ids[i])) return true;
    }

    // 检测点赞数变化
    var newLikeCounts = {};
    for (var j = 0; j < photos.length; j++) {
      newLikeCounts[photos[j].id] = photos[j].likes || 0;
    }
    var likeKeys = Object.keys(newLikeCounts);
    for (var k = 0; k < likeKeys.length; k++) {
      var key = likeKeys[k];
      if (newLikeCounts[key] !== (lastLikeCounts[key] || 0)) return true;
    }

    return false;
  }

  // ===== 初始化 =====
  async function init() {
    // 显示用户身份
    var tag = document.getElementById('album-user-tag');
    if (tag) tag.textContent = '👤 ' + USER_NAME;

    // 按钮绑定（null-safe）
    if (el.pickCard) {
      el.pickCard.addEventListener('click', function() { el.fileInput.click(); });
      el.pickBottom.addEventListener('click', function() { el.fileInput.click(); });
      el.cameraCard.addEventListener('click', function() { el.cameraInput.click(); });
      el.cameraBottom.addEventListener('click', function() { el.cameraInput.click(); });
    }
    if (el.fileInput) {
      el.fileInput.addEventListener('change', function() { handleFiles(el.fileInput.files, '相册'); });
    }
    if (el.cameraInput) {
      el.cameraInput.addEventListener('change', function() { handleFiles(el.cameraInput.files, '拍照'); });
    }

    // 返回按钮 → 回到主应用，带上当前房间信息
    if (el.backBtn) {
      el.backBtn.addEventListener('click', function() {
        var base = window.location.hostname === 'localhost' ? '../../index.html' : '/meituan/index.html';
        window.location.href = base + '?room=' + encodeURIComponent(TRIP_ID) + '#13';
      });
    }

    // 预览浮层事件
    if (el.previewClose) {
      el.previewClose.addEventListener('click', closePreview);
      el.previewOverlay.addEventListener('click', function(e) {
        if (e.target === el.previewOverlay) closePreview();
      });
      el.previewPrev.addEventListener('click', function(e) { e.stopPropagation(); prevPhoto(); });
      el.previewNext.addEventListener('click', function(e) { e.stopPropagation(); nextPhoto(); });
    }
    // 评论发送
    if (el.previewCommentSend) {
      el.previewCommentSend.addEventListener('click', sendComment);
    }
    if (el.previewCommentInput) {
      el.previewCommentInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); sendComment(); }
      });
    }

    document.addEventListener('keydown', function(e) {
      if (!el.previewOverlay || el.previewOverlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') closePreview();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    });

    // 首次加载
    await loadAndRender();
    // 开始轮询
    startPolling();

    console.log('[album] 房间=' + TRIP_ID + ' 用户=' + USER_NAME + ' API=' + API);
  }

  async function loadAndRender() {
    var photos = await fetchPhotos();

    if (photos && photos.length > 0) {
      lastPhotoIds = new Set(photos.map(function(p) { return String(p.id); }));
      updateLikeCounts(photos);
      renderPhotos(photos);
      setStatus('◉', '图片直播中 · 多人实时同步');
    } else if (photos && photos.length === 0) {
      renderEmpty();
      setStatus('◉', '还没有照片，快来上传第一张');
    } else {
      renderEmpty();
      setStatus('◎', '无法连接服务器，请刷新重试');
    }
  }

  function setStatus(icon, text) {
    if (el.liveStatus) {
      el.liveStatus.innerHTML = '<span>' + icon + '</span>' + text;
    }
  }

  // ===== 轮询 =====
  function startPolling() {
    setInterval(async function() {
      var photos = await fetchPhotos();
      if (!photos) return; // API 不通，跳过

      if (hasChanges(photos)) {
        lastPhotoIds = new Set(photos.map(function(p) { return String(p.id); }));
        updateLikeCounts(photos);
        renderPhotos(photos);
      }
    }, POLL_INTERVAL);
  }

  function updateLikeCounts(photos) {
    lastLikeCounts = {};
    for (var i = 0; i < photos.length; i++) {
      lastLikeCounts[photos[i].id] = photos[i].likes || 0;
    }
  }

  // ===== 上传处理 =====
  async function handleFiles(files, source) {
    if (!files.length) return;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      console.log('[album] 准备上传:', file.name, (file.size / 1024 / 1024).toFixed(1) + 'MB');

      if (file.size > 20 * 1024 * 1024) {
        toast('⚠ 照片不能超过 20MB');
        continue;
      }

      var title = file.name.replace(/\.[^.]+$/, '');
      var tone = ['peach', 'mint', 'pink', 'blue'][Math.floor(Math.random() * 4)];

      toast('正在上传…');

      // 用 FormData 上传原始文件
      var photo = await uploadPhotoAPI(file, title, tone);

      if (photo) {
        toast('✅ 已上传');
        // 立即刷新列表
        var photos = await fetchPhotos();
        if (photos) {
          lastPhotoIds = new Set(photos.map(function(p) { return String(p.id); }));
          updateLikeCounts(photos);
          renderPhotos(photos);
        }
      } else {
        toast('❌ 上传失败，请检查网络后重试');
      }
    }

    el.fileInput.value = '';
    el.cameraInput.value = '';
  }

  // ===== 点赞 =====
  async function handleLike(photoId) {
    var photo = await likePhotoAPI(photoId);

    if (photo) {
      var btn = document.querySelector('[data-like="' + photoId + '"]');
      if (btn) {
        btn.innerHTML = '♡ ' + photo.likes;
      }
    }
    toast('♡ 已点赞');
  }

  // ===== 渲染 =====
  function renderPhotos(photos) {
    currentPhotos = photos;
    el.albumCount.textContent = photos.length + '张';

    if (!photos.length) {
      renderEmpty();
      return;
    }

    el.photoGrid.innerHTML = photos.map(function(p) { return buildPhotoCard(p); }).join('');
    bindLikes();
    bindPreviews();
  }

  function renderEmpty() {
    el.albumCount.textContent = '0张';
    el.photoGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);font-size:14px;">📷<br>还没有照片<br>点击上方按钮上传第一张</div>';
  }

  function buildPhotoCard(p) {
    var id = p.id;
    var tone = p.tone || 'peach';
    var likes = p.likes || 0;
    var uploaderName = p.uploaderName || p.uploader_name || p.uploader || '匿名';
    var time = '';
    if (p.createdAt) {
      time = new Date(p.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (p.time) {
      time = p.time;
    }
    var imgSrc = photoSrc(p);
    var bgStyle = imgSrc
      ? 'style="background-image: linear-gradient(180deg, rgba(255,255,255,.15), rgba(255,255,255,.45)), url(\'' + imgSrc + '\')"'
      : '';

    return '' +
      '<article class="photo-card photo-card--' + tone + '" ' + bgStyle + '>' +
        '<div class="photo-card-top">' +
          '<span>' + esc(uploaderName) + '</span>' +
          '<button class="photo-like" data-like="' + id + '" type="button" aria-label="点赞">♡ ' + likes + '</button>' +
        '</div>' +
        '<div>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p>' + esc(uploaderName) + ' · ' + esc(time) + '</p>' +
        '</div>' +
      '</article>';
  }

  function bindLikes() {
    var buttons = el.photoGrid.querySelectorAll('[data-like]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function(e) {
        e.stopPropagation();
        handleLike(this.dataset.like);
      });
    }
  }

  // 绑定卡片点击 → 预览
  function bindPreviews() {
    var cards = el.photoGrid.querySelectorAll('.photo-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function() {
        var photoId = this.querySelector('[data-like]').dataset.like;
        openPreview(photoId);
      });
    }
  }

  // ===== 照片预览 =====
  var previewIndex = 0;

  function openPreview(photoId) {
    for (var i = 0; i < currentPhotos.length; i++) {
      if (String(currentPhotos[i].id) === String(photoId)) {
        previewIndex = i;
        break;
      }
    }
    showPreviewImage();
    loadPreviewComments(photoId);
    el.previewOverlay.classList.remove('hidden');
    // 聚焦输入框
    setTimeout(function() {
      if (el.previewCommentInput) el.previewCommentInput.focus();
    }, 300);
  }

  function closePreview() {
    stopAllDanmaku();
    el.previewOverlay.classList.add('hidden');
  }

  function showPreviewImage() {
    stopAllDanmaku();
    var p = currentPhotos[previewIndex];
    if (!p) return;
    var src = photoSrc(p);
    el.previewImg.src = src || '';
    el.previewImg.alt = p.title || '';
    el.previewInfo.textContent = (p.title || '') + ' — ' + (p.uploaderName || p.uploader_name || '') + ' ♡ ' + (p.likes || 0);
    el.previewPrev.style.visibility = previewIndex > 0 ? 'visible' : 'hidden';
    el.previewNext.style.visibility = previewIndex < currentPhotos.length - 1 ? 'visible' : 'hidden';
    // 清空输入
    if (el.previewCommentInput) el.previewCommentInput.value = '';
    // 加载新照片的评论
    loadPreviewComments(String(p.id));
  }

  function prevPhoto() {
    if (previewIndex > 0) { previewIndex--; showPreviewImage(); }
  }

  function nextPhoto() {
    if (previewIndex < currentPhotos.length - 1) { previewIndex++; showPreviewImage(); }
  }

  // ===== 弹幕（requestAnimationFrame 驱动）=====
  var danmakuRunners = [];
  var usedRows = [false, false]; // 两条轨道

  function stopAllDanmaku() {
    for (var i = 0; i < danmakuRunners.length; i++) {
      danmakuRunners[i].stop = true;
    }
    danmakuRunners = [];
    usedRows = [false, false];
    if (el.danmakuLayer) el.danmakuLayer.innerHTML = '';
  }

  function getFreeRow() {
    if (!usedRows[0]) return 0;
    if (!usedRows[1]) return 1;
    return Math.random() < 0.5 ? 0 : 1;
  }

  function startDanmaku(text, name) {
    var div = document.createElement('div');
    div.className = 'danmaku-item';
    div.textContent = (name || '匿名') + ': ' + text;
    // 先放到屏幕外，让浏览器计算宽度
    div.style.transform = 'translateX(9999px)';
    el.danmakuLayer.appendChild(div);
    // 强制浏览器布局
    var textW = div.offsetWidth;

    // 选空闲轨道（2行，上8px / 下36px，完美适配64px舞台）
    var row = getFreeRow();
    usedRows[row] = true;
    div.style.top = row === 0 ? '8px' : '36px';

    var stageW = el.danmakuLayer.offsetWidth;
    var x = stageW; // 从右边缘开始
    div.style.transform = 'translateX(' + x + 'px)';

    var speed = 50; // 像素/秒，舒适慢速
    var runner = { div: div, stop: false, row: row };
    var lastTime = performance.now();

    function frame(now) {
      if (runner.stop) {
        if (div.parentNode) div.parentNode.removeChild(div);
        usedRows[runner.row] = false;
        return;
      }
      var dt = Math.min((now - lastTime) / 1000, 0.1); // 防止大帧跳跃
      lastTime = now;
      x -= speed * dt;

      if (x < -textW - 10) {
        if (div.parentNode) div.parentNode.removeChild(div);
        usedRows[runner.row] = false;
        var idx = danmakuRunners.indexOf(runner);
        if (idx >= 0) danmakuRunners.splice(idx, 1);
        return;
      }
      div.style.transform = 'translateX(' + Math.round(x) + 'px)';
      requestAnimationFrame(frame);
    }

    danmakuRunners.push(runner);
    requestAnimationFrame(frame);
  }

  async function loadPreviewComments(photoId) {
    if (!el.danmakuLayer) return;
    stopAllDanmaku();
    try {
      var res = await fetch(API + '/api/photos/' + photoId + '/comments');
      if (!res.ok) throw new Error('Failed');
      var data = await res.json();
      var comments = data.comments || [];
      for (var i = 0; i < comments.length; i++) {
        var c = comments[i];
        // 每个弹幕间隔 3 秒，给前一条留足飘出时间
        setTimeout((function(comment) {
          return function() { startDanmaku(comment.text, comment.userName); };
        })(c), i * 3000);
      }
    } catch (err) { /* 静默 */ }
  }

  async function sendComment() {
    var text = (el.previewCommentInput.value || '').trim();
    if (!text) return;
    var p = currentPhotos[previewIndex];
    if (!p) return;

    startDanmaku(text, USER_NAME);
    el.previewCommentInput.value = '';

    try {
      var res = await fetch(API + '/api/photos/' + p.id + '/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: USER_NAME, text: text, tripId: TRIP_ID }),
      });
    } catch (err) { /* 静默 */ }
  }

  // ===== 工具函数 =====
  function esc(str) {
    if (!str) return '';
    return ('' + str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; });
    setTimeout(function() { t.remove(); }, 2500);
  }

  init();
})();
