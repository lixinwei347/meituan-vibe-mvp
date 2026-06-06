module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  // 房间 TTL：30 分钟（毫秒）
  ROOM_TTL_MS: 30 * 60 * 1000,
  // WebSocket 心跳间隔
  WS_PING_INTERVAL_MS: 25_000,
  // 高德地图 REST API Key（Web服务类型）
  AMAP_KEY: 'c3309cdf7f7e61042c45e63d8e1f14ab',
  // 豆包 API
  DOUBAO_API_KEY: 'ark-afb8eee0-5303-40b6-82f4-28240708c5f6-ad69e',
  DOUBAO_MODEL: 'doubao-seed-2-0-pro-260215',
};
