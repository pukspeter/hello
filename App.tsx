import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AuthScreen } from './components/AuthScreen';
import { CaregiverScreen } from './components/CaregiverScreen';
import { CaregiverInputPanel } from './components/CaregiverInputPanel';
import { ChildProfileSelector } from './components/ChildProfileSelector';
import { CategorySection } from './components/CategorySection';
import { FavoritePictogramRow } from './components/FavoritePictogramRow';
import { HistoryScreen } from './components/HistoryScreen';
import { PictogramCard } from './components/PictogramCard';
import { ProfileScreen } from './components/ProfileScreen';
import { SavedBoardsPanel } from './components/SavedBoardsPanel';
import { SearchField } from './components/SearchField';
import { SentenceResultPanel } from './components/SentenceResultPanel';
import { SentenceBar } from './components/SentenceBar';
import type { SentencePictogramStripItem } from './components/SentencePictogramStrip';
import {
  generateSentence,
  isSentenceApiConfigured,
  matchTextToPictograms,
  synthesizeSpeech,
  transcribeAndMatchVoiceToPictograms,
  uploadPictogramImage,
} from './lib/api';
import {
  getCurrentSession,
  signInCaregiver,
  signOutCaregiver,
  signUpCaregiver,
  subscribeToAuthChanges,
} from './lib/auth';
import {
  createChildProfile,
  fetchChildProfiles,
  updateChildProfile,
} from './lib/child-profiles';
import {
  fetchChildPictogramSettings,
  saveChildPictogramSetting,
} from './lib/child-pictogram-settings';
import {
  deleteFavoriteSentence,
  fetchFavoriteSentences,
  saveFavoriteSentence,
  saveFavoriteSentenceFromHistoryEntry,
} from './lib/favorites';
import { getPictogramDisplayLabel } from './lib/pictogram-labels';
import { pictogramMatchesSearch } from './lib/pictogram-search';
import { toPictogramSlug } from './lib/pictogram-slugs';
import { fetchSentenceHistory, saveSentenceHistoryEntry } from './lib/history';
import { createCustomPictogram, fetchPictogramCategories, fetchPictograms } from './lib/pictograms';
import { deleteSavedBoard, fetchSavedBoards, saveSavedBoard } from './lib/saved-boards';
import {
  createSelectedPictogramItem,
  reorderSelectedPictograms,
  toSentenceGenerationInput,
} from './lib/selection';
import { useSpeechPlayback } from './lib/useSpeechPlayback';
import { useVoiceRecorder } from './lib/useVoiceRecorder';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type {
  Pictogram,
  PictogramCategory,
  FavoriteSentenceEntry,
  PictogramMatchCandidate,
  SavedBoard,
  SelectedPictogramItem,
  ChildProfile,
  ChildProfileInput,
  ChildPictogramSetting,
  CustomPictogramInput,
  SentenceHistoryEntry,
  SentenceGenerationResult,
  TextToPictogramsResult,
  VoiceToPictogramsResult,
} from './types/pictograms';

const FALLBACK_CATEGORY_BY_LABEL: Record<string, string> = {
  abi: 'Soovid',
  'head und': 'Igapaev',
  hommikuring: 'Kool',
  juua: 'Toit',
  tahan: 'Soovid',
  'ei taha': 'Soovid',
  veel: 'Soovid',
  jah: 'Soovid',
  ei: 'Soovid',
  paus: 'Soovid',
  valjasoit: 'Tegevused',
  kupsetama: 'Tegevused',
  kool: 'Kool',
  uhislaulmine: 'Kool',
  koju: 'Igapaev',
  magama: 'Igapaev',
  hambapesu: 'Igapaev',
  pidzaama: 'Igapaev',
  voodisse: 'Igapaev',
  sooma: 'Toit',
  syya: 'Toit',
  mangima: 'Tegevused',
  ema: 'Inimesed',
  isa: 'Inimesed',
  vanaema: 'Inimesed',
  opetaja: 'Inimesed',
  roomus: 'Tunded',
  kurb: 'Tunded',
  vihane: 'Tunded',
  rahulik: 'Tunded',
  valus: 'Tunded',
};

const ALL_CATEGORY_ID = 'all';
const SPEAK_TAB = 'speak';
const HISTORY_TAB = 'history';
const FAVORITES_TAB = 'favorites';
const PROFILE_TAB = 'profile';
const CAREGIVER_TAB = 'caregiver';
const MAX_PICTOGRAM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const SHOW_SAVED_BOARDS = false;

function formatAuthErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials')
  ) {
    return 'Vale email voi parool.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Kinnita oma email ja proovi siis uuesti sisse logida.';
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already been registered')
  ) {
    return 'Selle emailiga konto on juba olemas. Proovi sisse logida.';
  }

  if (normalized.includes('password should be at least')) {
    return 'Parool peab olema vahemalt 6 tahemarki.';
  }

  if (
    normalized.includes('unable to validate email address') ||
    normalized.includes('invalid email')
  ) {
    return 'Sisesta korrektne emaili aadress.';
  }

  if (normalized.includes('email rate limit exceeded')) {
    return 'Proovi mone minuti parast uuesti.';
  }

  if (normalized.includes('signup is disabled')) {
    return 'Konto loomine on hetkel valja lulitatud.';
  }

  return message;
}

function shouldPreferPictogramForSlug(next: Pictogram, current: Pictogram) {
  if (next.is_custom !== current.is_custom) {
    return current.is_custom;
  }

  if (next.sort_order !== current.sort_order) {
    return next.sort_order < current.sort_order;
  }

  return next.id.localeCompare(current.id, 'en') < 0;
}

export default function App() {
  const { width } = useWindowDimensions();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeChildProfileId, setActiveChildProfileId] = useState<string | null>(null);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [childPictogramSettings, setChildPictogramSettings] = useState<ChildPictogramSetting[]>([]);
  const [categories, setCategories] = useState<PictogramCategory[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<FavoriteSentenceEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<SentenceHistoryEntry[]>([]);
  const [pictograms, setPictograms] = useState<Pictogram[]>([]);
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedPictogramItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>(SPEAK_TAB);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_CATEGORY_ID);
  const [boardName, setBoardName] = useState('');
  const [caregiverInputText, setCaregiverInputText] = useState('');
  const [caregiverTranscript, setCaregiverTranscript] = useState<string | null>(null);
  const [speakSearchQuery, setSpeakSearchQuery] = useState('');
  const [caregiverSearchQuery, setCaregiverSearchQuery] = useState('');
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [caregiverInputError, setCaregiverInputError] = useState<string | null>(null);
  const [caregiverInputWarning, setCaregiverInputWarning] = useState<string | null>(null);
  const [caregiverInputResult, setCaregiverInputResult] = useState<TextToPictogramsResult | null>(null);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [isDeletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [customPictogramError, setCustomPictogramError] = useState<string | null>(null);
  const [isCreatingPictogram, setIsCreatingPictogram] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [generatedSentence, setGeneratedSentence] = useState<SentenceGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isMatchingCaregiverText, setIsMatchingCaregiverText] = useState(false);
  const [isMatchingCaregiverVoice, setIsMatchingCaregiverVoice] = useState(false);
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [isGeneratingSentence, setIsGeneratingSentence] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [entryActionError, setEntryActionError] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [playingSavedEntryId, setPlayingSavedEntryId] = useState<string | null>(null);
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [savingHistoryFavoriteId, setSavingHistoryFavoriteId] = useState<string | null>(null);
  const [updatingPictogramId, setUpdatingPictogramId] = useState<string | null>(null);
  const [uploadingPictogramId, setUploadingPictogramId] = useState<string | null>(null);
  const { clearAudio, hasAudio, playAudioUrl, replayLastAudio } = useSpeechPlayback();
  const { durationSeconds: voiceRecordingDurationSeconds, isRecording: isRecordingVoice, startRecording, stopRecording } =
    useVoiceRecorder();

  const reloadPictogramCatalog = useCallback(async (preferredSymbolSetCode?: string | null) => {
    if (!supabase || !session?.user.id) {
      return;
    }

    const [categoryData, pictogramData] = await Promise.all([
      fetchPictogramCategories(),
      fetchPictograms({ preferredSymbolSetCode }),
    ]);

    setCategories(categoryData);
    setPictograms(pictogramData);
  }, [session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Supabase ei ole seadistatud. Lisa EXPO_PUBLIC_SUPABASE_URL ja EXPO_PUBLIC_SUPABASE_ANON_KEY .env faili.'
      );
      setIsLoading(false);
      setIsAuthReady(true);
      return;
    }

    getCurrentSession()
      .then((currentSession) => {
        setSession(currentSession);
      })
      .catch((error) => {
        setAuthError(error instanceof Error ? error.message : 'Auth seansi laadimine ebaonnestus.');
      })
      .finally(() => {
        setIsAuthReady(true);
      });

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      setSession(nextSession);
      setAuthError(null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setIsLoading(false);
      setIsLoadingFavorites(false);
      setIsLoadingHistory(false);
      setIsLoadingBoards(false);
      setIsLoadingProfiles(false);
      setIsLoadingSettings(false);
      setChildProfiles([]);
      setChildPictogramSettings([]);
      setFavoriteEntries([]);
      setHistoryEntries([]);
      setSavedBoards([]);
      setPictograms([]);
      setCategories([]);
      setActiveChildProfileId(null);
      setSelectedItems([]);
      setBoardName('');
      setBoardsError(null);
      setCaregiverInputText('');
      setCaregiverTranscript(null);
      setCaregiverInputError(null);
      setCaregiverInputWarning(null);
      setCaregiverInputResult(null);
      setGeneratedSentence(null);
      clearAudio();
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setFavoritesError(null);
      setIsLoadingFavorites(true);
      setIsLoadingHistory(true);
      setIsLoadingBoards(true);
      setIsLoadingProfiles(true);
      setIsLoadingSettings(true);
      setBoardsError(null);
      setHistoryError(null);
      setProfileError(null);
      setSettingsError(null);
      setCustomPictogramError(null);
      setImageUploadError(null);

      const profilesResult = await fetchChildProfiles();
      const nextActiveProfile =
        profilesResult.find((profile) => profile.id === activeChildProfileId) ?? profilesResult[0] ?? null;

      setChildProfiles(profilesResult);
      setActiveChildProfileId((current) =>
        current && profilesResult.some((profile) => profile.id === current)
          ? current
          : profilesResult[0]?.id ?? null
      );
      setIsLoadingProfiles(false);

      try {
        await reloadPictogramCatalog(nextActiveProfile?.preferred_symbol_set_code ?? 'hello');
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Piktogrammide kataloogi laadimine ebaonnestus.'
        );
      }

      setIsLoading(false);
    };

    load().catch((error) => {
      setIsLoading(false);
      setIsLoadingFavorites(false);
      setIsLoadingHistory(false);
      setIsLoadingBoards(false);
      setIsLoadingProfiles(false);
      setIsLoadingSettings(false);
      setErrorMessage(error instanceof Error ? error.message : 'Algandmete laadimine ebaonnestus.');
    });
  }, [reloadPictogramCatalog, session?.user.id]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !session?.user.id) {
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleFocusRefresh = () => {
      const activeProfile =
        childProfiles.find((profile) => profile.id === activeChildProfileId) ?? null;

      reloadPictogramCatalog(activeProfile?.preferred_symbol_set_code ?? 'hello').catch(() => {
        // Ignore silent background refresh errors; the visible UI already has existing data.
      });
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        handleFocusRefresh();
      }
    };

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [activeChildProfileId, childProfiles, reloadPictogramCatalog, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      return;
    }

    const activeProfile =
      childProfiles.find((profile) => profile.id === activeChildProfileId) ?? null;

    reloadPictogramCatalog(activeProfile?.preferred_symbol_set_code ?? 'hello').catch(() => {
      // Keep existing pictogram catalog visible if a background variant refresh fails.
    });
  }, [activeChildProfileId, childProfiles, reloadPictogramCatalog, session?.user.id]);

  useEffect(() => {
    if (!SHOW_SAVED_BOARDS) {
      setIsLoadingBoards(false);
      setBoardsError(null);
      setSavedBoards([]);
      return;
    }

    if (!supabase || !session?.user.id) {
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError(null);

    fetchSentenceHistory(activeChildProfileId)
      .then((entries) => {
        setHistoryEntries(entries);
      })
      .catch((error) => {
        setHistoryError(error instanceof Error ? error.message : 'Ajaloo laadimine ebaonnestus.');
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [activeChildProfileId, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      return;
    }

    setIsLoadingSettings(true);
    setSettingsError(null);

    fetchChildPictogramSettings(activeChildProfileId)
      .then((settings) => {
        setChildPictogramSettings(settings);
      })
      .catch((error) => {
        setSettingsError(error instanceof Error ? error.message : 'Piktogrammiseadete laadimine ebaonnestus.');
      })
      .finally(() => {
        setIsLoadingSettings(false);
      });
  }, [activeChildProfileId, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      return;
    }

    setIsLoadingFavorites(true);
    setFavoritesError(null);

    fetchFavoriteSentences(activeChildProfileId)
      .then((entries) => {
        setFavoriteEntries(entries);
      })
      .catch((error) => {
        setFavoritesError(error instanceof Error ? error.message : 'Lemmikute laadimine ebaonnestus.');
      })
      .finally(() => {
        setIsLoadingFavorites(false);
      });
  }, [activeChildProfileId, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      return;
    }

    setIsLoadingBoards(true);
    setBoardsError(null);
    setSavedBoards([]);

    fetchSavedBoards(activeChildProfileId)
      .then((entries) => {
        setSavedBoards(entries);
      })
      .catch((error) => {
        setBoardsError(error instanceof Error ? error.message : 'Saved boardide laadimine ebaonnestus.');
      })
      .finally(() => {
        setIsLoadingBoards(false);
      });
  }, [activeChildProfileId, session?.user.id]);

  useEffect(() => {
    setCaregiverInputError(null);
    setCaregiverInputWarning(null);
    setCaregiverInputResult(null);
    setCaregiverTranscript(null);
    setBoardName('');
  }, [activeChildProfileId]);

  const columns =
    width >= 1800 ? 8 : width >= 1550 ? 7 : width >= 1280 ? 6 : width >= 960 ? 4 : width >= 720 ? 3 : 2;
  const activeCategory =
    activeCategoryId === ALL_CATEGORY_ID
      ? null
      : categories.find((category) => category.id === activeCategoryId) ?? null;

  const settingsByPictogramId = new Map(
    childPictogramSettings.map((setting) => [setting.pictogram_id, setting])
  );
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const activeChildProfile = childProfiles.find((profile) => profile.id === activeChildProfileId) ?? null;
  const getCustomLabelEtForPictogram = (pictogramId: string) =>
    settingsByPictogramId.get(pictogramId)?.custom_label_et?.trim() || null;
  const getEffectiveLabelEt = (pictogram: Pictogram) =>
    getCustomLabelEtForPictogram(pictogram.id) || pictogram.label_et;
  const getResolvedDisplayLabel = (pictogram: Pictogram) =>
    getPictogramDisplayLabel(
      pictogram,
      activeChildProfile?.preferred_language,
      getCustomLabelEtForPictogram(pictogram.id)
    );
  const buildSelectedItemsFromPictogramIds = (pictogramIds: string[]) =>
    pictogramIds
      .map((pictogramId, index) => {
        const pictogram = pictograms.find((item) => item.id === pictogramId);

        if (!pictogram) {
          return null;
        }

        return createSelectedPictogramItem(
          pictogram,
          index,
          getResolvedDisplayLabel(pictogram),
          getEffectiveLabelEt(pictogram)
        );
      })
      .filter((item): item is SelectedPictogramItem => item !== null);
  const getEntryPictogramItems = (
    entry: SentenceHistoryEntry | FavoriteSentenceEntry
  ): SentencePictogramStripItem[] =>
    entry.pictogram_ids.map((pictogramId, index) => {
      const pictogram = pictograms.find((item) => item.id === pictogramId);

      if (!pictogram) {
        return {
          id: `${entry.id}-${pictogramId}-${index}`,
          imageUrl: null,
          isMissingRecord: true,
          label: 'Puudub',
        };
      }

      return {
        id: `${entry.id}-${pictogram.id}-${index}`,
        imageUrl: pictogram.image_url,
        label: getResolvedDisplayLabel(pictogram),
      };
    });

  const favoriteQuickPictograms = pictograms.filter((pictogram) => {
    const setting = settingsByPictogramId.get(pictogram.id);

    return Boolean(setting?.is_favorite) && (setting?.is_enabled ?? true);
  });

  const caregiverMatchEntries = pictograms
    .filter((pictogram) => settingsByPictogramId.get(pictogram.id)?.is_enabled ?? true)
    .reduce(
      (map, pictogram) => {
        const effectiveLabelEt = getEffectiveLabelEt(pictogram);
        const slug = toPictogramSlug(effectiveLabelEt);

        if (!slug) {
          return map;
        }

        const nextEntry = {
          candidate: {
            categoryName: pictogram.category_id
              ? categoryNameById.get(pictogram.category_id) ?? null
              : FALLBACK_CATEGORY_BY_LABEL[pictogram.label_et] ?? null,
            id: pictogram.id,
            label: effectiveLabelEt,
            slug,
          },
          pictogram,
        };
        const currentEntry = map.get(slug);

        if (!currentEntry || shouldPreferPictogramForSlug(pictogram, currentEntry.pictogram)) {
          map.set(slug, nextEntry);
        }

        return map;
      },
      new Map<string, { candidate: PictogramMatchCandidate; pictogram: Pictogram }>()
    );
  const caregiverMatchCandidates = Array.from(caregiverMatchEntries.values()).map((entry) => entry.candidate);

  const visiblePictograms = pictograms.filter((pictogram) => {
    const setting = settingsByPictogramId.get(pictogram.id);
    const categoryName = pictogram.category_id
      ? categoryNameById.get(pictogram.category_id) ?? null
      : FALLBACK_CATEGORY_BY_LABEL[pictogram.label_et] ?? null;

    if (setting && !setting.is_enabled) {
      return false;
    }

    if (
      !pictogramMatchesSearch(
        {
          categoryName,
          displayLabel: getResolvedDisplayLabel(pictogram),
          pictogram,
        },
        speakSearchQuery
      )
    ) {
      return false;
    }

    if (speakSearchQuery.trim()) {
      return true;
    }

    if (!activeCategory) {
      return true;
    }

    if (pictogram.category_id) {
      return pictogram.category_id === activeCategory.id;
    }

    return FALLBACK_CATEGORY_BY_LABEL[pictogram.label_et] === activeCategory.name;
  });
  const applySavedPictogramSetting = (savedSetting: ChildPictogramSetting) => {
    setChildPictogramSettings((current) => [
      savedSetting,
      ...current.filter((setting) => setting.pictogram_id !== savedSetting.pictogram_id),
    ]);
  };

  const addPictogram = (pictogram: Pictogram) => {
    setGenerationError(null);
    setAudioError(null);
    setGeneratedSentence(null);
    clearAudio();
    setSelectedItems((current) => [
      ...current,
      createSelectedPictogramItem(
        pictogram,
        current.length,
        getResolvedDisplayLabel(pictogram),
        getEffectiveLabelEt(pictogram)
      ),
    ]);
  };

  const removePictogram = (id: string) => {
    setGenerationError(null);
    setAudioError(null);
    setGeneratedSentence(null);
    clearAudio();
    setSelectedItems((current) => reorderSelectedPictograms(current.filter((item) => item.id !== id)));
  };

  const handleCaregiverInputChange = (value: string) => {
    setCaregiverInputText(value);
    setCaregiverInputError(null);
    setCaregiverInputWarning(null);
    setCaregiverInputResult(null);
    setCaregiverTranscript(null);
  };

  const applyMatchedPictograms = (
    result: TextToPictogramsResult | VoiceToPictogramsResult,
    options?: { transcript?: string | null }
  ) => {
    const nextSelectedItems = result.matchedPictogramSlugs
      .map((slug, index) => {
        const entry = caregiverMatchEntries.get(slug);

        if (!entry) {
          return null;
        }
        const { pictogram } = entry;

        return createSelectedPictogramItem(
          pictogram,
          index,
          getResolvedDisplayLabel(pictogram),
          getEffectiveLabelEt(pictogram)
        );
      })
      .filter((item): item is SelectedPictogramItem => item !== null);

    setCaregiverInputResult(result);
    setCaregiverTranscript(options?.transcript ?? null);
    setSelectedItems(nextSelectedItems);
    setGeneratedSentence(null);
    setGenerationError(null);
    setAudioError(null);
    clearAudio();
    setSpeakSearchQuery('');
    setActiveCategoryId(ALL_CATEGORY_ID);

    if (nextSelectedItems.length === 0) {
      setCaregiverInputWarning('Gemini ei leidnud sellest lausest usaldusvaarseid piktogrammivasteid.');
    } else if (nextSelectedItems.length !== result.matchedPictogramSlugs.length) {
      setCaregiverInputWarning('Osa Gemini tagastatud slugidest ei leidunud kohalikus piktogrammikataloogis.');
    } else {
      setCaregiverInputWarning(null);
    }
  };

  const handleMatchCaregiverText = async () => {
    const normalizedText = caregiverInputText.trim();

    if (!normalizedText) {
      setCaregiverInputError('Kirjuta enne lause, mida soovid piktogrammideks teisendada.');
      return;
    }

    if (caregiverMatchCandidates.length === 0) {
      setCaregiverInputError('Piktogrammikataloog puudub voi on lapse jaoks koik disabled.');
      return;
    }

    setIsMatchingCaregiverText(true);
    setCaregiverInputError(null);
    setCaregiverInputWarning(null);

    try {
      const result = await matchTextToPictograms({
        availablePictograms: caregiverMatchCandidates,
        text: normalizedText,
      });
      applyMatchedPictograms(result);
    } catch (error) {
      setCaregiverInputError(
        error instanceof Error ? error.message : 'Teksti piktogrammideks teisendamine ebaonnestus.'
      );
    } finally {
      setIsMatchingCaregiverText(false);
    }
  };

  const handleStartVoiceRecording = async () => {
    setCaregiverInputError(null);
    setCaregiverInputWarning(null);
    setCaregiverTranscript(null);

    try {
      await startRecording();
    } catch (error) {
      setCaregiverInputError(
        error instanceof Error ? error.message : 'Voice salvestuse alustamine ebaonnestus.'
      );
    }
  };

  const handleStopVoiceRecording = async () => {
    if (caregiverMatchCandidates.length === 0) {
      setCaregiverInputError('Piktogrammikataloog puudub voi on lapse jaoks koik disabled.');
      return;
    }

    setCaregiverInputError(null);
    setCaregiverInputWarning(null);

    try {
      const recording = await stopRecording();
      setIsMatchingCaregiverVoice(true);
      const result = await transcribeAndMatchVoiceToPictograms({
        audioBase64: recording.audioBase64,
        availablePictograms: caregiverMatchCandidates,
        mimeType: recording.mimeType,
      });

      setCaregiverInputText(result.transcript);
      applyMatchedPictograms(result, { transcript: result.transcript });
    } catch (error) {
      setCaregiverInputError(
        error instanceof Error ? error.message : 'Voice inputi teisendamine ebaonnestus.'
      );
    } finally {
      setIsMatchingCaregiverVoice(false);
    }
  };

  const sentenceGenerationInput = toSentenceGenerationInput(selectedItems);
  const buildFavoriteSignature = (sentenceText: string, pictogramIds: string[]) =>
    [sentenceText, ...pictogramIds].join('|');
  const favoriteSignatures = new Set(
    favoriteEntries.map((entry) => buildFavoriteSignature(entry.sentence_text, entry.pictogram_ids))
  );
  const currentFavoriteSignature = [
    generatedSentence?.sentence ?? '',
    ...sentenceGenerationInput.pictograms.map((item) => item.id),
  ].join('|');
  const isCurrentSentenceFavorite =
    Boolean(generatedSentence?.sentence) &&
    favoriteSignatures.has(currentFavoriteSignature);

  const handleGenerateSentence = async () => {
    if (!activeChildProfileId) {
      setGenerationError('Vali enne lause genereerimist aktiivne child profile.');
      return;
    }

    if (sentenceGenerationInput.pictograms.length === 0) {
      setGenerationError('Vali enne lause genereerimist vahemalt üks piktogramm.');
      return;
    }

    setIsGeneratingSentence(true);
    setGenerationError(null);

    try {
      const result = await generateSentence(sentenceGenerationInput);
      clearAudio();
      setAudioError(null);
      setGeneratedSentence(result);

      try {
        const savedEntry = await saveSentenceHistoryEntry({
          childProfileId: activeChildProfileId,
          input: sentenceGenerationInput,
          result,
        });
        setHistoryEntries((current) => [savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)]);
        setHistoryError(null);
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : 'Ajaloo salvestamine ebaonnestus.');
      }
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Lause genereerimine ebaonnestus.'
      );
    } finally {
      setIsGeneratingSentence(false);
    }
  };

  const handlePlaySentence = async () => {
    if (!generatedSentence?.plainText) {
      setAudioError('Genereeri enne lause, et saaks seda ette lugeda.');
      return;
    }

    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const result = await synthesizeSpeech(generatedSentence.plainText);
      await playAudioUrl(result.audioUrl);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Heli loomine ebaonnestus.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handlePlayAgain = async () => {
    setAudioError(null);

    try {
      await replayLastAudio();
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Heli taasesitus ebaonnestus.');
    }
  };

  const handleSaveBoard = async () => {
    if (!activeChildProfileId) {
      setBoardsError('Vali enne aktiivne child profile.');
      return;
    }

    if (!boardName.trim()) {
      setBoardsError('Pane saved boardile nimi.');
      return;
    }

    if (selectedItems.length === 0) {
      setBoardsError('Vali enne piktogrammid, mida soovid boardina salvestada.');
      return;
    }

    setIsSavingBoard(true);
    setBoardsError(null);

    try {
      const savedBoard = await saveSavedBoard({
        childProfileId: activeChildProfileId,
        name: boardName,
        pictogramIds: selectedItems.map((item) => item.pictogramId),
      });

      setSavedBoards((current) => [
        savedBoard,
        ...current.filter((board) => board.id !== savedBoard.id),
      ]);
      setBoardName('');
    } catch (error) {
      setBoardsError(error instanceof Error ? error.message : 'Saved boardi salvestamine ebaonnestus.');
    } finally {
      setIsSavingBoard(false);
    }
  };

  const hydrateSavedEntryIntoSpeak = (
    entry: SentenceHistoryEntry | FavoriteSentenceEntry,
    options?: { openSpeakTab?: boolean }
  ) => {
    const nextSelectedItems = buildSelectedItemsFromPictogramIds(entry.pictogram_ids);

    setSelectedItems(nextSelectedItems);
    setGeneratedSentence({
      plainText: entry.plain_text ?? entry.sentence_text,
      sentence: entry.sentence_text,
    });
    setGenerationError(null);
    setAudioError(null);
    clearAudio();

    if (options?.openSpeakTab) {
      setActiveTab(SPEAK_TAB);
    }
  };

  const handleUseSavedEntry = (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => {
    setEntryActionError(null);
    hydrateSavedEntryIntoSpeak(entry, { openSpeakTab: true });
  };

  const handleLoadBoard = (board: SavedBoard) => {
    const nextSelectedItems = buildSelectedItemsFromPictogramIds(board.pictogram_ids);

    setBoardsError(
      nextSelectedItems.length === board.pictogram_ids.length
        ? null
        : 'Osa boardi piktogrammidest ei olnud enam kohalikus kataloogis saadaval.'
    );
    setSelectedItems(nextSelectedItems);
    setGeneratedSentence(null);
    setGenerationError(null);
    setAudioError(null);
    clearAudio();
    setSpeakSearchQuery('');
    setActiveCategoryId(ALL_CATEGORY_ID);
  };

  const handleDeleteBoard = async (board: SavedBoard) => {
    setDeletingBoardId(board.id);
    setBoardsError(null);

    try {
      await deleteSavedBoard(board.id);
      setSavedBoards((current) => current.filter((entry) => entry.id !== board.id));
    } catch (error) {
      setBoardsError(error instanceof Error ? error.message : 'Saved boardi kustutamine ebaonnestus.');
    } finally {
      setDeletingBoardId(null);
    }
  };

  const handlePlaySavedEntry = async (entry: SentenceHistoryEntry | FavoriteSentenceEntry) => {
    setPlayingSavedEntryId(entry.id);
    setEntryActionError(null);
    setAudioError(null);
    hydrateSavedEntryIntoSpeak(entry);

    try {
      const result = await synthesizeSpeech(entry.plain_text ?? entry.sentence_text);
      await playAudioUrl(result.audioUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Heli loomine ebaonnestus.';
      setAudioError(message);
      setEntryActionError(message);
    } finally {
      setPlayingSavedEntryId(null);
    }
  };

  const handleSaveFavorite = async () => {
    if (!generatedSentence || !activeChildProfileId) {
      return;
    }

    if (isCurrentSentenceFavorite) {
      return;
    }

    setIsSavingFavorite(true);
    setFavoritesError(null);

    try {
      const savedFavorite = await saveFavoriteSentence({
        childProfileId: activeChildProfileId,
        input: sentenceGenerationInput,
        result: generatedSentence,
      });
      setFavoriteEntries((current) => [
        savedFavorite,
        ...current.filter((entry) => entry.id !== savedFavorite.id),
      ]);
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : 'Lemmikutesse salvestamine ebaonnestus.');
    } finally {
      setIsSavingFavorite(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    setRemovingFavoriteId(favoriteId);
    setFavoritesError(null);

    try {
      await deleteFavoriteSentence(favoriteId);
      setFavoriteEntries((current) => current.filter((entry) => entry.id !== favoriteId));
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : 'Lemmiku eemaldamine ebaonnestus.');
    } finally {
      setRemovingFavoriteId(null);
    }
  };

  const handleFavoriteHistoryEntry = async (entry: SentenceHistoryEntry) => {
    const signature = buildFavoriteSignature(entry.sentence_text, entry.pictogram_ids);

    if (favoriteSignatures.has(signature)) {
      return;
    }

    setSavingHistoryFavoriteId(entry.id);
    setEntryActionError(null);
    setFavoritesError(null);

    try {
      const savedFavorite = await saveFavoriteSentenceFromHistoryEntry(entry);
      setFavoriteEntries((current) => [
        savedFavorite,
        ...current.filter((favoriteEntry) => favoriteEntry.id !== savedFavorite.id),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lemmikutesse salvestamine ebaonnestus.';
      setFavoritesError(message);
      setEntryActionError(message);
    } finally {
      setSavingHistoryFavoriteId(null);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      await signInCaregiver(email, password);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? formatAuthErrorMessage(error.message)
          : 'Sisselogimine ebaonnestus.',
      );
      throw error;
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      const requiresEmailConfirmation = await signUpCaregiver(email, password);

      if (requiresEmailConfirmation) {
        setAuthInfo('Konto loodi. Kinnita email ja logi siis sisse.');
      } else {
        setAuthInfo('Konto loodi. Oled nuud sisse logitud.');
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? formatAuthErrorMessage(error.message)
          : 'Konto loomine ebaonnestus.',
      );
      throw error;
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      await signOutCaregiver();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Valjalogimine ebaonnestus.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCreateProfile = async (input: ChildProfileInput) => {
    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const createdProfile = await createChildProfile(input);
      setChildProfiles((current) => [...current, createdProfile]);
      setActiveChildProfileId(createdProfile.id);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Child profile loomine ebaonnestus.');
      throw error;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateCustomPictogram = async (input: CustomPictogramInput) => {
    setIsCreatingPictogram(true);
    setCustomPictogramError(null);

    try {
      const createdPictogram = await createCustomPictogram(input);
      setPictograms((current) => [createdPictogram, ...current.filter((item) => item.id !== createdPictogram.id)]);
    } catch (error) {
      setCustomPictogramError(error instanceof Error ? error.message : 'Custom piktogrammi loomine ebaonnestus.');
      throw error;
    } finally {
      setIsCreatingPictogram(false);
    }
  };

  const handleUpdateProfile = async (profileId: string, input: ChildProfileInput) => {
    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const updatedProfile = await updateChildProfile(profileId, input);
      setChildProfiles((current) =>
        current.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
      );
      setActiveChildProfileId(updatedProfile.id);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Child profile muutmine ebaonnestus.');
      throw error;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTogglePictogramEnabled = async (pictogramId: string) => {
    if (!activeChildProfileId) {
      return;
    }

    const currentSetting = settingsByPictogramId.get(pictogramId);

    setUpdatingPictogramId(pictogramId);
    setSettingsError(null);

    try {
      const savedSetting = await saveChildPictogramSetting({
        childProfileId: activeChildProfileId,
        customLabelEt: currentSetting?.custom_label_et ?? null,
        isEnabled: !(currentSetting?.is_enabled ?? true),
        isFavorite: currentSetting?.is_favorite ?? false,
        pictogramId,
      });

      applySavedPictogramSetting(savedSetting);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Piktogrammi seade salvestamine ebaonnestus.');
    } finally {
      setUpdatingPictogramId(null);
    }
  };

  const handleTogglePictogramFavorite = async (pictogramId: string) => {
    if (!activeChildProfileId) {
      return;
    }

    const currentSetting = settingsByPictogramId.get(pictogramId);

    setUpdatingPictogramId(pictogramId);
    setSettingsError(null);

    try {
      const savedSetting = await saveChildPictogramSetting({
        childProfileId: activeChildProfileId,
        customLabelEt: currentSetting?.custom_label_et ?? null,
        isEnabled: currentSetting?.is_enabled ?? true,
        isFavorite: !(currentSetting?.is_favorite ?? false),
        pictogramId,
      });

      applySavedPictogramSetting(savedSetting);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Lemmikpiktogrammi seade salvestamine ebaonnestus.');
    } finally {
      setUpdatingPictogramId(null);
    }
  };

  const handleSavePictogramCustomLabel = async (
    pictogramId: string,
    customLabelEt: string | null
  ) => {
    if (!activeChildProfileId) {
      return;
    }

    const currentSetting = settingsByPictogramId.get(pictogramId);
    const pictogram = pictograms.find((item) => item.id === pictogramId);

    if (!pictogram) {
      return;
    }

    setUpdatingPictogramId(pictogramId);
    setSettingsError(null);

    try {
      const savedSetting = await saveChildPictogramSetting({
        childProfileId: activeChildProfileId,
        customLabelEt,
        isEnabled: currentSetting?.is_enabled ?? true,
        isFavorite: currentSetting?.is_favorite ?? false,
        pictogramId,
      });

      applySavedPictogramSetting(savedSetting);

      const nextEffectiveLabelEt = savedSetting.custom_label_et?.trim() || pictogram.label_et;
      const nextDisplayLabel = getPictogramDisplayLabel(
        pictogram,
        activeChildProfile?.preferred_language,
        savedSetting.custom_label_et
      );

      setSelectedItems((current) =>
        current.map((item) =>
          item.pictogramId === pictogramId
            ? {
              ...item,
              displayLabel: nextDisplayLabel,
              label: nextEffectiveLabelEt,
            }
            : item
        )
      );
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Piktogrammi teksti salvestamine ebaonnestus.');
      throw error;
    } finally {
      setUpdatingPictogramId(null);
    }
  };

  const handleUploadPictogramImage = async (pictogram: Pictogram) => {
    setImageUploadError(null);
    setUploadingPictogramId(pictogram.id);

    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          throw new Error('Luba fototeegi ligipaas, et saaksid piktogrammile pildi valida.');
        }
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        base64: true,
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (pickerResult.canceled) {
        return;
      }

      const asset = pickerResult.assets[0];

      if (!asset?.base64) {
        throw new Error('Valitud pildi andmeid ei saadud lugeda.');
      }

      if (asset.fileSize && asset.fileSize > MAX_PICTOGRAM_IMAGE_SIZE_BYTES) {
        throw new Error('Vali pilt, mis on kuni 5 MB.');
      }

      const uploadResult = await uploadPictogramImage({
        base64Data: asset.base64,
        fileName: asset.fileName ?? `${pictogram.label_et}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        pictogramId: pictogram.id,
      });

      setPictograms((current) =>
        current.map((item) =>
          item.id === pictogram.id ? { ...item, image_url: uploadResult.imageUrl } : item
        )
      );
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : 'Piktogrammi pildi upload ebaonnestus.');
    } finally {
      setUploadingPictogramId(null);
    }
  };

  if (!isSupabaseConfigured || !supabase) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.centeredState}>
          <Text style={styles.centeredTitle}>Supabase vajab seadistamist.</Text>
          <Text style={styles.centeredText}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!isAuthReady) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.centeredState}>
          <Text style={styles.centeredTitle}>Kontrollin caregiver seanssi...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <AuthScreen
          errorMessage={authError}
          infoMessage={authInfo}
          isSubmitting={isSubmittingAuth}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.tabBar}>
        <TabButton
          isActive={activeTab === SPEAK_TAB}
          label="Speak"
          onPress={() => setActiveTab(SPEAK_TAB)}
        />
        <TabButton
          isActive={activeTab === HISTORY_TAB}
          label="History"
          onPress={() => setActiveTab(HISTORY_TAB)}
        />
        <TabButton
          isActive={activeTab === FAVORITES_TAB}
          label="Favorites"
          onPress={() => setActiveTab(FAVORITES_TAB)}
        />
        <TabButton
          isActive={activeTab === PROFILE_TAB}
          label="Profile"
          onPress={() => setActiveTab(PROFILE_TAB)}
        />
        <TabButton
          isActive={activeTab === CAREGIVER_TAB}
          label="Caregiver"
          onPress={() => setActiveTab(CAREGIVER_TAB)}
        />
      </View>

      {activeTab === SPEAK_TAB ? (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>HELLO MVP</Text>
              <Text style={styles.title}>Vali pildid ja ehita lause samm-sammult.</Text>
              <Text style={styles.subtitle}>
                Rahulik avavaade esimesele kasutatavale kodulehele. AI lauseehitus tuleb jargmises etapis.
              </Text>
            </View>

            <View style={styles.activeChildCard}>
              <Text style={styles.activeChildLabel}>Aktiivne laps</Text>
              <Text style={styles.activeChildName}>
                {activeChildProfile?.name ?? 'Vali profiil Profile tabis'}
              </Text>
            </View>

            {SHOW_SAVED_BOARDS ? (
              <SavedBoardsPanel
                activeChildName={activeChildProfile?.name ?? null}
                boardName={boardName}
                boards={savedBoards}
                deletingBoardId={isDeletingBoardId}
                errorMessage={boardsError}
                isLoading={isLoadingBoards}
                isSaving={isSavingBoard}
                onChangeBoardName={setBoardName}
                onDeleteBoard={handleDeleteBoard}
                onLoadBoard={handleLoadBoard}
                onSaveBoard={handleSaveBoard}
                selectedCount={selectedItems.length}
              />
            ) : null}

            <CaregiverInputPanel
              errorMessage={caregiverInputError}
              inputValue={caregiverInputText}
              isConfigured={isSentenceApiConfigured}
              isLoading={isMatchingCaregiverText}
              isRecording={isRecordingVoice}
              isTranscribing={isMatchingCaregiverVoice}
              onChangeText={handleCaregiverInputChange}
              onConvert={handleMatchCaregiverText}
              onStartRecording={handleStartVoiceRecording}
              onStopRecording={handleStopVoiceRecording}
              recordingDurationSeconds={voiceRecordingDurationSeconds}
              result={caregiverInputResult}
              transcript={caregiverTranscript}
              warningMessage={caregiverInputWarning}
            />

            <FavoritePictogramRow
              getCustomLabelEt={(pictogram) => getCustomLabelEtForPictogram(pictogram.id)}
              pictograms={favoriteQuickPictograms}
              onPressPictogram={addPictogram}
              preferredLanguage={activeChildProfile?.preferred_language}
            />

            {errorMessage ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageTitle}>Seadistus vajab tahelepanu</Text>
                <Text style={styles.messageText}>{errorMessage}</Text>
              </View>
            ) : null}

            {!isLoadingProfiles && childProfiles.length > 0 ? (
              <ChildProfileSelector
                activeChildProfileId={activeChildProfileId}
                profiles={childProfiles}
                onSelectProfile={setActiveChildProfileId}
              />
            ) : null}

            <CategorySection
              activeCategoryId={activeCategoryId}
              allCategoryId={ALL_CATEGORY_ID}
              categories={categories}
              pictogramCount={pictograms.length}
              onSelectCategory={setActiveCategoryId}
            />

            <SearchField
              onChangeText={setSpeakSearchQuery}
              placeholder="Otsi sona voi piktogrammi ule koigi piltide"
              value={speakSearchQuery}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pildikaardid</Text>
              <Text style={styles.sectionMeta}>
                {isLoading ? 'Laadimine...' : `${visiblePictograms.length} tulemust`}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageText}>Laen piktogramme Supabasest...</Text>
              </View>
            ) : null}

            {!isLoading && !errorMessage && visiblePictograms.length === 0 ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageTitle}>
                  {speakSearchQuery.trim() ? 'Otsing ei leidnud vasteid' : 'Pildid puuduvad'}
                </Text>
                <Text style={styles.messageText}>
                  {speakSearchQuery.trim()
                    ? 'Proovi teist sona voi tuhjad otsinguvaja.'
                    : 'Kontrolli, et `pictograms` tabelis oleksid read olemas ja seotud kategooriatega.'}
                </Text>
              </View>
            ) : null}

            {!isLoading && !errorMessage ? (
              <View style={styles.grid}>
                {visiblePictograms.map((pictogram) => (
                  <View
                    key={pictogram.id}
                    style={[
                      styles.gridItem,
                      {
                        width: `${100 / columns}%`,
                      },
                    ]}
                  >
                    <PictogramCard
                      categoryName={
                        pictogram.category_id
                          ? categoryNameById.get(pictogram.category_id) ?? null
                          : FALLBACK_CATEGORY_BY_LABEL[pictogram.label_et] ?? null
                      }
                      imageUrl={pictogram.image_url}
                      label={getResolvedDisplayLabel(pictogram)}
                      onPress={() => addPictogram(pictogram)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <SentenceResultPanel
            audioErrorMessage={audioError}
            errorMessage={generationError}
            hasAudio={hasAudio}
            isFavorite={isCurrentSentenceFavorite}
            isAudioConfigured={isSentenceApiConfigured}
            isGeneratingAudio={isGeneratingAudio}
            isConfigured={isSentenceApiConfigured}
            isLoading={isGeneratingSentence}
            isSavingFavorite={isSavingFavorite}
            onFavorite={handleSaveFavorite}
            onGenerate={handleGenerateSentence}
            onPlayAgain={handlePlayAgain}
            onPlaySentence={handlePlaySentence}
            payloadCount={sentenceGenerationInput.pictograms.length}
            result={generatedSentence}
          />
          <SentenceBar items={selectedItems} onRemove={removePictogram} />
        </>
      ) : activeTab === HISTORY_TAB ? (
        <HistoryScreen
          actionErrorMessage={entryActionError}
          emptyMessage="Genereeri esimesed laused Speak vaates."
          entries={historyEntries}
          errorMessage={historyError}
          favoritingEntryId={savingHistoryFavoriteId}
          getEntryPictograms={getEntryPictogramItems}
          isLoading={isLoadingHistory}
          isEntryFavorite={(entry) =>
            favoriteSignatures.has(buildFavoriteSignature(entry.sentence_text, entry.pictogram_ids))
          }
          onFavoriteEntry={(entry) => handleFavoriteHistoryEntry(entry as SentenceHistoryEntry)}
          onPlayEntry={handlePlaySavedEntry}
          onUseEntry={handleUseSavedEntry}
          playingEntryId={playingSavedEntryId}
          subtitle="Lihtne MVP vaade, mis kuvab laused uusimast vanimani."
          title={activeChildProfile ? `${activeChildProfile.name} viimased loodud laused.` : 'Viimased loodud laused.'}
        />
      ) : activeTab === FAVORITES_TAB ? (
        <HistoryScreen
          actionErrorMessage={entryActionError}
          emptyMessage="Salvesta generated sentence lemmikuks Speak vaates."
          entries={favoriteEntries}
          errorMessage={favoritesError}
          getEntryPictograms={getEntryPictogramItems}
          isLoading={isLoadingFavorites}
          onPlayEntry={handlePlaySavedEntry}
          onRemoveEntry={handleRemoveFavorite}
          onUseEntry={handleUseSavedEntry}
          playingEntryId={playingSavedEntryId}
          removingEntryId={removingFavoriteId}
          subtitle="Lihtne MVP vaade sinu salvestatud lemmiklausetest."
          title={activeChildProfile ? `${activeChildProfile.name} lemmikud.` : 'Salvestatud lemmikud.'}
        />
      ) : activeTab === PROFILE_TAB ? (
        <ProfileScreen
          activeChildProfileId={activeChildProfileId}
          caregiverEmail={session.user.email ?? null}
          errorMessage={profileError}
          isLoading={isLoadingProfiles}
          isSaving={isSavingProfile}
          isSigningOut={isSigningOut}
          onCreateProfile={handleCreateProfile}
          onSelectProfile={setActiveChildProfileId}
          onSignOut={handleSignOut}
          onUpdateProfile={handleUpdateProfile}
          profiles={childProfiles}
        />
      ) : (
        <CaregiverScreen
          activeChildProfile={activeChildProfile}
          categories={categories}
          customPictogramError={customPictogramError}
          historyEntries={historyEntries}
          imageUploadError={imageUploadError}
          isCreatingPictogram={isCreatingPictogram}
          isLoadingSettings={isLoadingSettings}
          onCreateCustomPictogram={handleCreateCustomPictogram}
          onSaveCustomLabel={handleSavePictogramCustomLabel}
          onToggleEnabled={handleTogglePictogramEnabled}
          onToggleFavorite={handleTogglePictogramFavorite}
          onUploadImage={handleUploadPictogramImage}
          pictograms={pictograms}
          searchQuery={caregiverSearchQuery}
          settings={childPictogramSettings}
          settingsError={settingsError}
          onChangeSearchQuery={setCaregiverSearchQuery}
          uploadingPictogramId={uploadingPictogramId}
          updatingPictogramId={updatingPictogramId}
        />
      )}
    </View>
  );
}

type TabButtonProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function TabButton({ isActive, label, onPress }: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ava ${label} vaade`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        isActive ? styles.tabButtonActive : null,
        pressed ? styles.tabButtonPressed : null,
      ]}
    >
      <Text style={[styles.tabButtonText, isActive ? styles.tabButtonTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f2e8',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centeredTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d2417',
  },
  centeredText: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#66563f',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 6,
    backgroundColor: '#f7f2e8',
  },
  tabButton: {
    borderRadius: 999,
    backgroundColor: '#efe5d3',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  tabButtonActive: {
    backgroundColor: '#304b34',
  },
  tabButtonPressed: {
    opacity: 0.88,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5a4d3a',
  },
  tabButtonTextActive: {
    color: '#f8f6f1',
  },
  content: {
    paddingTop: 32,
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
  activeChildCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 18,
    marginBottom: 18,
  },
  activeChildLabel: {
    fontSize: 14,
    color: '#7a6a4f',
    marginBottom: 8,
  },
  activeChildName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2d2417',
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
    maxWidth: 700,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 26,
    color: '#5f513d',
    maxWidth: 760,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  messageCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 18,
    marginBottom: 18,
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
});
