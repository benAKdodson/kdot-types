import {
  Fragment,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import dingSound from '../Assets/Sounds/ding.mp3';
import paperLoad1Sound from '../Assets/Sounds/paper-load-1.mp3';
import paperLoad2Sound from '../Assets/Sounds/paper-load-2.mp3';
import paperUnloadSound from '../Assets/Sounds/paper-unload.mp3';
import rodSlideLongSound from '../Assets/Sounds/rod-slide-long.mp3';
import rodSlideSound from '../Assets/Sounds/rod-slide.mp3';
import typewriterRodSprite from '../Assets/Sprites/Typewriter-2-rod.png';
import {
  createPreloadedAudio,
  disposeAudio,
  restartAudio,
} from '../audio.js';
import {
  getTypewriterLines,
  TYPEWRITER_LINE_LENGTH,
} from '../typewriterText.js';
import TypewriterBody from './TypewriterBody.jsx';

// Constants
const TYPEWRITER_DING_MARGIN_CHARACTERS = 5;
const TYPEWRITER_RETURN_MIN_MS = 180;
const TYPEWRITER_RETURN_MAX_MS = 360;
const TYPEWRITER_RETURN_SOUND_MIN_RATIO = 0.2;
const TYPEWRITER_RETURN_LONG_SOUND_RATIO = 0.7;
const TYPEWRITER_LINE_FEED_MS = 120;
const TYPEWRITER_REVEAL_CENTER_MS = 420;
const TYPEWRITER_REVEAL_PULL_MS = 360;
const TYPEWRITER_STATIONARY_REVEAL_EXTRA_PULL_PX = 12;
const TYPEWRITER_PAPER_START_HEIGHT_PX = 60;
const TYPEWRITER_PAPER_LINE_HEIGHT_PX = 24;
const TYPEWRITER_REVEAL_TARGET_HEIGHT_PX = 350;
const TYPEWRITER_COUNTDOWN_LOADED_HEIGHT_PX = 250;
const TYPEWRITER_COUNTDOWN_MID_HEIGHT_PX = 150;
const TYPEWRITER_WELCOME_COUNTDOWN_MID_HEIGHT_PX = 204;
const TYPEWRITER_COUNTDOWN_SHRINK_DELAY_MS = 100;
const COUNTDOWN_PHASE_SOUND_SOURCES = {
  primed: rodSlideSound,
  "shrinking-final": paperLoad2Sound,
  "shrinking-first": paperLoad1Sound,
};

function TypedPage({
  completedWords,
  countdownElapsedMs = 0,
  countdownValue = null,
  currentWordFragment,
  isRevealed = false,
  isCapsLockEnabled = false,
  isWelcome = false,
  isWelcomeTransitioning = false,
  lineWordCounts,
  missedWordIndexes = [],
  onTryAgain,
  pressedTypewriterKeys = [],
  revealNoteLines = [],
  shouldLiftAfterReveal = true,
  welcomeContent = null,
}) {
  // State and refs
  const viewportRef = useRef(null);
  const paperRef = useRef(null);
  const caretMarkerRef = useRef(null);
  const baseCaretOffsetYRef = useRef(null);
  const basePaperOffsetXRef = useRef(null);
  const previousLineIndexRef = useRef(0);
  const animationTimeoutsRef = useRef([]);
  const typewriterAudioPlayersRef = useRef(null);
  const lastPlayedCountdownSoundPhaseRef = useRef("idle");
  const lastPlayedRevealSoundPhaseRef = useRef("idle");
  const lastDingedLineIndexRef = useRef(-1);
  const [paperOffset, setPaperOffset] = useState({ x: 0, y: 0 });
  const [paperLineCount, setPaperLineCount] = useState(1);
  const [motionPhase, setMotionPhase] = useState("typing");
  const [returnDurationMs, setReturnDurationMs] = useState(
    TYPEWRITER_RETURN_MIN_MS,
  );
  const [revealPhase, setRevealPhase] = useState("centering");

  // Derived values
  const hasTypedContent =
    completedWords.length > 0 || Boolean(currentWordFragment);
  const isCountingDown =
    countdownValue !== null && !hasTypedContent && !isRevealed && !isWelcome;
  const typewriterLines = useMemo(
    () =>
      getTypewriterLines({
        completedWords,
        currentWordFragment,
        lineWordCounts,
      }),
    [completedWords, currentWordFragment, lineWordCounts],
  );
  const typedText = typewriterLines.join("\n");
  const renderedLineWords = useMemo(
    () => getRenderedLineWords(typewriterLines, missedWordIndexes),
    [missedWordIndexes, typewriterLines],
  );
  const currentLineIndex = typewriterLines.length - 1;
  const currentLineText = typewriterLines[currentLineIndex] ?? "";
  const renderedLineCount = Math.max(1, typewriterLines.length);
  const currentPaperHeight = getPaperHeight(paperLineCount);
  const revealPaperHeight = getRevealPaperHeight(
    getPaperHeight(renderedLineCount),
  );
  const countdownPaperPhase = getCountdownPaperPhase({
    countdownElapsedMs,
    countdownValue,
    isCountingDown,
    isWelcomeTransitioning,
  });
  const isWelcomeIntakeReady =
    isWelcomeTransitioning &&
    countdownValue >= 3 &&
    countdownPaperPhase === "welcome-loaded";
  const isWelcomeIntake = isCountingDown && isWelcomeTransitioning;
  const isWelcomeContentVisible =
    isWelcome || (isWelcomeIntake && countdownValue >= 3);
  const countdownPaperHeight = getCountdownPaperHeight(
    countdownPaperPhase,
    isWelcomeTransitioning,
  );
  let paperHeight = currentPaperHeight;

  if (isRevealed && revealPhase !== "centering") {
    paperHeight = revealPaperHeight;
  }

  if (isCountingDown) {
    paperHeight = countdownPaperHeight;
  }

  const revealPullOffsetY = Math.min(
    0,
    currentPaperHeight - revealPaperHeight,
  );
  const stationaryRevealOffsetY =
    TYPEWRITER_PAPER_START_HEIGHT_PX -
    revealPaperHeight -
    TYPEWRITER_STATIONARY_REVEAL_EXTRA_PULL_PX;
  const countdownPaperOffsetY =
    TYPEWRITER_PAPER_START_HEIGHT_PX - countdownPaperHeight;

  // Effects
  useEffect(
    () => () => {
      clearAnimationTimeouts(animationTimeoutsRef);
      disposeAudioPlayers(typewriterAudioPlayersRef);
    },
    [],
  );

  useEffect(() => {
    [dingSound, rodSlideSound, rodSlideLongSound].forEach((source) => {
      preloadAudioSource(source, typewriterAudioPlayersRef);
    });
  }, []);

  useEffect(() => {
    if (!isCountingDown) {
      lastPlayedCountdownSoundPhaseRef.current = "idle";
      return;
    }

    if (lastPlayedCountdownSoundPhaseRef.current === countdownPaperPhase) {
      return;
    }

    const soundSource = COUNTDOWN_PHASE_SOUND_SOURCES[countdownPaperPhase];

    if (!soundSource) {
      return;
    }

    lastPlayedCountdownSoundPhaseRef.current = countdownPaperPhase;
    playAudioSource(soundSource, typewriterAudioPlayersRef);
  }, [countdownPaperPhase, isCountingDown]);

  useEffect(() => {
    if (!isRevealed) {
      lastPlayedRevealSoundPhaseRef.current = "idle";
      return;
    }

    if (
      revealPhase !== "pulling" ||
      lastPlayedRevealSoundPhaseRef.current === revealPhase
    ) {
      return;
    }

    lastPlayedRevealSoundPhaseRef.current = revealPhase;
    playAudioSource(paperUnloadSound, typewriterAudioPlayersRef);
  }, [isRevealed, revealPhase]);

  useEffect(() => {
    if (!isRevealed) {
      setRevealPhase("centering");
      return undefined;
    }

    clearAnimationTimeouts(animationTimeoutsRef);
    setMotionPhase("typing");
    setPaperLineCount(renderedLineCount);
    setRevealPhase("centering");

    const pullTimeoutId = window.setTimeout(() => {
      setRevealPhase("pulling");
    }, TYPEWRITER_REVEAL_CENTER_MS);
    const liftTimeoutId = shouldLiftAfterReveal
      ? window.setTimeout(() => {
          setRevealPhase("lifting");
        }, TYPEWRITER_REVEAL_CENTER_MS + TYPEWRITER_REVEAL_PULL_MS)
      : null;

    return () => {
      window.clearTimeout(pullTimeoutId);

      if (liftTimeoutId !== null) {
        window.clearTimeout(liftTimeoutId);
      }
    };
  }, [isRevealed, renderedLineCount, shouldLiftAfterReveal]);

  // Paper measurement and motion
  useLayoutEffect(() => {
    if (isRevealed || isWelcomeContentVisible) {
      return undefined;
    }

    const viewportElement = viewportRef.current;
    const paperElement = paperRef.current;
    const caretMarkerElement = caretMarkerRef.current;

    if (!viewportElement || !paperElement || !caretMarkerElement) {
      return undefined;
    }

    function updatePaperOffset() {
      const viewportRect = viewportElement.getBoundingClientRect();
      const paperRect = paperElement.getBoundingClientRect();
      const caretMarkerRect = caretMarkerElement.getBoundingClientRect();
      const viewportCenterX = viewportRect.left + viewportRect.width / 2;
      const caretCenterX = caretMarkerRect.left + caretMarkerRect.width / 2;
      const caretCenterY = caretMarkerRect.top + caretMarkerRect.height / 2;
      const centeredPaperOffsetX = viewportRect.width / 2 - paperRect.width / 2;
      const caretOffsetInPaper = caretCenterX - paperRect.left;
      const caretOffsetYInPaper = caretCenterY - paperRect.top;
      const nextPaperLineCount = Math.max(1, typewriterLines.length);

      basePaperOffsetXRef.current = centeredPaperOffsetX;

      if (baseCaretOffsetYRef.current === null || !hasTypedContent) {
        baseCaretOffsetYRef.current = caretOffsetYInPaper;
      }

      const nextPaperOffset = {
        x: viewportCenterX - viewportRect.left - caretOffsetInPaper,
        y: baseCaretOffsetYRef.current - caretOffsetYInPaper,
      };

      if (!hasTypedContent) {
        lastDingedLineIndexRef.current = -1;
        previousLineIndexRef.current = 0;
        clearAnimationTimeouts(animationTimeoutsRef);
        setMotionPhase("typing");
        setPaperLineCount(nextPaperLineCount);
        setPaperOffset(nextPaperOffset);
        return;
      }

      if (
        currentLineText.length > 0 &&
        lastDingedLineIndexRef.current !== currentLineIndex
      ) {
        const paperStyle = window.getComputedStyle(paperElement);
        const paperPaddingLeft = Number.parseFloat(paperStyle.paddingLeft) || 0;
        const paperPaddingRight = Number.parseFloat(paperStyle.paddingRight) || 0;
        const typedLineWidth = caretCenterX - paperRect.left - paperPaddingLeft;
        const characterWidth = typedLineWidth / currentLineText.length;
        const distanceToRightMargin =
          paperRect.right - paperPaddingRight - caretCenterX;

        if (
          characterWidth > 0 &&
          distanceToRightMargin <=
            characterWidth * TYPEWRITER_DING_MARGIN_CHARACTERS
        ) {
          lastDingedLineIndexRef.current = currentLineIndex;
          playAudioSource(dingSound, typewriterAudioPlayersRef);
        }
      }

      const hasMovedToNewLine = currentLineIndex > previousLineIndexRef.current;
      previousLineIndexRef.current = currentLineIndex;

      if (hasMovedToNewLine) {
        const returnProfile = getCarriageReturnProfile(
          getPreviousCompletedLineWidthRatio(
            paperElement,
            currentLineIndex - 1,
          ),
        );

        clearAnimationTimeouts(animationTimeoutsRef);
        setReturnDurationMs(returnProfile.durationMs);
        setMotionPhase("returning");
        setPaperOffset((currentOffset) => ({
          x: nextPaperOffset.x,
          y: currentOffset.y,
        }));

        if (returnProfile.soundSource) {
          playAudioSource(
            returnProfile.soundSource,
            typewriterAudioPlayersRef,
          );
        }

        animationTimeoutsRef.current = [
          window.setTimeout(() => {
            setMotionPhase("line-feeding");
            setPaperLineCount(nextPaperLineCount);
            setPaperOffset(nextPaperOffset);
          }, returnProfile.durationMs),
          window.setTimeout(() => {
            setMotionPhase("typing");
          }, returnProfile.durationMs + TYPEWRITER_LINE_FEED_MS),
        ];
        return;
      }

      setPaperLineCount((currentLineCount) =>
        currentLineCount === nextPaperLineCount
          ? currentLineCount
          : nextPaperLineCount,
      );

      setPaperOffset((currentOffset) => {
        if (
          Math.abs(nextPaperOffset.x - currentOffset.x) < 0.5 &&
          Math.abs(nextPaperOffset.y - currentOffset.y) < 0.5
        ) {
          return currentOffset;
        }

        return nextPaperOffset;
      });
    }

    updatePaperOffset();
    window.addEventListener("resize", updatePaperOffset);

    return () => {
      window.removeEventListener("resize", updatePaperOffset);
    };
  }, [
    currentLineIndex,
    hasTypedContent,
    isRevealed,
    isWelcomeContentVisible,
    typedText,
  ]);

  // Render values
  const paperPhaseClassName = isWelcome
    ? "typewriter-paper-welcome"
    : isRevealed
      ? `typewriter-paper-reveal-${revealPhase}`
      : `typewriter-paper-${motionPhase}`;
  const countdownClassName = getCountdownClassName({
    countdownPaperPhase,
    isCountingDown,
  });
  const rodPhaseClassName = isRevealed
    ? `typewriter-rod-reveal-${revealPhase}`
    : `typewriter-rod-${motionPhase}`;
  const welcomeIntakeClassName = isWelcomeIntake
    ? ` typewriter-paper-welcome-intake${
        isWelcomeIntakeReady
          ? " typewriter-paper-welcome-intake-ready"
          : ""
      }`
    : "";
  const stationaryRevealClassName =
    isRevealed && !shouldLiftAfterReveal
      ? " typewriter-paper-reveal-stationary"
      : "";
  const typingCarriageOffsetX =
    basePaperOffsetXRef.current === null
      ? 0
      : paperOffset.x - basePaperOffsetXRef.current;
  const isCarriageCentered =
    isWelcome ||
    isRevealed ||
    (isCountingDown && countdownPaperPhase !== "primed");
  const carriageOffsetX = isCarriageCentered ? 0 : typingCarriageOffsetX;

  // Render
  return (
    <section
      aria-label={isWelcomeContentVisible ? "Welcome" : "Typed letter"}
      className={`typewriter-viewport${
        isRevealed ? " typewriter-viewport-revealed" : ""
      }${
        isWelcome || isWelcomeIntake ? " typewriter-viewport-welcome" : ""
      }${isWelcome ? " typewriter-carriage-welcome" : ""}${countdownClassName}`}
      ref={viewportRef}
      style={{
        "--typewriter-carriage-offset-x": `${carriageOffsetX}px`,
        "--typewriter-paper-start-height": `${TYPEWRITER_PAPER_START_HEIGHT_PX}px`,
        "--typewriter-return-duration": `${returnDurationMs}ms`,
      }}
    >
      <div
        className={`typed-page typewriter-paper ${paperPhaseClassName}${stationaryRevealClassName}${welcomeIntakeClassName}`}
        ref={paperRef}
        style={{
          "--typewriter-typing-paper-offset-y": `${paperOffset.y}px`,
          "--typewriter-paper-height": isWelcome || isWelcomeIntakeReady
            ? "var(--typewriter-welcome-paper-height)"
            : `${paperHeight}px`,
          "--typewriter-countdown-paper-offset-y": `${countdownPaperOffsetY}px`,
          "--typewriter-reveal-pull-offset-y": `${revealPullOffsetY}px`,
          "--typewriter-stationary-reveal-offset-y": `${stationaryRevealOffsetY}px`,
          "--typewriter-line-width": `${TYPEWRITER_LINE_LENGTH}ch`,
        }}
      >
        {isWelcomeContentVisible ? (
          welcomeContent
        ) : (
          <p className="pixel-text typed-page-text">
            {typewriterLines.map((line, index) => (
              <span className="typed-page-line" key={index}>
                {renderedLineWords[index].map(
                  ({ isMissed, text, wordIndex }, lineWordIndex) => (
                    <Fragment key={wordIndex}>
                      {lineWordIndex > 0 ? " " : ""}
                      <span
                        className={
                          isMissed ? "typed-page-missed-word" : undefined
                        }
                      >
                        {text}
                      </span>
                    </Fragment>
                  ),
                )}
                {index === currentLineIndex ? (
                  <span
                    aria-hidden="true"
                    className="typewriter-caret-marker"
                    ref={caretMarkerRef}
                  />
                ) : null}
              </span>
            ))}
          </p>
        )}
        {isRevealed ? (
          <div className="typed-page-reveal-footer">
            <p className="pixel-text typed-page-reveal-note">
              {revealNoteLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
            {onTryAgain ? (
              <button
                className="pixel-text typed-page-reveal-link"
                onClick={onTryAgain}
                type="button"
              >
                Try again?
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <img
        alt=""
        aria-hidden="true"
        className={`typewriter-sprite typewriter-rod ${rodPhaseClassName}`}
        src={typewriterRodSprite}
      />
      <TypewriterBody
        isCapsLockEnabled={isCapsLockEnabled}
        pressedKeys={pressedTypewriterKeys}
      />
    </section>
  );
}

// Paper geometry
function getCountdownClassName({
  countdownPaperPhase,
  isCountingDown,
}) {
  if (
    !isCountingDown ||
    countdownPaperPhase === "idle" ||
    countdownPaperPhase === "welcome-loaded"
  ) {
    return "";
  }

  return ` typewriter-countdown-${countdownPaperPhase}`;
}

function getCountdownPaperPhase({
  countdownElapsedMs,
  countdownValue,
  isCountingDown,
  isWelcomeTransitioning,
}) {
  if (!isCountingDown) {
    return "idle";
  }

  if (countdownValue >= 3) {
    if (countdownElapsedMs < TYPEWRITER_COUNTDOWN_SHRINK_DELAY_MS) {
      return isWelcomeTransitioning ? "welcome-loaded" : "loaded";
    }

    return "shrinking-first";
  }

  return countdownValue === 2 ? "shrinking-final" : "primed";
}

function getCountdownPaperHeight(
  countdownPaperPhase,
  isWelcomeTransitioning,
) {
  if (countdownPaperPhase === "loaded") {
    return TYPEWRITER_COUNTDOWN_LOADED_HEIGHT_PX;
  }

  if (countdownPaperPhase === "shrinking-first") {
    return isWelcomeTransitioning
      ? TYPEWRITER_WELCOME_COUNTDOWN_MID_HEIGHT_PX
      : TYPEWRITER_COUNTDOWN_MID_HEIGHT_PX;
  }

  return TYPEWRITER_PAPER_START_HEIGHT_PX;
}

function getPaperHeight(lineCount) {
  return (
    TYPEWRITER_PAPER_START_HEIGHT_PX +
    (lineCount - 1) * TYPEWRITER_PAPER_LINE_HEIGHT_PX
  );
}

function getRevealPaperHeight(contentHeight) {
  return Math.max(contentHeight, TYPEWRITER_REVEAL_TARGET_HEIGHT_PX);
}

function getRenderedLineWords(typewriterLines, missedWordIndexes) {
  const missedWordIndexSet = new Set(missedWordIndexes);
  let wordIndex = 0;

  return typewriterLines.map((line) => {
    if (!line) {
      return [];
    }

    return line.split(" ").map((text) => {
      const renderedWord = {
        isMissed: missedWordIndexSet.has(wordIndex),
        text,
        wordIndex,
      };

      wordIndex += 1;
      return renderedWord;
    });
  });
}

function getPreviousCompletedLineWidthRatio(paperElement, startLineIndex) {
  const lineElements = paperElement.querySelectorAll(".typed-page-line");
  let lineElement = null;

  for (let lineIndex = startLineIndex; lineIndex >= 0; lineIndex -= 1) {
    if (lineElements[lineIndex]?.textContent.trim()) {
      lineElement = lineElements[lineIndex];
      break;
    }
  }

  if (!lineElement) {
    return 0;
  }

  const paperStyle = window.getComputedStyle(paperElement);
  const paperPaddingLeft = Number.parseFloat(paperStyle.paddingLeft) || 0;
  const paperPaddingRight = Number.parseFloat(paperStyle.paddingRight) || 0;
  const availableLineWidth =
    paperElement.getBoundingClientRect().width -
    paperPaddingLeft -
    paperPaddingRight;
  const lineRange = document.createRange();

  lineRange.selectNodeContents(lineElement);

  return Math.min(
    1,
    Math.max(0, lineRange.getBoundingClientRect().width / availableLineWidth),
  );
}

function getCarriageReturnProfile(lineWidthRatio) {
  const durationMs = Math.round(
    TYPEWRITER_RETURN_MIN_MS +
      (TYPEWRITER_RETURN_MAX_MS - TYPEWRITER_RETURN_MIN_MS) * lineWidthRatio,
  );
  let soundSource = null;

  if (lineWidthRatio >= TYPEWRITER_RETURN_LONG_SOUND_RATIO) {
    soundSource = rodSlideLongSound;
  } else if (lineWidthRatio >= TYPEWRITER_RETURN_SOUND_MIN_RATIO) {
    soundSource = rodSlideSound;
  }

  return { durationMs, soundSource };
}

// Animation and audio helpers
function clearAnimationTimeouts(timeoutsRef) {
  timeoutsRef.current.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  timeoutsRef.current = [];
}

function playAudioSource(source, audioPlayersRef) {
  preloadAudioSource(source, audioPlayersRef);
  restartAudio(audioPlayersRef.current?.get(source));
}

function preloadAudioSource(source, audioPlayersRef) {
  if (audioPlayersRef.current === null) {
    audioPlayersRef.current = new Map();
  }

  if (!audioPlayersRef.current.has(source)) {
    const audio = createPreloadedAudio(source);

    if (audio) {
      audioPlayersRef.current.set(source, audio);
    }
  }
}

function disposeAudioPlayers(audioPlayersRef) {
  audioPlayersRef.current?.forEach(disposeAudio);
  audioPlayersRef.current?.clear();
  audioPlayersRef.current = null;
}

export default memo(TypedPage);
