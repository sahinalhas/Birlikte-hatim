import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';

import { useAuth } from '../contexts/AuthContext';
import Colors from '@/constants/colors';

type AuthMode = 'phone' | 'email' | 'otp';

export default function AuthScreen() {
    const insets = useSafeAreaInsets();
    const { signInWithPhone, verifyOtp, signInWithEmail, signUpWithEmail, isLoading } = useAuth();

    const [mode, setMode] = useState<AuthMode>('phone');
    const [isSignUp, setIsSignUp] = useState(false);

    // Form states
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [otp, setOtp] = useState('');

    const [error, setError] = useState('');

    const handleHaptic = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePhoneSubmit = async () => {
        handleHaptic();
        if (phone.length < 10) {
            setError('Geçerli bir telefon numarası girin');
            return;
        }

        const formattedPhone = phone.startsWith('+') ? phone : `+90${phone.replace(/^0/, '')}`;
        const result = await signInWithPhone(formattedPhone);

        if (result.error) {
            setError(result.error.message);
        } else {
            setMode('otp');
            setError('');
        }
    };

    const handleOtpSubmit = async () => {
        handleHaptic();
        if (otp.length !== 6) {
            setError('6 haneli doğrulama kodunu girin');
            return;
        }

        const formattedPhone = phone.startsWith('+') ? phone : `+90${phone.replace(/^0/, '')}`;
        const result = await verifyOtp(formattedPhone, otp);

        if (result.error) {
            setError(result.error.message);
        } else {
            router.replace('/(tabs)');
        }
    };

    const handleEmailSubmit = async () => {
        handleHaptic();
        if (!email || !password) {
            setError('Email ve şifre gerekli');
            return;
        }

        if (isSignUp && !fullName) {
            setError('İsim gerekli');
            return;
        }

        const result = isSignUp
            ? await signUpWithEmail(email, password, fullName)
            : await signInWithEmail(email, password);

        if (result.error) {
            setError(result.error.message);
        } else {
            // Email doğrulaması kapalı olduğundan direkt giriş yap
            router.replace('/(tabs)');
        }
    };

    const renderPhoneForm = () => (
        <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
                <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>🇹🇷 +90</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="5XX XXX XX XX"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={10}
                />
            </View>

            <Pressable
                style={({ pressed }: { pressed: boolean }) => [
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
                onPress={handlePhoneSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.primaryButtonText}>Doğrulama Kodu Gönder</Text>
                )}
            </Pressable>

            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
            </View>

            <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                    handleHaptic();
                    setMode('email');
                }}
            >
                <Ionicons name="mail-outline" size={20} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Email ile devam et</Text>
            </Pressable>
        </View>
    );

    const renderOtpForm = () => (
        <View style={styles.formContainer}>
            <Text style={styles.otpInfo}>
                <Text style={styles.otpInfoBold}>{phone}</Text> numarasına 6 haneli kod gönderdik
            </Text>

            <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                autoFocus
            />

            <Pressable
                style={({ pressed }: { pressed: boolean }) => [
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
                onPress={handleOtpSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.primaryButtonText}>Doğrula</Text>
                )}
            </Pressable>

            <Pressable
                style={styles.linkButton}
                onPress={() => {
                    handleHaptic();
                    setMode('phone');
                    setOtp('');
                }}
            >
                <Text style={styles.linkButtonText}>← Numarayı değiştir</Text>
            </Pressable>
        </View>
    );

    const renderEmailForm = () => (
        <View style={styles.formContainer}>
            {isSignUp && (
                <View>
                    <TextInput
                        style={styles.input}
                        placeholder="Ad Soyad"
                        placeholderTextColor={Colors.textTertiary}
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                    />
                </View>
            )}

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <Pressable
                style={({ pressed }: { pressed: boolean }) => [
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
                onPress={handleEmailSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.primaryButtonText}>
                        {isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
                    </Text>
                )}
            </Pressable>

            <Pressable
                style={styles.linkButton}
                onPress={() => {
                    handleHaptic();
                    setIsSignUp(!isSignUp);
                }}
            >
                <Text style={styles.linkButtonText}>
                    {isSignUp ? 'Zaten hesabım var' : 'Yeni hesap oluştur'}
                </Text>
            </Pressable>

            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
            </View>

            <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                    handleHaptic();
                    setMode('phone');
                }}
            >
                <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Telefon ile devam et</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.headerGradient}
            >
                <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
                    <View>
                        <MaterialCommunityIcons name="book-open-page-variant" size={64} color="#FFFFFF" />
                    </View>
                    <Text
                        style={styles.appName}
                    >
                        Birlikte İbadet
                    </Text>
                    <Text
                        style={styles.tagline}
                    >
                        Toplu ibadetler için kolaylaştırıcı platform
                    </Text>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formSection}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={styles.card}
                    >
                        <Text style={styles.cardTitle}>
                            {mode === 'otp'
                                ? 'Doğrulama Kodu'
                                : mode === 'email'
                                    ? (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')
                                    : 'Hoş Geldiniz'}
                        </Text>

                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {mode === 'phone' && renderPhoneForm()}
                        {mode === 'otp' && renderOtpForm()}
                        {mode === 'email' && renderEmailForm()}
                    </View>

                    <Text style={styles.disclaimer}>
                        Devam ederek{' '}
                        <Text style={styles.disclaimerLink}>Kullanım Şartları</Text>
                        {' '}ve{' '}
                        <Text style={styles.disclaimerLink}>Gizlilik Politikası</Text>
                        'nı kabul etmiş olursunuz.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    headerGradient: {
        paddingBottom: 40,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    appName: {
        fontFamily: 'Inter_700Bold',
        fontSize: 28,
        color: '#FFFFFF',
        marginTop: 16,
    },
    tagline: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        textAlign: 'center',
    },
    formSection: {
        flex: 1,
        marginTop: -20,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: 18,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    cardTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 18,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    formContainer: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    phonePrefix: {
        backgroundColor: Colors.backgroundSecondary,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    phonePrefixText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 16,
        color: Colors.text,
    },
    input: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 12,
        padding: 14,
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    phoneInput: {
        flex: 1,
    },
    otpInput: {
        textAlign: 'center',
        fontSize: 24,
        letterSpacing: 8,
    },
    otpInfo: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    otpInfoBold: {
        fontFamily: 'Inter_600SemiBold',
        color: Colors.text,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary + '10',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    secondaryButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 15,
        color: Colors.primary,
    },
    linkButton: {
        alignItems: 'center',
        padding: 8,
    },
    linkButtonText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.primary,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.cardBorder,
    },
    dividerText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textTertiary,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.error + '15',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    errorText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.error,
        flex: 1,
    },
    disclaimer: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    disclaimerLink: {
        color: Colors.primary,
    },
});
