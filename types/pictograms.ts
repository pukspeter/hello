export type PictogramCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type Pictogram = {
  created_by_user_id: string | null;
  id: string;
  category_id: string | null;
  image_url: string | null;
  is_custom: boolean;
  is_enabled: boolean;
  label_en: string | null;
  label_et: string;
  label_ru: string | null;
  resolved_symbol_set_code: string;
  sort_order: number;
};

export type SelectedPictogramItem = {
  id: string;
  pictogramId: string;
  categoryId: string | null;
  displayLabel: string;
  imageUrl: string | null;
  label: string;
  order: number;
};

export type SentenceGenerationInput = {
  pictograms: Array<{
    id: string;
    label: string;
    categoryId: string | null;
    order: number;
  }>;
};

export type SentenceGenerationResult = {
  plainText: string;
  sentence: string;
};

export type PictogramMatchCandidate = {
  categoryName: string | null;
  id: string;
  label: string;
  slug: string;
};

export type TextToPictogramsInput = {
  availablePictograms: PictogramMatchCandidate[];
  text: string;
};

export type TextToPictogramsResult = {
  matchedPictogramSlugs: string[];
  normalizedSentence: string;
  plainText: string;
};

export type VoiceToPictogramsInput = {
  audioBase64: string;
  availablePictograms: PictogramMatchCandidate[];
  mimeType: string;
};

export type VoiceToPictogramsResult = TextToPictogramsResult & {
  transcript: string;
};

export type SpeechSynthesisResult = {
  audioUrl: string;
};

export type PictogramImageUploadInput = {
  base64Data: string;
  fileName: string;
  mimeType: string;
  pictogramId: string;
};

export type PictogramImageUploadResult = {
  imageUrl: string;
  pictogramId: string;
};

export type SentenceHistoryEntry = {
  id: string;
  child_profile_id: string | null;
  created_at: string;
  plain_text: string | null;
  pictogram_ids: string[];
  sentence_text: string;
};

export type FavoriteSentenceEntry = {
  id: string;
  child_profile_id: string | null;
  created_at: string;
  plain_text: string | null;
  pictogram_ids: string[];
  sentence_text: string;
};

export type ChildProfile = {
  id: string;
  created_at: string;
  name: string;
  notes: string | null;
  preferred_language: string;
  preferred_symbol_set_code: string;
  user_id: string | null;
};

export type ChildProfileInput = {
  name: string;
  notes: string | null;
  preferred_language: string;
  preferred_symbol_set_code?: string;
};

export type CustomPictogramInput = {
  categoryId: string | null;
  labelEt: string;
};

export type ChildPictogramSetting = {
  child_profile_id: string;
  custom_label_et: string | null;
  is_enabled: boolean;
  is_favorite: boolean;
  pictogram_id: string;
  updated_at: string;
};

export type SavedBoard = {
  child_profile_id: string;
  created_at: string;
  id: string;
  name: string;
  pictogram_ids: string[];
  updated_at: string;
};
