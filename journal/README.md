# Journal 模块

美团黑客松的**共享相册 + AI 手帐**模块。独立于主项目开发，独立部署。

## 职责范围

| 子模块 | 对应主项目 | 功能 |
|--------|----------|------|
| 共享相册 | screen-14（已删除，改独立页面） | 多人拍照上传、图片直播、点赞、弹幕评论 |
| AI 手帐 | screen-18（跳转独立页面） | 画布卡片、模板切换、拖拽缩放、保存图片 |

## 与主界面的交互

```
主项目 index.html                          journal/ 模块
═══════════════════════════════════════════════════════

screen-13 实时行程卡
  ├─ 点「相册」Tab ─────────────→  album/album.html?tripId=xxx&userName=xxx
  └─ 点「结束」→「生成手帐」 ───→  journal/journal.html?tripId=xxx

screen-04 首页
  └─ 历史行程卡片 ──────────────→  journal/journal.html?tripId=xxx
```

跳转通过 `window.location.href`，携带 `tripId`（= 房间码）和 `userName` 参数。
后退时传 `?room=xxx#13`，主应用恢复房间状态并显示行程卡。

---

## 目录结构

```
journal/
├── README.md
├── frontend/
│   ├── standalone.html           ← 开发预览入口
│   ├── album/                    ← 共享相册
│   │   ├── album.html
│   │   ├── album.css             ← 美团风格（与主应用一致）
│   │   └── album.js
│   └── journal/                  ← AI 手帐
│       ├── journal.html
│       ├── journal.css           ← test_page 牛皮纸风格
│       └── journal.js
└── backend/
    ├── data.db                   ← SQLite 数据库（gitignore）
    ├── package.json
    ├── uploads/                  ← 照片文件（gitignore）
    └── src/
        ├── index.js              ← Express 入口，端口 4181
        ├── db.js                 ← 建表 + 种子数据 + 查询
        ├── routes/
        │   ├── album.js          ← 照片上传/点赞/弹幕 API
        │   └── journal.js        ← 手帐数据汇总 API
        └── mock/
            └── data.js           ← Mock 数据（已弃用，保留兼容）
```

---

## 共享相册

### 数据流

```
浏览器拍照 → FormData POST → Express multer → uploads/ 存文件
                                               ↓
                                          SQLite 存元数据
                                               ↓
          其他用户 ← 3秒轮询 GET ←─── API 返回照片列表
```

### 关键设计

- **房间隔离**：`tripId` = 房间码，数据库按 `trip_id` 隔离
- **实时同步**：3 秒轮询，增量对比（ID Set），有变化才刷新 DOM
- **上传方式**：`FormData` 传原始文件（不用 base64，避免 JSON 过大）
- **降级策略**：API 不通时自动回退 localStorage

### 弹幕评论

- 照片预览时显示在照片上方横条内
- `requestAnimationFrame` 驱动动画，GPU 加速（`transform: translateX`）
- 2 条轨道，互不遮挡
- 新弹幕即时显示，不等待服务器

---

## AI 手帐

### 设计思路

照搬 test_page 的 UI 风格，无 AI 阶段用模板引擎生成文案。

### 画布

- 牛皮纸底纹，700px 宽画布
- 照片卡片以 `canvas-sticker` 样式散落排列
- 支持单指拖拽 + 双指捏合缩放（0.35x ~ 2.0x）
- 右上角 +/- 按钮、双击重置

### 模板引擎

3 套文案模板，每种模板为不同店铺类型编写特定文案：

```
清新 fresh  → 温柔治愈风    "一场温柔的漫游"
复古 retro  → 文艺怀旧风    "老饕手记·寻味"
ins风 ins   → 活泼潮流风    "✨ VIBE 探店日记"
```

店铺匹配规则：火锅 / 咖啡 / 甜品 / 酒吧 / 通用

### 数据源

```
1. journal API (/api/trips/:id/journal) → 优先
2. album API  (/api/trips/:id/photos)   → 备选
3. mock 数据                              → 降级
```

### 卡片详情

点击画布卡片展开：
- 大图
- 模板生成的标题 + 文案
- 标签
- 弹幕评论
- 上一张/下一张切换

---

## 数据库

### 表结构

```sql
photos (
  id INTEGER PRIMARY KEY, trip_id TEXT, url TEXT, data_url TEXT,
  title TEXT, uploader_name TEXT, likes INTEGER, tone TEXT, created_at TEXT
)

photo_comments (
  id INTEGER PRIMARY KEY, trip_id TEXT, photo_id INTEGER,
  user_name TEXT, text TEXT, created_at TEXT
)

reviews (
  id INTEGER PRIMARY KEY, trip_id TEXT, user_name TEXT,
  text TEXT, mood TEXT, target_stop_id TEXT, created_at TEXT
)
```

- `photos` 存照片元数据；`url` 指向 `uploads/` 文件，`data_url` 存 base64
- `photo_comments` 照片弹幕
- `reviews` 店铺评论（目前仅种子数据）

### 种子数据

首次启动时自动插入 `trip001` 的 4 张 mock 照片和 6 条 mock 评论。

---

## API 端点

```
GET    /api/health                       ← 健康检查
GET    /api/trips/:tripId                ← 行程概览
GET    /api/trips/:tripId/photos         ← 照片列表
POST   /api/trips/:tripId/photos         ← 上传照片
POST   /api/photos/:photoId/like         ← 点赞
GET    /api/photos/:photoId/comments     ← 弹幕列表
POST   /api/photos/:photoId/comments     ← 发弹幕
GET    /api/trips/:tripId/reviews        ← 评论列表
POST   /api/trips/:tripId/reviews        ← 发评论
GET    /api/trips/:tripId/journal        ← 手帐所需全部数据
POST   /api/trips/:tripId/journal/generate ← 生成手帐（1.5s 模拟延迟）
GET    /api/templates                    ← 手帐模板列表
```

---

## 开发

```bash
# 本地前端
cd meituan-vibe-mvp
python3 -m http.server 4180

# 本地后端
cd journal/backend
npm start

# 打开
# 相册: http://localhost:4180/journal/frontend/album/album.html?tripId=1111&userName=小明
# 手帐: http://localhost:4180/journal/frontend/journal/journal.html?tripId=1111
# 预览: http://localhost:4180/journal/frontend/standalone.html
```

前端自动检测环境：localhost 时调 `http://localhost:4181`，服务器上走 `/meituan-api/`。

---

## 部署

服务器：腾讯云 `211.159.160.11`（SSH 别名 `tripnote`）

```
/var/www/meituan-vibe/              ← 前端（rsync 同步）
/opt/journal-backend/               ← 后端（pm2: journal-api，端口 4181）
```

nginx 路由：
```
/meituan/       → /var/www/meituan-vibe/（静态文件）
/meituan-api/   → 127.0.0.1:4181（proxy_pass 到后端）
```

部署命令：
```bash
# 前端
rsync -avz --exclude '.git' --exclude 'journal/backend/node_modules' \
  ~/Documents/meituan-vibe-mvp/ tripnote:/var/www/meituan-vibe/

# 后端
rsync -avz --exclude 'node_modules' --exclude 'uploads' --exclude 'data.db*' \
  ~/Documents/meituan-vibe-mvp/journal/backend/ tripnote:/opt/journal-backend/

# 重启
ssh tripnote 'pm2 restart journal-api'
```

---

## TODO

- [ ] 手帐接真实 AI 生成（Claude API），替代模板规则
- [ ] 手帐 3 种模板 CSS 视觉风格完全联动
- [ ] 照片文件接腾讯云 COS 对象存储
- [ ] 分享接大众点评/微信/小红书
- [ ] 手帐保存图片 html2canvas → 服务端渲染
- [ ] 弹幕实时同步（目前仅本地即时显示，其他人刷新才看到）
