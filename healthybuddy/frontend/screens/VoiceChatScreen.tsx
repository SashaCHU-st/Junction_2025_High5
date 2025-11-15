import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { voiceService } from '../services/voiceService';
import { api } from '../services/api';
import { VoiceSessionState, FriendMatch } from '../types';
import ScheduleManager, { ScheduleManagerHandle, TaskType } from './ScheduleManager';
import * as chrono from 'chrono-node';

export interface ParsedTask {
  title: string;
  hour: number;
  minute: number;
  type: TaskType;
  repeat: 'daily' | 'once' | 'weekly';
  date?: string; // YYYY-MM-DD
}

export function parseVoiceCommand(text: string): ParsedTask | null {
  const regex = /remind me to (.+)/i;
  const match = text.match(regex);
  if (!match) return null;

  let title = match[1].trim();

  // Determine type
  let type: TaskType = 'custom';
  if (/pill/i.test(title)) type = 'pill';
  else if (/walk/i.test(title)) type = 'walk';
  else if (/appointment|doctor|hospital/i.test(title)) type = 'appointment';

  const now = new Date();
  let hour = 9;
  let minute = 0;
  let dateStr: string | undefined;
  let repeat: 'daily' | 'once' | 'weekly' = 'daily';

  const textLower = text.toLowerCase();
  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  // Detect weekly recurrence
  let isWeekly = false;
  for (let wd of weekdays) {
    if (textLower.includes(`every ${wd}`)) {
      isWeekly = true;
      repeat = 'weekly';
      break;
    }
  }

  // Parse with Chrono
  const results = chrono.parse(text, now, { forwardDate: true });
  let parsedDate: Date | null = results.length > 0 ? results[0].start.date() : null;

  // Fix "next Friday", "this Friday" manually
  for (let i = 0; i < weekdays.length; i++) {
    const wd = weekdays[i];
    if (textLower.includes(`next ${wd}`) || textLower.includes(`this ${wd}`)) {
      const targetDay = i;
      let delta = targetDay - now.getDay();
      if (textLower.includes('next')) delta += delta <= 0 ? 7 : 0;
      if (textLower.includes('this')) delta += delta < 0 ? 7 : 0;

      const oldHour = parsedDate ? parsedDate.getHours() : hour;
      const oldMinute = parsedDate ? parsedDate.getMinutes() : minute;
      parsedDate = new Date(now);
      parsedDate.setDate(now.getDate() + delta);
      parsedDate.setHours(oldHour, oldMinute, 0, 0);
    }
  }

  // Extract hour/minute
  if (parsedDate && results.length > 0) {
    const kv = results[0].start.knownValues;
    const iv = results[0].start.impliedValues;
    hour = kv.hour ?? iv.hour ?? parsedDate.getHours() ?? hour;
    minute = kv.minute ?? iv.minute ?? parsedDate.getMinutes() ?? minute;
    parsedDate.setHours(hour, minute, 0, 0);
  }

  // Weekly adjustment: if weekly and parsed date is before today, set next week
  if (isWeekly && parsedDate) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const eventDay = new Date(parsedDate);
    eventDay.setHours(0,0,0,0);
    if (eventDay.getTime() < today.getTime()) parsedDate.setDate(parsedDate.getDate() + 7);
  }

  // Format date string
  if (parsedDate) {
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2,'0');
    const dd = String(parsedDate.getDate()).padStart(2,'0');
    dateStr = `${yyyy}-${mm}-${dd}`;

    // Determine repeat if not weekly
    if (!isWeekly) {
      const today = new Date();
      today.setHours(0,0,0,0);
      repeat = parsedDate.getTime() === today.getTime() ? 'daily' : 'once';
    }
  }

  return { title, hour, minute, type, repeat, date: dateStr };
}

interface VoiceChatScreenProps {
  onFriendMatchFound: (match: FriendMatch) => void;
  onGoBack: () => void;
}

export default function VoiceChatScreen({ onFriendMatchFound, onGoBack }: VoiceChatScreenProps) {
  const [sessionState, setSessionState] = useState<VoiceSessionState>({
    conversationStep: 0,
    userId: `user_${Date.now()}`,
    collectedData: { interests: [] },
  });
  const [conversation, setConversation] = useState<
    Array<{ role: 'system' | 'user'; text: string }>
  >([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scheduleRef = useRef<ScheduleManagerHandle>(null);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => { startConversation(); }, []);

  const startConversation = async () => {
    const greeting = "Good morning! How are you doing today? You can also say 'Remind me to...' to add a reminder.";
    setConversation([{ role: 'system', text: greeting }]);
    await speakText(greeting);
    setSessionState(prev => ({ ...prev, conversationStep: 1 }));
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    await voiceService.speak(text);
    setIsSpeaking(false);
  };

  const handleUserResponse = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userText = userInput.trim();
    setConversation(prev => [...prev, { role: 'user', text: userText }]);
    setUserInput('');
    setIsProcessing(true);

    try {
      const parsedTask = parseVoiceCommand(userText);
      if (parsedTask && scheduleRef.current) await scheduleRef.current.addTaskFromParsed(parsedTask);

      const response = await api.processVoice(sessionState.userId, userText, sessionState.conversationStep);

      setSessionState(prev => ({
        ...prev,
        conversationStep: prev.conversationStep + 1,
        collectedData: {
          steps: response.extractedData.steps || prev.collectedData.steps,
          mood: response.extractedData.mood || prev.collectedData.mood,
          interests: [...prev.collectedData.interests, ...(response.extractedData.interests || [])],
        },
        friendMatch: response.friendMatch,
      }));

      setConversation(prev => [...prev, { role: 'system', text: response.nextPrompt }]);
      await speakText(response.nextPrompt);

      if (response.friendMatch) setTimeout(() => onFriendMatchFound(response.friendMatch!), 2000);
    } catch (err) {
      console.error(err);
      const errorMsg = 'Sorry, I had trouble understanding. Could you try again?';
      setConversation(prev => [...prev, { role: 'system', text: errorMsg }]);
      await speakText(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Voice Conversation</Text>
            {isSpeaking && <Text style={styles.statusText}>🔊 Speaking...</Text>}
          </View>

          <ScrollView style={styles.conversationContainer}>
            {conversation.map((msg, i) => (
              <View key={i} style={[styles.messageBubble, msg.role === 'system' ? styles.systemBubble : styles.userBubble]}>
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={userInput}
              onChangeText={setUserInput}
              placeholder="Type your response or speak..."
              placeholderTextColor="#94A3B8"
              multiline
              editable={!isProcessing && !isSpeaking}
            />
            <TouchableOpacity
              style={[styles.sendButton, (isProcessing || !userInput.trim()) && styles.sendButtonDisabled]}
              onPress={handleUserResponse}
              disabled={isProcessing || !userInput.trim()}
            >
              {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ width: screenWidth * 0.35 }}>
          <ScheduleManager ref={scheduleRef} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  mainRow: { flex: 1, flexDirection: 'row' },
  header: { backgroundColor: '#2563EB', padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center', marginRight: 40 },
  statusText: { fontSize: 16, color: '#fff' },
  conversationContainer: { flex: 1, padding: 16 },
  messageBubble: { maxWidth: '80%', padding: 16, borderRadius: 16, marginBottom: 12 },
  systemBubble: { backgroundColor: '#E0E7FF', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#2563EB', alignSelf: 'flex-end' },
  messageText: { fontSize: 18, color: '#1E293B' },
  inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 18, marginRight: 12, maxHeight: 100 },
  sendButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#94A3B8' },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
