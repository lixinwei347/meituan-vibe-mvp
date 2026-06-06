const { WebSocketServer } = require('ws');
const { WS_PING_INTERVAL_MS } = require('../config');
const { getRoom, getMembers, buildDraftView } = require('../lib/roomStore');

// roomCode → Set<WebSocket>
const roomClients = new Map();

function setupWs(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws._roomCode = null;
    ws._memberId = null;
    ws._alive = true;

    // 心跳：服务端主动 ping
    const pingTimer = setInterval(() => {
      if (!ws._alive) {
        ws.terminate();
        return;
      }
      ws._alive = false;
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, WS_PING_INTERVAL_MS);

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.type) {
        case 'join': {
          const { roomCode, memberId } = msg;
          const room = await getRoom(roomCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', code: 'ROOM_NOT_FOUND' }));
            return;
          }
          // 加入房间连接池
          ws._roomCode = roomCode;
          ws._memberId = memberId;
          if (!roomClients.has(roomCode)) roomClients.set(roomCode, new Set());
          roomClients.get(roomCode).add(ws);

          // 发送当前成员快照给刚连接的客户端
          const members = getMembers(roomCode);
          ws.send(JSON.stringify({ type: 'snapshot', members, draft: buildDraftView(roomCode, memberId) }));

          // 广播 memberJoined 给房间其他成员
          const joinedMember = members.find((m) => m.memberId === memberId);
          if (joinedMember) {
            broadcast(roomCode, { type: 'memberJoined', member: joinedMember, members }, ws);
          }
          break;
        }

        case 'pong': {
          ws._alive = true;
          break;
        }

        default:
          break;
      }
    });

    ws.on('close', () => {
      clearInterval(pingTimer);
      if (ws._roomCode) {
        roomClients.get(ws._roomCode)?.delete(ws);
        // 房间无人时清理连接池条目
        if (roomClients.get(ws._roomCode)?.size === 0) {
          roomClients.delete(ws._roomCode);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[WS error]', err.message);
    });
  });

  return wss;
}

/**
 * 广播消息给房间内所有连接（可排除某个 ws）
 * @param {string} roomCode
 * @param {object} payload
 * @param {WebSocket|null} exclude - 排除的连接（通常是发送者自身）
 */
function broadcast(roomCode, payload, exclude = null) {
  const clients = roomClients.get(roomCode);
  if (!clients) return;
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client !== exclude && client.readyState === 1 /* OPEN */) {
      client.send(msg);
    }
  }
}

/**
 * 广播给房间所有人（包括发送者）
 */
function broadcastAll(roomCode, payload) {
  broadcast(roomCode, payload, null);
}

module.exports = { setupWs, broadcast, broadcastAll };
