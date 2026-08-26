# Movementum Product Context

Movementum is an iOS-first fitness habit app with one promise: **do something good for your body every day, keep the streak alive, and level yourself up.** It should make useful movement achievable on high- and low-energy days. The tone is encouraging, mature, clean, and lightly game-like—never guilt-driven or built only for serious athletes.

The user-facing product name is **Movementum**. Legacy technical compatibility identifiers intentionally remain `momentum`, including the bundle identifier, URL scheme, storage namespace, notification tags, Supabase migration/table names, and internal type/function names. The achievement **Building Momentum** and lowercase uses of “momentum” remain ordinary-language progression concepts rather than product-name references.

## Core loop

The user optionally reports readiness, sees realistic activities, logs something useful, earns daily and lifetime XP, and returns to protect a meaningful-activity streak. An **active day** preserves the streak; a **full day** reaches the daily XP goal. Those thresholds and XP rewards are configurable because balancing is not final.

## V1 scope

- Short onboarding: primary goal, current activity, access, and desired week
- Daily readiness: ready to go, normal, low energy, or recovery
- Today screen with suggested activities and manual completion
- Daily XP, configurable active-day threshold, full-day completion, and active streak
- Simple weekly progress and basic profile/progression/history
- Local data and persistence; no account or backend

## Product principles

Starting should feel easy, the next useful action should be obvious, and completion should feel satisfying. Missing a full workout is not failure. Legitimate smaller actions can combine into a good day, but repeated trivial logging must not enable unlimited XP. Sustainable consistency and visible history matter more than extreme effort. A bad day does not need to become a zero day: **you can still win today.**

## Future, not V1

Detailed lifting history, sets/reps/weight, personal records, HealthKit, Apple Watch, widgets, social features, challenges, nutrition, AI coaching, avatars, cosmetics, large achievement systems, subscriptions, and premium plans. Strength, endurance, mobility, and consistency attributes may be added later; the current activity categories leave room for them without implementing an RPG system now.

## Current reversible assumptions

- The prototype daily target is 100 XP and active-day threshold is 30 XP.
- Activity rewards are centrally configured and mocked.
- Readiness is optional and immediately alters the remaining local activity recommendations.
- Completed activity IDs form a persisted daily ledger: changing readiness or restarting preserves earned XP and prevents equivalent activities from being awarded twice.
- The shell keeps a simple local tab switcher; a routing library remains postponed until navigation complexity justifies it.

## Implemented V1 behavior

Onboarding collects one primary goal, planned workout days, planned light/recovery days, one or more available ways to move, and a non-judgmental starting activity level. Weekly workout and lighter-day targets cannot total more than seven. No account or personal health measurements are requested.

Movementum persists one versioned root object locally with AsyncStorage. The current schema is version `5`; it contains onboarding preferences, the current dated daily state, long-term progress history, achievements, notification preferences, and manual activity instances. Earlier known schemas migrate forward without resetting onboarding or progression. Existing active history with unavailable activity detail remains active-but-unclassified rather than being guessed. Unknown schema versions start fresh; future schema changes should add an explicit migration before increasing the version.

Daily state uses a device-local `YYYY-MM-DD` calendar key. On launch, state from an earlier date is summarized into history and replaced with a fresh day, so readiness and completed activities never carry into tomorrow. Earned XP is stored directly and is not capped at 100; 100 is the full/perfect-day threshold, while the separately configurable active-day threshold preserves the active streak.

The V1 current streak counts consecutive active calendar dates. If today is not active yet, the calculation ends at yesterday, so a streak through yesterday remains visible during an unfinished today. Once today reaches the active threshold it joins the streak. Missing a complete calendar date breaks the streak. Perfect days always count as active days. No freezes, grace tokens, or recovery rules exist yet.

Day history is retained without an arbitrary age cap because compact daily summaries are part of the user’s long-term investment. Current and longest streaks, active days this week, full days this week, today’s XP, and the planned weekly rhythm are displayed from persisted data. Recommendations remain readiness-first; onboarding access preferences are stored for later deterministic filtering when catalog activities have genuine access requirements.

## Weekly plan classification

Activities centrally declare a weekly contribution of workout, light, or neutral. A calendar day earns no successful weekly-plan type until it reaches the active-day XP threshold. An active day with at least one workout activity is a **Workout Day**. Otherwise, an active day with light/recovery activity is a **Light / Recovery Day**. An active day without either known contribution remains active-but-unclassified. Inactive days do not count toward either weekly target.

Workout classification takes precedence over light classification, so one date can count toward at most one weekly target. A workout day can include walking or mobility without also consuming a light-day slot. Active status, perfect status, and weekly day type remain independent: for example, a light day can also be perfect and preserve the streak.

Weekly counts use the device-local calendar week from Monday through Sunday. Today is upserted by date for live counts and later replaces the same history date at rollover, preventing double counting. Actual counts are not capped at planned targets; exceeding a target is valid progress. Plans with a zero target clearly mark that category as outside the current plan.

Users can edit all onboarding goals and preferences from Profile. Saving updates current targets and future planning immediately without clearing today, resetting streaks, or retroactively changing historical day classifications.

Completed activities remain editable during the current day. The dedicated `✓ Done` control removes that activity ID, recalculates XP from the remaining completed ledger, and refreshes active, perfect, classification, weekly, and streak state. XP cannot fall below zero, and an unchecked activity returns to Ways to move only when it belongs to the current readiness recommendations.

## Long-term progression

**Lifetime XP** is derived from all date-keyed historical day-summary XP plus the current day, with the current date upserted rather than appended. Current-day activity therefore counts immediately, unchecking an activity reduces Lifetime XP, and rollover moves the same XP from current state to history without duplicating it. Lifetime XP is not stored as a second mutable counter.

Every user begins at **Level 1 with 0 Lifetime XP**. Levels represent accumulated legitimate effort and do not unlock functionality yet. Current-day reversals may lower the displayed level when removed XP crosses a threshold; ordinary day rollover never lowers it because Lifetime XP is unchanged.

Level balancing is provisional. Level 1→2 costs 100 XP, and each following level costs 50 XP more than the previous one: 150, 200, 250, and so on. The curve is centrally configured by a base cost and linear increment so it can be rebalanced without UI changes. The app exposes pure calculations for current level, cumulative threshold, XP within the level, next-level requirement, remaining XP, and percentage progress.

Lifetime statistics are also derived through date upsert and include Lifetime XP, total active days, workout days, light/recovery days, perfect days, unclassified active days, and longest streak. Today counts live and replaces the same date after rollover. Migrated active-unclassified history contributes to active-day and XP totals without being falsely assigned to workout or light totals.

Crossing one or multiple levels during the current session shows a brief banner for the final level reached. The same reached level is announced at most once per session. No confetti, sound, titles, cosmetics, or level-gated features are implemented.

The Today screen keeps long-term progression visible in a compact green level strip above the daily XP card. It derives live level progress from Lifetime XP and opens the detailed Progress tab when tapped; the visually separate treatment distinguishes accumulated effort from the orange daily goal.

## V1 achievements

Achievements recognize accumulated behavior without awarding XP or changing levels, streaks, or any other progression input. Unlock records store a stable typed ID and an ISO timestamp, displayed in the device's local date format. An unlock is permanent even if current-day activity is later unchecked, a streak is lost, or a current level drops. Schema version `3` adds this unlock ledger; schema 1 and 2 migrations preserve preferences, daily state, history, and streak data while initializing achievements safely. Hydration reconciles already-qualified achievements without replaying unlock feedback.

The initial catalog contains 16 visible achievements. Consistency includes First Step (1 active day), Building Momentum (7-day streak), Locked In (30-day streak), and Keep Showing Up (100 active days). Training includes Getting Stronger (10 workout days), Routine Built (50), and Century Club (100). Recovery / Balance includes Recovery Counts (1 light day), Balanced Week, and Full Week. Progress includes Moving Up (Level 5), Double Digits (Level 10), Veteran (Level 25), and Five Figures (10,000 Lifetime XP). Resilience includes Back At It and Still Moving. This V1 catalog and its presentation may evolve.

Balanced Week requires both weekly targets to be greater than zero and both to be met or exceeded in the current Monday–Sunday week. Full Week requires every non-zero planned category to be met; one zero target is allowed, while a zero-plus-zero plan is ineligible. Both may unlock from the same week and can unlock before Sunday. Weekly achievements use the current week's current targets when evaluated. Editing preferences does not rescan or rewrite past weeks using new targets.

Back At It requires a prior active date, at least one full calendar-date gap after it, and a newly active current day. Still Moving requires an active yesterday and a current Light / Recovery Day that extends that streak; neither can unlock on a first-ever active day. Locked measurable achievements expose centralized progress, while binary achievements remain visibly locked until earned. Progress previews recent unlocks first, then the closest measurable locked achievements; the full collection stays in catalog order by category. If one state change unlocks several achievements, one summarized banner lists their names instead of stacking interruptions.

## V1 local notifications

Movementum reminders are optional and should protect goals the user already values rather than create generic exercise pressure. Notification permission is never requested during onboarding or ordinary startup. Existing users migrate with reminders off; iOS permission is requested only when the Profile master switch is enabled. A denial leaves the master setting off and is explained without repeated prompts. The OS remains the source of truth for permission status.

Schema version `4` persists the master setting, daily, streak, and weekly-plan toggles, plus a selected daily reminder hour. Daily reminder choices are 6:00, 7:00, 8:00, or 9:00 PM, with 7:00 PM as the default. The fixed late streak reminder is 9:00 PM. The weekly-plan reminder is Sunday at 5:00 PM within the existing local Monday–Sunday week.

Scheduling is local-only and uses one-shot local calendar times. On hydration, foreground return, activity or preference changes, Movementum queries OS permission, cancels all tagged Movementum schedules, and recreates only the currently eligible future reminders. This prevents duplicates and keeps copy aligned with the latest state known to the app. Local notification content cannot run Movementum logic at delivery time, so content reflects the last reconciliation; opening or changing state reschedules it. If the relevant time has already passed, that reminder is not recreated for the current day.

The daily slot is used below the active threshold or, once active, when no more than the configured near-goal XP remains before a Perfect Day. It is absent after a Perfect Day and while active but not near perfect. The 9:00 PM streak reminder requires a streak entering today and an unfinished Active Day, and is cancelled once the active threshold is reached. A selected 9:00 PM daily reminder is omitted when the more important streak reminder would duplicate it. Sunday weekly copy reflects remaining workout and light/recovery targets and is absent when all non-zero targets are met or both targets are zero. Notifications never advertise achievement proximity, award XP, or change progression.

At most one daily/near-perfect reminder, one late streak reminder, and one weekly reminder are scheduled for their applicable times. Foreground system banners and sounds are suppressed to avoid duplicating in-app feedback. Tapping any Movementum notification returns the simple shell to Today; deeper routing is postponed. Profile includes a development-only-style 10-second local test action, which should be tested after backgrounding the app.

V1 does not request Expo push tokens, configure APNs/FCM credentials, contact Expo Push Service, or use a backend. True remote push and server-driven delivery remain future development-build/backend capabilities.

## V1 manual activity logging

Today includes a secondary **Log activity** action for useful movement that is not one of Movementum's suggestions. A logged activity is a persisted instance with its own stable ID, local date, category, weekly contribution, selected duration, awarded XP, optional short label, and creation time. It enters the same completed ledger and the same derived daily, weekly, lifetime, level, achievement, and notification calculations as suggested activity. Removing it from Completed today immediately reverses its XP and all derived current-day effects; there is no separate mutable XP counter.

The centrally defined categories are Strength, Cardio, Walk, Run, Mobility / stretching, Sport, and Other. Strength, Cardio, Run, and Sport contribute as workouts. Walk and Mobility / stretching contribute as light/recovery movement. Other requires the user to choose workout or light/recovery so classification is explicit rather than inferred from a label.

Duration choices are 5, 10, 15, 20, 30, 45, 60, 75, and 90+ minutes. XP balancing is provisional and uses centrally configured, tapering tables rather than a duration multiplier. Light activity awards 5, 10, 15, 20, 25, 30, then at most 35 XP. Workout activity awards 10, 15, 20, 30, 45, 60, 70, then at most 80 XP. This rewards legitimate duration while limiting easy XP inflation and remains simple to rebalance.

Manual activities appear distinctly in Completed today and are reversible but not editable in V1; correcting an entry means removing and logging it again. The prototype does not attempt duplicate detection and trusts the user's honest self-report. On day rollover, compact full activity detail is copied into that date's summary before the current-day instances reset, preserving the foundation for a future history/calendar detail view. Migrated older summaries keep empty detail when the original activities are unavailable.

## V1 History calendar

History makes accumulated consistency visible without adding another primary tab. It opens from Progress and presents one local calendar month at a time, Monday first. Navigation is bounded by the earliest stored tracking date and the current month, so users do not browse meaningless pre-Movementum or future months. History is view-only: current-day corrections still happen through Today, and completed historical dates cannot be edited or reclassified.

Calendar color represents the primary day type: dark green for Workout, light green for Light / Recovery, muted green for older active-unclassified records, and neutral for past inactive dates. Perfect Day remains independent and appears as a secondary orange dot. Today receives a distinct outline and remains **in progress**, not missed, until the calendar day ends or it qualifies as Active. Future days and dates before tracking began are subdued and non-interactive.

The tracking period begins on the earliest locally persisted current-day or history date. This is a reversible prototype fallback because onboarding completion time was not stored in earlier schemas. Past unqualified dates on or after that date are displayed as inactive; dates before it remain neutral rather than becoming a field of artificial failures.

Selecting Today or a historical date shows its XP, day type, Perfect status, activity snapshots, and achievements whose unlock timestamps fall on that local date. Suggested snapshots retain their display name, duration, XP, and contribution at rollover. Manual snapshots additionally retain category, optional label, and creation time. Catalog changes therefore do not rewrite saved history. Older migrated summaries without activity snapshots continue to show accurate day-level XP and classification with a concise unavailable-detail message rather than fabricated activities.

The displayed month's compact summary counts Active, Workout, Light / Recovery, and Perfect days and sums all persisted XP. Monthly XP includes partial-XP inactive days because that legitimate effort still contributes to Lifetime XP. Future days and pre-tracking dates do not affect the summary. There is no separate monthly streak, historical-level reconstruction, chart, yearly heatmap, or calendar editing in V1.

## V1 personalized recommendations

Ways to move uses a deterministic, local rule-based ranking engine—not AI, machine learning, or a backend. It ranks the small suggested activity catalog from the same state every time, excludes completed activities, and uses stable catalog order to resolve score ties. Readiness remains a primary intensity signal: Ready supports substantial movement, Normal stays balanced, Low Energy favors manageable low-intensity choices, and Recovery strongly favors recovery-friendly light movement. Recovery never elevates a hard workout to the primary suggestion merely to close a weekly deficit. No readiness selection uses a moderate balanced default rather than assuming high energy.

Activity definitions centrally declare intensity, goal affinities, access options, recovery friendliness, duration, XP, and weekly contribution. Build Muscle raises strength/bodyweight options; Improve Endurance raises walking/running; Get More Active raises low-friction movement; Feel Healthier keeps a broad balance. Access metadata is intentionally small: broadly available movement needs no equipment, bodyweight sessions require that preference, equipment workouts accept Gym or Home Equipment, and the current Steady Run requires Outdoors.

Current provisional suggested-workout rewards give Bodyweight Workout 40 XP, Moderate Workout 55 XP, and Full-body Workout 75 XP. A substantial workout therefore supplies most—but usually not all—of the 100 XP Perfect Day, leaving useful room for walking, mobility, stretching, or other lighter movement. Manual activity XP continues to use its separate tapering curve.

Weekly targets influence ranking through both remaining target days and gentle Monday–Sunday pacing. Early-week zeroes receive less urgency than the same deficit late in the week. A deficit only boosts an activity when that activity could still change today's weekly contribution: an inactive or unclassified date can become either type, and a Light date can upgrade to Workout, but a Workout date cannot also advance the Light target or add a second Workout date. Activities remain eligible through other signals even when their weekly contribution is already settled. Recent history considers consecutive calendar days immediately before today: recent workouts raise lighter options when readiness is not Ready, while several light days raise workouts when that target remains and readiness is Ready or Normal. These are balance cues, not mandatory rest rules or medical advice.

Daily completion proximity can override broad goal affinity. Within 20 XP of Active, or within the existing near-Perfect window, the smallest eligible legitimate activity that closes the gap receives the strongest boost. After a Perfect Day, suggestions remain available with explicitly optional copy. The first card alone receives a **Recommended for today** marker and one truthful typed reason; raw scores are never shown or persisted.

Once Today is a Workout Day and completed workout activity reaches the provisional same-day load threshold, recommendations enter a saturated post-workout phase. Catalog workout load is duration weighted by its centralized intensity metadata; manual workout-contribution entries add their duration directly. The current threshold is 25 load points, so Full-body, Moderate, Bodyweight Workout, meaningful Run, and substantial manual Strength/Cardio/Run/Sport entries qualify. Light-contribution movement such as Quick Stretch or Simple Bodyweight does not qualify merely because it has recovery or strength flavor.

Workout saturation means today's meaningful training objective is satisfied. Light follow-up movement receives a configurable boost, additional moderate/high workouts receive readiness-sensitive penalties, and Build Muscle affinity is reduced to one quarter of its normal bonus. Ready to Go keeps additional workouts eligible lower in the complete ranking but no longer interprets readiness as a request for another session. Normal, Low Energy, and Recovery apply progressively stronger additional-workout penalties.

Post-workout Perfect progress considers the entire remaining XP gap, not only the near-goal window. Eligible light activities are ranked by how efficiently their XP approaches the target, without requiring an exact match or encouraging large overshoots. Typed copy distinguishes easy post-workout movement, progress toward Perfect, finishing Perfect, already having trained, and already winning the day. The existing weekly contribution eligibility remains independent: a Workout date cannot claim another workout or a light weekly-plan day.

Scoring weights are provisional and centralized. The current model combines readiness fit, a recovery-specific workout penalty, goal affinity, weekly remaining days, elapsed-week pace, recent-type balance, same-type-today reduction, gap-closing efficiency, and same-day workout saturation. The exact values are product-balancing inputs, not claims about exercise science. Manual activity logging remains separate and always available.

## V1 accounts and local data ownership

Movementum uses Supabase email/password authentication as an identity boundary. Startup hydrates the persisted Supabase session before choosing a route, then hydrates that user's local dataset before showing onboarding or the main tabs. Logged-out users see Welcome/Create Account/Log In/Forgot Password and never see the app tabs. Email confirmation and in-app password-reset links retain the stable `momentum://` compatibility scheme. Authentication errors are translated into concise product copy; raw provider errors are not used as UI.

Fitness data is deliberately still local-only. Schema version 6 adds `ownerUserId` and an explicit local-date `trackingStartedAt`. Existing unowned prototype state is claimed by the first authenticated user without deletion. Once claimed, another account on the same phone receives a separate clean dataset and cannot see it; returning to the original account restores its preferences, Today state, history, achievements, and notification preferences. Logout cancels pending Movementum notifications but preserves that user's local dataset. Login/hydration reconciles notifications only for the authenticated owner.

For migrated onboarded data, `trackingStartedAt` is reconstructed from the earliest persisted daily/history date. New onboarding stores the completion date explicitly. Supabase cloud sync, fitness-data tables, cross-device history, social login, profile photos, and account deletion are postponed. The tab shell now includes familiar icons while keeping Today, Progress, and Profile unchanged.

## Post-onboarding explanation

The authenticated first-run sequence is Auth → the existing preference onboarding → a three-step **How Movementum works** explanation → Today. The explanation is intentionally brief and teaches three separate ideas: both workout and light/recovery days count; XP can build a 100 XP Perfect Day without making Perfect the minimum for success; and XP, streaks, levels, and achievements turn consistent effort into long-term progress.

Tutorial completion is persisted separately from authentication and onboarding as `hasCompletedIntroTutorial`. Fresh per-user datasets begin with it false, and completing **Start Movementum** sets it true before the tab shell appears. Schema version 7 migrates already-onboarded prototype users to true so they are not unexpectedly interrupted; incomplete-onboarding datasets remain false. Because this field lives inside the existing user-owned local dataset, a second account does not inherit another account's tutorial state.

Profile includes **How Movementum works**, which reuses the same three screens in revisit mode. Revisit mode ends with **Done**, returns to Profile, and does not rewrite onboarding or tutorial completion. Full local-data reset leaves Supabase authentication intact but recreates the dataset with onboarding and tutorial incomplete. The bottom tabs are hidden during both first-run and revisit presentations.

## Friends V1

Friends adds a fourth authenticated bottom tab—Today, Progress, Friends, Profile—to make existing Movementum effort lightly social without introducing a feed. Authenticated users may create a separate public social profile with a normalized, case-insensitively unique username and a non-unique display name. Usernames are lowercase, 3–20 characters, and limited to letters, numbers, and underscores; display names are trimmed and 1–40 characters. Email is auth identity only and is never shown publicly. Existing accounts are not forced through setup: Today, Progress, and Profile keep working, while Friends prompts for setup if no social profile exists. Profile also supports creating or editing that identity.

The cloud model contains only `social_profiles`, one canonical `friendships` row per unordered user pair, and `social_progress`. A request is pending until its addressee accepts or declines it. Reverse and duplicate requests resolve to the same database-constrained pair; self-friending is rejected. Addressees alone may accept or decline, requesters may cancel, and either accepted participant may remove the friendship after confirmation. Relationship mutations use authenticated database functions rather than unrestricted client writes.

All social tables use Row Level Security. Any authenticated user can search limited public identity by username, but friendship rows are participant-only. A social-progress snapshot is readable only by its owner and accepted friends. Non-friends never receive level, streak, XP, or Today status. The snapshot contains only derived level, current streak, current local date, Today classification, Perfect status, Today XP, daily target, and update time. It never includes email, individual activities, history/calendar, health data, goals, notification settings, or private preferences.

Snapshots are a presentation/sync layer derived from Movementum's existing local source of truth. Relevant state changes are debounced before an upsert, profile creation triggers an initial reconcile, and failures remain non-blocking. Friend cards distinguish Workout, Light / Recovery, Active, inactive, and Perfect states. A snapshot from a prior local date is shown as stale rather than presenting yesterday's status as live. Friends refreshes on entry, pull-to-refresh, and relationship mutations without real-time polling.

Friends V1 deliberately excludes feeds, direct messages, comments, likes, leaderboards, public bios, avatar upload, detailed fitness-history sync, and push notifications for social events. Cheers are postponed to keep request/privacy/security work focused. Blocking and reporting are required before a production social launch even though V1 has no public user-generated text beyond display identity.

## Still unresolved

- Whether a meaningful long walk should eventually be workout-classified based on duration; the current 20-minute walk remains light.
- Whether manual logging should later support arbitrary durations, editing, duplicate warnings, or category-specific XP curves; V1 deliberately uses predefined durations and two contribution curves.
