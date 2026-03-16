import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type PictogramCardProps = {
  categoryName?: string | null;
  imageUrl?: string | null;
  label: string;
  onPress: () => void;
};

export function PictogramCard({ categoryName, imageUrl, label, onPress }: PictogramCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        categoryName ? `Lisa piktogramm ${label}, kategooria ${categoryName}` : `Lisa piktogramm ${label}`
      }
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.artwork}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.placeholder}>{label.slice(0, 2).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.footer}>
        {categoryName ? <Text style={styles.category}>{categoryName}</Text> : null}
        <Text ellipsizeMode="tail" numberOfLines={2} style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffdf8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e6dcc9',
    aspectRatio: 1,
    padding: 12,
    justifyContent: 'flex-start',
    shadowColor: '#7c5b2f',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#f6efde',
  },
  artwork: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#fcfbf8',
    overflow: 'hidden',
    padding: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7d5d2f',
    letterSpacing: 1,
  },
  footer: {
    gap: 4,
    paddingTop: 10,
    minHeight: 54,
    justifyContent: 'flex-end',
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: '#8d7553',
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2417',
    textAlign: 'center',
    flexShrink: 1,
  },
});
