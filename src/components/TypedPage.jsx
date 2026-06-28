import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import paperLoad1Sound from '../Assets/Sounds/paper-load-1.mp3';
import paperLoad2Sound from '../Assets/Sounds/paper-load-2.mp3';
import rodSlideSound from '../Assets/Sounds/rod-slide.mp3';
//import typewriterActiveSprite from '../Assets/typewriter-1.0-active.png';
import typewriterActiveSprite from '../Assets/Typewriter-2-active.png';
import typewriterRodSprite from '../Assets/Typewriter-2-rod.png';
//import typewriterSprite from '../Assets/typewriter-1.0.png';
import typewriterSprite from '../Assets/Typewriter-2.png';

const TYPEWRITER_LINE_LENGTH = 48;
const TYPEWRITER_RETURN_MS = 180;
const TYPEWRITER_LINE_FEED_MS = 120;
const TYPEWRITER_REVEAL_CENTER_MS = 420;
const TYPEWRITER_REVEAL_PULL_MS = 360;
const TYPEWRITER_PAPER_START_HEIGHT_PX = 60;
const TYPEWRITER_PAPER_LINE_HEIGHT_PX = 24;
const TYPEWRITER_REVEAL_TARGET_HEIGHT_PX = 350;
const TYPEWRITER_COUNTDOWN_LOADED_HEIGHT_PX = 250;
const TYPEWRITER_COUNTDOWN_MID_HEIGHT_PX = 150;
const TYPEWRITER_COUNTDOWN_SHRINK_DELAY_MS = 100;
const COUNTDOWN_PHASE_SOUND_SOURCES = {
  primed: rodSlideSound,
  "shrinking-final": paperLoad2Sound,
  "shrinking-first": paperLoad1Sound,
};

function TypedPage({
  completedWords,
  countdownValue = null,
  currentWordFragment,
  isTypewriterActive = false,
  isRevealed = false,
  lineWordCounts,
}) {
  const viewportRef = useRef(null);
  const paperRef = useRef(null);
  const caretMarkerRef = useRef(null);
  const baseCaretOffsetYRef = useRef(null);
  const basePaperOffsetXRef = useRef(null);
  const previousLineIndexRef = useRef(0);
  const animationTimeoutsRef = useRef([]);
  const countdownAudioPlayersRef = useRef(null);
  const lastPlayedCountdownSoundPhaseRef = useRef("idle");
  const [paperOffset, setPaperOffset] = useState({ x: 0, y: 0 });
  const [paperLineCount, setPaperLineCount] = useState(1);
  const [motionPhase, setMotionPhase] = useState("typing");
  const [revealPhase, setRevealPhase] = useState("centering");
  const [countdownPaperPhase, setCountdownPaperPhase] = useState(() =>
    getInitialCountdownPaperPhase(countdownValue),
  );
  const hasTypedContent =
    completedWords.length > 0 || Boolean(currentWordFragment);
  const isCountingDown =
    countdownValue !== null && !hasTypedContent && !isRevealed;
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
  const currentLineIndex = typewriterLines.length - 1;
  const renderedLineCount = Math.max(1, typewriterLines.length);
  const currentPaperHeight = getPaperHeight(paperLineCount);
  const revealPaperHeight = getRevealPaperHeight(
    getPaperHeight(renderedLineCount),
  );
  const countdownPaperHeight = getCountdownPaperHeight(countdownPaperPhase);
  let paperHeight = currentPaperHeight;

  if (isRevealed && revealPhase !== "centering") {
    paperHeight = revealPaperHeight;
  }

  if (isCountingDown) {
    paperHeight = countdownPaperHeight;
  }

  const revealPullOffsetY = Math.min(0, currentPaperHeight - revealPaperHeight);
  const countdownPaperOffsetY =
    TYPEWRITER_PAPER_START_HEIGHT_PX - countdownPaperHeight;

  useEffect(
    () => () => {
      clearAnimationTimeouts(animationTimeoutsRef);
    },
    [],
  );

  useEffect(() => {
    if (!isCountingDown) {
      setCountdownPaperPhase("idle");
      return undefined;
    }

    if (countdownValue >= 3) {
      setCountdownPaperPhase("loaded");

      const shrinkTimeoutId = window.setTimeout(() => {
        setCountdownPaperPhase("shrinking-first");
      }, TYPEWRITER_COUNTDOWN_SHRINK_DELAY_MS);

      return () => {
        window.clearTimeout(shrinkTimeoutId);
      };
    }

    setCountdownPaperPhase(
      countdownValue === 2 ? "shrinking-final" : "primed",
    );

    return undefined;
  }, [countdownValue, isCountingDown]);

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
    playAudioSource(soundSource, countdownAudioPlayersRef);
  }, [countdownPaperPhase, isCountingDown]);

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
    const liftTimeoutId = window.setTimeout(() => {
      setRevealPhase("lifting");
    }, TYPEWRITER_REVEAL_CENTER_MS + TYPEWRITER_REVEAL_PULL_MS);

    return () => {
      window.clearTimeout(pullTimeoutId);
      window.clearTimeout(liftTimeoutId);
    };
  }, [isRevealed, renderedLineCount]);

  useLayoutEffect(() => {
    if (isRevealed) {
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
        previousLineIndexRef.current = 0;
        clearAnimationTimeouts(animationTimeoutsRef);
        setMotionPhase("typing");
        setPaperLineCount(nextPaperLineCount);
        setPaperOffset(nextPaperOffset);
        return;
      }

      const hasMovedToNewLine = currentLineIndex > previousLineIndexRef.current;
      previousLineIndexRef.current = currentLineIndex;

      if (hasMovedToNewLine) {
        clearAnimationTimeouts(animationTimeoutsRef);
        setMotionPhase("returning");
        setPaperOffset((currentOffset) => ({
          x: nextPaperOffset.x,
          y: currentOffset.y,
        }));

        animationTimeoutsRef.current = [
          window.setTimeout(() => {
            setMotionPhase("line-feeding");
            setPaperLineCount(nextPaperLineCount);
            setPaperOffset(nextPaperOffset);
          }, TYPEWRITER_RETURN_MS),
          window.setTimeout(() => {
            setMotionPhase("typing");
          }, TYPEWRITER_RETURN_MS + TYPEWRITER_LINE_FEED_MS),
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
  }, [currentLineIndex, hasTypedContent, isRevealed, typedText]);

  const paperPhaseClassName = isRevealed
    ? `typewriter-paper-reveal-${revealPhase}`
    : `typewriter-paper-${motionPhase}`;
  const countdownPaperClassName = getCountdownPaperClassName({
    countdownPaperPhase,
    hasTypedContent,
    isRevealed,
  });
  const rodPhaseClassName = isRevealed
    ? `typewriter-rod-reveal-${revealPhase}`
    : `typewriter-rod-${motionPhase}`;
  const countdownRodClassName = getCountdownRodClassName({
    countdownPaperPhase,
    hasTypedContent,
    isRevealed,
  });
  const rodOffsetX =
    basePaperOffsetXRef.current === null
      ? 0
      : paperOffset.x - basePaperOffsetXRef.current;

  return (
    <section
      aria-label="Typed letter"
      className={`typewriter-viewport${
        isRevealed ? " typewriter-viewport-revealed" : ""
      }`}
      ref={viewportRef}
    >
      <div
        className={`typed-page typewriter-paper ${paperPhaseClassName}${countdownPaperClassName}`}
        ref={paperRef}
        style={{
          "--paper-offset-x": `${paperOffset.x}px`,
          "--paper-offset-y": `${paperOffset.y}px`,
          "--typewriter-paper-height": `${paperHeight}px`,
          "--typewriter-countdown-paper-offset-y": `${countdownPaperOffsetY}px`,
          "--typewriter-reveal-pull-offset-y": `${revealPullOffsetY}px`,
          "--typewriter-line-width": `${TYPEWRITER_LINE_LENGTH}ch`,
        }}
      >
        <p className="pixel-text typed-page-text">
          {typewriterLines.map((line, index) => (
            <span className="typed-page-line" key={`${index}-${line}`}>
              {line}
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
        {isRevealed ? (
          <p className="pixel-text typed-page-reveal-note">
            <span>With all the love in my heart</span>
            <span>Ben</span>
          </p>
        ) : null}
      </div>
      <img
        alt=""
        aria-hidden="true"
        className={`typewriter-sprite typewriter-rod ${rodPhaseClassName}${countdownRodClassName}`}
        src={typewriterRodSprite}
        style={{
          "--typewriter-rod-offset-x": `${rodOffsetX}px`,
        }}
      />
      <img
        alt=""
        aria-hidden="true"
        className={`typewriter-sprite typewriter-sprite-base${
          isTypewriterActive ? " typewriter-sprite-hidden" : ""
        }`}
        src={typewriterSprite}
      />
      <img
        alt=""
        aria-hidden="true"
        className={`typewriter-sprite typewriter-sprite-base${
          isTypewriterActive ? "" : " typewriter-sprite-hidden"
        }`}
        src={typewriterActiveSprite}
      />
    </section>
  );
}

function getCountdownPaperClassName({
  countdownPaperPhase,
  hasTypedContent,
  isRevealed,
}) {
  if (hasTypedContent || isRevealed || countdownPaperPhase === "idle") {
    return "";
  }

  return ` typewriter-paper-countdown-${countdownPaperPhase}`;
}

function getCountdownRodClassName({
  countdownPaperPhase,
  hasTypedContent,
  isRevealed,
}) {
  if (hasTypedContent || isRevealed || countdownPaperPhase === "idle") {
    return "";
  }

  return countdownPaperPhase === "primed"
    ? " typewriter-rod-countdown-primed"
    : " typewriter-rod-countdown-centered";
}

function getInitialCountdownPaperPhase(countdownValue) {
  if (countdownValue === null) {
    return "idle";
  }

  if (countdownValue >= 3) {
    return "loaded";
  }

  return countdownValue === 2 ? "shrinking-final" : "primed";
}

function getCountdownPaperHeight(countdownPaperPhase) {
  if (countdownPaperPhase === "loaded") {
    return TYPEWRITER_COUNTDOWN_LOADED_HEIGHT_PX;
  }

  if (countdownPaperPhase === "shrinking-first") {
    return TYPEWRITER_COUNTDOWN_MID_HEIGHT_PX;
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

function getTypewriterLines({
  completedWords,
  currentWordFragment,
  lineWordCounts,
}) {
  if (!completedWords.length && !currentWordFragment) {
    return [""];
  }

  if (!lineWordCounts?.length) {
    return getCharacterWrappedLines(
      joinWords(completedWords, currentWordFragment),
    );
  }

  const lines = [];
  const activeWordIndex = completedWords.length;
  let wordIndex = 0;

  for (let lineIndex = 0; lineIndex < lineWordCounts.length; lineIndex += 1) {
    const wordCount = lineWordCounts[lineIndex];

    if (wordCount === 0) {
      if (lines.length > 0 && wordIndex <= completedWords.length) {
        lines.push("");
      }

      continue;
    }

    const lineEndIndex = wordIndex + wordCount;
    const completedLineWords = completedWords.slice(
      wordIndex,
      Math.min(completedWords.length, lineEndIndex),
    );
    const hasActiveWordOnLine =
      Boolean(currentWordFragment) &&
      activeWordIndex >= wordIndex &&
      activeWordIndex < lineEndIndex;
    const lineWords = hasActiveWordOnLine
      ? [...completedLineWords, currentWordFragment]
      : completedLineWords;

    if (lineWords.length > 0) {
      lines.push(lineWords.join(" "));
    }

    if (hasActiveWordOnLine || completedWords.length < lineEndIndex) {
      return lines.length ? lines : [""];
    }

    wordIndex = lineEndIndex;

    if (!currentWordFragment && completedWords.length === lineEndIndex) {
      appendNextLinePreview(lines, lineWordCounts, lineIndex + 1);

      return lines.length ? lines : [""];
    }
  }

  if (wordIndex < completedWords.length || currentWordFragment) {
    lines.push(
      ...getCharacterWrappedLines(
        joinWords(completedWords.slice(wordIndex), currentWordFragment),
      ),
    );
  }

  return lines.length ? lines : [""];
}

function getCharacterWrappedLines(text) {
  if (!text) {
    return [""];
  }

  const lines = [];

  for (let index = 0; index < text.length; index += TYPEWRITER_LINE_LENGTH) {
    lines.push(text.slice(index, index + TYPEWRITER_LINE_LENGTH));
  }

  return lines;
}

function appendNextLinePreview(lines, lineWordCounts, startLineIndex) {
  for (
    let lineIndex = startLineIndex;
    lineIndex < lineWordCounts.length;
    lineIndex += 1
  ) {
    lines.push("");

    if (lineWordCounts[lineIndex] > 0) {
      return;
    }
  }
}

function joinWords(completedWords, currentWordFragment) {
  return currentWordFragment
    ? [...completedWords, currentWordFragment].join(" ")
    : completedWords.join(" ");
}

function clearAnimationTimeouts(timeoutsRef) {
  timeoutsRef.current.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  timeoutsRef.current = [];
}

function playAudioSource(source, audioPlayersRef) {
  if (typeof Audio === "undefined") {
    return;
  }

  if (audioPlayersRef.current === null) {
    audioPlayersRef.current = new Map();
  }

  let audio = audioPlayersRef.current.get(source);

  if (!audio) {
    audio = new Audio(source);
    audio.preload = "auto";
    audioPlayersRef.current.set(source, audio);
  }

  try {
    audio.pause();
    audio.currentTime = 0;

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.catch(() => {});
    }
  } catch {
    // Audio playback can be blocked by browser policy; the animation should continue.
  }
}

export default TypedPage;
