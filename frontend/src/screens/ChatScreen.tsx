import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Text,
  TextInput,
  View,
  GestureResponderEvent,
  Animated,
  Vibration,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { processAudio, sendChatMessage } from '../services/api';
import { useChat, Message, createMessage } from '../contexts/ChatContext';

const STORAGE_KEY_KBF_PROMPT = '@contextus:kbf_prompt';
const MIN_AUDIO_DURATION_MS = 800;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [kbfPrompt, setKbfPrompt] = useState('');
  const [isCancellingRecording, setIsCancellingRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const flatListRef = useRef<FlatList<Message>>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pendingStopRef = useRef(false);
  const pressStartXRef = useRef<number | null>(null);
  const recordStartTimestampRef = useRef<number | null>(null);
  const micScale = useRef(new Animated.Value(1)).current;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const messages = activeConversation?.messages ?? [];

  const animateMicScale = useCallback(
    (toValue: number) => {
      Animated.spring(micScale, {
        toValue,
        useNativeDriver: true,
        friction: 6,
        tension: 220,
      }).start();
    },
    [micScale]
  );

  const resetMicScale = useCallback(() => {
    animateMicScale(1);
  }, [animateMicScale]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && recordStartTimestampRef.current) {
      interval = setInterval(() => {
        if (recordStartTimestampRef.current) {
          setRecordingDurationMs(Date.now() - recordStartTimestampRef.current);
        }
      }, 200);
    } else {
      setRecordingDurationMs(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      resetMicScale();
      return;
    }

    animateMicScale(isCancellingRecording ? 0.9 : 1.12);
  }, [animateMicScale, isCancellingRecording, isRecording, resetMicScale]);

  useEffect(() => {
    if (isRecording && isCancellingRecording) {
      Vibration.vibrate(15);
    }
  }, [isCancellingRecording, isRecording]);

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

  const finalizeRecording = useCallback(
    async (activeRecording: Audio.Recording | null, shouldProcess: boolean = true) => {
      pendingStopRef.current = false;
      setIsRecording(false);
      setIsCancellingRecording(false);
      pressStartXRef.current = null;
      recordStartTimestampRef.current = null;
      resetMicScale();

      if (!activeRecording) {
        return;
      }

      let status: Audio.RecordingStatus | null = null;
      try {
        status = await activeRecording.getStatusAsync();
      } catch (statusError) {
        status = null;
      }

      let uri: string | null = null;

      if (status?.isRecording || status?.canRecord) {
        try {
          await activeRecording.stopAndUnloadAsync();
          uri = activeRecording.getURI();
        } catch (stopError: any) {
          if (stopError?.message?.includes('Recorder does not exist')) {
            console.debug('Tentativa de parar gravação já finalizada.');
          } else {
            console.warn('Falha ao finalizar gravação ativa:', stopError);
          }
        }
      }

      if (!uri) {
        try {
          uri = activeRecording.getURI();
        } catch {
          uri = null;
        }
      }

      const durationMillis = status?.durationMillis ?? 0;

      recordingRef.current = null;
      setRecording(null);

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (modeError) {
        console.debug('Falha ao redefinir modo de áudio após finalizar gravação:', modeError);
      }

      if (!shouldProcess || !uri || durationMillis < MIN_AUDIO_DURATION_MS) {
        if (shouldProcess && durationMillis < MIN_AUDIO_DURATION_MS) {
          Alert.alert(
            'Gravação muito curta',
            'Segure o botão por um pouco mais de tempo para enviar o áudio.'
          );
        }
        return;
      }

      if (uri) {
        await handleProcessAudio(uri);
      }
    },
    [handleProcessAudio, resetMicScale]
  );

  const startRecording = useCallback(async (startX: number | null = null) => {
    if (isProcessing || isRecording) {
      return;
    }

    pendingStopRef.current = false;
    setIsCancellingRecording(false);
    pressStartXRef.current = startX;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const currentRecording = recordingRef.current;
      if (currentRecording) {
        await finalizeRecording(currentRecording, false);
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      recordStartTimestampRef.current = Date.now();

      if (pendingStopRef.current) {
        await finalizeRecording(newRecording);
      }
    } catch (error: any) {
      pendingStopRef.current = false;
      if (error?.message?.includes('Recorder does not exist')) {
        console.debug('Tentativa de iniciar gravação após cleanup concluído.');
      } else {
        console.error('Erro ao iniciar gravação:', error);
        Alert.alert('Erro', 'Falha ao iniciar gravação: ' + (error?.message ?? ''));
      }
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
      resetMicScale();
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (modeError) {
        console.debug('Falha ao redefinir modo de áudio após erro de gravação:', modeError);
      }
    }
  }, [finalizeRecording, isProcessing, isRecording, resetMicScale]);

  const stopRecording = useCallback(async (shouldProcess: boolean = true) => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      pendingStopRef.current = true;
      setIsRecording(false);
      setIsCancellingRecording(false);
      resetMicScale();
      return;
    }

    await finalizeRecording(activeRecording, shouldProcess);
  }, [finalizeRecording, resetMicScale]);

  const handleRecordPressIn = useCallback(
    (event: GestureResponderEvent) => {
      const startX = event?.nativeEvent?.pageX ?? null;
      Vibration.vibrate(20);
      animateMicScale(1.12);
      startRecording(startX);
    },
    [animateMicScale, startRecording]
  );

  const handleRecordPressMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!isRecording) {
        return;
      }

      const currentX = event?.nativeEvent?.pageX;
      if (typeof currentX !== 'number') {
        return;
      }

      const startX = pressStartXRef.current;
      if (startX == null) {
        pressStartXRef.current = currentX;
        return;
      }

      const deltaX = currentX - startX;
      const cancelling = deltaX < -80;
      setIsCancellingRecording((prev) => (prev === cancelling ? prev : cancelling));
    },
    [isRecording]
  );

  const handleRecordPressOut = useCallback(() => {
    const shouldProcess = !isCancellingRecording;
    resetMicScale();
    stopRecording(shouldProcess);
  }, [isCancellingRecording, resetMicScale, stopRecording]);

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
            <AnimatedPressable
              style={({ pressed }) => [
                styles.microphoneButton,
                isRecording
                  ? isCancellingRecording
                    ? styles.micButtonCancel
                    : styles.micButtonActive
                  : null,
                isProcessing ? styles.disabledButton : null,
                { transform: [{ scale: micScale }] },
                pressed ? styles.micButtonPressed : null,
              ]}
              onPressIn={handleRecordPressIn}
              onPressOut={handleRecordPressOut}
              onTouchMove={handleRecordPressMove}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonIcon}>
                {isRecording ? (isCancellingRecording ? '↩︎' : '🔴') : '🎤'}
              </Text>
            </AnimatedPressable>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButtonBase,
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

        {isRecording && (
          <View style={[styles.recordingOverlay, isCancellingRecording && styles.recordingOverlayCancel]}>
            <Text style={styles.recordingTimer}>{formatDuration(recordingDurationMs)}</Text>
            <Text style={styles.recordingMessage}>
              {isCancellingRecording ? 'Solte para cancelar' : 'Gravando... deslize para cancelar'}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const formatDuration = (durationMs: number): string => {
  if (!durationMs || durationMs < 0) {
    return '00:00';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
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
  microphoneButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  sendButtonBase: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
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
  micButtonPressed: {
    opacity: 0.85,
  },
  actionButtonIcon: {
    fontSize: 24,
    color: '#fff',
  },
  micButtonCancel: {
    backgroundColor: '#FF3B30',
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
  recordingOverlay: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.92)',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  recordingOverlayCancel: {
    backgroundColor: 'rgba(215, 58, 42, 0.95)',
  },
  recordingTimer: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  recordingMessage: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
  },
});
