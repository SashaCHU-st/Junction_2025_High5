import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ActivityDetailScreenProps {
  activityType: 'physical' | 'mental';
  activitySub: string; // e.g., 'olderPeople' | 'allAges' | 'relaxation' | 'cognitive'
  onChoose: (choice: string) => void;
  onGoBack: () => void;
}

export default function ActivityDetailScreen({ activityType, activitySub, onChoose, onGoBack }: ActivityDetailScreenProps) {
  // For physical activity subtypes, ask what exactly they'd like to do
  const renderPhysicalOptions = () => (
    <>
      <TouchableOpacity style={styles.optionButton} onPress={() => onChoose('walk')}>
        <Text style={styles.optionText}>Walk / Gentle Walk</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => onChoose('sport')}>
        <Text style={styles.optionText}>Sport</Text>
      </TouchableOpacity>
    </>
  );

  const renderMentalOptions = () => (
    <>
      <TouchableOpacity style={styles.optionButton} onPress={() => onChoose('guided_relaxation')}>
        <Text style={styles.optionText}>Guided Relaxation / Mindfulness</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => onChoose('puzzles')}>
        <Text style={styles.optionText}>Puzzles / Cognitive Games</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => onChoose('learning')}>
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
        <Text style={styles.subText}>
          {activityType === 'physical'
            ? activitySub === 'olderPeople'
              ? 'Options suitable for older people:'
              : 'Physical activity options:'
            : 'Mental activity options:'}
        </Text>

        {activityType === 'physical' ? renderPhysicalOptions() : renderMentalOptions()}

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
});
