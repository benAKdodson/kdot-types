import {
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import {
  Play,
  RotateCcw,
} from 'lucide-react';

import keyKPressedSrc from './Assets/Keys/Key-K-Depressed.png';
import keyKSrc from './Assets/Keys/Key-K.png';

const MAX_HEALTH = 3;
const WORD_TIME_MS = 5000;
const WORD_TIME_SECONDS = Math.ceil(WORD_TIME_MS / 1000);
const WORD_TIME_TENTHS = WORD_TIME_SECONDS * 10;
const TITLE_KEYS = ["K", "D", "O", "T", " ", "T", "Y", "P", "E", "S"];

const WORDS = [
  "dear",
  "kerrianne.",
  "cake",
  "music",
  "dance",
  "flowers",
  "present",
  "sparkle",
  "surprise",
  "higgledypiggledy",
];

const INITIAL_GAME_STATE = {
  status: "idle",
  wordIndex: 0,
  charIndex: 0,
  health: MAX_HEALTH,
};

function gameReducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...INITIAL_GAME_STATE,
        status: "playing",
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

  const nextWordIndex = state.wordIndex + 1;

  return {
    ...state,
    wordIndex: nextWordIndex,
    charIndex: 0,
  };
}

function getPositionClass(offset) {
  if (offset < -4) {
    return "word-offscreen-left";
  }

  if (offset > 4) {
    return "word-offscreen-right";
  }

  if (offset < 0) {
    return `word-position-neg-${Math.abs(offset)}`;
  }

  if (offset > 0) {
    return `word-position-pos-${offset}`;
  }

  return "word-position-center";
}

function isInteractiveTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest("button"));
}

function formatCountdown(tenthsRemaining) {
  const wholeSeconds = Math.floor(tenthsRemaining / 10);
  const decimal = tenthsRemaining % 10;

  return `${String(wholeSeconds)}.${decimal}`;
}

function App() {
  const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [tenthsRemaining, setTenthsRemaining] = useState(WORD_TIME_TENTHS);
  const [pressedTitleKey, setPressedTitleKey] = useState(null);

  const positionedWords = useMemo(
    () =>
      WORDS.map((word, index) => {
        const offset = index - gameState.wordIndex;

        return {
          distance: Math.abs(offset),
          index,
          offset,
          word,
        };
      }),
    [gameState.wordIndex],
  );

  useEffect(() => {
    function handleKeyDown(event) {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();

      dispatch({
        type: "typed_key",
        key: event.key.toLowerCase(),
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (gameState.status !== "playing") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch({
        type: "word_timeout",
      });
    }, WORD_TIME_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [gameState.status, gameState.wordIndex]);

  useEffect(() => {
    if (gameState.status !== "playing") {
      setTenthsRemaining(WORD_TIME_TENTHS);
      return undefined;
    }

    const startedAt = window.performance.now();

    function updateCountdown() {
      const elapsedMs = window.performance.now() - startedAt;
      const remainingMs = Math.max(1, WORD_TIME_MS - elapsedMs);

      setTenthsRemaining(Math.ceil(remainingMs / 100));
    }

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState.status, gameState.wordIndex]);

  useEffect(() => {
    let pressTimeoutId;
    let nextPressTimeoutId;
    const titleKeyIndexes = TITLE_KEYS.map((key, index) =>
      key === " " ? null : index,
    ).filter((index) => index !== null);

    function schedulePress() {
      const delayMs = 500 + Math.random() * 900;

      nextPressTimeoutId = window.setTimeout(() => {
        const keyIndex =
          titleKeyIndexes[Math.floor(Math.random() * titleKeyIndexes.length)];

        setPressedTitleKey(keyIndex);

        pressTimeoutId = window.setTimeout(() => {
          setPressedTitleKey(null);
          schedulePress();
        }, 120);
      }, delayMs);
    }

    schedulePress();

    return () => {
      window.clearTimeout(pressTimeoutId);
      window.clearTimeout(nextPressTimeoutId);
    };
  }, []);

  function handleRestart(event) {
    event.currentTarget.blur();
    dispatch({
      type: "restart",
    });
  }

  function handleStart(event) {
    event.currentTarget.blur();
    dispatch({
      type: "start",
    });
  }

  return (
    <main className="typing-stage">
      <div className="top-hud">
        <KeyTitle pressedKeyIndex={pressedTitleKey} />

        <div className="ui-bar" aria-label="Typing test controls">
          <div
            aria-label={`${gameState.health} of ${MAX_HEALTH} hearts remaining`}
            className="health-meter"
          >
            {Array.from({ length: MAX_HEALTH }).map((_, index) => (
              <span
                aria-hidden="true"
                className={index < gameState.health ? "" : "heart-lost"}
                key={index}
              >
                ❤️
              </span>
            ))}
          </div>

          <div
            aria-label={`${formatCountdown(tenthsRemaining)} seconds remaining`}
            className="timer-count"
          >
            {formatCountdown(tenthsRemaining)}
          </div>

          <button
            aria-label="Restart test"
            className="restart-button"
            onClick={handleRestart}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={18} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className="word-line" aria-label="Typing words">
        {positionedWords.map(({ distance, index, offset, word }) => (
          <Word
            charIndex={gameState.charIndex}
            distance={distance}
            isActive={index === gameState.wordIndex}
            key={`${index}-${word}`}
            positionClass={getPositionClass(offset)}
            word={word}
          />
        ))}
      </div>

      {gameState.status === "idle" ? (
        <div className="game-overlay" role="presentation">
          <section
            aria-modal="true"
            aria-labelledby="welcome-title"
            className="game-dialog welcome-dialog"
            role="dialog"
          >
            <h1 className="dialog-title welcome-title" id="welcome-title">
              Welcome to KDot Types
            </h1>
            <div className="welcome-copy">
              <p>
                The rules are simple: 
                <br/>- You have 5 seconds to type each word.
                <br/>- You lose 1 heart for each word you miss.
                <br/>- Lose 3 and you're done mate.
              </p>
              <p>
                There are no backspaces - and typing the wrong letter doesnt lose you any health. Good luck!
              </p>
            </div>
            <button
              autoFocus
              className="dialog-button"
              onClick={handleStart}
              type="button"
            >
              <Play aria-hidden="true" fill="currentColor" size={17} />
              Start
            </button>
          </section>
        </div>
      ) : null}

      {gameState.status === "complete" ? (
        <div className="game-overlay" role="presentation">
          <section
            aria-modal="true"
            aria-labelledby="complete-title"
            className="game-dialog"
            role="dialog"
          >
            <p className="dialog-kicker">Complete</p>
            <h1 className="dialog-title" id="complete-title">
              Done!
            </h1>
            <button
              autoFocus
              className="dialog-button"
              onClick={handleStart}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={17} strokeWidth={2.25} />
              Restart
            </button>
          </section>
        </div>
      ) : null}

      {gameState.status === "failed" ? (
        <div className="game-overlay" role="presentation">
          <section
            aria-modal="true"
            aria-labelledby="failed-title"
            className="game-dialog"
            role="dialog"
          >
            <p className="dialog-kicker">Out of lives</p>
            <h1 className="dialog-title" id="failed-title">
              Try again?
            </h1>
            <button
              autoFocus
              className="dialog-button"
              onClick={handleStart}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={17} strokeWidth={2.25} />
              Restart
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function KeyTitle({ pressedKeyIndex }) {
  return (
    <div aria-label="KDOT TYPES" className="key-title" role="img">
      {TITLE_KEYS.map((key, index) =>
        key === " " ? (
          <span aria-hidden="true" className="key-title-space" key={index} />
        ) : (
          <img
            alt=""
            aria-hidden="true"
            className="key-title-sprite"
            key={`${key}-${index}`}
            src={pressedKeyIndex === index ? keyKPressedSrc : keyKSrc}
          />
        ),
      )}
    </div>
  );
}

function Word({ charIndex, distance, isActive, positionClass, word }) {
  const className = [
    "word",
    positionClass,
    isActive ? "word-active" : "",
    distance >= 3 ? "word-far" : "",
    distance === 2 ? "word-soft" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} style={{ "--letter-count": word.length || 1 }}>
      {isActive
        ? word.split("").map((letter, index) => (
            <span
              className={index < charIndex ? "letter-typed" : "letter-pending"}
              key={`${letter}-${index}`}
            >
              {letter}
            </span>
          ))
        : word}
    </span>
  );
}

export default App;
