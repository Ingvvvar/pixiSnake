import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture, TilingSprite } from 'pixi.js';
import { loadAssets } from './textureLoader';
import { segmentTextureKey } from './snakeSkin';
import SoundManager from './soundManager';
import { getSavedPlayerName, savePlayerName } from './leaderboardApi';
import { askPlayerName } from './namePrompt';

// Размер клетки в пикселях при рендере (сетка приходит с сервера). 30×30 при 24px
// даёт поле 720×720 — на текстуры 64px садится с уменьшением, пиксель-арт не мылим.
const CELL = 24;
const KEY_TO_DIRECTION = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};

const soundManager = new SoundManager();

const statusEl = document.getElementById('status');
const scoreboardEl = document.getElementById('scoreboard');
const stageEl = document.getElementById('stage');
const gameoverOverlay = document.getElementById('gameover-overlay');
const goScoreVal = document.getElementById('go-score-val');
const playAgainBtn = document.getElementById('play-again-btn');
const exitBtn = document.getElementById('exit-btn');

let playerName = getSavedPlayerName() || '';

// --- состояние подключения / игры ---
let ws = null;
let manualClose = false;
let reconnectDelay = 1000;
let connected = false;
let myId = null;
let musicStarted = false;
let lastSentDir = null;
// для звуков локального игрока: фиксируем предыдущий счёт/жизнь
let prevScore = 0;
let prevAlive = false;

// --- Pixi-мир (строится после загрузки ассетов и получения сетки) ---
let app = null;
let grid = null; // { cols, rows }
let playersLayer = null;
let foodContainer = null;
const foodSprites = [];
const playerViews = new Map(); // id -> { container, segLayer, segs:[Sprite], marker, label, name }

const cellCenter = (x, y) => ({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 });

const renderStatus = () => {
  // только статус подключения; гибель теперь показывает оверлей Game Over
  statusEl.textContent = connected ? '' : 'Reconnecting…';
};

let latestPlayers = [];
const findMe = () => latestPlayers.find((p) => p.id === myId) || null;

// --- построение/перестройка мира под размеры сетки сервера ---
function buildWorld(serverGrid) {
  if (app && grid && grid.cols === serverGrid.cols && grid.rows === serverGrid.rows) return;

  grid = { cols: serverGrid.cols, rows: serverGrid.rows };
  const width = grid.cols * CELL;
  const height = grid.rows * CELL;

  if (!app) {
    app = new Application({ width, height, antialias: false });
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__PIXI_APP__ = app; // для Pixi DevTools и автотестов
    }
    document.getElementById('game-container').appendChild(app.view);
  } else {
    app.renderer.resize(width, height);
    app.stage.removeChildren();
    playerViews.clear();
    foodSprites.length = 0;
  }

  const grass = new TilingSprite(Texture.from('grass_64'), width, height);
  app.stage.addChild(grass);

  foodContainer = new Container();
  playersLayer = new Container();
  playersLayer.sortableChildren = true;
  app.stage.addChild(foodContainer, playersLayer);

  fitCanvas();
}

// Рендер фиксирован под размер сетки; под окно подгоняется только CSS-размер
// canvas с сохранением пропорций (как в одиночной игре)
function fitCanvas() {
  if (!app || !grid) return;
  const fieldW = grid.cols * CELL;
  const fieldH = grid.rows * CELL;
  // вписываем поле в доступную область сцены (#stage), не залезая на панель счёта
  const availW = stageEl.clientWidth || window.innerWidth;
  const availH = stageEl.clientHeight || window.innerHeight;
  const scale = Math.min(availW / fieldW, availH / fieldH, 1);
  app.view.style.width = `${Math.floor(fieldW * scale)}px`;
  app.view.style.height = `${Math.floor(fieldH * scale)}px`;
}
window.addEventListener('resize', fitCanvas);

// --- рендер игроков ---
function createPlayerView(player) {
  const container = new Container();
  const segLayer = new Container();
  segLayer.sortableChildren = true;

  const colorNum = parseInt(player.color.slice(1), 16);

  // кольцо-маркер цвета игрока вокруг головы — чтобы найти свою змейку среди
  // одинаково-зелёных (текстуры общие, цвет несут маркер и подпись)
  const marker = new Graphics();
  const isMe = player.id === myId;
  marker.lineStyle(isMe ? 4 : 3, colorNum, 1);
  marker.drawCircle(0, 0, CELL * 0.55);

  const label = new Text(player.name, new TextStyle({
    fontFamily: 'Arial',
    fontSize: 13,
    fontWeight: 'bold',
    fill: player.color,
    stroke: '#000000',
    strokeThickness: 3,
  }));
  label.anchor.set(0.5, 1);

  container.addChild(segLayer, marker, label);
  playersLayer.addChild(container);

  const view = { container, segLayer, segs: [], marker, label, name: player.name };
  playerViews.set(player.id, view);
  return view;
}

function syncSegmentSprites(view, count) {
  while (view.segs.length < count) {
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 0.5);
    sprite.width = CELL;
    sprite.height = CELL;
    view.segLayer.addChild(sprite);
    view.segs.push(sprite);
  }
  while (view.segs.length > count) {
    view.segLayer.removeChild(view.segs.pop()).destroy();
  }
}

function updatePlayerView(view, player) {
  // мёртв / ждёт респауна — змейки на поле нет
  if (!player.alive || player.snake.length === 0) {
    view.container.visible = false;
    return;
  }
  view.container.visible = true;

  if (view.name !== player.name) {
    view.label.text = player.name;
    view.name = player.name;
  }

  const segs = player.snake.map(([x, y]) => ({ x, y }));
  syncSegmentSprites(view, segs.length);

  segs.forEach((cell, idx) => {
    const key = segmentTextureKey(segs, idx);
    const sprite = view.segs[idx];
    sprite.visible = Boolean(key);
    if (!key) return;
    sprite.texture = Texture.from(key);
    sprite.zIndex = idx === 0 ? 1 : 0;
    const { x, y } = cellCenter(cell.x, cell.y);
    sprite.position.set(x, y);
    sprite.width = CELL;
    sprite.height = CELL;
  });

  const head = cellCenter(segs[0].x, segs[0].y);
  view.marker.position.set(head.x, head.y);
  view.label.position.set(head.x, head.y - CELL * 0.75);
}

function destroyPlayerView(view) {
  playersLayer.removeChild(view.container);
  view.container.destroy({ children: true });
}

function updateFood(food) {
  while (foodSprites.length < food.length) {
    const sprite = Sprite.from('apple');
    sprite.anchor.set(0.5, 0.5);
    foodContainer.addChild(sprite);
    foodSprites.push(sprite);
  }
  while (foodSprites.length > food.length) {
    foodContainer.removeChild(foodSprites.pop()).destroy();
  }
  food.forEach(([x, y], idx) => {
    const sprite = foodSprites[idx];
    const { x: px, y: py } = cellCenter(x, y);
    sprite.position.set(px, py);
    sprite.width = CELL * 0.85;
    sprite.height = CELL * 0.85;
  });
}

let lastScoreboardSig = '';
let lastRowCount = -1;
function updateScoreboard(players) {
  const sorted = players.slice().sort((a, b) => b.score - a.score);
  const sig = sorted
    .map((p) => `${p.id}:${p.name}:${p.score}:${p.alive ? 1 : 0}:${p.id === myId ? 1 : 0}`)
    .join('|');
  if (sig === lastScoreboardSig) return; // ничего не изменилось — не трогаем DOM
  lastScoreboardSig = sig;

  const rows = sorted.map((p) => {
    const cls = ['sb-row'];
    if (p.id === myId) cls.push('me');
    if (!p.alive) cls.push('dead');
    const label = p.id === myId ? `${escapeHtml(p.name)} (you)` : escapeHtml(p.name);
    return `<div class="${cls.join(' ')}">`
      + `<span class="sb-swatch" style="background:${p.color}"></span>`
      + `<span class="sb-name">${label}</span>`
      + `<span class="sb-score">${p.score}</span>`
      + `</div>`;
  }).join('');
  scoreboardEl.innerHTML = `<div class="sb-title">PLAYERS</div>${rows || '<div class="sb-row">waiting…</div>'}`;

  // в портрете число игроков меняет высоту верхней панели → переразложить поле
  if (sorted.length !== lastRowCount) {
    lastRowCount = sorted.length;
    fitCanvas();
  }
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Локальные переходы: звук яблока на росте счёта, экран Game Over при гибели,
// его скрытие при (пере)спауне. Счёт смерти берём из состояния — сервер хранит
// его до респауна, поэтому у выбывшего me.score = финальный счёт.
function handleLocalTransitions(me) {
  if (!me) return;
  const justDied = prevAlive && !me.alive;
  const justSpawned = !prevAlive && me.alive;

  if (me.alive && me.score > prevScore) soundManager.playEatSound();
  if (justDied) {
    soundManager.playDieSound();
    showGameOver(me.score);
  }
  if (justSpawned) hideGameOver();

  prevScore = me.alive ? me.score : prevScore;
  prevAlive = me.alive;
}

function showGameOver(score) {
  goScoreVal.textContent = score;
  gameoverOverlay.classList.add('show');
}

function hideGameOver() {
  gameoverOverlay.classList.remove('show');
}

function renderState(state) {
  buildWorld(state.grid);
  latestPlayers = state.players;

  const seen = new Set();
  for (const player of state.players) {
    seen.add(player.id);
    let view = playerViews.get(player.id);
    if (!view) view = createPlayerView(player);
    updatePlayerView(view, player);
  }
  for (const [id, view] of playerViews) {
    if (!seen.has(id)) {
      destroyPlayerView(view);
      playerViews.delete(id);
    }
  }

  updateFood(state.food);
  updateScoreboard(state.players);
  handleLocalTransitions(findMe());
  renderStatus();
}

// --- сеть ---
function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

function sendJoin() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'join', name: playerName }));
  }
}

function sendDir(dir) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'dir', dir }));
  }
}

function handleMessage(data) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    return;
  }
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'welcome':
      buildWorld(msg.grid);
      break;
    case 'joined':
      myId = msg.id;
      break;
    case 'full':
      statusEl.textContent = 'Room is full — try again later';
      break;
    case 'state':
      renderState(msg);
      break;
    default:
      break;
  }
}

function connect() {
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    connected = true;
    reconnectDelay = 1000;
    myId = null; // при переподключении сервер выдаст новый id
    lastSentDir = null;
    // переподключение = новая сессия: сбрасываем экран Game Over и трекинг жизни
    prevAlive = false;
    prevScore = 0;
    hideGameOver();
    sendJoin();
    renderStatus();
  };

  ws.onmessage = (event) => handleMessage(event.data);

  ws.onclose = () => {
    connected = false;
    renderStatus();
    if (!manualClose) scheduleReconnect();
  };

  ws.onerror = () => {
    try {
      ws.close();
    } catch {
      // onclose всё равно сработает и запланирует переподключение
    }
  };
}

function scheduleReconnect() {
  setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(Math.floor(reconnectDelay * 1.5), 8000);
}

// --- ввод ---
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // стрелки в поле имени не рулят
  const dir = KEY_TO_DIRECTION[e.code];
  if (!dir) return;
  e.preventDefault();

  if (!musicStarted) {
    // фоновая музыка — только после жеста пользователя (политика автоплея)
    soundManager.playBackgroundMusic();
    musicStarted = true;
  }

  if (dir === lastSentDir) return; // не спамим одинаковыми (autorepeat клавиши)
  lastSentDir = dir;
  sendDir(dir);
});

// «Играть снова» на экране Game Over — просим сервер заспаунить заново.
// Оверлей не прячем здесь: он скроется, когда сервер пришлёт нас живыми.
playAgainBtn.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'respawn' }));
});

// «Выход» — на главную страницу; реконнект глушим, чтобы не дёргался при уходе
exitBtn.addEventListener('click', () => {
  manualClose = true;
  if (ws) {
    try {
      ws.close();
    } catch {
      // всё равно уходим
    }
  }
  window.location.href = 'index.html';
});

window.addEventListener('beforeunload', () => {
  manualClose = true;
  if (ws) ws.close();
});

// --- старт ---
loadAssets().then(async () => {
  if (!playerName) {
    playerName = await askPlayerName();
    savePlayerName(playerName);
  }
  statusEl.textContent = 'Connecting…';
  connect();
}).catch((error) => {
  console.error('Failed to load game assets', error);
  statusEl.textContent = 'Failed to load game assets — try reloading the page';
});
