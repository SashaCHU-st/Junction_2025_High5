import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { voiceService } from '../services/voiceService';
import { matchVoiceOption, VoiceOption } from '../utils/voiceOptionMatcher';

interface EventNearbyScreenProps {
  forActivity: string; // e.g., 'walk', 'sport_equipment'
  onChoose: (action: string) => void;
  onGoBack: () => void;
}

const sampleEvents = (activity: string) => [
  { id: '1', title: `Local ${activity} meetup`, distance: '0.5 km', organizer: 'Juha-Pekka' },
  { id: '2', title: `${activity} Park Group`, distance: '1.2 km', organizer: 'Liisa' },
  { id: '3', title: `Community ${activity} Session`, distance: '2.1 km', organizer: 'Community Center' },
];

export default function EventNearbyScreen({ forActivity, onChoose, onGoBack }: EventNearbyScreenProps) {
  const events = sampleEvents(forActivity);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<Promise<string | null> | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Create voice options for all events
  const eventOptions: VoiceOption[] = events.map((event, index) => {
    const keywords: string[] = [
      `event ${index + 1}`,
      `number ${index + 1}`,
      `${index + 1}`,
    ];
    
    // Add ordinal keywords (first, second, third, etc.)
    if (index === 0) keywords.push('first', 'one');
    if (index === 1) keywords.push('second', 'two');
    if (index === 2) keywords.push('third', 'three');
    if (index === 3) keywords.push('fourth', 'four');
    if (index === 4) keywords.push('fifth', 'five');
    
    // Add keywords from event title (lowercase, split by spaces)
    const titleWords = event.title.toLowerCase().split(/\s+/);
    keywords.push(...titleWords.filter(word => word.length > 3)); // Only add meaningful words
    
    // Add specific keywords from title
    if (event.title.toLowerCase().includes('local')) keywords.push('local');
    if (event.title.toLowerCase().includes('park')) keywords.push('park');
    if (event.title.toLowerCase().includes('community')) keywords.push('community');
    if (event.title.toLowerCase().includes('meetup')) keywords.push('meetup');
    if (event.title.toLowerCase().includes('group')) keywords.push('group');
    if (event.title.toLowerCase().includes('session')) keywords.push('session');
    
    // Add organizer name as keyword (first name only)
    const organizerFirst = event.organizer.split(' ')[0].toLowerCase();
    if (organizerFirst.length > 2) {
      keywords.push(organizerFirst);
    }
    
    return {
      keywords,
      value: `offer:${event.id}:${event.title}:${event.organizer}`,
    };
  });

  // Add cancel option
  const allOptions: VoiceOption[] = [
    ...eventOptions,
    { keywords: ['cancel', 'back', 'close'], value: 'cancel' },
  ];

  useEffect(() => {
    isCancelledRef.current = false;
    recognitionRef.current = null; // Clear any previous recognition promise
    
    // Stop any previous TTS first, then start new one
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
      
      // Build intro text with all events
      let intro = `Here are ${events.length} events near you for ${forActivity}. `;
      events.forEach((event, index) => {
        intro += `Event ${index + 1}: ${event.title}, ${event.distance} away, organized by ${event.organizer}. `;
      });
      
      const prompt = retry
        ? `I didn't hear you. ${intro} Which event would you like to join? Say the event number or name.`
        : `${intro} Which event would you like to join? Say the event number or name.`;
      
      await voiceService.speak(prompt).catch((error) => {
        console.error('Error speaking prompt:', error);
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
        const matched = matchVoiceOption(transcript, allOptions);
        if (matched) {
          if (matched === 'cancel') {
            onGoBack();
          } else {
            onChoose(matched);
          }
          return; // Success, exit
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
  }, [forActivity, events.length]);

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
    
    if (value === 'cancel') {
      onGoBack();
    } else {
      onChoose(value);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleButtonPress('cancel')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Events Near You</Text>
        <Text style={styles.subHeader}>Suggestions for: {forActivity}</Text>
      </View>

      <View style={styles.content}>
        {isListening && (
          <Text style={styles.listeningText}>
            🎤 Listening... Say the event number or name
          </Text>
        )}
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.eventCard}>
              <Text style={styles.eventNumber}>Event {index + 1}</Text>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.eventDistance}>{item.distance}</Text>
              <Text style={styles.eventOrganizer}>Organized by: {item.organizer}</Text>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleButtonPress(`offer:${item.id}:${item.title}:${item.organizer}`)}
              >
                <Text style={styles.joinText}>View / Join</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => handleButtonPress('cancel')}>
          <Text style={styles.cancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' },
  backButton: { position: 'absolute', left: 16, top: 60, padding: 8 },
  backButtonText: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subHeader: { fontSize: 14, color: '#64748B', marginTop: 6 },
  content: { flex: 1 },
  listeningText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  list: { padding: 20 },
  eventCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  eventNumber: { fontSize: 14, color: '#2563EB', fontWeight: 'bold', marginBottom: 4 },
  eventTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  eventDistance: { fontSize: 14, color: '#64748B', marginVertical: 6 },
  eventOrganizer: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  joinButton: { backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  joinText: { color: '#FFFFFF', fontWeight: 'bold', paddingHorizontal: 12 },
  footer: { padding: 20, alignItems: 'center' },
  cancelButton: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#94A3B8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelText: { color: '#334155', fontWeight: 'bold' },
});
