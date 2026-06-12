// HTML-оверлей для ввода имени: в Pixi нет текстовых полей, а нативный input
// бесплатно даёт мобильную клавиатуру, IME и автокоррекцию. Стили — в index.html.

const MAX_NAME_LENGTH = 20;

export const askPlayerName = () =>
  new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'name-overlay';
    overlay.innerHTML = `
      <form>
        <div class="name-title">ENTER YOUR NAME</div>
        <input type="text" maxlength="${MAX_NAME_LENGTH}" placeholder="Player" autocomplete="off" spellcheck="false">
        <button type="submit">OK</button>
      </form>
    `;

    document.getElementById('game-container').appendChild(overlay);

    const input = overlay.querySelector('input');
    input.focus();

    overlay.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const name = input.value.trim().slice(0, MAX_NAME_LENGTH) || 'Player';
      overlay.remove();
      resolve(name);
    });
  });
