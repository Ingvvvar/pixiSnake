import { Howl } from 'howler';
import appConstants from './constants';

export default class SoundManager {
  constructor() {
    this.backgroundMusic = new Howl({
      src: ['sounds/taratata.m4a'],
      loop: true,
      volume: appConstants.sound.MUSIC_VOLUME,
    });

    // ogg + m4a: Howler берёт первый формат, который умеет браузер
    // (Safari не воспроизводит ogg)
    this.eatSound = new Howl({
      src: ['sounds/eatSound.ogg', 'sounds/eatSound.m4a'],
      volume: appConstants.sound.EFFECT_VOLUME,
    });

    this.dieSound = new Howl({
      src: ['sounds/dieSound.ogg', 'sounds/dieSound.m4a'],
      volume: appConstants.sound.EFFECT_VOLUME,
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
