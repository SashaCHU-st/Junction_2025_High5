import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { voiceService } from '../services/voiceService';
import { api } from '../services/api';
import { VoiceSessionState, FriendMatch } from '../types';

interface VoiceChatScreenProps {
  onFriendMatchFound: (match: FriendMatch) => void;
  onGoBack: () => void;
}

export default function VoiceChatScreen({
  onFriendMatchFound,
  onGoBack,
}: VoiceChatScreenProps) {
  const [sessionState, setSessionState] = useState<VoiceSessionState>({
    conversationStep: 0,
    userId: `user_${Date.now()}`,
    collectedData: {
      interests: [],
    },
  });
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [userInput, setUserInput] = useState("");
  const [conversation, setConversation] = useState<
    Array<{ role: "system" | "user"; text: string }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    startConversation();
    
    // Cleanup: stop TTS when component unmounts
    return () => {
      voiceService.stopSpeaking().catch(() => {});
    };
  }, []);

  // Auto-listen removed - user must click button to record

  const startConversation = async () => {
    const greeting =
      "Good morning! How are you doing today? Please tell me about your day and any activities you've done.";
    setCurrentPrompt(greeting);
    setConversation([{ role: 'system', text: greeting }]);
    await speakText(greeting); // Use system TTS only
    setSessionState(prev => ({ ...prev, conversationStep: 1 }));
  };

  const speakText = async (text: string, useOpenAI: boolean = false) => {
    setIsSpeaking(true);
    
    try {
      await voiceService.speak(text, useOpenAI);
    } catch (error) {
      console.error('Error speaking:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    try {
      await voiceService.stopSpeaking();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  };

  const handleUserResponse = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userText = userInput.trim();
    setConversation((prev) => [...prev, { role: "user", text: userText }]);
    setUserInput("");
    setIsProcessing(true);

    try {
      // Process voice with backend
      const response = await api.processVoice(
        sessionState.userId,
        userText,
        sessionState.conversationStep
      );

      // Update collected data
      setSessionState((prev) => ({
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

      // Speak and show next prompt (AI response - use system TTS only)
      setCurrentPrompt(response.nextPrompt);
      setConversation((prev) => [
        ...prev,
        { role: "system", text: response.nextPrompt },
      ]);
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
      await speakText(errorMsg); // Error message - use system TTS only
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      // If AI is speaking, interrupt it immediately
      if (isSpeaking) {
        console.log('Interrupting AI speech...');
        await stopSpeaking();
        // Minimal delay for speech to stop
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Set recording state optimistically for UI feedback
      setIsRecording(true);
      
      // Always use audio recording + backend Whisper
      // Device speech recognition auto-stops when speech ends, which interrupts user
      await voiceService.startRecording();
      console.log('Recording started successfully (using backend Whisper)');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      const errorMessage = error?.message || 'Failed to start recording. Please check microphone permissions.';
      alert(errorMessage);
    }
  };

  // Auto-detection removed - user controls recording manually

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      // Stop audio recording and get audio file
      const audioUri = await voiceService.stopRecording();
      
      if (!audioUri) {
        console.log('No audio recorded');
        setIsProcessing(false);
        return;
      }

      console.log('Audio recorded at:', audioUri);
      
      // Convert audio to base64 and send to backend
      const audioBase64 = await voiceService.getAudioAsBase64(audioUri);
      if (!audioBase64) {
        alert('Failed to process audio. Please try again.');
        setIsProcessing(false);
        return;
      }

      console.log('Audio converted to base64, length:', audioBase64.length);

      // Process audio with backend (which will transcribe and generate response)
      const response = await api.processAudio(
        sessionState.userId,
        audioBase64,
        sessionState.conversationStep
      );

      const transcript = response.transcript || null;
      
      if (!transcript) {
        alert('Failed to transcribe audio. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Process response with transcript
      await processTranscriptResponse(transcript, response);
    } catch (error: any) {
      console.error('Error processing audio:', error);
      const errorMsg = error?.message?.includes('transcribe') 
        ? 'Sorry, I had trouble understanding your voice. Please try speaking more clearly or use text input.'
        : 'Sorry, I had trouble processing your audio. Please try again.';
      setConversation(prev => [...prev, { role: 'system', text: errorMsg }]);
      await speakText(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const processTranscript = async (transcript: string) => {
    try {
      // Process transcript with backend (no audio, just text)
      const response = await api.processVoice(
        sessionState.userId,
        transcript,
        sessionState.conversationStep
      );

      await processTranscriptResponse(transcript, response);
    } catch (error: any) {
      console.error('Error processing transcript:', error);
      const errorMsg = 'Sorry, I had trouble processing your message. Please try again.';
      setConversation(prev => [...prev, { role: 'system', text: errorMsg }]);
      await speakText(errorMsg);
    }
  };

  const processTranscriptResponse = async (transcript: string, response: any) => {
    // Show transcribed text in conversation
    if (transcript && transcript.trim()) {
      setConversation(prev => [...prev, { role: 'user' as const, text: transcript }]);
      setUserInput(''); // Clear text input
    }

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

    // Speak and show next prompt (AI response - use system TTS only)
    setCurrentPrompt(response.nextPrompt);
    setConversation(prev => [...prev, { role: 'system', text: response.nextPrompt }]);
    await speakText(response.nextPrompt);

    // If we have a friend match, show it
    if (response.friendMatch) {
      setTimeout(() => {
        onFriendMatchFound(response.friendMatch!);
      }, 2000);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Voice Conversation</Text>
        <View style={styles.headerStatus}>
          {isSpeaking && <Text style={styles.statusText}>🔊 Speaking...</Text>}
          {isRecording && <Text style={styles.statusText}>🎤 Listening...</Text>}
        </View>
      </View>

      <ScrollView style={styles.conversationContainer}>
        {conversation.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === "system"
                ? styles.systemBubble
                : styles.userBubble,
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
          editable={!isProcessing && !isSpeaking && !isRecording}
        />
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            (isProcessing || isSpeaking) && styles.recordButtonDisabled
          ]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing || isSpeaking}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendButton, (isProcessing || !userInput.trim()) && styles.sendButtonDisabled]}
          onPress={handleUserResponse}
          disabled={isProcessing || !userInput.trim() || isRecording}
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
            Interests: {sessionState.collectedData.interests.join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF",
  },
  header: {
    backgroundColor: "#2563EB",
    padding: 20,
    paddingTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginRight: 40, // Balance the back button
  },
  statusText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  conversationContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  systemBubble: {
    backgroundColor: "#E0E7FF",
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: "#2563EB",
    alignSelf: "flex-end",
  },
  messageText: {
    fontSize: 18,
    color: "#1E293B",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#2563EB",
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
  recordButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
  },
  recordButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  recordButtonText: {
    fontSize: 24,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataPreview: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  dataPreviewText: {
    fontSize: 14,
    color: "#92400E",
  },
});