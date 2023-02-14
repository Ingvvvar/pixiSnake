import { Application, Graphics } from './pixi.mjs';

const app = new Application({
  height: 640,
  backgroundColor: 0x2f90a8,
  antialias: true
});

document.body.appendChild(app.view);
// app.stage.sortableChildren = true;

const config = {
  step: 0,
  maxStep: 6,
  sizeCell: 16,
  sizeFood: 16 / 2,
}

const snake = {
  x: app.screen.width / 2,
  y: app.screen.height / 2,
  dx: config.sizeCell,
  dy: 0,
  tails: [],
  maxTails: 3,
  gameOver: false
}

const getRandom = (min, max) => Math.floor(Math.random() * (max - min) + min) * config.sizeCell;

const food = {
  x: getRandom(0, app.screen.width / config.sizeCell),
  y: getRandom(0, app.screen.height / config.sizeCell)
}

const randomPositionFood = () => {
  food.x = getRandom(0, app.screen.width / config.sizeCell),
  food.y = getRandom(0, app.screen.height / config.sizeCell)
}

const drawFood = () => {
  const elem = new Graphics();
  elem.beginFill(0xda01a1, 1);
  elem.drawCircle(food.x, food.y, config.sizeFood);
  elem.endFill();
  elem.position.set(8, 8);
  app.stage.addChild(elem);
}

const drawSnake = () => {
  snake.x += snake.dx;
  snake.y += snake.dy;

  outOfBounds();

  snake.tails.unshift({ x: snake.x, y: snake.y });

  if (snake.tails.length > snake.maxTails) {
    snake.tails.pop();
  }

  const drawRect = (color, x, y, z = 0) => {
    const elem = new Graphics();
    elem.beginFill(color, 1);
    elem.drawRect(x, y, config.sizeCell, config.sizeCell);
    elem.endFill();
    elem.zIndex = z;
    app.stage.addChild(elem);
  }

  snake.tails.forEach((el, idx) => {
    if (idx === 0) {
      drawRect(0x00ff00, el.x, el.y, 1);
    } else {
      drawRect(0x000000, el.x, el.y);
    }
    if (el.x === food.x && el.y === food.y) {
      snake.maxTails++;
      randomPositionFood();
    }
    for (let i = idx + 1; i < snake.tails.length; i++) {
      if (el.x === snake.tails[i].x && el.y === snake.tails[i].y) {
        gameOver();
      }
    }
  })
}

function outOfBounds() {
  if (snake.x > app.screen.width - config.sizeCell) {
    snake.x = 0;
  }
  if (snake.x < 0) {
    snake.x = app.screen.width - config.sizeCell;
  }
  if (snake.y > app.screen.height - config.sizeCell) {
    snake.y = 0;
  }
  if (snake.y < 0) {
    snake.y = app.screen.height - config.sizeCell;
  }
}

function gameOver() {
  snake.gameOver = true;
}

document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp") {
    snake.dx = 0;
    snake.dy = -config.sizeCell;
  }
  if (e.code === "ArrowDown") {
    snake.dx = 0;
    snake.dy = config.sizeCell;
  }
  if (e.code === "ArrowLeft") {
    snake.dx = -config.sizeCell;
    snake.dy = 0;
  }
  if (e.code === "ArrowRight") {
    snake.dx = config.sizeCell;
    snake.dy = 0;
  }
})

app.ticker.add(() => {
  if (++config.step < config.maxStep) {
    return;
  }
  if (!snake.gameOver) {
    config.step = 0;
    app.stage.removeChildren();
    drawFood();
    drawSnake();
    app.stage.sortChildren();
  }
});
