import { Pause, Play, RotateCcw } from "lucide-react";

import { formatCountdown } from "../helpers.js";
import { MAX_HEALTH } from "../game.js";
import KeyTitle from "./KeyTitle.jsx";

function TopHud({
  health,
  isTimerPausable,
  isTimerPaused,
  onRestart,
  onToggleTimerPause,
  tenthsRemaining,
}) {
  return (
    <div className="top-hud">
      <KeyTitle />

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
              ❤️
            </span>
          ))}
        </div>

        <div
          aria-label={`${formatCountdown(tenthsRemaining)} seconds remaining`}
          className="timer-count"
        >
          {formatCountdown(tenthsRemaining)}
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
          {isTimerPaused ? (
            <Play aria-hidden="true" fill="currentColor" size={16} />
          ) : (
            <Pause aria-hidden="true" size={17} strokeWidth={2.25} />
          )}
        </button>

        <button
          aria-label="Restart test"
          className="icon-button restart-button"
          onClick={onRestart}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={18} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

export default TopHud;
