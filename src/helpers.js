export function formatCountdown(centisecondsRemaining) {
  const wholeSeconds = Math.floor(centisecondsRemaining / 100);
  const centiseconds = centisecondsRemaining % 100;

  return `${String(wholeSeconds).padStart(2, "0")}:${String(centiseconds).padStart(
    2,
    "0",
  )}`;
}

export function isInteractiveTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest("button"));
}
