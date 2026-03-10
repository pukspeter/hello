import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ChildProfile } from '../types/pictograms';

type ChildProfileSelectorProps = {
  activeChildProfileId: string | null;
  profiles: ChildProfile[];
  onSelectProfile: (profileId: string) => void;
};

export function ChildProfileSelector({
  activeChildProfileId,
  profiles,
  onSelectProfile,
}: ChildProfileSelectorProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Aktiivne laps</Text>
        <Text style={styles.meta}>{profiles.length} profiili</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={`Vali profiil ${profile.name}`}
            onPress={() => onSelectProfile(profile.id)}
            style={({ pressed }) => [
              styles.card,
              activeChildProfileId === profile.id ? styles.cardActive : null,
              pressed ? styles.cardPressed : null,
            ]}
          >
            <Text style={[styles.name, activeChildProfileId === profile.id ? styles.nameActive : null]}>
              {profile.name}
            </Text>
            <Text style={[styles.language, activeChildProfileId === profile.id ? styles.languageActive : null]}>
              Keel: {profile.preferred_language.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 8,
    paddingRight: 8,
  },
  card: {
    minWidth: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    backgroundColor: '#fff8ee',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  cardActive: {
    backgroundColor: '#304b34',
    borderColor: '#304b34',
  },
  cardPressed: {
    opacity: 0.9,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d2417',
  },
  nameActive: {
    color: '#f8f6f1',
  },
  language: {
    fontSize: 13,
    color: '#7a6a4f',
  },
  languageActive: {
    color: '#e7efe5',
  },
});
