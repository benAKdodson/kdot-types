export function formatCountdown(tenthsRemaining) {
  const wholeSeconds = Math.floor(tenthsRemaining / 10);
  const decimal = tenthsRemaining % 10;

  return `${String(wholeSeconds)}:${decimal}`;
}

export function isInteractiveTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest("button"));
}
