import { supabase } from './supabase';
import type { ChildProfile, ChildProfileInput } from '../types/pictograms';

type RawChildProfile = {
  created_at: string;
  id: string;
  name: string;
  notes: string | null;
  preferred_language: string;
  preferred_symbol_set_code?: string | null;
  user_id: string | null;
};

const CHILD_PROFILE_SELECT_WITH_SYMBOL_SET =
  'id, created_at, name, notes, preferred_language, preferred_symbol_set_code, user_id';
const CHILD_PROFILE_SELECT_LEGACY =
  'id, created_at, name, notes, preferred_language, user_id';

export async function fetchChildProfiles(): Promise<ChildProfile[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .select(CHILD_PROFILE_SELECT_WITH_SYMBOL_SET)
    .order('created_at', { ascending: true });

  if (error?.code === '42703') {
    const legacyResult = await supabase
      .from('child_profiles')
      .select(CHILD_PROFILE_SELECT_LEGACY)
      .order('created_at', { ascending: true });

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return (legacyResult.data ?? []).map(normalizeChildProfile);
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeChildProfile);
}

export async function createChildProfile(input: ChildProfileInput): Promise<ChildProfile> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error('Child profile loomiseks peab caregiver olema sisse logitud.');
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .insert({
      name: input.name.trim(),
      notes: input.notes?.trim() || null,
      preferred_language: input.preferred_language.trim() || 'et',
      preferred_symbol_set_code: input.preferred_symbol_set_code?.trim() || 'hello',
      user_id: user.id,
    })
    .select(CHILD_PROFILE_SELECT_WITH_SYMBOL_SET)
    .single();

  if (error?.code === '42703') {
    const legacyResult = await supabase
      .from('child_profiles')
      .insert({
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
        preferred_language: input.preferred_language.trim() || 'et',
        user_id: user.id,
      })
      .select(CHILD_PROFILE_SELECT_LEGACY)
      .single();

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return normalizeChildProfile(legacyResult.data);
  }

  if (error) {
    throw new Error(error.message);
  }

  return normalizeChildProfile(data);
}

export async function updateChildProfile(
  profileId: string,
  input: ChildProfileInput
): Promise<ChildProfile> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .update({
      name: input.name.trim(),
      notes: input.notes?.trim() || null,
      preferred_language: input.preferred_language.trim() || 'et',
      preferred_symbol_set_code: input.preferred_symbol_set_code?.trim() || 'hello',
    })
    .eq('id', profileId)
    .select(CHILD_PROFILE_SELECT_WITH_SYMBOL_SET)
    .single();

  if (error?.code === '42703') {
    const legacyResult = await supabase
      .from('child_profiles')
      .update({
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
        preferred_language: input.preferred_language.trim() || 'et',
      })
      .eq('id', profileId)
      .select(CHILD_PROFILE_SELECT_LEGACY)
      .single();

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return normalizeChildProfile(legacyResult.data);
  }

  if (error) {
    throw new Error(error.message);
  }

  return normalizeChildProfile(data);
}

function normalizeChildProfile(profile: RawChildProfile): ChildProfile {
  return {
    created_at: profile.created_at,
    id: profile.id,
    name: profile.name,
    notes: profile.notes,
    preferred_language: profile.preferred_language,
    preferred_symbol_set_code: profile.preferred_symbol_set_code?.trim() || 'hello',
    user_id: profile.user_id,
  };
}
