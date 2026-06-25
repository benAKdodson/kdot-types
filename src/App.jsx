import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import CountdownWord from "./components/CountdownWord.jsx";
import GameStatusOverlay from "./components/GameStatusOverlay.jsx";
import TopHud from "./components/TopHud.jsx";
import WelcomePanel from "./components/WelcomePanel.jsx";
import Word from "./components/Word.jsx";
import {
  gameReducer,
  INITIAL_GAME_STATE,
  START_COUNTDOWN_MS,
  WORD_TIME_MS,
  WORDS,
} from "./game.js";
import { isInteractiveTarget } from "./helpers.js";

function App() {
  const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [countdownRemainingMs, setCountdownRemainingMs] =
    useState(START_COUNTDOWN_MS);
  const [remainingMs, setRemainingMs] = useState(WORD_TIME_MS);
  const remainingMsRef = useRef(WORD_TIME_MS);
  const titlePatternRequestIdRef = useRef(0);
  const [titlePatternRequest, setTitlePatternRequest] = useState(null);
  const isTitleIdleAnimationEnabled =
    gameState.status === "idle" || isTimerPaused;
  const countdownValue = Math.max(1, Math.ceil(countdownRemainingMs / 1000));

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
        key: event.key,
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
    if (gameState.status !== "countdown") {
      setCountdownRemainingMs(START_COUNTDOWN_MS);
      return undefined;
    }

    const startedAt = window.performance.now();
    let hasCompleted = false;
    let intervalId;

    function updateCountdown() {
      if (hasCompleted) {
        return;
      }

      const elapsedMs = window.performance.now() - startedAt;
      const nextRemainingMs = Math.max(0, START_COUNTDOWN_MS - elapsedMs);

      setCountdownRemainingMs(nextRemainingMs);

      if (nextRemainingMs === 0) {
        hasCompleted = true;
        window.clearInterval(intervalId);
        dispatch({
          type: "countdown_complete",
        });
      }
    }

    updateCountdown();

    intervalId = window.setInterval(updateCountdown, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState.status]);

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

  function triggerTitlePattern(name) {
    titlePatternRequestIdRef.current += 1;
    setTitlePatternRequest({
      name,
      requestId: titlePatternRequestIdRef.current,
    });
  }

  function handleRestart(event) {
    event.currentTarget.blur();
    triggerTitlePattern("right-to-left-fast");
    dispatch({
      type: "restart",
    });
  }

  function handleStart(event) {
    event.currentTarget.blur();
    triggerTitlePattern(
      gameState.status === "idle" ? "left-to-right-fast" : "right-to-left-fast",
    );
    dispatch({
      type: "start",
    });
  }

  function handleToggleTimerPause(event) {
    event.currentTarget.blur();
    triggerTitlePattern(isTimerPaused ? "left-to-right-fast" : "all-tap");
    setIsTimerPaused((currentIsTimerPaused) => !currentIsTimerPaused);
  }

  return (
    <main className="typing-stage">
      <TopHud
        health={gameState.health}
        isTimerPausable={gameState.status === "playing"}
        isTimerPaused={isTimerPaused}
        isTitleIdleAnimationEnabled={isTitleIdleAnimationEnabled}
        onRestart={handleRestart}
        onToggleTimerPause={handleToggleTimerPause}
        centisecondsRemaining={Math.ceil(remainingMs / 10)}
        titlePatternRequest={titlePatternRequest}
      />

      <div className="game-content">
        {gameState.status === "idle" ? (
          <WelcomePanel onStart={handleStart} />
        ) : gameState.status === "countdown" ? (
          <CountdownWord value={countdownValue} />
        ) : (
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
        )}
      </div>

      <GameStatusOverlay onStart={handleStart} status={gameState.status} />
    </main>
  );
}

export default App;
