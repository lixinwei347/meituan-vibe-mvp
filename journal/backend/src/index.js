require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

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

app.listen(PORT, async () => {
  console.log(`📔 Journal Server running at http://localhost:${PORT}`);
  console.log(`   存储: SQLite (data.db)`);

  // 启动后补处理之前没 AI 生成的照片
  if (process.env.ARK_API_KEY) {
    try {
      const { getPhotosNeedingAi, saveAiCard } = require('./db');
      const { generateCardForPhoto } = require('./ai');
      const pending = getPhotosNeedingAi();
      if (pending.length) {
        console.log(`[AI] 发现 ${pending.length} 张照片待补生成，并行处理…`);
        await Promise.all(pending.map(async (p) => {
          try {
            const card = await generateCardForPhoto(p);
            saveAiCard(p.id, { title: card.cardTitle, narrative: card.narrative, tags: card.tags });
            console.log(`[AI] 照片#${p.id} 补生成完成`);
          } catch (err) {
            console.warn(`[AI] 照片#${p.id} 补生成失败:`, err.message);
          }
        }));
      }
    } catch (err) {
      console.warn('[AI] 补生成异常:', err.message);
    }
  }
});
