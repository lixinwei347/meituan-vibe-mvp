/**
 * 高德地图 REST API 封装
 * 文档：https://lbs.amap.com/api/webservice/guide/api/search
 */
const https = require('https');
const { AMAP_KEY } = require('../config');

// ---------- 工具 ----------

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON 解析失败: ${data.slice(0, 100)}`)); }
      });
    }).on('error', reject);
  });
}

function distanceMeters(a, b) {
  const latM = 111000, lngM = 85000;
  return Math.hypot((a.lat - b.lat) * latM, (a.lng - b.lng) * lngM);
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ---------- 地理编码：地名 → 经纬度 ----------

async function geocode(address) {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=北京&output=JSON`;
  const data = await httpsGet(url);
  if (data.status === '1' && data.geocodes?.length) {
    const [lng, lat] = data.geocodes[0].location.split(',').map(Number);
    return { lat, lng, name: address, address: data.geocodes[0].formatted_address };
  }
  return null;
}

// ---------- 周边搜索：经纬度 + 关键词 → POI 列表 ----------

/**
 * @param {object} center  { lat, lng }
 * @param {string} keywords  搜索关键词，如 "火锅|咖啡|甜品"
 * @param {number} radius  搜索半径（米），默认 3000
 * @param {number} limit   返回数量，默认 10
 */
async function nearbySearch({ center, keywords, radius = 3000, limit = 10, types = '' }) {
  const location = `${center.lng},${center.lat}`;
  const typesParam = types ? `&types=${encodeURIComponent(types)}` : '';
  const kwParam = keywords ? `&keywords=${encodeURIComponent(keywords)}` : '';
  const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${location}${kwParam}${typesParam}&radius=${radius}&sortrule=distance&offset=${limit}&extensions=all&output=JSON`;
  const data = await httpsGet(url);

  if (data.status !== '1' || !data.pois?.length) return [];

  return data.pois.map((poi) => {
    const [lng, lat] = poi.location.split(',').map(Number);
    const dist = distanceMeters(center, { lat, lng });
    const rating = poi.biz_ext?.rating ? parseFloat(poi.biz_ext.rating) : 4.5;
    const price  = poi.biz_ext?.cost   ? parseFloat(poi.biz_ext.cost)   : 80;
    return {
      id: poi.id,
      name: poi.name,
      category: poi.type?.split(';')[0] || '其他',
      subCategory: poi.type?.split(';')[1] || poi.type?.split(';')[0] || '其他',
      lat,
      lng,
      rating,
      price,
      tags: buildPoiTags(poi, rating, price, dist),
      mood: guessMood(poi.type || ''),
      address: poi.address,
      distance: dist,
      distanceLabel: formatDistance(dist),
      photoUrl: poi.photos?.[0]?.url || '',
      photoTitle: poi.photos?.[0]?.title || '',
      tel: poi.tel,
    };
  });
}

// 根据高德 POI 数据生成有意义的描述性标签
function buildPoiTags(poi, rating, price, dist) {
  const tags = [];
  const type = (poi.type || '').toLowerCase();
  const name = poi.name || '';

  // 类别特征标签
  if (/火锅/.test(name + type)) tags.push('火锅');
  else if (/咖啡/.test(name + type)) tags.push('咖啡');
  else if (/甜品|蛋糕|冰淇淋|糕点/.test(name + type)) tags.push('甜品');
  else if (/烧烤|烤肉/.test(name + type)) tags.push('烧烤');
  else if (/日料|寿司|拉面/.test(name + type)) tags.push('日料');
  else if (/粤菜|茶餐厅|茶点/.test(name + type)) tags.push('粤菜');
  else if (/川湘|川菜|湘菜/.test(name + type)) tags.push('川湘菜');
  else if (/剧本/.test(name + type)) tags.push('剧本杀');
  else if (/密室/.test(name + type)) tags.push('密室逃脱');
  else if (/电竞|游戏|网吧/.test(name + type)) tags.push('电竞');
  else if (/美甲|美睫|美发/.test(name + type)) tags.push('美甲美睫');
  else if (/攀岩|运动|健身/.test(name + type)) tags.push('运动健身');

  // 评分标签
  if (rating >= 4.8) tags.push('好评如潮');
  else if (rating >= 4.5) tags.push('口碑优质');

  // 价格标签
  if (price <= 30) tags.push('超划算');
  else if (price <= 60) tags.push('人均亲民');
  else if (price >= 200) tags.push('精致消费');

  // 距离标签
  if (dist <= 300) tags.push('步行可达');
  else if (dist <= 800) tags.push('近距离');

  // 兜底：用 subCategory
  if (!tags.length) {
    const sub = poi.type?.split(';')[1] || poi.type?.split(';')[0] || '';
    if (sub) tags.push(sub.replace(/服务$/, ''));
  }

  return tags.slice(0, 3);
}

// 根据 POI 类型猜测 mood 颜色
function guessMood(type) {
  if (/餐饮|食|锅|烤|烧|面|菜/.test(type)) return 'yellow';
  if (/咖啡|甜|饮|茶/.test(type)) return 'mint';
  if (/娱乐|电影|KTV|游戏|剧|密室|攀岩/.test(type)) return 'blue';
  if (/美容|美甲|美发|spa/.test(type)) return 'pink';
  return 'yellow';
}

// ---------- 根据多成员位置，搜索多类 POI ----------

/**
 * 根据偏好关键词列表，分别搜索后合并去重
 */
// 高德标准类型码映射（比关键词搜索更精准）
const MODE_TYPES = {
  '美食':   '050000',  // 餐饮服务
  '玩乐':   '080000|090000|100000',  // 体育休闲|购物|生活服务
  '近地铁': '050000',
};

async function searchByPrefs({ center, prefs, members, radius = 3000 }) {
  const mode = prefs?.mode || '综合最优';
  const allPois = [];
  const seenIds = new Set();

  function addPois(pois) {
    pois.forEach((p) => { if (!seenIds.has(p.id)) { seenIds.add(p.id); allPois.push(p); } });
  }

  // 食物相关词白名单（用于过滤 prefSummary）
  const FOOD_KEYWORDS = new Set(['火锅','咖啡','甜品','烧烤','日料','粤菜','川湘','烤肉','寿司','拉面','饺子','披萨','西餐','烤鸭','炸鸡','奶茶','甜点','蛋糕','面条','汉堡']);
  const AVOID_KEYWORDS = ['避', '无', '待', '不', '少', '轻', '禁'];

  // ── 收集 foods 关键词（用户明确选择的食物品类）──
  const foodKws = new Set();
  if (prefs?.foods?.length) prefs.foods.forEach((k) => foodKws.add(k));
  if (prefs?.categories?.length) prefs.categories.forEach((k) => foodKws.add(k));
  if (members?.length) {
    members.forEach((m) => {
      if (m.prefs?.foods) m.prefs.foods.forEach((k) => foodKws.add(k));
      if (m.prefs?.categories) m.prefs.categories.forEach((k) => foodKws.add(k));
      // 从 prefSummary 只提取食物词（不把「密室」「KTV」等混进食物搜索）
      if (m.prefSummary) {
        m.prefSummary.split(/[/\s,，、]+/).forEach((w) => {
          const w2 = w.trim();
          if (w2 && w2.length >= 2
            && !AVOID_KEYWORDS.some((x) => w2.startsWith(x))
            && (FOOD_KEYWORDS.has(w2) || w2.includes('料') || w2.includes('菜') || w2.includes('食') || w2.includes('饮'))
          ) foodKws.add(w2);
        });
      }
    });
  }

  // ── 1. 美食/综合：foods 关键词单独搜，保证每种偏好都进候选池 ──
  if (mode !== '玩乐' && foodKws.size) {
    await Promise.all([...foodKws].slice(0, 6).map(async (kw) => {
      try {
        const pois = await nearbySearch({ center, keywords: kw, radius, limit: 5 });
        addPois(pois);
      } catch (e) { console.warn('[amap] food搜索失败:', kw, e.message); }
    }));
  }

  // ── 2. 美食 tab：用类型码搜全类餐饮，再用 foods 关键词精筛 ──
  if (mode === '美食') {
    // 先用类型码搜附近所有餐饮
    // foods 关键词已在第1步搜完，再用类型码补充附近所有餐饮（不过滤）
    try {
      const byType = await nearbySearch({ center, keywords: '', radius, limit: 15, types: '050000' });
      addPois(byType);
    } catch (e) { console.warn('[amap] 美食类型搜索失败:', e.message); }
    return allPois.sort((a, b) => b.rating - a.rating || a.distance - b.distance).slice(0, 20);
  }

  // ── 3. 玩乐 tab：搜娱乐/休闲类 ──
  if (mode === '玩乐') {
    // 用 | 合并关键词一次请求，提高效率，5km 半径
    const funKwArr = ['KTV', '酒吧', '电影院', '密室', '剧本杀', '电竞', '运动', '棋牌'];
    if (prefs?.fun?.length) prefs.fun.forEach((k) => funKwArr.push(k));
    members?.forEach((m) => { if (m.prefs?.fun) m.prefs.fun.forEach((k) => funKwArr.push(k)); });
    const uniqueFunKws = [...new Set(funKwArr)].slice(0, 10);
    // 分两批并发（高德 keywords 过长效果下降）
    const half = Math.ceil(uniqueFunKws.length / 2);
    await Promise.all([
      nearbySearch({ center, keywords: uniqueFunKws.slice(0, half).join('|'), radius: 5000, limit: 20 }).then(addPois).catch(() => {}),
      nearbySearch({ center, keywords: uniqueFunKws.slice(half).join('|'), radius: 5000, limit: 20 }).then(addPois).catch(() => {}),
    ]);
    return allPois.sort((a, b) => b.rating - a.rating || a.distance - b.distance).slice(0, 20);
  }

  // ── 4. 近地铁：搜距离最近的餐饮 ──
  if (mode === '近地铁') {
    try { addPois(await nearbySearch({ center, keywords: '餐厅|咖啡|美食|小吃', radius: 2000, limit: 20 })); }
    catch (e) {}
    return allPois.sort((a, b) => a.distance - b.distance).slice(0, 20);
  }

  // ── 5. 综合最优：foods已搜完，再补娱乐偏好 ──
  const funKws = new Set();
  if (prefs?.fun?.length) prefs.fun.forEach((k) => funKws.add(k));
  members?.forEach((m) => { if (m.prefs?.fun) m.prefs.fun.forEach((k) => funKws.add(k)); });
  if (funKws.size) {
    await Promise.all([...funKws].slice(0, 3).map(async (kw) => {
      try { addPois(await nearbySearch({ center, keywords: kw, radius, limit: 4 })); }
      catch (e) {}
    }));
  }
  // 如果候选池不足，补充通用餐饮
  if (allPois.length < 8) {
    try { addPois(await nearbySearch({ center, keywords: '餐厅|咖啡', radius, limit: 10 })); }
    catch (e) {}
  }

  return allPois
    .sort((a, b) => (b.rating - a.rating) * 2 + (a.distance - b.distance) / 3000)
    .slice(0, 20);
}

module.exports = { geocode, nearbySearch, searchByPrefs, distanceMeters, formatDistance };
