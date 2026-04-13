import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

type Line = { section: string; designation: string; quantite: number; unite: string; prix_ht: number; tva: number };

export default function CreateDevisScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ section: '', designation: '', quantite: 1, unite: 'u', prix_ht: 0, tva: 10 }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
  }, []);

  function addLine() {
    setLines([...lines, { section: '', designation: '', quantite: 1, unite: 'u', prix_ht: 0, tva: 10 }]);
  }

  function updateLine(index: number, field: keyof Line, value: any) {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  const totalHT = lines.reduce((s, l) => s + l.quantite * l.prix_ht, 0);
  const totalTVA = lines.reduce((s, l) => s + l.quantite * l.prix_ht * l.tva / 100, 0);
  const totalTTC = totalHT + totalTVA;

  async function handleAIGenerate() {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/generate-devis', { description: aiDescription });
      if (data.lignes && Array.isArray(data.lignes)) {
        setLines(data.lignes.map((l: any) => ({
          section: l.section || '',
          designation: l.designation || '',
          quantite: l.quantite || 1,
          unite: l.unite || 'u',
          prix_ht: l.prix_ht || 0,
          tva: l.tva || 10,
        })));
        if (data.notes) setNotes(data.notes);
        setMode('manual');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur de génération IA');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (lines.every(l => !l.designation.trim())) {
      Alert.alert('Erreur', 'Ajoutez au moins une ligne avec une désignation');
      return;
    }
    setLoading(true);
    try {
      await api.post('/devis', {
        client_id: selectedClientId || null,
        notes,
        lignes: lines.filter(l => l.designation.trim()),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="devis-create-back" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Nouveau devis</Text>
          <TouchableOpacity testID="devis-save-btn" onPress={handleSave} disabled={loading} style={styles.saveBtn}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Sauver</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity testID="mode-manual" style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]} onPress={() => setMode('manual')}>
              <Ionicons name="create-outline" size={18} color={mode === 'manual' ? '#FFF' : Colors.textSecondary} />
              <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>Manuel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="mode-ai" style={[styles.modeBtn, mode === 'ai' && styles.modeBtnActive]} onPress={() => setMode('ai')}>
              <Ionicons name="sparkles-outline" size={18} color={mode === 'ai' ? '#FFF' : Colors.textSecondary} />
              <Text style={[styles.modeBtnText, mode === 'ai' && styles.modeBtnTextActive]}>Assistant IA</Text>
            </TouchableOpacity>
          </View>

          {/* Client selector */}
          <Text style={styles.sectionLabel}>Client</Text>
          <TouchableOpacity testID="select-client-btn" style={styles.clientSelector} onPress={() => setShowClientPicker(!showClientPicker)}>
            <Text style={selectedClient ? styles.clientText : styles.clientPlaceholder}>
              {selectedClient ? `${selectedClient.nom} ${selectedClient.prenom || ''}` : 'Sélectionner un client'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          {showClientPicker && (
            <View style={styles.clientList}>
              <TouchableOpacity style={styles.clientOption} onPress={() => { setSelectedClientId(''); setShowClientPicker(false); }}>
                <Text style={styles.clientOptionText}>Aucun client</Text>
              </TouchableOpacity>
              {clients.map(c => (
                <TouchableOpacity key={c.id} style={styles.clientOption} onPress={() => { setSelectedClientId(c.id); setShowClientPicker(false); }}>
                  <Text style={styles.clientOptionText}>{c.nom} {c.prenom || ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* AI Mode */}
          {mode === 'ai' && (
            <View style={styles.aiSection}>
              <Text style={styles.sectionLabel}>Décrivez les travaux</Text>
              <TextInput
                testID="ai-description-input"
                style={styles.aiInput}
                value={aiDescription}
                onChangeText={setAiDescription}
                placeholder="Ex: Remplacement du chauffe-eau 200L dans la salle de bain, réparation de la fuite sur le robinet de cuisine, installation d'un WC suspendu..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={5}
              />
              <TouchableOpacity testID="ai-generate-btn" style={[styles.aiBtn, aiLoading && { opacity: 0.7 }]} onPress={handleAIGenerate} disabled={aiLoading}>
                {aiLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFF" />
                    <Text style={styles.aiBtnText}>Générer le devis</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Manual lines */}
          {mode === 'manual' && (
            <>
              <Text style={styles.sectionLabel}>Lignes du devis</Text>
              {lines.map((line, i) => (
                <View key={i} style={styles.lineCard}>
                  <View style={styles.lineHeader}>
                    <Text style={styles.lineNum}>Ligne {i + 1}</Text>
                    {lines.length > 1 && (
                      <TouchableOpacity onPress={() => removeLine(i)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput style={styles.lineInput} value={line.designation} onChangeText={(v) => updateLine(i, 'designation', v)} placeholder="Désignation" placeholderTextColor={Colors.textSecondary} />
                  <View style={styles.lineRow}>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>Qté</Text>
                      <TextInput style={styles.lineSmallInput} value={String(line.quantite)} onChangeText={(v) => updateLine(i, 'quantite', parseFloat(v) || 0)} keyboardType="numeric" />
                    </View>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>Unité</Text>
                      <TextInput style={styles.lineSmallInput} value={line.unite} onChangeText={(v) => updateLine(i, 'unite', v)} />
                    </View>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>Prix HT</Text>
                      <TextInput style={styles.lineSmallInput} value={String(line.prix_ht)} onChangeText={(v) => updateLine(i, 'prix_ht', parseFloat(v) || 0)} keyboardType="numeric" />
                    </View>
                    <View style={styles.lineField}>
                      <Text style={styles.lineFieldLabel}>TVA %</Text>
                      <TextInput style={styles.lineSmallInput} value={String(line.tva)} onChangeText={(v) => updateLine(i, 'tva', parseFloat(v) || 0)} keyboardType="numeric" />
                    </View>
                  </View>
                  <Text style={styles.lineTotal}>Total: {(line.quantite * line.prix_ht).toFixed(2)}€ HT</Text>
                </View>
              ))}
              <TouchableOpacity testID="add-line-btn" style={styles.addLineBtn} onPress={addLine}>
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.addLineText}>Ajouter une ligne</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Notes */}
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Notes ou conditions particulières..." placeholderTextColor={Colors.textSecondary} multiline numberOfLines={3} />

          {/* Totals */}
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text style={styles.totalValue}>{totalHT.toFixed(2)}€</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total TVA</Text>
              <Text style={styles.totalValue}>{totalTVA.toFixed(2)}€</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalFinalLabel}>Total TTC</Text>
              <Text style={styles.totalFinalValue}>{totalTTC.toFixed(2)}€</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  scroll: { padding: Spacing.md, paddingBottom: 60 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: '#FFF' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginTop: Spacing.md },
  clientSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  clientText: { fontSize: 15, color: Colors.textPrimary },
  clientPlaceholder: { fontSize: 15, color: Colors.textSecondary },
  clientList: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginTop: 4, maxHeight: 200 },
  clientOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  clientOptionText: { fontSize: 14, color: Colors.textPrimary },
  aiSection: {},
  aiInput: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, minHeight: 100, textAlignVertical: 'top' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', padding: Spacing.md, borderRadius: 10, marginTop: Spacing.sm },
  aiBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  lineCard: { backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineNum: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  lineInput: { backgroundColor: Colors.background, borderRadius: 8, padding: 10, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  lineRow: { flexDirection: 'row', gap: 6 },
  lineField: { flex: 1 },
  lineFieldLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2, fontWeight: '500' },
  lineSmallInput: { backgroundColor: Colors.background, borderRadius: 6, padding: 8, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'center' },
  lineTotal: { textAlign: 'right', marginTop: 8, fontSize: 14, fontWeight: '700', color: Colors.primary },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed' },
  addLineText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  totalsCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },
});
