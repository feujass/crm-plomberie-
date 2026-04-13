import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, StatusColors, StatusLabels } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function DevisDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [devis, setDevis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDevis();
  }, [id]);

  async function loadDevis() {
    try {
      const { data } = await api.get(`/devis/${id}`);
      setDevis(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function updateStatus(statut: string) {
    try {
      await api.put(`/devis/${id}`, { statut });
      loadDevis();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur');
    }
  }

  async function convertToFacture() {
    try {
      await api.post(`/factures/from-devis/${id}`);
      Alert.alert('Succès', 'Facture créée avec succès');
      loadDevis();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.detail || 'Erreur');
    }
  }

  async function handleDelete() {
    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer ce devis ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await api.delete(`/devis/${id}`); router.back(); } catch {}
      }},
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!devis) return <View style={styles.center}><Text>Devis non trouvé</Text></View>;

  const sc = StatusColors[devis.statut] || StatusColors.brouillon;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="devis-detail-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{devis.numero}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status & Info */}
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{StatusLabels[devis.statut] || devis.statut}</Text>
          </View>
          <Text style={styles.date}>{devis.created_at ? new Date(devis.created_at).toLocaleDateString('fr-FR') : ''}</Text>
        </View>

        <Text style={styles.clientName}>{devis.client_nom || 'Sans client'}</Text>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {devis.statut === 'brouillon' && (
            <TouchableOpacity testID="mark-sent-btn" style={[styles.actionBtn, { backgroundColor: Colors.info }]} onPress={() => updateStatus('envoye')}>
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Envoyer</Text>
            </TouchableOpacity>
          )}
          {devis.statut === 'envoye' && (
            <>
              <TouchableOpacity testID="mark-accepted-btn" style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => updateStatus('accepte')}>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error }]} onPress={() => updateStatus('refuse')}>
                <Ionicons name="close" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Refuser</Text>
              </TouchableOpacity>
            </>
          )}
          {devis.statut === 'accepte' && (
            <TouchableOpacity testID="convert-to-facture-btn" style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]} onPress={convertToFacture}>
              <Ionicons name="receipt" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Facturer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lines */}
        <Text style={styles.sectionTitle}>Prestations</Text>
        {(devis.lignes || []).map((l: any, i: number) => (
          <View key={i} style={styles.lineCard}>
            {l.section ? <Text style={styles.lineSection}>{l.section}</Text> : null}
            <Text style={styles.lineDesign}>{l.designation}</Text>
            <View style={styles.lineDetails}>
              <Text style={styles.lineQty}>{l.quantite} {l.unite}</Text>
              <Text style={styles.linePrice}>{(l.prix_ht || 0).toFixed(2)}€</Text>
              <Text style={styles.lineTotal}>{(l.total_ht || l.quantite * l.prix_ht).toFixed(2)}€</Text>
            </View>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HT</Text>
            <Text style={styles.totalValue}>{(devis.total_ht || 0).toFixed(2)}€</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total TVA</Text>
            <Text style={styles.totalValue}>{(devis.total_tva || 0).toFixed(2)}€</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalFinalLabel}>Total TTC</Text>
            <Text style={styles.totalFinalValue}>{(devis.total_ttc || 0).toFixed(2)}€</Text>
          </View>
        </View>

        {devis.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{devis.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 13, color: Colors.textSecondary },
  clientName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: Spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  lineCard: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  lineSection: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 4, textTransform: 'uppercase' },
  lineDesign: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  lineDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  lineQty: { fontSize: 13, color: Colors.textSecondary },
  linePrice: { fontSize: 13, color: Colors.textSecondary },
  lineTotal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalsCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  notesCard: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  notesTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  notesText: { fontSize: 14, color: Colors.textPrimary },
});
