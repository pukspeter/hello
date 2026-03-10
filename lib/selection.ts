import type { Pictogram, SelectedPictogramItem, SentenceGenerationInput } from '../types/pictograms';

export function createSelectedPictogramItem(
  pictogram: Pictogram,
  nextOrder: number,
  displayLabel = pictogram.label_et,
  aiLabel = pictogram.label_et
): SelectedPictogramItem {
  return {
    id: `${pictogram.id}-${Date.now()}-${nextOrder}`,
    pictogramId: pictogram.id,
    categoryId: pictogram.category_id,
    displayLabel,
    imageUrl: pictogram.image_url,
    label: aiLabel,
    order: nextOrder,
  };
}

export function reorderSelectedPictograms(
  items: SelectedPictogramItem[]
): SelectedPictogramItem[] {
  return items.map((item, index) => ({
    ...item,
    order: index,
  }));
}

export function toSentenceGenerationInput(
  items: SelectedPictogramItem[]
): SentenceGenerationInput {
  return {
    pictograms: items.map((item) => ({
      id: item.pictogramId,
      label: item.label,
      categoryId: item.categoryId,
      order: item.order,
    })),
  };
}
