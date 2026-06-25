import playButtonSrc from '../Assets/Play-Button.png';

function WelcomePanel({ onStart }) {
  return (
    <section
      aria-labelledby="welcome-title"
      className="game-dialog welcome-dialog welcome-panel"
    >
      <h1 className="dialog-title welcome-title" id="welcome-title">
        Welcome to K.Dot Types
      </h1>
      <div className="welcome-copy">
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
