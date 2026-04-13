import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    setError('');
    const err = await login(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      router.replace('/(tabs)');
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
            <Text style={styles.title}>PlombiCRM</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre espace</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                testID="login-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                testID="login-password-input"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Votre mot de passe"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Pas encore de compte ? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity testID="go-to-register">
                  <Text style={styles.link}>Créer un compte</Text>
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
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2',
    padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.md, gap: 8,
  },
  errorText: { color: Colors.error, fontSize: 14, flex: 1 },
  form: { gap: Spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  inputIcon: { paddingLeft: Spacing.md },
  input: { flex: 1, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary },
  eyeBtn: { padding: Spacing.md },
  button: {
    backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: 12,
    alignItems: 'center', marginTop: Spacing.md,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg, alignItems: 'center' },
  linkLabel: { color: Colors.textSecondary, fontSize: 14 },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
