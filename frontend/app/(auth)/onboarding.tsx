import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [entreprise, setEntreprise] = useState('');
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState('');
  const [tel, setTel] = useState('');
  const [emailFacturation, setEmailFacturation] = useState('');

  // Step 2 fields
  const [tvaDefaut, setTvaDefaut] = useState(10);
  const [sepFourniturePose, setSepFourniturePose] = useState(false);
  const [structureDevis, setStructureDevis] = useState('libre');
  const [mentionLegale, setMentionLegale] = useState('');
  const [conditionsPaiement, setConditionsPaiement] = useState('Paiement à 30 jours');

  const tvaOptions = [5.5, 10, 20];
  const structureOptions = [
    { value: 'piece', label: 'Par pièce' },
    { value: 'type_travaux', label: 'Par type de travaux' },
    { value: 'libre', label: 'Libre' },
  ];

  async function saveStep(s: number) {
    setLoading(true);
    try {
      const data: any = { onboarding_step: s + 1 };
      if (s === 0) {
        Object.assign(data, { entreprise, siret, adresse, tel, email_facturation: emailFacturation });
      } else if (s === 1) {
        Object.assign(data, { tva_defaut: tvaDefaut, sep_fourniture_pose: sepFourniturePose, structure_devis: structureDevis, mention_legale: mentionLegale, conditions_paiement: conditionsPaiement });
      }
      await api.put('/profile', data);
      if (s < 2) {
        setStep(s + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function finishOnboarding(withDefaults: boolean) {
    setLoading(true);
    try {
      if (withDefaults) {
        await api.post('/ouvrages/seed-defaults');
      }
      await api.put('/profile', { onboarding_step: 3, onboarding_complete: true });
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressDot, step >= i && styles.progressDotActive]} />
          ))}
        </View>
        <Text style={styles.progressText}>Étape {step + 1}/3</Text>

        {step === 0 && (
          <View testID="onboarding-step-1">
            <Text style={styles.stepTitle}>Informations entreprise</Text>
            <Text style={styles.stepSubtitle}>Configurez votre identité professionnelle</Text>

            <Text style={styles.label}>Nom de l'entreprise</Text>
            <TextInput testID="onboarding-entreprise" style={styles.input} value={entreprise} onChangeText={setEntreprise} placeholder="Mon Entreprise Plomberie" placeholderTextColor={Colors.textSecondary} />

            <Text style={styles.label}>SIRET</Text>
            <TextInput testID="onboarding-siret" style={styles.input} value={siret} onChangeText={setSiret} placeholder="123 456 789 00012" placeholderTextColor={Colors.textSecondary} keyboardType="numeric" />

            <Text style={styles.label}>Adresse</Text>
            <TextInput testID="onboarding-adresse" style={styles.input} value={adresse} onChangeText={setAdresse} placeholder="12 rue de la Plomberie, 75001 Paris" placeholderTextColor={Colors.textSecondary} />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput testID="onboarding-tel" style={styles.input} value={tel} onChangeText={setTel} placeholder="06 12 34 56 78" placeholderTextColor={Colors.textSecondary} keyboardType="phone-pad" />

            <Text style={styles.label}>Email de facturation</Text>
            <TextInput testID="onboarding-email-fact" style={styles.input} value={emailFacturation} onChangeText={setEmailFacturation} placeholder="facturation@entreprise.com" placeholderTextColor={Colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

            <TouchableOpacity testID="onboarding-next-1" style={styles.button} onPress={() => saveStep(0)} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Suivant</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View testID="onboarding-step-2">
            <Text style={styles.stepTitle}>Paramètres devis</Text>
            <Text style={styles.stepSubtitle}>Personnalisez vos devis</Text>

            <Text style={styles.label}>TVA par défaut</Text>
            <View style={styles.chipRow}>
              {tvaOptions.map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, tvaDefaut === t && styles.chipActive]} onPress={() => setTvaDefaut(t)}>
                  <Text style={[styles.chipText, tvaDefaut === t && styles.chipTextActive]}>{t}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Séparer fourniture et pose</Text>
              <Switch value={sepFourniturePose} onValueChange={setSepFourniturePose} trackColor={{ true: Colors.primary }} thumbColor="#FFF" />
            </View>

            <Text style={styles.label}>Structure des lignes</Text>
            <View style={styles.chipRow}>
              {structureOptions.map((o) => (
                <TouchableOpacity key={o.value} style={[styles.chip, structureDevis === o.value && styles.chipActive]} onPress={() => setStructureDevis(o.value)}>
                  <Text style={[styles.chipText, structureDevis === o.value && styles.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mentions légales</Text>
            <TextInput style={[styles.input, styles.textArea]} value={mentionLegale} onChangeText={setMentionLegale} placeholder="Vos mentions légales..." placeholderTextColor={Colors.textSecondary} multiline numberOfLines={3} />

            <Text style={styles.label}>Conditions de paiement</Text>
            <TextInput style={styles.input} value={conditionsPaiement} onChangeText={setConditionsPaiement} placeholder="Paiement à 30 jours" placeholderTextColor={Colors.textSecondary} />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="onboarding-next-2" style={[styles.button, styles.btnFlex]} onPress={() => saveStep(1)} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Suivant</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 2 && (
          <View testID="onboarding-step-3">
            <Text style={styles.stepTitle}>Catalogue de départ</Text>
            <Text style={styles.stepSubtitle}>Commencez avec des ouvrages exemples</Text>

            <View style={styles.exampleCard}>
              <Ionicons name="construct" size={20} color={Colors.primary} />
              <View style={styles.exampleContent}>
                <Text style={styles.exampleName}>Main d'oeuvre plomberie</Text>
                <Text style={styles.examplePrice}>55€/h</Text>
              </View>
            </View>
            <View style={styles.exampleCard}>
              <Ionicons name="water" size={20} color={Colors.primary} />
              <View style={styles.exampleContent}>
                <Text style={styles.exampleName}>Remplacement robinet</Text>
                <Text style={styles.examplePrice}>120€ forfait</Text>
              </View>
            </View>
            <View style={styles.exampleCard}>
              <Ionicons name="flame" size={20} color={Colors.primary} />
              <View style={styles.exampleContent}>
                <Text style={styles.exampleName}>Pose chauffe-eau</Text>
                <Text style={styles.examplePrice}>350€ forfait</Text>
              </View>
            </View>

            <TouchableOpacity testID="onboarding-start-with-examples" style={styles.button} onPress={() => finishOnboarding(true)} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Démarrer avec ces exemples</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="onboarding-skip" style={styles.skipBtn} onPress={() => finishOnboarding(false)} disabled={loading}>
              <Text style={styles.skipBtnText}>Passer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  progressDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.primary },
  progressText: { textAlign: 'center', color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.lg },
  stepTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  chipTextActive: { color: '#FFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  switchLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: 12, alignItems: 'center', marginTop: Spacing.lg, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btnFlex: { flex: 1, marginTop: 0 },
  backBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  backBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  exampleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm, gap: 12 },
  exampleContent: { flex: 1 },
  exampleName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  examplePrice: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  skipBtn: { alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm },
  skipBtnText: { color: Colors.textSecondary, fontSize: 15 },
});
