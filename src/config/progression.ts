export const progressionConfig = {
  dailyXpTarget: 100,
  activeDayXpThreshold: 30,
  nearGoalXpThreshold: 20,
  levelCurve: {
    baseXpPerLevel: 100,
    additionalXpPerLevel: 50,
  },
  activityXp: {
    easyWalk: 15,
    tenMinuteWalk: 20,
    longerWalk: 30,
    quickStretch: 10,
    mobilityReset: 15,
    simpleBodyweight: 15,
    bodyweightWorkout: 40,
    moderateWorkout: 55,
    fullBodyWorkout: 75,
    steadyRun: 50,
  },
} as const;
