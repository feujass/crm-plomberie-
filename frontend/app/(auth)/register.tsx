import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  async function handleRegister() {
    if (!email.trim() || !password.trim() || !nom.trim()) {
      setError('Veuillez remplir les champs obligatoires');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    setError('');
    const err = await register(email, password, nom, prenom);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      router.replace('/(auth)/onboarding');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="water" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez PlombiCRM</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput testID="register-nom-input" style={styles.inputSimple} value={nom} onChangeText={setNom} placeholder="Dupont" placeholderTextColor={Colors.textSecondary} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput testID="register-prenom-input" style={styles.inputSimple} value={prenom} onChangeText={setPrenom} placeholder="Jean" placeholderTextColor={Colors.textSecondary} />
              </View>
            </View>

            <Text style={styles.label}>Email *</Text>
            <TextInput testID="register-email-input" style={styles.inputSimple} value={email} onChangeText={setEmail} placeholder="votre@email.com" placeholderTextColor={Colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput testID="register-password-input" style={styles.inputSimple} value={password} onChangeText={setPassword} placeholder="Min. 6 caractères" placeholderTextColor={Colors.textSecondary} secureTextEntry />

            <TouchableOpacity testID="register-submit-button" style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Créer mon compte</Text>}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Déjà un compte ? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity testID="go-to-login">
                  <Text style={styles.link}>Se connecter</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoContainer: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  title: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: Spacing.xs },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.md, gap: 8 },
  errorText: { color: Colors.error, fontSize: 14, flex: 1 },
  form: { gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfField: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  inputSimple: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary, marginBottom: Spacing.sm },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: 12, alignItems: 'center', marginTop: Spacing.md, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg, alignItems: 'center' },
  linkLabel: { color: Colors.textSecondary, fontSize: 14 },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
