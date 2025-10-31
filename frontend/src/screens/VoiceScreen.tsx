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
import { useNavigation } from '@react-navigation/native';
import { processAudio } from '../services/api';

const STORAGE_KEY_KBF_PROMPT = '@contextus:kbf_prompt';

export const VoiceScreen: React.FC = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [context, setContext] = useState('');
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const [message, setMessage] = useState('');
  const navigation = useNavigation();

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.headerIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Contextus</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Settings' as never)}
        >
          <Text style={styles.headerIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {/* Welcome Body */}
        {!transcription && !response && !isProcessing && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeEmoji}>🤖</Text>
            <Text style={styles.welcomeTitle}>Como posso te ajudar?</Text>
            <Text style={styles.welcomeSubtitle}>
              Toque no microfone ou digite sua pergunta
            </Text>
          </View>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>Processando áudio...</Text>
          </View>
        )}

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
      </ScrollView>

      {/* Footer Input Bar */}
      <View style={styles.footer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Escreva ou segure o microfone..."
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing}
        >
          <Text style={styles.micButtonText}>
            {isRecording ? '🔴' : '🎤'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerButton: {
    padding: 10,
  },
  headerIcon: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    flexGrow: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  welcomeEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  micButtonText: {
    fontSize: 24,
  },
});
