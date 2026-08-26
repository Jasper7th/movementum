export const manualActivityConfig = {
  durationOptions: [5, 10, 15, 20, 30, 45, 60, 75, 90],
  xpCurves: {
    light: [
      { upToMinutes: 5, xp: 5 }, { upToMinutes: 10, xp: 10 },
      { upToMinutes: 15, xp: 15 }, { upToMinutes: 20, xp: 20 },
      { upToMinutes: 30, xp: 25 }, { upToMinutes: 45, xp: 30 },
      { upToMinutes: Number.POSITIVE_INFINITY, xp: 35 },
    ],
    workout: [
      { upToMinutes: 5, xp: 10 }, { upToMinutes: 10, xp: 15 },
      { upToMinutes: 15, xp: 20 }, { upToMinutes: 20, xp: 30 },
      { upToMinutes: 30, xp: 45 }, { upToMinutes: 45, xp: 60 },
      { upToMinutes: 60, xp: 70 }, { upToMinutes: Number.POSITIVE_INFINITY, xp: 80 },
    ],
  },
} as const;
