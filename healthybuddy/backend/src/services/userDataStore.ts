/**
 * Simple in-memory user data store
 * Stores alert-related data only
 */

interface UserData {
  alertCountToday: number;
  lastAlertDate: string; // YYYY-MM-DD format
  lastAlertTime: Date | null;
}

let userData: UserData = {
  alertCountToday: 0,
  lastAlertDate: "",
  lastAlertTime: null,
};

/**
 * Check if we can send an alert (max 2 per day)
 */
export function canSendAlert(): boolean {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Reset count if it's a new day
  if (userData.lastAlertDate !== today) {
    userData.alertCountToday = 0;
    userData.lastAlertDate = today;
  }

  return userData.alertCountToday < 2;
}

/**
 * Mark that an alert was sent
 */
export function markAlertSent(): void {
  userData.alertCountToday++;
  userData.lastAlertTime = new Date();
  userData.lastAlertDate = new Date().toISOString().split("T")[0];
}

/**
 * Get alert status
 */
export function getAlertStatus(): {
  canSend: boolean;
  countToday: number;
  lastAlertTime: Date | null;
} {
  return {
    canSend: canSendAlert(),
    countToday: userData.alertCountToday,
    lastAlertTime: userData.lastAlertTime,
  };
}
