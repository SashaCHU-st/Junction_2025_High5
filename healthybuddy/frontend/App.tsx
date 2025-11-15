import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import VoiceChatScreen from './screens/VoiceChatScreen';
import FriendMatchScreen from './screens/FriendMatchScreen';
import { FriendMatch } from './types';

type Screen = 'home' | 'voiceChat' | 'friendMatch';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [friendMatch, setFriendMatch] = useState<FriendMatch | null>(null);

  const handleStartVoiceGreeting = () => {
    setCurrentScreen('voiceChat');
  };

  const handleFriendMatchFound = (match: FriendMatch) => {
    setFriendMatch(match);
    setCurrentScreen('friendMatch');
  };

  const handleStartNewConversation = () => {
    setFriendMatch(null);
    setCurrentScreen('home');
  };

  const handleGoBack = () => {
    setCurrentScreen('home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {currentScreen === 'home' && (
        <HomeScreen onStartVoiceGreeting={handleStartVoiceGreeting} />
      )}

      {currentScreen === 'voiceChat' && (
        <VoiceChatScreen
          onFriendMatchFound={handleFriendMatchFound}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'friendMatch' && friendMatch && (
        <FriendMatchScreen
          friendMatch={friendMatch}
          onStartNewConversation={handleStartNewConversation}
          onGoBack={handleGoBack}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
});
