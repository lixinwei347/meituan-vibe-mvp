# meituan-vibe-mvp

美团黑客松多人共创路线 MVP。前端 HTML + CSS + vanilla JS，后端 Express + WebSocket + SQLite。

## 团队分工

| 人 | 负责 |
|----|------|
| B | 路线规划（screen 04-12）、房间系统、WebSocket、豆包AI路线推荐 |
| A | 实时行程卡（screen 13、15）、评论 |
| 我 (Jan) | 共享相册 + 探店手帐 + journal 后端(SQLite) + 豆包视觉AI |

## 项目结构

```
meituan-vibe-mvp/
├── index.html          ← 主页面，所有 screen（04-19）
├── styles.css          ← 全部视觉样式
├── app.js              ← 前端状态管理、页面跳转（B/A 主导）
├── real-api.js         ← 真实后端 API 客户端（替代 mock-api.js）
├── route-patch.css     ← 路线相关补丁样式
├── server/             ← 队友后端（Express + WebSocket，端口3000）
│   ├── index.js
│   ├── config.js
│   ├── lib/
│   │   ├── amapSearch.js    ← 高德地图 API
│   │   └── roomStore.js     ← 房间存储（内存Map）
│   ├── routes/
│   │   ├── rooms.js         ← 房间 CRUD
│   │   ├── pois.js          ← POI 推荐 + 豆包AI
│   │   ├── route.js         ← 路线规划 + 豆包AI
│   │   └── location.js      ← 定位
│   └── ws/
│       └── server.js        ← WebSocket 实时同步
├── docs/               ← 设计文档
├── tests/              ← 测试
├── CLAUDE.md / AGENT.md / AGENTS.md
└── journal/            ← 手帐模块（我独立开发）
    ├── README.md
    ├── frontend/
    │   ├── standalone.html
    │   ├── album/       ← 共享相册（独立页面）
    │   └── journal/     ← 探店手帐（独立页面）
    └── backend/         ← 手帐后端（Express + SQLite，端口4181）
        ├── src/
        │   ├── index.js
        │   ├── db.js    ← SQLite 数据库
        │   ├── ai.js    ← 豆包视觉模型
        │   └── routes/
        └── uploads/
```

## 架构

- 前端：原生三件套，单页面多屏结构
- `app.js` 里 `state.screen = 'XX'` 控制当前页面
- 两个独立后端：
  - **meituan-server** (端口3000)：房间管理、路线规划、POI、WebSocket
  - **journal-api** (端口4181)：照片存储、手帐、评论、豆包视觉AI
- 独立页面（album/journal）通过 `window.location.href` 跳转

## 屏幕流程

| Screen | 名称 | 负责 |
|--------|------|------|
| 04 | 地图入口 | B |
| 05 | 创建/加入房间 | B |
| 06 | 创建房间设置 | B |
| 07 | 邀请好友 | B |
| 08 | 位置与偏好 | B |
| 09 | 成员偏好汇总 | B |
| 10 | AI 路线生成中 | B |
| 11 | AI 路线推荐 | B |
| 12 | 调整确认行程 | B |
| 13 | 实时行程卡 | A |
| 14 | 共享相册（嵌入式） | B |
| 15 | 评论浮层 | A |
| 18 | 手帐（嵌入式） | B |

**独立页面**（通过 app.js 跳转）：
- 共享相册 → `journal/frontend/album/album.html`
- 探店手帐 → `journal/frontend/journal/journal.html`

## 队友核心功能

- **共享 Draft**：多人同时选 POI，实时看到别人的选择
- **AI Bundle**：豆包 AI 生成 POI 套餐推荐卡片
- **WebSocket**：房间成员实时同步（加入/偏好/Draft）
- **高德地图**：POI 搜索、路线规划、定位
- **房间系统**：4位房间码、昵称、成员管理

## 我的手帐模块

- **共享相册**：FormData 上传、3秒轮询、点赞、弹幕评论
- **探店手帐**：画布卡片、拖拽缩放、模板切换（清新/复古/ins）
- **SQLite 存储**：照片元数据、评论、弹幕、AI 卡片
- **豆包视觉 AI**：上传照片→后台识图→生成标题+文案+标签
- **分享卡片**：预览 + 下载 PNG

## 部署

服务器：腾讯云 `211.159.160.11`，SSH `tripnote`

```
/var/www/meituan-vibe/     ← 前端
/opt/journal-backend/      ← 手帐后端 (pm2: journal-api, 端口4181)
/opt/meituan-server/       ← 队友后端 (pm2: meituan-server, 端口3000)
```

nginx 路由：
```
/meituan/       → 前端静态文件
/meituan-api/   → 127.0.0.1:4181 (手帐后端)
/api/           → 127.0.0.1:3000 (队友后端)
/ws             → 127.0.0.1:3000 (WebSocket)
```

## 本地开发

```bash
cd ~/Documents/meituan-vibe-mvp
python3 -m http.server 4180   # 前端
cd journal/backend && npm start  # 手帐后端
```

访问：
- 主项目：`http://localhost:4180/index.html`
- 共享相册：`http://localhost:4180/journal/frontend/album/album.html?tripId=1111`
- 探店手帐：`http://localhost:4180/journal/frontend/journal/journal.html?tripId=1111`
