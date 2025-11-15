import React, { forwardRef, useEffect, useImperativeHandle, useState, Ref } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { voiceService } from '../services/voiceService';

export type TaskType = 'pill' | 'walk' | 'appointment' | 'custom';
export type RepeatType = 'daily' | 'once';

export interface DailyTask {
  id: string;
  title: string;
  time: string;
  type: TaskType;
  repeat: RepeatType;
  date?: string;
  completed: boolean;
  notificationId?: string;
  dateCreated?: number;
}

export interface ScheduleManagerHandle {
  addTaskFromParsed: (opts: { title: string; hour: number; minute: number; repeat?: RepeatType; date?: string; type?: TaskType }) => Promise<DailyTask>;
  markTaskCompleted: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  getTasks: () => DailyTask[];
}

const STORAGE_KEY = 'CAREBUDDY_TASKS_V2';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ScheduleManager = forwardRef(function ScheduleManager(_props: {}, ref: Ref<ScheduleManagerHandle>) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);

  useEffect(() => {
    (async () => {
      await ensurePermissions();
      const loaded = await loadTasks();
      setTasks(loaded);

      // Reschedule notifications for tasks that don't have a notificationId
      for (const t of loaded) {
        if (!t.notificationId) {
          const nid = await scheduleNotificationForTask(t);
          if (nid) updateTaskNotificationId(t.id, nid);
        }
      }
    })();
  }, []);

  async function ensurePermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
  }

  async function loadTasks(): Promise<DailyTask[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async function saveTasks(newTasks: DailyTask[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
  }

  async function scheduleNotificationForTask(task: DailyTask): Promise<string | null> {
    try {
      const [hh, mm] = task.time.split(':').map(Number);
      let trigger: any;

      if (task.repeat === 'daily') {
        trigger = { hour: hh, minute: mm, repeats: true };
      } else {
        // one-time
        const dateParts = task.date?.split('-').map(Number) || [];
        trigger = dateParts.length === 3
          ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hh, mm)
          : new Date(Date.now() + 60 * 1000); // fallback in 1 min
      }

      return await Notifications.scheduleNotificationAsync({
        content: { title: 'CareBuddy Reminder', body: task.title, sound: true },
        trigger,
      });
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  async function cancelNotification(notificationId?: string) {
    if (!notificationId) return;
    try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch {}
  }

  async function updateTaskNotificationId(taskId: string, notificationId?: string) {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, notificationId } : t);
      saveTasks(next);
      return next;
    });
  }

  async function addTaskFromParsed(parsed: { title: string; hour: number; minute: number; repeat?: RepeatType; date?: string; type?: TaskType }): Promise<DailyTask> {
    const id = uuidv4();
    const time = `${String(parsed.hour).padStart(2,'0')}:${String(parsed.minute).padStart(2,'0')}`;
    const task: DailyTask = {
      id,
      title: parsed.title,
      time,
      type: parsed.type || 'custom',
      repeat: parsed.repeat || (parsed.date ? 'once' : 'daily'),
      date: parsed.date,
      completed: false,
      dateCreated: Date.now(),
    };

    const nid = await scheduleNotificationForTask(task);
    if (nid) task.notificationId = nid;

    setTasks(prev => {
      const next = [...prev, task];
      saveTasks(next);
      return next;
    });

    try { await voiceService.speak(`Added reminder: ${task.title} at ${task.time}`); } catch {}
    return task;
  }

  async function markTaskCompleted(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.notificationId) await cancelNotification(task.notificationId);

    if (task.repeat === 'once') {
      // Remove one-time tasks automatically
      setTasks(prev => {
        const next = prev.filter(t => t.id !== id);
        saveTasks(next);
        return next;
      });
      try { await voiceService.speak(`Removed one-time reminder: ${task.title}`); } catch {}
    } else {
      // Mark daily tasks as completed
      setTasks(prev => {
        const next = prev.map(t => t.id === id ? { ...t, completed: true, notificationId: undefined } : t);
        saveTasks(next);
        return next;
      });
      try { await voiceService.speak(`Marked ${task.title} as completed.`); } catch {}
    }
  }

  async function removeTask(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.notificationId) await cancelNotification(task.notificationId);

    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTasks(next);
      return next;
    });

    try { await voiceService.speak(`Removed reminder: ${task.title}`); } catch {}
  }

  useImperativeHandle(ref, () => ({
    addTaskFromParsed, markTaskCompleted, removeTask, getTasks: () => tasks,
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reminders</Text>
      {tasks.length === 0 && <Text style={styles.empty}>No reminders yet.</Text>}
      {tasks.map(task => (
        <View key={task.id} style={[styles.taskCard, task.completed ? styles.completed : {}]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskTime}>
              {task.time}
              {task.repeat === 'once' && task.date ? ` • ${task.date}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={styles.taskType}>{task.type} • {task.repeat}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!task.completed &&
                <TouchableOpacity onPress={() => markTaskCompleted(task.id)} style={styles.completeButton}>
                  <Text style={{ color: '#fff' }}>Done</Text>
                </TouchableOpacity>
              }
              <TouchableOpacity onPress={() => removeTask(task.id)} style={styles.removeButton}>
                <Text style={{ color: '#fff' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
});

export default ScheduleManager;

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 12, height: '100%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#2563EB' },
  empty: { color: '#64748B', fontStyle: 'italic', textAlign: 'center' },
  taskCard: { padding: 12, borderRadius: 12, marginBottom: 10, backgroundColor: '#E0F2FE' },
  completed: { backgroundColor: '#D1FAE5' },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  taskTime: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  taskType: { fontSize: 12, color: '#475569', marginTop: 2 },
  completeButton: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 6 },
  removeButton: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
});
