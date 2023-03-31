import { Howl, Howler } from 'howler';

export default class SoundManager {
  constructor() {
    this.backgroundMusic = new Howl({
      src: ['sounds/taratata.mp3'],
      loop: true,
      volume: 0.2,
    });

    this.eatSound = new Howl({
      src: ['sounds/eatSound.ogg'],
      volume: 0.7,
    });

    this.dieSound = new Howl({
      src: ['sounds/dieSound.ogg'],
      volume: 0.7,
    });
  }

  playBackgroundMusic() {
    this.backgroundMusic.play();
  }

  stopBackgroundMusic() {
    this.backgroundMusic.stop();
  }

  playEatSound() {
    this.eatSound.play();
  }

  playDieSound() {
    this.dieSound.play();
  }
}
