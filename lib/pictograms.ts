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
  pictogram_symbol_variants?: RawPictogramSymbolVariant[] | null;
  sort_order: number;
};

type RawPictogramSymbolVariant = {
  image_url: string;
  symbol_set_code: string;
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

export async function fetchPictograms(options?: {
  preferredSymbolSetCode?: string | null;
}): Promise<Pictogram[]> {
  if (!supabase) {
    return [];
  }

  const preferredSymbolSetCode = options?.preferredSymbolSetCode?.trim() || 'hello';

  const { data, error } = await supabase
    .from('pictograms')
    .select(
      'created_by_user_id, id, category_id, image_url, is_custom, is_enabled, label_en, label_et, label_ru, sort_order, pictogram_symbol_variants(symbol_set_code, image_url)'
    )
    .eq('is_enabled', true)
    .order('sort_order');

  if (error?.code === 'PGRST200') {
    const legacyResult = await supabase
      .from('pictograms')
      .select(
        'created_by_user_id, id, category_id, image_url, is_custom, is_enabled, label_en, label_et, label_ru, sort_order'
      )
      .eq('is_enabled', true)
      .order('sort_order');

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return (legacyResult.data ?? []).map((pictogram) =>
      normalizePictogram(pictogram, preferredSymbolSetCode)
    );
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((pictogram) => normalizePictogram(pictogram, preferredSymbolSetCode));
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

  return normalizePictogram(data, 'hello');
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

function normalizePictogram(
  pictogram: RawPictogram,
  preferredSymbolSetCode: string
): Pictogram {
  const resolvedVariant = resolvePictogramVariant(
    pictogram.pictogram_symbol_variants ?? [],
    preferredSymbolSetCode,
    pictogram.image_url
  );

  return {
    created_by_user_id: pictogram.created_by_user_id,
    id: pictogram.id,
    category_id: pictogram.category_id,
    image_url: resolvedVariant.imageUrl,
    is_custom: pictogram.is_custom,
    is_enabled: pictogram.is_enabled,
    label_en: pictogram.label_en,
    label_et: pictogram.label_et,
    label_ru: pictogram.label_ru,
    resolved_symbol_set_code: resolvedVariant.symbolSetCode,
    sort_order: pictogram.sort_order,
  };
}

function resolvePictogramVariant(
  variants: RawPictogramSymbolVariant[],
  preferredSymbolSetCode: string,
  fallbackImageUrl: string | null
) {
  const normalizedPreferredSymbolSetCode = preferredSymbolSetCode.trim().toLowerCase();
  const preferredVariant =
    variants.find((variant) => variant.symbol_set_code === normalizedPreferredSymbolSetCode) ?? null;
  const helloVariant = variants.find((variant) => variant.symbol_set_code === 'hello') ?? null;
  const resolvedVariant = preferredVariant ?? helloVariant ?? null;

  return {
    imageUrl: resolvedVariant?.image_url ?? fallbackImageUrl,
    symbolSetCode: resolvedVariant?.symbol_set_code ?? 'hello',
  };
}
