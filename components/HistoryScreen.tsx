import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SentencePictogramStrip } from './SentencePictogramStrip';
import type { FavoriteSentenceEntry, SentenceHistoryEntry } from '../types/pictograms';
import type { SentencePictogramStripItem } from './SentencePictogramStrip';

type HistoryScreenProps = {
  actionErrorMessage?: string | null;
  emptyMessage: string;
  entries: Array<SentenceHistoryEntry | FavoriteSentenceEntry>;
  errorMessage: string | null;
  favoritingEntryId?: string | null;
  getEntryPictograms: (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => SentencePictogramStripItem[];
  isLoading: boolean;
  isEntryFavorite?: (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => boolean;
  onFavoriteEntry?: (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => void;
  onPlayEntry?: (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => void;
  onRemoveEntry?: (entryId: string) => void;
  onUseEntry?: (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => void;
  playingEntryId?: string | null;
  removingEntryId?: string | null;
  subtitle: string;
  title: string;
};

export function HistoryScreen({
  actionErrorMessage,
  emptyMessage,
  entries,
  errorMessage,
  favoritingEntryId,
  getEntryPictograms,
  isLoading,
  isEntryFavorite,
  onFavoriteEntry,
  onPlayEntry,
  onRemoveEntry,
  onUseEntry,
  playingEntryId,
  removingEntryId,
  subtitle,
  title,
}: HistoryScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>History</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {errorMessage ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Ajaloo laadimine ebaonnestus</Text>
          <Text style={styles.messageText}>{errorMessage}</Text>
        </View>
      ) : null}

      {actionErrorMessage ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Toiming ebaonnestus</Text>
          <Text style={styles.messageText}>{actionErrorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Laen lauseajalugu Supabasest...</Text>
        </View>
      ) : null}

      {!isLoading && !errorMessage && entries.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Ajalugu on tuhi</Text>
          <Text style={styles.messageText}>{emptyMessage}</Text>
        </View>
      ) : null}

      {!isLoading && !errorMessage
          ? entries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <Text style={styles.sentence}>{entry.sentence_text}</Text>
              <Text style={styles.meta}>{formatDate(entry.created_at)}</Text>
              <SentencePictogramStrip items={getEntryPictograms(entry)} />
              {onFavoriteEntry || onPlayEntry || onRemoveEntry || onUseEntry ? (
                <View style={styles.actionRow}>
                  {onUseEntry ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ava lause Speak vaates ${entry.sentence_text}`}
                      onPress={() => onUseEntry(entry)}
                      style={({ pressed }) => [
                        styles.useButton,
                        pressed ? styles.useButtonPressed : null,
                      ]}
                    >
                      <Text style={styles.useButtonText}>Use in Speak</Text>
                    </Pressable>
                  ) : null}

                  {onPlayEntry ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Play sentence ${entry.sentence_text}`}
                      disabled={playingEntryId === entry.id}
                      onPress={() => onPlayEntry(entry)}
                      style={({ pressed }) => [
                        styles.playButton,
                        playingEntryId === entry.id ? styles.playButtonDisabled : null,
                        pressed && playingEntryId !== entry.id ? styles.playButtonPressed : null,
                      ]}
                    >
                      <Text style={styles.playButtonText}>
                        {playingEntryId === entry.id ? 'Loon heli...' : 'Play sentence'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {onFavoriteEntry ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${entry.sentence_text} to favorites`}
                      disabled={favoritingEntryId === entry.id || Boolean(isEntryFavorite?.(entry))}
                      onPress={() => onFavoriteEntry(entry)}
                      style={({ pressed }) => [
                        styles.favoriteButton,
                        favoritingEntryId === entry.id || isEntryFavorite?.(entry)
                          ? styles.favoriteButtonDisabled
                          : null,
                        pressed && favoritingEntryId !== entry.id && !isEntryFavorite?.(entry)
                          ? styles.favoriteButtonPressed
                          : null,
                      ]}
                    >
                      <Text style={styles.favoriteButtonText}>
                        {favoritingEntryId === entry.id
                          ? 'Salvestan...'
                          : isEntryFavorite?.(entry)
                            ? 'Saved to favorites'
                            : 'Add to favorites'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {onRemoveEntry ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove favorite ${entry.sentence_text}`}
                      disabled={removingEntryId === entry.id}
                      onPress={() => onRemoveEntry(entry.id)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        removingEntryId === entry.id ? styles.removeButtonDisabled : null,
                        pressed && removingEntryId !== entry.id ? styles.removeButtonPressed : null,
                      ]}
                    >
                      <Text style={styles.removeButtonText}>
                        {removingEntryId === entry.id ? 'Removing...' : 'Remove'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        : null}
    </ScrollView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('et-EE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: '#fbf7ef',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    marginBottom: 22,
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
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#241c12',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 26,
    color: '#5f513d',
  },
  messageCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 18,
    marginBottom: 16,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3a2d1f',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#66563f',
  },
  card: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    padding: 18,
    marginBottom: 14,
  },
  sentence: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#2d2417',
    marginBottom: 10,
  },
  meta: {
    fontSize: 14,
    color: '#7a6a4f',
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  useButton: {
    borderRadius: 999,
    backgroundColor: '#476d86',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  useButtonPressed: {
    opacity: 0.9,
  },
  useButtonText: {
    color: '#f5fbff',
    fontSize: 14,
    fontWeight: '800',
  },
  playButton: {
    borderRadius: 999,
    backgroundColor: '#304b34',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  playButtonDisabled: {
    backgroundColor: '#a7b7a5',
  },
  playButtonPressed: {
    opacity: 0.9,
  },
  playButtonText: {
    color: '#f8f6f1',
    fontSize: 14,
    fontWeight: '800',
  },
  favoriteButton: {
    borderRadius: 999,
    backgroundColor: '#53745a',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  favoriteButtonDisabled: {
    backgroundColor: '#a7b7a5',
  },
  favoriteButtonPressed: {
    opacity: 0.9,
  },
  favoriteButtonText: {
    color: '#f8f6f1',
    fontSize: 14,
    fontWeight: '800',
  },
  removeButton: {
    borderRadius: 999,
    backgroundColor: '#8f3b2e',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  removeButtonDisabled: {
    backgroundColor: '#c7a39b',
  },
  removeButtonPressed: {
    opacity: 0.9,
  },
  removeButtonText: {
    color: '#fff8f4',
    fontSize: 14,
    fontWeight: '800',
  },
});
