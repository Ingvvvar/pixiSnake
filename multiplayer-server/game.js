'use strict';

// Авторитетная модель мультиплеерной змейки. Всё состояние — в памяти, никакой БД.
// Координаты — клетки сетки (целые 0..cols-1 / 0..rows-1), не пиксели: рендер
// пересчитывает их в пиксели на своей стороне. Сервер — единственный источник
// истины: клиент шлёт только смену направления, столкновения считаются здесь.

const COLS = 30;
const ROWS = 30;
const INITIAL_LENGTH = 3;
// Респаун выбывшего через ~2 c (16 тиков при 8 тиках/c)
const RESPAWN_TICKS = 16;
// Минимум еды на поле; реально держим max(MIN_FOOD, число игроков)
const MIN_FOOD = 3;

const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Палитра для подписей/маркеров игроков на клиенте (спрайты змейки зелёные и
// тинтятся плохо, поэтому цвет несёт имя над головой и кольцо-маркер, не текстура)
const COLORS = [
  '#e53935', '#1e88e5', '#fdd835', '#8e24aa',
  '#fb8c00', '#00acc1', '#ec407a', '#7cb342',
];

const MAX_NAME_LENGTH = 20;

const sanitizeName = (name) => {
  if (typeof name !== 'string') return 'Player';
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : 'Player';
};

const randInt = (n) => Math.floor(Math.random() * n);

let nextId = 1;

class Game {
  constructor({ cols = COLS, rows = ROWS } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.players = new Map(); // id -> player
    this.food = [];
    this.tick = 0;
    this.colorCursor = 0;
    this.replenishFood();
  }

  addPlayer(name) {
    const id = String(nextId++);
    const color = COLORS[this.colorCursor++ % COLORS.length];
    const player = {
      id,
      name: sanitizeName(name),
      color,
      snake: [], // [{x, y}, ...] голова первой
      dir: null,
      pendingDir: null,
      alive: false,
      score: 0,
      respawnAt: 0,
    };
    this.players.set(id, player);
    this.spawn(player);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  setName(id, name) {
    const player = this.players.get(id);
    if (player) player.name = sanitizeName(name);
  }

  // Клиент шлёт направление; применяется не сразу, а на ближайшем тике —
  // разворот на 180° в саму себя отбрасывается (сверяется с текущим dir)
  setDirection(id, dirName) {
    const player = this.players.get(id);
    if (!player || !player.alive) return;
    const d = DIRECTIONS[dirName];
    if (!d) return;
    if (player.dir && d.dx === -player.dir.dx && d.dy === -player.dir.dy) return;
    player.pendingDir = d;
  }

  // Множество занятых клеток (все сегменты всех змеек + еда) для поиска свободных
  occupiedSet() {
    const set = new Set();
    for (const player of this.players.values()) {
      for (const seg of player.snake) set.add(`${seg.x},${seg.y}`);
    }
    for (const f of this.food) set.add(`${f.x},${f.y}`);
    return set;
  }

  // Спаун: случайная клетка + направление, чтобы тело длиной INITIAL_LENGTH и
  // клетка прямо по курсу были в пределах поля и свободны (иначе мгновенная смерть)
  spawn(player) {
    const occupied = this.occupiedSet();
    const dirNames = Object.keys(DIRECTIONS);

    for (let attempt = 0; attempt < 400; attempt++) {
      const hx = randInt(this.cols);
      const hy = randInt(this.rows);
      // случайный порядок направлений, чтобы спауны не липли к одной стороне
      const order = dirNames.slice().sort(() => Math.random() - 0.5);

      for (const name of order) {
        const d = DIRECTIONS[name];
        const cells = [];
        let ok = true;

        // тело тянется НАЗАД от головы (против направления движения)
        for (let i = 0; i < INITIAL_LENGTH; i++) {
          const x = hx - d.dx * i;
          const y = hy - d.dy * i;
          if (x < 0 || y < 0 || x >= this.cols || y >= this.rows || occupied.has(`${x},${y}`)) {
            ok = false;
            break;
          }
          cells.push({ x, y });
        }
        // и клетка прямо по курсу головы тоже должна быть свободной
        const ax = hx + d.dx;
        const ay = hy + d.dy;
        if (ok && (ax < 0 || ay < 0 || ax >= this.cols || ay >= this.rows || occupied.has(`${ax},${ay}`))) {
          ok = false;
        }

        if (ok) {
          player.snake = cells;
          player.dir = d;
          player.pendingDir = null;
          player.alive = true;
          player.respawnAt = 0;
          return true;
        }
      }
    }

    // поле забито — попробуем заспаунить на следующем тике
    player.alive = false;
    player.snake = [];
    player.respawnAt = this.tick + RESPAWN_TICKS;
    return false;
  }

  // Смерть: тело убирается с поля, счёт обнуляется (каждая жизнь — заново,
  // как рестарт в одиночной игре), назначается отложенный респаун
  kill(player) {
    player.alive = false;
    player.snake = [];
    player.dir = null;
    player.pendingDir = null;
    player.score = 0;
    player.respawnAt = this.tick + RESPAWN_TICKS;
  }

  randomFreeCell() {
    const occupied = this.occupiedSet();
    const free = [];
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return null;
    return free[randInt(free.length)];
  }

  replenishFood() {
    const target = Math.max(MIN_FOOD, this.players.size);
    while (this.food.length < target) {
      const cell = this.randomFreeCell();
      if (!cell) break; // поле заполнено
      this.food.push(cell);
    }
  }

  // Один игровой тик: респауны → движение всех змеек → разрешение столкновений →
  // досев еды. Возвращать ничего не нужно — наружу уходит serialize().
  step() {
    this.tick++;

    for (const player of this.players.values()) {
      if (!player.alive && player.respawnAt && this.tick >= player.respawnAt) {
        this.spawn(player);
      }
    }

    // 1. Двигаем каждую живую змейку, отмечаем выход за стену как смерть
    const movers = [];
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      if (player.pendingDir) {
        player.dir = player.pendingDir;
        player.pendingDir = null;
      }

      const head = player.snake[0];
      const nx = head.x + player.dir.dx;
      const ny = head.y + player.dir.dy;

      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) {
        this.kill(player); // удар в стену
        continue;
      }

      const foodIdx = this.food.findIndex((f) => f.x === nx && f.y === ny);
      player.snake.unshift({ x: nx, y: ny });
      if (foodIdx >= 0) {
        this.food.splice(foodIdx, 1);
        player.score++;
      } else {
        // хвост сдвигается одновременно с головой — идти впритык за чужим
        // хвостом разрешено: клетка к моменту проверки уже освобождена
        player.snake.pop();
      }
      movers.push(player);
    }

    // 2. Столкновения по позициям ПОСЛЕ движения: голова против любого сегмента
    // любой змейки (своей — начиная с индекса 1). Голова-в-голову → гибнут обе.
    const dead = [];
    for (const player of movers) {
      const head = player.snake[0];
      let hit = false;
      for (const other of movers) {
        const start = other === player ? 1 : 0;
        for (let i = start; i < other.snake.length; i++) {
          if (other.snake[i].x === head.x && other.snake[i].y === head.y) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (hit) dead.push(player);
    }
    for (const player of dead) this.kill(player);

    // 3. Досеваем еду (в т.ч. под выросшее число игроков)
    this.replenishFood();
  }

  // Полное состояние для рассылки клиентам. Компактно: сегменты и еда — пары [x, y]
  serialize() {
    return {
      type: 'state',
      tick: this.tick,
      grid: { cols: this.cols, rows: this.rows },
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        alive: p.alive,
        score: p.score,
        snake: p.snake.map((s) => [s.x, s.y]),
      })),
      food: this.food.map((f) => [f.x, f.y]),
    };
  }
}

module.exports = Game;
module.exports.DIRECTIONS = DIRECTIONS;
module.exports.MAX_NAME_LENGTH = MAX_NAME_LENGTH;
