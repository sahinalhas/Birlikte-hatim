import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";



function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const { bottom } = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  // Android'de tuşlarla çakışmayı önlemek için absolute pozisyonu kapatıyoruz
  // iOS'ta blur efekti için absolute kalmalı
  const isAbsolute = isIOS;
  const tabBarHeight = isWeb ? 80 : (isIOS ? 50 + bottom : 60 + bottom);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          position: isAbsolute ? "absolute" : undefined,
          backgroundColor: isIOS ? "transparent" : isDark ? "#1A1A1A" : Colors.card,
          borderTopWidth: 0,
          elevation: 8,
          height: tabBarHeight,
          paddingBottom: isIOS ? bottom : 8 + bottom,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#1A1A1A" : Colors.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "İbadetlerim",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="person" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="group/[id]"
        options={{
          href: null,
          tabBarStyle: {
            position: isAbsolute ? "absolute" : undefined,
            backgroundColor: isIOS ? "transparent" : isDark ? "#1A1A1A" : Colors.card,
            borderTopWidth: 0,
            elevation: 8,
            height: tabBarHeight,
            paddingBottom: isIOS ? bottom : 8 + bottom,
            paddingTop: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          }
        }}
      />
      <Tabs.Screen
        name="create-group"
        options={{
          href: null,
          tabBarStyle: {
            position: isAbsolute ? "absolute" : undefined,
            backgroundColor: isIOS ? "transparent" : isDark ? "#1A1A1A" : Colors.card,
            borderTopWidth: 0,
            elevation: 8,
            height: tabBarHeight,
            paddingBottom: isIOS ? bottom : 8 + bottom,
            paddingTop: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          }
        }}
      />
      <Tabs.Screen
        name="join"
        options={{
          href: null,
          tabBarStyle: {
            position: isAbsolute ? "absolute" : undefined,
            backgroundColor: isIOS ? "transparent" : isDark ? "#1A1A1A" : Colors.card,
            borderTopWidth: 0,
            elevation: 8,
            height: tabBarHeight,
            paddingBottom: isIOS ? bottom : 8 + bottom,
            paddingTop: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          }
        }}
      />
      <Tabs.Screen
        name="reader/[juz]"
        options={{
          href: null,
          tabBarStyle: {
            position: isAbsolute ? "absolute" : undefined,
            backgroundColor: isIOS ? "transparent" : isDark ? "#1A1A1A" : Colors.card,
            borderTopWidth: 0,
            elevation: 8,
            height: tabBarHeight,
            paddingBottom: isIOS ? bottom : 8 + bottom,
            paddingTop: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          }
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
