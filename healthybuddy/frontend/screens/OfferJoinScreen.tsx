import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    
    // Stop any ongoing recognition
    if (isListening) {
      await voiceService.stopSpeechRecognition();
      setIsListening(false);
      recognitionRef.current = null;
    }
    // Stop TTS
    await voiceService.stopSpeaking();
    
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { paddingTop: 80, alignItems: 'center' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  content: { padding: 24, alignItems: 'center' },
  offerText: { fontSize: 18, color: '#475569' },
  titleText: { fontSize: 20, fontWeight: 'bold', marginVertical: 8, color: '#1E293B' },
  askText: { fontSize: 18, color: '#475569', marginBottom: 16 },
  button: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12, width: '70%', alignItems: 'center' },
  confirm: { backgroundColor: '#10B981' },
  decline: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#94A3B8' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  declineText: { color: '#334155' },
  listeningText: { fontSize: 16, color: '#10B981', fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
});
