import playButtonSrc from '../Assets/Sprites/UI/Play-Button.png';

function WelcomePanel({ isStarting = false, onStart }) {
  return (
    <section
      aria-labelledby="welcome-title"
      className={`welcome-paper-content${
        isStarting ? " welcome-paper-content-starting" : ""
      }`}
    >
      <h1 className="welcome-paper-title" id="welcome-title">
        Welcome to K.Dot Types
      </h1>
      <div className="welcome-paper-copy">
        <p>
          The rules are simple:
          <br />- You have 5 seconds to type each word.
          <br />- You lose 1 heart for each word you miss.
          <br />- Lose 3 and you're done mate.
          <br />- Punctuation and caps are required.
        </p>
        <p>
          There are no backspaces as typing the wrong letter doesnt do anything (like me before midday.) Good luck!
        </p>
      </div>
      <button
        autoFocus
        className="dialog-button"
        disabled={isStarting}
        onClick={onStart}
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className="pixel-button-icon"
          src={playButtonSrc}
        />
        <span className="pixel-text button-text">Begin</span>
      </button>
    </section>
  );
}

export default WelcomePanel;
