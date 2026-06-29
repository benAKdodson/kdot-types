import { useLayoutEffect, useRef, useState } from 'react';

import heartFullSrc from '../Assets/Sprites/UI/Heart-full-border.png';
import muteButtonActiveSrc from '../Assets/Sprites/UI/Mute-Button-active.png';
import muteButtonSrc from '../Assets/Sprites/UI/Mute-Button.png';
import pauseButtonSrc from '../Assets/Sprites/UI/Pause-Button.png';
import playButtonSrc from '../Assets/Sprites/UI/Play-Button.png';
import restartButtonSrc from '../Assets/Sprites/UI/Restart-Button.png';
import timerSrc from '../Assets/Sprites/UI/Timer.png';
import { formatCountdown } from '../helpers.js';
import KeyTitle from './KeyTitle.jsx';

const HEART_LEVEL_UP_ANIMATION_MS = 600;

function TopHud({
  health,
  isAudioMuted,
  isTimerPausable,
  isTimerPaused,
  isTitleIdleAnimationEnabled,
  maxHealth,
  onRestart,
  onTitleKeyPress,
  onToggleAudioMuted,
  onToggleTimerPause,
  centisecondsRemaining,
  titlePatternRequest,
}) {
  const previousMaxHealthRef = useRef(maxHealth);
  const [growingHeartIndex, setGrowingHeartIndex] = useState(null);
  const countdownLabel = formatCountdown(centisecondsRemaining);

  useLayoutEffect(() => {
    const hasGainedMaxHealth = maxHealth > previousMaxHealthRef.current;

    previousMaxHealthRef.current = maxHealth;

    if (!hasGainedMaxHealth) {
      return undefined;
    }

    setGrowingHeartIndex(Math.max(0, health - 1));

    const timeoutId = window.setTimeout(() => {
      setGrowingHeartIndex(null);
    }, HEART_LEVEL_UP_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [maxHealth]);

  return (
    <div className="top-hud">
      <KeyTitle
        isIdleAnimationEnabled={isTitleIdleAnimationEnabled}
        onManualKeyPress={onTitleKeyPress}
        patternRequest={titlePatternRequest}
      />

      <div className="ui-bar" aria-label="Typing test controls">
        <div
          aria-label={`${health} of ${maxHealth} hearts remaining`}
          className={`health-meter${
            maxHealth > 3 ? " health-meter-expanded" : ""
          }`}
        >
          {Array.from({ length: maxHealth }).map((_, index) => (
            <span
              aria-hidden="true"
              className={`${index < health ? "" : "heart-lost"}${
                index === growingHeartIndex ? " heart-level-up" : ""
              }`}
              key={index}
            >
              <img alt="" className="heart-icon" src={heartFullSrc} />
            </span>
          ))}
        </div>

        <div
          aria-label={`${countdownLabel} seconds remaining`}
          className="timer-count"
        >
          <span aria-hidden="true" className="timer-screen" />
          <img alt="" aria-hidden="true" className="timer-frame" src={timerSrc} />
          <span className="pixel-text timer-count-text">{countdownLabel}</span>
        </div>

        <div className="hud-actions">
          <button
            aria-label={isAudioMuted ? "Unmute audio" : "Mute audio"}
            aria-pressed={isAudioMuted}
            className={`icon-button mute-button${
              isAudioMuted ? " mute-button-active" : ""
            }`}
            onClick={onToggleAudioMuted}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="pixel-button-icon"
              src={isAudioMuted ? muteButtonActiveSrc : muteButtonSrc}
            />
          </button>

          <button
            aria-label={isTimerPaused ? "Resume timer" : "Pause timer"}
            className={`icon-button pause-button ${
              isTimerPaused ? "pause-button-active" : ""
            }`}
            disabled={!isTimerPausable}
            onClick={onToggleTimerPause}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="pixel-button-icon"
              src={isTimerPaused ? playButtonSrc : pauseButtonSrc}
            />
          </button>

          <button
            aria-label="Restart test"
            className="icon-button restart-button"
            onClick={onRestart}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="pixel-button-icon"
              src={restartButtonSrc}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopHud;
