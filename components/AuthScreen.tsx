import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type AuthScreenProps = {
  errorMessage: string | null;
  infoMessage: string | null;
  isSubmitting: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
};

export function AuthScreen({
  errorMessage,
  infoMessage,
  isSubmitting,
  onSignIn,
  onSignUp,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError('Sisesta email ja parool.');
      return;
    }

    setLocalError(null);

    if (isSignUpMode) {
      await onSignUp(email, password);
      return;
    }

    await onSignIn(email, password);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Caregiver Auth</Text>
        <Text style={styles.title}>Logi sisse, et HELLO kasutaks Supabase RLS reegleid.</Text>
        <Text style={styles.subtitle}>
          See MVP kasutab emaili ja parooli. Pärast sisselogimist saad hallata ainult oma child profile andmeid.
        </Text>

        {errorMessage || localError ? (
          <Text style={styles.errorText}>{errorMessage ?? localError}</Text>
        ) : null}

        {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="caregiver@example.com"
            placeholderTextColor="#9c8d73"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#9c8d73"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSignUpMode ? 'Create caregiver account' : 'Sign in'}
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            isSubmitting ? styles.buttonDisabled : null,
            pressed && !isSubmitting ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting
              ? 'Working...'
              : isSignUpMode
                ? 'Create caregiver account'
                : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSignUpMode ? 'Switch to sign in' : 'Switch to sign up'}
          disabled={isSubmitting}
          onPress={() => {
            setIsSignUpMode((current) => !current);
            setLocalError(null);
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !isSubmitting ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            {isSignUpMode ? 'I already have an account' : 'Create a new account'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f7f2e8',
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    backgroundColor: '#fbf7ef',
    padding: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#8d7553',
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#241c12',
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    fontSize: 16,
    lineHeight: 24,
    color: '#5f513d',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f513d',
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfd0b6',
    backgroundColor: '#fff8ee',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#2d2417',
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#304b34',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f8f6f1',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#efe5d3',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#5a4d3a',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: '#a8b5a2',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  errorText: {
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 21,
    color: '#9f1239',
  },
  infoText: {
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 21,
    color: '#53745a',
  },
});
