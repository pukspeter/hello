import { Image, StyleSheet, Text, View } from 'react-native';

export type SentencePictogramStripItem = {
  id: string;
  imageUrl: string | null;
  isMissingRecord?: boolean;
  label: string;
};

type SentencePictogramStripProps = {
  items: SentencePictogramStripItem[];
};

export function SentencePictogramStrip({ items }: SentencePictogramStripProps) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Selle lause jaoks ei olnud salvestatud piktogramme.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {items.map((item) => (
        <View
          key={item.id}
          style={[
            styles.card,
            item.isMissingRecord ? styles.cardMissing : null,
          ]}
        >
          <View style={styles.artwork}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <Text style={styles.placeholder}>
                {item.isMissingRecord ? '?' : item.label.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  emptyState: {
    marginTop: 14,
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
  card: {
    width: 128,
    minHeight: 158,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e4d8c3',
    backgroundColor: '#fbf8ef',
    padding: 12,
    gap: 10,
  },
  cardMissing: {
    backgroundColor: '#f6eee2',
    borderColor: '#e2d0b8',
  },
  artwork: {
    height: 92,
    borderRadius: 18,
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
    fontSize: 30,
    fontWeight: '800',
    color: '#7d5d2f',
  },
  label: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2d2417',
    textAlign: 'center',
  },
});
