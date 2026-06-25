import { WORD_SOURCE } from "./wordSource.js";

export const MAX_HEALTH = 3;
export const WORD_TIME_MS = 5000;
export const WORD_TIME_SECONDS = Math.ceil(WORD_TIME_MS / 1000);
export const WORD_TIME_TENTHS = WORD_TIME_SECONDS * 10;
export const START_COUNTDOWN_MS = 3000;

export const WORDS = createWordsFromSource(WORD_SOURCE);

export const INITIAL_GAME_STATE = {
  status: "idle",
  wordIndex: 0,
  charIndex: 0,
  health: MAX_HEALTH,
};

export function gameReducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...INITIAL_GAME_STATE,
        status: "countdown",
      };

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

    case "typed_key":
      return getNextGameState(state, action.key);

    case "word_timeout":
      return getTimeoutGameState(state);

    case "restart":
      return INITIAL_GAME_STATE;

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

function getTimeoutGameState(state) {
  if (state.status !== "playing") {
    return state;
  }

  const nextHealth = Math.max(0, state.health - 1);

  if (nextHealth === 0) {
    return {
      ...state,
      health: nextHealth,
      status: "failed",
    };
  }

  if (state.wordIndex === WORDS.length - 1) {
    return {
      ...state,
      health: nextHealth,
      status: "complete",
    };
  }

  return {
    ...state,
    health: nextHealth,
    wordIndex: state.wordIndex + 1,
    charIndex: 0,
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
    };
  }

  return {
    ...state,
    wordIndex: state.wordIndex + 1,
    charIndex: 0,
  };
}
