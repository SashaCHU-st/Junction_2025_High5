import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import HomeScreen from './screens/HomeScreen';
import VoiceChatScreen from './screens/VoiceChatScreen';
import FriendMatchScreen from './screens/FriendMatchScreen';
import EventMatchingScreen from './screens/EventMatchingScreen';
import ActivityOptionsScreen from './screens/ActivityOptionsScreen';
import ActivityDetailScreen from './screens/ActivityDetailScreen';
import EventNearbyScreen from './screens/EventNearbyScreen';
import TodayCalendarScreen from './screens/TodayCalendarScreen';
import OfferJoinScreen from './screens/OfferJoinScreen';
import { FriendMatch } from './types';

type Screen = 'home' | 'voiceChat' | 'friendMatch' | 'eventMatching' | 'activityOptions' | 'activityDetail' | 'eventNearby' | 'joinedEvents' | 'offerJoin';

// type Screen = 'home' | 'voiceChat' | 'friendMatch';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [friendMatch, setFriendMatch] = useState<FriendMatch | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<'physical' | 'mental' | null>(null);
  const [selectedActivitySub, setSelectedActivitySub] = useState<string | null>(null);
  const [nearbyFor, setNearbyFor] = useState<string | null>(null);
  const [pendingOffer, setPendingOffer] = useState<{id: string; title: string; organizer: string; activity?: string} | null>(null);
  const [joinedEvents, setJoinedEvents] = useState<Array<{id: string; title: string; activity?: string; joinedAt: string;}>>([]);

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

  const handleStartVoiceGreeting = async () => {
    // Stop any TTS from HomeScreen before navigating
    const { voiceService } = await import('./services/voiceService');
    await voiceService.stopSpeaking();
    setCurrentScreen('voiceChat');
  };

  const handleOpenEventMatching = async () => {
    // Stop any TTS from HomeScreen before navigating
    const { voiceService } = await import('./services/voiceService');
    await voiceService.stopSpeaking();
    setCurrentScreen('eventMatching');
  };

  const handleOpenCalendar = async () => {
    // Stop any TTS from HomeScreen before navigating
    const { voiceService } = await import('./services/voiceService');
    await voiceService.stopSpeaking();
    setCurrentScreen('joinedEvents');
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

    if (choice === 'physicalActivities') {
      // App is for older people — skip age question and go straight to detail
      handleOpenActivityDetail('physical', 'olderPeople');
      return;
    }

    if (choice === 'mentalActivities') {
      // Mental activities go directly to detail screen (no options screen needed)
      handleOpenActivityDetail('mental', 'mental');
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
    <View style={styles.container}>
      <StatusBar style="auto" />

      {currentScreen === 'home' && (
        <HomeScreen
          onStartVoiceGreeting={handleStartVoiceGreeting}
          onEventMatching={handleOpenEventMatching}
          onOpenCalendar={handleOpenCalendar}
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
            // When user selects an activity detail (e.g., 'walk', 'sport', 'puzzles'),
            // immediately show matching nearby offers by opening EventNearbyScreen.
            if (finalChoice.startsWith('nearby:')) {
              const choice = finalChoice.replace('nearby:', '');
              setNearbyFor(choice);
              setCurrentScreen('eventNearby');
              return;
            }

            // For any other final choice, show matching events for that activity
            setNearbyFor(finalChoice);
            setCurrentScreen('eventNearby');
          }}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'eventNearby' && nearbyFor && (
        <EventNearbyScreen
          forActivity={nearbyFor}
          onChoose={(action: string) => {
            // Expecting format: 'offer:<id>:<title>:<organizer>' or 'join:' legacy
            if (action.startsWith('offer:')) {
              const parts = action.split(':');
              const id = parts[1] ?? String(Date.now());
              const title = parts[2] ?? `Event ${id}`;
              const organizer = parts[3] ?? 'Someone';
              setPendingOffer({ id, title, organizer, activity: nearbyFor });
              setCurrentScreen('offerJoin');
              return;
            }

            if (action.startsWith('join:')) {
              const parts = action.split(':');
              const id = parts[1] ?? String(Date.now());
              const title = parts.slice(2).join(':') || `Event ${id}`;
              const joinedAt = new Date().toISOString();
              setJoinedEvents((prev) => [{ id, title, activity: nearbyFor, joinedAt }, ...prev]);
              setCurrentScreen('joinedEvents');
              return;
            }

            console.log('EventNearby action:', nearbyFor, action);
            setCurrentScreen('home');
          }}
          onGoBack={handleGoBack}
        />
      )}

      {currentScreen === 'offerJoin' && pendingOffer && (
        <OfferJoinScreen
          id={pendingOffer.id}
          title={pendingOffer.title}
          organizer={pendingOffer.organizer}
          activity={pendingOffer.activity}
          onConfirm={() => {
            const joinedAt = new Date().toISOString();
            setJoinedEvents((prev) => [{ id: pendingOffer.id, title: pendingOffer.title, activity: pendingOffer.activity, joinedAt }, ...prev]);
            setPendingOffer(null);
            setCurrentScreen('joinedEvents');
          }}
          onDecline={() => {
            setPendingOffer(null);
            setCurrentScreen('eventNearby');
          }}
        />
      )}

      {currentScreen === 'joinedEvents' && (
        <TodayCalendarScreen
          events={joinedEvents}
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
