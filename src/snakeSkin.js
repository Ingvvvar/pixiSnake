// Подбор текстуры сегмента змейки по соседям — голова/тело/изгиб/хвост с учётом
// направления. Логика повторяет одиночную игру (src/index.js), но работает в
// координатах клетки (шаг ±1), а не в пикселях: в мультиплеере поле со стенами,
// без заворота за край, поэтому соседние сегменты всегда строго смежны и
// поправка на «перескок через край» не нужна.

import { allTextureKeys } from './textures';

// Направление перехода from -> to (соседние клетки, разница по одной оси на 1)
const dirBetween = (from, to) => {
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx < 0) return 'left';
  if (dx > 0) return 'right';
  if (dy < 0) return 'up';
  if (dy > 0) return 'down';
  return null;
};

// Texture.from с неизвестным ключом ушёл бы грузить его как URL (404, пустой
// спрайт) — поэтому ключ обязан существовать в атласе
const textureKey = (type, direction) => {
  if (!direction) return null;
  const key = `${type}_${direction}`;
  return allTextureKeys[key] ? key : null;
};

// segments — массив {x, y} в координатах клетки, голова под индексом 0
export const segmentTextureKey = (segments, idx) => {
  const el = segments[idx];
  const previous = idx === 0 ? null : segments[idx - 1];
  const next = idx === segments.length - 1 ? null : segments[idx + 1];

  if (idx === 0) {
    // голова смотрит от следующего сегмента наружу
    const direction = dirBetween(next, el) || 'right';
    return textureKey('snake_head', direction);
  }

  if (idx === segments.length - 1) {
    // хвост ориентирован в сторону предыдущего (к голове) сегмента
    return textureKey('snake_tail', dirBetween(el, previous));
  }

  const prevDirection = dirBetween(next, el);
  const nextDirection = dirBetween(el, previous);

  if (prevDirection !== nextDirection) {
    return textureKey('snake_body_bend', `${prevDirection}_${nextDirection}`)
      || textureKey('snake_body', nextDirection || prevDirection);
  }
  return textureKey('snake_body', prevDirection);
};
