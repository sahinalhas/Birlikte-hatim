import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { notificationService } from "@/lib/notification-service";
import { Platform, View } from "react-native";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons, FontAwesome, MaterialIcons, FontAwesome6 } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";

console.log('[DEBUG] Loading app/_layout.tsx - REWRITTEN');

// Global font safety for Web
if (Platform.OS === 'web') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('6000ms timeout exceeded')) {
      event.preventDefault();
      console.warn('Suppressing font timeout crash (Web)');
    }
  });
}

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => { });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const inTabsGroup = segments[0] === "(tabs)";
    // Also protect against root path "/" which redirects to tabs or auth

    if (!session && !inAuthGroup) {
      router.replace("/auth");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, isLoading]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Geri" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('[RootLayout] Preparing...');
        notificationService.init();
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
          ...MaterialIcons.font,
          ...FontAwesome6.font,
        }).catch(e => {
          console.warn("Icon font loading warning:", e);
        });
      } catch (e) {
        console.warn("Unexpected error during app preparation:", e);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => { });
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null; // Or a custom Loading view
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <AppProvider>
                <RootLayoutNav />
              </AppProvider>
            </QueryClientProvider>
          </AuthProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
