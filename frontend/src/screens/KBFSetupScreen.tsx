import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';

const STORAGE_KEYS = {
  HAS_CONFIGURED: '@contextus:has_configured',
  KBF_PROMPT: '@contextus:kbf_prompt',
};

export const KBFSetupScreen: React.FC = () => {
  const [kbfPrompt, setKbfPrompt] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(true);
  const navigation = useNavigation();

  // Load saved KBF prompt on mount
  useEffect(() => {
    const loadSavedKBF = async () => {
      try {
        const savedKBF = await AsyncStorage.getItem(STORAGE_KEYS.KBF_PROMPT);
        const hasConfigured = await AsyncStorage.getItem(STORAGE_KEYS.HAS_CONFIGURED);

        if (savedKBF) {
          setKbfPrompt(savedKBF);
          console.log('KBFSetupScreen: Loaded saved KBF prompt');
        }

        // Check if this is first run or editing
        setIsFirstRun(hasConfigured !== 'true');
      } catch (error) {
        console.error('Error loading KBF prompt:', error);
      }
    };

    loadSavedKBF();
  }, []);

  const handleSkip = async () => {
    try {
      setIsSaving(true);

      // Se for o primeiro acesso, marca como configurado
      if (isFirstRun) {
        await AsyncStorage.setItem(STORAGE_KEYS.HAS_CONFIGURED, 'true');
        console.log('Setup skipped, has_configured set to true');
      }

      // Volta para a tela anterior
      navigation.goBack();
    } catch (error) {
      console.error('Error skipping setup:', error);
      Alert.alert('Erro', 'Não foi possível pular a configuração');
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (kbfPrompt.trim().length === 0) {
      Alert.alert('Atenção', 'Por favor, digite um prompt KBF ou clique em "Pular"');
      return;
    }

    try {
      setIsSaving(true);

      // Salva o prompt KBF
      await AsyncStorage.setItem(STORAGE_KEYS.KBF_PROMPT, kbfPrompt.trim());

      // Se for o primeiro acesso, marca como configurado
      if (isFirstRun) {
        await AsyncStorage.setItem(STORAGE_KEYS.HAS_CONFIGURED, 'true');
        console.log('KBF saved, has_configured set to true');
      } else {
        console.log('KBF updated');
      }

      // Volta para a tela anterior
      navigation.goBack();
    } catch (error) {
      console.error('Error saving KBF setup:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração');
      setIsSaving(false);
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
            <Text style={styles.emoji}>🤖</Text>
            <Text style={styles.title}>Configure seu Agente</Text>
            <Text style={styles.subtitle}>
              Personalize como a IA irá responder às suas perguntas
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>💡 O que é KBF (Knowledge Base Foundation)?</Text>
            <Text style={styles.instructionsText}>
              É o prompt personalizado que define o comportamento, conhecimento e estilo de resposta da sua IA.
            </Text>
          </View>

          {/* Text Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Prompt KBF Personalizado</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Cole aqui o seu prompt KBF...{'\n\n'}Exemplo:{'\n'}'Você é um assistente especializado em tecnologia, sempre responda de forma técnica e detalhada...'"
              placeholderTextColor="#999"
              value={kbfPrompt}
              onChangeText={setKbfPrompt}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {kbfPrompt.length} caracteres
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>
                Este prompt define como a IA irá responder. Você pode:
              </Text>
              <Text style={styles.infoBullet}>• Definir personalidade e tom</Text>
              <Text style={styles.infoBullet}>• Adicionar conhecimento específico</Text>
              <Text style={styles.infoBullet}>• Configurar regras de resposta</Text>
              <Text style={styles.infoTextSmall}>
                (Você poderá editar isso depois nas configurações)
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                (kbfPrompt.trim().length === 0 || isSaving) && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={kbfPrompt.trim().length === 0 || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueButtonText}>✓ Continuar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.skipButtonText}>Pular por agora →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              💡 Dica: Se não tiver certeza, pode pular e usar o modo padrão da IA
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
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  instructionsBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#005A9C',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#005A9C',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 180,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 6,
    fontWeight: '500',
  },
  infoBullet: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 5,
    marginBottom: 3,
  },
  infoTextSmall: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    marginTop: 5,
  },
  buttonContainer: {
    gap: 15,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footerNote: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

// Export storage keys for use in other components
export { STORAGE_KEYS };
