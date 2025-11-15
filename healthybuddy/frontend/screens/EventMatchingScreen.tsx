import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { voiceService } from '../services/voiceService';

interface EventMatchingScreenProps {
  onChoose: (choice: string) => void;
  onGoBack: () => void;
}

export default function EventMatchingScreen({ onChoose, onGoBack }: EventMatchingScreenProps) {
  useEffect(() => {
    // Stop any previous TTS first, then start new one
    const startSpeaking = async () => {
      await voiceService.stopSpeaking();
      const prompt = 'What would you like to do today? You can choose Physical Activities or Mental Activities.';
      await voiceService.speak(prompt).catch((error) => {
        console.error('Error speaking prompt:', error);
      });
    };

    startSpeaking();

    // Cleanup: stop TTS when leaving screen
    return () => {
      voiceService.stopSpeaking().catch(() => {});
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>What would you like to do today?</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.prompt}>
          Choose one of the options below to get started.
        </Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => onChoose('physicalActivities')}
        >
          <Text style={styles.optionText}>Physical Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => onChoose('mentalActivities')}
        >
          <Text style={styles.optionText}>Mental Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionButton, styles.cancelButton]} onPress={onGoBack}>
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
});
