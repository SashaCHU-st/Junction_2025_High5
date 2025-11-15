import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../services/api';

interface HomeScreenProps {
  onStartVoiceGreeting: () => void;
}

export default function HomeScreen({ onStartVoiceGreeting }: HomeScreenProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkBackendConnection();
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
        <Text style={styles.title}>HealthyBuddy</Text>
        <Text style={styles.subtitle}>Voice Companion for Wellness</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Connect with friends through voice conversations
        </Text>

        <TouchableOpacity
          style={[styles.button, !isConnected && styles.buttonDisabled]}
          onPress={onStartVoiceGreeting}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>
            Start Today's Voice Greeting
          </Text>
        </TouchableOpacity>

        {isChecking ? (
          <Text style={styles.statusText}>Checking connection...</Text>
        ) : isConnected ? (
          <Text style={[styles.statusText, styles.statusConnected]}>
            ✓ Connected to backend
          </Text>
        ) : (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, styles.statusError]}>
              × Cannot connect to backend
            </Text>
            <TouchableOpacity onPress={checkBackendConnection}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This app operates entirely by voice
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    padding: 24,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#64748B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 24,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
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
    fontSize: 18,
    color: '#94A3B8',
  },
});
