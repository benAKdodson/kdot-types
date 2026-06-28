export function createPreloadedAudio(source) {
  if (typeof Audio === "undefined") {
    return null;
  }

  const audio = new Audio(source);
  audio.preload = "auto";
  return audio;
}

export function restartAudio(audio) {
  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.catch(() => {});
    }
  } catch {
    // Browser playback policy should not interfere with application behavior.
  }
}
