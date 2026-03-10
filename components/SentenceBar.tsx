import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SelectedPictogramItem } from '../types/pictograms';

type SentenceBarProps = {
  items: SelectedPictogramItem[];
  onRemove: (id: string) => void;
};

export function SentenceBar({ items, onRemove }: SentenceBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Valitud lause</Text>
        <Text style={styles.caption}>{items.length === 0 ? 'Vali pildid alt.' : `${items.length} valitud`}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Puuduta suurt kaarti, et lisada s6na lauseribale.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Eemalda ${item.displayLabel} valitud lausest`}
              onPress={() => onRemove(item.id)}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            >
              <View style={styles.artwork}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
                ) : (
                  <Text style={styles.placeholder}>{item.displayLabel.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.labelRow}>
                <Text style={styles.cardLabel}>{item.displayLabel}</Text>
                <Text style={styles.removeMark}>x</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff9ee',
    borderTopWidth: 1,
    borderColor: '#e7dcc7',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2d2417',
  },
  caption: {
    fontSize: 15,
    color: '#7c6d55',
  },
  emptyState: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: '#f5ecdc',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6f6047',
  },
  content: {
    gap: 16,
    paddingTop: 16,
    paddingRight: 8,
  },
  card: {
    width: 176,
    minHeight: 214,
    borderRadius: 26,
    backgroundColor: '#eef4e3',
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#d7e2c1',
  },
  cardPressed: {
    backgroundColor: '#e2ecd3',
    transform: [{ scale: 0.98 }],
  },
  artwork: {
    height: 126,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 32,
    fontWeight: '800',
    color: '#49613a',
    letterSpacing: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardLabel: {
    flex: 1,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    color: '#23301a',
  },
  removeMark: {
    fontSize: 24,
    fontWeight: '700',
    color: '#466035',
  },
});
