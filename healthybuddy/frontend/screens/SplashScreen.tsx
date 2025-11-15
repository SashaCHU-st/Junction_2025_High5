import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  console.log("=== SplashScreen component rendered ===");

  useEffect(() => {
    console.log("=== SplashScreen useEffect started ===");
    let hasFinished = false;

    // Safety timeout - ensure we always transition after 3 seconds max
    const safetyTimeout = setTimeout(() => {
      if (!hasFinished) {
        console.log("Safety timeout triggered, forcing transition");
        hasFinished = true;
        onFinish();
      }
    }, 5000);

    async function playSound() {
      try {
        console.log("Loading sound...");

        // Set audio mode for iOS to allow playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        console.log("Audio mode configured");

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/good-morning.mp3')
        );

        await sound.playAsync();
        console.log("Sound playing...");

        setTimeout(() => {
          if (!hasFinished) {
            console.log("Splash timeout finished, calling onFinish");
            hasFinished = true;
            sound.unloadAsync();
            clearTimeout(safetyTimeout);
            onFinish();
          }
        }, 3000);
      } catch (e) {
        if (!hasFinished) {
          console.log("Splash error:", e);
          console.log("Calling onFinish from error handler");
          hasFinished = true;
          clearTimeout(safetyTimeout);
          onFinish();  // 就算錯也不要卡住
        }
      }
    }

    playSound();

    // Cleanup
    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading HealthyBuddy...</Text>
      <Image
        source={require('../assets/splash.gif')}
        style={styles.image}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F9FF'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 20,
  },
  image: {
    width: 300,
    height: 300,
  },
});
