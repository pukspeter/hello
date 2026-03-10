import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SearchField } from './SearchField';
import { pictogramMatchesSearch } from '../lib/pictogram-search';
import type {
  ChildPictogramSetting,
  ChildProfile,
  CustomPictogramInput,
  Pictogram,
  PictogramCategory,
  SentenceHistoryEntry,
} from '../types/pictograms';

type CaregiverScreenProps = {
  activeChildProfile: ChildProfile | null;
  categories: PictogramCategory[];
  customPictogramError: string | null;
  historyEntries: SentenceHistoryEntry[];
  imageUploadError: string | null;
  isCreatingPictogram: boolean;
  isLoadingSettings: boolean;
  onCreateCustomPictogram: (input: CustomPictogramInput) => Promise<void>;
  onChangeSearchQuery: (value: string) => void;
  onSaveCustomLabel: (pictogramId: string, customLabelEt: string | null) => Promise<void>;
  onToggleEnabled: (pictogramId: string) => void;
  onToggleFavorite: (pictogramId: string) => void;
  onUploadImage: (pictogram: Pictogram) => void;
  pictograms: Pictogram[];
  searchQuery: string;
  settings: ChildPictogramSetting[];
  settingsError: string | null;
  uploadingPictogramId: string | null;
  updatingPictogramId: string | null;
};

export function CaregiverScreen({
  activeChildProfile,
  categories,
  customPictogramError,
  historyEntries,
  imageUploadError,
  isCreatingPictogram,
  isLoadingSettings,
  onCreateCustomPictogram,
  onChangeSearchQuery,
  onSaveCustomLabel,
  onToggleEnabled,
  onToggleFavorite,
  onUploadImage,
  pictograms,
  searchQuery,
  settings,
  settingsError,
  uploadingPictogramId,
  updatingPictogramId,
}: CaregiverScreenProps) {
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [draftLabel, setDraftLabel] = useState('');
  const [editingPictogramId, setEditingPictogramId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const settingsByPictogramId = new Map(
    settings.map((setting) => [setting.pictogram_id, setting])
  );
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const favoritePictograms = pictograms.filter(
    (pictogram) => settingsByPictogramId.get(pictogram.id)?.is_favorite
  );
  const filteredPictograms = pictograms.filter((pictogram) =>
    pictogramMatchesSearch(
      {
        categoryName: pictogram.category_id
          ? categoryNameById.get(pictogram.category_id) ?? null
          : null,
        displayLabel:
          settingsByPictogramId.get(pictogram.id)?.custom_label_et?.trim() || pictogram.label_et,
        pictogram,
      },
      searchQuery
    )
  );

  useEffect(() => {
    setDraftCategoryId((current) => current ?? categories[0]?.id ?? null);
  }, [categories]);

  const handleCreateCustomPictogram = async () => {
    if (!draftLabel.trim()) {
      setFormError('Custom piktogrammi nimi on kohustuslik.');
      return;
    }

    setFormError(null);

    await onCreateCustomPictogram({
      categoryId: draftCategoryId,
      labelEt: draftLabel,
    });

    setDraftLabel('');
  };

  const openLabelEditor = (pictogram: Pictogram) => {
    const currentCustomLabel = settingsByPictogramId.get(pictogram.id)?.custom_label_et?.trim() ?? '';
    setEditingPictogramId(pictogram.id);
    setLabelDraft(currentCustomLabel || pictogram.label_et);
  };

  const closeLabelEditor = () => {
    setEditingPictogramId(null);
    setLabelDraft('');
  };

  const handleSaveCustomLabel = async (pictogram: Pictogram) => {
    const nextValue = labelDraft.trim();
    const currentBaseLabel = pictogram.label_et.trim();
    await onSaveCustomLabel(pictogram.id, nextValue && nextValue !== currentBaseLabel ? nextValue : null);
    closeLabelEditor();
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Caregiver</Text>
        <Text style={styles.title}>Lihtne haldusvaade aktiivsele lapsele.</Text>
        <Text style={styles.subtitle}>
          Enabled pildid, lapse lemmikpildid ja viimased laused uhes vaates.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Aktiivne laps</Text>
        <Text style={styles.summaryName}>{activeChildProfile?.name ?? 'Valimata'}</Text>
        <Text style={styles.summaryText}>
          Muudatused rakenduvad valitud profiilile kohe.
        </Text>
      </View>

      {settingsError ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Haldusandmete laadimine ebaonnestus</Text>
          <Text style={styles.messageText}>{settingsError}</Text>
        </View>
      ) : null}

      {imageUploadError ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Pildi upload ebaonnestus</Text>
          <Text style={styles.messageText}>{imageUploadError}</Text>
        </View>
      ) : null}

      <View style={styles.createCard}>
        <Text style={styles.createTitle}>Loo custom piktogramm</Text>
        <Text style={styles.createSubtitle}>
          Uue sona jaoks lisa nimi ja kategooria. Olemasolevatele sonadele saad pildi panna otse all oleva rea `Upload image` nupuga.
        </Text>

        {customPictogramError || formError ? (
          <Text style={styles.errorText}>{customPictogramError ?? formError}</Text>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Piktogrammi nimi</Text>
          <TextInput
            autoCapitalize="sentences"
            onChangeText={setDraftLabel}
            placeholder="nt joomine"
            placeholderTextColor="#9c8d73"
            style={styles.input}
            value={draftLabel}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Kategooria</Text>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`Vali kategooria ${category.name}`}
                onPress={() => setDraftCategoryId(category.id)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  draftCategoryId === category.id ? styles.categoryChipActive : null,
                  pressed ? styles.categoryChipPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    draftCategoryId === category.id ? styles.categoryChipTextActive : null,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Loo custom piktogramm"
          disabled={isCreatingPictogram}
          onPress={handleCreateCustomPictogram}
          style={({ pressed }) => [
            styles.createButton,
            isCreatingPictogram ? styles.actionButtonDisabled : null,
            pressed && !isCreatingPictogram ? styles.actionButtonPressed : null,
          ]}
        >
          <Text style={styles.actionButtonText}>
            {isCreatingPictogram ? 'Creating...' : 'Create custom pictogram'}
          </Text>
        </Pressable>
      </View>

      <SectionTitle
        meta={`${favoritePictograms.length} lemmikut`}
        title="Lapse lemmikpiktogrammid"
      />

      {favoritePictograms.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Lemmikpiltide valik on veel tuhi.</Text>
        </View>
      ) : (
        <View style={styles.favoriteRow}>
          {favoritePictograms.map((pictogram) => (
            <View key={pictogram.id} style={styles.favoriteChip}>
              <Text style={styles.favoriteChipText}>
                {settingsByPictogramId.get(pictogram.id)?.custom_label_et?.trim() || pictogram.label_et}
              </Text>
            </View>
          ))}
        </View>
      )}

      <SectionTitle
        meta={isLoadingSettings ? 'Laadimine...' : `${filteredPictograms.length} piktogrammi`}
        title="Piktogrammide seaded"
      />

      <SearchField
        onChangeText={onChangeSearchQuery}
        placeholder="Otsi nime, oma teksti voi kategooria jargi"
        value={searchQuery}
      />

      {filteredPictograms.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Otsing ei leidnud Caregiver vaates vasteid.</Text>
        </View>
      ) : null}

      {filteredPictograms.map((pictogram) => {
        const setting = settingsByPictogramId.get(pictogram.id);
        const customLabel = setting?.custom_label_et?.trim() ?? '';
        const isEnabled = setting?.is_enabled ?? true;
        const isFavorite = setting?.is_favorite ?? false;
        const isEditingLabel = editingPictogramId === pictogram.id;
        const isUpdating = updatingPictogramId === pictogram.id;
        const isUploading = uploadingPictogramId === pictogram.id;
        const currentLabel = customLabel || pictogram.label_et;

        return (
          <View key={pictogram.id} style={styles.pictogramCard}>
            <View style={styles.pictogramHeader}>
              <View style={styles.pictogramIdentity}>
                <View style={styles.imagePreview}>
                  {pictogram.image_url ? (
                    <Image source={{ uri: pictogram.image_url }} style={styles.imagePreviewAsset} />
                  ) : (
                    <Text style={styles.imagePreviewPlaceholder}>
                      {pictogram.label_et.slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.pictogramTextBlock}>
                  <Text style={styles.pictogramName}>{currentLabel}</Text>
                  {customLabel ? (
                    <Text style={styles.pictogramMetaSecondary}>Baassona: {pictogram.label_et}</Text>
                  ) : null}
                  <Text style={styles.pictogramMeta}>{isEnabled ? 'Enabled' : 'Disabled'}</Text>
                  <Text style={styles.pictogramMetaSecondary}>
                    {pictogram.is_custom ? 'Custom pictogram' : 'Base pictogram'}
                    {' · '}
                    {pictogram.image_url ? 'Image attached' : 'No image yet'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isEnabled ? 'Disable' : 'Enable'} ${currentLabel}`}
                disabled={isUpdating || isUploading}
                onPress={() => onToggleEnabled(pictogram.id)}
                style={({ pressed }) => [
                  styles.actionButton,
                  isUpdating || isUploading ? styles.actionButtonDisabled : null,
                  pressed && !isUpdating && !isUploading ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={styles.actionButtonText}>
                  {isUpdating ? 'Saving...' : isEnabled ? 'Disable' : 'Enable'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isFavorite ? 'Remove favorite' : 'Set favorite'} ${currentLabel}`}
                disabled={isUpdating || isUploading}
                onPress={() => onToggleFavorite(pictogram.id)}
                style={({ pressed }) => [
                  styles.actionButtonSecondary,
                  isUpdating || isUploading ? styles.actionButtonDisabled : null,
                  pressed && !isUpdating && !isUploading ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={styles.actionButtonText}>
                  {isFavorite ? 'Unset favorite' : 'Set favorite'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isEditingLabel ? 'Sulge tekstiredaktor' : 'Muuda teksti'} ${currentLabel}`}
                disabled={isUpdating || isUploading}
                onPress={() => (isEditingLabel ? closeLabelEditor() : openLabelEditor(pictogram))}
                style={({ pressed }) => [
                  styles.actionButtonSecondary,
                  isUpdating || isUploading ? styles.actionButtonDisabled : null,
                  pressed && !isUpdating && !isUploading ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={styles.actionButtonText}>
                  {isEditingLabel ? 'Close editor' : 'Edit text'}
                </Text>
              </Pressable>
            </View>

            {isEditingLabel ? (
              <View style={styles.editCard}>
                <Text style={styles.label}>Naita lapsele seda sona</Text>
                <TextInput
                  autoCapitalize="sentences"
                  onChangeText={setLabelDraft}
                  placeholder={pictogram.label_et}
                  placeholderTextColor="#9c8d73"
                  style={styles.input}
                  value={labelDraft}
                />
                <View style={styles.editActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Salvesta uus tekst ${currentLabel}`}
                    disabled={isUpdating || isUploading}
                    onPress={() => handleSaveCustomLabel(pictogram)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      isUpdating || isUploading ? styles.actionButtonDisabled : null,
                      pressed && !isUpdating && !isUploading ? styles.actionButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>{isUpdating ? 'Saving...' : 'Save text'}</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Taasta algne tekst ${pictogram.label_et}`}
                    disabled={isUpdating || isUploading}
                    onPress={async () => {
                      await onSaveCustomLabel(pictogram.id, null);
                      closeLabelEditor();
                    }}
                    style={({ pressed }) => [
                      styles.actionButtonTertiary,
                      isUpdating || isUploading ? styles.actionButtonDisabled : null,
                      pressed && !isUpdating && !isUploading ? styles.actionButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>Reset</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.uploadRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${pictogram.image_url ? 'Update image' : 'Upload image'} ${currentLabel}`}
                disabled={isUpdating || isUploading}
                onPress={() => onUploadImage(pictogram)}
                style={({ pressed }) => [
                  styles.actionButtonTertiary,
                  isUpdating || isUploading ? styles.actionButtonDisabled : null,
                  pressed && !isUpdating && !isUploading ? styles.actionButtonPressed : null,
                ]}
              >
                <Text style={styles.actionButtonText}>
                  {isUploading
                    ? 'Uploading...'
                    : pictogram.image_url
                      ? 'Update image'
                      : 'Upload image'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <SectionTitle
        meta={`${historyEntries.length} kirjet`}
        title="Viimane lauseajalugu"
      />

      {historyEntries.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Ajalugu puudub selle lapse jaoks.</Text>
        </View>
      ) : (
        historyEntries.slice(0, 5).map((entry) => (
          <View key={entry.id} style={styles.historyCard}>
            <Text style={styles.historySentence}>{entry.sentence_text}</Text>
            <Text style={styles.historyMeta}>{formatDate(entry.created_at)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SectionTitle({ meta, title }: { meta: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
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
    backgroundColor: '#f7f2e8',
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
  summaryCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7a6a4f',
    marginBottom: 8,
  },
  summaryName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2d2417',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#66563f',
  },
  createCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    padding: 18,
    marginBottom: 18,
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d2417',
    marginBottom: 6,
  },
  createSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#66563f',
    marginBottom: 14,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9f1239',
    marginBottom: 12,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    borderRadius: 999,
    backgroundColor: '#efe5d3',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: '#304b34',
  },
  categoryChipPressed: {
    opacity: 0.88,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5a4d3a',
  },
  categoryChipTextActive: {
    color: '#f8f6f1',
  },
  createButton: {
    borderRadius: 999,
    backgroundColor: '#304b34',
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c2418',
  },
  sectionMeta: {
    fontSize: 14,
    color: '#7a6a4f',
  },
  favoriteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  favoriteChip: {
    borderRadius: 999,
    backgroundColor: '#e9f2df',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  favoriteChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#23301a',
  },
  editCard: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#fff8ee',
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 14,
    marginTop: 12,
  },
  editActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  pictogramCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    padding: 18,
    marginBottom: 12,
  },
  pictogramHeader: {
    gap: 14,
    marginBottom: 12,
  },
  pictogramIdentity: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#f4ebd8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewAsset: {
    width: '100%',
    height: '100%',
  },
  imagePreviewPlaceholder: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7d5d2f',
    letterSpacing: 1,
  },
  pictogramTextBlock: {
    flex: 1,
    gap: 4,
  },
  pictogramName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d2417',
  },
  pictogramMeta: {
    fontSize: 14,
    color: '#7a6a4f',
  },
  pictogramMetaSecondary: {
    fontSize: 14,
    color: '#53745a',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadRow: {
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#8f3b2e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#53745a',
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonTertiary: {
    borderRadius: 999,
    backgroundColor: '#476d86',
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#c7b8ab',
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonText: {
    color: '#fff8f4',
    fontSize: 14,
    fontWeight: '800',
  },
  historyCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    padding: 18,
    marginBottom: 12,
  },
  historySentence: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: '#2d2417',
    marginBottom: 8,
  },
  historyMeta: {
    fontSize: 14,
    color: '#7a6a4f',
  },
});
