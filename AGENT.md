# meituan-vibe-mvp

美团黑客松多人共创路线 MVP。纯前端静态项目（HTML + CSS + vanilla JS），单页面多屏结构。

## 团队分工

| 人 | 负责 |
|----|------|
| B | 路线规划（screen 04-12）、房间系统 |
| A | 实时行程卡（screen 13、15）、评论 |
| 我 (Jan) | 共享相册 + 探店手帐 + 独立后端 |

## 项目结构

```
meituan-vibe-mvp/
├── index.html          ← 主页面，包含所有 screen（04-19，14 已删除）
├── styles.css          ← 全部视觉样式
├── app.js              ← 前端状态管理、页面跳转、Canvas 地图
├── mock-api.js         ← Mock 后端接口（window.MockApi）
├── tests/              ← 静态检查 + 端到端测试 + 路线算法测试
├── CLAUDE.md           ← 本文档
├── AGENT.md            ← 与 CLAUDE.md 同步
└── journal/            ← 手帐模块（我独立开发）
    ├── README.md
    ├── frontend/
    │   ├── standalone.html      ← 开发预览入口
    │   ├── album/               ← 共享相册（独立页面）
    │   │   ├── album.html
    │   │   ├── album.css
    │   │   └── album.js
    │   └── journal/             ← 探店手帐（独立页面）
    │       ├── journal.html
    │       ├── journal.css
    │       └── journal.js
    └── backend/                 ← Node.js Express 后端
        ├── data.db              ← SQLite 数据库（gitignore）
        ├── package.json
        ├── uploads/             ← 照片文件（gitignore）
        └── src/
            ├── index.js         ← Express 入口，端口 4181
            ├── db.js            ← 数据库初始化 + 查询
            ├── routes/
            │   ├── album.js     ← 照片上传/点赞/评论 API
            │   └── journal.js   ← 手帐数据汇总 API
            └── mock/
                └── data.js      ← Mock 数据（已弃用，保留兼容）
```

## 架构

- 无框架，原生三件套
- 所有页面在一个 `index.html` 里，每个 screen 是 `class="screen screen-XX hidden"`
- `app.js` 里 `state.screen = 'XX'` 控制当前页面，`render()` 统一切换 hidden
- `window.MockApi` 是 mock 接口层，定义在 `mock-api.js`
- screen-14（旧内嵌相册）已删除，改为跳转独立 `album.html`
- 独立页面（album/journal）使用 `.app-shell > .phone` 结构与主应用一致

## CSS 变量

**主应用（美团风格）**：
```css
:root {
  --bg: #fff8df;          --shell: #fff9e8;
  --text: #141414;        --muted: #666;
  --orange: #ff5a22;      --yellow: #ffd100;
  --yellow-strong: #ffcc00;  --yellow-soft: #fff4c2;
  --border: #e8e2d3;
  --peach: #fff1ec;       --mint: #eaf7f1;
  --pink: #fff1f6;        --blue: #f0f4ff;
  --app-scale: 1;
}
```

**手帐模块（test_page 牛皮纸风格）**：
```css
:root {
  --paper: #f1e4cf;       --paper-light: #fff8ea;
  --paper-mid: #efe0c8;   --ink: #2f3329;
  --muted: #6f604c;       --teal: #245a55;
  --stamp: #b94e3b;       --gold: #d5b36f;
  --line: #d7c6a8;
}
```

## 屏幕流程

| Screen | 名称 | 负责 | 入口 |
|--------|------|------|------|
| 04 | 地图入口 | B | 首页 |
| 05 | 创建/加入房间 | B | 点"发起多人共创" |
| 06 | 创建房间设置 | B | 点"创建新房间" |
| 07 | 邀请好友 | B | 保存房间设置后 |
| 08 | 位置与偏好 | B | 开始填写偏好 |
| 09 | 成员偏好汇总 | B | 提交偏好后 |
| 10 | AI 路线生成中 | B | 点"生成路线" |
| 11 | AI 路线推荐 | B | 生成完成后 |
| 12 | 调整确认行程 | B | 点"下一步" |
| 13 | 实时行程卡 | A | 点"确认行程" |
| 14 | ~~共享相册~~ | **已删除** | screen-14 HTML 已移除 |
| 15 | 评论浮层 | A | 点底部「评论」Tab |
| 18 | 探店手帐 | → 跳转 journal | 结束行程→"确认生成电子手帐" |
| 19 | 照片预览 | 手帐 | 点手帐里的照片 |

**Screen 14** 的 HTML 已从 `index.html` 删除。相册功能迁移到 `journal/frontend/album/album.html`，通过 `window.location.href` 跳转，携带 `tripId` 和 `userName` 参数。

---

## 🔧 共享相册（album/）

### 技术栈
- **前端**：vanilla JS，FormData 上传，3 秒轮询，无框架
- **后端**：Express + multer，端口 4181
- **存储**：SQLite（`data.db`），照片文件存 `uploads/` 目录

### 功能
| 功能 | 实现 |
|------|------|
| 照片上传 | `FormData` POST 到后端，multer 存盘 |
| 实时同步 | 前端 `setInterval` 3 秒轮询 GET 列表 |
| 多人共享 | 同一 `tripId` 看到同一房间照片 |
| 点赞 | `POST /api/photos/:id/like`，更新 SQLite |
| 弹幕评论 | 照片预览时飘过弹幕，`POST /api/photos/:id/comments` |
| 离线降级 | API 不通时回退到 localStorage |

### 数据库表
```sql
photos (id, trip_id, url, data_url, title, uploader_name, likes, tone, created_at)
photo_comments (id, trip_id, photo_id, user_name, text, created_at)
reviews (id, trip_id, user_name, text, mood, target_stop_id, created_at)
```

### API 端点
```
GET    /api/trips/:tripId/photos        ← 照片列表
POST   /api/trips/:tripId/photos        ← 上传照片（multipart 或 base64）
POST   /api/photos/:photoId/like        ← 点赞
GET    /api/photos/:photoId/comments    ← 弹幕列表
POST   /api/photos/:photoId/comments    ← 发弹幕
GET    /api/trips/:tripId/reviews       ← 评论列表
POST   /api/trips/:tripId/reviews       ← 发评论
```

### 房间识别
- URL 参数 `tripId` = 房间码
- 主应用跳转时传 `?tripId={roomCode}&userName={名字}`
- 后退时传 `?room={roomCode}#13` 回到主应用正确房间

---

## ✍️ 探店手帐（journal/）

### 设计
照搬 test_page 的 UI 风格：牛皮纸配色、画布卡片、暖色系。

### 功能
| 功能 | 实现 |
|------|------|
| 画布布局 | 照片卡片散落在牛皮纸上，带旋转偏移 |
| 拖拽缩放 | `pointerdown/move/up` 拖拽，双指捏合缩放 |
| 卡片详情 | 点击卡片展开：大图 + 标题 + 文案 + 标签 + 评论 |
| 模板引擎 | 3 套模板（清新/复古/ins），规则生成文案 |
| 数据源 | 优先 journal API → album API → mock 降级 |
| 保存图片 | html2canvas 导出 PNG |

### 模板引擎
每个模板对不同类型的店铺（火锅/咖啡/甜品/酒吧）有不同文案规则：
```
火锅 → "热气腾腾的第{num}站" / "锅底沸腾的那一刻..."
咖啡 → "下午{num}点的咖啡时光" / "阳光穿过窗户，洒在杯沿..."
甜品 → "第{num}口甜" / "生活需要一点甜..."
```

---

## 部署

服务器：腾讯云 `211.159.160.11`，Ubuntu 22.04，用户 ubuntu
SSH：`ssh tripnote`

### 目录
```
/var/www/meituan-vibe/              ← 前端（整个项目目录）
/opt/journal-backend/               ← 手帐后端
```

### 进程
| 进程 | 工具 | 端口 |
|------|------|------|
| journal-api | pm2 | 4181 |
| nginx | systemd | 80 |

### nginx 路由
```
/meituan/       → /var/www/meituan-vibe/（静态文件）
/meituan-api/   → 127.0.0.1:4181（手帐后端，proxy_pass）
/tripnote/      → /var/www/tripnote/（他人项目）
```

### 部署命令
```bash
# 全量同步前端
rsync -avz --exclude '.git' --exclude 'journal/backend/node_modules' \
  ~/Documents/meituan-vibe-mvp/ tripnote:/var/www/meituan-vibe/

# 全量同步后端
rsync -avz --exclude 'node_modules' --exclude 'uploads' --exclude 'data.db*' \
  ~/Documents/meituan-vibe-mvp/journal/backend/ tripnote:/opt/journal-backend/

# 重启后端
ssh tripnote 'pm2 restart journal-api'
```

### nginx 注意
- JS/CSS 缓存已关闭（`expires -1`），方便开发调试
- `client_max_body_size 25m`，支持大照片上传

---

## 本地开发

```bash
# 终端1：前端
cd ~/Documents/meituan-vibe-mvp
python3 -m http.server 4180

# 终端2：后端
cd ~/Documents/meituan-vibe-mvp/journal/backend
npm start

# 终端3：Claude Code
cd ~/Documents/meituan-vibe-mvp
claude
```

访问：
- 主项目：`http://localhost:4180/index.html`
- 共享相册：`http://localhost:4180/journal/frontend/album/album.html?tripId=1111&userName=小明`
- AI 手帐：`http://localhost:4180/journal/frontend/journal/journal.html?tripId=1111`
- 开发预览：`http://localhost:4180/journal/frontend/standalone.html`

---

## 已知问题 / TODO

- [ ] 3 种手帐模板 CSS 视觉风格完全联动
- [ ] 照片文件接腾讯云 COS 对象存储
- [ ] 手帐保存图片 html2canvas → 服务端渲染
- [ ] 3 种手帐模板只影响文案风格，CSS 视觉风格未完全联动
- [ ] 分享目前用系统分享 API 和剪贴板，未接大众点评/微信/小红书
- [ ] 手帐保存图片依赖 html2canvas CDN
- [ ] server 有两个 echotrace-backend（v1/v2），v1 已挂（pm2 errored）
- [ ] 照片文件存服务器磁盘，后续可接腾讯云 COS

## 最近更新

- 2026-06-04：共享相册 + 手帐模块完整实现
  - SQLite 数据库替代 localStorage
  - 多人实时共享（轮询 + 弹幕）
  - 手帐画布拖拽缩放
  - 模板引擎文案生成
  - 删除废弃 screen-14，修复房间码传递链路
