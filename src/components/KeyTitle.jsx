import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { KEY_SPRITES } from '../Assets/Keys';
import {
  getRandomTitleKeyPattern,
  getRandomTitlePatternDelayMs,
  getTitleKeyPatternByName,
  TITLE_KEYS,
} from '../titleKeyPatterns.js';

const TITLE_KEY_MANUAL_IDLE_DELAY_MS = 2000;

function getTitleKeySprite(key, isPressed) {
  const sprite = KEY_SPRITES[key];

  return isPressed ? sprite.pressed : sprite.normal;
}

function KeyTitle({ isIdleAnimationEnabled, onManualKeyPress, patternRequest }) {
  // State and refs
  const [animatedPressedKeyIndexes, setAnimatedPressedKeyIndexes] = useState([]);
  const [heldKeyIndexes, setHeldKeyIndexes] = useState([]);
  const animationTimeoutIdRef = useRef(null);
  const heldKeyIndexesRef = useRef(new Set());
  const idleDelayUntilRef = useRef(0);
  const isPatternPlayingRef = useRef(false);
  const scheduleNextPatternRef = useRef(null);

  // Actions and handlers
  function clearAnimationTimeout() {
    if (animationTimeoutIdRef.current === null) {
      return;
    }

    window.clearTimeout(animationTimeoutIdRef.current);
    animationTimeoutIdRef.current = null;
  }

  function delayIdleAnimations() {
    idleDelayUntilRef.current =
      window.performance.now() + TITLE_KEY_MANUAL_IDLE_DELAY_MS;

    if (isPatternPlayingRef.current) {
      return;
    }

    clearAnimationTimeout();
    scheduleNextPatternRef.current?.();
  }

  function setKeyHeld(index, isHeld) {
    const nextHeldKeyIndexes = new Set(heldKeyIndexesRef.current);
    const hasChanged = isHeld
      ? !nextHeldKeyIndexes.has(index)
      : nextHeldKeyIndexes.has(index);

    if (!hasChanged) {
      return;
    }

    if (isHeld) {
      nextHeldKeyIndexes.add(index);
    } else {
      nextHeldKeyIndexes.delete(index);
    }

    heldKeyIndexesRef.current = nextHeldKeyIndexes;
    setHeldKeyIndexes([...nextHeldKeyIndexes]);

    if (isHeld) {
      onManualKeyPress?.(TITLE_KEYS[index]);
    }

    delayIdleAnimations();
  }

  function handlePointerDown(index, event) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setKeyHeld(index, true);
  }

  function handlePointerRelease(index) {
    setKeyHeld(index, false);
  }

  function handleKeyDown(index, event) {
    if ((event.key !== " " && event.key !== "Enter") || event.repeat) {
      return;
    }

    event.preventDefault();
    setKeyHeld(index, true);
  }

  function handleKeyUp(index, event) {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    setKeyHeld(index, false);
  }

  // Effects
  useEffect(() => {
    function releaseHeldKeys() {
      if (heldKeyIndexesRef.current.size === 0) {
        return;
      }

      heldKeyIndexesRef.current = new Set();
      setHeldKeyIndexes([]);
      delayIdleAnimations();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        releaseHeldKeys();
      }
    }

    window.addEventListener("blur", releaseHeldKeys);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", releaseHeldKeys);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    function scheduleNextPattern() {
      if (!isActive) {
        return;
      }

      isPatternPlayingRef.current = false;

      if (!isIdleAnimationEnabled) {
        setAnimatedPressedKeyIndexes([]);
        return;
      }

      const idleDelayRemainingMs = heldKeyIndexesRef.current.size
        ? TITLE_KEY_MANUAL_IDLE_DELAY_MS
        : Math.max(0, idleDelayUntilRef.current - window.performance.now());

      if (idleDelayRemainingMs > 0) {
        animationTimeoutIdRef.current = window.setTimeout(
          scheduleNextPattern,
          idleDelayRemainingMs,
        );
        return;
      }

      animationTimeoutIdRef.current = window.setTimeout(() => {
        playPattern(getRandomTitleKeyPattern());
      }, getRandomTitlePatternDelayMs());
    }

    function playPattern(pattern, frameIndex = 0) {
      if (!isActive) {
        return;
      }

      isPatternPlayingRef.current = true;

      const frame = pattern.frames[frameIndex];

      if (!frame) {
        setAnimatedPressedKeyIndexes([]);
        scheduleNextPattern();
        return;
      }

      setAnimatedPressedKeyIndexes(frame.keys);

      animationTimeoutIdRef.current = window.setTimeout(() => {
        playPattern(pattern, frameIndex + 1);
      }, frame.durationMs);
    }

    scheduleNextPatternRef.current = scheduleNextPattern;

    if (patternRequest) {
      const requestedPattern = getTitleKeyPatternByName(patternRequest.name);

      if (requestedPattern) {
        playPattern(requestedPattern);
      } else {
        scheduleNextPattern();
      }
    } else {
      scheduleNextPattern();
    }

    return () => {
      isActive = false;
      clearAnimationTimeout();
      isPatternPlayingRef.current = false;

      if (scheduleNextPatternRef.current === scheduleNextPattern) {
        scheduleNextPatternRef.current = null;
      }
    };
  }, [isIdleAnimationEnabled, patternRequest]);

  // Render
  return (
    <div aria-label="K.DOT TYPES title keys" className="key-title" role="group">
      {TITLE_KEYS.map((key, index) => {
        if (key === " ") {
          return (
            <span aria-hidden="true" className="key-title-space" key={index} />
          );
        }

        const isPressed =
          animatedPressedKeyIndexes.includes(index) ||
          heldKeyIndexes.includes(index);

        return (
          <button
            aria-label={`${key === "." ? "Dot" : key} title key`}
            className="key-title-key"
            key={`${key}-${index}`}
            onBlur={() => handlePointerRelease(index)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onKeyUp={(event) => handleKeyUp(index, event)}
            onLostPointerCapture={() => handlePointerRelease(index)}
            onPointerCancel={() => handlePointerRelease(index)}
            onPointerDown={(event) => handlePointerDown(index, event)}
            onPointerUp={() => handlePointerRelease(index)}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className={`key-title-sprite${
                isPressed ? " key-title-sprite-pressed" : ""
              }`}
              draggable={false}
              src={getTitleKeySprite(key, isPressed)}
            />
          </button>
        );
      })}
    </div>
  );
}

export default KeyTitle;
