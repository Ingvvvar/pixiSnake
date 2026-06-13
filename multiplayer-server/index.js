'use strict';

// WebSocket-сервер мультиплеерной змейки. Держит одну общую комнату (один Game),
// гоняет игровой цикл 8 раз в секунду и рассылает всем полное состояние.
// Клиент шлёт только {type:'join', name} и {type:'dir', dir}.

const { WebSocketServer } = require('ws');
const Game = require('./game');

// По умолчанию слушаем все интерфейсы (0.0.0.0) — так требует постановка и так
// работает проброс порта в контейнере. Переопределяется через env при нужде.
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3020;
const WS_PATH = process.env.WS_PATH || '/ws';
const TICK_MS = 125; // 8 тиков в секунду
const HEARTBEAT_MS = 30000;
const MAX_PLAYERS = 8;

const game = new Game();
const wss = new WebSocketServer({ host: HOST, port: PORT, path: WS_PATH });

const send = (ws, obj) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
};

const broadcast = (obj) => {
  const payload = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
};

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.playerId = null;
  ws.on('pong', () => { ws.isAlive = true; });

  send(ws, { type: 'welcome', grid: { cols: game.cols, rows: game.rows }, tickMs: TICK_MS });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // мусор игнорируем, соединение не рвём
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'join') {
      if (ws.playerId) {
        // повторный join на том же сокете — просто обновление имени
        game.setName(ws.playerId, msg.name);
        return;
      }
      if (game.players.size >= MAX_PLAYERS) {
        send(ws, { type: 'full' });
        return;
      }
      const player = game.addPlayer(msg.name);
      ws.playerId = player.id;
      send(ws, { type: 'joined', id: player.id, color: player.color });
    } else if (msg.type === 'dir') {
      if (ws.playerId) game.setDirection(ws.playerId, msg.dir);
    }
  });

  const drop = () => {
    if (ws.playerId) {
      game.removePlayer(ws.playerId);
      ws.playerId = null;
    }
  };
  ws.on('close', drop);
  ws.on('error', drop);
});

// Heartbeat: отбрасываем зависшие соединения (NAT, уснувший таб), иначе их
// змейки остаются на поле навсегда
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      // сокет уже закрывается — terminate на следующей итерации
    }
  }
}, HEARTBEAT_MS);

const loop = setInterval(() => {
  game.step();
  broadcast(game.serialize());
}, TICK_MS);

wss.on('close', () => {
  clearInterval(loop);
  clearInterval(heartbeat);
});

console.log(`Multiplayer snake server listening on ws://${HOST}:${PORT}${WS_PATH}`);
