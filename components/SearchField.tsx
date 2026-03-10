import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type SearchFieldProps = {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchField({ onChangeText, placeholder, value }: SearchFieldProps) {
  const hasValue = value.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputShell}>
        <Text style={styles.icon}>Otsi</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9c8d73"
          style={styles.input}
          value={value}
        />
        {hasValue ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tuhjenda otsing"
            onPress={() => onChangeText('')}
            style={({ pressed }) => [styles.clearButton, pressed ? styles.clearButtonPressed : null]}
          >
            <Text style={styles.clearButtonText}>X</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfd0b6',
    backgroundColor: '#fff8ee',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    gap: 10,
  },
  icon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8d7553',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2d2417',
    paddingVertical: 12,
  },
  clearButton: {
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#efe5d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    opacity: 0.88,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5a4d3a',
    textTransform: 'uppercase',
  },
});
