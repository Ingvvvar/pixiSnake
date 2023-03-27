import { Container, Sprite, Text, TextStyle } from "pixi.js";

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
    button.interactive = true;
    button.cursor = 'pointer';
    button.anchor.set(0.5, 1);
    button.scale.set(0.3, 0.3);
    button.position.set(this.app.screen.width / 2, 470);
    button.on("pointerdown", () => this.emit("restartGame"));
    this.addChild(button);
  }
}

export default GameOverScreen;
