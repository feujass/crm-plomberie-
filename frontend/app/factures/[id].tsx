import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, StatusColors, StatusLabels } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function FactureDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [facture, setFacture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('virement');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => { if (id) loadFacture(); }, [id]);

  async function loadFacture() {
    try {
      const { data } = await api.get(`/factures/${id}`);
      setFacture(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function addPayment() {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setPayLoading(true);
    try {
      await api.post(`/factures/${id}/paiements`, { montant: parseFloat(payAmount), mode: payMode });
      setShowPayment(false);
      setPayAmount('');
      loadFacture();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur');
    } finally { setPayLoading(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!facture) return <View style={styles.center}><Text>Facture non trouvée</Text></View>;

  const sc = StatusColors[facture.statut] || StatusColors.emise;
  const resteADu = (facture.total_ttc || 0) - (facture.montant_paye || 0);
  const modes = ['virement', 'cheque', 'especes', 'cb'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="facture-detail-back" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{facture.numero}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{StatusLabels[facture.statut] || facture.statut}</Text>
          </View>
        </View>

        <Text style={styles.clientName}>{facture.client_nom || 'Sans client'}</Text>

        {/* Payment summary */}
        <View style={styles.paymentSummary}>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Total TTC</Text>
            <Text style={styles.payValue}>{(facture.total_ttc || 0).toFixed(2)}€</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Payé</Text>
            <Text style={[styles.payValue, { color: Colors.success }]}>{(facture.montant_paye || 0).toFixed(2)}€</Text>
          </View>
          <View style={[styles.payRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 }]}>
            <Text style={styles.payLabelBold}>Reste à payer</Text>
            <Text style={[styles.payValueBold, resteADu > 0 ? { color: Colors.error } : { color: Colors.success }]}>{resteADu.toFixed(2)}€</Text>
          </View>
        </View>

        {/* Add payment */}
        {resteADu > 0 && (
          <TouchableOpacity testID="add-payment-btn" style={styles.addPayBtn} onPress={() => setShowPayment(!showPayment)}>
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.addPayBtnText}>Enregistrer un paiement</Text>
          </TouchableOpacity>
        )}

        {showPayment && (
          <View style={styles.paymentForm}>
            <Text style={styles.formLabel}>Montant (€)</Text>
            <TextInput testID="payment-amount-input" style={styles.input} value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" placeholder={resteADu.toFixed(2)} placeholderTextColor={Colors.textSecondary} />
            <Text style={styles.formLabel}>Mode de paiement</Text>
            <View style={styles.chipRow}>
              {modes.map(m => (
                <TouchableOpacity key={m} style={[styles.chip, payMode === m && styles.chipActive]} onPress={() => setPayMode(m)}>
                  <Text style={[styles.chipText, payMode === m && styles.chipTextActive]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity testID="confirm-payment-btn" style={styles.confirmPayBtn} onPress={addPayment} disabled={payLoading}>
              {payLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmPayBtnText}>Confirmer</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Lines */}
        <Text style={styles.sectionTitle}>Prestations</Text>
        {(facture.lignes || []).map((l: any, i: number) => (
          <View key={i} style={styles.lineCard}>
            <Text style={styles.lineDesign}>{l.designation}</Text>
            <View style={styles.lineDetails}>
              <Text style={styles.lineQty}>{l.quantite} {l.unite}</Text>
              <Text style={styles.lineTotal}>{(l.total_ht || l.quantite * l.prix_ht).toFixed(2)}€</Text>
            </View>
          </View>
        ))}

        {/* Payments history */}
        {(facture.paiements || []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Historique paiements</Text>
            {facture.paiements.map((p: any, i: number) => (
              <View key={i} style={styles.payHistoryRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.payHistoryText}>{p.montant.toFixed(2)}€ - {p.mode}</Text>
                <Text style={styles.payHistoryDate}>{p.date ? new Date(p.date).toLocaleDateString('fr-FR') : ''}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  statusRow: { marginBottom: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  clientName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  paymentSummary: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  payLabel: { fontSize: 14, color: Colors.textSecondary },
  payValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  payLabelBold: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  payValueBold: { fontSize: 18, fontWeight: '900' },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, padding: 14, borderRadius: 10, marginBottom: Spacing.md },
  addPayBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  paymentForm: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  formLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 8, padding: 12, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  chipTextActive: { color: '#FFF' },
  confirmPayBtn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  confirmPayBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginTop: Spacing.md },
  lineCard: { backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  lineDesign: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  lineDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  lineQty: { fontSize: 13, color: Colors.textSecondary },
  lineTotal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  payHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  payHistoryText: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  payHistoryDate: { fontSize: 13, color: Colors.textSecondary },
});
