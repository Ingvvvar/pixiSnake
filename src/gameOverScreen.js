import { Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import appConstants from './constants';

const LEADERBOARD = {
  WIDTH: 280,
  MARGIN_RIGHT: 24,
  PADDING: 18,
  TITLE_SIZE: 20,
  ROW_HEIGHT: 26,
  ROW_SIZE: 16,
  NAME_MAX_CHARS: 14,
  // топ-3 подсвечиваются как медали, остальные — белым
  RANK_COLORS: ['#ffd54f', '#cfd8dc', '#d7a86e'],
};

class GameOverScreen extends Container {
  constructor(app, score) {
    super();

    this.app = app;
    this.createBackground();
    this.createGameOverText();
    this.createScoreText(score);
    this.createRestartButton();
  }

  createBackground() {
    const background = Sprite.from("end_screen_bg");
    background.width = this.app.screen.width;
    background.height = this.app.screen.height;
    this.addChild(background);
  }

  createGameOverText() {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 36,
      fill: "white",
    });

    const text = new Text("Game Over", style);
    text.anchor.set(0.5, 0.5);
    text.x = this.app.screen.width / 2;
    text.y = this.app.screen.height / 2 - 50;

    this.addChild(text);
  }

  createScoreText(score) {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: "white",
    });

    const text = new Text(`Your score: ${score}`, style);
    text.anchor.set(0.5, 0.5);
    text.x = this.app.screen.width / 2;
    text.y = this.app.screen.height / 2;

    this.addChild(text);
  }

  createRestartButton() {
    const button = Sprite.from("play_button");
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.anchor.set(0.5, 1);
    button.scale.set(appConstants.ui.RESTART_BUTTON_SCALE);
    // под текстами счёта (h/2), с тем же визуальным положением, что и раньше (y=470)
    button.position.set(this.app.screen.width / 2, this.app.screen.height / 2 + 150);
    button.on("pointerdown", () => this.emit("restartGame"));
    this.addChild(button);
  }

  // Вызывается асинхронно, когда (и если) пришёл ответ API: без таблицы экран
  // выглядит как раньше, недоступность бэкенда ничего не ломает
  showLeaderboard(entries) {
    if (this.destroyed || !entries || entries.length === 0) return;

    const { WIDTH, MARGIN_RIGHT, PADDING, TITLE_SIZE, ROW_HEIGHT, ROW_SIZE, NAME_MAX_CHARS, RANK_COLORS } = LEADERBOARD;
    const panelHeight = PADDING + TITLE_SIZE + 14 + entries.length * ROW_HEIGHT + PADDING;

    const panel = new Container();
    panel.position.set(
      this.app.screen.width - WIDTH - MARGIN_RIGHT,
      (this.app.screen.height - panelHeight) / 2
    );

    const background = new Graphics();
    background.lineStyle(2, 0x4caf50);
    background.beginFill(0x101510, 0.85);
    background.drawRoundedRect(0, 0, WIDTH, panelHeight, 8);
    background.endFill();
    panel.addChild(background);

    const title = new Text("TOP 10", new TextStyle({
      fontFamily: "Arial",
      fontSize: TITLE_SIZE,
      fontWeight: "bold",
      fill: "#7ddc7d",
      letterSpacing: 2,
    }));
    title.anchor.set(0.5, 0);
    title.position.set(WIDTH / 2, PADDING);
    panel.addChild(title);

    entries.forEach((entry, idx) => {
      const rowStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: ROW_SIZE,
        fontWeight: idx < 3 ? "bold" : "normal",
        fill: RANK_COLORS[idx] || "white",
      });
      const rowY = PADDING + TITLE_SIZE + 14 + idx * ROW_HEIGHT;

      const displayName = entry.name.length > NAME_MAX_CHARS
        ? `${entry.name.slice(0, NAME_MAX_CHARS - 1)}…`
        : entry.name;
      const nameText = new Text(`${idx + 1}. ${displayName}`, rowStyle);
      nameText.position.set(PADDING, rowY);
      panel.addChild(nameText);

      const scoreText = new Text(String(entry.score), rowStyle);
      scoreText.anchor.set(1, 0);
      scoreText.position.set(WIDTH - PADDING, rowY);
      panel.addChild(scoreText);
    });

    this.addChild(panel);
  }
}

export default GameOverScreen;
