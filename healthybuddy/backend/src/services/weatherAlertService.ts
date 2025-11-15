/**
 * Weather alert service that checks weather periodically
 * and determines if alerts should be sent
 */

import { getWeatherForecast, WeatherData } from "./weatherService";
import { canSendAlert, markAlertSent } from "./userDataStore";

export interface WeatherAlert {
  show: boolean;
  emoji: string;
  message: string;
  temperature: number;
}

/**
 * Check if current time is between 10:00 and 16:00
 */
function isWithinAlertHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 10 && hour < 16;
}

/**
 * Check weather and determine if alert should be shown
 */
export async function checkWeatherAlert(): Promise<WeatherAlert | null> {
  // Only check during 10-16
  // if (!isWithinAlertHours()) {
  //   return null;
  // }

  // Check if we can send alert (max 2 per day)
  if (!canSendAlert()) {
    return null;
  }

  // Fetch weather data with error handling
  let weatherData: WeatherData | null = null;
  try {
    weatherData = await getWeatherForecast();
  } catch (error: any) {
    console.error(
      "[WeatherAlertService] Error in getWeatherForecast:",
      error.message || error
    );
    return null;
  }

  if (!weatherData) {
    console.log(
      "[WeatherAlertService] No weather data available (API timeout or error)"
    );
    return null;
  }

  if (!weatherData.isGoodWeather) {
    console.log(
      `[WeatherAlertService] Weather not good (code: ${weatherData.weatherCode}, temp: ${weatherData.temperature}°C)`
    );
    return null;
  }

  // Mark alert as sent
  markAlertSent();

  return {
    show: true,
    emoji: weatherData.emoji,
    message: weatherData.message,
    temperature: weatherData.temperature,
  };
}
