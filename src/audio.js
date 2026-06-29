const audioInstances = new Set();
const audioMutedListeners = new Set();
let audioMuted = false;

export function createPreloadedAudio(source) {
  if (typeof Audio === "undefined") {
    return null;
  }

  const audio = new Audio(source);
  audio.muted = audioMuted;
  audio.preload = "auto";
  audioInstances.add(audio);
  return audio;
}

export function getAudioMuted() {
  return audioMuted;
}

export function setAudioMuted(nextAudioMuted) {
  const normalizedAudioMuted = Boolean(nextAudioMuted);

  if (normalizedAudioMuted === audioMuted) {
    return;
  }

  audioMuted = normalizedAudioMuted;

  audioInstances.forEach((audio) => {
    audio.muted = audioMuted;
  });

  audioMutedListeners.forEach((listener) => {
    listener();
  });
}

export function subscribeAudioMuted(listener) {
  audioMutedListeners.add(listener);

  return () => {
    audioMutedListeners.delete(listener);
  };
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
