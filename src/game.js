import { WORD_SOURCE } from './wordSource.js';

export const MAX_HEALTH = 3;
export const EXTRA_HEART_MAX_HEALTH = MAX_HEALTH + 1;
export const WORD_TIME_MS = 5000;
export const EXTENDED_WORD_TIME_MS = 10000;
export const SHORTENED_WORD_TIME_MS = 3000;
export const WORD_TIME_SECONDS = Math.ceil(WORD_TIME_MS / 1000);
export const WORD_TIME_TENTHS = WORD_TIME_SECONDS * 10;
export const START_COUNTDOWN_MS = 3000;

export const WORDS = createWordsFromSource(WORD_SOURCE);
export const TYPEWRITER_LINE_WORD_COUNTS =
  createTypewriterLineWordCounts(WORD_SOURCE);

export const INITIAL_GAME_STATE = {
  status: "idle",
  wordIndex: 0,
  charIndex: 0,
  health: MAX_HEALTH,
  maxHealth: MAX_HEALTH,
  missedWordIndexes: [],
  typedWords: [],
  wordTimeMs: WORD_TIME_MS,
};

export function gameReducer(state, action) {
  switch (action.type) {
    case "start": {
      const maxHealth = state.maxHealth ?? MAX_HEALTH;
      const wordTimeMs = state.wordTimeMs ?? WORD_TIME_MS;

      return {
        ...INITIAL_GAME_STATE,
        status: "countdown",
        health: maxHealth,
        maxHealth,
        wordTimeMs,
      };
    }

    case "countdown_complete":
      if (state.status !== "countdown") {
        return state;
      }

      return {
        ...state,
        status: "playing",
        wordIndex: 0,
        charIndex: 0,
      };

    case "cheat_complete": {
      const finalWordIndex = Math.max(0, WORDS.length - 1);
      const finalWord = WORDS[finalWordIndex] ?? "";

      return {
        ...state,
        status: "complete",
        wordIndex: finalWordIndex,
        charIndex: finalWord.length,
        health: state.maxHealth ?? MAX_HEALTH,
        typedWords: [...WORDS],
      };
    }

    case "cheat_add_heart": {
      const maxHealth = state.maxHealth ?? MAX_HEALTH;

      if (maxHealth >= EXTRA_HEART_MAX_HEALTH) {
        return state;
      }

      return {
        ...state,
        health: Math.min(EXTRA_HEART_MAX_HEALTH, state.health + 1),
        maxHealth: EXTRA_HEART_MAX_HEALTH,
      };
    }

    case "cheat_extend_timer":
      return {
        ...state,
        wordTimeMs: EXTENDED_WORD_TIME_MS,
      };

    case "cheat_shorten_timer":
      return {
        ...state,
        wordTimeMs: SHORTENED_WORD_TIME_MS,
      };

    case "typed_key":
      return getNextGameState(state, action.key);

    case "word_timeout":
      return getTimeoutGameState(state);

    case "restart": {
      const maxHealth = state.maxHealth ?? MAX_HEALTH;
      const wordTimeMs = state.wordTimeMs ?? WORD_TIME_MS;

      return {
        ...INITIAL_GAME_STATE,
        health: maxHealth,
        maxHealth,
        wordTimeMs,
      };
    }

    default:
      return state;
  }
}

function createWordsFromSource(source) {
  if (Array.isArray(source)) {
    return source.map((word) => String(word).trim()).filter(Boolean);
  }

  return String(source).trim().split(/\s+/).filter(Boolean);
}

function createTypewriterLineWordCounts(source) {
  if (Array.isArray(source)) {
    return [createWordsFromSource(source).length];
  }

  return String(source)
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).filter(Boolean).length);
}

function getTimeoutGameState(state) {
  if (state.status !== "playing") {
    return state;
  }

  const currentWord = WORDS[state.wordIndex];

  if (!currentWord) {
    return {
      ...state,
      status: "complete",
    };
  }

  const nextHealth = Math.max(0, state.health - 1);
  const missedWordState = {
    ...state,
    charIndex: 0,
    health: nextHealth,
    missedWordIndexes: [
      ...(state.missedWordIndexes ?? []),
      state.wordIndex,
    ],
    typedWords: [...state.typedWords, currentWord],
  };

  if (nextHealth === 0) {
    return {
      ...missedWordState,
      status: "failed",
    };
  }

  if (state.wordIndex === WORDS.length - 1) {
    return {
      ...missedWordState,
      charIndex: currentWord.length,
      status: "complete",
    };
  }

  return {
    ...missedWordState,
    wordIndex: state.wordIndex + 1,
  };
}

function getNextGameState(state, typedKey) {
  if (state.status !== "playing") {
    return state;
  }

  const currentWord = WORDS[state.wordIndex];

  if (!currentWord) {
    return {
      ...state,
      status: "complete",
    };
  }

  const expectedKey = currentWord[state.charIndex];

  if (typedKey !== expectedKey) {
    return state;
  }

  const nextCharIndex = state.charIndex + 1;

  if (nextCharIndex < currentWord.length) {
    return {
      ...state,
      charIndex: nextCharIndex,
    };
  }

  if (state.wordIndex === WORDS.length - 1) {
    return {
      ...state,
      status: "complete",
      charIndex: currentWord.length,
      typedWords: [...state.typedWords, currentWord],
    };
  }

  return {
    ...state,
    wordIndex: state.wordIndex + 1,
    charIndex: 0,
    typedWords: [...state.typedWords, currentWord],
  };
}
