import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import chrono from 'chrono-node';
import { voiceService } from '../services/voiceService';
import { Storage } from '../utils/storage';

const TASKS_STORAGE_KEY = 'scheduledTasks';
const DEFAULT_FALLBACK_MS = 10 * 60 * 1000; // 10 minutes
const SPEECH_TIMEOUT_MS = 30 * 1000; // 30 seconds

interface Task {
  id: string;
  title: string;
  scheduledAt: number;
  createdAt: number;
  recurrence?: 'daily' | null;
  lastCompletedAt?: number | null;
  notificationId?: string;
  preNotificationId?: string;
}

class ScheduleStore {
  private tasks: Task[] = [];
  private timers: Map<string, any> = new Map();

  constructor() {
    void this.loadTasks();
  }

  private async loadTasks(): Promise<void> {
    try {
      const data = await Storage.getItem(TASKS_STORAGE_KEY);
      const raw = data ? JSON.parse(data) : [];
      this.tasks = raw.map((r: any) => {
        if (r.scheduledAt) return r as Task;
        if (typeof r.datetime === 'number') {
          return {
            ...r,
            scheduledAt: r.datetime,
            createdAt: r.createdAt ?? Date.now(),
          } as Task;
        }
        return {
          ...r,
          scheduledAt: Date.now() + DEFAULT_FALLBACK_MS,
          createdAt: r.createdAt ?? Date.now(),
        } as Task;
      });
      this.restoreTimers();
    } catch (error) {
      console.error('Failed to load tasks:', error);
      this.tasks = [];
    }
  }

  private async saveTasks(): Promise<void> {
    try {
      await Storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(this.tasks));
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  }

  async addTask(title: string, datetime?: number, recurrence?: 'daily' | null): Promise<void> {
    const id = `${Date.now()}_${Math.random()}`;
    let notificationId: string | undefined;
    let finalDatetime: number | undefined = datetime;
    
    if (!finalDatetime) {
      try {
        const parsed = chrono.parseDate(title, new Date(), { forwardDate: true });
        if (parsed) {
          finalDatetime = parsed.getTime();
          if (finalDatetime <= Date.now()) {
            finalDatetime = parsed.getTime() + 24 * 60 * 60 * 1000;
          }
        }
      } catch (err) {
        // ignore
      }
    }

    if (!finalDatetime) finalDatetime = Date.now() + DEFAULT_FALLBACK_MS;

    let preId: string | undefined = undefined;
    if (Platform.OS !== 'web') {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        if (recurrence === 'daily') {
          const dt = new Date(finalDatetime);
          const hour = dt.getHours();
          const minute = dt.getMinutes();
          try {
            notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Reminder',
                body: title,
                sound: true,
                data: { title, recurrence: 'daily', taskId: id }, // ✨ Add taskId
              },
              trigger: { hour, minute, repeats: true } as any,
            });
          } catch (e) {
            notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Reminder',
                body: title,
                sound: true,
                data: { title, taskId: id }, // ✨ Add taskId
              },
              trigger: { date: new Date(finalDatetime) } as any,
            });
          }
        } else {
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Reminder',
              body: title,
              sound: true,
              data: { title, taskId: id }, // ✨ Add taskId
            },
            trigger: { date: new Date(finalDatetime) } as any,
          });
        }
        
        const fiveMinMs = 5 * 60 * 1000;
        const timeUntil = finalDatetime - Date.now();
        if (timeUntil > fiveMinMs && recurrence !== 'daily') {
          try {
            preId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `Upcoming: ${title}`,
                body: `Starts in 5 minutes: ${title}`,
                sound: true,
                data: { title, pre: true, taskId: id }, // ✨ Add taskId
              },
              trigger: { date: new Date(finalDatetime - fiveMinMs) } as any,
            });
          } catch (e) {
            console.warn('Failed to schedule pre-notification:', e);
          }
        }
      } catch (error) {
        console.warn('Failed to schedule notification:', error);
      }
    } else {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
      } catch (err) {
        // ignore
      }
    }

    const newTask: Task = {
      id,
      title,
      scheduledAt: finalDatetime,
      createdAt: Date.now(),
      recurrence: recurrence ?? null,
      lastCompletedAt: null,
      notificationId,
      preNotificationId: (typeof preId !== 'undefined' ? preId : undefined)
    };
    
    this.tasks.push(newTask);
    await this.saveTasks();
    this.scheduleTimerForTask(newTask);
  }

  async removeTask(taskId: string): Promise<void> {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.notificationId && Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(task.notificationId);
      } catch (error) {
        console.warn('Failed to cancel notification:', error);
      }
    }

    this.tasks = this.tasks.filter(t => t.id !== taskId);
    await this.saveTasks();

    const to = this.timers.get(taskId);
    if (to) {
      clearTimeout(to);
      this.timers.delete(taskId);
    }
  }

  // ✨ NEW: Method to advance a daily task to next day
  async advanceDailyTask(taskId: string): Promise<void> {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.recurrence !== 'daily') return;

    // Mark as completed for today
    task.lastCompletedAt = Date.now();
    
    // Advance scheduledAt to next day at same time
    const currentSchedule = new Date(task.scheduledAt);
    const nextDay = new Date(currentSchedule);
    nextDay.setDate(nextDay.getDate() + 1);
    task.scheduledAt = nextDay.getTime();
    
    await this.saveTasks();
    
    // Reschedule timer for web
    if (Platform.OS === 'web') {
      const existingTimer = this.timers.get(taskId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.timers.delete(taskId);
      }
      this.scheduleTimerForTask(task);
    }
  }

  getTasks(): Task[] {
    return [...this.tasks];
  }

  private scheduleTimerForTask(task: Task) {
    if (Platform.OS === 'web') {
      const now = Date.now();
      const delay = task.scheduledAt - now;
      if (delay <= 0) return;
      
      try {
        const to = setTimeout(async () => {
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(task.title, { body: task.title });
            }
          } catch (err) {
            console.warn('web notification failed', err);
          }
          
          try {
            await voiceService.speak(`Reminder: ${task.title}`);
          } catch (err) {
            // ignore
          }

          // ✨ Handle based on recurrence type
          try {
            if (task.recurrence === 'daily') {
              // Daily tasks: advance to next day
              await this.advanceDailyTask(task.id);
            } else {
              // ✨ One-time tasks: remove after firing
              await this.removeTask(task.id);
            }
          } catch (e) {
            console.warn('post-fire handler failed', e);
          }
        }, delay) as any;
        this.timers.set(task.id, to);
      } catch (err) {
        console.warn('Failed to set web timer for task', err);
      }
    }
    
    // ✨ NEW: For native (iOS/Android), notification handlers will trigger removal
    // We rely on the native notification system and app foreground listeners
  }

  private restoreTimers() {
    if (Platform.OS === 'web') {
      for (const t of this.tasks) {
        this.scheduleTimerForTask(t);
      }
    }
  }
}

export const scheduleStore = new ScheduleStore();

// ✨ NEW: Setup notification listener for native apps
if (Platform.OS !== 'web') {
  // Listen for notification responses (when user interacts with notification)
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const taskId = response.notification.request.content.data?.taskId;
    const recurrence = response.notification.request.content.data?.recurrence;
    
    if (taskId) {
      if (recurrence === 'daily') {
        // Daily task: advance to next day
        await scheduleStore.advanceDailyTask(taskId as string);
      } else {
        // One-time task: remove it
        await scheduleStore.removeTask(taskId as string);
      }
    }
  });

  // ✨ Listen for notifications received while app is in foreground
  Notifications.addNotificationReceivedListener(async (notification) => {
    const taskId = notification.request.content.data?.taskId;
    const recurrence = notification.request.content.data?.recurrence;
    
    if (taskId) {
      // Speak the reminder
      try {
        await voiceService.speak(`Reminder: ${notification.request.content.body}`);
      } catch (err) {
        console.warn('Failed to speak notification:', err);
      }
      
      // Handle based on recurrence
      if (recurrence === 'daily') {
        await scheduleStore.advanceDailyTask(taskId as string);
      } else {
        // One-time task: remove after notification fires
        await scheduleStore.removeTask(taskId as string);
      }
    }
  });
}

export default function ScheduleManager({ onGoBack }: { onGoBack?: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [parsedDate, setParsedDate] = useState<number | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const reload = () => {
    setTasks(scheduleStore.getTasks());
  };

  useEffect(() => {
    reload();
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const source = (message && message.trim()) ? message.trim() : (lastTranscript || '');
        if (source) {
          const pd = chrono.parseDate(source, new Date(), { forwardDate: true });
          if (mounted) setParsedDate(pd ? pd.getTime() : null);
          return;
        }
        if (mounted) setParsedDate(null);
      } catch (err) {
        if (mounted) setParsedDate(null);
      }
    })();

    return () => { mounted = false; };
  }, [message, lastTranscript]);

  const parseDateFromText = (text: string): number | null => {
    if (!text || !text.trim()) return null;
    const normalize = (s: string) => {
      let out = s.toLowerCase().trim();
      out = out.replace(/^remind me (to |that )?/i, '');
      out = out.replace(/^please\s+/i, '');
      out = out.replace(/^hey\s+/i, '');
      out = out.replace(/^to the\s+/i, '');
      out = out.replace(/\b([ap])\s*\.\s*(m)\b/gi, '$1$2');
      out = out.replace(/\b([ap])\s+m\b/gi, '$1m');
      out = out.replace(/next week\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, 'next $1');
      out = out.replace(/[,.]+/g, '');
      return out;
    };

    const cleaned = normalize(text);
    const now = Date.now();

    try {
      const results = chrono.parse(cleaned, new Date(), { forwardDate: true });
      if (results && results.length > 0) {
        const r = results[0];
        if (r && r.start && typeof r.start.date === 'function') {
          const dt = r.start.date().getTime();
          if (dt > now) return dt;

          const weekdayMatch = cleaned.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
          if (weekdayMatch) {
            const weekday = weekdayMatch[1].toLowerCase();
            const dayIndexMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const target = dayIndexMap[weekday];
            const today = new Date();
            const todayIdx = today.getDay();
            let daysUntil = (target - todayIdx + 7) % 7;
            if (daysUntil === 0) daysUntil = 7;

            const hour = r.start.get('hour');
            const minute = r.start.get('minute') ?? 0;
            const resultDate = new Date(now + daysUntil * 24 * 60 * 60 * 1000);
            if (typeof hour === 'number') resultDate.setHours(hour, minute, 0, 0);
            return resultDate.getTime();
          }

          const hasTime = typeof r.start.get === 'function' && (typeof r.start.get('hour') === 'number');
          if (hasTime) {
            return dt + 24 * 60 * 60 * 1000;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const atMatch = cleaned.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
    const hasMeridiem = /\b(am|pm|a\.m\.|p\.m\.)\b/i.test(cleaned);
    if (atMatch) {
      try {
        let hour = Number(atMatch[1]);
        const minute = Number(atMatch[2] || 0);
        const pmPresent = /\b(p\.?m\.?|pm)\b/i.test(cleaned);
        const amPresent = /\b(a\.?m\.?|am)\b/i.test(cleaned);

        if (pmPresent && hour >= 1 && hour <= 11) {
          hour += 12;
        } else if (amPresent && hour === 12) {
          hour = 0;
        } else if (!hasMeridiem && hour >= 1 && hour <= 12) {
          if (hour >= 6 && hour <= 8) {
            // morning
          } else if (hour === 5 || (hour >= 9 && hour <= 11)) {
            hour += 12;
          }
        }

        const weekdayMatch = cleaned.match(/\b(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (weekdayMatch) {
          const weekday = weekdayMatch[2].toLowerCase();
          const dayIndexMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
          const target = dayIndexMap[weekday];
          const today = new Date();
          const todayIdx = today.getDay();
          let daysUntil = (target - todayIdx + 7) % 7;
          if (daysUntil === 0) daysUntil = 7;
          const resultDate = new Date(now + daysUntil * 24 * 60 * 60 * 1000);
          resultDate.setHours(hour, minute, 0, 0);
          return resultDate.getTime();
        }

        const tentative = new Date(now);
        tentative.setHours(hour, minute, 0, 0);
        if (tentative.getTime() > now) return tentative.getTime();
        const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
        tomorrow.setHours(hour, minute, 0, 0);
        return tomorrow.getTime();
      } catch (e) {
        // ignore
      }
    }

    const inMatch = cleaned.match(/in\s+(\d{1,4})\s*(minute|minutes|min|hour|hours|day|days|week|weeks)/i);
    if (inMatch) {
      const n = Number(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      if (unit.startsWith('min')) return now + n * 60 * 1000;
      if (unit.startsWith('hour')) return now + n * 60 * 60 * 1000;
      if (unit.startsWith('day')) return now + n * 24 * 60 * 60 * 1000;
      if (unit.startsWith('week')) return now + n * 7 * 24 * 60 * 60 * 1000;
    }

    const weekdayMatch2 = cleaned.match(/(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (weekdayMatch2) {
      const weekday = weekdayMatch2[2].toLowerCase();
      const dayIndexMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const target = dayIndexMap[weekday];
      const today = new Date();
      const todayIdx = today.getDay();
      let daysUntil = (target - todayIdx + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      const resultDate = new Date(now + daysUntil * 24 * 60 * 60 * 1000);
      resultDate.setHours(9, 0, 0, 0);
      return resultDate.getTime();
    }

    return null;
  };

  const extractTitleFromText = (text: string): string => {
  if (!text) return text;

  const normalize = (s: string) => {
    let out = s.trim();
    // Remove common starting phrases
    out = out.replace(/^remind me (to |that )?/i, '');
    out = out.replace(/^please\s+/i, '');
    out = out.replace(/^hey\s+/i, '');
    out = out.replace(/^need to\s+/i, '');
    out = out.replace(/^i need to\s+/i, '');
    out = out.replace(/^to the\s+/i, '');  // Remove "to the"
    out = out.replace(/^go to the\s+/i, 'go to '); // Simplify "go to the"
    // Remove redundant words
    out = out.replace(/\bthe\b/gi, '');
    out = out.replace(/\bjym\b/gi, 'gym'); // typo fixes
    // Remove extra spaces
    out = out.replace(/\s{2,}/g, ' ');
    return out.trim();
  };

  const cleaned = normalize(text);

  try {
    const results = chrono.parse(cleaned, new Date(), { forwardDate: true });
    if (results && results.length > 0) {
      const r = results[0];
      if (r && typeof r.text === 'string') {
        const withoutDate = cleaned.replace(r.text, '').replace(/\s{2,}/g, ' ').trim();
        return withoutDate || cleaned;
      }
    }
  } catch (e) {
    // ignore
  }

  return normalize(cleaned);
};

  const detectRecurrenceFromText = (text: string, parsedDateMs?: number | null): 'daily' | null => {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (/\bevery(day| day)?\b/i.test(lower) || /\bdaily\b/i.test(lower) || /every\s+morning/i.test(lower)) {
      return 'daily';
    }

    const hasTime = /\b(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(lower);
    const hasDateWord = /\b(tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\.\-/]\d{1,2})\b/i.test(lower);
    if (hasTime && !hasDateWord && !parsedDateMs) {
      return 'daily';
    }

    return null;
  };

  const handleAdd = async () => {
    const content = message.trim() || lastTranscript || '';
    if (!content) {
      Alert.alert('Please type or record a reminder');
      return;
    }

    let dt: number | null = parseDateFromText(content);
    if (!dt) {
      dt = Date.now() + DEFAULT_FALLBACK_MS;
      Alert.alert('No date/time detected — saved for 10 minutes from now');
    }

    try {
      const titleToSave = extractTitleFromText(content) || content;
      const recurrence = detectRecurrenceFromText(content, dt);
      await scheduleStore.addTask(titleToSave, dt, recurrence);
      setMessage('');
      setLastTranscript(null);
      reload();
      Alert.alert('Reminder saved');
    } catch (err) {
      console.error('add failed', err);
      Alert.alert('Failed to add reminder');
    }
  };

  const handleVoice = async () => {
    setIsListening(true);
    try {
      if (Platform.OS === 'web') {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } catch (permErr) {
          console.warn('Microphone permission denied or unavailable', permErr);
          Alert.alert('Microphone permission is required for voice input');
          setIsListening(false);
          return;
        }
      }

      voiceService.setPartialResultCallback((partial) => {
        try {
          setMessage(partial || '');
        } catch (e) {
          // ignore
        }
      });

      const transcript = await voiceService.startSpeechRecognition(SPEECH_TIMEOUT_MS);
      setIsListening(false);
      voiceService.setPartialResultCallback(null);
      
      if (!transcript) {
        Alert.alert('No speech detected');
        return;
      }

      setLastTranscript(transcript);
      const parsedDt = parseDateFromText(transcript);
      const titleToSave = extractTitleFromText(transcript) || transcript;
      const recurrence = detectRecurrenceFromText(transcript, parsedDt);
      
      if (parsedDt) {
        await scheduleStore.addTask(titleToSave, parsedDt, recurrence);
        setLastTranscript(null);
        reload();
        Alert.alert('Reminder scheduled from voice');
        return;
      }

      const fallbackDt = Date.now() + DEFAULT_FALLBACK_MS;
      await scheduleStore.addTask(titleToSave, fallbackDt, recurrence);
      setLastTranscript(null);
      setMessage('');
      reload();
      Alert.alert('Reminder scheduled from voice');
    } catch (err) {
      console.error('Voice capture failed', err);
      Alert.alert('Voice input failed');
      try { voiceService.setPartialResultCallback(null); } catch (e) {}
      setIsListening(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await scheduleStore.removeTask(id);
      reload();
    } catch (err) {
      console.error('remove failed', err);
      Alert.alert('Failed to remove');
    }
  };

  // ✨ CHANGED: handleDone now advances daily tasks to next day
  const handleDone = async (task: Task) => {
    try {
      if (task.recurrence === 'daily') {
        // Advance to next day instead of removing
        await scheduleStore.advanceDailyTask(task.id);
        reload();
        Alert.alert('Daily task moved to tomorrow');
      } else {
        // One-time task: remove
        await scheduleStore.removeTask(task.id);
        reload();
      }
    } catch (err) {
      console.error('done failed', err);
      Alert.alert('Failed to mark done');
    }
  };

  const fmt = (t: Task) => {
    const d = new Date(t.scheduledAt);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const timePart = `${h}:${mins}`;
    return `${t.title} — ${dd}.${mm}.${yyyy} at ${timePart}`;
  };

  const formatPreview = (ms: number | null) => {
    if (!ms) return null;
    try {
      const d = new Date(ms);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const h = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const timePart = `${h}:${mins}`;
      return `${dd}.${mm}.${yyyy} at ${timePart}`;
    } catch (e) {
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onGoBack ? (
          <TouchableOpacity onPress={onGoBack} style={{ position: 'absolute', left: 16, top: Platform.OS === 'ios' ? 48 : 16 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>← Back</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerText}>Schedule Manager</Text>
      </View>

      <View style={{ padding: 16 }}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type or record your reminder"
          placeholderTextColor="#94A3B8"
          multiline
        />

        {parsedDate ? (
          <Text style={{ color: '#0F172A', marginHorizontal: 0, marginTop: 8 }}>Parsed time: {formatPreview(parsedDate)}</Text>
        ) : (
          <Text style={{ color: '#64748B', marginHorizontal: 0, marginTop: 8 }}>No parsed date/time. Will schedule 10 minutes from now.</Text>
        )}

        {lastTranscript ? (
          <Text style={{ color: '#0F172A', marginHorizontal: 0, marginTop: 8 }}>Last voice: {lastTranscript}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', marginTop: 12, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.recordButton, isListening && styles.recordButtonActive]}
            onPress={handleVoice}
            disabled={isListening}
          >
            <Text style={styles.recordButtonText}>{isListening ? 'Listening…' : '🎤 Voice'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.sendButton, { marginLeft: 12 }]} onPress={handleAdd}>
            <Text style={styles.sendButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {loading ? (
          <Text style={{ color: '#64748B', padding: 16 }}>Loading…</Text>
        ) : tasks.length === 0 ? (
          <Text style={{ color: '#64748B', padding: 16 }}>No reminders yet. Create one above.</Text>
        ) : (
          tasks.map((t) => (
            <View key={t.id} style={styles.taskItem}>
              <Text style={styles.taskText}>{fmt(t)}{t.recurrence === 'daily' ? ' (daily)' : ''}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleDone(t)} style={{ marginRight: 12 }}>
                  <Text style={{ color: '#10B981' }}>DONE</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemove(t.id)} style={styles.removeBtn}>
                  <Text style={{ color: '#ef4444' }}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F9FF',
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%'
  },
  header: { 
    backgroundColor: '#2563EB', 
    padding: isWeb ? 16 : 20, 
    paddingTop: Platform.OS === 'ios' ? 80 : isWeb ? 16 : 60, 
    alignItems: 'center' 
  },
  headerText: { 
    color: '#fff', 
    fontSize: isWeb ? 20 : 24, 
    fontWeight: 'bold' 
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 12, 
    marginHorizontal: 0, 
    fontSize: 16, 
    marginTop: 12, 
    flex: 1
  },
  sendButton: { 
  backgroundColor: '#2563EB',
  width: 120,          // ← fixed width
  height: 50,          // ← fixed height
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center'
},

sendButtonText: { 
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold'
},

recordButton: { 
  backgroundColor: '#10B981',
  width: 120,          // ← same size
  height: 50,          // ← same size
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center'
},

  recordButtonActive: { 
    backgroundColor: '#EF4444' 
  },
  recordButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  listContainer: { 
    flex: 1, 
    marginTop: 8 
  },
  taskItem: { 
    backgroundColor: '#fff',
    marginHorizontal: 16, 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 8, 
    borderLeftWidth: 4, 
    borderLeftColor: '#2563EB', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  taskText: { 
    color: '#0F172A', 
    fontSize: 16, 
    flex: 1 
  },
  removeBtn: { 
    marginLeft: 12 
  },
});