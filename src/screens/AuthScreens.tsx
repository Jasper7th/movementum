import { forwardRef, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../application/AuthProvider';
import { validateEmail, validatePassword, validateSignUp } from '../domain/auth';
import { colors, controlHeights, layout, radii, spacing, typography } from '../ui/theme';

type AuthRoute = 'welcome' | 'create' | 'login' | 'forgot';

export function AuthFlow() {
  const [route, setRoute] = useState<AuthRoute>('welcome');
  if (route === 'welcome') return <Welcome onCreate={() => setRoute('create')} onLogin={() => setRoute('login')} />;
  return <CredentialsScreen mode={route} onBack={() => setRoute(route === 'forgot' ? 'login' : 'welcome')} onForgot={() => setRoute('forgot')} />;
}

function Welcome({ onCreate, onLogin }: { onCreate: () => void; onLogin: () => void }) {
  return <SafeAreaView style={styles.safe}><View style={styles.welcome}><Text style={styles.brand}>MOVEMENTUM</Text><View><Text style={styles.hero}>Build a body-positive streak that lasts.</Text><Text style={styles.subtitle}>Small, legitimate movement counts. Show up today and keep building.</Text></View><View style={styles.actions}><PrimaryButton label="Create account" onPress={onCreate} /><SecondaryButton label="Log in" onPress={onLogin} /></View></View></SafeAreaView>;
}

function CredentialsScreen({ mode, onBack, onForgot }: { mode: Exclude<AuthRoute, 'welcome'>; onBack: () => void; onForgot: () => void }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const isCreate = mode === 'create';
  const isForgot = mode === 'forgot';
  const title = isCreate ? 'Create your account' : isForgot ? 'Reset your password' : 'Welcome back';

  const submit = async () => {
    const validation = isCreate ? validateSignUp(email, password, confirmation) : isForgot ? validateEmail(email) : validateEmail(email) ?? validatePassword(password);
    if (validation) { setMessage(validation); return; }
    setBusy(true); setMessage(undefined);
    const result = isCreate ? await auth.signUp(email, password) : isForgot ? await auth.sendPasswordReset(email) : await auth.signIn(email, password);
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    if (isForgot) { setSuccess(true); setMessage('Check your email for a secure password-reset link.'); }
    if (isCreate && result.requiresEmailConfirmation) { setSuccess(true); setMessage('Check your email to confirm your account, then return to Movementum.'); }
  };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}><ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled"><Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ Back</Text></Pressable><Text style={styles.eyebrow}>MOVEMENTUM</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{isCreate ? 'Your progress stays yours on this device.' : isForgot ? 'We’ll email you a link to choose a new password.' : 'Continue building the progress you started.'}</Text><View style={styles.fields}><Field autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="Email" onChangeText={setEmail} onSubmitEditing={() => isForgot ? void submit() : passwordRef.current?.focus()} returnKeyType={isForgot ? 'done' : 'next'} value={email} />{!isForgot && <><Field autoCapitalize="none" autoComplete={isCreate ? 'new-password' : 'current-password'} label="Password" onChangeText={setPassword} onSubmitEditing={() => isCreate ? confirmationRef.current?.focus() : void submit()} ref={passwordRef} returnKeyType={isCreate ? 'next' : 'done'} secureTextEntry value={password} />{isCreate && <Field autoCapitalize="none" autoComplete="new-password" label="Confirm password" onChangeText={setConfirmation} onSubmitEditing={() => void submit()} ref={confirmationRef} returnKeyType="done" secureTextEntry value={confirmation} />}</>}</View>{message && <Text accessibilityLiveRegion="polite" style={success ? styles.success : styles.error}>{message}</Text>}<PrimaryButton disabled={busy || success} label={isCreate ? 'Create account' : isForgot ? 'Send reset link' : 'Log in'} loading={busy} onPress={() => void submit()} />{mode === 'login' && <Pressable accessibilityRole="button" onPress={onForgot} style={styles.link}><Text style={styles.linkText}>Forgot password?</Text></Pressable>}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

export function ResetPasswordScreen() {
  const auth = useAuth();
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [message, setMessage] = useState<string>(); const [busy, setBusy] = useState(false);
  const submit = async () => { const error = validatePassword(password) ?? (password === confirmation ? undefined : 'Passwords do not match.'); if (error) { setMessage(error); return; } setBusy(true); const result = await auth.updatePassword(password); setBusy(false); if (!result.ok) setMessage(result.error); else auth.finishPasswordRecovery(); };
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}><View style={styles.form}><Text style={styles.eyebrow}>MOVEMENTUM</Text><Text style={styles.title}>Choose a new password</Text><Field label="New password" onChangeText={setPassword} secureTextEntry value={password} /><Field label="Confirm password" onChangeText={setConfirmation} secureTextEntry value={confirmation} />{message && <Text style={styles.error}>{message}</Text>}<PrimaryButton label="Save password" loading={busy} onPress={() => void submit()} /></View></KeyboardAvoidingView></SafeAreaView>;
}

const Field = forwardRef<TextInput, React.ComponentProps<typeof TextInput> & { label: string }>(function Field(props, ref) { const { label, ...input } = props; return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...input} ref={ref} placeholderTextColor={colors.textMuted} style={styles.input} /></View>; });
function PrimaryButton({ label, loading, disabled, onPress }: { label: string; loading?: boolean; disabled?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.primary, (pressed || disabled) && styles.pressed]}>{loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{label}</Text>}</Pressable>; }
function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, welcome: { flex: 1, justifyContent: 'space-between', paddingBottom: 42, paddingHorizontal: layout.pageHorizontal, paddingTop: 28 }, brand: { color: colors.accent, ...typography.pageEyebrow }, hero: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1.2, lineHeight: 44 }, subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.md }, actions: { gap: spacing.sm }, form: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: layout.pageHorizontal, paddingTop: 22 }, back: { alignSelf: 'flex-start', marginBottom: 28, minHeight: 36, justifyContent: 'center' }, backText: { color: colors.accent, fontSize: 15, fontWeight: '800' }, eyebrow: { color: colors.accent, ...typography.pageEyebrow }, title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 8 }, fields: { gap: 13, marginBottom: spacing.md, marginTop: 28 }, field: { gap: 6, marginTop: 12 }, fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800' }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.small, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: 14 }, primary: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.small, justifyContent: 'center', minHeight: controlHeights.primary, marginTop: spacing.md }, primaryText: { color: colors.surface, fontSize: 16, fontWeight: '800' }, secondary: { alignItems: 'center', borderColor: colors.accent, borderRadius: radii.small, borderWidth: 1, justifyContent: 'center', minHeight: controlHeights.primary }, secondaryText: { color: colors.accent, fontSize: 16, fontWeight: '800' }, pressed: { opacity: 0.62 }, error: { color: '#9B4339', fontSize: 13, lineHeight: 19, marginTop: spacing.sm }, success: { color: colors.accent, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: spacing.sm }, link: { alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm }, linkText: { color: colors.accent, fontSize: 14, fontWeight: '800' } });
