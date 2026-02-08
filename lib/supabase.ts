import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase yapılandırması
// ⚠️ Not: Normalde .env kullanılmalıdır ancak Windows/Expo ortamındaki yükleme sorunları nedeniyle sabitlendi.
const supabaseUrl = 'https://iusbphqyumcaweczjkdj.supabase.co';
const supabaseAnonKey = 'sb_publishable_POkiwz9_sGaf1XspiTLKxA_-eDxF59P';

console.log('Supabase client initialized with URL:', supabaseUrl);

// Storage adapter for React Native
const ExpoSecureStoreAdapter = {
    getItem: async (key: string) => {
        try {
            return await AsyncStorage.getItem(key);
        } catch (error) {
            console.error('Error getting item from storage:', error);
            return null;
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error('Error setting item in storage:', error);
        }
    },
    removeItem: async (key: string) => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing item from storage:', error);
        }
    },
};

// Supabase client oluşturma
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        // React Native'de lock API desteklenmediği için devre dışı bırak
        lock: (name: string, acquireTimeout: number, fn: () => Promise<any>) => fn(),
    },
});

// Database türleri
export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    phone: string | null;
                    email: string | null;
                    full_name: string;
                    profile_photo: string | null;
                    gender: 'male' | 'female' | 'other' | null;
                    birth_year: number | null;
                    country: string | null;
                    city: string | null;
                    timezone: string;
                    language: string;
                    settings: Record<string, any>;
                    total_hatims: number;
                    total_salawat: number;
                    total_groups_joined: number;
                    total_groups_created: number;
                    badges: string[];
                    current_streak: number;
                    longest_streak: number;
                    fcm_token: string | null;
                    last_active: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_hatims' | 'total_salawat' | 'total_groups_joined' | 'total_groups_created' | 'badges' | 'current_streak' | 'longest_streak'>;
                Update: Partial<Database['public']['Tables']['users']['Insert']>;
            };
            groups: {
                Row: {
                    id: string;
                    creator_id: string | null;
                    title: string;
                    description: string | null;
                    type: 'hatim' | 'salavat' | 'yasin' | 'custom';
                    distribution_mode: 'auto' | 'manual' | 'hybrid';
                    total_juz: number;
                    target_count: number | null;
                    current_count: number;
                    intention: string | null;
                    intention_person: string | null;
                    start_date: string;
                    end_date: string;
                    privacy: 'private' | 'public' | 'unlisted';
                    invite_code: string;
                    qr_code_url: string | null;
                    settings: Record<string, any>;
                    total_members: number;
                    completed_percentage: number;
                    status: 'active' | 'completed' | 'expired' | 'cancelled';
                    completed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at' | 'current_count' | 'total_members' | 'completed_percentage'>;
                Update: Partial<Database['public']['Tables']['groups']['Insert']>;
            };
            group_members: {
                Row: {
                    id: string;
                    group_id: string;
                    user_id: string;
                    role: 'creator' | 'admin' | 'member';
                    status: 'active' | 'left';
                    joined_at: string;
                    left_at: string | null;
                };
                Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'joined_at'>;
                Update: Partial<Database['public']['Tables']['group_members']['Insert']>;
            };
            juz_assignments: {
                Row: {
                    id: string;
                    group_id: string;
                    user_id: string | null;
                    juz_number: number;
                    status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
                    assigned_at: string;
                    started_at: string | null;
                    completed_at: string | null;
                    notes: string | null;
                };
                Insert: Omit<Database['public']['Tables']['juz_assignments']['Row'], 'id' | 'assigned_at'>;
                Update: Partial<Database['public']['Tables']['juz_assignments']['Insert']>;
            };
            activities: {
                Row: {
                    id: string;
                    group_id: string;
                    user_id: string;
                    type: 'juz_complete' | 'salawat_add' | 'yasin_complete' | 'member_joined' | 'group_completed' | 'announcement';
                    data: Record<string, any> | null;
                    notes: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['activities']['Insert']>;
            };
            contributions: {
                Row: {
                    id: string;
                    group_id: string;
                    user_id: string;
                    count: number;
                    last_updated: string;
                };
                Insert: Omit<Database['public']['Tables']['contributions']['Row'], 'id' | 'last_updated'>;
                Update: Partial<Database['public']['Tables']['contributions']['Insert']>;
            };
            messages: {
                Row: {
                    id: string;
                    group_id: string;
                    user_id: string;
                    type: 'text' | 'voice_note';
                    content: string | null;
                    audio_url: string | null;
                    duration_seconds: number | null;
                    created_at: string;
                    edited_at: string | null;
                    deleted_at: string | null;
                };
                Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['messages']['Insert']>;
            };
            reactions: {
                Row: {
                    id: string;
                    activity_id: string;
                    user_id: string;
                    emoji: string;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['reactions']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['reactions']['Insert']>;
            };
            notifications: {
                Row: {
                    id: string;
                    user_id: string;
                    type: string;
                    title: string;
                    body: string;
                    data: Record<string, any> | null;
                    read: boolean;
                    read_at: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'read'>;
                Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
            };
            user_badges: {
                Row: {
                    id: string;
                    user_id: string;
                    badge_id: string;
                    earned_at: string;
                };
                Insert: Omit<Database['public']['Tables']['user_badges']['Row'], 'id' | 'earned_at'>;
                Update: Partial<Database['public']['Tables']['user_badges']['Insert']>;
            };
            counters: {
                Row: {
                    id: string;
                    user_id: string;
                    value: number;
                    target: number;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['counters']['Row'], 'id' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['counters']['Insert']>;
            };
        };
    };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
