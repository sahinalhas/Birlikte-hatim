import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Platform,
    Alert,
    AppState,
    TextInput,
    Modal,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';

interface SalavatCounterProps {
    group: any;
    groupId: string;
    onAdd: (count: number) => void;
}

export default function SalavatCounter({ group, groupId, onAdd }: SalavatCounterProps) {
    const [localCount, setLocalCount] = useState(0);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualValue, setManualValue] = useState('');
    const [pendingCount, setPendingCount] = useState(0);
    const pulseScale = useSharedValue(1);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const progress = group.target_count ? Math.min((group.current_count || 0) / group.target_count, 1) : 0;

    // Sync when app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // Sync pending counts when app goes to background
                if (pendingCount > 0) {
                    onAdd(pendingCount);
                    setPendingCount(0);
                    setLocalCount(0);
                }
            }
        });

        return () => {
            subscription.remove();
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [pendingCount, onAdd]);

    // Keep track of pendingCount in a ref for cleanup
    const pendingCountRef = useRef(pendingCount);
    useEffect(() => {
        pendingCountRef.current = pendingCount;
    }, [pendingCount]);

    // Sync on unmount
    useEffect(() => {
        return () => {
            if (pendingCountRef.current > 0) {
                onAdd(pendingCountRef.current);
            }
        };
    }, [onAdd]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handleTap = useCallback(() => {
        // Animation
        pulseScale.value = withSequence(
            withSpring(0.95, { duration: 60 }),
            withSpring(1, { duration: 150 })
        );

        const newLocal = localCount + 1;
        const newPending = pendingCount + 1;
        setLocalCount(newLocal);
        setPendingCount(newPending);

        // Haptic feedback every 33 counts (tasbih logic)
        if (newLocal % 33 === 0 && Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Auto-sync every 33 counts (debounced)
        if (newPending >= 33) {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            syncTimeoutRef.current = setTimeout(() => {
                if (pendingCount > 0) {
                    onAdd(pendingCount);
                    setPendingCount(0);
                }
            }, 1000);
        }
    }, [localCount, pendingCount, onAdd, pulseScale]);

    const handleSubmit = useCallback(() => {
        if (pendingCount === 0) return;
        onAdd(pendingCount);
        setPendingCount(0);
        setLocalCount(0);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [pendingCount, onAdd]);

    const handleManualSubmit = useCallback(() => {
        const count = parseInt(manualValue, 10);
        if (isNaN(count) || count <= 0) {
            Alert.alert('Hata', 'Geçerli bir sayı giriniz.');
            return;
        }
        if (count > 10000) {
            Alert.alert('Hata', 'Tek seferde maksimum 10.000 girilebilir.');
            return;
        }
        onAdd(count);
        setManualValue('');
        setShowManualInput(false);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [manualValue, onAdd]);

    return (
        <View style={styles.salavatSection}>
            <View style={styles.salavatProgress}>
                <View style={styles.salavatProgressBarBg}>
                    <LinearGradient
                        colors={[Colors.accent, Colors.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.salavatProgressFill, { width: `${progress * 100}%` }]}
                    />
                </View>
                <Text style={styles.salavatProgressText}>
                    {(group.current_count || 0).toLocaleString()} / {(group.target_count || 0).toLocaleString()}
                </Text>
            </View>

            <Animated.View style={animStyle}>
                <Pressable style={styles.salavatTapBtn} onPress={handleTap}>
                    <LinearGradient
                        colors={[Colors.accent, Colors.accentLight]}
                        style={styles.salavatTapGradient}
                    >
                        <Text style={styles.salavatTapCount}>{localCount}</Text>
                        <Text style={styles.salavatTapLabel}>Dokun ve say</Text>
                    </LinearGradient>
                </Pressable>
            </Animated.View>

            {pendingCount > 0 && (
                <Text style={styles.pendingText}>
                    📤 {pendingCount} adet bekliyor
                </Text>
            )}

            <View style={styles.salavatButtons}>
                {pendingCount > 0 && (
                    <Pressable style={styles.salavatSubmitBtn} onPress={handleSubmit}>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.salavatSubmitText}>{pendingCount} adet ekle</Text>
                    </Pressable>
                )}

                <Pressable
                    style={styles.manualInputBtn}
                    onPress={() => setShowManualInput(true)}
                >
                    <Ionicons name="keypad-outline" size={18} color={Colors.primary} />
                    <Text style={styles.manualInputBtnText}>Manuel Giriş</Text>
                </Pressable>
            </View>

            {/* Manual Input Modal */}
            <Modal
                visible={showManualInput}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowManualInput(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.manualInputOverlay}
                >
                    <View style={styles.manualInputModal}>
                        <Text style={styles.manualInputTitle}>Manuel Sayı Girişi</Text>
                        <Text style={styles.manualInputSubtitle}>
                            Kendi tesbihinizle okuduğunuz sayıyı girin
                        </Text>
                        <TextInput
                            style={styles.manualInputField}
                            value={manualValue}
                            onChangeText={setManualValue}
                            placeholder="Örn: 100"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="number-pad"
                            maxLength={5}
                            autoFocus
                        />
                        <View style={styles.manualInputActions}>
                            <Pressable
                                style={styles.manualInputCancel}
                                onPress={() => {
                                    setShowManualInput(false);
                                    setManualValue('');
                                }}
                            >
                                <Text style={styles.manualInputCancelText}>İptal</Text>
                            </Pressable>
                            <Pressable style={styles.manualInputSubmit} onPress={handleManualSubmit}>
                                <Text style={styles.manualInputSubmitText}>Ekle</Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    salavatSection: {
        marginBottom: 32,
        alignItems: 'center',
    },
    salavatProgress: {
        width: '100%',
        marginBottom: 32,
    },
    salavatProgressBarBg: {
        height: 12,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 10,
    },
    salavatProgressFill: {
        height: 12,
        borderRadius: 6,
    },
    salavatProgressText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: Colors.text,
        textAlign: 'center',
    },
    salavatTapBtn: {
        width: 250,
        height: 250,
        borderRadius: 125,
        elevation: 20,
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        marginBottom: 24,
    },
    salavatTapGradient: {
        flex: 1,
        borderRadius: 125,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderWidth: 6,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    salavatTapCount: {
        fontFamily: 'Inter_800ExtraBold',
        fontSize: 84,
        color: '#FFFFFF',
        letterSpacing: -2,
    },
    salavatTapLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginTop: -4,
    },
    pendingText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        color: Colors.accentDark,
        marginBottom: 24,
    },
    salavatButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    salavatSubmitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.accent,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        elevation: 4,
    },
    salavatSubmitText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
        color: '#FFFFFF',
    },
    manualInputBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1.5,
        borderColor: Colors.primary + '30',
    },
    manualInputBtnText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
        color: Colors.primary,
    },
    manualInputOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 30,
    },
    manualInputModal: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 24,
        elevation: 10,
    },
    manualInputTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 20,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    manualInputSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    manualInputField: {
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: Colors.primary + '40',
    },
    manualInputActions: {
        flexDirection: 'row',
        gap: 12,
    },
    manualInputCancel: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: Colors.backgroundSecondary,
    },
    manualInputCancelText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    manualInputSubmit: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: Colors.primary,
    },
    manualInputSubmitText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
