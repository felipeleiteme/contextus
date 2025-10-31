import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { processAudio } from '../services/api';

const STORAGE_KEY_KBF_PROMPT = '@contextus:kbf_prompt';

export const VoiceScreen: React.FC = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [context, setContext] = useState('');
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const { signOut } = useAuth();

  useEffect(() => {
    // Request audio permissions and load saved KBF
    (async () => {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'É necessário permitir o acesso ao microfone');
      }

      // Load saved KBF prompt
      try {
        const savedKBF = await AsyncStorage.getItem(STORAGE_KEY_KBF_PROMPT);
        if (savedKBF) {
          setContext(savedKBF);
          console.log('Loaded saved KBF prompt');
        }
      } catch (error) {
        console.error('Error loading KBF prompt:', error);
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setTranscription('');
      setResponse('');
    } catch (error: any) {
      Alert.alert('Erro', 'Falha ao iniciar gravação: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (uri) {
        await handleProcessAudio(uri);
      }

      setRecording(null);
    } catch (error: any) {
      Alert.alert('Erro', 'Falha ao parar gravação: ' + error.message);
    }
  };

  const validateAudioFile = async (audioUri: string): Promise<string | null> => {
    try {
      const info = await FileSystem.getInfoAsync(audioUri);

      if (!info.exists) {
        console.warn('Audio file not found at URI:', audioUri);
        return 'Arquivo de áudio não encontrado.';
      }

      if (info.size === 0) {
        console.warn('Audio file is empty:', audioUri);
        return 'Arquivo de áudio vazio. Tente gravar novamente.';
      }

      return null;
    } catch (err) {
      console.error('Failed to inspect audio file:', err);
      return 'Não foi possível validar o arquivo de áudio.';
    }
  };

  const handleProcessAudio = async (audioUri: string) => {
    setIsProcessing(true);

    try {
      console.log('Processando áudio da URI:', audioUri);

      const validationError = await validateAudioFile(audioUri);
      if (validationError) {
        Alert.alert('Erro ao processar áudio', validationError);
        return;
      }

      const result = await processAudio(audioUri, context || undefined);

      setTranscription(result.transcription);
      setResponse(result.response);

      Alert.alert('Sucesso', 'Áudio processado com sucesso!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message;
      Alert.alert('Erro ao processar áudio', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveContext = async () => {
    try {
      if (context.trim()) {
        await AsyncStorage.setItem(STORAGE_KEY_KBF_PROMPT, context.trim());
        Alert.alert('Sucesso', 'Prompt KBF salvo com sucesso!');
      }
    } catch (error) {
      console.error('Error saving KBF prompt:', error);
      Alert.alert('Erro', 'Não foi possível salvar o prompt');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Assistant</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Prompt KBF Personalizado</Text>
          {context.trim() && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveContext}
            >
              <Text style={styles.saveButtonText}>💾 Salvar</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.contextInput}
          placeholder="Ex: Você é um assistente técnico especializado em...{'\n\n'}(Este prompt define como a IA irá responder)"
          placeholderTextColor="#999"
          value={context}
          onChangeText={setContext}
          multiline
          numberOfLines={4}
        />

        <View style={styles.recordingContainer}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>Processando áudio...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? '🔴 Parar Gravação' : '🎤 Iniciar Gravação'}
              </Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <Text style={styles.recordingIndicator}>
              Gravando... Toque para parar
            </Text>
          )}
        </View>

        {transcription && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Transcrição:</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{transcription}</Text>
            </View>
          </View>
        )}

        {response && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Resposta:</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{response}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  contextInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 30,
  },
  recordingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 75,
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recordingIndicator: {
    marginTop: 20,
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    marginTop: 20,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
