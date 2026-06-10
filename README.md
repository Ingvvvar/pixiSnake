# pixiSnake 🐍

Classic snake game built with [Pixi.js](https://pixijs.com/) 7 and [Howler.js](https://howlerjs.com/).

**[▶ Play the demo](https://ingvvvar.github.io/pixiSnake/)**

## Controls

- **Desktop:** arrow keys
- **Mobile:** swipe in any direction

Eat apples, grow longer, don't bite your own tail. The field wraps around — going through a wall brings you out on the opposite side.

## Development

```bash
npm install
npm start        # dev server with hot reload
npm run build    # production build into dist/
npm run deploy   # build + publish to GitHub Pages
```

## Tech

- Pixi.js 7 (WebGL rendering, sprite pooling, texture atlas keys)
- Howler.js (background music + sound effects)
- webpack 5 (dev server, production minification, contenthash)
