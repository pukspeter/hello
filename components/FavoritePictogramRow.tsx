import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getPictogramDisplayLabel } from '../lib/pictogram-labels';
import type { Pictogram } from '../types/pictograms';

type FavoritePictogramRowProps = {
  getCustomLabelEt?: (pictogram: Pictogram) => string | null;
  pictograms: Pictogram[];
  onPressPictogram: (pictogram: Pictogram) => void;
  preferredLanguage?: string | null;
};

export function FavoritePictogramRow({
  getCustomLabelEt,
  pictograms,
  onPressPictogram,
  preferredLanguage,
}: FavoritePictogramRowProps) {
  if (pictograms.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Lemmikpildid</Text>
        <Text style={styles.meta}>{pictograms.length} kiirvalikut</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {pictograms.map((pictogram) => {
          const displayLabel = getPictogramDisplayLabel(
            pictogram,
            preferredLanguage,
            getCustomLabelEt?.(pictogram) ?? null
          );

          return (
            <Pressable
              key={pictogram.id}
              accessibilityRole="button"
              accessibilityLabel={`Lisa lemmikpiktogramm ${displayLabel}`}
              onPress={() => onPressPictogram(pictogram)}
              style={({ pressed }) => [
                styles.card,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <View style={styles.artwork}>
                {pictogram.image_url ? (
                  <Image source={{ uri: pictogram.image_url }} style={styles.image} resizeMode="contain" />
                ) : (
                  <Text style={styles.placeholder}>
                    {displayLabel.slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.label}>{displayLabel}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c2418',
  },
  meta: {
    fontSize: 14,
    color: '#7a6a4f',
  },
  row: {
    gap: 12,
    paddingRight: 12,
  },
  card: {
    width: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e6dcc9',
    backgroundColor: '#fffdf8',
    padding: 12,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.92,
  },
  artwork: {
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 24,
    fontWeight: '800',
    color: '#7d5d2f',
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2417',
    textAlign: 'center',
  },
});
