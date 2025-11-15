import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

interface EventNearbyScreenProps {
  forActivity: string; // e.g., 'walk', 'sport_equipment'
  onChoose: (action: string) => void;
  onGoBack: () => void;
}

const sampleEvents = (activity: string) => [
  { id: '1', title: `Local ${activity} meetup`, distance: '0.5 km' },
  { id: '2', title: `${activity} Park Group`, distance: '1.2 km' },
  { id: '3', title: `Community ${activity} Session`, distance: '2.1 km' },
];

export default function EventNearbyScreen({ forActivity, onChoose, onGoBack }: EventNearbyScreenProps) {
  const events = sampleEvents(forActivity);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Events Near You</Text>
        <Text style={styles.subHeader}>Suggestions for: {forActivity}</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventDistance}>{item.distance}</Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => onChoose(`join:${item.id}:${item.title}`)}
            >
              <Text style={styles.joinText}>View / Join</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onGoBack}>
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
  list: { padding: 20 },
  eventCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  eventTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  eventDistance: { fontSize: 14, color: '#64748B', marginVertical: 6 },
  joinButton: { backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  joinText: { color: '#FFFFFF', fontWeight: 'bold', paddingHorizontal: 12 },
  footer: { padding: 20, alignItems: 'center' },
  cancelButton: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#94A3B8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelText: { color: '#334155', fontWeight: 'bold' },
});
