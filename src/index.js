import { Application, Container, Texture, TilingSprite, Sprite } from "pixi.js";
import appConstants from './constants';
import { loadAssets } from './textureLoader';
import StartScreen from './startScreen';
import GameOverScreen from './gameOverScreen';

const WIDTH = appConstants.size.WIDTH;
const HEIGHT = appConstants.size.HEIGHT;
const CELL_SIZE = appConstants.size.CELL_SIZE;
const FOOD_SIZE = appConstants.size.CELL_SIZE / 2;

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
  antialias: true
});
globalThis.__PIXI_APP__ = app;
drawScore()

const snake = {
  x: app.screen.width / 2,
  y: app.screen.height / 2,
  dx: CELL_SIZE,
  dy: 0,
  tails: [],
  maxTails: 3,
  gameOver: false
}

const getRandomPosition = (min, max) => Math.floor(Math.random() * (max - min) + min) * CELL_SIZE;

const food = {
  x: getRandomPosition(0, app.screen.width / CELL_SIZE),
  y: getRandomPosition(0, app.screen.height / CELL_SIZE)
}

const randomPositionFood = () => {
  food.x = getRandomPosition(0, app.screen.width / CELL_SIZE),
    food.y = getRandomPosition(0, app.screen.height / CELL_SIZE)
}
const foodContainer = new Container();
const drawFood = () => {
  const apple = Sprite.from('apple');
  apple.anchor.set(0.5, 0.5)
  apple.position.set(food.x + FOOD_SIZE, food.y + FOOD_SIZE);
  foodContainer.addChild(apple)
  app.stage.addChild(foodContainer);
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

const getSprite = (type, direction) => {
  if (!direction) {
    return null;
  }
  return Sprite.from(`${type}_${direction}`);
};

const drawSnake = () => {

  if (snake.gameOver) return;

  snake.x += snake.dx;
  snake.y += snake.dy;

  handleOutOfBounds();

  snake.tails.unshift({ x: snake.x, y: snake.y });

  if (snake.tails.length > snake.maxTails) {
    snake.tails.pop();
  }

  snake.tails.forEach((el, idx) => {
    let segmentSprite;
    const previous = idx === 0 ? null : snake.tails[idx - 1];
    const next = idx === snake.tails.length - 1 ? null : snake.tails[idx + 1];
  
    if (idx === 0) { // Head
      const direction = getDirection(el, next) || 'right';
      segmentSprite = getSprite('snake_head', direction);
      segmentSprite.zIndex = 1;
    } else if (idx === snake.tails.length - 1) { // Tail
      const direction = getDirection(previous, el);
      segmentSprite = getSprite('snake_tail', direction);
    } else { // Body
      const prevDirection = getDirection(el, next);
      const nextDirection = getDirection(previous, el);
  
      if (prevDirection !== nextDirection) {
        segmentSprite = getSprite('snake_body_bend', prevDirection + '_' + nextDirection);
      } else {
        segmentSprite = getSprite('snake_body', prevDirection);
      }
    }
  
    if (segmentSprite) {
      segmentSprite.anchor.set(0.5, 0.5);
      segmentSprite.position.set(el.x + CELL_SIZE / 2, el.y + CELL_SIZE / 2);
      segmentSprite.width = CELL_SIZE;
      segmentSprite.height = CELL_SIZE;
  
      snakeContainer.addChild(segmentSprite);
      app.stage.addChild(snakeContainer);
    }

    if (el.x === food.x && el.y === food.y) {
      snake.maxTails++;
      incScore();
      foodContainer.removeChildren();
      randomPositionFood();
      drawFood();
    }
    for (let i = idx + 1; i < snake.tails.length; i++) {
      if (el.x === snake.tails[i].x && el.y === snake.tails[i].y) {
        gameOver();
      }
    }
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

function gameOver() {
  snake.gameOver = true;

  gameOverTimeout = setTimeout(() => {
    snakeContainer.removeChildren();
    snake.tails = [];

    const gameOverScreen = new GameOverScreen(app, score);
    app.stage.addChild(gameOverScreen);

    gameOverScreen.on("restartGame", () => {
      app.stage.removeChild(gameOverScreen);
      restartGame();
    });
  }, 3000);
}

function restartGame() {
  clearTimeout(gameOverTimeout);

  score = 0;
  drawScore();

  snake.x = app.screen.width / 2;
  snake.y = app.screen.height / 2;
  snake.dx = CELL_SIZE;
  snake.dy = 0;
  snake.tails = [];
  snake.maxTails = 3;
  snake.gameOver = false;

  foodContainer.removeChildren();
  randomPositionFood();
  drawFood();

  app.stage.addChild(snakeContainer);
  snakeContainer.removeChildren();
}

document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp" && snake.dy !== CELL_SIZE) {
    snake.dx = 0;
    snake.dy = -CELL_SIZE;
  }
  if (e.code === "ArrowDown" && snake.dy !== -CELL_SIZE) {
    snake.dx = 0;
    snake.dy = CELL_SIZE;
  }
  if (e.code === "ArrowLeft" && snake.dx !== CELL_SIZE) {
    snake.dx = -CELL_SIZE;
    snake.dy = 0;
  }
  if (e.code === "ArrowRight" && snake.dx !== -CELL_SIZE) {
    snake.dx = CELL_SIZE;
    snake.dy = 0;
  }
})

const updateInterval = 200;
let lastUpdateTime = Date.now();

loadAssets((progress) => {
  if (progress === 'all') {

    const startScreen = new StartScreen(app);
    app.stage.addChild(startScreen);

    startScreen.on("startGame", () => {
      app.stage.removeChild(startScreen);
      const grassTexture = Texture.from("grass_64");
      const grassSprite = new TilingSprite(
        grassTexture,
        app.screen.width,
        app.screen.height
      )
      app.stage.addChild(grassSprite);
      drawFood();

      app.ticker.add(() => {
        const now = Date.now();
        const deltaTime = now - lastUpdateTime;

        if (deltaTime > updateInterval) {
          if (!snake.gameOver) {
            snakeContainer.removeChildren();
            drawSnake();
          }
          lastUpdateTime = now - (deltaTime % updateInterval);
        }
      });
    });
    document.body.appendChild(app.view);
  }
})
