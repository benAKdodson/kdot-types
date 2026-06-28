import restartButtonSrc from "../Assets/Restart-Button.png";

function GameStatusOverlay({ onStart, status }) {
  if (status === "complete") {
    return null;
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
            <img
              alt=""
              aria-hidden="true"
              className="pixel-button-icon"
              src={restartButtonSrc}
            />
            <span className="pixel-text button-text">Restart</span>
          </button>
        </section>
      </div>
    );
  }

  return null;
}

export default GameStatusOverlay;
