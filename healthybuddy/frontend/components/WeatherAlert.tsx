import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
} from "react-native";
import { Audio } from "expo-av";
import { api } from "../services/api";
import { voiceService } from "../services/voiceService";

interface WeatherAlert {
  show: boolean;
  emoji?: string;
  message?: string;
  temperature?: number;
}

export default function WeatherAlertComponent() {
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastAlertTimeRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Messages array matching weatherService.ts
  const interactionMessages = [
    "The sun is shining and it's a great time to get some fresh air.",
    "Perfect conditions for your daily exercise.",
    "The weather is just right for spending time outdoors.",
    "It's an ideal time to enjoy some outdoor activities.",
  ];

  // Play gentle notification sound using local asset
  const playNotificationSound = async () => {
    try {
      // Set audio mode to allow playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      });

      // Load and play the local alert sound file
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/alert.mp3"),
        {
          shouldPlay: true,
          volume: 0.3, // Gentle volume (30%)
          isLooping: false,
        }
      );
      soundRef.current = sound;

      // After sound finishes, speak the main message
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          cleanupSound();
          // Speak the main message after sound finishes
          const mainMessage = "The forecast looks great for the next hour.";
          voiceService.speak(mainMessage);
        }
      });
    } catch (error) {
      // If sound fails, continue silently - alert will still show
      console.log("Could not play notification sound:", error);
    }
  };

  // Cleanup sound when component unmounts or alert closes
  const cleanupSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }
  };

  const checkWeatherAlert = async () => {
    const now = new Date();
    const hour = now.getHours();

    // Only check during 10-16
    // if (hour < 10 || hour >= 16) {
    //   return;
    // }

    try {
      const weatherAlert = await api.getWeatherAlert();

      if (weatherAlert.show) {
        // Prevent showing the same alert too frequently (at least 1 minute apart)
        const now = Date.now();
        if (now - lastAlertTimeRef.current < 60000) {
          return;
        }
        lastAlertTimeRef.current = now;

        setAlert(weatherAlert);
        setIsVisible(true);
        setHasInteracted(false); // Reset interaction state for new alert

        // Play gentle notification sound when alert appears
        playNotificationSound();

        // Auto-dismiss after 1 minute (60000 ms)
        // Note: Message will NOT be spoken if user doesn't interact
        autoDismissTimeoutRef.current = setTimeout(() => {
          handleClose();
        }, 60 * 1000);
      }
    } catch (error) {
      console.error("Error checking weather alert:", error);
    }
  };

  useEffect(() => {
    const setupPolling = () => {
      const now = new Date();
      const hour = now.getHours();

      // Only poll during 10-16
      // if (hour >= 10 && hour < 16) {
      if (true) {
        // Wait 2 minutes before first check to allow user interaction for audio
        const INITIAL_DELAY = 2 * 60 * 1000; // 2 minutes in milliseconds

        timeoutRef.current = setTimeout(() => {
          // First check after 2-minute delay
          checkWeatherAlert();

          // Set up polling every 15 minutes (900000 ms) after initial delay
          intervalRef.current = setInterval(() => {
            const currentHour = new Date().getHours();
            // Only check if still within 10-16
            // 
            if (true) {
              checkWeatherAlert();
            } else {
              // Clear interval if outside hours
              if (intervalRef.current) {
                clearInterval(
                  intervalRef.current as ReturnType<typeof setInterval>
                );
                intervalRef.current = null;
              }
            }
          }, 5 * 60 * 1000); // 15 minutes
        }, INITIAL_DELAY);
      } else {
        // If outside hours, check again when we enter the window
        const nextCheckHour = hour < 10 ? 10 : 10 + 24; // Next 10 AM
        const nextCheckTime = new Date();
        nextCheckTime.setHours(nextCheckHour, 0, 0, 0);
        const msUntilNextCheck = nextCheckTime.getTime() - now.getTime();

        timeoutRef.current = setTimeout(() => {
          setupPolling();
        }, msUntilNextCheck);
      }
    };

    setupPolling();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      // Cleanup sound on unmount
      cleanupSound();
    };
  }, []);

  const handleInteraction = () => {
    // Only speak if user interacts and hasn't been spoken to yet
    if (!hasInteracted) {
      setHasInteracted(true);
      // Randomly select one of the interaction messages
      const randomMessage =
        interactionMessages[
          Math.floor(Math.random() * interactionMessages.length)
        ];
      voiceService.speak(randomMessage);
    }
    handleClose();
  };

  const handleClose = () => {
    // Clear auto-dismiss timeout if it exists
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }

    // Cleanup sound
    cleanupSound();

    setIsVisible(false);
    setHasInteracted(false); // Reset interaction state
    // Keep alert data for a bit, then clear it
    setTimeout(() => {
      setAlert(null);
    }, 1000);
  };

  if (!alert || !isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleInteraction}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleInteraction}>
            <View style={styles.alertContainer}>
              <Text style={styles.emoji}>{alert.emoji || "🌤️"}</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: 128, // Twice the original size (was 64)
  },
});
