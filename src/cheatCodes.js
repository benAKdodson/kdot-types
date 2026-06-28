export const CHEAT_CODE_INPUT_TIMEOUT_MS = 2000;

export const CHEAT_CODES = [
  {
    effect: "add-heart",
    sequence: "ESPS",
  },
  {
    effect: "complete-game",
    sequence: "OK...",
  },
];

const MAX_CHEAT_CODE_LENGTH = Math.max(
  ...CHEAT_CODES.map(({ sequence }) => sequence.length),
  0,
);

export function advanceCheatCodeInput(currentInput, key) {
  const appendedInput = `${currentInput}${key}`.toUpperCase();
  const nextInput = MAX_CHEAT_CODE_LENGTH
    ? appendedInput.slice(-MAX_CHEAT_CODE_LENGTH)
    : "";
  const matchedCode = CHEAT_CODES.find(
    ({ sequence }) => sequence === nextInput,
  );

  if (matchedCode) {
    return {
      effect: matchedCode.effect,
      input: "",
    };
  }

  for (let startIndex = 0; startIndex < nextInput.length; startIndex += 1) {
    const possiblePrefix = nextInput.slice(startIndex);

    if (
      CHEAT_CODES.some(({ sequence }) => sequence.startsWith(possiblePrefix))
    ) {
      return {
        effect: null,
        input: possiblePrefix,
      };
    }
  }

  return {
    effect: null,
    input: "",
  };
}
