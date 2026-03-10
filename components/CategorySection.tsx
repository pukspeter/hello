import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PictogramCategory } from '../types/pictograms';

type CategorySectionProps = {
  activeCategoryId: string;
  allCategoryId: string;
  categories: PictogramCategory[];
  pictogramCount: number;
  onSelectCategory: (categoryId: string) => void;
};

export function CategorySection({
  activeCategoryId,
  allCategoryId,
  categories,
  pictogramCount,
  onSelectCategory,
}: CategorySectionProps) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kategooriad</Text>
        <Text style={styles.sectionMeta}>{pictogramCount} piktogrammi</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroller}
      >
        <CategoryChip
          isActive={activeCategoryId === allCategoryId}
          label="Koik"
          onPress={() => onSelectCategory(allCategoryId)}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            isActive={activeCategoryId === category.id}
            label={category.name}
            onPress={() => onSelectCategory(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type CategoryChipProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function CategoryChip({ isActive, label, onPress }: CategoryChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Vali kategooria ${label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        isActive ? styles.categoryChipActive : null,
        pressed ? styles.categoryChipPressed : null,
      ]}
    >
      <Text style={[styles.categoryChipText, isActive ? styles.categoryChipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c2418',
  },
  sectionMeta: {
    fontSize: 14,
    color: '#7a6a4f',
  },
  categoryScroller: {
    marginBottom: 22,
  },
  categoryRow: {
    gap: 12,
    paddingRight: 16,
  },
  categoryChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#efe5d3',
  },
  categoryChipActive: {
    backgroundColor: '#304b34',
  },
  categoryChipPressed: {
    opacity: 0.88,
  },
  categoryChipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5a4d3a',
  },
  categoryChipTextActive: {
    color: '#f8f6f1',
  },
});
