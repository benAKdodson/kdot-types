import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

const WORDS = [
  "love",
  "smile",
  "cake",
  "music",
  "dance",
  "flowers",
  "present",
  "sparkle",
  "kerrianne",
  "surprise",
  "higgledypiggledy",
];

function getNextProgress(progress, typedKey) {
  const currentWord = WORDS[progress.wordIndex];

  if (!currentWord) {
    return progress;
  }

  const expectedKey = currentWord[progress.charIndex];

  if (typedKey !== expectedKey) {
    return progress;
  }

  const nextCharIndex = progress.charIndex + 1;

  if (nextCharIndex < currentWord.length) {
    return {
      wordIndex: progress.wordIndex,
      charIndex: nextCharIndex,
    };
  }

  return {
    wordIndex: progress.wordIndex + 1,
    charIndex: 0,
  };
}

function getPositionClass(offset) {
  if (offset < -4) {
    return "word-offscreen-left";
  }

  if (offset > 4) {
    return "word-offscreen-right";
  }

  if (offset < 0) {
    return `word-position-neg-${Math.abs(offset)}`;
  }

  if (offset > 0) {
    return `word-position-pos-${offset}`;
  }

  return "word-position-center";
}

function App() {
  const [progress, setProgress] = useState({
    wordIndex: 0,
    charIndex: 0,
  });

  const positionedWords = useMemo(
    () =>
      WORDS.map((word, index) => {
        const offset = index - progress.wordIndex;

        return {
          distance: Math.abs(offset),
          index,
          offset,
          word,
        };
      }),
    [progress.wordIndex],
  );

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();

      setProgress((currentProgress) =>
        getNextProgress(currentProgress, event.key.toLowerCase()),
      );
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleRestart(event) {
    event.currentTarget.blur();
    setProgress({
      wordIndex: 0,
      charIndex: 0,
    });
  }

  return (
    <main className="typing-stage">
      <div className="ui-bar" aria-label="Typing test controls">
        <div className="health-meter" aria-label="Health">
          <span aria-hidden="true">❤️</span>
          <span aria-hidden="true">❤️</span>
          <span aria-hidden="true">❤️</span>
        </div>

        <button
          aria-label="Restart test"
          className="restart-button"
          onClick={handleRestart}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={18} strokeWidth={2.25} />
        </button>
      </div>

      <div className="word-line" aria-label="Typing words">
        {positionedWords.map(({ distance, index, offset, word }) => (
          <Word
            charIndex={progress.charIndex}
            distance={distance}
            isActive={index === progress.wordIndex}
            key={word}
            positionClass={getPositionClass(offset)}
            word={word}
          />
        ))}
      </div>
    </main>
  );
}

function Word({ charIndex, distance, isActive, positionClass, word }) {
  const className = [
    "word",
    positionClass,
    isActive ? "word-active" : "",
    distance >= 3 ? "word-far" : "",
    distance === 2 ? "word-soft" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} style={{ "--letter-count": word.length || 1 }}>
      {isActive
        ? word.split("").map((letter, index) => (
            <span
              className={index < charIndex ? "letter-typed" : "letter-pending"}
              key={`${letter}-${index}`}
            >
              {letter}
            </span>
          ))
        : word}
    </span>
  );
}

export default App;
