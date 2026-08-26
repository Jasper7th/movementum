const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.logic-check');
if (fs.existsSync(output)) throw new Error('Temporary logic-check directory already exists.');

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'src/domain/achievements.ts', 'src/domain/levels.ts', 'src/domain/lifetime.ts',
    'src/domain/streaks.ts', 'src/domain/dayClassification.ts', 'src/domain/calendar.ts', 'src/domain/history.ts',
    'src/domain/models.ts', 'src/data/achievements.ts', 'src/data/activities.ts',
    'src/config/progression.ts', 'src/config/storage.ts', 'src/storage/migrations.ts',
    'src/config/notifications.ts', 'src/domain/notificationLogic.ts',
    'src/config/manualActivities.ts', 'src/data/manualActivities.ts', 'src/domain/manualActivities.ts',
    'src/config/recommendations.ts', 'src/domain/recommendations.ts',
    'src/application/appState.ts',
    'src/domain/auth.ts', 'src/domain/localOwnership.ts', 'src/domain/social.ts', 'src/navigation/tabs.ts',
    'src/config/developerAccess.ts',
    '--outDir', '.logic-check', '--module', 'commonjs',
    '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });

  const { applyAchievementEvaluation, evaluateAchievements } = require(path.join(output, 'domain', 'achievements.js'));
  const { achievementCatalog } = require(path.join(output, 'data', 'achievements.js'));
  const { migratePersistedState } = require(path.join(output, 'storage', 'migrations.js'));
  const notifications = require(path.join(output, 'domain', 'notificationLogic.js'));
  const manual = require(path.join(output, 'domain', 'manualActivities.js'));
  const appState = require(path.join(output, 'application', 'appState.js'));
  const classification = require(path.join(output, 'domain', 'dayClassification.js'));
  const streaks = require(path.join(output, 'domain', 'streaks.js'));
  const lifetime = require(path.join(output, 'domain', 'lifetime.js'));
  const levels = require(path.join(output, 'domain', 'levels.js'));
  const calendar = require(path.join(output, 'domain', 'calendar.js'));
  const history = require(path.join(output, 'domain', 'history.js'));
  const { activityCatalog } = require(path.join(output, 'data', 'activities.js'));
  const recommendations = require(path.join(output, 'domain', 'recommendations.js'));
  const auth = require(path.join(output, 'domain', 'auth.js'));
  const ownership = require(path.join(output, 'domain', 'localOwnership.js'));
  const social = require(path.join(output, 'domain', 'social.js'));
  const developerAccess = require(path.join(output, 'config', 'developerAccess.js'));
  const { appTabs } = require(path.join(output, 'navigation', 'tabs.js'));
  const today = '2026-08-23';
  const preferences = { primaryGoal: 'feel-healthier', workoutDaysPerWeek: 3, activeRecoveryDaysPerWeek: 2, activityAccess: ['bodyweight'], startingActivityLevel: 'somewhat-active', onboardingCompleted: true };
  const record = (date, classification = 'workout', earnedXp = 60) => ({ date, earnedXp, active: true, full: earnedXp >= 100, classification, activities: [] });
  const defaultNotifications = { enabled: false, dailyReminderEnabled: true, reminderHour: 19, streakReminderEnabled: true, weeklyReminderEnabled: true };
  const state = (overrides = {}) => ({ schemaVersion: 7, hasCompletedIntroTutorial: false, preferences, daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 0 }, progress: { currentStreak: 0, longestStreak: 0, history: [] }, achievements: [], notificationPreferences: defaultNotifications, ...overrides });
  const ids = (appState) => evaluateAchievements(appState, '2026-08-23T12:00:00.000Z').map((item) => item.id);

  const firstActive = state({ daily: { date: today, completedActivityIds: ['walk-10', 'mobility-reset'], earnedXp: 35 }, progress: { currentStreak: 1, longestStreak: 1, history: [] } });
  assert(ids(firstActive).includes('first-step'));
  assert(!ids(firstActive).includes('back-at-it'));
  const firstApplied = applyAchievementEvaluation(firstActive, '2026-08-23T12:00:00.000Z').state;
  assert.equal(evaluateAchievements(firstApplied).filter((item) => item.id === 'first-step').length, 0);
  assert.equal(JSON.parse(JSON.stringify(firstApplied)).achievements.filter((item) => item.id === 'first-step').length, 1);

  assert(!ids(state({ progress: { currentStreak: 6, longestStreak: 6, history: [] } })).includes('building-momentum'));
  assert(ids(state({ progress: { currentStreak: 7, longestStreak: 7, history: [] } })).includes('building-momentum'));
  assert(ids(state({ progress: { currentStreak: 30, longestStreak: 30, history: [] } })).includes('locked-in'));

  const nineWorkouts = Array.from({ length: 9 }, (_, index) => record(`2026-07-${String(index + 1).padStart(2, '0')}`));
  const tenthWorkout = state({ daily: { date: today, completedActivityIds: ['full-body'], earnedXp: 75 }, progress: { currentStreak: 1, longestStreak: 1, history: nineWorkouts } });
  const workoutApplied = applyAchievementEvaluation(tenthWorkout).state;
  assert(ids(tenthWorkout).includes('getting-stronger'));
  const reversedWorkout = { ...workoutApplied, daily: { date: today, completedActivityIds: [], earnedXp: 0 } };
  assert(reversedWorkout.achievements.some((item) => item.id === 'getting-stronger'));

  assert(ids(firstActive).includes('recovery-counts'));
  const balancedHistory = [record('2026-08-17'), record('2026-08-18'), record('2026-08-19'), record('2026-08-20'), record('2026-08-21', 'light', 35), record('2026-08-22', 'light', 35)];
  const balanced = state({ preferences: { ...preferences, workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 3 }, daily: { date: today, completedActivityIds: ['walk-10', 'mobility-reset'], earnedXp: 35 }, progress: { currentStreak: 7, longestStreak: 7, history: balancedHistory } });
  assert(ids(balanced).includes('balanced-week'));
  assert(ids(balanced).includes('full-week'));
  assert(!ids({ ...balanced, preferences: { ...balanced.preferences, workoutDaysPerWeek: 5, activeRecoveryDaysPerWeek: 0 } }).includes('balanced-week'));

  const fullWeek = state({ daily: { date: today, completedActivityIds: ['walk-10', 'mobility-reset'], earnedXp: 35 }, progress: { currentStreak: 5, longestStreak: 5, history: [record('2026-08-17'), record('2026-08-18'), record('2026-08-19'), record('2026-08-20', 'light', 35)] } });
  assert(ids(fullWeek).includes('full-week'));

  const levelFive = state({ progress: { currentStreak: 1, longestStreak: 1, history: [record('2026-08-22', 'active-unclassified', 700)] } });
  assert(ids(levelFive).includes('moving-up'));
  const fiveFigures = state({ progress: { currentStreak: 1, longestStreak: 1, history: [record('2026-08-22', 'active-unclassified', 10000)] } });
  assert(ids(fiveFigures).includes('five-figures'));

  const backAtIt = state({ daily: { date: today, completedActivityIds: ['full-body'], earnedXp: 75 }, progress: { currentStreak: 1, longestStreak: 2, history: [record('2026-08-20')] } });
  assert(ids(backAtIt).includes('back-at-it'));
  const stillMoving = state({ daily: { date: today, completedActivityIds: ['walk-10', 'mobility-reset'], earnedXp: 35 }, progress: { currentStreak: 2, longestStreak: 2, history: [record('2026-08-22')] } });
  assert(ids(stillMoving).includes('still-moving'));
  assert(!ids(firstActive).includes('still-moving'));

  const multiple = applyAchievementEvaluation(firstActive).state.achievements;
  assert.equal(new Set(multiple.map((item) => item.id)).size, multiple.length);
  assert(multiple.length >= 2);
  assert.equal(achievementCatalog.length, 16);
  const legacy = { ...state(), schemaVersion: 2 };
  delete legacy.achievements;
  delete legacy.notificationPreferences;
  delete legacy.hasCompletedIntroTutorial;
  const migrated = migratePersistedState(legacy);
  assert.equal(migrated.schemaVersion, 7);
  assert.deepEqual(migrated.achievements, []);
  assert.deepEqual(migrated.preferences, preferences);
  assert.equal(migrated.notificationPreferences.enabled, false);
  assert.deepEqual(migrated.daily.manualActivities, []);
  assert.equal(migrated.trackingStartedAt, today);
  assert.equal(migrated.hasCompletedIntroTutorial, true);
  const legacyV5 = { ...state({ ownerUserId: undefined, trackingStartedAt: undefined }), schemaVersion: 5 };
  delete legacyV5.ownerUserId;
  delete legacyV5.trackingStartedAt;
  delete legacyV5.hasCompletedIntroTutorial;
  const migratedV5 = migratePersistedState(legacyV5);
  assert.equal(migratedV5.schemaVersion, 7);
  assert.deepEqual(migratedV5.preferences, preferences);
  assert.equal(migratedV5.trackingStartedAt, today);
  assert.equal(migratedV5.hasCompletedIntroTutorial, true);
  const legacyV6 = { ...state({ hasCompletedIntroTutorial: undefined }), schemaVersion: 6 };
  delete legacyV6.hasCompletedIntroTutorial;
  const migratedV6 = migratePersistedState(legacyV6);
  assert.equal(migratedV6.schemaVersion, 7);
  assert.equal(migratedV6.hasCompletedIntroTutorial, true);

  // Auth routing, validation, account ownership, and authenticated navigation.
  assert.equal(auth.getAppDestination({ authHydrated: false, appHydrated: false, onboardingCompleted: false, tutorialCompleted: false }), 'loading');
  assert.equal(auth.getAppDestination({ authHydrated: true, appHydrated: false, onboardingCompleted: false, tutorialCompleted: false }), 'auth');
  assert.equal(auth.getAppDestination({ authHydrated: true, userId: 'user-a', appHydrated: true, onboardingCompleted: false, tutorialCompleted: false }), 'onboarding');
  assert.equal(auth.getAppDestination({ authHydrated: true, userId: 'user-a', appHydrated: true, onboardingCompleted: true, tutorialCompleted: false }), 'tutorial');
  assert.equal(auth.getAppDestination({ authHydrated: true, userId: 'user-a', appHydrated: true, onboardingCompleted: true, tutorialCompleted: true }), 'main');
  const finishedTutorial = appState.completeIntroTutorial(state());
  assert.equal(finishedTutorial.hasCompletedIntroTutorial, true);
  assert.equal(appState.completeIntroTutorial(finishedTutorial), finishedTutorial);
  assert.match(auth.validateSignUp('person@example.com', 'secret1', 'different'), /do not match/);
  assert.match(auth.getFriendlyAuthError(new Error('Network request failed')), /Couldn’t connect/);
  assert.match(auth.getFriendlyAuthError(new Error('Invalid login credentials')), /Email or password is incorrect/);
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const otherId = '22222222-2222-4222-8222-222222222222';
  assert.equal(developerAccess.isDeveloperUser(ownerId, ownerId), true);
  assert.equal(developerAccess.isDeveloperUser(otherId, ownerId), false);
  assert.equal(developerAccess.isDeveloperUser(ownerId, undefined), false);
  assert.equal(developerAccess.isDeveloperUser(null, ownerId), false);
  assert.equal(developerAccess.isDeveloperUser(ownerId, `${ownerId},not-a-uuid`), false);
  assert.equal(developerAccess.isDeveloperUser(otherId, `${ownerId}, ${otherId}`), true);
  const profileSource = fs.readFileSync(path.join(root, 'src', 'screens', 'ProfileScreen.tsx'), 'utf8');
  assert.match(profileSource, /\{showDevelopment && <View style=\{styles\.developer\}>/);
  assert(profileSource.indexOf('{showDevelopment &&') < profileSource.indexOf('<View style={styles.logoutSection}>'));
  assert.match(profileSource, /confirmLogout/);
  const ownedA = ownership.claimLocalState(state({ ownerUserId: 'user-a' }), 'user-a', () => state());
  assert.equal(ownedA.preferences.primaryGoal, preferences.primaryGoal);
  const cleanB = ownership.claimLocalState(ownedA, 'user-b', () => state({ preferences: null }));
  assert.equal(cleanB.ownerUserId, 'user-b');
  assert.equal(cleanB.preferences, null);
  assert.equal(cleanB.hasCompletedIntroTutorial, false);
  assert.equal(ownedA.ownerUserId, 'user-a');
  assert.equal(auth.shouldReconcilePersonalNotifications(), false);
  assert.equal(auth.shouldReconcilePersonalNotifications('user-a'), true);
  assert.deepEqual(appTabs.map(({ id }) => id), ['today', 'progress', 'friends', 'profile']);
  assert(appTabs.every((tab) => tab.icon && tab.activeIcon));

  // Friends V1 domain behavior and migration security contract.
  assert.equal(social.normalizeUsername('  @Jasper_S '), 'jasper_s');
  assert.equal(social.validateUsername('jasper_s'), undefined);
  assert.match(social.validateUsername('no spaces'), /letters, numbers/);
  assert.match(social.validateUsername('ab'), /3–20/);
  assert.equal(social.validateDisplayName(' Jasper Smith '), undefined);
  const pendingOutgoing = { id: 'friend-1', requesterId: 'user-a', addresseeId: 'user-b', status: 'pending', createdAt: '', updatedAt: '' };
  assert.equal(social.getRelationshipViewState(pendingOutgoing, 'user-a'), 'outgoing');
  assert.equal(social.getRelationshipViewState(pendingOutgoing, 'user-b'), 'incoming');
  assert.equal(social.getRelationshipViewState({ ...pendingOutgoing, status: 'accepted' }, 'user-b'), 'friends');
  const socialInput = social.buildSocialProgressInput(state({ daily: { date: today, completedActivityIds: ['full-body'], manualActivities: [], earnedXp: 100 }, progress: { currentStreak: 4, longestStreak: 4, history: [] } }));
  assert.equal(socialInput.level >= 1, true);
  assert.equal(socialInput.currentStreak, 4);
  assert.equal(socialInput.todayStatus, 'workout');
  assert.equal(socialInput.todayPerfect, true);
  assert.equal(socialInput.todayXp, 100);
  const snapshot = { userId: 'user-b', ...socialInput, updatedAt: '2026-08-23T18:00:00.000Z' };
  assert.equal(social.isSnapshotCurrent(snapshot, today), true);
  assert.match(social.getFriendTodayLabel(snapshot, today), /Workout Day · Perfect/);
  assert.equal(social.isSnapshotCurrent(snapshot, '2026-08-24'), false);
  assert.equal(social.getFriendTodayLabel(snapshot, '2026-08-24'), 'No current update today');
  assert.match(social.getSocialErrorMessage({ code: '23505', message: 'duplicate key' }), /already taken/);
  assert.equal(social.getSocialErrorMessage({ message: 'permission denied' }, 'Couldn’t send the request. Try again.'), 'Couldn’t send the request. Try again.');
  const friendsSql = fs.readFileSync(path.join(root, 'supabase', 'migrations', '202608260001_friends_v1.sql'), 'utf8');
  assert.match(friendsSql, /enable row level security/g);
  assert.match(friendsSql, /friendships_unique_pair unique/);
  assert.match(friendsSql, /friendships_not_self check/);
  assert.match(friendsSql, /accepted friend progress/);
  assert.match(friendsSql, /revoke insert, update, delete on public\.friendships/);

  const noon = new Date(2026, 7, 23, 12, 0, 0);
  assert.deepEqual(notifications.getNotificationPlan(state(), noon), []);
  const optedIn = state({ notificationPreferences: { ...defaultNotifications, enabled: true } });
  assert(notifications.getNotificationPlan(optedIn, noon).some((item) => item.type === 'daily'));
  const active = { ...optedIn, daily: { ...optedIn.daily, earnedXp: 35 } };
  assert(!notifications.getNotificationPlan(active, noon).some((item) => item.type === 'daily'));
  const atRisk = { ...optedIn, progress: { ...optedIn.progress, currentStreak: 5, longestStreak: 5 } };
  assert(notifications.getNotificationPlan(atRisk, noon).some((item) => item.type === 'streak'));
  assert(!notifications.getNotificationPlan(optedIn, noon).some((item) => item.type === 'streak'));
  assert(!notifications.getNotificationPlan({ ...atRisk, daily: { ...atRisk.daily, earnedXp: 30 } }, noon).some((item) => item.type === 'streak'));
  const nearPerfect = { ...optedIn, daily: { ...optedIn.daily, earnedXp: 90 } };
  assert.match(notifications.getDailyReminderContent(nearPerfect).title, /10 XP from a perfect day/);
  assert.equal(notifications.getDailyReminderContent({ ...nearPerfect, daily: { ...nearPerfect.daily, earnedXp: 100 } }), null);

  const weeklyHistory = [record('2026-08-17'), record('2026-08-18'), record('2026-08-19'), record('2026-08-20', 'light', 35), record('2026-08-21', 'light', 35), record('2026-08-22', 'light', 35)];
  const weeklyState = state({ preferences: { ...preferences, workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 3 }, progress: { currentStreak: 6, longestStreak: 6, history: weeklyHistory } });
  assert.match(notifications.getWeeklyReminderContent(weeklyState).title, /One workout left/);
  const metWeek = { ...weeklyState, daily: { ...weeklyState.daily, completedActivityIds: ['full-body'], earnedXp: 75 } };
  assert.equal(notifications.getWeeklyReminderContent(metWeek), null);
  assert.equal(notifications.getWeeklyReminderContent({ ...weeklyState, preferences: { ...preferences, workoutDaysPerWeek: 0, activeRecoveryDaysPerWeek: 0 } }), null);
  const firstPlan = notifications.getNotificationPlan(optedIn, noon);
  const changedTimePlan = notifications.getNotificationPlan({ ...optedIn, notificationPreferences: { ...optedIn.notificationPreferences, reminderHour: 20 } }, noon);
  const reconciliation = notifications.getNotificationReconciliation([{ id: 'old-daily', type: 'daily' }], changedTimePlan);
  assert(reconciliation.cancelIds.includes('old-daily'));
  assert.equal(reconciliation.schedule.filter((item) => item.type === 'daily').length, 1);
  const startupReconciliation = notifications.getNotificationReconciliation(firstPlan.map((item, index) => ({ id: `existing-${index}`, type: item.type })), firstPlan);
  assert.equal(startupReconciliation.cancelIds.length, firstPlan.length);
  assert.equal(new Set(startupReconciliation.schedule.map((item) => item.type)).size, startupReconciliation.schedule.length);
  assert.equal(notifications.canScheduleNotifications(true, 'denied'), false);
  assert.equal(notifications.canScheduleNotifications(true, 'granted'), true);

  const makeManual = (id, categoryId, durationMinutes, otherContribution, label) => manual.createManualActivity({ id, date: today, categoryId, durationMinutes, otherContribution, label, createdAt: `2026-08-23T12:00:0${id.slice(-1)}.000Z` });
  const walk20 = makeManual('manual-1', 'walk', 20);
  assert.equal(walk20.xp, 20);
  let manualState = appState.logManualActivity(state(), walk20, today);
  assert.equal(manualState.daily.earnedXp, 20);
  assert.equal(manualState.daily.manualActivities.length, 1);
  assert.equal(JSON.parse(JSON.stringify(manualState)).daily.manualActivities[0].id, 'manual-1');

  const mobility10 = makeManual('manual-2', 'mobility', 10);
  manualState = appState.logManualActivity(manualState, mobility10, today);
  assert.equal(manualState.daily.earnedXp, 30);
  assert.equal(classification.classifyDailyState(manualState.daily), 'light');
  assert.equal(streaks.getWeeklySummary(manualState.progress, manualState.daily, today).lightDays, 1);

  const strength30 = makeManual('manual-3', 'strength', 30, undefined, 'Push');
  assert.equal(strength30.xp, 45);
  manualState = appState.logManualActivity(manualState, strength30, today);
  assert.equal(classification.classifyDailyState(manualState.daily), 'workout');
  let manualWeek = streaks.getWeeklySummary(manualState.progress, manualState.daily, today);
  assert.deepEqual([manualWeek.workoutDays, manualWeek.lightDays], [1, 0]);

  manualState = appState.removeManualActivity(manualState, strength30.id, today);
  assert.equal(manualState.daily.earnedXp, 30);
  assert.equal(classification.classifyDailyState(manualState.daily), 'light');
  manualWeek = streaks.getWeeklySummary(manualState.progress, manualState.daily, today);
  assert.deepEqual([manualWeek.workoutDays, manualWeek.lightDays], [0, 1]);

  const workout45 = makeManual('manual-4', 'cardio', 45);
  const overPerfect = appState.logManualActivity(manualState, workout45, today);
  assert.equal(overPerfect.daily.earnedXp, 90);
  const run20 = makeManual('manual-5', 'run', 20);
  const overHundred = appState.logManualActivity(overPerfect, run20, today);
  assert.equal(overHundred.daily.earnedXp, 120);
  assert.equal(streaks.makeHistoryRecord(overHundred.daily).full, true);

  const thresholdBase = state({ progress: { currentStreak: 1, longestStreak: 1, history: [record('2026-08-22', 'active-unclassified', 90)] } });
  const levelCrossed = appState.logManualActivity(thresholdBase, makeManual('manual-6', 'walk', 10), today);
  assert.equal(lifetime.getLifetimeStats(levelCrossed.progress, levelCrossed.daily).lifetimeXp, 100);
  assert.equal(levels.getLevelFromLifetimeXp(100), 2);
  assert(evaluateAchievements(appState.logManualActivity(state(), strength30, today)).some((item) => item.id === 'first-step'));

  const rolled = appState.rolloverToDate(manualState, '2026-08-24');
  assert.deepEqual(rolled.daily.manualActivities, []);
  const prior = rolled.progress.history.find((item) => item.date === today);
  assert.equal(prior.earnedXp, 30);
  assert.equal(prior.activities.filter((item) => item.source === 'manual').length, 2);
  assert.equal(lifetime.getLifetimeStats(rolled.progress, rolled.daily).lifetimeXp, 30);

  assert.throws(() => makeManual('manual-7', 'other', 20));
  const otherLight = makeManual('manual-8', 'other', 45, 'light', 'Yard work');
  const otherState = appState.logManualActivity(state(), otherLight, today);
  assert.equal(otherLight.xp, 30);
  assert.equal(classification.classifyDailyState(otherState.daily), 'light');

  const atRiskManual = state({ notificationPreferences: { ...defaultNotifications, enabled: true }, progress: { currentStreak: 4, longestStreak: 4, history: [] } });
  assert(notifications.getNotificationPlan(atRiskManual, noon).some((item) => item.type === 'streak'));
  const madeActive = appState.logManualActivity(atRiskManual, strength30, today);
  assert(!notifications.getNotificationPlan(madeActive, noon).some((item) => item.type === 'streak'));

  // History/calendar: Monday-first positioning, leap years, honest date states, live current day, and snapshots.
  const mondayMonth = calendar.getMonthCalendarGrid('2026-06');
  assert.equal(mondayMonth[0], '2026-06-01');
  const sundayMonth = calendar.getMonthCalendarGrid('2026-03');
  assert.deepEqual(sundayMonth.slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(sundayMonth[6], '2026-03-01');
  assert.equal(calendar.getMonthDateKeys('2024-02').at(-1), '2024-02-29');
  assert.equal(calendar.getMonthDateKeys('2024-02').length, 29);

  const unfinishedToday = history.getCalendarDaySummary(today, undefined, today, '2026-08-01');
  assert.deepEqual([unfinishedToday.status, unfinishedToday.isSelectable], ['today-unfinished', true]);
  const futureDay = history.getCalendarDaySummary('2026-08-24', undefined, today, '2026-08-01');
  assert.deepEqual([futureDay.status, futureDay.isSelectable], ['future', false]);
  const workoutPerfect = { ...record('2026-08-17', 'workout', 110), full: true };
  const workoutDay = history.getCalendarDaySummary(workoutPerfect.date, workoutPerfect, today, '2026-08-01');
  assert.deepEqual([workoutDay.status, workoutDay.isPerfect], ['workout', true]);
  const lightPerfect = { ...record('2026-08-18', 'light', 100), full: true };
  const lightDay = history.getCalendarDaySummary(lightPerfect.date, lightPerfect, today, '2026-08-01');
  assert.deepEqual([lightDay.status, lightDay.isPerfect], ['light', true]);
  const oldActive = record('2026-08-19', 'active-unclassified', 35);
  assert.equal(history.getCalendarDaySummary(oldActive.date, oldActive, today, '2026-08-01').status, 'active-unclassified');
  assert.equal(history.getCalendarDaySummary('2026-07-31', undefined, today, '2026-08-01').status, 'pre-tracking');

  const partial = { date: '2026-08-20', earnedXp: 20, active: false, full: false, classification: 'inactive', activities: [] };
  const monthRecords = [
    ...Array.from({ length: 4 }, (_, index) => record(`2026-08-0${index + 1}`, 'workout', 60)),
    ...Array.from({ length: 3 }, (_, index) => record(`2026-08-0${index + 5}`, 'light', 35)),
    partial,
    { ...partial, date: '2026-08-21', earnedXp: 10 },
  ];
  monthRecords.slice(0, 5).forEach((item) => { item.full = true; });
  const historyState = state({ progress: { currentStreak: 0, longestStreak: 0, history: monthRecords } });
  const august = history.getMonthHistory('2026-08', historyState.progress, historyState.daily, today);
  const augustSummary = history.aggregateMonth(august);
  assert.deepEqual([augustSummary.workoutDays, augustSummary.lightDays, augustSummary.perfectDays], [4, 3, 5]);
  assert.equal(augustSummary.totalXp, 4 * 60 + 3 * 35 + 30);
  assert.equal(august.find((day) => day.date === partial.date).status, 'inactive');

  let liveHistoryState = appState.logManualActivity(state(), walk20, today);
  let liveToday = history.getMonthHistory('2026-08', liveHistoryState.progress, liveHistoryState.daily, today).find((day) => day.date === today);
  assert.equal(liveToday.record.activities.some((activity) => activity.id === walk20.id), true);
  assert.equal(liveToday.earnedXp, 20);
  liveHistoryState = appState.removeManualActivity(liveHistoryState, walk20.id, today);
  liveToday = history.getMonthHistory('2026-08', liveHistoryState.progress, liveHistoryState.daily, today).find((day) => day.date === today);
  assert.equal(liveToday.record.activities.length, 0);
  assert.equal(liveToday.earnedXp, 0);

  const basketball = makeManual('manual-history', 'sport', 45, undefined, 'Basketball');
  const withBasketball = appState.logManualActivity(state(), basketball, today);
  const basketballRollover = appState.rolloverToDate(withBasketball, '2026-08-24');
  const basketballSnapshot = basketballRollover.progress.history.find((item) => item.date === today).activities[0];
  assert.deepEqual([basketballSnapshot.title, basketballSnapshot.durationMinutes, basketballSnapshot.xp], ['Basketball', 45, 60]);
  const suggestedSnapshot = streaks.makeHistoryRecord({ date: today, completedActivityIds: ['full-body'], manualActivities: [], earnedXp: activityCatalog['full-body'].xp });
  const originalTitle = activityCatalog['full-body'].title;
  activityCatalog['full-body'].title = 'Changed catalog title';
  assert.equal(suggestedSnapshot.activities[0].title, originalTitle);
  activityCatalog['full-body'].title = originalTitle;

  const recommendationPreferences = (overrides = {}) => ({ ...preferences, activityAccess: ['gym', 'home-equipment', 'bodyweight', 'outdoors'], ...overrides });
  const recommendationContext = (overrides = {}) => ({ readiness: 'normal', preferences: recommendationPreferences(), weekly: { workoutDays: 0, lightDays: 0 }, recentHistory: [], daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 0 }, todayClassification: 'inactive', today, ...overrides });
  const order = (context) => recommendations.getRecommendedActivities(context).map((item) => item.activityId);

  const muscleReady = order(recommendationContext({ readiness: 'ready', preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 2 }) }));
  assert(['full-body', 'moderate-workout', 'bodyweight-workout'].includes(muscleReady[0]));
  const enduranceReady = order(recommendationContext({ readiness: 'ready', preferences: recommendationPreferences({ primaryGoal: 'improve-endurance', workoutDaysPerWeek: 0, activeRecoveryDaysPerWeek: 0 }) }));
  assert.equal(enduranceReady[0], 'steady-run');
  const recoveryOrder = order(recommendationContext({ readiness: 'recovery', preferences: recommendationPreferences({ workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 0 }) }));
  assert.equal(activityCatalog[recoveryOrder[0]].weeklyContribution, 'light');
  const lowOrder = order(recommendationContext({ readiness: 'low', preferences: recommendationPreferences({ workoutDaysPerWeek: 0, activeRecoveryDaysPerWeek: 0 }) }));
  assert.equal(activityCatalog[lowOrder[0]].intensity, 'low');

  const lightNeeded = order(recommendationContext({ weekly: { workoutDays: 4, lightDays: 1 }, preferences: recommendationPreferences({ workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 3 }) }));
  assert.equal(activityCatalog[lightNeeded[0]].weeklyContribution, 'light');
  const workoutNeeded = order(recommendationContext({ weekly: { workoutDays: 1, lightDays: 3 }, preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 3 }) }));
  assert.equal(activityCatalog[workoutNeeded[0]].weeklyContribution, 'workout');

  const yesterdayWorkout = record('2026-08-22', 'workout', 60);
  const recoveryAfterWorkout = order(recommendationContext({ readiness: 'recovery', recentHistory: [yesterdayWorkout] }));
  assert.equal(activityCatalog[recoveryAfterWorkout[0]].recoveryFriendly, true);
  const lightRunHistory = [record('2026-08-21', 'light', 35), record('2026-08-22', 'light', 35)];
  const workoutAfterLights = order(recommendationContext({ readiness: 'ready', recentHistory: lightRunHistory, preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 2 }), weekly: { workoutDays: 0, lightDays: 2 } }));
  assert.equal(activityCatalog[workoutAfterLights[0]].weeklyContribution, 'workout');

  const noGym = order(recommendationContext({ readiness: 'ready', preferences: recommendationPreferences({ activityAccess: ['bodyweight'] }) }));
  assert(!noGym.includes('moderate-workout') && !noGym.includes('full-body'));
  const noOutdoors = order(recommendationContext({ readiness: 'ready', preferences: recommendationPreferences({ primaryGoal: 'improve-endurance', activityAccess: ['bodyweight'] }) }));
  assert(!noOutdoors.includes('steady-run'));

  const nearActive = order(recommendationContext({ daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 20 } }));
  assert.equal(activityCatalog[nearActive[0]].xp, 10);
  const nearPerfectRecommendations = recommendations.getRecommendedActivities(recommendationContext({ daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 95 } }));
  assert.equal(nearPerfectRecommendations[0].activityId, 'quick-stretch');
  assert.equal(nearPerfectRecommendations[0].reasonCode, 'near-perfect-threshold');

  const alreadyWorkout = order(recommendationContext({ todayClassification: 'workout', weekly: { workoutDays: 1, lightDays: 0 }, preferences: recommendationPreferences({ workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 3 }) }));
  assert.equal(activityCatalog[alreadyWorkout[0]].weeklyContribution, 'light');
  const perfectRecommendations = recommendations.getRecommendedActivities(recommendationContext({ daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 105 }, todayClassification: 'workout' }));
  assert(perfectRecommendations.length > 0);
  assert.equal(perfectRecommendations[0].reasonCode, 'already-won');
  const noReadinessContext = recommendationContext({ readiness: undefined });
  const noReadinessOrder = order(noReadinessContext);
  assert(noReadinessOrder.length >= 3);
  assert.deepEqual(order(noReadinessContext), noReadinessOrder);

  const buildMuscleOrder = order(recommendationContext({ readiness: 'ready', preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 0, activeRecoveryDaysPerWeek: 0 }) }));
  assert.equal(buildMuscleOrder[0], 'full-body');
  assert.notEqual(buildMuscleOrder[0], enduranceReady[0]);
  const workoutDeficitOrder = order(recommendationContext({ preferences: recommendationPreferences({ workoutDaysPerWeek: 5, activeRecoveryDaysPerWeek: 0 }), weekly: { workoutDays: 0, lightDays: 0 } }));
  const lightDeficitOrder = order(recommendationContext({ preferences: recommendationPreferences({ workoutDaysPerWeek: 0, activeRecoveryDaysPerWeek: 5 }), weekly: { workoutDays: 0, lightDays: 0 } }));
  assert.equal(activityCatalog[workoutDeficitOrder[0]].weeklyContribution, 'workout');
  assert.equal(activityCatalog[lightDeficitOrder[0]].weeklyContribution, 'light');

  const workoutWithLightDeficit = recommendationContext({ todayClassification: 'workout', weekly: { workoutDays: 1, lightDays: 0 }, preferences: recommendationPreferences({ workoutDaysPerWeek: 1, activeRecoveryDaysPerWeek: 3 }) });
  const workoutWithoutLightDeficit = recommendationContext({ todayClassification: 'workout', weekly: { workoutDays: 1, lightDays: 0 }, preferences: recommendationPreferences({ workoutDaysPerWeek: 1, activeRecoveryDaysPerWeek: 0 }) });
  const workoutLightDeficitResults = recommendations.getRecommendedActivities(workoutWithLightDeficit);
  assert(!workoutLightDeficitResults.some((item) => item.reasonCode === 'weekly-light-needed'));
  assert.deepEqual(workoutLightDeficitResults, recommendations.getRecommendedActivities(workoutWithoutLightDeficit));

  const lightTodayWorkoutBehind = recommendations.getRecommendedActivities(recommendationContext({ todayClassification: 'light', weekly: { workoutDays: 1, lightDays: 1 }, preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 1 }) }));
  assert(lightTodayWorkoutBehind.some((item) => activityCatalog[item.activityId].weeklyContribution === 'workout' && item.reasonCode === 'weekly-workout-needed'));
  const inactiveLightBehind = recommendations.getRecommendedActivities(recommendationContext({ todayClassification: 'inactive', weekly: { workoutDays: 2, lightDays: 0 }, preferences: recommendationPreferences({ workoutDaysPerWeek: 2, activeRecoveryDaysPerWeek: 3 }) }));
  assert(inactiveLightBehind.some((item) => activityCatalog[item.activityId].weeklyContribution === 'light' && item.reasonCode === 'weekly-light-needed'));

  const workoutNearPerfect = recommendations.getRecommendedActivities(recommendationContext({ todayClassification: 'workout', daily: { date: today, completedActivityIds: [], manualActivities: [], earnedXp: 95 }, weekly: { workoutDays: 1, lightDays: 0 }, preferences: recommendationPreferences({ workoutDaysPerWeek: 1, activeRecoveryDaysPerWeek: 3 }) }));
  assert.equal(activityCatalog[workoutNearPerfect[0].activityId].weeklyContribution, 'light');
  assert.equal(workoutNearPerfect[0].reasonCode, 'near-perfect-threshold');

  const readyWorkoutBehindTodayWorkout = recommendationContext({ readiness: 'ready', todayClassification: 'workout', weekly: { workoutDays: 1, lightDays: 0 }, preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 0 }) });
  const readyWorkoutSatisfiedTodayWorkout = recommendationContext({ readiness: 'ready', todayClassification: 'workout', weekly: { workoutDays: 1, lightDays: 0 }, preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 1, activeRecoveryDaysPerWeek: 0 }) });
  const readyWorkoutResults = recommendations.getRecommendedActivities(readyWorkoutBehindTodayWorkout);
  assert(readyWorkoutResults.some((item) => activityCatalog[item.activityId].weeklyContribution === 'workout'));
  assert(!readyWorkoutResults.some((item) => item.reasonCode === 'weekly-workout-needed'));
  assert.deepEqual(readyWorkoutResults, recommendations.getRecommendedActivities(readyWorkoutSatisfiedTodayWorkout));

  assert.deepEqual([activityCatalog['bodyweight-workout'].xp, activityCatalog['moderate-workout'].xp, activityCatalog['full-body'].xp], [40, 55, 75]);
  assert.equal(appState.awardActivity(state(), 'bodyweight-workout', today).daily.earnedXp, 40);
  assert.equal(appState.awardActivity(state(), 'moderate-workout', today).daily.earnedXp, 55);
  assert.equal(appState.awardActivity(state(), 'full-body', today).daily.earnedXp, 75);
  const saturatedDaily = (earnedXp = 75) => ({ date: today, completedActivityIds: ['full-body'], manualActivities: [], earnedXp });
  const postWorkoutContext = (readiness = 'ready', earnedXp = 75) => recommendationContext({ readiness, preferences: recommendationPreferences({ primaryGoal: 'build-muscle', workoutDaysPerWeek: 4, activeRecoveryDaysPerWeek: 2 }), weekly: { workoutDays: 1, lightDays: 0 }, daily: saturatedDaily(earnedXp), todayClassification: 'workout' });
  assert.equal(recommendations.getSameDayWorkoutLoad(saturatedDaily()).substantialWorkoutCompleted, true);
  const postWorkoutReady = recommendations.getRecommendedActivities(postWorkoutContext());
  assert.equal(activityCatalog[postWorkoutReady[0].activityId].weeklyContribution, 'light');
  assert([20, 30].includes(activityCatalog[postWorkoutReady[0].activityId].xp));
  assert.equal(postWorkoutReady[0].reasonCode, 'perfect-day-progress');
  assert(postWorkoutReady.filter((item) => activityCatalog[item.activityId].weeklyContribution === 'workout').length <= 1);

  const postWorkoutRecovery = recommendations.getRecommendedActivities(postWorkoutContext('recovery'));
  assert(postWorkoutRecovery.every((item) => activityCatalog[item.activityId].weeklyContribution === 'light'));
  assert.equal(postWorkoutRecovery[0].reasonCode, 'post-workout-easy');
  const postWorkoutNormal = recommendations.getRecommendedActivities(postWorkoutContext('normal'));
  assert.equal(activityCatalog[postWorkoutNormal[0].activityId].weeklyContribution, 'light');
  const fullReadyRanking = recommendations.getRankedActivities(postWorkoutContext('ready'));
  const firstAdditionalWorkoutIndex = fullReadyRanking.findIndex((item) => activityCatalog[item.activityId].weeklyContribution === 'workout');
  assert(firstAdditionalWorkoutIndex > 0);

  const manualStrength45 = makeManual('manual-saturation', 'strength', 45);
  const manualWorkoutDaily = { date: today, completedActivityIds: [], manualActivities: [manualStrength45], earnedXp: manualStrength45.xp };
  assert.equal(recommendations.getSameDayWorkoutLoad(manualWorkoutDaily).substantialWorkoutCompleted, true);
  const manualPostWorkout = recommendations.getRecommendedActivities(recommendationContext({ readiness: 'ready', preferences: recommendationPreferences({ primaryGoal: 'build-muscle' }), weekly: { workoutDays: 1, lightDays: 0 }, daily: manualWorkoutDaily, todayClassification: 'workout' }));
  assert.equal(activityCatalog[manualPostWorkout[0].activityId].weeklyContribution, 'light');

  const stretchOnly = { date: today, completedActivityIds: ['quick-stretch'], manualActivities: [], earnedXp: 10 };
  const bodyweightOnly = { date: today, completedActivityIds: ['simple-bodyweight'], manualActivities: [], earnedXp: 15 };
  assert.equal(recommendations.getSameDayWorkoutLoad(stretchOnly).substantialWorkoutCompleted, false);
  assert.equal(recommendations.getSameDayWorkoutLoad(bodyweightOnly).substantialWorkoutCompleted, false);

  const postWorkout90 = recommendations.getRecommendedActivities(postWorkoutContext('ready', 90));
  assert.equal(postWorkout90[0].activityId, 'quick-stretch');
  assert.equal(postWorkout90[0].reasonCode, 'perfect-day-finish');
  const postWorkout95 = recommendations.getRecommendedActivities(postWorkoutContext('ready', 95));
  assert.equal(postWorkout95[0].activityId, 'quick-stretch');
  assert.equal(postWorkout95[0].reasonCode, 'perfect-day-finish');
  const postWorkoutComplete = recommendations.getRecommendedActivities(postWorkoutContext('ready', 105));
  assert(postWorkoutComplete.length > 0);
  assert.equal(postWorkoutComplete[0].reasonCode, 'already-won');
  assert(!postWorkoutReady.some((item) => item.reasonCode === 'goal-strength'));
  assert.deepEqual(recommendations.getRecommendedActivities(postWorkoutContext()), postWorkoutReady);

  console.log('Achievement assertions passed (16 scenarios, 16 catalog entries).');
  console.log('Notification assertions passed (14 scenarios).');
  console.log('Manual activity assertions passed (12 scenarios).');
  console.log('History/calendar assertions passed (16 scenarios).');
  console.log('Recommendation assertions passed (37 scenarios).');
} finally {
  if (fs.existsSync(output)) {
    const resolved = fs.realpathSync(output);
    if (path.dirname(resolved) !== root) throw new Error('Unsafe cleanup path.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
