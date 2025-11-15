import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { voiceService } from '../services/voiceService';
import { matchVoiceOption, VoiceOption } from '../utils/voiceOptionMatcher';

interface Props {
  id: string;
  title: string;
  organizer: string;
  activity?: string;
  onConfirm: () => void;
  onDecline: () => void;
}

const options: VoiceOption[] = [
  { keywords: ['yes', 'join', 'ok', 'okay', 'sure', 'confirm'], value: 'confirm' },
  { keywords: ['no', 'decline', 'cancel', 'not', "don't"], value: 'decline' },
];

export default function OfferJoinScreen({ id, title, organizer, activity, onConfirm, onDecline }: Props) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<Promise<string | null> | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    isCancelledRef.current = false;
    recognitionRef.current = null; // Clear any previous recognition promise
    
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
        ? `I didn't hear you. ${organizer} is planning to ${activity || 'this activity'} now. Would you like to join ${title}? Say yes to join or no to decline.`
        : `${organizer} is planning to ${activity || 'this activity'} now. Would you like to join ${title}? Say yes to join or no to decline.`;
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
      recognitionRef.current = voiceService.startSpeechRecognition(10000);
      const transcript = await recognitionRef.current;
      recognitionRef.current = null;
      setIsListening(false);

      // Check if cancelled during recognition
      if (isCancelledRef.current) return;

      if (transcript) {
        console.log('Voice input:', transcript);
        const matched = matchVoiceOption(transcript, options);
        if (matched === 'confirm') {
          onConfirm();
          return; // Success, exit
        } else if (matched === 'decline') {
          onDecline();
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
  }, [organizer, activity, title, onConfirm, onDecline]);

  const handleButtonPress = async (action: 'confirm' | 'decline') => {
    // Mark as cancelled to prevent retry logic
    isCancelledRef.current = true;
    
    // Stop any ongoing recognition first
    if (isListening) {
      await voiceService.stopSpeechRecognition();
      setIsListening(false);
      recognitionRef.current = null;
    }
    
    // Stop TTS immediately and wait for it to complete
    await voiceService.stopSpeaking();
    
    // Small delay to ensure TTS is fully stopped
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (action === 'confirm') {
      onConfirm();
    } else {
      onDecline();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Join Offer</Text>
      </View>

      <View style={styles.content}>
        {isListening && (
          <Text style={styles.listeningText}>🎤 Listening... Say "yes" to join or "no" to decline</Text>
        )}
        <Text style={styles.offerText}>{organizer} is planning: </Text>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.askText}>Would you like to join?</Text>

        <TouchableOpacity style={[styles.button, styles.confirm]} onPress={() => handleButtonPress('confirm')}>
          <Text style={styles.buttonText}>Yes, Join</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.decline]} onPress={() => handleButtonPress('decline')}>
          <Text style={[styles.buttonText, styles.declineText]}>No, Thanks</Text>
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
    paddingTop: Platform.OS === 'ios' ? 100 : isWeb ? 16 : 80,
    alignItems: 'center',
    paddingHorizontal: isWeb ? 16 : 20,
  },
  headerText: {
    fontSize: isWeb ? 22 : 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  content: {
    padding: isWeb ? 20 : 24,
    alignItems: 'center',
    ...(isWeb && {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  offerText: {
    fontSize: isWeb ? 16 : 18,
    color: '#475569',
  },
  titleText: {
    fontSize: isWeb ? 18 : 20,
    fontWeight: 'bold',
    marginVertical: isWeb ? 6 : 8,
    color: '#1E293B',
  },
  askText: {
    fontSize: isWeb ? 16 : 18,
    color: '#475569',
    marginBottom: isWeb ? 12 : 16,
  },
  button: {
    paddingVertical: isWeb ? 12 : 14,
    paddingHorizontal: isWeb ? 28 : 32,
    borderRadius: 12,
    marginBottom: isWeb ? 10 : 12,
    width: isWeb ? '60%' : '70%',
    alignItems: 'center',
    ...(isWeb && {
      maxWidth: 400,
    }),
  },
  confirm: {
    backgroundColor: '#10B981',
  },
  decline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: isWeb ? 15 : 16,
  },
  declineText: {
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
