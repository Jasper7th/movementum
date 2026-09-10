# Movementum

Movementum is an iOS fitness application designed to make daily activity more consistent through personalized recommendations, streaks, achievements, progress tracking, and social features.

Built with React Native, TypeScript, Supabase, and Expo/EAS.

## Screenshots

<p align="center">
  <img src="./screenshots/today.png" width="220" />
  <img src="./screenshots/progress.png" width="220" />
  <img src="./screenshots/friends.png" width="220" />
</p>

## Features

- Personalized daily workout and recovery recommendations
- XP, levels, streaks, and achievement tracking
- User authentication and onboarding
- Persistent user profiles and application state
- Friend requests and social connections
- Progress and activity tracking
- Physical iOS device testing
- EAS development and production builds

## Engineering Highlights

- Designed stateful application workflows for activity completion, XP progression, streaks, and achievements
- Integrated Supabase authentication and social data with Row Level Security
- Built reusable React Native components and separated application logic into domain, service, storage, and UI layers
- Debugged authentication, onboarding, persistence, and device-specific issues during physical iOS testing
- Configured iOS provisioning and TestFlight-ready production builds using Expo Application Services

## Windows setup

Install Node.js 20.19 or newer (Expo SDK 54 minimum) and npm (included with Node.js). EAS CLI and an Apple Developer Program membership are required when you are ready to create and sign the physical-iPhone development build. Android Studio is optional for an Android emulator.

From PowerShell in this folder:

```powershell
npm install
Copy-Item .env.example .env
# Fill in your Supabase project URL and public anon/publishable key in .env
npm run start:dev
```

## Supabase authentication setup

Create a Supabase project, enable the Email provider under **Authentication → Providers**, and copy the Project URL plus public anon/publishable key from the project API settings into `.env`. Never place a service-role key in this app. Add these redirect URLs under **Authentication → URL Configuration**:

```text
momentum://auth/callback
momentum://auth/reset-password
```

Email confirmation is supported: with confirmation enabled, Create Account asks the user to check email; with it disabled, Supabase starts the session immediately. Password reset uses the retained `momentum://auth/reset-password` compatibility link and lets the user choose a new password in Movementum.

The new custom scheme requires a fresh EAS development build before email links can open the standalone app. For EAS builds, add both public values to each environment you actually use (development now; preview/production later), either in the EAS dashboard or with:

```powershell
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_PUBLIC_KEY" --visibility plaintext
eas build --platform ios --profile development
```

`EXPO_PUBLIC_` values are compiled into the client and are not secrets; Supabase authorization must rely on its public key and Row Level Security. This increment stores fitness data only in device-local AsyncStorage—Supabase stores identity/session data, not Movementum history.

### Friends V1 database setup

Friends needs the documented cloud social schema in addition to Supabase Auth. In the Supabase dashboard, open **SQL Editor → New query**, paste the complete contents of [`supabase/migrations/202608260001_friends_v1.sql`](supabase/migrations/202608260001_friends_v1.sql), and select **Run** once. The migration creates `social_profiles`, `friendships`, and `social_progress`, plus constraints, indexes, authenticated RPC operations, grants, and Row Level Security policies. Do not disable RLS and do not place a service-role key in the app.

If this project is linked to the Supabase CLI instead, the same checked-in migration can be applied through your normal `supabase db push` workflow. No additional Supabase dashboard setting is required beyond the existing Email Auth configuration. Test request/accept flows with two real authenticated accounts; each account must choose a social profile from Friends before it can be found.

`social_profiles` is searchable by authenticated users and contains only display name and normalized username identity. Relationship rows are readable only by their participants. `social_progress` is readable only by its owner and accepted friends. Detailed activities, history, goals, preferences, email, and health information remain device-local and are never written by Friends V1.

After the EAS development build is installed, open the standalone Movementum app and connect it to this development server. Your computer and phone should normally be on the same network. If LAN discovery is blocked, try `npx expo start --dev-client --tunnel`.

For JavaScript-only testing with the current App Store version of Expo Go, run `npm run start:go` and scan its QR code. The project intentionally remains on SDK 54 for this compatibility path.

On first launch, complete the four short onboarding steps. Movementum then persists preferences, today’s readiness/completions/XP, and recent streak history locally on that device. Use **Profile → Development → Reset local data** to clear the prototype and show onboarding again.

Other commands:

```powershell
npm run android
npm run web
npm run typecheck
npm run test:logic
```

`npm run ios` requires macOS and Xcode for the iOS Simulator. On Windows, EAS Build can produce the signed iOS development build in the cloud without generating native folders in this repository. The `development` profile in `eas.json` targets registered physical devices with internal distribution.

## Friends-and-family TestFlight beta

Production builds use the EAS `production` environment, remote app-version management, and automatic iOS build-number increments. Configure the public client values before building:

```powershell
npx eas-cli@latest login
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY" --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_DEVELOPER_USER_IDS --value "YOUR_SUPABASE_USER_UUID" --visibility plaintext
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Find the developer UUID in **Supabase Dashboard → Authentication → Users**, open your own account, and copy its User UID. The allowlist is a comma-separated list of UUIDs; a missing or malformed value hides all developer controls. Do not use email addresses and never add a service-role key. Regular beta users cannot see **Profile → Development**, while allowlisted users retain the test-notification and local-data reset controls.

The production build contains its JavaScript and assets and runs without Metro. Verify that `momentum://auth/callback` and `momentum://auth/reset-password` remain in Supabase **Authentication → URL Configuration** before testing account confirmation and password reset from TestFlight. Fitness history remains local to each installation, so deleting the app or moving to another device does not restore that history in this beta.

## Structure

```text
src/
  application/  auth/session and local app-state hydration
  navigation/   app shell and navigation composition
  components/   reusable UI pieces
  config/       frequently tuned product values
  data/         editable activity catalog and recommendations
  domain/       models and framework-free business rules
  screens/      route-level UI
  services/     Supabase and notification integration boundaries
  storage/      versioned, per-user AsyncStorage adapter
  ui/           visual tokens
```

XP calculation, lifetime statistics, level progression, day classification, Monday–Sunday weekly counting, streak rules, local-date rollover, progress guidance, and readiness recommendation rules are kept out of React components. Persisted data is schema-versioned and namespaced by Supabase user ID. Daily state resets by device-local calendar date rather than elapsed hours, history is retained without an age cap, and XP may exceed the 100 XP completion threshold. Lifetime XP and levels are derived from date-upserted history plus today, so rollover cannot double-count XP.
