import heartFullSrc from '../Assets/Heart-full-border.png';
import pauseButtonSrc from '../Assets/Pause-Button.png';
import playButtonSrc from '../Assets/Play-Button.png';
import restartButtonSrc from '../Assets/Restart-Button.png';
import { MAX_HEALTH } from '../game.js';
import { formatCountdown } from '../helpers.js';
import KeyTitle from './KeyTitle.jsx';

function TopHud({
  health,
  isTimerPausable,
  isTimerPaused,
  isTitleIdleAnimationEnabled,
  onRestart,
  onToggleTimerPause,
  tenthsRemaining,
  titlePatternRequest,
}) {
  const countdownLabel = formatCountdown(tenthsRemaining);

  return (
    <div className="top-hud">
      <KeyTitle
        isIdleAnimationEnabled={isTitleIdleAnimationEnabled}
        patternRequest={titlePatternRequest}
      />

      <div className="ui-bar" aria-label="Typing test controls">
        <div
          aria-label={`${health} of ${MAX_HEALTH} hearts remaining`}
          className="health-meter"
        >
          {Array.from({ length: MAX_HEALTH }).map((_, index) => (
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
          <span className="pixel-text timer-count-text">{countdownLabel}</span>
        </div>

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
  );
}

export default TopHud;
