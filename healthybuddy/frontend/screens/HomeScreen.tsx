import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { voiceService } from '../services/voiceService';
import { api } from '../services/api';

interface HomeScreenProps {
  onStartVoiceGreeting: () => void;
  onEventMatching?: () => void;
  onOpenCalendar?: () => void;
  onOpenFriendMatch?: () => void;
}

export default function HomeScreen({ onStartVoiceGreeting, onEventMatching, onOpenCalendar, onOpenFriendMatch }: HomeScreenProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkBackendConnection();
    
    // Cleanup: stop TTS when leaving HomeScreen
    return () => {
      voiceService.stopSpeaking().catch(() => {});
    };
  }, []);

  const checkBackendConnection = async () => {
    setIsChecking(true);
    const connected = await api.checkHealth();
    setIsConnected(connected);
    setIsChecking(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CareBuddy</Text>
        <Text style={styles.subtitle}>Voice Companion for Wellness</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Connect with friends through voice conversations
        </Text>

        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={[styles.boxButton, styles.eventBox, !isConnected && styles.buttonDisabled]}
            onPress={async () => {
              // Stop any ongoing TTS before navigating
              await voiceService.stopSpeaking();
              if (onEventMatching) {
                onEventMatching();
              } else {
                console.log('Event Matching pressed');
              }
            }}
            disabled={!isConnected}
          >
            <Text style={[styles.boxButtonText, styles.eventText]}>Event Matching</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boxButton, styles.chatBox, !isConnected && styles.buttonDisabled]}
            onPress={async () => {
              await voiceService.stopSpeaking();
              onStartVoiceGreeting();
            }}
            disabled={!isConnected}
          >
            <Text style={[styles.boxButtonText, styles.chatText]}>
              Voice Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boxButton, styles.friendBox, !isConnected && styles.buttonDisabled]}
            onPress={async () => {
              // Stop any ongoing TTS before navigating
              await voiceService.stopSpeaking();
              if (onOpenFriendMatch) {
                onOpenFriendMatch();
              } else {
                console.log('Friend Match pressed');
              }
            }}
            disabled={!isConnected}
          >
            <Text style={[styles.boxButtonText, styles.friendText]}>Find Friend Match</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boxButton, styles.calendarBox]}
            onPress={async () => {
              // Stop any ongoing TTS before navigating
              await voiceService.stopSpeaking();
              if (onOpenCalendar) {
                onOpenCalendar();
              } else {
                console.log('Open Calendar');
              }
            }}
          >
            <Text style={[styles.boxButtonText, styles.calendarText]}>My Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This app operates entirely by voice
        </Text>
      </View>
    </View>
  );
}

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    padding: isWeb ? 20 : 24,
    ...(isWeb && {
      maxWidth: 700,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 100 : isWeb ? 20 : 60,
    marginBottom: isWeb ? 30 : 40,
    alignItems: 'center',
  },
  title: {
    fontSize: isWeb ? 40 : 48,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isWeb ? 18 : 20,
    color: '#64748B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: isWeb ? 20 : 24,
    color: '#475569',
    textAlign: 'center',
    marginBottom: isWeb ? 30 : 40,
    paddingHorizontal: 20,
  },
  buttonGrid: {
    width: '100%',
    paddingHorizontal: isWeb ? 0 : 20,
    flexDirection: 'column',
    gap: isWeb ? 12 : 16,
    ...(isWeb && {
      maxWidth: 600,
      alignSelf: 'center',
    }),
  },
  boxButton: {
    width: '100%',
    paddingVertical: isWeb ? 16 : 20,
    paddingHorizontal: isWeb ? 20 : 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventBox: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#059669',
  },
  chatBox: {
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
  calendarBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  friendBox: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  buttonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.6,
  },
  boxButtonText: {
    fontSize: isWeb ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eventText: {
    color: '#FFFFFF',
  },
  chatText: {
    color: '#FFFFFF',
  },
  calendarText: {
    color: '#2563EB',
  },
  friendText: {
    color: '#FFFFFF',
  },
  statusContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    marginTop: 20,
  },
  statusConnected: {
    color: '#10B981',
  },
  statusError: {
    color: '#EF4444',
    marginBottom: 8,
  },
  retryText: {
    fontSize: 16,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  footer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: isWeb ? 16 : 18,
    color: '#94A3B8',
  },
});
