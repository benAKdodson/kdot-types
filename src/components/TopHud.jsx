import heartFullSrc from '../Assets/Heart-full-border.png';
import pauseButtonSrc from '../Assets/Pause-Button.png';
import playButtonSrc from '../Assets/Play-Button.png';
import restartButtonSrc from '../Assets/Restart-Button.png';
import timerSrc from '../Assets/Timer.png';
import { formatCountdown } from '../helpers.js';
import KeyTitle from './KeyTitle.jsx';

function TopHud({
  health,
  isTimerPausable,
  isTimerPaused,
  isTitleIdleAnimationEnabled,
  maxHealth,
  onRestart,
  onTitleKeyPress,
  onToggleTimerPause,
  centisecondsRemaining,
  titlePatternRequest,
}) {
  const countdownLabel = formatCountdown(centisecondsRemaining);

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
              className={index < health ? "" : "heart-lost"}
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
