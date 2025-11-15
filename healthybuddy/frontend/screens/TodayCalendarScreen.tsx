import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform } from 'react-native';
import { voiceService } from '../services/voiceService';

interface JoinedEvent {
  id: string;
  title: string;
  activity?: string;
  joinedAt: string; // ISO string
}

interface Props {
  events: JoinedEvent[];
  onGoBack: () => void;
}

function formatYMD(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthMatrix(year: number, month: number) {
  // month: 0-11
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 Sun .. 6 Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  // fill initial nulls
  for (let i = 0; i < startDay; i++) currentWeek.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
}

export default function TodayCalendarScreen({ events, onGoBack }: Props) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(formatYMD(today));
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const { year, month, weeks, eventsByDate } = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth();
    const w = monthMatrix(y, m);

    const map: Record<string, JoinedEvent[]> = {};
    events.forEach((ev) => {
      const d = formatYMD(new Date(ev.joinedAt));
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });

    return { year: y, month: m, weeks: w, eventsByDate: map };
  }, [events]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const eventsForSelected = eventsByDate[selectedDate] ?? [];

  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      // Speak after 1 second delay when user interacts
      setTimeout(() => {
        const summary = eventsForSelected.length === 0
          ? `No sign ups for ${new Date(selectedDate).toLocaleDateString()}.`
          : `You have ${eventsForSelected.length} sign up${eventsForSelected.length > 1 ? 's' : ''} on ${new Date(selectedDate).toLocaleDateString()}. The first is ${eventsForSelected[0].title}.`;
        voiceService.speak(summary).catch((error) => {
          console.error('Error speaking summary:', error);
        });
      }, 1000);
    }
  };

  return (
    <View 
      style={styles.container}
      onTouchStart={handleUserInteraction}
      {...(Platform.OS === 'web' ? { onMouseDown: handleUserInteraction } : {})}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>My Calendar — {today.toLocaleString(undefined, { month: 'long' })} {year}</Text>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.weekRow}>
          {dayNames.map((d) => (
            <Text key={d} style={styles.dayName}>{d}</Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.dayCellEmpty} />;
              const dateStr = formatYMD(new Date(year, month, day));
              const hasEvents = !!eventsByDate[dateStr];
              const isSelected = dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={di}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text style={[styles.dayNumber, hasEvents && styles.dayNumberMarked]}>{day}</Text>
                  {hasEvents ? <View style={styles.dot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.eventsList}>
        <Text style={styles.sectionTitle}>Events on {new Date(selectedDate).toLocaleDateString()}</Text>
        {eventsForSelected.length === 0 ? (
          <Text style={styles.emptyText}>No sign-ups for this date.</Text>
        ) : (
          <FlatList
            data={eventsForSelected}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.eventRow}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMeta}>Activity: {item.activity ?? '—'}</Text>
                <Text style={styles.eventMeta}>Signed: {new Date(item.joinedAt).toLocaleTimeString()}</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' },
  backButton: { position: 'absolute', left: 16, top: 60, padding: 8 },
  backButtonText: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', textAlign: 'center' },
  calendarContainer: { padding: 12, paddingHorizontal: 18 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dayName: { width: `${100/7}%`, textAlign: 'center', color: '#64748B', fontWeight: '600' },
  dayCell: { width: `${100/7}%`, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  dayCellEmpty: { width: `${100/7}%`, paddingVertical: 8 },
  dayNumber: { fontSize: 14, color: '#1E293B' },
  dayNumberMarked: { color: '#10B981', fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginTop: 4 },
  dayCellSelected: { backgroundColor: '#E6F9F0' },
  eventsList: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#64748B' },
  eventRow: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, marginBottom: 10 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  eventMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
});
