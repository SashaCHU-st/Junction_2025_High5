import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { voiceService } from '../services/voiceService';
import { api } from '../services/api';
import { VoiceSessionState, FriendMatch } from '../types';

interface VoiceChatScreenProps {
  onFriendMatchFound: (match: FriendMatch) => void;
  onGoBack: () => void;
}

export default function VoiceChatScreen({ onFriendMatchFound, onGoBack }: VoiceChatScreenProps) {
  const [sessionState, setSessionState] = useState<VoiceSessionState>({
    conversationStep: 0,
    userId: `user_${Date.now()}`,
    collectedData: {
      interests: [],
    },
  });
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: 'system' | 'user'; text: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    startConversation();
  }, []);

  const startConversation = async () => {
    const greeting = "Good morning! How are you doing today? Please tell me about your day and any activities you've done.";
    setCurrentPrompt(greeting);
    setConversation([{ role: 'system', text: greeting }]);
    await speakText(greeting);
    setSessionState(prev => ({ ...prev, conversationStep: 1 }));
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    await voiceService.speak(text);
    setIsSpeaking(false);
  };

  const handleUserResponse = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userText = userInput.trim();
    setConversation(prev => [...prev, { role: 'user', text: userText }]);
    setUserInput('');
    setIsProcessing(true);

    try {
      // Process voice with backend
      const response = await api.processVoice(
        sessionState.userId,
        userText,
        sessionState.conversationStep
      );

      // Update collected data
      setSessionState(prev => ({
        ...prev,
        conversationStep: prev.conversationStep + 1,
        collectedData: {
          steps: response.extractedData.steps || prev.collectedData.steps,
          mood: response.extractedData.mood || prev.collectedData.mood,
          interests: [
            ...prev.collectedData.interests,
            ...(response.extractedData.interests || []),
          ],
        },
        friendMatch: response.friendMatch,
      }));

      // Speak and show next prompt
      setCurrentPrompt(response.nextPrompt);
      setConversation(prev => [...prev, { role: 'system', text: response.nextPrompt }]);
      await speakText(response.nextPrompt);

      // If we have a friend match, show it
      if (response.friendMatch) {
        setTimeout(() => {
          onFriendMatchFound(response.friendMatch!);
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing voice:', error);
      const errorMsg = 'Sorry, I had trouble understanding. Could you try again?';
      setConversation(prev => [...prev, { role: 'system', text: errorMsg }]);
      await speakText(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Voice Conversation</Text>
        {isSpeaking && <Text style={styles.statusText}>🔊 Speaking...</Text>}
      </View>

      <ScrollView style={styles.conversationContainer}>
        {conversation.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === 'system' ? styles.systemBubble : styles.userBubble,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type your response or speak..."
          placeholderTextColor="#94A3B8"
          multiline
          editable={!isProcessing && !isSpeaking}
        />
        <TouchableOpacity
          style={[styles.sendButton, (isProcessing || !userInput.trim()) && styles.sendButtonDisabled]}
          onPress={handleUserResponse}
          disabled={isProcessing || !userInput.trim()}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {sessionState.collectedData.interests.length > 0 && (
        <View style={styles.dataPreview}>
          <Text style={styles.dataPreviewText}>
            Interests: {sessionState.collectedData.interests.join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  statusText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  conversationContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  systemBubble: {
    backgroundColor: '#E0E7FF',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 18,
    color: '#1E293B',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dataPreview: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  dataPreviewText: {
    fontSize: 14,
    color: '#92400E',
  },
});
