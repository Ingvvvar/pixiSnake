// Клиент API рекордов. Все ошибки сети глотаются: бэкенд опционален,
// игра обязана работать и без него.

const NAME_STORAGE_KEY = 'pixisnake.playerName';
const MAX_NAME_LENGTH = 20;
const REQUEST_TIMEOUT_MS = 4000;

// Без таймаута зависший бэкенд держал бы промис вечно; в старых браузерах
// без AbortSignal.timeout просто ждём как обычно
const requestSignal = () =>
  typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined;

// localStorage может быть недоступен (приватный режим, отключённые куки) —
// тогда имя просто спросим в следующий раз
export const getSavedPlayerName = () => {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const savePlayerName = (name) => {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // некритично
  }
};

export const postScore = async (name, score) => {
  try {
    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.slice(0, MAX_NAME_LENGTH), score }),
      signal: requestSignal(),
    });
  } catch {
    // бэкенд лежит — рекорд не отправился, игра продолжает работать
  }
};

// null означает «таблицы нет» (бэкенд недоступен или прислал мусор) —
// вызывающий код тогда ничего не показывает
export const fetchLeaderboard = async () => {
  try {
    const response = await fetch('/api/leaderboard', { signal: requestSignal() });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data)) return null;
    return data
      .filter((entry) => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
      .slice(0, 10);
  } catch {
    return null;
  }
};
