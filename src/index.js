import { Application, Container, Texture, TilingSprite, Sprite } from "pixi.js";
import appConstants from './constants';
import { loadAssets } from './textureLoader';
import { allTextureKeys } from './textures';
import SoundManager from './soundManager';
import StartScreen from './startScreen';
import GameOverScreen from './gameOverScreen';

const WIDTH = appConstants.size.WIDTH;
const HEIGHT = appConstants.size.HEIGHT;
const CELL_SIZE = appConstants.size.CELL_SIZE;
const FOOD_SIZE = appConstants.size.CELL_SIZE / 2;
const soundManager = new SoundManager();

const scoreContainer = document.getElementById('score-container');
let score = 0;

function incScore() {
  score++;
  drawScore();
}

function drawScore() {
  scoreContainer.innerHTML = `Score: ${score}`;
}

const app = new Application({
  height: HEIGHT,
  width: WIDTH,
  // пиксель-арт, выровненный по сетке — сглаживание только тратит GPU
  antialias: false
});
globalThis.__PIXI_APP__ = app;
drawScore()

const DIRECTIONS = {
  up: { dx: 0, dy: -CELL_SIZE },
  down: { dx: 0, dy: CELL_SIZE },
  left: { dx: -CELL_SIZE, dy: 0 },
  right: { dx: CELL_SIZE, dy: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const MAX_QUEUED_INPUTS = 3;
const inputQueue = [];

const queueDirection = (direction) => {
  if (inputQueue.length >= MAX_QUEUED_INPUTS) return;
  if (inputQueue[inputQueue.length - 1] === direction) return;
  inputQueue.push(direction);
};

// Направление применяется один раз за тик и сверяется с фактическим текущим,
// поэтому два быстрых нажатия не могут развернуть змейку на 180° в саму себя
const applyQueuedDirection = () => {
  const direction = inputQueue.shift();
  if (!direction) return;
  const { dx, dy } = DIRECTIONS[direction];
  if (dx === -snake.dx && dy === -snake.dy) return;
  snake.dx = dx;
  snake.dy = dy;
};

// Стартовая клетка должна лежать на той же решётке, что и еда (кратно CELL_SIZE),
// иначе строгое сравнение координат в проверке поедания никогда не сработает
const START_X = Math.floor(app.screen.width / CELL_SIZE / 2) * CELL_SIZE;
const START_Y = Math.floor(app.screen.height / CELL_SIZE / 2) * CELL_SIZE;

const snake = {
  x: START_X,
  y: START_Y,
  dx: CELL_SIZE,
  dy: 0,
  tails: [],
  maxTails: 3,
  gameOver: false
}

function resetSnake() {
  snake.x = START_X;
  snake.y = START_Y;
  snake.dx = CELL_SIZE;
  snake.dy = 0;
  snake.tails = [];
  snake.maxTails = 3;
  snake.gameOver = false;
  inputQueue.length = 0;
}

const food = { x: 0, y: 0 };

const isCellOccupied = (x, y) =>
  (x === snake.x && y === snake.y) ||
  snake.tails.some((t) => t.x === x && t.y === y);

const randomPositionFood = () => {
  const freeCells = [];
  for (let x = 0; x < app.screen.width; x += CELL_SIZE) {
    for (let y = 0; y < app.screen.height; y += CELL_SIZE) {
      if (!isCellOccupied(x, y)) {
        freeCells.push({ x, y });
      }
    }
  }
  if (freeCells.length === 0) return; // змейка заняла всё поле

  const cell = freeCells[Math.floor(Math.random() * freeCells.length)];
  food.x = cell.x;
  food.y = cell.y;
}
randomPositionFood();
const foodContainer = new Container();
let appleSprite = null;

// Один спрайт яблока на всю игру — при респауне еды он просто переезжает
const drawFood = () => {
  if (!appleSprite) {
    appleSprite = Sprite.from('apple');
    appleSprite.anchor.set(0.5, 0.5);
    foodContainer.addChild(appleSprite);
  }
  appleSprite.position.set(food.x + FOOD_SIZE, food.y + FOOD_SIZE);
}

const snakeContainer = new Container();
snakeContainer.sortableChildren = true;

const getDirection = (current, previous) => {
  if (!current || !previous) return null;

  let dx = current.x - previous.x;
  let dy = current.y - previous.y;

  if (Math.abs(dx) > CELL_SIZE) {
    dx = dx > 0 ? -CELL_SIZE : CELL_SIZE;
  }
  if (Math.abs(dy) > CELL_SIZE) {
    dy = dy > 0 ? -CELL_SIZE : CELL_SIZE;
  }

  if (dx < 0) return 'left';
  if (dx > 0) return 'right';
  if (dy < 0) return 'up';
  if (dy > 0) return 'down';
};

const getTextureKey = (type, direction) => {
  if (!direction) {
    return null;
  }
  const key = `${type}_${direction}`;
  // Texture.from с неизвестным ключом уходит грузить его как URL (404 и пустой
  // спрайт), поэтому ключ обязан существовать в атласе
  if (!allTextureKeys[key]) {
    return null;
  }
  return key;
};

// Спрайты сегментов переиспользуются: длина змейки меняется максимум на 1 за тик,
// пересоздавать весь контейнер каждые 200 мс — лишняя работа для GC и WebGL
const syncSnakeSprites = () => {
  while (snakeContainer.children.length < snake.tails.length) {
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 0.5);
    snakeContainer.addChild(sprite);
  }
  while (snakeContainer.children.length > snake.tails.length) {
    snakeContainer.removeChildAt(snakeContainer.children.length - 1).destroy();
  }
};

const clearSnakeSprites = () => {
  while (snakeContainer.children.length > 0) {
    snakeContainer.removeChildAt(snakeContainer.children.length - 1).destroy();
  }
};

const drawSnake = () => {

  if (snake.gameOver) return;

  applyQueuedDirection();

  snake.x += snake.dx;
  snake.y += snake.dy;

  handleOutOfBounds();

  snake.tails.unshift({ x: snake.x, y: snake.y });

  if (snake.tails.length > snake.maxTails) {
    snake.tails.pop();
  }

  const head = snake.tails[0];

  if (head.x === food.x && head.y === food.y) {
    snake.maxTails++;
    incScore();
    soundManager.playEatSound();
    randomPositionFood();
    drawFood();
  }

  for (let i = 1; i < snake.tails.length; i++) {
    if (head.x === snake.tails[i].x && head.y === snake.tails[i].y) {
      gameOver();
      break;
    }
  }

  syncSnakeSprites();

  snake.tails.forEach((el, idx) => {
    const previous = idx === 0 ? null : snake.tails[idx - 1];
    const next = idx === snake.tails.length - 1 ? null : snake.tails[idx + 1];

    let textureKey;
    if (idx === 0) { // Head
      const direction = getDirection(el, next) || 'right';
      textureKey = getTextureKey('snake_head', direction);
    } else if (idx === snake.tails.length - 1) { // Tail
      const direction = getDirection(previous, el);
      textureKey = getTextureKey('snake_tail', direction);
    } else { // Body
      const prevDirection = getDirection(el, next);
      const nextDirection = getDirection(previous, el);

      if (prevDirection !== nextDirection) {
        textureKey = getTextureKey('snake_body_bend', prevDirection + '_' + nextDirection)
          || getTextureKey('snake_body', nextDirection || prevDirection);
      } else {
        textureKey = getTextureKey('snake_body', prevDirection);
      }
    }

    const sprite = snakeContainer.children[idx];
    sprite.visible = Boolean(textureKey);
    if (!textureKey) return;

    sprite.texture = Texture.from(textureKey);
    sprite.zIndex = idx === 0 ? 1 : 0;
    sprite.position.set(el.x + CELL_SIZE / 2, el.y + CELL_SIZE / 2);
    sprite.width = CELL_SIZE;
    sprite.height = CELL_SIZE;
  });
};

function handleOutOfBounds() {
  if (snake.x > app.screen.width - CELL_SIZE) {
    snake.x = 0;
  }
  if (snake.x < 0) {
    snake.x = app.screen.width - CELL_SIZE;
  }
  if (snake.y > app.screen.height - CELL_SIZE) {
    snake.y = 0;
  }
  if (snake.y < 0) {
    snake.y = app.screen.height - CELL_SIZE;
  }
}

let gameOverTimeout;

// Экраны создаются заново на каждый показ, поэтому без destroy текстуры их
// Text-объектов копятся в GPU-памяти. destroy откладывается до выхода из
// обработчика: уничтожать контейнер посреди диспатча его же pointer-события нельзя
const removeAndDestroyScreen = (screen) => {
  app.stage.removeChild(screen);
  setTimeout(() => screen.destroy({ children: true }), 0);
};

function gameOver() {
  snake.gameOver = true;
  soundManager.playDieSound();
  soundManager.stopBackgroundMusic();

  gameOverTimeout = setTimeout(() => {
    clearSnakeSprites();
    snake.tails = [];

    const gameOverScreen = new GameOverScreen(app, score);
    app.stage.addChild(gameOverScreen);

    gameOverScreen.on("restartGame", () => {
      removeAndDestroyScreen(gameOverScreen);
      restartGame();
    });
  }, 3000);
}

function restartGame() {
  clearTimeout(gameOverTimeout);

  score = 0;
  drawScore();

  resetSnake();
  clearSnakeSprites();

  randomPositionFood();
  drawFood();
  soundManager.playBackgroundMusic();
}

document.addEventListener("keydown", (e) => {
  const direction = KEY_TO_DIRECTION[e.code];
  if (direction) {
    e.preventDefault(); // стрелки не должны скроллить страницу
    queueDirection(direction);
  }
})

// Свайп: доминирующая ось вектора pointerdown→pointerup задаёт направление.
// Движения короче порога — это тапы (кнопки Play обрабатывает сам Pixi)
const SWIPE_THRESHOLD_PX = 24;
let swipeStart = null;

app.view.addEventListener('pointerdown', (e) => {
  swipeStart = { x: e.clientX, y: e.clientY };
});

app.view.addEventListener('pointerup', (e) => {
  if (!swipeStart) return;
  const dx = e.clientX - swipeStart.x;
  const dy = e.clientY - swipeStart.y;
  swipeStart = null;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return;

  const direction = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up');
  queueDirection(direction);
});

// Внутреннее разрешение рендера фиксированное (вся сеточная логика в координатах
// поля) — под окно подгоняется только CSS-размер canvas, с сохранением пропорций
const fitCanvas = () => {
  const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
  app.view.style.width = `${Math.floor(WIDTH * scale)}px`;
  app.view.style.height = `${Math.floor(HEIGHT * scale)}px`;
};
window.addEventListener('resize', fitCanvas);

const updateInterval = 200;
let elapsedSinceTick = 0;

loadAssets().then(() => {
  const startScreen = new StartScreen(app, soundManager);
  app.stage.addChild(startScreen);

  startScreen.on("startGame", () => {
    removeAndDestroyScreen(startScreen);
    inputQueue.length = 0; // свайпы/нажатия на стартовом экране не должны рулить первой партией
    soundManager.playBackgroundMusic();
    const grassTexture = Texture.from("grass_64");
    const grassSprite = new TilingSprite(
      grassTexture,
      app.screen.width,
      app.screen.height
    )
    app.stage.addChild(grassSprite, foodContainer, snakeContainer);
    drawFood();

    app.ticker.add(() => {
      elapsedSinceTick += app.ticker.deltaMS;
      if (elapsedSinceTick >= updateInterval) {
        elapsedSinceTick %= updateInterval;
        drawSnake();
      }
    });
  });
  document.getElementById('game-container').appendChild(app.view);
  fitCanvas();
}).catch((error) => {
  console.error('Failed to load game assets', error);
  scoreContainer.innerHTML = 'Failed to load game assets — try reloading the page';
})
