import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { voiceService } from '../services/voiceService';
import { matchVoiceOption, VoiceOption } from '../utils/voiceOptionMatcher';

interface ActivityDetailScreenProps {
  activityType: 'physical' | 'mental';
  activitySub?: string; // Optional: 'olderPeople' for physical activities
  onChoose: (choice: string) => void;
  onGoBack: () => void;
}

const physicalOptions: VoiceOption[] = [
  { keywords: ['walk', 'walking', 'gentle walk'], value: 'walk' },
  { keywords: ['sport', 'sports'], value: 'sport' },
  { keywords: ['cancel', 'back'], value: 'cancel' },
];

const mentalOptions: VoiceOption[] = [
  { keywords: ['relaxation', 'relax', 'mindfulness', 'guided relaxation'], value: 'guided_relaxation' },
  { keywords: ['puzzles', 'puzzle', 'cognitive', 'games'], value: 'puzzles' },
  { keywords: ['learning', 'learn', 'skill'], value: 'learning' },
  { keywords: ['cancel', 'back'], value: 'cancel' },
];

export default function ActivityDetailScreen({ activityType, activitySub, onChoose, onGoBack }: ActivityDetailScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<Promise<string | null> | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const options = activityType === 'physical' ? physicalOptions : mentalOptions;

  useEffect(() => {
    isCancelledRef.current = false;
    recognitionRef.current = null; // Clear any previous recognition promise
    
    // Stop any previous TTS first, then start new one
    const startSpeaking = async (retry: boolean = false) => {
      // Check if cancelled before starting
      if (isCancelledRef.current) return;
      
      await voiceService.stopSpeechRecognition();
      await new Promise(resolve => setTimeout(resolve, 150));
      await voiceService.stopSpeaking();
      
      if (isCancelledRef.current) return;
      
      const prompt = activityType === 'physical'
        ? (retry
            ? 'I didn\'t hear you. What exactly would you like to do? You can choose walk or sport.'
            : 'What exactly would you like to do? You can choose walk or sport.')
        : (retry
            ? 'I didn\'t hear you. What exactly would you like to do? You can choose guided relaxation, puzzles, or learning.'
            : 'What exactly would you like to do? You can choose guided relaxation, puzzles, or learning.');
      
      await voiceService.speak(prompt).catch((error) => {
        console.error('Error speaking prompt:', error);
      });

      if (isCancelledRef.current) return;

      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check again before starting recognition
      if (isCancelledRef.current) return;
      
      // Clear any previous recognition promise before starting new one
      recognitionRef.current = null;
      setIsListening(true);
      recognitionRef.current = voiceService.startSpeechRecognition(10000);
      const transcript = await recognitionRef.current;
      recognitionRef.current = null;
      setIsListening(false);

      // Check if cancelled during recognition
      if (isCancelledRef.current) return;

      if (transcript) {
        console.log('Voice input:', transcript);
        const matched = matchVoiceOption(transcript, options);
        console.log('Matched option:', matched, 'for transcript:', transcript);
        if (matched) {
          console.log('Calling onChoose with:', matched);
          if (matched === 'cancel') {
            onGoBack();
          } else {
            onChoose(matched);
          }
          return; // Success, exit
        } else {
          console.log('No match found for transcript:', transcript);
          console.log('Available options:', options);
        }
      } else {
        console.log('No transcript received');
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
  }, [activityType, onChoose, onGoBack, options]);

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

  // For physical activity subtypes, ask what exactly they'd like to do
  const renderPhysicalOptions = () => (
    <>
      <TouchableOpacity style={styles.optionButton} onPress={() => handleButtonPress('walk')}>
        <Text style={styles.optionText}>Walk / Gentle Walk</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => handleButtonPress('sport')}>
        <Text style={styles.optionText}>Sport</Text>
      </TouchableOpacity>
    </>
  );

  const renderMentalOptions = () => (
    <>
      <TouchableOpacity style={styles.optionButton} onPress={() => handleButtonPress('guided_relaxation')}>
        <Text style={styles.optionText}>Guided Relaxation / Mindfulness</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => handleButtonPress('puzzles')}>
        <Text style={styles.optionText}>Puzzles / Cognitive Games</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => handleButtonPress('learning')}>
        <Text style={styles.optionText}>Learning / Skill Practice</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>What exactly would you like to do?</Text>
        </View>
      </View>

      <View style={styles.content}>
        {isListening && (
          <Text style={styles.listeningText}>
            🎤 Listening... {activityType === 'physical' 
              ? 'Say "walk" or "sport"'
              : 'Say "relaxation", "puzzles", or "learning"'}
          </Text>
        )}
        <Text style={styles.subText}>
          {activityType === 'physical'
            ? 'Physical activity options:'
            : 'Mental activity options:'}
        </Text>

        {activityType === 'physical' ? renderPhysicalOptions() : renderMentalOptions()}

        <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={() => handleButtonPress('cancel')}>
          <Text style={[styles.optionText, styles.cancelText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    ...(isWeb && {
      maxWidth: 700,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 100 : isWeb ? 16 : 60,
    paddingHorizontal: isWeb ? 16 : 20,
    paddingBottom: isWeb ? 20 : 24,
  },
  backButton: {
    padding: isWeb ? 6 : 8,
    marginBottom: isWeb ? 12 : 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: isWeb ? 16 : 18,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: isWeb ? 22 : 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: isWeb ? 20 : 24,
    alignItems: 'center',
  },
  subText: {
    fontSize: isWeb ? 16 : 18,
    color: '#475569',
    marginBottom: isWeb ? 12 : 16,
  },
  optionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: isWeb ? 14 : 18,
    paddingHorizontal: isWeb ? 24 : 32,
    borderRadius: 12,
    marginBottom: isWeb ? 12 : 16,
    width: isWeb ? '70%' : '80%',
    ...(isWeb && {
      maxWidth: 500,
    }),
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: isWeb ? 15 : 16,
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
    fontSize: isWeb ? 14 : 16,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: isWeb ? 12 : 16,
    textAlign: 'center',
  },
});
