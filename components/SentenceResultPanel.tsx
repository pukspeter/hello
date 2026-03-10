import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SentenceGenerationResult } from '../types/pictograms';

type SentenceResultPanelProps = {
  audioErrorMessage: string | null;
  errorMessage: string | null;
  hasAudio: boolean;
  isFavorite: boolean;
  isAudioConfigured: boolean;
  isGeneratingAudio: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isSavingFavorite: boolean;
  onFavorite: () => void;
  onGenerate: () => void;
  onPlayAgain: () => void;
  onPlaySentence: () => void;
  payloadCount: number;
  result: SentenceGenerationResult | null;
};

export function SentenceResultPanel({
  audioErrorMessage,
  errorMessage,
  hasAudio,
  isFavorite,
  isAudioConfigured,
  isGeneratingAudio,
  isConfigured,
  isLoading,
  isSavingFavorite,
  onFavorite,
  onGenerate,
  onPlayAgain,
  onPlaySentence,
  payloadCount,
  result,
}: SentenceResultPanelProps) {
  const buttonLabel = isLoading ? 'Genereerin...' : 'Genereeri lause';
  const isDisabled = isLoading || payloadCount === 0 || !isConfigured;
  const canPlay = Boolean(result?.sentence) && isAudioConfigured;
  const playButtonLabel = isGeneratingAudio ? 'Loon heli...' : 'Play sentence';
  const favoriteButtonLabel = isSavingFavorite
    ? 'Salvestan...'
    : isFavorite
      ? 'Saved to favorites'
      : 'Add to favorites';

  return (
    <View style={styles.wrapper}>
      <Text style={styles.meta}>AI payload valmis: {payloadCount} piktogrammi</Text>

      <View style={styles.card}>
        <Text style={styles.title}>Loodud lause</Text>
        <Text style={styles.sentence}>
          {result?.sentence ?? 'Vali piktogrammid ja loo esimene eestikeelne lause.'}
        </Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {audioErrorMessage ? <Text style={styles.error}>{audioErrorMessage}</Text> : null}
        {!isConfigured ? (
          <Text style={styles.hint}>
            Lisa `EXPO_PUBLIC_API_BASE_URL`, et lause API tootaks.
          </Text>
        ) : null}
        {result && !isAudioConfigured ? (
          <Text style={styles.hint}>
            Lisa serverisse Google Cloud TTS credentials, et eestikeelne playback tootaks.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          disabled={isDisabled}
          onPress={onGenerate}
          style={({ pressed }) => [
            styles.button,
            isDisabled ? styles.buttonDisabled : null,
            pressed && !isDisabled ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>

        {result ? (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favoriteButtonLabel}
              disabled={isSavingFavorite || isFavorite}
              onPress={onFavorite}
              style={({ pressed }) => [
                styles.secondaryButton,
                isSavingFavorite || isFavorite ? styles.buttonDisabled : null,
                pressed && !isSavingFavorite && !isFavorite ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{favoriteButtonLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playButtonLabel}
              disabled={!canPlay || isGeneratingAudio}
              onPress={onPlaySentence}
              style={({ pressed }) => [
                styles.secondaryButton,
                !canPlay || isGeneratingAudio ? styles.buttonDisabled : null,
                pressed && canPlay && !isGeneratingAudio ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{playButtonLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play again"
              disabled={!hasAudio || isGeneratingAudio}
              onPress={onPlayAgain}
              style={({ pressed }) => [
                styles.secondaryButton,
                !hasAudio || isGeneratingAudio ? styles.buttonDisabled : null,
                pressed && hasAudio && !isGeneratingAudio ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Play again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: '#f7f2e8',
  },
  meta: {
    fontSize: 12,
    color: '#88755c',
    marginBottom: 8,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    backgroundColor: '#fff8ee',
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2d2417',
  },
  sentence: {
    fontSize: 20,
    lineHeight: 30,
    color: '#2d2417',
    minHeight: 60,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#53745a',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#f8f6f1',
    fontSize: 15,
    fontWeight: '800',
  },
});
