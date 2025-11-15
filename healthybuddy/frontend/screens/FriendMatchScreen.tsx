import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FriendMatch } from '../types';
import { voiceService } from '../services/voiceService';

interface FriendMatchScreenProps {
  friendMatch: FriendMatch;
  onStartNewConversation: () => void;
  onGoBack: () => void;
}

export default function FriendMatchScreen({
  friendMatch,
  onStartNewConversation,
  onGoBack,
}: FriendMatchScreenProps) {
  useEffect(() => {
    announceMatch();
  }, []);

  const announceMatch = async () => {
    const announcement = `I found a great match for you! ${friendMatch.candidateName}, age ${friendMatch.candidateAge}.
    You both share interests in ${friendMatch.commonInterests.join(', ')}.
    ${friendMatch.reason}.
    Your match score is ${friendMatch.matchScore} out of 100!`;

    await voiceService.speak(announcement);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Friend Match Found!</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.matchCard}>
          <Text style={styles.nameText}>{friendMatch.candidateName}</Text>
          <Text style={styles.ageText}>Age {friendMatch.candidateAge}</Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Match Score</Text>
            <Text style={styles.scoreValue}>{friendMatch.matchScore}/100</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Interests</Text>
            <View style={styles.interestsContainer}>
              {friendMatch.commonInterests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why This Match?</Text>
            <Text style={styles.reasonText}>{friendMatch.reason}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={onStartNewConversation}
        >
          <Text style={styles.buttonText}>Start Another Conversation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => voiceService.speak(`The match is ${friendMatch.candidateName}. You share interests in ${friendMatch.commonInterests.join(', ')}`)}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Repeat Match Info (Voice)
          </Text>
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
    backgroundColor: '#10B981',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 60, // Balance the back button
  },
  content: {
    flex: 1,
    padding: 24,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  nameText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  ageText: {
    fontSize: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 18,
    color: '#166534',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 16,
    color: '#1E40AF',
  },
  reasonText: {
    fontSize: 18,
    color: '#475569',
    lineHeight: 26,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#2563EB',
  },
});
