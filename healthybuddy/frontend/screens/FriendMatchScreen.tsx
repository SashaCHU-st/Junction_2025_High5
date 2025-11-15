import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FriendMatch } from '../types';
import { voiceService } from '../services/voiceService';
import { matchVoiceOption, VoiceOption } from '../utils/voiceOptionMatcher';

interface FriendMatchScreenProps {
  friendMatch: FriendMatch;
  onStartNewConversation: () => void;
  onGoBack: () => void;
}

const options: VoiceOption[] = [
  { keywords: ['start new conversation', 'new conversation', 'start new', 'new'], value: 'startNewConversation' },
  { keywords: ['repeat', 'repeat match info', 'repeat info', 'say again'], value: 'repeatInfo' },
  { keywords: ['back', 'home', 'cancel', 'go back'], value: 'goBack' },
];

export default function FriendMatchScreen({
  friendMatch,
  onStartNewConversation,
  onGoBack,
}: FriendMatchScreenProps) {
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

      const announcement = retry
        ? `I didn't hear you. I found a great match for you! ${friendMatch.candidateName}, age ${friendMatch.candidateAge}. You both share interests in ${friendMatch.commonInterests.join(', ')}. ${friendMatch.reason}. Your match score is ${friendMatch.matchScore} out of 100! What would you like to do? Say "start new conversation", "repeat info", or "back".`
        : `I found a great match for you! ${friendMatch.candidateName}, age ${friendMatch.candidateAge}. You both share interests in ${friendMatch.commonInterests.join(', ')}. ${friendMatch.reason}. Your match score is ${friendMatch.matchScore} out of 100! What would you like to do? Say "start new conversation", "repeat info", or "back".`;

      await voiceService.speak(announcement).catch((error) => {
        console.error('Error speaking announcement:', error);
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
        if (matched === 'startNewConversation') {
          onStartNewConversation();
          return;
        } else if (matched === 'repeatInfo') {
          await startSpeaking(false); // Replay the announcement
          return;
        } else if (matched === 'goBack') {
          onGoBack();
          return;
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
  }, [friendMatch, onStartNewConversation, onGoBack]);

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
    
    if (value === 'startNewConversation') {
      onStartNewConversation();
    } else if (value === 'goBack') {
      onGoBack();
    } else if (value === 'repeatInfo') {
      // Replay the announcement without triggering the full useEffect cycle
      const announcement = `I found a great match for you! ${friendMatch.candidateName}, age ${friendMatch.candidateAge}. You both share interests in ${friendMatch.commonInterests.join(', ')}. ${friendMatch.reason}. Your match score is ${friendMatch.matchScore} out of 100!`;
      await voiceService.speak(announcement).catch((error) => {
        console.error('Error speaking announcement:', error);
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleButtonPress('goBack')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Friend Match Found!</Text>
      </View>

      <View style={styles.content}>
        {isListening && (
          <Text style={styles.listeningText}>
            🎤 Listening... Say "start new conversation", "repeat info", or "back"
          </Text>
        )}
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
          onPress={() => handleButtonPress('startNewConversation')}
        >
          <Text style={styles.buttonText}>Start Another Conversation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => handleButtonPress('repeatInfo')}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Repeat Match Info (Voice)
          </Text>
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
    backgroundColor: '#10B981',
    padding: isWeb ? 16 : 20,
    paddingTop: Platform.OS === 'ios' ? 100 : isWeb ? 16 : 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: isWeb ? 6 : 8,
    marginRight: isWeb ? 10 : 12,
  },
  backButtonText: {
    fontSize: isWeb ? 18 : 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: isWeb ? 24 : 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: isWeb ? 0 : 60,
  },
  content: {
    flex: 1,
    padding: isWeb ? 20 : 24,
    ...(isWeb && {
      maxWidth: 650,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isWeb ? 20 : 24,
    marginBottom: isWeb ? 20 : 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  nameText: {
    fontSize: isWeb ? 32 : 36,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  ageText: {
    fontSize: isWeb ? 18 : 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: isWeb ? 20 : 24,
  },
  scoreContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: isWeb ? 14 : 16,
    marginBottom: isWeb ? 20 : 24,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: isWeb ? 16 : 18,
    color: '#166534',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: isWeb ? 40 : 48,
    fontWeight: 'bold',
    color: '#10B981',
  },
  section: {
    marginBottom: isWeb ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isWeb ? 18 : 20,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: isWeb ? 10 : 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingVertical: isWeb ? 6 : 8,
    paddingHorizontal: isWeb ? 14 : 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: isWeb ? 14 : 16,
    color: '#1E40AF',
  },
  reasonText: {
    fontSize: isWeb ? 16 : 18,
    color: '#475569',
    lineHeight: isWeb ? 24 : 26,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: isWeb ? 16 : 20,
    paddingHorizontal: isWeb ? 28 : 32,
    borderRadius: 12,
    marginBottom: isWeb ? 12 : 16,
    ...(isWeb && {
      maxWidth: 500,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: isWeb ? 18 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#2563EB',
  },
  listeningText: {
    fontSize: isWeb ? 14 : 16,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: isWeb ? 12 : 16,
    textAlign: 'center',
  },
});
