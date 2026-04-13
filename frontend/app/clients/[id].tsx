import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, StatusColors, StatusLabels } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadClient(); }, [id]);

  async function loadClient() {
    try {
      const { data } = await api.get(`/clients/${id}`);
      setClient(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!client) return <View style={styles.center}><Text>Client non trouvé</Text></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="client-detail-back" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Fiche client</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(client.nom || '?')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{client.nom} {client.prenom || ''}</Text>
          <Text style={styles.clientType}>{client.type === 'professionnel' ? 'Professionnel' : 'Particulier'}</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          {client.tel ? (
            <TouchableOpacity testID="call-client-btn" style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${client.tel}`)}>
              <Ionicons name="call" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Appeler</Text>
            </TouchableOpacity>
          ) : null}
          {client.email ? (
            <TouchableOpacity testID="email-client-btn" style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${client.email}`)}>
              <Ionicons name="mail" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity testID="new-devis-for-client" style={styles.actionBtn} onPress={() => router.push('/devis/create')}>
            <Ionicons name="document-text" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Devis</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          {client.email ? <InfoRow icon="mail-outline" label="Email" value={client.email} /> : null}
          {client.tel ? <InfoRow icon="call-outline" label="Téléphone" value={client.tel} /> : null}
          {client.adresse ? <InfoRow icon="location-outline" label="Adresse" value={client.adresse} /> : null}
          {client.notes ? <InfoRow icon="chatbox-outline" label="Notes" value={client.notes} /> : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{client.devis_count || 0}</Text>
            <Text style={styles.statLabel}>Devis</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{client.factures_count || 0}</Text>
            <Text style={styles.statLabel}>Factures</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(client.ca_total || 0).toLocaleString('fr-FR')}€</Text>
            <Text style={styles.statLabel}>CA total</Text>
          </View>
        </View>

        {/* Recent Devis */}
        {(client.devis || []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Devis récents</Text>
            {client.devis.map((d: any, i: number) => {
              const sc = StatusColors[d.statut] || StatusColors.brouillon;
              return (
                <TouchableOpacity key={d.id || i} style={styles.miniCard} onPress={() => router.push(`/devis/${d.id}`)}>
                  <Text style={styles.miniNum}>{d.numero}</Text>
                  <View style={[styles.miniBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.miniBadgeText, { color: sc.text }]}>{StatusLabels[d.statut] || d.statut}</Text>
                  </View>
                  <Text style={styles.miniAmount}>{(d.total_ttc || 0).toLocaleString('fr-FR')}€</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={18} color={Colors.textSecondary} />
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  content: { flex: 1 },
  label: { fontSize: 12, color: Colors.textSecondary },
  value: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', marginTop: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  profileCard: { alignItems: 'center', marginBottom: Spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  clientName: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  clientType: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: Spacing.lg },
  actionBtn: { alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  actionText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  miniCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  miniNum: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
  miniAmount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});
