import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { notificationService } from "@/lib/notification-service";
// import { Inter_400Regular... } lines removed
// import { Amiri_400Regular... } lines removed
import { Platform } from "react-native";
import * as Font from "expo-font";

// Global font safety for Web
if (Platform.OS === 'web') {
  // Catch unhandled rejections from fontfaceobserver (internal to expo-font/icons)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('6000ms timeout exceeded')) {
      event.preventDefault();
      console.warn('Suppressing font timeout crash (Web)');
    }
  });
}

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSegments } from "expo-router";

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const inTabsGroup = segments[0] === "(tabs)";

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace("/auth");
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace("/(tabs)");
    }
  }, [session, segments[0], isLoading]);

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
      <Stack.Screen
        name="create-group"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="group/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="join"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

import { Ionicons, MaterialCommunityIcons, FontAwesome, MaterialIcons, FontAwesome6 } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        notificationService.init();
        // Safely load Icon fonts. 
        // We catch any errors (like timeouts) to prevent the app from crashing.
        // On slow networks (especially Web), fontfaceobserver might hit its 6000ms timeout.
        // We load all common icon sets used in the app to prevent them from triggering 
        // their own uncaught loads later.
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
          ...MaterialIcons.font,
          ...FontAwesome6.font,
        }).catch(e => {
          console.warn("Icon font loading failed or timed out:", e);
        });
      } catch (e) {
        console.warn("Unexpected error during app preparation:", e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [isReady]);

  if (!isReady) {
    return null;
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
