import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { processAudio, sendChatMessage } from '../services/api';
import { useChat, Message, createMessage } from '../contexts/ChatContext';

const STORAGE_KEY_KBF_PROMPT = '@contextus:kbf_prompt';

const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.warn('Failed to format timestamp:', error);
    return '';
  }
};

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { activeConversation, activeConversationId, addMessageToConversation } = useChat();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [kbfPrompt, setKbfPrompt] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'É necessário permitir o acesso ao microfone');
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadPrompt = async () => {
        try {
          const savedKBF = await AsyncStorage.getItem(STORAGE_KEY_KBF_PROMPT);
          if (isActive) {
            setKbfPrompt(savedKBF ?? '');
          }
        } catch (error) {
          console.error('Error loading KBF prompt:', error);
        }
      };

      loadPrompt();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, activeConversationId]);

  useEffect(() => {
    setInputText('');
  }, [activeConversationId]);

  const validateAudioFile = useCallback(async (audioUri: string): Promise<string | null> => {
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
    } catch (error) {
      console.error('Failed to inspect audio file:', error);
      return 'Não foi possível validar o arquivo de áudio.';
    }
  }, []);

  const handleProcessAudio = useCallback(
    async (audioUri: string) => {
      if (isProcessing) {
        return;
      }

      if (!activeConversationId) {
        Alert.alert('Conversa indisponível', 'Crie uma nova conversa para continuar.');
        return;
      }

      setIsProcessing(true);

      try {
        const validationError = await validateAudioFile(audioUri);
        if (validationError) {
          Alert.alert('Erro ao processar áudio', validationError);
          return;
        }

        const result = await processAudio(audioUri, kbfPrompt || undefined);

        const transcription = result.transcription?.trim();
        if (transcription) {
          addMessageToConversation(
            activeConversationId,
            createMessage(transcription, 'user')
          );
        }

        const assistantResponse = result.response?.trim();
        if (assistantResponse) {
          addMessageToConversation(
            activeConversationId,
            createMessage(assistantResponse, 'ai')
          );
        }
      } catch (error: any) {
        console.error('Erro ao processar áudio:', error);
        const errorMessage = error?.response?.data?.detail || error?.message || 'Não foi possível processar o áudio.';
        Alert.alert('Erro ao processar áudio', errorMessage);
      } finally {
        setIsProcessing(false);
        setIsRecording(false);
      }
    },
    [activeConversationId, addMessageToConversation, isProcessing, kbfPrompt, validateAudioFile]
  );

  const startRecording = useCallback(async () => {
    if (isProcessing || isRecording) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      if (recording) {
        try {
          const status = await recording.getStatusAsync();
          if (status.canRecord || status.isRecording) {
            await recording.stopAndUnloadAsync();
          }
        } catch (cleanupError) {
          console.debug('Gravação anterior já finalizada, prosseguindo.', cleanupError);
        }
        setRecording(null);
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error: any) {
      console.error('Erro ao iniciar gravação:', error);
      Alert.alert('Erro', 'Falha ao iniciar gravação: ' + (error?.message ?? ''));
      setIsRecording(false);
      setRecording(null);
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (modeError) {
        console.debug('Falha ao redefinir modo de áudio após erro de gravação:', modeError);
      }
    }
  }, [isProcessing, recording]);

  const stopRecording = useCallback(async () => {
    if (!recording) {
      return;
    }

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      setRecording(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      if (uri) {
        await handleProcessAudio(uri);
      }
    } catch (error: any) {
      console.error('Erro ao finalizar gravação:', error);
      Alert.alert('Erro', 'Falha ao parar gravação: ' + (error?.message ?? ''));
      setRecording(null);
    }
  }, [handleProcessAudio, recording]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !activeConversationId || isProcessing) {
      return;
    }

    addMessageToConversation(activeConversationId, createMessage(trimmed, 'user'));
    setInputText('');
    setIsProcessing(true);

    try {
      const result = await sendChatMessage(trimmed, kbfPrompt || undefined);
      const assistantResponse = result.response?.trim();

      if (assistantResponse) {
        addMessageToConversation(
          activeConversationId,
          createMessage(assistantResponse, 'ai')
        );
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem de texto:', error);
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível enviar a mensagem.';
      Alert.alert('Erro ao enviar mensagem', detail);
    } finally {
      setIsProcessing(false);
    }
  }, [activeConversationId, addMessageToConversation, inputText, isProcessing, kbfPrompt]);

  const renderMessage: ListRenderItem<Message> = useCallback(({ item }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userMessageRow : styles.aiMessageRow]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTimestamp,
              isUser ? styles.userMessageTimestamp : styles.aiMessageTimestamp,
            ]}
          >
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, []);

  const renderFooter = useCallback(() => {
    if (!isProcessing) {
      return null;
    }

    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.processingText}>Gerando resposta...</Text>
      </View>
    );
  }, [isProcessing]);

  const isInputEmpty = inputText.trim().length === 0;

  const handleOpenDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const handleNavigateToSettings = useCallback(() => {
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation && typeof parentNavigation.navigate === 'function') {
      parentNavigation.navigate('Settings');
      return;
    }

    navigation.navigate('Settings');
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <View style={styles.chatContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenDrawer}>
            <Text style={styles.headerIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contextus</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleNavigateToSettings}>
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={
            messages.length === 0 ? styles.emptyListContainer : styles.messagesList
          }
          ListEmptyComponent={
            !isProcessing ? (
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeEmoji}>🤖</Text>
                <Text style={styles.welcomeTitle}>Como posso te ajudar?</Text>
                <Text style={styles.welcomeSubtitle}>
                  Toque no microfone ou digite sua pergunta
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={renderFooter}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Escreva ou segure o microfone..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            editable={!isProcessing}
            returnKeyType="send"
            onSubmitEditing={() => {
              if (!isInputEmpty) {
                handleSendMessage();
              }
            }}
            blurOnSubmit
          />
          {isInputEmpty ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.microphoneButton,
                isRecording && styles.micButtonActive,
                isProcessing && styles.disabledButton,
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonIcon}>{isRecording ? '🔴' : '🎤'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.sendButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleSendMessage}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonIcon}>➤</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatContainer: {
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
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 40,
  },
  welcomeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderTopRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userMessageTimestamp: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  aiMessageTimestamp: {
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  microphoneButton: {
    backgroundColor: '#007AFF',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonIcon: {
    fontSize: 22,
    color: '#fff',
  },
  processingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
