import { useLayoutEffect, useRef, useState } from 'react';

import {
  TYPEWRITER_CAPS_LOCK_SPRITE,
  TYPEWRITER_KEY_SPRITES,
} from '../Assets/Sprites/Keys';
import typewriterActiveSprite from '../Assets/Sprites/Typewriter-2-active.png';
import typewriterSprite from '../Assets/Sprites/Typewriter-2.png';

const TYPEWRITER_WIDTH = 60;
const TYPEWRITER_HEIGHT = 25;
const KEYS_WITHOUT_ACTIVE_FRAME = new Set(['enter', 'shift', 'space']);
const SPRITE_SOURCES = [
  typewriterSprite,
  typewriterActiveSprite,
  TYPEWRITER_CAPS_LOCK_SPRITE,
  ...TYPEWRITER_KEY_SPRITES.flatMap(({ normal, pressed }) => [
    normal,
    pressed,
  ]),
];
const spriteImages = new Map();
let preloadPromise = null;

function preloadSprites() {
  if (preloadPromise !== null) {
    return preloadPromise;
  }

  preloadPromise = Promise.all(
    SPRITE_SOURCES.map(
      (source) =>
        new Promise((resolve) => {
          const image = new Image();

          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = source;
          spriteImages.set(source, image);
        }),
    ),
  );

  return preloadPromise;
}

function drawSprite(context, source) {
  const image = spriteImages.get(source);

  if (image?.complete && image.naturalWidth > 0) {
    context.drawImage(image, 0, 0, TYPEWRITER_WIDTH, TYPEWRITER_HEIGHT);
  }
}

function TypewriterBody({ isCapsLockEnabled, pressedKeys }) {
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    let isCancelled = false;

    function drawTypewriter() {
      if (isCancelled) {
        return;
      }

      const context = canvasRef.current?.getContext('2d');

      if (!context) {
        return;
      }

      const pressedKeySet = new Set(pressedKeys);
      const isTypewriterActive = pressedKeys.some(
        (key) => !KEYS_WITHOUT_ACTIVE_FRAME.has(key),
      );

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, TYPEWRITER_WIDTH, TYPEWRITER_HEIGHT);
      drawSprite(
        context,
        isTypewriterActive ? typewriterActiveSprite : typewriterSprite,
      );

      TYPEWRITER_KEY_SPRITES.forEach(({ id, normal, pressed }) => {
        drawSprite(context, pressedKeySet.has(id) ? pressed : normal);
      });

      if (isCapsLockEnabled) {
        drawSprite(context, TYPEWRITER_CAPS_LOCK_SPRITE);
      }

      setIsReady(true);
    }

    preloadSprites().then(drawTypewriter);

    return () => {
      isCancelled = true;
    };
  }, [isCapsLockEnabled, pressedKeys]);

  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        className={`typewriter-sprite typewriter-sprite-base${
          isReady ? ' typewriter-sprite-hidden' : ''
        }`}
        src={typewriterSprite}
      />
      <canvas
        aria-hidden="true"
        className={`typewriter-sprite typewriter-sprite-base${
          isReady ? '' : ' typewriter-sprite-hidden'
        }`}
        height={TYPEWRITER_HEIGHT}
        ref={canvasRef}
        width={TYPEWRITER_WIDTH}
      />
    </>
  );
}

export default TypewriterBody;
