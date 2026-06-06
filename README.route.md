# Meituan Vibe MVP - Route Branch

`route` 分支是在原始静态 MVP 的基础上，补齐多人房间协作、后端 API、WebSocket 同步，以及真实 POI / 路线规划调用的一版可联调实现。

这版项目的核心目标不是做完整生产系统，而是把下面这条主链路跑通：

1. 创建或加入房间
2. 成员填写位置与偏好
3. 服务端汇总成员信息
4. 基于真实 POI 搜索与 AI 推荐生成路线候选
5. 多人协同调整共享草稿
6. 共同确认最终行程

## What Changed In `route`

相比原来的 `main` 版本，这个分支新增了几个关键能力：

- 前端不再只依赖纯 mock 数据，改为通过 `real-api.js` 调用后端接口
- 新增 `server/` Node/Express 服务，承载房间、POI、路线规划和 WebSocket
- 新增多人房间状态管理，支持创建房间、加入房间、提交偏好、共享草稿和最终确认
- 新增 WebSocket 实时广播，用于同步成员状态和草稿变化
- 路线推荐支持把成员偏好、成员位置、已选 POI 一起交给后端做综合规划

## Project Structure

主要目录和文件说明：

- `index.html`
  前端页面结构，包含多人路线流程相关页面骨架。

- `styles.css`
  主样式文件，包含现有页面和交互模块的视觉样式。

- `route-patch.css`
  这条分支额外增加的样式补丁，用于在服务端注入并覆盖部分前端表现。

- `app.js`
  前端主逻辑。负责页面切换、房间创建/加入、成员偏好提交、共享草稿编辑、路线确认和 UI 状态同步。

- `real-api.js`
  前端 API 适配层。保留旧接口形态以兼容现有 `app.js`，但内部已经代理真实后端。

- `server/`
  后端服务目录。

- `server/index.js`
  Express 启动入口，挂载静态资源、API 路由和 WebSocket。

- `server/routes/rooms.js`
  房间协作接口：创建房间、加入房间、提交偏好、同步草稿、确认草稿。

- `server/routes/pois.js`
  POI 搜索与推荐接口，负责按成员偏好和位置生成候选点。

- `server/routes/route.js`
  路线规划接口，负责输出路线结果、步行段信息和 AI 推荐理由。

- `server/lib/amapSearch.js`
  地图 / POI 搜索能力封装。

- `server/lib/roomStore.js`
  房间、成员、共享草稿的内存态存储。

- `server/ws/server.js`
  WebSocket 服务端逻辑，负责房间广播和连接管理。

- `tests/`
  当前分支相关的浏览器 smoke test 和路线规划测试。

## Local Run

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 启动后端服务

```bash
cd server
npm run dev
```

默认监听：

```text
http://localhost:3000
```

服务启动后：

- `/` 会返回一个注入 `route-patch.css` 的 iframe 容器页
- `/index.html` 是前端页面本体
- `/api/*` 提供房间、POI、路线等接口
- `/ws` 提供 WebSocket 实时同步

### 3. 打开前端

推荐直接访问：

```text
http://localhost:3000/
```

如果只想看原页面，也可以访问：

```text
http://localhost:3000/index.html
```

## Main User Flow

当前分支重点覆盖这条流程：

- 04 地图入口
- 05 创建或加入房间
- 06 创建房间设置
- 07 邀请好友
- 08 成员填写位置与偏好
- 09 成员偏好汇总
- 10 AI 路线生成中
- 11 路线候选与推荐方案
- 12 协同调整并确认行程

协作链路大致如下：

1. 房主创建房间，拿到 `roomCode`
2. 成员通过房间码加入
3. 每个成员提交昵称、位置、偏好、已选 POI
4. 后端汇总成员状态并通过 WebSocket 广播
5. 任一成员更新共享草稿后，全房间同步最新版本
6. 所有成员确认后，草稿进入 finalized 状态

## API Overview

当前分支主要依赖这些接口：

- `POST /api/rooms`
  创建房间

- `GET /api/rooms/:code`
  获取房间详情、成员状态和共享草稿

- `POST /api/rooms/:code/join`
  加入房间

- `POST /api/rooms/:code/members/:memberId/prefs`
  提交成员偏好和位置

- `POST /api/rooms/:code/members/:memberId/selections`
  提交成员已选店铺

- `GET /api/rooms/:code/draft`
  获取共享草稿

- `PUT /api/rooms/:code/draft`
  更新共享草稿

- `POST /api/rooms/:code/draft/confirm`
  成员确认当前草稿

- `POST /api/pois/recommendations`
  获取 POI 推荐

- `GET /api/pois/search`
  按关键词搜索 POI

- `POST /api/route/plan`
  生成路线规划结果

- `GET /api/location/default`
  获取默认位置上下文

## WebSocket Events

前后端通过 `/ws` 进行房间内实时同步。当前代码里主要会看到这些消息类型：

- `join`
  客户端加入某个房间频道

- `snapshot`
  新连接建立后返回当前房间快照

- `memberJoined`
  新成员加入房间

- `memberUpdate`
  成员偏好或状态更新

- `allSubmitted`
  所有成员都已提交偏好

- `draftUpdate`
  共享草稿发生变化或进入确认态

- `ping` / `pong`
  心跳保活

## Development Notes

- 当前 `roomStore` 是内存实现，重启服务后房间状态会丢失，不适合作为生产方案。
- 房间有 TTL 控制，适合 hackathon / demo 场景。
- `real-api.js` 保留了旧接口兼容层，这样前端主逻辑无需大面积重构。
- 服务端首页通过 iframe 注入 `route-patch.css`，这是当前分支的兼容性方案，不是最终架构。
- 路线与 POI 推荐已经朝真实联调方向走，但仍然以 MVP 为目标，错误处理和配置管理还不完整。

## Configuration

运行依赖的配置集中在 `server/config.js`。

当前仓库里已经存在本地配置写法，但如果要继续迭代，建议尽快改成环境变量注入，至少包括：

- 服务端端口
- 地图服务 API Key
- AI 服务 API Key
- AI 模型名
- 房间 TTL
- WebSocket 心跳间隔

## Testing

当前仓库已有和这条分支相关的测试脚本：

- `tests/browser-smoke.mjs`
- `tests/route-plan.mjs`
- `tests/static-smoke.mjs`

建议每次改动后至少验证：

1. 房间创建 / 加入是否正常
2. 成员偏好提交后是否能同步
3. 路线推荐是否返回有效结果
4. 共享草稿更新后是否能广播到其他成员
5. 最终确认后是否正确锁定草稿

## Branch Positioning

这不是一条“只改 UI”的分支，而是一条把产品主流程推进到“可联调、可多人协作、可接真实搜索与推荐”的功能分支。

如果后续要继续演进，建议下一步优先处理：

- 配置和密钥管理
- 后端状态持久化
- 更稳定的错误处理与超时处理
- 更清晰的前后端启动和部署方式
- 将前端兼容层逐步收敛成正式 API SDK
