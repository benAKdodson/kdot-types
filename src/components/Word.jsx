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

function Word({ charIndex, distance, isActive, offset, word }) {
  const className = [
    "word",
    getPositionClass(offset),
    isActive ? "word-active" : "",
    distance >= 3 ? "word-far" : "",
    distance === 2 ? "word-soft" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const wordContent = isActive
    ? word.split("").map((letter, index) => (
        <span
          className={index < charIndex ? "letter-typed" : "letter-pending"}
          key={`${letter}-${index}`}
        >
          {letter}
        </span>
      ))
    : word;

  return (
    <span className={className} style={{ "--letter-count": word.length || 1 }}>
      <span className="pixel-text word-text">{wordContent}</span>
    </span>
  );
}

export default Word;
