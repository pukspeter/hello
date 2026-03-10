import { supabase } from './supabase';
import type { ChildPictogramSetting } from '../types/pictograms';

type RawChildPictogramSetting = {
  child_profile_id: string;
  custom_label_et: string | null;
  is_enabled: boolean;
  is_favorite: boolean;
  pictogram_id: string;
  updated_at: string;
};

export async function fetchChildPictogramSettings(
  childProfileId: string | null
): Promise<ChildPictogramSetting[]> {
  if (!supabase || !childProfileId) {
    return [];
  }

  const { data, error } = await supabase
    .from('child_pictogram_settings')
    .select('child_profile_id, pictogram_id, is_enabled, is_favorite, custom_label_et, updated_at')
    .eq('child_profile_id', childProfileId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeChildPictogramSetting);
}

export async function saveChildPictogramSetting({
  childProfileId,
  customLabelEt,
  isEnabled,
  isFavorite,
  pictogramId,
}: {
  childProfileId: string;
  customLabelEt?: string | null;
  isEnabled: boolean;
  isFavorite: boolean;
  pictogramId: string;
}): Promise<ChildPictogramSetting> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { data, error } = await supabase
    .from('child_pictogram_settings')
    .upsert({
      child_profile_id: childProfileId,
      custom_label_et: normalizeCustomLabel(customLabelEt),
      is_enabled: isEnabled,
      is_favorite: isFavorite,
      pictogram_id: pictogramId,
      updated_at: new Date().toISOString(),
    })
    .select('child_profile_id, pictogram_id, is_enabled, is_favorite, custom_label_et, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeChildPictogramSetting(data);
}

function normalizeChildPictogramSetting(
  setting: RawChildPictogramSetting
): ChildPictogramSetting {
  return {
    child_profile_id: setting.child_profile_id,
    custom_label_et: setting.custom_label_et,
    is_enabled: setting.is_enabled,
    is_favorite: setting.is_favorite,
    pictogram_id: setting.pictogram_id,
    updated_at: setting.updated_at,
  };
}

function normalizeCustomLabel(value?: string | null) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}
