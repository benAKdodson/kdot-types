import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import CountdownWord from "./components/CountdownWord.jsx";
import GameStatusOverlay from "./components/GameStatusOverlay.jsx";
import TopHud from "./components/TopHud.jsx";
import TypedPage from "./components/TypedPage.jsx";
import WelcomePanel from "./components/WelcomePanel.jsx";
import Word from "./components/Word.jsx";
import {
  advanceCheatCodeInput,
  CHEAT_CODE_INPUT_TIMEOUT_MS,
} from "./cheatCodes.js";
import {
  gameReducer,
  INITIAL_GAME_STATE,
  MAX_HEALTH,
  START_COUNTDOWN_MS,
  TYPEWRITER_LINE_WORD_COUNTS,
  WORD_TIME_MS,
  WORDS,
} from "./game.js";
import { isInteractiveTarget } from "./helpers.js";
import {
  playRandomKeyPressSound,
  preloadKeyPressSounds,
} from "./keyPressSounds.js";

const TYPEWRITER_ACTIVE_MS = 90;

function App() {
  // State and refs
  const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isWelcomeTransitionActive, setIsWelcomeTransitionActive] =
    useState(false);
  const [countdownRemainingMs, setCountdownRemainingMs] =
    useState(START_COUNTDOWN_MS);
  const [remainingMs, setRemainingMs] = useState(WORD_TIME_MS);
  const remainingMsRef = useRef(WORD_TIME_MS);
  const cheatCodeInputRef = useRef({ input: "", lastInputAt: 0 });
  const typewriterActiveTimeoutRef = useRef(null);
  const titlePatternRequestIdRef = useRef(0);
  const [titlePatternRequest, setTitlePatternRequest] = useState(null);

  // Derived values
  const isTitleIdleAnimationEnabled =
    gameState.status === "idle" || isTimerPaused;
  const isLetterRevealed = gameState.status === "complete";
  const countdownValue = Math.max(1, Math.ceil(countdownRemainingMs / 1000));
  const countdownElapsedMs = START_COUNTDOWN_MS - countdownRemainingMs;
  const currentWordFragment =
    gameState.status === "playing" || gameState.status === "failed"
      ? (WORDS[gameState.wordIndex] ?? "").slice(0, gameState.charIndex)
      : "";

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

  // Effects
  useEffect(() => {
    preloadKeyPressSounds();

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
      playRandomKeyPressSound();

      if (typewriterActiveTimeoutRef.current !== null) {
        window.clearTimeout(typewriterActiveTimeoutRef.current);
      }

      setIsTypewriterActive(true);
      typewriterActiveTimeoutRef.current = window.setTimeout(() => {
        setIsTypewriterActive(false);
        typewriterActiveTimeoutRef.current = null;
      }, TYPEWRITER_ACTIVE_MS);

      dispatch({
        type: "typed_key",
        key: event.key,
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      if (typewriterActiveTimeoutRef.current !== null) {
        window.clearTimeout(typewriterActiveTimeoutRef.current);
      }
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
      setIsWelcomeTransitionActive(false);
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status !== "countdown") {
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

  // Actions and handlers
  function triggerTitlePattern(name) {
    titlePatternRequestIdRef.current += 1;
    setTitlePatternRequest({
      name,
      requestId: titlePatternRequestIdRef.current,
    });
  }

  function applyCheatCodeEffect(effect) {
    switch (effect) {
      case "add-heart":
        dispatch({
          type: "cheat_add_heart",
        });
        break;

      case "complete-game":
        dispatch({
          type: "cheat_complete",
        });
        break;

      default:
        break;
    }
  }

  function handleTitleKeyPress(key) {
    const inputAt = window.performance.now();
    const previousInput = cheatCodeInputRef.current;
    const currentInput =
      inputAt - previousInput.lastInputAt <= CHEAT_CODE_INPUT_TIMEOUT_MS
        ? previousInput.input
        : "";
    const result = advanceCheatCodeInput(currentInput, key);

    cheatCodeInputRef.current = {
      input: result.input,
      lastInputAt: result.effect ? 0 : inputAt,
    };

    if (result.effect) {
      applyCheatCodeEffect(result.effect);
    }
  }

  function handleRestart(event) {
    event.currentTarget.blur();
    setIsWelcomeTransitionActive(false);
    triggerTitlePattern("right-to-left-fast");
    dispatch({
      type: "restart",
    });
  }

  function handleStart(event) {
    const isStartingFromWelcome = gameState.status === "idle";

    event.currentTarget.blur();
    setCountdownRemainingMs(START_COUNTDOWN_MS);
    setIsWelcomeTransitionActive(isStartingFromWelcome);
    triggerTitlePattern(
      isStartingFromWelcome ? "left-to-right-fast" : "right-to-left-fast",
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

  // Render
  return (
    <main className="typing-stage">
      <TopHud
        health={gameState.health}
        isTimerPausable={gameState.status === "playing"}
        isTimerPaused={isTimerPaused}
        isTitleIdleAnimationEnabled={isTitleIdleAnimationEnabled}
        maxHealth={gameState.maxHealth ?? MAX_HEALTH}
        onRestart={handleRestart}
        onTitleKeyPress={handleTitleKeyPress}
        onToggleTimerPause={handleToggleTimerPause}
        centisecondsRemaining={Math.ceil(remainingMs / 10)}
        titlePatternRequest={titlePatternRequest}
      />

      <div className="game-content">
        <div className="active-game-layout">
          {gameState.status === "countdown" ? (
            <div className="word-zone">
              <CountdownWord value={countdownValue} />
            </div>
          ) : gameState.status !== "idle" && !isLetterRevealed ? (
            <div className="word-zone">
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
            </div>
          ) : null}
          <TypedPage
            completedWords={gameState.typedWords}
            countdownElapsedMs={
              gameState.status === "countdown" ? countdownElapsedMs : 0
            }
            countdownValue={
              gameState.status === "countdown" ? countdownValue : null
            }
            currentWordFragment={currentWordFragment}
            isTypewriterActive={isTypewriterActive}
            isRevealed={isLetterRevealed}
            isWelcome={gameState.status === "idle"}
            isWelcomeTransitioning={isWelcomeTransitionActive}
            lineWordCounts={TYPEWRITER_LINE_WORD_COUNTS}
            welcomeContent={
              <WelcomePanel
                isStarting={isWelcomeTransitionActive}
                onStart={handleStart}
              />
            }
          />
        </div>
      </div>

      <GameStatusOverlay onStart={handleStart} status={gameState.status} />
    </main>
  );
}

export default App;
