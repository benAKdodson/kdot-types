import { createPreloadedAudio, restartAudio } from "./audio.js";

const KEY_PRESS_SOUND_MODULES = import.meta.glob(
  "./Assets/Sounds/Presses/*.mp3",
  {
    eager: true,
    import: "default",
  },
);

const KEY_PRESS_SOUND_SOURCES = Object.values(KEY_PRESS_SOUND_MODULES).sort();
const VOICES_PER_SOUND = 4;
const audioPools = new Map();
let lastSoundIndex = -1;

function createAudioPool(source) {
  const voices = Array.from({ length: VOICES_PER_SOUND }, () =>
    createPreloadedAudio(source),
  );

  if (voices.some((voice) => voice === null)) {
    return null;
  }

  const pool = {
    nextVoiceIndex: 0,
    voices,
  };

  audioPools.set(source, pool);
  return pool;
}

function getAudioPool(source) {
  return audioPools.get(source) ?? createAudioPool(source);
}

function getRandomSoundIndex() {
  if (KEY_PRESS_SOUND_SOURCES.length <= 1) {
    return 0;
  }

  if (lastSoundIndex < 0) {
    return Math.floor(Math.random() * KEY_PRESS_SOUND_SOURCES.length);
  }

  let soundIndex = Math.floor(
    Math.random() * (KEY_PRESS_SOUND_SOURCES.length - 1),
  );

  if (soundIndex >= lastSoundIndex) {
    soundIndex += 1;
  }

  return soundIndex;
}

export function preloadKeyPressSounds() {
  KEY_PRESS_SOUND_SOURCES.forEach((source) => {
    getAudioPool(source);
  });
}

export function playRandomKeyPressSound() {
  if (KEY_PRESS_SOUND_SOURCES.length === 0) {
    return;
  }

  const soundIndex = getRandomSoundIndex();
  const source = KEY_PRESS_SOUND_SOURCES[soundIndex];
  const pool = getAudioPool(source);

  if (!pool) {
    return;
  }

  lastSoundIndex = soundIndex;

  const availableVoice = pool.voices.find(
    (voice) => voice.paused || voice.ended,
  );
  const voice = availableVoice ?? pool.voices[pool.nextVoiceIndex];

  pool.nextVoiceIndex = (pool.nextVoiceIndex + 1) % pool.voices.length;

  restartAudio(voice);
}
