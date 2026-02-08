import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, Tables } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export type User = Tables<'users'>;

interface AuthContextValue {
    session: Session | null;
    user: SupabaseUser | null;
    profile: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Auth methods
    signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
    verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;

    // Profile methods
    updateProfile: (updates: Partial<User>) => Promise<{ error: Error | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Oturum değişikliklerini dinle
    useEffect(() => {
        let mounted = true;

        // Mevcut oturumu al
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchProfile(session.user.id);
            }
            setIsLoading(false);
        });

        // Auth durumu değişikliklerini dinle
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                console.log('Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);

                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                    await fetchProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Profil bilgilerini getir
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
                return;
            }

            if (data) {
                setProfile(data);
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        }
    };

    // Telefon ile giriş (OTP gönder)
    const signInWithPhone = useCallback(async (phone: string) => {
        try {
            setIsLoading(true);
            const { error } = await supabase.auth.signInWithOtp({
                phone,
                options: {
                    channel: 'sms',
                },
            });

            if (error) {
                return { error: new Error(error.message) };
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // OTP doğrulama
    const verifyOtp = useCallback(async (phone: string, token: string) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.verifyOtp({
                phone,
                token,
                type: 'sms',
            });

            if (error) {
                return { error: new Error(error.message) };
            }

            // Yeni kullanıcı ise profil oluştur
            if (data.user && !profile) {
                const { error: profileError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    phone: phone,
                    full_name: 'Kullanıcı',
                    timezone: 'Europe/Istanbul',
                    language: 'tr',
                    settings: {
                        notification_enabled: true,
                        notification_times: ['09:00', '20:00'],
                        prayer_time_reminders: true,
                        theme: 'auto',
                    },
                });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }

                await fetchProfile(data.user.id);
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    // E-posta ile giriş
    const signInWithEmail = useCallback(async (email: string, password: string) => {
        try {
            setIsLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { error: new Error(error.message) };
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // E-posta ile kayıt
    const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) {
                return { error: new Error(error.message) };
            }

            // Profil oluştur
            if (data.user) {
                await supabase.from('users').insert({
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    timezone: 'Europe/Istanbul',
                    language: 'tr',
                    settings: {
                        notification_enabled: true,
                        notification_times: ['09:00', '20:00'],
                        prayer_time_reminders: true,
                        theme: 'auto',
                    },
                });
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Çıkış yap
    const signOut = useCallback(async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
    }, []);

    // Profil güncelle
    const updateProfile = useCallback(async (updates: Partial<User>) => {
        if (!user) {
            return { error: new Error('Not authenticated') };
        }

        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (error) {
                return { error: new Error(error.message) };
            }

            // Local state'i güncelle
            setProfile((prev) => (prev ? { ...prev, ...updates } : null));
            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    }, [user]);

    // Profili yenile
    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    }, [user]);

    const value = React.useMemo(() => ({
        session,
        user,
        profile,
        isLoading,
        isAuthenticated: !!session,
        signInWithPhone,
        verifyOtp,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        refreshProfile,
    }), [
        session,
        user,
        profile,
        isLoading,
        signInWithPhone,
        verifyOtp,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        refreshProfile
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
