import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextToPictogramsResult } from '../types/pictograms';

type CaregiverInputPanelProps = {
  errorMessage: string | null;
  inputValue: string;
  isConfigured: boolean;
  isLoading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  onChangeText: (value: string) => void;
  onConvert: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordingDurationSeconds: number;
  result: TextToPictogramsResult | null;
  transcript: string | null;
  warningMessage: string | null;
};

export function CaregiverInputPanel({
  errorMessage,
  inputValue,
  isConfigured,
  isLoading,
  isRecording,
  isTranscribing,
  onChangeText,
  onConvert,
  onStartRecording,
  onStopRecording,
  recordingDurationSeconds,
  result,
  transcript,
  warningMessage,
}: CaregiverInputPanelProps) {
  const trimmedValue = inputValue.trim();
  const buttonLabel = isLoading ? 'Otsin piktogramme...' : 'Teisenda piktogrammideks';
  const voiceButtonLabel = isTranscribing
    ? 'Transcribeerin...'
    : isRecording
      ? `Peata salvestus (${recordingDurationSeconds}s)`
      : 'Push to talk';
  const isDisabled = isLoading || isTranscribing || isRecording || !isConfigured || trimmedValue.length === 0;
  const isVoiceDisabled = isLoading || isTranscribing || !isConfigured;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>Caregiver input</Text>
      <Text style={styles.title}>Kirjuta voi raagi lause ja lasen appil valida sobivad piktogrammid.</Text>
      <Text style={styles.description}>
        Tekst ja push-to-talk kasutavad sama serveripoolset mapping-loogikat, et taiseta lauseriba automaatselt.
      </Text>

      <View style={styles.voiceRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voiceButtonLabel}
          disabled={isVoiceDisabled}
          onPress={isRecording ? onStopRecording : onStartRecording}
          style={({ pressed }) => [
            styles.voiceButton,
            isRecording ? styles.voiceButtonActive : null,
            isVoiceDisabled ? styles.buttonDisabled : null,
            pressed && !isVoiceDisabled ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.voiceButtonText}>{voiceButtonLabel}</Text>
        </Pressable>

        <Text style={styles.voiceHint}>
          Vajuta, raagi uks lause, peata, ja server teeb sellest piktogrammid.
        </Text>
      </View>

      <View style={styles.inputShell}>
        <TextInput
          multiline
          onChangeText={onChangeText}
          placeholder="Naiteks: Pane turvavoo kinni ja istu oma kohale."
          placeholderTextColor="#9c8d73"
          style={styles.input}
          textAlignVertical="top"
          value={inputValue}
        />
      </View>

      {!isConfigured ? (
        <Text style={styles.hint}>Lisa `EXPO_PUBLIC_API_BASE_URL`, et serveri mapping tootaks.</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {warningMessage ? <Text style={styles.warning}>{warningMessage}</Text> : null}
      {transcript ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Viimane transkriptsioon</Text>
          <Text style={styles.resultText}>{transcript}</Text>
        </View>
      ) : null}
      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Viimane mapping</Text>
          <Text style={styles.resultText}>{result.normalizedSentence}</Text>
          <Text style={styles.resultMeta}>
            {result.matchedPictogramSlugs.length} piktogrammi sobitati automaatselt.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        disabled={isDisabled}
        onPress={onConvert}
        style={({ pressed }) => [
          styles.button,
          isDisabled ? styles.buttonDisabled : null,
          pressed && !isDisabled ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    backgroundColor: '#fff8ee',
    padding: 18,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8d7553',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#2d2417',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6f6047',
  },
  voiceRow: {
    gap: 10,
  },
  voiceButton: {
    borderRadius: 16,
    backgroundColor: '#53745a',
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  voiceButtonActive: {
    backgroundColor: '#8d2e2e',
  },
  voiceButtonText: {
    color: '#f8f6f1',
    fontSize: 16,
    fontWeight: '800',
  },
  voiceHint: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6f6047',
  },
  inputShell: {
    minHeight: 124,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfd0b6',
    backgroundColor: '#fffdf8',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    minHeight: 100,
    fontSize: 16,
    lineHeight: 24,
    color: '#2d2417',
  },
  hint: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6f6047',
  },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9f1239',
  },
  warning: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9a6700',
  },
  resultCard: {
    borderRadius: 16,
    backgroundColor: '#f5ecdc',
    padding: 14,
    gap: 6,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7c6d55',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2d2417',
  },
  resultMeta: {
    fontSize: 13,
    color: '#6f6047',
  },
  button: {
    borderRadius: 999,
    backgroundColor: '#304b34',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a8b5a2',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#f8f6f1',
    fontSize: 16,
    fontWeight: '800',
  },
});
