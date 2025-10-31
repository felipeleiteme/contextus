import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
};

export type Conversation = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  messages: Message[];
};

export interface ChatContextValue {
  conversations: Conversation[];
  activeConversationId: string;
  activeConversation: Conversation;
  setActiveConversationId: (conversationId: string) => void;
  createConversation: (title?: string) => Conversation;
  deleteConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  addMessageToConversation: (conversationId: string, message: Message) => void;
  replaceConversationMessages: (conversationId: string, messages: Message[]) => void;
  clearConversationMessages: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const STORAGE_KEYS = {
  conversations: '@contextus:chat:conversations',
  activeConversationId: '@contextus:chat:active_conversation_id',
};
const DEFAULT_DESCRIPTION = 'Comece a conversa fazendo uma pergunta.';

const buildConversation = (title?: string): Conversation => {
  const id = generateId();
  const timestamp = new Date().toISOString();

  return {
    id,
    title: title || 'Nova conversa',
    description: DEFAULT_DESCRIPTION,
    updatedAt: timestamp,
    messages: [],
  };
};

type ChatProviderProps = {
  children: ReactNode;
};

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const initialConversationRef = useRef<Conversation>(buildConversation());
  const [conversations, setConversations] = useState<Conversation[]>([
    initialConversationRef.current,
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    initialConversationRef.current.id
  );
  const isHydratingRef = useRef(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [storedConversationsJSON, storedActiveId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.conversations),
          AsyncStorage.getItem(STORAGE_KEYS.activeConversationId),
        ]);

        if (storedConversationsJSON) {
          try {
            const parsed: Conversation[] = JSON.parse(storedConversationsJSON);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setConversations(parsed);
              if (storedActiveId && parsed.some((conv) => conv.id === storedActiveId)) {
                setActiveConversationId(storedActiveId);
              } else {
                setActiveConversationId(parsed[0].id);
              }
            }
          } catch (parseError) {
            console.error('ChatContext: failed to parse stored conversations', parseError);
          }
        } else {
          await AsyncStorage.multiSet([
            [STORAGE_KEYS.conversations, JSON.stringify([initialConversationRef.current])],
            [STORAGE_KEYS.activeConversationId, initialConversationRef.current.id],
          ]);
        }
      } catch (error) {
        console.error('ChatContext: failed to hydrate conversations', error);
      } finally {
        isHydratingRef.current = false;
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    if (isHydratingRef.current) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations)).catch((error) =>
      console.error('ChatContext: failed to persist conversations', error)
    );
  }, [conversations]);

  useEffect(() => {
    if (isHydratingRef.current) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.activeConversationId, activeConversationId).catch((error) =>
      console.error('ChatContext: failed to persist active conversation id', error)
    );
  }, [activeConversationId]);

  const activeConversation = useMemo(() => {
    const found = conversations.find((conversation) => conversation.id === activeConversationId);
    return found ?? conversations[0];
  }, [activeConversationId, conversations]);

  const createConversation = useCallback(
    (title?: string) => {
      const newConversation = buildConversation(title);
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      return newConversation;
    },
    []
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) => {
        const remaining = prev.filter((conversation) => conversation.id != conversationId);

        if (remaining.length === 0) {
          const fallback = buildConversation();
          setActiveConversationId(fallback.id);
          return [fallback];
        }

        if (conversationId === activeConversationId) {
          setActiveConversationId(remaining[0].id);
        }

        return remaining;
      });
    },
    [activeConversationId]
  );

  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: title || conversation.title,
              updatedAt: new Date().toISOString(),
            }
          : conversation
      )
    );
  }, []);

  const addMessageToConversation = useCallback(
    (conversationId: string, message: Message) => {
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt: message.timestamp,
                description:
                  message.text.trim().length > 0
                    ? message.text.slice(0, 90)
                    : conversation.messages.length === 0
                    ? DEFAULT_DESCRIPTION
                    : conversation.description,
              }
            : conversation
        )
      );
    },
    []
  );

  const replaceConversationMessages = useCallback(
    (conversationId: string, messages: Message[]) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          const updatedAt =
            messages.length > 0 ? messages[messages.length - 1].timestamp : new Date().toISOString();
          const lastMessage = messages[messages.length - 1];

          return {
            ...conversation,
            messages,
            updatedAt,
            description:
              lastMessage && lastMessage.text.trim().length > 0
                ? lastMessage.text.slice(0, 90)
                : DEFAULT_DESCRIPTION,
          };
        })
      );
    },
    []
  );

  const clearConversationMessages = useCallback((conversationId: string) => {
    replaceConversationMessages(conversationId, []);
  }, [replaceConversationMessages]);

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      activeConversationId,
      activeConversation,
      setActiveConversationId,
      createConversation,
      deleteConversation,
      updateConversationTitle,
      addMessageToConversation,
      replaceConversationMessages,
      clearConversationMessages,
    }),
    [
      activeConversation,
      activeConversationId,
      addMessageToConversation,
      clearConversationMessages,
      conversations,
      createConversation,
      deleteConversation,
      replaceConversationMessages,
      updateConversationTitle,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
};

export const createMessage = (text: string, sender: Message['sender']): Message => ({
  id: generateId(),
  text,
  sender,
  timestamp: new Date().toISOString(),
});
