export const TYPEWRITER_LINE_LENGTH = 48;

export function getTypewriterLines({
  completedWords,
  currentWordFragment,
  lineWordCounts,
}) {
  if (!completedWords.length && !currentWordFragment) {
    return [""];
  }

  if (!lineWordCounts?.length) {
    return getCharacterWrappedLines(
      joinWords(completedWords, currentWordFragment),
    );
  }

  const lines = [];
  const activeWordIndex = completedWords.length;
  let wordIndex = 0;

  for (let lineIndex = 0; lineIndex < lineWordCounts.length; lineIndex += 1) {
    const wordCount = lineWordCounts[lineIndex];

    if (wordCount === 0) {
      if (lines.length > 0 && wordIndex <= completedWords.length) {
        lines.push("");
      }

      continue;
    }

    const lineEndIndex = wordIndex + wordCount;
    const completedLineWords = completedWords.slice(
      wordIndex,
      Math.min(completedWords.length, lineEndIndex),
    );
    const hasActiveWordOnLine =
      Boolean(currentWordFragment) &&
      activeWordIndex >= wordIndex &&
      activeWordIndex < lineEndIndex;
    const lineWords = hasActiveWordOnLine
      ? [...completedLineWords, currentWordFragment]
      : completedLineWords;

    if (lineWords.length > 0) {
      lines.push(lineWords.join(" "));
    }

    if (hasActiveWordOnLine || completedWords.length < lineEndIndex) {
      return lines.length ? lines : [""];
    }

    wordIndex = lineEndIndex;

    if (!currentWordFragment && completedWords.length === lineEndIndex) {
      appendNextLinePreview(lines, lineWordCounts, lineIndex + 1);

      return lines.length ? lines : [""];
    }
  }

  if (wordIndex < completedWords.length || currentWordFragment) {
    lines.push(
      ...getCharacterWrappedLines(
        joinWords(completedWords.slice(wordIndex), currentWordFragment),
      ),
    );
  }

  return lines.length ? lines : [""];
}

function getCharacterWrappedLines(text) {
  if (!text) {
    return [""];
  }

  const lines = [];

  for (let index = 0; index < text.length; index += TYPEWRITER_LINE_LENGTH) {
    lines.push(text.slice(index, index + TYPEWRITER_LINE_LENGTH));
  }

  return lines;
}

function appendNextLinePreview(lines, lineWordCounts, startLineIndex) {
  for (
    let lineIndex = startLineIndex;
    lineIndex < lineWordCounts.length;
    lineIndex += 1
  ) {
    lines.push("");

    if (lineWordCounts[lineIndex] > 0) {
      return;
    }
  }
}

function joinWords(completedWords, currentWordFragment) {
  return currentWordFragment
    ? [...completedWords, currentWordFragment].join(" ")
    : completedWords.join(" ");
}
