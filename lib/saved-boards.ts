import { supabase } from './supabase';
import type { SavedBoard } from '../types/pictograms';

type RawSavedBoard = {
  child_profile_id: string;
  created_at: string;
  id: string;
  name: string;
  pictogram_ids: unknown;
  updated_at: string;
};

export async function fetchSavedBoards(childProfileId: string | null): Promise<SavedBoard[]> {
  if (!supabase || !childProfileId) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_boards')
    .select('id, child_profile_id, created_at, updated_at, name, pictogram_ids')
    .eq('child_profile_id', childProfileId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeSavedBoard);
}

export async function saveSavedBoard({
  childProfileId,
  name,
  pictogramIds,
}: {
  childProfileId: string;
  name: string;
  pictogramIds: string[];
}): Promise<SavedBoard> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error('Boardi nimi on kohustuslik.');
  }

  const { data: existingBoard, error: existingError } = await supabase
    .from('saved_boards')
    .select('id')
    .eq('child_profile_id', childProfileId)
    .eq('name', normalizedName)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingBoard?.id) {
    const { data, error } = await supabase
      .from('saved_boards')
      .update({
        name: normalizedName,
        pictogram_ids: pictogramIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingBoard.id)
      .select('id, child_profile_id, created_at, updated_at, name, pictogram_ids')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return normalizeSavedBoard(data);
  }

  const { data, error } = await supabase
    .from('saved_boards')
    .insert({
      child_profile_id: childProfileId,
      name: normalizedName,
      pictogram_ids: pictogramIds,
    })
    .select('id, child_profile_id, created_at, updated_at, name, pictogram_ids')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeSavedBoard(data);
}

export async function deleteSavedBoard(boardId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { error } = await supabase
    .from('saved_boards')
    .delete()
    .eq('id', boardId);

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeSavedBoard(board: RawSavedBoard): SavedBoard {
  return {
    child_profile_id: board.child_profile_id,
    created_at: board.created_at,
    id: board.id,
    name: board.name,
    pictogram_ids: Array.isArray(board.pictogram_ids)
      ? board.pictogram_ids.filter((value): value is string => typeof value === 'string')
      : [],
    updated_at: board.updated_at,
  };
}
