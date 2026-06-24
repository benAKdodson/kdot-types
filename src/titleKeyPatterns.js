export const TITLE_KEYS = ["K", "D", "O", "T", " ", "T", "Y", "P", "E", "S"];

export const TITLE_KEY_INDEXES = TITLE_KEYS.map((key, index) =>
  key === " " ? null : index,
).filter((index) => index !== null);

export const TITLE_KEY_TIMINGS = {
  actionAllTapGapMs: 80,
  actionAllTapPressMs: 150,
  actionAllTapRestMs: 120,
  actionFastGapMs: 0,
  actionFastPressMs: 42,
  idleDelayMaxMs: 2600,
  idleDelayMinMs: 1100,
  idleGapMs: 5,
  idleGroupPressMs: 130,
  idlePressMs: 110,
  idleRestMs: 90,
};

function press(keys, durationMs = TITLE_KEY_TIMINGS.idlePressMs) {
  return {
    durationMs,
    keys,
  };
}

function pause(durationMs = TITLE_KEY_TIMINGS.idleGapMs) {
  return press([], durationMs);
}

function idleGroupPress(keys) {
  return press(keys, TITLE_KEY_TIMINGS.idleGroupPressMs);
}

function idleRest() {
  return pause(TITLE_KEY_TIMINGS.idleRestMs);
}

function pressSequence(
  indexes,
  pressDurationMs = TITLE_KEY_TIMINGS.idlePressMs,
  gapDurationMs = TITLE_KEY_TIMINGS.idleGapMs,
) {
  return indexes.flatMap((index) => [
    press([index], pressDurationMs),
    pause(gapDurationMs),
  ]);
}

export const IDLE_TITLE_KEY_PATTERNS = [
  {
    name: "left-to-right",
    frames: pressSequence(TITLE_KEY_INDEXES),
  },
  {
    name: "right-to-left",
    frames: pressSequence([...TITLE_KEY_INDEXES].reverse()),
  },
  {
    name: "middle-out",
    frames: [
      idleGroupPress([3, 5]),
      pause(),
      idleGroupPress([2, 6]),
      pause(),
      idleGroupPress([1, 7]),
      pause(),
      idleGroupPress([0, 8]),
      pause(),
      idleGroupPress([9]),
      idleRest(),
    ],
  },
  {
    name: "outside-in",
    frames: [
      idleGroupPress([0, 9]),
      pause(),
      idleGroupPress([1, 8]),
      pause(),
      idleGroupPress([2, 7]),
      pause(),
      idleGroupPress([3, 6]),
      pause(),
      idleGroupPress([5]),
      idleRest(),
    ],
  },
  {
    name: "kdot-types-kdot-types",
    frames: [
      idleGroupPress([0, 1, 2, 3]),
      pause(),
      idleGroupPress([5, 6, 7, 8, 9]),
      pause(),
      idleGroupPress([0, 1, 2, 3]),
      pause(),
      idleGroupPress([5, 6, 7, 8, 9]),
      idleRest(),
    ]
  },
  {
    name: "zig-zag",
    frames: [
      idleGroupPress([5]),
      pause(),
      idleGroupPress([0]),
      pause(),
      idleGroupPress([6]),
      pause(),
      idleGroupPress([1]),
      pause(),
      idleGroupPress([7]),
      pause(),
      idleGroupPress([2]),
      pause(),
      idleGroupPress([8]),
      pause(),
      idleGroupPress([3]),
      pause(),
      idleGroupPress([9]),
      idleRest(),
    ]
  }
];

export const ACTION_TITLE_KEY_PATTERNS = [
  {
    name: "left-to-right-fast",
    frames: pressSequence(
      TITLE_KEY_INDEXES,
      TITLE_KEY_TIMINGS.actionFastPressMs,
      TITLE_KEY_TIMINGS.actionFastGapMs,
    ),
  },
  {
    name: "right-to-left-fast",
    frames: pressSequence(
      [...TITLE_KEY_INDEXES].reverse(),
      TITLE_KEY_TIMINGS.actionFastPressMs,
      TITLE_KEY_TIMINGS.actionFastGapMs,
    ),
  },
  {
    name: "all-tap",
    frames: [
      press(TITLE_KEY_INDEXES, TITLE_KEY_TIMINGS.actionAllTapPressMs),
      pause(TITLE_KEY_TIMINGS.actionAllTapGapMs),
      press(TITLE_KEY_INDEXES, TITLE_KEY_TIMINGS.actionAllTapPressMs),
      pause(TITLE_KEY_TIMINGS.actionAllTapRestMs),
    ],
  },
];

export const TITLE_KEY_PATTERNS = [
  ...IDLE_TITLE_KEY_PATTERNS,
  ...ACTION_TITLE_KEY_PATTERNS,
];

export function getRandomTitleKeyPattern() {
  return IDLE_TITLE_KEY_PATTERNS[
    Math.floor(Math.random() * IDLE_TITLE_KEY_PATTERNS.length)
  ];
}

export function getTitleKeyPatternByName(name) {
  return TITLE_KEY_PATTERNS.find((pattern) => pattern.name === name);
}

export function getRandomTitlePatternDelayMs() {
  return (
    TITLE_KEY_TIMINGS.idleDelayMinMs +
    Math.random() *
      (TITLE_KEY_TIMINGS.idleDelayMaxMs - TITLE_KEY_TIMINGS.idleDelayMinMs)
  );
}
