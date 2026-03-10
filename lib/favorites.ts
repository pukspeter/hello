import { supabase } from './supabase';
import type {
  FavoriteSentenceEntry,
  SentenceGenerationInput,
  SentenceGenerationResult,
  SentenceHistoryEntry,
} from '../types/pictograms';

type RawFavoriteSentenceEntry = {
  child_profile_id: string | null;
  created_at: string;
  id: string;
  pictogram_ids: unknown;
  plain_text: string | null;
  sentence_text: string;
};

export async function fetchFavoriteSentences(childProfileId: string | null): Promise<FavoriteSentenceEntry[]> {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('favorite_sentences')
    .select('id, child_profile_id, created_at, plain_text, pictogram_ids, sentence_text')
    .order('created_at', { ascending: false })
    .limit(20);

  if (childProfileId) {
    query = query.eq('child_profile_id', childProfileId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeFavoriteSentenceEntry);
}

export async function saveFavoriteSentence({
  childProfileId,
  input,
  result,
}: {
  childProfileId: string | null;
  input: SentenceGenerationInput;
  result: SentenceGenerationResult;
}): Promise<FavoriteSentenceEntry> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { data, error } = await supabase
    .from('favorite_sentences')
    .insert({
      child_profile_id: childProfileId,
      pictogram_ids: input.pictograms.map((item) => item.id),
      plain_text: result.plainText,
      sentence_text: result.sentence,
    })
    .select('id, child_profile_id, created_at, plain_text, pictogram_ids, sentence_text')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeFavoriteSentenceEntry(data);
}

export async function saveFavoriteSentenceFromHistoryEntry(
  entry: SentenceHistoryEntry
): Promise<FavoriteSentenceEntry> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { data, error } = await supabase
    .from('favorite_sentences')
    .insert({
      child_profile_id: entry.child_profile_id,
      pictogram_ids: entry.pictogram_ids,
      plain_text: entry.plain_text,
      sentence_text: entry.sentence_text,
    })
    .select('id, child_profile_id, created_at, plain_text, pictogram_ids, sentence_text')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeFavoriteSentenceEntry(data);
}

export async function deleteFavoriteSentence(favoriteId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { error } = await supabase
    .from('favorite_sentences')
    .delete()
    .eq('id', favoriteId);

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeFavoriteSentenceEntry(entry: RawFavoriteSentenceEntry): FavoriteSentenceEntry {
  const pictogramIds = Array.isArray(entry.pictogram_ids)
    ? entry.pictogram_ids.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    child_profile_id: entry.child_profile_id,
    created_at: entry.created_at,
    id: entry.id,
    pictogram_ids: pictogramIds,
    plain_text: entry.plain_text,
    sentence_text: entry.sentence_text,
  };
}
