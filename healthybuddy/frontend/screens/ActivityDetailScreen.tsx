import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { voiceService } from '../services/voiceService';
import { matchVoiceOption, VoiceOption } from '../utils/voiceOptionMatcher';

interface ActivityDetailScreenProps {
  activityType: 'physical' | 'mental';
  activitySub: string; // e.g., 'olderPeople' | 'allAges' | 'relaxation' | 'cognitive'
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
      
      // Stop any ongoing speech recognition from previous screen
      await voiceService.stopSpeechRecognition();
      // Small delay to ensure recognition is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      await voiceService.stopSpeaking();
      
      // Check again after stopping
      if (isCancelledRef.current) return;
      
      if (activityType === 'physical') {
        const prompt = retry
          ? 'I didn\'t hear you. What exactly would you like to do? You can choose walk or sport.'
          : 'What exactly would you like to do? You can choose walk or sport.';
        await voiceService.speak(prompt).catch((error) => {
          console.error('Error speaking prompt:', error);
        });
      } else {
        const prompt = retry
          ? 'I didn\'t hear you. What exactly would you like to do? You can choose guided relaxation, puzzles, or learning.'
          : 'What exactly would you like to do? You can choose guided relaxation, puzzles, or learning.';
        await voiceService.speak(prompt).catch((error) => {
          console.error('Error speaking prompt:', error);
        });
      }

      // Check if cancelled during TTS
      if (isCancelledRef.current) return;

      // Wait 0.5 seconds after TTS ends, then start listening
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        <Text style={styles.headerText}>What exactly would you like to do?</Text>
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
            ? activitySub === 'olderPeople'
              ? 'Options suitable for older people:'
              : 'Physical activity options:'
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  subText: {
    fontSize: 18,
    color: '#475569',
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    width: '85%',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  selectionText: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 10,
    marginTop: 6,
  },
  actionButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    width: '70%',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  secondaryActionText: {
    color: '#10B981',
  },
  listeningText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});
