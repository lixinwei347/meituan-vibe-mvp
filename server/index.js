const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { setupWs } = require('./ws/server');
const { PORT } = require('./config');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 注入 patch CSS 的入口（通过 iframe 方案）
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>美团黑客松路线 MVP</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; }
  iframe { width:100%; height:100%; border:0; display:block; }
</style>
</head>
<body>
<iframe src="/index.html" id="app"></iframe>
<script>
// 向 iframe 注入 patch CSS
document.getElementById('app').addEventListener('load', function() {
  try {
    const doc = this.contentDocument;
    if (doc && !doc.getElementById('route-patch')) {
      const link = doc.createElement('link');
      link.id = 'route-patch';
      link.rel = 'stylesheet';
      link.href = '/route-patch.css';
      doc.head.appendChild(link);
    }
  } catch(e) {}
});
</script>
</body>
</html>`);
});

// 静态文件（前端）
app.use(express.static(path.resolve(__dirname, '..')));

// API 路由
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/pois', require('./routes/pois'));
app.use('/api/route', require('./routes/route'));
app.use('/api/location', require('./routes/location'));

// 错误处理
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// 启动
const server = http.createServer(app);
setupWs(server);

server.listen(PORT, () => {
  console.log(`✅ Meituan Vibe Server running at http://localhost:${PORT}`);
  console.log(`   前端地址: http://localhost:${PORT}/index.html`);
});
