function CountdownWord({ value }) {
  return (
    <div className="word-line countdown-line" aria-label="Starting countdown">
      <span className="word word-active word-position-center countdown-word">
        <span className="pixel-text word-text">{value}</span>
      </span>
    </div>
  );
}

export default CountdownWord;
