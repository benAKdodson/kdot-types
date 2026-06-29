export const GAME_OVER_PHRASES = [
  "Skill issue",
  "Could I offer you an 'H' in this tryin' time",
  "Hint - try 'ESPS'",
  "Hint - 10 seconds would be 'DOPE'"
];

export function getRandomGameOverPhrase(previousPhrase = null) {
  const availablePhrases = GAME_OVER_PHRASES.filter(
    (phrase) => phrase !== previousPhrase,
  );
  const phrases = availablePhrases.length > 0 ? availablePhrases : GAME_OVER_PHRASES;
  const randomIndex = Math.floor(Math.random() * phrases.length);

  return phrases[randomIndex] ?? "Skill issue";
}
