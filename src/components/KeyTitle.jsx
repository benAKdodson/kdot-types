import {
  useEffect,
  useState,
} from 'react';

import { KEY_SPRITES } from '../Assets/Keys';
import {
  getTitleKeyPatternByName,
  getRandomTitleKeyPattern,
  getRandomTitlePatternDelayMs,
  TITLE_KEYS,
} from '../titleKeyPatterns.js';

function getTitleKeySprite(key, isPressed) {
  const sprite = KEY_SPRITES[key];

  return isPressed ? sprite.pressed : sprite.normal;
}

function KeyTitle({ isIdleAnimationEnabled, patternRequest }) {
  const [pressedKeyIndexes, setPressedKeyIndexes] = useState([]);

  useEffect(() => {
    let isActive = true;
    let timeoutId;

    function scheduleNextPattern() {
      if (!isIdleAnimationEnabled) {
        setPressedKeyIndexes([]);
        return;
      }

      timeoutId = window.setTimeout(() => {
        playPattern(getRandomTitleKeyPattern());
      }, getRandomTitlePatternDelayMs());
    }

    function playPattern(pattern, frameIndex = 0) {
      if (!isActive) {
        return;
      }

      const frame = pattern.frames[frameIndex];

      if (!frame) {
        setPressedKeyIndexes([]);
        scheduleNextPattern();
        return;
      }

      setPressedKeyIndexes(frame.keys);

      timeoutId = window.setTimeout(() => {
        playPattern(pattern, frameIndex + 1);
      }, frame.durationMs);
    }

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
      window.clearTimeout(timeoutId);
    };
  }, [isIdleAnimationEnabled, patternRequest]);

  return (
    <div aria-label="K.DOT TYPES" className="key-title" role="img">
      {TITLE_KEYS.map((key, index) => {
        if (key === " ") {
          return (
            <span aria-hidden="true" className="key-title-space" key={index} />
          );
        }

        const isPressed = pressedKeyIndexes.includes(index);

        return (
          <img
            alt=""
            aria-hidden="true"
            className={`key-title-sprite${
              isPressed ? " key-title-sprite-pressed" : ""
            }`}
            key={`${key}-${index}`}
            src={getTitleKeySprite(key, isPressed)}
          />
        );
      })}
    </div>
  );
}

export default KeyTitle;
