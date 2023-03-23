import { Application, Container, Texture, TilingSprite, Sprite } from "pixi.js";

const app = new Application({
  height: 640,
  width: 640,
  antialias: true
});

document.body.appendChild(app.view);

const CELL_SIZE = 64;
const FOOD_SIZE = CELL_SIZE / 2;

const grassTexture = Texture.from("grass_64.png");
const grassSprite = new TilingSprite(
  grassTexture,
  app.screen.width,
  app.screen.height
)
app.stage.addChild(grassSprite);

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
  const apple = Sprite.from('apple.png');
  apple.anchor.set(0.5, 0.5)
  apple.position.set(food.x + FOOD_SIZE, food.y + FOOD_SIZE);
  foodContainer.addChild(apple)
  app.stage.addChild(foodContainer);
}
drawFood();

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
  return Sprite.from(`${type}_${direction}.png`);
};

const drawSnake = () => {
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
      const direction = getDirection(el, next);
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

    segmentSprite.anchor.set(0.5, 0.5);
    segmentSprite.position.set(el.x + CELL_SIZE / 2, el.y + CELL_SIZE / 2);
    segmentSprite.width = CELL_SIZE;
    segmentSprite.height = CELL_SIZE;

    snakeContainer.addChild(segmentSprite);
    app.stage.addChild(snakeContainer);

    if (el.x === food.x && el.y === food.y) {
      snake.maxTails++;
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

function gameOver() {
  snake.gameOver = true;
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
