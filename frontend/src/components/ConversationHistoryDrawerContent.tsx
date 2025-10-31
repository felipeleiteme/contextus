import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { Conversation, useChat } from '../contexts/ChatContext';

const formatConversationTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString([], {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.warn('Failed to format conversation timestamp:', error);
    return '';
  }
};

export const ConversationHistoryDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    updateConversationTitle,
  } = useChat();

  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [conversations]
  );

  const handleNewConversation = useCallback(() => {
    createConversation();
    props.navigation.closeDrawer();
  }, [createConversation, props.navigation]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      props.navigation.closeDrawer();
    },
    [props.navigation, setActiveConversationId]
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      Alert.alert(
        'Excluir conversa',
        'Tem certeza que deseja excluir esta conversa? Essa ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => deleteConversation(conversationId),
          },
        ]
      );
    },
    [deleteConversation]
  );

  const openRenameModal = useCallback((conversation: Conversation) => {
    setRenameTarget(conversation);
    setRenameValue(conversation.title);
  }, []);

  const closeRenameModal = useCallback(() => {
    setRenameTarget(null);
    setRenameValue('');
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (renameTarget && renameValue.trim().length > 0) {
      updateConversationTitle(renameTarget.id, renameValue.trim());
    }
    closeRenameModal();
  }, [closeRenameModal, renameTarget, renameValue, updateConversationTitle]);

  return (
    <>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Conversas</Text>
          <TouchableOpacity style={styles.newConversationButton} onPress={handleNewConversation}>
            <Text style={styles.newConversationIcon}>＋</Text>
            <Text style={styles.newConversationText}>Nova Conversa</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {sortedConversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;

            return (
              <View
                key={conversation.id}
                style={[styles.conversationCard, isActive && styles.activeConversationCard]}
              >
                <TouchableOpacity
                  style={styles.conversationTouchable}
                  onPress={() => handleSelectConversation(conversation.id)}
                >
                  <View style={styles.conversationInfo}>
                    <Text style={styles.conversationTitle}>{conversation.title}</Text>
                    <Text style={styles.conversationDescription}>
                      {conversation.description?.trim().length
                        ? conversation.description
                        : 'Sem mensagens ainda.'}
                    </Text>
                    <Text style={styles.conversationTimestamp}>
                      {formatConversationTimestamp(conversation.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.conversationActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openRenameModal(conversation)}
                    >
                      <Text style={styles.actionIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteConversation(conversation.id)}
                    >
                      <Text style={styles.actionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}

          {sortedConversations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhuma conversa disponível. Crie uma nova para começar.
              </Text>
            </View>
          )}
        </View>
      </DrawerContentScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={!!renameTarget}
        onRequestClose={closeRenameModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar nome da conversa</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Nome da conversa"
              placeholderTextColor="#999"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={closeRenameModal}>
                <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonPrimary,
                  !renameValue.trim().length && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmRename}
                disabled={!renameValue.trim().length}
              >
                <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: '#f5f5f5',
    minHeight: '100%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  newConversationIcon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 8,
  },
  newConversationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 24,
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  activeConversationCard: {
    borderColor: '#007AFF',
  },
  conversationTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
  },
  conversationDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  conversationTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  conversationActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 8,
  },
  actionIcon: {
    fontSize: 18,
    color: '#555',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#222',
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    color: '#666',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    backgroundColor: '#aacbff',
  },
});
