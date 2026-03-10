import { supabase } from './supabase';
import type { SentenceGenerationInput, SentenceGenerationResult, SentenceHistoryEntry } from '../types/pictograms';

type RawSentenceHistoryEntry = {
  child_profile_id: string | null;
  created_at: string;
  id: string;
  pictogram_ids: unknown;
  plain_text: string | null;
  sentence_text: string;
};

export async function fetchSentenceHistory(childProfileId: string | null): Promise<SentenceHistoryEntry[]> {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('sentence_history')
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

  return (data ?? []).map(normalizeSentenceHistoryEntry);
}

export async function saveSentenceHistoryEntry({
  childProfileId,
  input,
  result,
}: {
  childProfileId: string | null;
  input: SentenceGenerationInput;
  result: SentenceGenerationResult;
}): Promise<SentenceHistoryEntry> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { data, error } = await supabase
    .from('sentence_history')
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

  return normalizeSentenceHistoryEntry(data);
}

function normalizeSentenceHistoryEntry(entry: RawSentenceHistoryEntry): SentenceHistoryEntry {
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
