import { supabase } from './supabase';
import type {
  CustomPictogramInput,
  Pictogram,
  PictogramCategory,
} from '../types/pictograms';

type RawPictogramCategory = {
  id: string;
  name: string;
  sort_order: number;
};

type RawPictogram = {
  created_by_user_id: string | null;
  id: string;
  category_id: string | null;
  image_url: string | null;
  is_custom: boolean;
  is_enabled: boolean;
  label_en: string | null;
  label_et: string;
  label_ru: string | null;
  sort_order: number;
};

export async function fetchPictogramCategories(): Promise<PictogramCategory[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('pictogram_categories')
    .select('id, name, sort_order')
    .order('sort_order');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    sort_order: category.sort_order,
  }));
}

export async function fetchPictograms(): Promise<Pictogram[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('pictograms')
    .select(
      'created_by_user_id, id, category_id, image_url, is_custom, is_enabled, label_en, label_et, label_ru, sort_order'
    )
    .eq('is_enabled', true)
    .order('sort_order');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizePictogram);
}

export async function createCustomPictogram(
  input: CustomPictogramInput
): Promise<Pictogram> {
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
    throw new Error('Custom piktogrammi loomiseks peab caregiver olema sisse logitud.');
  }

  const normalizedLabel = input.labelEt.trim();

  const { data, error } = await supabase
    .from('pictograms')
    .insert({
      category_id: input.categoryId,
      created_by_user_id: user.id,
      is_custom: true,
      is_enabled: true,
      label_et: normalizedLabel,
      sort_order: Math.floor(Date.now() / 1000),
    })
    .select(
      'created_by_user_id, id, category_id, image_url, is_custom, is_enabled, label_en, label_et, label_ru, sort_order'
    )
    .single();

  if (error) {
    throw new Error(formatCreateCustomPictogramError(error, normalizedLabel));
  }

  return normalizePictogram(data);
}

function formatCreateCustomPictogramError(
  error: {
    code?: string;
    message: string;
  },
  label: string
) {
  if (error.code === '23505') {
    return `Piktogramm nimega "${label}" on sul juba olemas. Kasuta olemasolevat rida voi vali teine nimi.`;
  }

  return error.message;
}

function normalizePictogram(pictogram: RawPictogram): Pictogram {
  return {
    created_by_user_id: pictogram.created_by_user_id,
    id: pictogram.id,
    category_id: pictogram.category_id,
    image_url: pictogram.image_url,
    is_custom: pictogram.is_custom,
    is_enabled: pictogram.is_enabled,
    label_en: pictogram.label_en,
    label_et: pictogram.label_et,
    label_ru: pictogram.label_ru,
    sort_order: pictogram.sort_order,
  };
}
