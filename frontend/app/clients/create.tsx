import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function CreateClientScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [adresse, setAdresse] = useState('');
  const [type, setType] = useState('particulier');
  const [notes, setNotes] = useState('');

  async function handleSave() {
    if (!nom.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire'); return; }
    setLoading(true);
    try {
      await api.post('/clients', { nom, prenom, email, tel, adresse, type, notes });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="client-create-back" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Nouveau client</Text>
          <TouchableOpacity testID="client-save-btn" onPress={handleSave} disabled={loading} style={styles.saveBtn}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Sauver</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.typeRow}>
            <TouchableOpacity style={[styles.typeBtn, type === 'particulier' && styles.typeBtnActive]} onPress={() => setType('particulier')}>
              <Text style={[styles.typeBtnText, type === 'particulier' && styles.typeBtnTextActive]}>Particulier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeBtn, type === 'professionnel' && styles.typeBtnActive]} onPress={() => setType('professionnel')}>
              <Text style={[styles.typeBtnText, type === 'professionnel' && styles.typeBtnTextActive]}>Professionnel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nom *</Text>
          <TextInput testID="client-nom-input" style={styles.input} value={nom} onChangeText={setNom} placeholder="Dupont" placeholderTextColor={Colors.textSecondary} />

          <Text style={styles.label}>Prénom</Text>
          <TextInput testID="client-prenom-input" style={styles.input} value={prenom} onChangeText={setPrenom} placeholder="Jean" placeholderTextColor={Colors.textSecondary} />

          <Text style={styles.label}>Email</Text>
          <TextInput testID="client-email-input" style={styles.input} value={email} onChangeText={setEmail} placeholder="jean@example.com" placeholderTextColor={Colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput testID="client-tel-input" style={styles.input} value={tel} onChangeText={setTel} placeholder="06 12 34 56 78" placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" />

          <Text style={styles.label}>Adresse</Text>
          <TextInput testID="client-adresse-input" style={styles.input} value={adresse} onChangeText={setAdresse} placeholder="12 rue de la Plomberie, 75001 Paris" placeholderTextColor={Colors.textSecondary} />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Notes sur le client..." placeholderTextColor={Colors.textSecondary} multiline numberOfLines={3} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  scroll: { padding: Spacing.md },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeBtnTextActive: { color: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
