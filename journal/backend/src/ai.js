const fs = require('fs');
const path = require('path');

// 豆包 API 配置
const API_KEY = process.env.ARK_API_KEY || '';
const MODEL = process.env.ARK_MODEL || 'doubao-seed-1-6-vision-250815';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// 把服务器文件转成 base64 data URL
function fileToDataUrl(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath.replace(/^\/uploads\//, 'uploads/'));
    const raw = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const b64 = raw.toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch (e) {
    return null;
  }
}

// 获取照片的图片 URL（优先 data_url，其次文件转 base64）
function getImageUrl(photo) {
  if (photo.dataUrl || photo.data_url) return photo.dataUrl || photo.data_url;
  if (photo.url) return fileToDataUrl(photo.url);
  return null;
}

// 调用豆包 API
async function callArk(payload) {
  const resp = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`豆包 API ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const json = await resp.json();
  return json.choices[0].message.content;
}

// 尝试解析 JSON（AI 可能返回带 markdown 的 JSON）
function parseJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return JSON.parse(text.slice(first, last + 1));
  }
  throw new Error('AI 返回的不是合法 JSON');
}

// ========== AI 手帐生成 ==========

/**
 * 生成整本手帐
 * @param {Object} tripData - { tripId, stops, photos, reviews, members, template }
 * @param {Function} onProgress - 进度回调 (current, total, message)
 */
async function generateJournal(tripData, onProgress) {
  const { tripId, stops, photos, reviews, members, template = 'fresh' } = tripData;

  if (!API_KEY) throw new Error('未配置 ARK_API_KEY');

  const total = photos.length + 1; // 每个照片一张卡 + 封面
  let current = 0;

  // ===== 1. 生成封面 =====
  onProgress && onProgress(++current, total, '正在写封面…');

  const coverPrompt = `你是一个探店手帐写手。根据以下探店数据，生成手帐封面信息。

探店路线：${stops.map(s => s.name).join(' → ')}
同行人数：${members.length}人
照片数量：${photos.length}张
手帐风格：${template}

请只返回 JSON（不要 markdown）：
{
  "coverTitle": "手帐标题，12字以内，有情绪有文采",
  "coverSubtitle": "副标题，15字以内",
  "coverSummary": "一段50-80字的行程综述，温暖有画面感"
}`;

  const coverJson = parseJson(await callArk({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是探店手帐写手，只返回JSON。' },
      { role: 'user', content: coverPrompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  }));

  const cover = {
    title: coverJson.coverTitle || '探店手帐',
    subtitle: coverJson.coverSubtitle || '',
    summary: coverJson.coverSummary || '',
  };

  // ===== 2. 为每张照片生成卡片（带视觉识别）=====
  const cards = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const si = Math.min(i, stops.length - 1);
    const stop = stops[si] || {};
    const imgUrl = getImageUrl(p);

    onProgress && onProgress(current + 1, total, `正在识别第${i + 1}张照片…`);
    current++;

    const content = [];

    // 如果有图片，加入视觉识别
    if (imgUrl) {
      content.push({ type: 'image_url', image_url: { url: imgUrl } });
    }

    content.push({
      type: 'text',
      text: `你是一个探店手帐写手。${imgUrl ? '看这张探店照片，' : ''}为它写一张手帐卡片。注意：字数不能超过限制。

店铺：${stop.name || '未知店铺'}
照片标题：${p.title || '无标题'}
拍摄者：${p.uploaderName || p.uploader_name || '匿名'}
标签：${(stop.tags || []).join('、') || '美食'}
手帐风格：${template}

请只返回 JSON：
{
  "cardTitle": "卡片标题，10字以内",
  "narrative": "照片叙事文案，${imgUrl ? '结合画面内容写' : '根据店铺信息写'}，40-60字",
  "tags": ["标签1", "标签2", "标签3"]
}`,
    });

    try {
      const cardJson = parseJson(await callArk({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是探店手帐写手，只返回JSON，字数严格控制在限制内。' },
          { role: 'user', content },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }));

      cards.push({
        photoId: p.id,
        title: cardJson.cardTitle || p.title || '探店记录',
        narrative: cardJson.narrative || '',
        tags: cardJson.tags || [],
      });
    } catch (err) {
      // 某张照片失败不影响整体
      cards.push({
        photoId: p.id,
        title: p.title || '探店记录',
        narrative: `在${stop.name || '这里'}，留下了值得记住的一刻。`,
        tags: (stop.tags || []).slice(0, 3),
      });
    }
  }

  // ===== 3. 汇总 =====
  onProgress && onProgress(total, total, '手帐生成完毕');

  return {
    tripId,
    template,
    cover,
    cards,
    generatedAt: new Date().toISOString(),
  };
}

// ========== 单张照片 AI 卡片生成（上传后异步调用）==========

/**
 * 为一张照片生成 AI 卡片，结果直接存入 DB
 */
async function generateCardForPhoto(photo) {
  const imgUrl = getImageUrl(photo);

  if (!imgUrl) return { cardTitle: photo.title || '探店手记', narrative: '', tags: [] };

  const content = [
    { type: 'image_url', image_url: { url: imgUrl } },
    {
      type: 'text',
      text: `你是探店手帐写手。看这张探店照片，根据画面内容写一张手帐卡片。

请只返回 JSON：
{
  "cardTitle": "卡片标题，10字以内",
  "narrative": "根据画面内容描述，40-60字",
  "tags": ["标签1", "标签2", "标签3"]
}`,
    },
  ];

  const raw = await callArk({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是探店手帐写手，只返回JSON。' },
      { role: 'user', content },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return parseJson(raw);
}

/**
 * 处理所有待生成的 AI 卡片（并行，启动时调用）
 */
async function processPendingAiCards() {
  const { getPhotosNeedingAi, saveAiCard } = require('./db');
  const pending = getPhotosNeedingAi();

  if (!pending.length) return [];

  console.log(`[AI] 发现 ${pending.length} 张照片待生成，并行处理…`);

  const results = await Promise.all(
    pending.map(async (photo) => {
      try {
        const card = await generateCardForPhoto(photo);
        saveAiCard(photo.id, {
          title: card.cardTitle,
          narrative: card.narrative,
          tags: card.tags,
        });
        console.log(`[AI] 照片#${photo.id} 生成完成: ${card.cardTitle}`);
        return { photoId: photo.id, success: true, card };
      } catch (err) {
        console.error(`[AI] 照片#${photo.id} 失败:`, err.message);
        return { photoId: photo.id, success: false, error: err.message };
      }
    })
  );

  return results;
}

module.exports = { generateJournal, generateCardForPhoto, processPendingAiCards };
