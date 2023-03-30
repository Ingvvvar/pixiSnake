import { Container, Sprite, Texture } from "pixi.js";

export default class StartScreen extends Container {
  constructor(app, soundManager) {
    super();

    this.app = app;
    this.soundManager = soundManager;

    this.background = new Sprite(Texture.from('start_screen_bg'));
    this.playButton = new Sprite(Texture.from('play_button'));

    this.addChild(this.background);
    this.addChild(this.playButton);

    this.background.width = app.screen.width;
    this.background.height = app.screen.height;

    this.playButton.anchor.set(0.5, 1);
    this.playButton.scale.set(0.5, 0.5);
    this.playButton.position.set(app.screen.width / 2, app.screen.height);

    this.playButton.interactive = true;
    this.playButton.cursor = 'pointer';

    this.playButton.on("pointerdown", () => {
      this.emit("startGame");
    });
  }
}
