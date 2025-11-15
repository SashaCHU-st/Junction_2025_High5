import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import VoiceChatScreen from './screens/VoiceChatScreen';
import FriendMatchScreen from './screens/FriendMatchScreen';
import EventMatchingScreen from './screens/EventMatchingScreen';
import ActivityOptionsScreen from './screens/ActivityOptionsScreen';
import ActivityDetailScreen from './screens/ActivityDetailScreen';
import EventNearbyScreen from './screens/EventNearbyScreen';
import { FriendMatch } from './types';

type Screen = 'home' | 'voiceChat' | 'friendMatch' | 'eventMatching' | 'activityOptions' | 'activityDetail' | 'eventNearby';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [friendMatch, setFriendMatch] = useState<FriendMatch | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<'physical' | 'mental' | null>(null);
  const [selectedActivitySub, setSelectedActivitySub] = useState<string | null>(null);
  const [nearbyFor, setNearbyFor] = useState<string | null>(null);

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

  const handleOpenActivityDetail = (activityType: 'physical' | 'mental', subChoice: string) => {
    setSelectedActivityType(activityType);
    setSelectedActivitySub(subChoice);
    setCurrentScreen('activityDetail');
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
            // Open deeper detail questions (e.g., walk vs sport-with-equipment)
            handleOpenActivityDetail(selectedActivityType, detailChoice);
          }}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'activityDetail' && selectedActivityType && selectedActivitySub && (
        <ActivityDetailScreen
          activityType={selectedActivityType}
          activitySub={selectedActivitySub}
          onChoose={(finalChoice: string) => {
            // Detect nearby request which is encoded as 'nearby:<choice>'
            if (finalChoice.startsWith('nearby:')) {
              const choice = finalChoice.replace('nearby:', '');
              setNearbyFor(choice);
              setCurrentScreen('eventNearby');
              return;
            }

            console.log('Final activity choice:', selectedActivityType, selectedActivitySub, finalChoice);
            // TODO: replace with matching API, voice prompts, or navigation to results
            setCurrentScreen('home');
          }}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'eventNearby' && nearbyFor && (
        <EventNearbyScreen
          forActivity={nearbyFor}
          onChoose={(action: string) => {
            console.log('EventNearby action:', nearbyFor, action);
            // For now, any action returns home; extend as needed
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
