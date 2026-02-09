# Birlikte İbadet

## Overview
A Turkish community prayer/worship platform built with Expo (React Native) for web. Users can create and join groups for collective worship activities like Hatim (Quran reading), Salavat (blessings), and more.

## Tech Stack
- **Framework**: Expo SDK 54 (React Native with web support)
- **Language**: TypeScript
- **Backend**: Supabase (external hosted - auth, database, realtime)
- **Routing**: Expo Router (file-based routing)
- **State Management**: React Query (@tanstack/react-query) + React Context
- **Styling**: React Native StyleSheet (inline styles)

## Project Structure
```
app/              - Expo Router pages (file-based routing)
  (tabs)/         - Tab navigation screens
  _layout.tsx     - Root layout
  auth.tsx        - Authentication screen
components/       - Reusable UI components
  group/          - Group-related components
contexts/         - React Context providers (Auth, App)
lib/              - Utility libraries (supabase, hooks, storage)
assets/           - Images, fonts, data files
supabase/         - Database schema and migrations
```

## How It Runs
- Web build is exported via `npx expo export --platform web` to `dist/`
- Static files served by `serve.js` on port 5000
- Supabase handles authentication and data persistence

## Recent Changes
- 2026-02-09: Initial Replit setup - configured web export + static server on port 5000

## User Preferences
- None recorded yet
