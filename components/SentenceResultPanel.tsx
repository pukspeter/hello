import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isCompactMobile = width <= 480;
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
    <View style={[styles.wrapper, isCompactMobile ? styles.wrapperCompact : null]}>
      <Text style={[styles.meta, isCompactMobile ? styles.metaCompact : null]}>
        AI payload valmis: {payloadCount} piktogrammi
      </Text>

      <View style={[styles.card, isCompactMobile ? styles.cardCompact : null]}>
        <View style={[styles.textBlock, isCompactMobile ? styles.textBlockCompact : null]}>
          <Text style={[styles.title, isCompactMobile ? styles.titleCompact : null]}>
            Loodud lause
          </Text>
          <Text style={[styles.sentence, isCompactMobile ? styles.sentenceCompact : null]}>
            {result?.sentence ?? 'Vali piktogrammid ja loo esimene eestikeelne lause.'}
          </Text>
        </View>
        {errorMessage ? (
          <Text style={[styles.error, isCompactMobile ? styles.feedbackTextCompact : null]}>
            {errorMessage}
          </Text>
        ) : null}
        {audioErrorMessage ? (
          <Text style={[styles.error, isCompactMobile ? styles.feedbackTextCompact : null]}>
            {audioErrorMessage}
          </Text>
        ) : null}
        {!isConfigured ? (
          <Text style={[styles.hint, isCompactMobile ? styles.feedbackTextCompact : null]}>
            Lisa `EXPO_PUBLIC_API_BASE_URL`, et lause API tootaks.
          </Text>
        ) : null}
        {result && !isAudioConfigured ? (
          <Text style={[styles.hint, isCompactMobile ? styles.feedbackTextCompact : null]}>
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
            isCompactMobile ? styles.buttonCompact : null,
            isDisabled ? styles.buttonDisabled : null,
            pressed && !isDisabled ? styles.buttonPressed : null,
          ]}
        >
          <Text style={[styles.buttonText, isCompactMobile ? styles.buttonTextCompact : null]}>
            {buttonLabel}
          </Text>
        </Pressable>

        {result ? (
          <View style={[styles.actionRow, isCompactMobile ? styles.actionRowCompact : null]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favoriteButtonLabel}
              disabled={isSavingFavorite || isFavorite}
              onPress={onFavorite}
              style={({ pressed }) => [
                styles.secondaryButton,
                isCompactMobile ? styles.secondaryButtonCompact : null,
                isSavingFavorite || isFavorite ? styles.buttonDisabled : null,
                pressed && !isSavingFavorite && !isFavorite ? styles.buttonPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isCompactMobile ? styles.secondaryButtonTextCompact : null,
                ]}
              >
                {favoriteButtonLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playButtonLabel}
              disabled={!canPlay || isGeneratingAudio}
              onPress={onPlaySentence}
              style={({ pressed }) => [
                styles.secondaryButton,
                isCompactMobile ? styles.secondaryButtonCompact : null,
                !canPlay || isGeneratingAudio ? styles.buttonDisabled : null,
                pressed && canPlay && !isGeneratingAudio ? styles.buttonPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isCompactMobile ? styles.secondaryButtonTextCompact : null,
                ]}
              >
                {playButtonLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play again"
              disabled={!hasAudio || isGeneratingAudio}
              onPress={onPlayAgain}
              style={({ pressed }) => [
                styles.secondaryButton,
                isCompactMobile ? styles.secondaryButtonCompact : null,
                !hasAudio || isGeneratingAudio ? styles.buttonDisabled : null,
                pressed && hasAudio && !isGeneratingAudio ? styles.buttonPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isCompactMobile ? styles.secondaryButtonTextCompact : null,
                ]}
              >
                Play again
              </Text>
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
    paddingTop: 2,
    backgroundColor: '#f7f2e8',
  },
  wrapperCompact: {
    paddingTop: 0,
  },
  meta: {
    fontSize: 10,
    color: '#88755c',
    marginBottom: 4,
  },
  metaCompact: {
    marginBottom: 2,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    backgroundColor: '#fff8ee',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  cardCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  textBlock: {
    gap: 4,
  },
  textBlockCompact: {
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2d2417',
  },
  titleCompact: {
    fontSize: 14,
  },
  sentence: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2d2417',
    minHeight: 0,
  },
  sentenceCompact: {
    fontSize: 15,
    lineHeight: 20,
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
  feedbackTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    borderRadius: 999,
    backgroundColor: '#304b34',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonCompact: {
    paddingVertical: 12,
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
  buttonTextCompact: {
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  actionRowCompact: {
    gap: 8,
    marginTop: 0,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#53745a',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonCompact: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#f8f6f1',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonTextCompact: {
    fontSize: 14,
  },
});
