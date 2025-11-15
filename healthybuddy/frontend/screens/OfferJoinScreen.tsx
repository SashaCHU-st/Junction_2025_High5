import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { voiceService } from '../services/voiceService';

interface Props {
  id: string;
  title: string;
  organizer: string;
  activity?: string;
  onConfirm: () => void;
  onDecline: () => void;
}

export default function OfferJoinScreen({ id, title, organizer, activity, onConfirm, onDecline }: Props) {
  useEffect(() => {
    const prompt = `${organizer} is planning to ${activity || 'this activity'} now. Would you like to join ${title}? Say yes to join or no to decline.`;
    voiceService.speak(prompt).catch((error) => {
      console.error('Error speaking prompt:', error);
    });

    // Cleanup: stop TTS when leaving screen
    return () => {
      voiceService.stopSpeaking().catch(() => {});
    };
  }, [organizer, activity, title]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Join Offer</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.offerText}>{organizer} is planning: </Text>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.askText}>Would you like to join?</Text>

        <TouchableOpacity style={[styles.button, styles.confirm]} onPress={onConfirm}>
          <Text style={styles.buttonText}>Yes, Join</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.decline]} onPress={onDecline}>
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
});
