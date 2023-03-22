import { Application, Container, Graphics, Texture, TilingSprite, Sprite } from "pixi.js";

const app = new Application({
  height: 640,
  width: 640,
  backgroundColor: 0x2f90a8,
  antialias: true
});

document.body.appendChild(app.view);
// app.stage.sortableChildren = true;

const CELL_SIZE = 64;
const FOOD_SIZE = CELL_SIZE / 2;

const grassTexture = Texture.from("grass_64.png");
const grassSprite = new TilingSprite(
  grassTexture,
  app.screen.width,
  app.screen.height
)
app.stage.addChild(grassSprite);

console.log(app.stage)

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

const drawSnake = () => {
  snake.x += snake.dx;
  snake.y += snake.dy;


  handleOutOfBounds();

  const headX = snake.x + CELL_SIZE / 2;
  const headY = snake.y + CELL_SIZE / 2;
  const foodX = food.x + CELL_SIZE / 2;
  const foodY = food.y + CELL_SIZE / 2;
  const distance = Math.sqrt((headX - foodX) ** 2 + (headY - foodY) ** 2);

  snake.tails.unshift({ x: snake.x, y: snake.y });

  if (snake.tails.length > snake.maxTails) {
    snake.tails.pop();
  }

  snake.tails.forEach((el, idx) => {
    const color = idx === 0 ? (distance <= CELL_SIZE * 2 ? 0xff0000 : 0x00ff00) : 0x000000;
    const zIndex = idx === 0 ? 1 : 0;
    const graphics = new Graphics();
    graphics.beginFill(color, 1);
    graphics.drawRect(el.x, el.y, CELL_SIZE, CELL_SIZE);
    graphics.endFill();
    graphics.zIndex = zIndex;
    snakeContainer.addChild(graphics);
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
  })
}

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
  if (e.code === "ArrowUp") {
    snake.dx = 0;
    snake.dy = -CELL_SIZE;
  }
  if (e.code === "ArrowDown") {
    snake.dx = 0;
    snake.dy = CELL_SIZE;
  }
  if (e.code === "ArrowLeft") {
    snake.dx = -CELL_SIZE;
    snake.dy = 0;
  }
  if (e.code === "ArrowRight") {
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
      snakeContainer.sortChildren();
    }
    lastUpdateTime = now - (deltaTime % updateInterval);
  }
});
