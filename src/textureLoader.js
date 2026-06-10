import { Assets } from 'pixi.js';
import appTextures, { allTextureKeys } from './textures';

Object.entries(appTextures).forEach(([key, value]) => {
  Assets.add({ alias: key, src: value });
})

export const loadAssets = () => Assets.load(Object.values(allTextureKeys));
