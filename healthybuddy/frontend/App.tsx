import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import HomeScreen from './screens/HomeScreen';
import VoiceChatScreen from './screens/VoiceChatScreen';
import FriendMatchScreen from './screens/FriendMatchScreen';
import { FriendMatch } from './types';


type Screen = 'home' | 'voiceChat' | 'friendMatch';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [friendMatch, setFriendMatch] = useState<FriendMatch | null>(null);

  useEffect(() => {
    // Handle deep links when app is opened via "carebuddy://" URL
    const handleDeepLink = (event: { url: string }) => {
      const { path, queryParams } = LinkingExpo.parse(event.url);
      console.log('Deep link received:', path, queryParams);
      
      if (path === 'home' || path === '') {
        setCurrentScreen('home');
      } else if (path === 'voiceChat') {
        setCurrentScreen('voiceChat');
      }
    };

    // Get initial URL if app was opened via deep link
    LinkingExpo.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep links while app is running
    const subscription = LinkingExpo.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

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
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
});
