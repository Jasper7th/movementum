export type AppDestination = 'loading' | 'auth' | 'onboarding' | 'tutorial' | 'main';

export function getAppDestination(input: {
  authHydrated: boolean;
  userId?: string;
  appHydrated: boolean;
  onboardingCompleted: boolean;
  tutorialCompleted: boolean;
}): AppDestination {
  if (!input.authHydrated || (input.userId && !input.appHydrated)) return 'loading';
  if (!input.userId) return 'auth';
  if (!input.onboardingCompleted) return 'onboarding';
  return input.tutorialCompleted ? 'main' : 'tutorial';
}

export function validateEmail(email: string): string | undefined {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter a valid email address.';
}

export function validatePassword(password: string): string | undefined {
  return password.length >= 6 ? undefined : 'Password must be at least 6 characters.';
}

export function validateSignUp(email: string, password: string, confirmation: string): string | undefined {
  return validateEmail(email) ?? validatePassword(password) ?? (password === confirmation ? undefined : 'Passwords do not match.');
}

export function getFriendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/network|fetch|offline/i.test(message)) return 'Couldn’t connect. Check your connection and try again.';
  if (/invalid login|invalid.*credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/already registered|already exists/i.test(message)) return 'An account already exists for that email. Try logging in instead.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  return 'Something went wrong. Please try again.';
}

export function shouldReconcilePersonalNotifications(userId?: string): boolean {
  return Boolean(userId);
}
