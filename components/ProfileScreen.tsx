import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChildProfileSelector } from './ChildProfileSelector';
import type { ChildProfile, ChildProfileInput } from '../types/pictograms';

const SYMBOL_SET_OPTIONS = [
  { code: 'hello', label: 'HELLO' },
  { code: 'pcs', label: 'PCS' },
  { code: 'arasaac', label: 'ARASAAC' },
] as const;

type ProfileScreenProps = {
  activeChildProfileId: string | null;
  caregiverEmail: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isSigningOut: boolean;
  onCreateProfile: (input: ChildProfileInput) => Promise<void>;
  onSelectProfile: (profileId: string) => void;
  onSignOut: () => Promise<void>;
  onUpdateProfile: (profileId: string, input: ChildProfileInput) => Promise<void>;
  profiles: ChildProfile[];
};

const DEFAULT_FORM: ChildProfileInput = {
  name: '',
  notes: '',
  preferred_language: 'et',
  preferred_symbol_set_code: 'hello',
};

export function ProfileScreen({
  activeChildProfileId,
  caregiverEmail,
  errorMessage,
  isLoading,
  isSaving,
  isSigningOut,
  onCreateProfile,
  onSelectProfile,
  onSignOut,
  onUpdateProfile,
  profiles,
}: ProfileScreenProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeChildProfileId) ?? null;
  const [draftProfileId, setDraftProfileId] = useState<string | null>(activeChildProfileId);
  const [formError, setFormError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<ChildProfileInput>(DEFAULT_FORM);

  useEffect(() => {
    if (!activeProfile) {
      setDraftProfileId(null);
      setFormValues(DEFAULT_FORM);
      return;
    }

    setDraftProfileId(activeProfile.id);
    setFormValues({
      name: activeProfile.name,
      notes: activeProfile.notes ?? '',
      preferred_language: activeProfile.preferred_language,
      preferred_symbol_set_code: activeProfile.preferred_symbol_set_code,
    });
  }, [activeProfile]);

  const handleStartCreate = () => {
    setFormError(null);
    setDraftProfileId(null);
    setFormValues(DEFAULT_FORM);
  };

  const handleSelectProfile = (profileId: string) => {
    setFormError(null);
    onSelectProfile(profileId);
  };

  const handleSave = async () => {
    if (!formValues.name.trim()) {
      setFormError('Child name on kohustuslik.');
      return;
    }

    setFormError(null);

    if (draftProfileId) {
      await onUpdateProfile(draftProfileId, formValues);
      return;
    }

    await onCreateProfile(formValues);
  };

  const isCreateMode = draftProfileId === null;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>Loo ja halda child profile kirjeid.</Text>
        <Text style={styles.subtitle}>
          Caregiver saab siin uusi lapsi lisada, olemasolevaid muuta ja aktiivset profiili valida.
        </Text>
      </View>

      <View style={styles.accountCard}>
        <Text style={styles.accountLabel}>Sisselogitud caregiver</Text>
        <Text style={styles.accountValue}>{caregiverEmail ?? 'Unknown'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Logi valja"
          disabled={isSigningOut}
          onPress={onSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            isSigningOut ? styles.signOutButtonDisabled : null,
            pressed && !isSigningOut ? styles.newButtonPressed : null,
          ]}
        >
          <Text style={styles.signOutButtonText}>
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Profiilide laadimine ebaonnestus</Text>
          <Text style={styles.messageText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Laen child profile andmeid...</Text>
        </View>
      ) : null}

      {!isLoading && profiles.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Profiile ei leitud</Text>
          <Text style={styles.messageText}>
            Loo esimene child profile alloleva vormiga.
          </Text>
        </View>
      ) : null}

      <ChildProfileSelector
        activeChildProfileId={activeChildProfileId}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>
            {isCreateMode ? 'Uus child profile' : 'Muuda aktiivset child profile'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Loo uus child profile"
            onPress={handleStartCreate}
            style={({ pressed }) => [
              styles.newButton,
              pressed ? styles.newButtonPressed : null,
            ]}
          >
            <Text style={styles.newButtonText}>Create new child</Text>
          </Pressable>
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Child name</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={(value) => setFormValues((current) => ({ ...current, name: value }))}
            placeholder="Kevin"
            placeholderTextColor="#9c8d73"
            style={styles.input}
            value={formValues.name}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Preferred language</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) =>
              setFormValues((current) => ({ ...current, preferred_language: value }))
            }
            placeholder="et"
            placeholderTextColor="#9c8d73"
            style={styles.input}
            value={formValues.preferred_language}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sümbolikomplekt</Text>
          <Text style={styles.symbolSetTitle}>Vali lapsele sobiv pildistiil.</Text>
          <Text style={styles.symbolSetDescription}>
            Sama mõiste saab tulevikus kasutada eri piktogrammistiile, näiteks HELLO, PCS või
            ARASAAC.
          </Text>
          <View style={styles.symbolSetRow}>
            {SYMBOL_SET_OPTIONS.map((option) => {
              const isSelected =
                (formValues.preferred_symbol_set_code ?? 'hello') === option.code;

              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="button"
                  accessibilityLabel={`Vali sumbolikomplekt ${option.label}`}
                  onPress={() =>
                    setFormValues((current) => ({
                      ...current,
                      preferred_symbol_set_code: option.code,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.symbolSetOption,
                    isSelected ? styles.symbolSetOptionSelected : null,
                    pressed ? styles.newButtonPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.symbolSetOptionText,
                      isSelected ? styles.symbolSetOptionTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.symbolSetHint}>
            Kui valitud komplektil pole veel koiki pilte olemas, kasutab app automaatselt
            HELLO varianti.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            multiline
            onChangeText={(value) => setFormValues((current) => ({ ...current, notes: value }))}
            placeholder="Likes trains, uses short prompts..."
            placeholderTextColor="#9c8d73"
            style={[styles.input, styles.notesInput]}
            textAlignVertical="top"
            value={formValues.notes ?? ''}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCreateMode ? 'Save new child profile' : 'Save child profile changes'}
          disabled={isSaving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            isSaving ? styles.saveButtonDisabled : null,
            pressed && !isSaving ? styles.saveButtonPressed : null,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : isCreateMode ? 'Create child profile' : 'Save changes'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 28,
    backgroundColor: '#f7f2e8',
  },
  hero: {
    backgroundColor: '#fbf7ef',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#8d7553',
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#241c12',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 26,
    color: '#5f513d',
  },
  messageCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 18,
    marginBottom: 16,
  },
  accountCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ecdcc0',
    padding: 18,
    marginBottom: 16,
  },
  accountLabel: {
    fontSize: 14,
    color: '#7a6a4f',
    marginBottom: 8,
  },
  accountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2d2417',
    marginBottom: 12,
  },
  signOutButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#8f3b2e',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  signOutButtonDisabled: {
    backgroundColor: '#c7b8ab',
  },
  signOutButtonText: {
    color: '#fff8f4',
    fontSize: 14,
    fontWeight: '800',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3a2d1f',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#66563f',
  },
  summaryCard: {
    marginTop: 18,
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dcc8',
    padding: 18,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2d2417',
    flex: 1,
  },
  newButton: {
    borderRadius: 999,
    backgroundColor: '#53745a',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  newButtonPressed: {
    opacity: 0.9,
  },
  newButtonText: {
    color: '#f8f6f1',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9f1239',
    marginBottom: 12,
  },
  field: {
    marginBottom: 14,
  },
  symbolSetTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2417',
    marginBottom: 6,
  },
  symbolSetDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6f6049',
    marginBottom: 10,
  },
  symbolSetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symbolSetOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dfd0b6',
    backgroundColor: '#fff8ee',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  symbolSetOptionSelected: {
    borderColor: '#2aa89b',
    backgroundColor: '#e8f7f4',
  },
  symbolSetOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f513d',
  },
  symbolSetOptionTextSelected: {
    color: '#156b63',
  },
  symbolSetHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#7a6a4f',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f513d',
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfd0b6',
    backgroundColor: '#fff8ee',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#2d2417',
  },
  notesInput: {
    minHeight: 110,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#304b34',
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#a8b5a2',
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: '#f8f6f1',
    fontSize: 16,
    fontWeight: '800',
  },
});
