import type { Pictogram } from '../types/pictograms';

type PictogramSearchInput = {
  categoryName?: string | null;
  displayLabel?: string | null;
  pictogram: Pictogram;
};

export function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function pictogramMatchesSearch(
  { categoryName, displayLabel, pictogram }: PictogramSearchInput,
  query: string
) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const haystack = normalizeSearchValue(
    [
      displayLabel,
      pictogram.label_et,
      pictogram.label_en,
      pictogram.label_ru,
      categoryName,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
  );

  return tokens.every((token) => haystack.includes(token));
}
