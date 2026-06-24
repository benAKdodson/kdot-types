import { Play, RotateCcw } from "lucide-react";

function GameStatusOverlay({ onStart, status }) {
  if (status === "idle") {
    return (
      <div className="game-overlay" role="presentation">
        <section
          aria-modal="true"
          aria-labelledby="welcome-title"
          className="game-dialog welcome-dialog"
          role="dialog"
        >
          <h1 className="dialog-title welcome-title" id="welcome-title">
            Welcome to KDot Types
          </h1>
          <div className="welcome-copy">
            <p>
              The rules are simple:
              <br />- You have 5 seconds to type each word.
              <br />- You lose 1 heart for each word you miss.
              <br />- Lose 3 and you're done mate.
            </p>
            <p>
              There are no backspaces - and typing the wrong letter doesnt lose
              you any health. Good luck!
            </p>
          </div>
          <button
            autoFocus
            className="dialog-button"
            onClick={onStart}
            type="button"
          >
            <Play aria-hidden="true" fill="currentColor" size={17} />
            Start
          </button>
        </section>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="game-overlay" role="presentation">
        <section
          aria-modal="true"
          aria-labelledby="complete-title"
          className="game-dialog"
          role="dialog"
        >
          <p className="dialog-kicker">Complete</p>
          <h1 className="dialog-title" id="complete-title">
            Done!
          </h1>
          <button
            autoFocus
            className="dialog-button"
            onClick={onStart}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={17} strokeWidth={2.25} />
            Restart
          </button>
        </section>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="game-overlay" role="presentation">
        <section
          aria-modal="true"
          aria-labelledby="failed-title"
          className="game-dialog"
          role="dialog"
        >
          <p className="dialog-kicker">Out of lives</p>
          <h1 className="dialog-title" id="failed-title">
            Try again?
          </h1>
          <button
            autoFocus
            className="dialog-button"
            onClick={onStart}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={17} strokeWidth={2.25} />
            Restart
          </button>
        </section>
      </div>
    );
  }

  return null;
}

export default GameStatusOverlay;
