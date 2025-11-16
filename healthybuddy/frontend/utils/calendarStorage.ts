// utils/calendarStorage.ts
import { Storage } from './storage';

const CALENDAR_EVENTS_KEY = 'calendarEvents';

export interface CalendarEvent {
  id: string;
  title: string;
  activity?: string;
  joinedAt: string; // ISO string
}

export const calendarStorage = {
  async getEvents(): Promise<CalendarEvent[]> {
    try {
      const data = await Storage.getItem(CALENDAR_EVENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      return [];
    }
  },

  async addEvent(event: CalendarEvent): Promise<void> {
    try {
      const events = await this.getEvents();
      // Check if event with same ID already exists (avoid duplicates)
      const exists = events.some(e => e.id === event.id);
      if (!exists) {
        events.push(event);
        await Storage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(events));
      }
    } catch (error) {
      console.error('Failed to save calendar event:', error);
      throw error;
    }
  },

  async removeEvent(eventId: string): Promise<void> {
    try {
      const events = await this.getEvents();
      const filtered = events.filter(e => e.id !== eventId);
      await Storage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove calendar event:', error);
      throw error;
    }
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const events = await this.getEvents();
      const index = events.findIndex(e => e.id === eventId);
      if (index !== -1) {
        events[index] = { ...events[index], ...updates };
        await Storage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(events));
      }
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }
};