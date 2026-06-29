import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import damageSound from './Assets/Sounds/damage.wav';
import gameOverSound from './Assets/Sounds/gameover.wav';
import levelUpSound from './Assets/Sounds/lvlup.wav';
import timerUpSound from './Assets/Sounds/timerup.wav';
import victorySound from './Assets/Sounds/victory.wav';
import {
  createPreloadedAudio,
  disposeAudio,
  getAudioMuted,
  restartAudio,
  setAudioMuted,
  subscribeAudioMuted,
} from './audio.js';
import {
  advanceCheatCodeInput,
  CHEAT_CODE_INPUT_TIMEOUT_MS,
} from './cheatCodes.js';
import CountdownWord from './components/CountdownWord.jsx';
import TopHud from './components/TopHud.jsx';
import TypedPage from './components/TypedPage.jsx';
import WelcomePanel from './components/WelcomePanel.jsx';
import Word from './components/Word.jsx';
import {
  EXTENDED_WORD_TIME_MS,
  gameReducer,
  INITIAL_GAME_STATE,
  MAX_HEALTH,
  SHORTENED_WORD_TIME_MS,
  START_COUNTDOWN_MS,
  TYPEWRITER_LINE_WORD_COUNTS,
  WORD_TIME_MS,
  WORDS,
} from './game.js';
import { getRandomGameOverPhrase } from './gameOverPhrases.js';
import { isInteractiveTarget } from './helpers.js';
import {
  disposeKeyPressSounds,
  playRandomKeyPressSound,
  preloadKeyPressSounds,
} from './keyPressSounds.js';

const TYPEWRITER_ACTIVE_MS = 90;
const TYPEWRITER_KEY_GAP_MS = 30;
const TYPEWRITER_REGULAR_KEY_COUNT = 12;
const TIMER_LEVEL_UP_MS = 580;
const TYPEWRITER_SPECIFIC_KEYS = {
  ",": "comma",
  ".": "period",
  " ": "space",
};
const TYPEWRITER_LINE_BREAK_COUNTS = getLineBreakCounts(
  TYPEWRITER_LINE_WORD_COUNTS,
);
const EMPTY_REVEAL_NOTE_LINES = [];
const SUCCESS_NOTE_LINES = ["Happy birthday my dear. I love you so much!", "Ben"];

function App() {
  // State and refs
  const [gameState, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [transientTypewriterKey, setTransientTypewriterKey] = useState(null);
  const [isCapsLockEnabled, setIsCapsLockEnabled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isWelcomeTransitionActive, setIsWelcomeTransitionActive] =
    useState(false);
  const [gameOverPhrase, setGameOverPhrase] = useState(
    getRandomGameOverPhrase,
  );
  const [countdownRemainingMs, setCountdownRemainingMs] =
    useState(START_COUNTDOWN_MS);
  const [remainingMs, setRemainingMs] = useState(WORD_TIME_MS);
  const [timerRampRemainingMs, setTimerRampRemainingMs] = useState(null);
  const remainingMsRef = useRef(WORD_TIME_MS);
  const damageAudioRef = useRef(null);
  const levelUpAudioRef = useRef(null);
  const timerUpAudioRef = useRef(null);
  const victoryAudioRef = useRef(null);
  const gameOverAudioRef = useRef(null);
  const timerRampAnimationFrameRef = useRef(null);
  const gameStateRef = useRef(gameState);
  const previousHealthRef = useRef(gameState.health);
  const cheatCodeInputRef = useRef({ input: "", lastInputAt: 0 });
  const typewriterKeyTimeoutRef = useRef(null);
  const titlePatternRequestIdRef = useRef(0);
  const [titlePatternRequest, setTitlePatternRequest] = useState(null);
  const isAudioMuted = useSyncExternalStore(
    subscribeAudioMuted,
    getAudioMuted,
    getAudioMuted,
  );

  // Derived values
  const isTitleIdleAnimationEnabled =
    gameState.status === "idle" || isTimerPaused;
  const isTimerRamping = timerRampRemainingMs !== null;
  const wordTimeMs = gameState.wordTimeMs ?? WORD_TIME_MS;
  const revealNoteLines =
    gameState.status === "complete"
      ? SUCCESS_NOTE_LINES
      : gameState.status === "failed"
        ? [gameOverPhrase]
        : EMPTY_REVEAL_NOTE_LINES;
  const isResultRevealed = revealNoteLines.length > 0;
  const countdownValue = Math.max(1, Math.ceil(countdownRemainingMs / 1000));
  const countdownElapsedMs = START_COUNTDOWN_MS - countdownRemainingMs;
  const currentWordFragment =
    gameState.status === "playing" || gameState.status === "failed"
      ? (WORDS[gameState.wordIndex] ?? "").slice(0, gameState.charIndex)
      : "";
  const pressedTypewriterKeys = useMemo(
    () =>
      [transientTypewriterKey, isShiftPressed ? "shift" : null].filter(
        Boolean,
      ),
    [isShiftPressed, transientTypewriterKey],
  );

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
  const welcomeContent = useMemo(
    () => (
      <WelcomePanel
        isStarting={isWelcomeTransitionActive}
        onStart={handleStart}
      />
    ),
    [gameState.status, isWelcomeTransitionActive],
  );

  // Effects
  useEffect(() => {
    const audioRefs = [
      [damageAudioRef, damageSound],
      [levelUpAudioRef, levelUpSound],
      [timerUpAudioRef, timerUpSound],
      [victoryAudioRef, victorySound],
      [gameOverAudioRef, gameOverSound],
    ];

    audioRefs.forEach(([audioRef, source]) => {
      audioRef.current = createPreloadedAudio(source);
    });

    return () => {
      if (timerRampAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(timerRampAnimationFrameRef.current);
        timerRampAnimationFrameRef.current = null;
      }

      audioRefs.forEach(([audioRef]) => {
        disposeAudio(audioRef.current);
        audioRef.current = null;
      });
    };
  }, []);

  useEffect(() => {
    if (gameState.health < previousHealthRef.current) {
      restartAudio(damageAudioRef.current);
    }

    previousHealthRef.current = gameState.health;
  }, [gameState.health]);

  useEffect(() => {
    if (gameState.status === "failed") {
      setGameOverPhrase((currentPhrase) =>
        getRandomGameOverPhrase(currentPhrase),
      );
      restartAudio(gameOverAudioRef.current);
      triggerTitlePattern("game-over");
    } else if (gameState.status === "complete") {
      restartAudio(victoryAudioRef.current);
      triggerTitlePattern("victory");
    }
  }, [gameState.status]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    preloadKeyPressSounds();

    function clearTypewriterKeyTimeout() {
      if (typewriterKeyTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(typewriterKeyTimeoutRef.current);
      typewriterKeyTimeoutRef.current = null;
    }

    function animateTypewriterKeys(keys) {
      clearTypewriterKeyTimeout();
      let keyIndex = 0;

      function showNextKey() {
        setTransientTypewriterKey(keys[keyIndex]);
        keyIndex += 1;

        typewriterKeyTimeoutRef.current = window.setTimeout(() => {
          setTransientTypewriterKey(null);

          if (keyIndex < keys.length) {
            typewriterKeyTimeoutRef.current = window.setTimeout(
              showNextKey,
              TYPEWRITER_KEY_GAP_MS,
            );
            return;
          }

          typewriterKeyTimeoutRef.current = null;
        }, TYPEWRITER_ACTIVE_MS);
      }

      showNextKey();
    }

    function syncModifierStates(event) {
      setIsCapsLockEnabled(event.getModifierState("CapsLock"));
      setIsShiftPressed(event.getModifierState("Shift"));
    }

    function handleKeyDown(event) {
      syncModifierStates(event);

      if (event.key === "Shift") {
        return;
      }

      const isWelcomeScreen = gameStateRef.current.status === "idle";

      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return;
      }

      if (event.key === "Enter" && isWelcomeScreen) {
        event.preventDefault();
        animateTypewriterKeys(["enter"]);
        startGame(true);
        return;
      }

      if (isInteractiveTarget(event.target) && !isWelcomeScreen) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();
      playRandomKeyPressSound();

      const followUpKeys = getFollowUpTypewriterKeys(
        gameStateRef.current,
        event.key,
      );

      animateTypewriterKeys([
        getPressedTypewriterKey(event.key),
        ...followUpKeys,
      ]);

      dispatch({
        type: "typed_key",
        key: event.key,
      });
    }

    function handleKeyUp(event) {
      syncModifierStates(event);
    }

    function handleWindowBlur() {
      setIsShiftPressed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      clearTypewriterKeyTimeout();
      disposeKeyPressSounds();
    };
  }, []);

  useEffect(() => {
    if (gameState.status !== "playing") {
      setIsTimerPaused(false);
    }

    remainingMsRef.current = wordTimeMs;
    setRemainingMs(wordTimeMs);
  }, [gameState.status, gameState.wordIndex, wordTimeMs]);

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
    if (gameState.status !== "playing" || isTimerPaused || isTimerRamping) {
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
  }, [
    gameState.status,
    gameState.wordIndex,
    isTimerPaused,
    isTimerRamping,
    wordTimeMs,
  ]);

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
        restartAudio(levelUpAudioRef.current);
        dispatch({
          type: "cheat_add_heart",
        });
        break;

      case "complete-game":
        dispatch({
          type: "cheat_complete",
        });
        break;

      case "extend-timer":
        if (
          (gameStateRef.current.wordTimeMs ?? WORD_TIME_MS) >=
            EXTENDED_WORD_TIME_MS ||
          timerRampAnimationFrameRef.current !== null
        ) {
          break;
        }

        restartAudio(timerUpAudioRef.current);
        animateTimerIncrease();
        dispatch({
          type: "cheat_extend_timer",
        });
        break;

      case "shorten-timer":
        cancelTimerIncrease();
        dispatch({
          type: "cheat_shorten_timer",
        });
        break;

      default:
        break;
    }
  }

  function animateTimerIncrease() {
    const startingRemainingMs = Math.min(
      remainingMsRef.current,
      EXTENDED_WORD_TIME_MS,
    );
    const startedAt = window.performance.now();

    setTimerRampRemainingMs(startingRemainingMs);

    function updateTimerRamp(now) {
      const progress = Math.min(1, (now - startedAt) / TIMER_LEVEL_UP_MS);
      const nextRemainingMs =
        startingRemainingMs +
        (EXTENDED_WORD_TIME_MS - startingRemainingMs) * progress;

      setTimerRampRemainingMs(nextRemainingMs);

      if (progress < 1) {
        timerRampAnimationFrameRef.current = window.requestAnimationFrame(
          updateTimerRamp,
        );
        return;
      }

      timerRampAnimationFrameRef.current = null;
      setTimerRampRemainingMs(null);
    }

    timerRampAnimationFrameRef.current = window.requestAnimationFrame(
      updateTimerRamp,
    );
  }

  function cancelTimerIncrease() {
    if (timerRampAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(timerRampAnimationFrameRef.current);
      timerRampAnimationFrameRef.current = null;
    }

    setTimerRampRemainingMs(null);
    remainingMsRef.current = SHORTENED_WORD_TIME_MS;
    setRemainingMs(SHORTENED_WORD_TIME_MS);
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
    startGame(isStartingFromWelcome);
  }

  function startGame(isStartingFromWelcome) {
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

  function handleToggleAudioMuted(event) {
    event.currentTarget.blur();
    setAudioMuted(!isAudioMuted);
  }

  // Render
  return (
    <main className="typing-stage">
      <TopHud
        health={gameState.health}
        isAudioMuted={isAudioMuted}
        isTimerPausable={gameState.status === "playing"}
        isTimerPaused={isTimerPaused}
        isTitleIdleAnimationEnabled={isTitleIdleAnimationEnabled}
        maxHealth={gameState.maxHealth ?? MAX_HEALTH}
        onRestart={handleRestart}
        onTitleKeyPress={handleTitleKeyPress}
        onToggleAudioMuted={handleToggleAudioMuted}
        onToggleTimerPause={handleToggleTimerPause}
        centisecondsRemaining={Math.ceil(
          (timerRampRemainingMs ?? remainingMs) / 10,
        )}
        titlePatternRequest={titlePatternRequest}
      />

      <div className="game-content">
        <div className="active-game-layout">
          {gameState.status === "countdown" ? (
            <div className="word-zone">
              <CountdownWord value={countdownValue} />
            </div>
          ) : gameState.status !== "idle" && !isResultRevealed ? (
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
            isCapsLockEnabled={isCapsLockEnabled}
            pressedTypewriterKeys={pressedTypewriterKeys}
            isRevealed={isResultRevealed}
            isWelcome={gameState.status === "idle"}
            isWelcomeTransitioning={isWelcomeTransitionActive}
            lineWordCounts={TYPEWRITER_LINE_WORD_COUNTS}
            missedWordIndexes={gameState.missedWordIndexes}
            onTryAgain={
              gameState.status === "failed" ? handleStart : undefined
            }
            revealNoteLines={revealNoteLines}
            shouldLiftAfterReveal={gameState.status === "complete"}
            welcomeContent={welcomeContent}
          />
        </div>
      </div>

    </main>
  );
}

export default App;

function getPressedTypewriterKey(key) {
  if (TYPEWRITER_SPECIFIC_KEYS[key]) {
    return TYPEWRITER_SPECIFIC_KEYS[key];
  }

  return Math.floor(Math.random() * TYPEWRITER_REGULAR_KEY_COUNT) + 1;
}

function getLineBreakCounts(lineWordCounts) {
  const lineBreakCounts = new Map();
  let wordCount = 0;

  lineWordCounts.forEach((lineWordCount, lineIndex) => {
    wordCount += lineWordCount;

    if (lineWordCount === 0 || lineIndex === lineWordCounts.length - 1) {
      return;
    }

    let lineBreakCount = 1;

    while (
      lineIndex + lineBreakCount < lineWordCounts.length - 1 &&
      lineWordCounts[lineIndex + lineBreakCount] === 0
    ) {
      lineBreakCount += 1;
    }

    lineBreakCounts.set(wordCount - 1, lineBreakCount);
  });

  return lineBreakCounts;
}

function getFollowUpTypewriterKeys(gameState, key) {
  if (gameState.status !== "playing") {
    return [];
  }

  const currentWord = WORDS[gameState.wordIndex];
  const isCompletingCurrentWord =
    key === currentWord?.[gameState.charIndex] &&
    gameState.charIndex === currentWord.length - 1;
  const hasNextWord = gameState.wordIndex < WORDS.length - 1;

  if (!isCompletingCurrentWord || !hasNextWord) {
    return [];
  }

  const lineBreakCount =
    TYPEWRITER_LINE_BREAK_COUNTS.get(gameState.wordIndex) ?? 0;

  return lineBreakCount > 0
    ? Array.from({ length: lineBreakCount }, () => "enter")
    : ["space"];
}
