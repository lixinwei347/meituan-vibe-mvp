# Journal 模块

美团黑客松的**共享相册 + AI 手帐**模块，负责行程执行中及结束后的照片管理与记忆沉淀。

## 职责范围

| 子模块 | 对应主项目 Screen | 功能 |
|--------|------------------|------|
| 共享相册 | screen-14 | 拍照上传、照片流展示、点赞 |
| AI 手帐 | screen-18 | 路线回顾、精选照片、评价摘录、模板切换、保存分享 |

## 与主界面的交互

```
index.html 主流程                         journal/ 模块
═══════════════════════════════════════════════════════

screen-13 实时行程卡
  ├─ 点「相册」Tab ─────────────→  album/album.html?tripId=xxx
  └─ 点「结束」→「生成手帐」 ───→  journal/journal.html?tripId=xxx

screen-04 首页
  └─ 历史行程卡片 ──────────────→  journal/journal.html?tripId=xxx
```

主项目 `app.js` 通过 `window.location.href` 带着 `tripId` 参数跳转。照片通过 `localStorage` 在相册和手帐之间共享（key: `album_${tripId}`）。

## 目录结构

```
journal/
├── README.md
├── frontend/                  ← 纯静态页面
│   ├── standalone.html        ← 开发预览入口
│   ├── album/                 ← 共享相册（screen-14）
│   │   ├── album.html         ← 从 index.html screen-14 提取的 HTML
│   │   ├── album.css          ← 从 styles.css 提取的样式
│   │   └── album.js           ← 照片上传、localStorage 存取、点赞
│   └── journal/               ← AI 手帐（screen-18）
│       ├── journal.html       ← 从 index.html screen-18 提取的 HTML
│       ├── journal.css        ← 从 styles.css 提取的样式
│       └── journal.js         ← 手帐渲染、模板切换、保存图片
└── backend/                   ← Node.js 后端（Express，端口 4181）
    ├── package.json
    ├── uploads/               ← 开发阶段照片（gitignore）
    └── src/
        ├── index.js           ← Express 入口
        ├── routes/
        │   ├── album.js       ← 共享相册 API（multer 上传）
        │   └── journal.js     ← 手帐 API（数据汇总、模板）
        └── mock/
            └── data.js        ← Mock 数据（内存存储）
```

## 当前状态

**照片存储**：使用 `localStorage`，不上传服务器，换浏览器/清缓存会丢失。后续可替换为对象存储（COS）。

**手帐渲染**：mock 数据 + localStorage 照片，暂未接 AI 生成。

## 开发

```bash
# 本地前端
cd meituan-vibe-mvp
python3 -m http.server 4180
# 打开 http://localhost:4180/journal/frontend/standalone.html

# 本地后端
cd journal/backend
npm start
```

前端自动检测环境：localhost 时调 `http://localhost:4181`，服务器上走 `/meituan-api/`。

## 部署

服务器：腾讯云 `211.159.160.11`（SSH 别名 `tripnote`）

```
/var/www/meituan-vibe/              ← 前端（nginx alias）
/opt/journal-backend/               ← 后端（pm2: journal-api, 端口 4181）
```

nginx 路由（80 端口）：

| 路径 | 目标 |
|------|------|
| `/meituan/` | 前端静态文件 |
| `/meituan-api/` | 后端 `127.0.0.1:4181` |

部署命令：

```bash
rsync -avz --exclude '.git' --exclude 'journal/backend/node_modules' . tripnote:/var/www/meituan-vibe/
```
