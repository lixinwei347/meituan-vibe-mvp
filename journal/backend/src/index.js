const express = require('express');
const cors = require('cors');
const path = require('path');

// 初始化数据库（确保表和种子数据存在）
require('./db');

const albumRoutes = require('./routes/album');
const journalRoutes = require('./routes/journal');

const app = express();
const PORT = 4181;

// ===== 请求日志中间件 =====
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const bodySize = req.headers['content-length'] ? (parseInt(req.headers['content-length']) / 1024).toFixed(0) + 'KB' : '-';
    console.log(`${new Date().toISOString().replace('T',' ').slice(0,19)} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ${bodySize}`);
  });
  next();
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 静态文件：上传的照片
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use(albumRoutes);
app.use(journalRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'journal-server', db: 'sqlite' });
});

app.listen(PORT, () => {
  console.log(`📔 Journal Server running at http://localhost:${PORT}`);
  console.log(`   存储: SQLite (data.db)`);
  console.log(`   日志: 已开启请求日志`);
});
