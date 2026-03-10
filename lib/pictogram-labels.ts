import type { Pictogram } from '../types/pictograms';

const ET_DISPLAY_LABEL_BY_KEY: Record<string, string> = {
  abi: 'abi',
  'ei taha': 'ei taha',
  ei: 'ei',
  ema: 'ema',
  hambapesu: 'hambapesu',
  'head und': 'head und',
  hommikuring: 'hommikuring',
  isa: 'isa',
  jah: 'jah',
  juua: 'juua',
  kool: 'kool',
  koju: 'koju',
  kupsetama: 'küpsetama',
  kurb: 'kurb',
  magama: 'magama',
  mangima: 'mängima',
  opetaja: 'õpetaja',
  paus: 'paus',
  pidzaama: 'pidžaama',
  rahulik: 'rahulik',
  roomus: 'rõõmus',
  sooma: 'sööma',
  syya: 'süüa',
  tahan: 'tahan',
  uhislaulmine: 'ühislaulmine',
  valjasoit: 'väljasõit',
  valus: 'valus',
  vanaema: 'vanaema',
  veel: 'veel',
  vihane: 'vihane',
  voodisse: 'voodisse',
};

export function getPictogramDisplayLabel(
  pictogram: Pick<Pictogram, 'label_en' | 'label_et' | 'label_ru'>,
  preferredLanguage?: string | null,
  customLabelEt?: string | null
) {
  const normalizedLanguage = preferredLanguage?.trim().toLowerCase() ?? 'et';
  const normalizedCustomLabel = customLabelEt?.trim();

  if (normalizedLanguage.startsWith('en') && pictogram.label_en?.trim()) {
    return pictogram.label_en.trim();
  }

  if (normalizedLanguage.startsWith('ru') && pictogram.label_ru?.trim()) {
    return pictogram.label_ru.trim();
  }

  if (normalizedCustomLabel) {
    return normalizedCustomLabel;
  }

  return ET_DISPLAY_LABEL_BY_KEY[pictogram.label_et] ?? pictogram.label_et;
}
