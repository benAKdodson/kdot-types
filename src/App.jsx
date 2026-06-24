import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import GameStatusOverlay from "./components/GameStatusOverlay.jsx";
import TopHud from "./components/TopHud.jsx";
import Word from "./components/Word.jsx";
import {
  gameReducer,
  INITIAL_GAME_STATE,
  WORD_TIME_MS,
  WORDS,
} from "./game.js";
import { isInteractiveTarget } from "./helpers.js";

function App() {
  const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState(WORD_TIME_MS);
  const remainingMsRef = useRef(WORD_TIME_MS);

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
      setIsTimerPaused(false);
    }

    remainingMsRef.current = WORD_TIME_MS;
    setRemainingMs(WORD_TIME_MS);
  }, [gameState.status, gameState.wordIndex]);

  useEffect(() => {
    if (gameState.status !== "playing" || isTimerPaused) {
      return undefined;
    }

    const startedAt = window.performance.now();
    const startingRemainingMs = remainingMsRef.current;
    let hasTimedOut = false;
    let intervalId;

    function updateCountdown() {
      if (hasTimedOut) {
        return;
      }

      const elapsedMs = window.performance.now() - startedAt;
      const nextRemainingMs = Math.max(0, startingRemainingMs - elapsedMs);

      remainingMsRef.current = nextRemainingMs;
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs === 0) {
        hasTimedOut = true;
        window.clearInterval(intervalId);
        dispatch({
          type: "word_timeout",
        });
      }
    }

    updateCountdown();

    intervalId = window.setInterval(updateCountdown, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState.status, gameState.wordIndex, isTimerPaused]);

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

  function handleToggleTimerPause(event) {
    event.currentTarget.blur();
    setIsTimerPaused((currentIsTimerPaused) => !currentIsTimerPaused);
  }

  return (
    <main className="typing-stage">
      <TopHud
        health={gameState.health}
        isTimerPausable={gameState.status === "playing"}
        isTimerPaused={isTimerPaused}
        onRestart={handleRestart}
        onToggleTimerPause={handleToggleTimerPause}
        tenthsRemaining={Math.ceil(remainingMs / 100)}
      />

      <div className="word-line" aria-label="Typing words">
        {positionedWords.map(({ distance, index, offset, word }) => (
          <Word
            charIndex={gameState.charIndex}
            distance={distance}
            isActive={index === gameState.wordIndex}
            key={`${index}-${word}`}
            offset={offset}
            word={word}
          />
        ))}
      </div>

      <GameStatusOverlay onStart={handleStart} status={gameState.status} />
    </main>
  );
}

export default App;
