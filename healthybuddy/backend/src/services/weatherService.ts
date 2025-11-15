/**
 * Weather service using Open-Meteo API
 * https://open-meteo.com/
 */

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isGoodWeather: boolean;
  emoji: string;
  message: string;
}

/**
 * Weather codes from WMO Weather interpretation codes
 * Good weather: clear, partly cloudy, overcast (but not raining)
 */
const GOOD_WEATHER_CODES = [0, 1, 2, 3]; // Clear, Mainly clear, Partly cloudy, Overcast
const BAD_WEATHER_CODES = [
  45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82,
  85, 86, 95, 96, 99,
];

/**
 * Get weather emoji based on weather code
 */
function getWeatherEmoji(weatherCode: number): string {
  if (weatherCode === 0) return "☀️"; // Clear sky
  if (weatherCode === 1 || weatherCode === 2) return "🌤️"; // Mainly clear, Partly cloudy
  if (weatherCode === 3) return "☁️"; // Overcast
  if ([45, 48].includes(weatherCode)) return "🌫️"; // Fog
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return "🌦️"; // Drizzle
  if ([61, 63, 65, 66, 67].includes(weatherCode)) return "🌧️"; // Rain
  if ([71, 73, 75, 77].includes(weatherCode)) return "🌨️"; // Snow
  if ([80, 81, 82].includes(weatherCode)) return "⛈️"; // Rain showers
  if ([85, 86].includes(weatherCode)) return "🌨️"; // Snow showers
  if ([95, 96, 99].includes(weatherCode)) return "⛈️"; // Thunderstorm
  return "🌤️"; // Default
}

/**
 * Generate suggestive message for good weather
 */
function generateWeatherMessage(
  temperature: number,
  weatherCode: number
): string {
  const mainMessage = "The forecast looks great for the next hour.";
  const messages = [
    "It's a great time to get some fresh air.",
    "Perfect conditions for your daily exercise.",
    "The weather is just right for spending time outdoors.",
    "It's an ideal time to enjoy some outdoor activities.",
  ];

  // Select message based on temperature
  if (temperature >= 20) {
    return messages[0];
  } else if (temperature >= 15) {
    return messages[1];
  } else if (temperature >= 10) {
    return messages[2];
  } else {
    return messages[3];
  }
}

/**
 * Fetch current weather and next hour forecast
 * Uses default location (can be made configurable later)
 */
export async function getWeatherForecast(
  latitude: number = 60.1699, // Default: Helsinki, Finland
  longitude: number = 24.9384
): Promise<WeatherData | null> {
  const WEATHER_API_TIMEOUT = 8000; // 8 seconds timeout
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_hours=1`;

  try {
    console.log(`[WeatherService] Fetching weather from: ${url}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, WEATHER_API_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        // Add timeout headers if needed
        headers: {
          Accept: "application/json",
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (
        fetchError.name === "AbortError" ||
        fetchError.code === "UND_ERR_CONNECT_TIMEOUT"
      ) {
        console.error(
          `[WeatherService] Timeout after ${WEATHER_API_TIMEOUT}ms - weather API not responding`
        );
        return null;
      }

      // Handle other network errors
      if (
        fetchError.message?.includes("fetch failed") ||
        fetchError.code === "UND_ERR_CONNECT_TIMEOUT"
      ) {
        console.error(
          `[WeatherService] Network error connecting to weather API:`,
          fetchError.message || fetchError.code
        );
        return null;
      }

      throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[WeatherService] Weather API returned error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as any;

    // Get current weather
    const currentTemp = data.current.temperature_2m;
    const currentWeatherCode = data.current.weather_code;

    // Get next hour weather (first item in hourly array)
    const nextHourTemp = data.hourly.temperature_2m[0];
    const nextHourWeatherCode = data.hourly.weather_code[0];

    // Use next hour data for forecast
    const temperature = nextHourTemp;
    const weatherCode = nextHourWeatherCode;

    // Determine if weather is good (clear, partly cloudy, overcast, and reasonable temperature)
    const isGoodWeather =
      GOOD_WEATHER_CODES.includes(weatherCode) &&
      temperature >= -5 && // Not too cold
      temperature <= 23; // Not too hot

    const emoji = getWeatherEmoji(weatherCode);
    const message = isGoodWeather
      ? generateWeatherMessage(temperature, weatherCode)
      : "";

    return {
      temperature,
      weatherCode,
      isGoodWeather,
      emoji,
      message,
    };
  } catch (error: any) {
    // Catch any remaining errors (parsing, etc.)
    if (
      error.name === "AbortError" ||
      error.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      console.error(
        `[WeatherService] Request timeout - weather API not responding`
      );
    } else if (
      error.message?.includes("fetch failed") ||
      error.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      console.error(
        `[WeatherService] Network error - unable to connect to weather API`
      );
    } else {
      console.error(
        `[WeatherService] Error fetching weather:`,
        error.message || error
      );
    }
    return null;
  }
}
