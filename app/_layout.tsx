import { useEffect } from 'react';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRouter, useSegments } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments.length > 0 && segments[0] === '(auth)';

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/welcome');
      } else if (user && inAuthGroup) {
        router.replace('/(tabs)');
      }
    });

    return unsubscribe;
  }, [segments, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* MeditationSession as a modal */}
        <Stack.Screen
          name="(tabs)/meditationsession"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Meditation Session',
            headerStyle: { backgroundColor: '#f5f5f5' },
            headerTitleStyle: { color: '#4CAF50', fontWeight: 'bold' },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
            ),
          }}
        />
        
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    paddingLeft: 15,
    paddingVertical: 10,
  },
  backText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#388E3C',
  },
});