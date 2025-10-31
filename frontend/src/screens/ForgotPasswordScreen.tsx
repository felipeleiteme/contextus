import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../config/supabase';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, digite seu email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Por favor, digite um email válido');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'contextus://reset-password', // Deep link para o app
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      Alert.alert(
        'Link enviado!',
        'Verifique sua caixa de entrada. Se não receber o email em alguns minutos, confira a pasta de spam.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro ao enviar link',
        error.message || 'Não foi possível enviar o email de recuperação. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Esqueceu sua senha?</Text>
            <Text style={styles.subtitle}>
              Não se preocupe! Digite seu email e enviaremos um link para redefinir sua senha.
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Digite seu email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading && !emailSent}
              autoFocus
            />

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                O link de recuperação será válido por 1 hora e só pode ser usado uma vez.
              </Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (loading || emailSent) && styles.buttonDisabled,
              ]}
              onPress={handleSendResetLink}
              disabled={loading || emailSent}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Enviando...' : emailSent ? 'Email enviado ✓' : 'Enviar link de recuperação'}
              </Text>
            </TouchableOpacity>

            {/* Back to Login Link */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>← Voltar ao login</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Help */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Não recebeu o email?</Text>
            <Text style={styles.helpText}>
              • Verifique sua pasta de spam{'\n'}
              • Confirme se o email está correto{'\n'}
              • Aguarde alguns minutos antes de tentar novamente
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
