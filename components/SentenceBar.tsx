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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d2417',
  },
  caption: {
    fontSize: 14,
    color: '#7c6d55',
  },
  emptyState: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#f5ecdc',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6f6047',
  },
  content: {
    gap: 12,
    paddingTop: 12,
    paddingRight: 8,
  },
  card: {
    width: 132,
    borderRadius: 22,
    backgroundColor: '#eef4e3',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#d7e2c1',
  },
  cardPressed: {
    backgroundColor: '#e2ecd3',
    transform: [{ scale: 0.98 }],
  },
  artwork: {
    height: 80,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
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
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#23301a',
  },
  removeMark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#466035',
  },
});
