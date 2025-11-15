import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { voiceService } from '../services/voiceService';

interface ActivityOptionsScreenProps {
  activityType: 'physical' | 'mental';
  onChoose: (choice: string) => void;
  onGoBack: () => void;
}

export default function ActivityOptionsScreen({ activityType, onChoose, onGoBack }: ActivityOptionsScreenProps) {
  // Speak prompt depending on activity type
  useEffect(() => {
    if (activityType === 'physical') {
      // This app targets older people, so suggest options accordingly
      voiceService.speak('Would you like activities suitable for older people, or activities for all ages? Say older people or all ages.').catch(() => {});
    } else {
      voiceService.speak('Which type of mental activities do you prefer? Relaxation, cognitive puzzles, or learning?').catch(() => {});
    }
  }, [activityType]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {activityType === 'physical'
            ? 'Would you like physical activities for older people?'
            : 'Which type of mental activities do you prefer?'}
        </Text>
      </View>

      <View style={styles.content}>
        {activityType === 'physical' ? (
          <>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => onChoose('olderPeople')}
            >
              <Text style={styles.optionText}>Yes — For older people</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => onChoose('allAges')}
            >
              <Text style={styles.optionText}>No — For all ages</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => onChoose('relaxation')}
            >
              <Text style={styles.optionText}>Relaxation / Mindfulness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => onChoose('cognitive')}
            >
              <Text style={styles.optionText}>Cognitive / Puzzles</Text>
            </TouchableOpacity>
          </>
        )}

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
  optionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
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
