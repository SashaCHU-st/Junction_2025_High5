// cross-platform storage wrapper: tries AsyncStorage, falls back to localStorage, then in-memory
const inMemoryStore: Record<string, string> = {};

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    // Try native AsyncStorage first
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = (mod && (mod as any).default) || mod;
      if (AsyncStorage && AsyncStorage.getItem) {
        return await AsyncStorage.getItem(key);
      }
    } catch (err) {
      // ignore - fall through to localStorage
    }

    // Fallback to browser localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (err) {
      // ignore
    }

    // Final fallback: in-memory
    return inMemoryStore[key] ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    // Try native AsyncStorage first
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = (mod && (mod as any).default) || mod;
      if (AsyncStorage && AsyncStorage.setItem) {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch (err) {
      // ignore - fall through
    }

    // Fallback to browser localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (err) {
      // ignore
    }

    // Final fallback: in-memory
    inMemoryStore[key] = value;
  },
};

export default Storage;
