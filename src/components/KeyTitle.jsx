import {
  useEffect,
  useState,
} from 'react';

import { KEY_SPRITES } from '../Assets/Keys';

const TITLE_KEYS = ["K", "D", "O", "T", " ", "T", "Y", "P", "E", "S"];
const TITLE_KEY_INDEXES = TITLE_KEYS.map((key, index) =>
  key === " " ? null : index,
).filter((index) => index !== null);

function getTitleKeySprite(key, isPressed) {
  const sprite = KEY_SPRITES[key];

  return isPressed ? sprite.pressed : sprite.normal;
}

function KeyTitle() {
  const [pressedKeyIndex, setPressedKeyIndex] = useState(null);

  useEffect(() => {
    let pressTimeoutId;
    let nextPressTimeoutId;

    function schedulePress() {
      const delayMs = 500 + Math.random() * 900;

      nextPressTimeoutId = window.setTimeout(() => {
        const keyIndex =
          TITLE_KEY_INDEXES[Math.floor(Math.random() * TITLE_KEY_INDEXES.length)];

        setPressedKeyIndex(keyIndex);

        pressTimeoutId = window.setTimeout(() => {
          setPressedKeyIndex(null);
          schedulePress();
        }, 220);
      }, delayMs);
    }

    schedulePress();

    return () => {
      window.clearTimeout(pressTimeoutId);
      window.clearTimeout(nextPressTimeoutId);
    };
  }, []);

  return (
    <div aria-label="KDOT TYPES" className="key-title" role="img">
      {TITLE_KEYS.map((key, index) => {
        if (key === " ") {
          return (
            <span aria-hidden="true" className="key-title-space" key={index} />
          );
        }

        return (
          <img
            alt=""
            aria-hidden="true"
            className="key-title-sprite"
            key={`${key}-${index}`}
            src={getTitleKeySprite(key, pressedKeyIndex === index)}
          />
        );
      })}
    </div>
  );
}

export default KeyTitle;
