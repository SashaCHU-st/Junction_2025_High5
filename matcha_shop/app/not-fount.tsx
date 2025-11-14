import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NotFoundScreen() {
  return (
    <><Stack.Screen options={{ title: 'Ooooooops!' }} /><ThemedView style={styles.container}>
          <ThemedText type="title">This screen doesn't exist</ThemedText>
          <Link href="/" style={styles.link}>
              <ThemedText type="link">Go to home screen</ThemedText>
          </Link>
      </ThemedView></>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,                 // 讓畫面佔滿整個螢幕
      alignItems: 'center',    // 水平置中
      justifyContent: 'center',// 垂直置中
      padding: 20,             // 內距
    },
    link: {
      marginTop: 15,           // 與上方文字保持距離
      paddingVertical: 10,     // 上下間距
    },
  });
  