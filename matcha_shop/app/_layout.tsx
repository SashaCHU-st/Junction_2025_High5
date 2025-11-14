
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';

import {Colors} from'@/constants/theme';

import { Appearance } from 'react-native';
import { getBackgroundColorAsync } from 'expo-system-ui';
import { HeaderTitle } from '@react-navigation/elements';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = Appearance.getColorScheme()
  const theme = colorScheme === 'dark' ? Colors.dark : Colors. light;
  return (
    
      <Stack screenOptions={{ headerStyle: {getBackgroundColor: 
      theme.headerBackground}, headerTintColor: theme.text,
      headerShadowVisible: false}}>
       
      {/* <Stack.Screen name="index" options={{ headerShown: false, title: 'Home' }} /> */}
      <Stack.Screen name="contact" options={{ headerShown: true, title: 'Contact', HeaderTitle: 'Contact Us' }} />
      <Stack.Screen name="index" options={{ headerShown: true, title: 'Menu', HeaderTitle: 'Migraine menu' }} />
      <Stack.Screen name="not-fount" options={{ headerShown: false }}/>
      </Stack>
    
    
  );
}
