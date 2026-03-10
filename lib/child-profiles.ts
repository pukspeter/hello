import { supabase } from './supabase';
import type { ChildProfile, ChildProfileInput } from '../types/pictograms';

type RawChildProfile = {
  created_at: string;
  id: string;
  name: string;
  notes: string | null;
  preferred_language: string;
  user_id: string | null;
};

export async function fetchChildProfiles(): Promise<ChildProfile[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .select('id, created_at, name, notes, preferred_language, user_id')
    .order('created_at', { ascending: true });

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
      user_id: user.id,
    })
    .select('id, created_at, name, notes, preferred_language, user_id')
    .single();

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
    })
    .eq('id', profileId)
    .select('id, created_at, name, notes, preferred_language, user_id')
    .single();

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
    user_id: profile.user_id,
  };
}
