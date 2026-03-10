import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SavedBoard } from '../types/pictograms';

type SavedBoardsPanelProps = {
  activeChildName: string | null;
  boardName: string;
  boards: SavedBoard[];
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  deletingBoardId: string | null;
  onChangeBoardName: (value: string) => void;
  onDeleteBoard: (board: SavedBoard) => void;
  onLoadBoard: (board: SavedBoard) => void;
  onSaveBoard: () => void;
  selectedCount: number;
};

export function SavedBoardsPanel({
  activeChildName,
  boardName,
  boards,
  errorMessage,
  isLoading,
  isSaving,
  deletingBoardId,
  onChangeBoardName,
  onDeleteBoard,
  onLoadBoard,
  onSaveBoard,
  selectedCount,
}: SavedBoardsPanelProps) {
  const canSaveBoard = Boolean(activeChildName) && selectedCount > 0 && !isSaving;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Rutiinipaketid</Text>
      <Text style={styles.title}>Salvesta korduvad pildikomplektid ja lae need kohe Speak vaatesse.</Text>
      <Text style={styles.subtitle}>
        {activeChildName
          ? `${activeChildName} jaoks child-specific boardid. Sama nime salvestus uuendab olemasolevat boardi.`
          : 'Vali enne aktiivne laps, siis saad boarde salvestada ja laadida.'}
      </Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.saveRow}>
        <TextInput
          autoCapitalize="sentences"
          onChangeText={onChangeBoardName}
          placeholder="nt Bedtime või School morning"
          placeholderTextColor="#9c8d73"
          style={styles.input}
          value={boardName}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Salvesta valitud pildid boardina"
          disabled={!canSaveBoard}
          onPress={onSaveBoard}
          style={({ pressed }) => [
            styles.primaryButton,
            !canSaveBoard ? styles.buttonDisabled : null,
            pressed && canSaveBoard ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save board'}</Text>
        </Pressable>
      </View>

      <Text style={styles.saveHint}>
        {selectedCount === 0
          ? 'Vali enne piktogrammid, mida boardi salvestada.'
          : `${selectedCount} piktogrammi on praegu valmis boardi salvestamiseks.`}
      </Text>

      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Laen saved boarde...</Text>
        </View>
      ) : boards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Salvestatud boarde veel ei ole.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardRow}
        >
          {boards.map((board) => (
            <View key={board.id} style={styles.boardCard}>
              <Text style={styles.boardName}>{board.name}</Text>
              <Text style={styles.boardMeta}>{board.pictogram_ids.length} piktogrammi</Text>
              <View style={styles.boardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Lae board ${board.name}`}
                  onPress={() => onLoadBoard(board)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Load</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Kustuta board ${board.name}`}
                  disabled={deletingBoardId === board.id}
                  onPress={() => onDeleteBoard(board)}
                  style={({ pressed }) => [
                    styles.tertiaryButton,
                    deletingBoardId === board.id ? styles.buttonDisabled : null,
                    pressed && deletingBoardId !== board.id ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.tertiaryButtonText}>
                    {deletingBoardId === board.id ? 'Deleting...' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff8ee',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#eadcc5',
    padding: 22,
    gap: 14,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#8d7553',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#241c12',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: '#5f513d',
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#b4233c',
  },
  saveRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddceb2',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#2b2419',
  },
  saveHint: {
    fontSize: 15,
    color: '#7c6d55',
  },
  primaryButton: {
    minWidth: 180,
    borderRadius: 18,
    backgroundColor: '#567b59',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fffdf8',
  },
  emptyState: {
    borderRadius: 18,
    backgroundColor: '#f5ecdc',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6f6047',
  },
  boardRow: {
    gap: 14,
    paddingRight: 8,
  },
  boardCard: {
    width: 260,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e3d4ba',
    backgroundColor: '#fbf5e8',
    padding: 16,
    gap: 10,
  },
  boardName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#2d2417',
  },
  boardMeta: {
    fontSize: 15,
    color: '#7a6a4f',
  },
  boardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#e6efdb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#29401f',
  },
  tertiaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#f0e3d5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6a4935',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
