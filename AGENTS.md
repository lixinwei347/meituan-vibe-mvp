# meituan-vibe-mvp

美团黑客松多人共创路线 MVP。纯前端静态项目（HTML + CSS + vanilla JS），单页面多屏结构。

## 团队分工

| 人 | 负责 |
|----|------|
| B | 路线规划（screen 04-12）、房间系统 |
| A | 实时行程卡（screen 13、15）、评论 |
| 我 (Jan) | 共享相册 + AI 手帐 + 独立后端 |

## 项目结构

```
meituan-vibe-mvp/
├── index.html          ← 主页面，包含所有 screen（04-19）
├── styles.css          ← 全部视觉样式（72KB）
├── app.js              ← 前端状态管理、页面跳转、Canvas 地图（78KB）
├── mock-api.js         ← Mock 后端接口（window.MockApi，7KB）
├── tests/              ← 静态检查 + 端到端测试 + 路线算法测试
├── AGENTS.md           ← 本文档
├── AGENT.md            ← 与 AGENTS.md 同步
└── journal/            ← 手帐模块（我独立开发）
    ├── README.md
    ├── frontend/       ← 共享相册 + AI 手帐页面
    └── backend/        ← Node.js Express 后端
```

## 架构

- 无框架，原生三件套
- 所有页面在一个 `index.html` 里，每个 screen 是 `class="screen screen-XX hidden"`
- `app.js` 里 `state.screen = 'XX'` 控制当前页面，`render()` 统一切换 hidden
- `window.MockApi` 是 mock 接口层，定义在 `mock-api.js`
- 手机壳样式：CSS 变量 `--app-scale` 控制缩放，默认 390×844px

## CSS 变量系统

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
| 14 | 共享相册 | → 跳转 journal | 点底部「相册」Tab |
| 15 | 评论浮层 | A | 点底部「评论」Tab |
| 18 | AI 手帐 | → 跳转 journal | 结束行程→"确认生成电子手帐" |
| 19 | 照片预览 | 手帐 | 点手帐里的照片 |

**Screen 14 和 18 已改为 `window.location.href` 跳转到 `journal/frontend/` 下的独立页面。**

screen 16、17 不存在（跳号）。end-trip-dialog 是浮层弹窗，不是 screen。

## app.js 核心 state

```js
state = {
  screen: '04',           // 当前显示的 screen
  filters: [...],         // POI 筛选条件
  activeFilter: '综合最优',
  recommendations: [],    // 当前推荐的 POI
  selectedIds: [],        // 已选中的 POI id
  previewIds: [],         // 预览选中的 POI id（screen-11）
  routePlan: null,        // planRoute() 返回的路线对象
  selectedPrefs: {...},   // 用户偏好配置
  roomCode: '',           // 房间码
  members: [...],         // 当前房间成员
  tripStarted: false,     // 行程是否已开始
  tripEnded: false,       // 行程是否已结束
  currentTripId: null,    // 当前行程 ID
  albumPhotos: [...],     // 共享相册照片
  tripBarrage: [...],     // 行程弹幕评论
  storeComments: {...},   // 每个店铺的评论
  notebook: null,         // 手帐数据对象
  historyTrips: [],       // 历史行程列表
  showEndDialog: false,   // 是否显示结束行程弹窗
  endTripChoice: 'notebook', // 结束方式选择
  mediaViewer: { index: 0 }, // 照片预览状态
}
```

## 手帐模块（journal/）

独立开发，独立部署。详细见 `journal/README.md`。

### 前端

- HTML/CSS 从 `index.html` screen-14/18 和 `styles.css` 直接提取，视觉效果与主项目一致
- `album.js`：照片上传（FileReader→base64→localStorage）、渲染、点赞
- `journal.js`：手帐渲染（mock stops + localStorage 照片 + mock 评论）、模板切换、保存图片

### localStorage 数据结构

```js
// key: album_${tripId}
[
  {
    id: 'photo-xxx',
    dataUrl: 'data:image/jpeg;base64,...',  // base64 图片
    title: '照片标题',
    uploader: '我',
    likes: 0,
    tone: 'peach',     // peach | mint | pink | blue
    badge: '新',       // 新 | live | 封面 | LIVE
    time: '14:35',
  }
]
```

### 后端

- Express + multer，端口 4181
- 照片上传走 localStorage（不走后端）
- 后端目前主要用于：mock 数据、手帐汇总、模板列表

### 与主项目交互

`app.js` 中三处跳转（仅这三处被修改）：

```
行 448: el.openAlbum        → journal/frontend/album/album.html?tripId=xxx
行 951: confirmEndTrip      → journal/frontend/journal/journal.html?tripId=xxx
行 1104: history cards      → journal/frontend/journal/journal.html?tripId=xxx
```

环境自动检测：
```js
const API = window.location.hostname === 'localhost'
  ? 'http://localhost:4181'
  : '/meituan-api';
```

## 部署

服务器：腾讯云 `211.159.160.11`，Ubuntu 22.04，用户 ubuntu

SSH：`ssh tripnote`（别名定义在 `~/.ssh/config`）

### 目录

```
/var/www/meituan-vibe/              ← 前端（整个项目目录）
/opt/journal-backend/               ← 手帐后端
```

### 进程守护

| 进程 | 工具 | 端口 |
|------|------|------|
| journal-api | pm2 | 4181 |
| nginx | systemd | 80/8080/9090 |

### nginx 路由（80 端口）

```
/meituan/       → /var/www/meituan-vibe/（静态文件）
/meituan-api/   → 127.0.0.1:4181（手帐后端）
/tripnote/      → /var/www/tripnote/（他人项目）
```

### 部署命令

```bash
rsync -avz --exclude '.git' --exclude 'journal/backend/node_modules' \
  ~/Documents/meituan-vibe-mvp/ tripnote:/var/www/meituan-vibe/
```

## 本地开发

```bash
# 终端1：前端
cd ~/Documents/meituan-vibe-mvp
python3 -m http.server 4180

# 终端2：手帐后端
cd ~/Documents/meituan-vibe-mvp/journal/backend
npm start

# 终端3：打开 Codex
cd ~/Documents/meituan-vibe-mvp
Codex
```

访问：
- 主项目：`http://localhost:4180/index.html`
- 手帐预览：`http://localhost:4180/journal/frontend/standalone.html`
- 共享相册：`http://localhost:4180/journal/frontend/album/album.html?tripId=trip001`
- AI 手帐：`http://localhost:4180/journal/frontend/journal/journal.html?tripId=trip001`

## 已知问题 / TODO

- [ ] 照片存 localStorage，不同浏览器/设备不共享。后续接腾讯云 COS
- [ ] 手帐 AI 生成目前是 mock 数据拼装，未接真实 AI
- [ ] 3 种手帐模板只有 mock 样式切换（清新/复古/ins），CSS 变量未完全实现
- [ ] 分享目前用系统分享 API 和剪贴板，未接大众点评/微信/小红书
- [ ] 手帐保存图片依赖 html2canvas CDN
- [ ] app.js 中 screen-14/18 的 DOM 元素还在 index.html 里，只是不再使用
- [ ] server 有两个 echotrace-backend（v1/v2），v1 已挂（pm2 errored）
