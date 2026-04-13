import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function CreateOuvrageScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ouvrage');
  const [prixHt, setPrixHt] = useState('0');
  const [unite, setUnite] = useState('forfait');
  const [tva, setTva] = useState('10');

  useEffect(() => {
    if (edit) {
      api.get(`/ouvrages/${edit}`).then(r => {
        const o = r.data;
        setNom(o.nom || '');
        setDescription(o.description || '');
        setType(o.type || 'ouvrage');
        setPrixHt(String(o.prix_ht || 0));
        setUnite(o.unite || 'forfait');
        setTva(String(o.tva || 10));
      }).catch(() => {});
    }
  }, [edit]);

  const types = [
    { value: 'main_oeuvre', label: 'Main d\'oeuvre', icon: 'construct' },
    { value: 'fourniture', label: 'Fourniture', icon: 'cube' },
    { value: 'ouvrage', label: 'Ouvrage', icon: 'build' },
  ];

  const unites = ['h', 'm²', 'ml', 'forfait', 'u'];

  async function handleSave() {
    if (!nom.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire'); return; }
    setLoading(true);
    try {
      const data = { nom, description, type, prix_ht: parseFloat(prixHt) || 0, unite, tva: parseFloat(tva) || 10 };
      if (edit) {
        await api.put(`/ouvrages/${edit}`, data);
      } else {
        await api.post('/ouvrages', data);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur');
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!edit) return;
    Alert.alert('Supprimer', 'Voulez-vous supprimer cet ouvrage ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.delete(`/ouvrages/${edit}`); router.back(); } catch {}
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{edit ? 'Modifier' : 'Nouvel'} ouvrage</Text>
          <TouchableOpacity testID="ouvrage-save-btn" onPress={handleSave} disabled={loading} style={styles.saveBtn}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Sauver</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {types.map(t => (
              <TouchableOpacity key={t.value} style={[styles.typeBtn, type === t.value && styles.typeBtnActive]} onPress={() => setType(t.value)}>
                <Ionicons name={t.icon as any} size={18} color={type === t.value ? '#FFF' : Colors.textSecondary} />
                <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Nom *</Text>
          <TextInput testID="ouvrage-nom-input" style={styles.input} value={nom} onChangeText={setNom} placeholder="Ex: Remplacement robinet" placeholderTextColor={Colors.textSecondary} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Description détaillée..." placeholderTextColor={Colors.textSecondary} multiline numberOfLines={3} />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Prix HT (€)</Text>
              <TextInput testID="ouvrage-prix-input" style={styles.input} value={prixHt} onChangeText={setPrixHt} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textSecondary} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>TVA (%)</Text>
              <TextInput style={styles.input} value={tva} onChangeText={setTva} keyboardType="numeric" placeholder="10" placeholderTextColor={Colors.textSecondary} />
            </View>
          </View>

          <Text style={styles.label}>Unité</Text>
          <View style={styles.chipRow}>
            {unites.map(u => (
              <TouchableOpacity key={u} style={[styles.chip, unite === u && styles.chipActive]} onPress={() => setUnite(u)}>
                <Text style={[styles.chipText, unite === u && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {edit && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteBtnText}>Supprimer cet ouvrage</Text>
            </TouchableOpacity>
          )}
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
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  typeBtnTextActive: { color: '#FFF' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfField: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  chipTextActive: { color: '#FFF' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.xl, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.error },
  deleteBtnText: { color: Colors.error, fontWeight: '600' },
});
