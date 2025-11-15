import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { voiceService } from '../services/voiceService';
import { matchVoiceOption, VoiceOption } from '../utils/voiceOptionMatcher';

interface EventMatchingScreenProps {
  onChoose: (choice: string) => void;
  onGoBack: () => void;
}

const options: VoiceOption[] = [
  { keywords: ['physical', 'physical activities', 'physical activity'], value: 'physicalActivities' },
  { keywords: ['mental', 'mental activities', 'mental activity'], value: 'mentalActivities' },
  { keywords: ['cancel', 'back', 'home'], value: 'cancel' },
];

export default function EventMatchingScreen({ onChoose, onGoBack }: EventMatchingScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<Promise<string | null> | null>(null);
  const isCancelledRef = React.useRef<boolean>(false);

  useEffect(() => {
    isCancelledRef.current = false;
    recognitionRef.current = null; // Clear any previous recognition promise
    
    // Stop any previous TTS first, then start new one
    const startSpeaking = async (retry: boolean = false) => {
      // Check if cancelled before starting
      if (isCancelledRef.current) return;
      
      // Stop any ongoing speech recognition from previous screen
      await voiceService.stopSpeechRecognition();
      // Small delay to ensure recognition is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      await voiceService.stopSpeaking();
      
      // Check again after stopping
      if (isCancelledRef.current) return;
      
      const prompt = retry 
        ? 'I didn\'t hear you. What would you like to do today? You can choose Physical Activities or Mental Activities.'
        : 'What would you like to do today? You can choose Physical Activities or Mental Activities.';
      await voiceService.speak(prompt).catch((error) => {
        console.error('Error speaking prompt:', error);
      });

      // Check if cancelled during TTS
      if (isCancelledRef.current) return;

      // Wait 0.5 seconds after TTS ends, then start listening
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check again before starting recognition
      if (isCancelledRef.current) return;
      
      // Clear any previous recognition promise before starting new one
      recognitionRef.current = null;
      setIsListening(true);
      recognitionRef.current = voiceService.startSpeechRecognition(10000); // 10 seconds
      const transcript = await recognitionRef.current;
      recognitionRef.current = null;
      setIsListening(false);

      // Check if cancelled during recognition
      if (isCancelledRef.current) return;

      if (transcript) {
        console.log('Voice input:', transcript);
        const matched = matchVoiceOption(transcript, options);
        if (matched) {
          if (matched === 'cancel') {
            onGoBack();
          } else {
            onChoose(matched);
          }
          return; // Success, exit
        }
      }

      // No valid input received, retry once (only if not cancelled)
      if (!retry && !isCancelledRef.current) {
        await startSpeaking(true);
      }
    };

    startSpeaking();

    // Cleanup: stop TTS and recognition when leaving screen
    return () => {
      isCancelledRef.current = true;
      voiceService.stopSpeaking().catch(() => {});
      voiceService.stopSpeechRecognition().catch(() => {});
      setIsListening(false);
      recognitionRef.current = null;
    };
  }, [onChoose, onGoBack]);

  const handleButtonPress = async (value: string) => {
    // Mark as cancelled to prevent retry logic
    isCancelledRef.current = true;
    
    // Stop any ongoing recognition
    if (isListening) {
      await voiceService.stopSpeechRecognition();
      setIsListening(false);
      recognitionRef.current = null;
    }
    // Stop TTS
    await voiceService.stopSpeaking();
    
    if (value === 'cancel') {
      onGoBack();
    } else {
      onChoose(value);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>What would you like to do today?</Text>
      </View>

      <View style={styles.content}>
        {isListening && (
          <Text style={styles.listeningText}>🎤 Listening... Say "Physical Activities" or "Mental Activities"</Text>
        )}
        <Text style={styles.prompt}>
          Choose one of the options below to get started.
        </Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => handleButtonPress('physicalActivities')}
        >
          <Text style={styles.optionText}>Physical Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => handleButtonPress('mentalActivities')}
        >
          <Text style={styles.optionText}>Mental Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={() => handleButtonPress('cancel')}>
          <Text style={[styles.optionText, styles.cancelText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 60,
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  prompt: {
    fontSize: 20,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 16,
    width: '80%',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  cancelText: {
    color: '#334155',
  },
  listeningText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});
