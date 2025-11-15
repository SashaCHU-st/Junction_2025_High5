import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import VoiceChatScreen from './screens/VoiceChatScreen';
import FriendMatchScreen from './screens/FriendMatchScreen';
import EventMatchingScreen from './screens/EventMatchingScreen';
import ActivityOptionsScreen from './screens/ActivityOptionsScreen';
import { FriendMatch } from './types';

type Screen = 'home' | 'voiceChat' | 'friendMatch' | 'eventMatching' | 'activityOptions';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [friendMatch, setFriendMatch] = useState<FriendMatch | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<'physical' | 'mental' | null>(null);

  const handleStartVoiceGreeting = () => {
    setCurrentScreen('voiceChat');
  };

  const handleOpenEventMatching = () => {
    setCurrentScreen('eventMatching');
  };

  const handleOpenActivityOptions = (activityType: 'physical' | 'mental') => {
    setSelectedActivityType(activityType);
    setCurrentScreen('activityOptions');
  };

  const handleEventChoice = (choice: string) => {
    // Simple routing for choices; extend as needed
    if (choice === 'startVoice') {
      setCurrentScreen('voiceChat');
      return;
    }

    if (choice === 'physicalActivities' || choice === 'mentalActivities') {
      // Open follow-up options for the selected activity type
      handleOpenActivityOptions(choice === 'physicalActivities' ? 'physical' : 'mental');
      return;
    }

    // default: go back home
    setCurrentScreen('home');
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
        <HomeScreen
          onStartVoiceGreeting={handleStartVoiceGreeting}
          onEventMatching={handleOpenEventMatching}
        />
      )}

      {currentScreen === 'voiceChat' && (
        <VoiceChatScreen
          onFriendMatchFound={handleFriendMatchFound}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'eventMatching' && (
        <EventMatchingScreen
          onChoose={(choice: string) => handleEventChoice(choice)}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'activityOptions' && selectedActivityType && (
        <ActivityOptionsScreen
          activityType={selectedActivityType}
          onChoose={(detailChoice: string) => {
            console.log('Activity option chosen:', selectedActivityType, detailChoice);
            // TODO: implement matching/flow based on selection
            setCurrentScreen('home');
          }}
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
