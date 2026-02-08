import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useGroups } from '@/lib/hooks';
import { Tables } from '@/lib/supabase';
import { startupSyncService } from '@/lib/startup-sync';

// Supabase tiplerini kullan
export type Group = Tables<'groups'>;
export type GroupType = Group;
export type UserProfile = Tables<'users'>;

interface AppContextValue {
  // Groups
  groups: Group[];
  publicGroups: Group[];
  isLoadingGroups: boolean;
  createGroup: (groupData: any) => Promise<Group>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;

  // Profile (from AuthContext)
  profile: UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isLoadingProfile: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile, refreshProfile, isLoading: isLoadingProfile } = useAuth();

  const {
    groups,
    publicGroups,
    isLoading: isLoadingGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    refetch: refreshGroups,
  } = useGroups();

  // Uygulama açılışında bekleyen verileri senkronize et
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (profile?.id && !hasSyncedRef.current) {
      hasSyncedRef.current = true;

      // Startup sync başlat
      startupSyncService.initialize().then(() => {
        startupSyncService.syncPendingCounts(profile.id).then(({ synced, failed }) => {
          if (synced > 0) {
            console.log(`[AppContext] Uygulama açılışında ${synced} grup senkronize edildi`);
            // Grupları yenile
            refreshGroups();
          }
          if (failed > 0) {
            console.warn(`[AppContext] ${failed} grup senkronize edilemedi`);
          }
        });
      });
    }
  }, [profile?.id]);

  const value = React.useMemo(() => ({
    groups,
    publicGroups,
    isLoadingGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    refreshGroups,

    profile,
    updateProfile,
    refreshProfile,
    isLoadingProfile,
  }), [
    groups,
    publicGroups,
    isLoadingGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    refreshGroups,
    profile,
    updateProfile,
    refreshProfile,
    isLoadingProfile,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
