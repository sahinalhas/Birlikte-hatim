import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';

interface DailyCardProps {
    type?: 'verse' | 'hadith' | 'prayer';
    title: string;
    content: string;
    source: string;
}

export default function DailyCard({
    type = 'verse',
    title = 'Günün Ayeti',
    content = 'Şüphesiz, zorlukla beraber bir kolaylık vardır.',
    source = 'İnşirah Suresi, 5. Ayet'
}: DailyCardProps) {
    const scale = useSharedValue(0.95);
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    // Icon animation
    const iconRotate = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 12 });
        opacity.value = withDelay(100, withSpring(1));
        translateY.value = withDelay(100, withSpring(0));

        // Subtle rotation for icon
        iconRotate.value = withRepeat(
            withSequence(
                withTiming(-5, { duration: 2000 }),
                withTiming(5, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { scale: scale.value },
            { translateY: translateY.value }
        ],
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${iconRotate.value}deg` }],
    }));

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Future: Open share modal or details
    };

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <Pressable onPress={handlePress} style={styles.pressable}>
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    {/* Decorative Pattern */}
                    <View style={styles.patternContainer}>
                        <MaterialCommunityIcons name="flower-tulip-outline" size={120} color="rgba(255,255,255,0.05)" />
                    </View>

                    <View style={styles.header}>
                        <View style={styles.badge}>
                            <Animated.View style={iconStyle}>
                                <MaterialCommunityIcons
                                    name={type === 'verse' ? 'book-open-page-variant' : 'hands-pray'}
                                    size={16}
                                    color={Colors.accent}
                                />
                            </Animated.View>
                            <Text style={styles.badgeText}>{title}</Text>
                        </View>
                        <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.7)" />
                    </View>

                    <View style={styles.contentContainer}>
                        <MaterialCommunityIcons name="format-quote-open" size={24} color={Colors.accent} style={styles.quoteIcon} />
                        <Text style={styles.content}>{content}</Text>
                        <MaterialCommunityIcons name="format-quote-close" size={24} color={Colors.accent} style={styles.quoteIconRight} />
                    </View>

                    <Text style={styles.source}>{source}</Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        borderRadius: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    pressable: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    gradient: {
        padding: 16,
        minHeight: 140,
        justifyContent: 'space-between',
    },
    patternContainer: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        opacity: 0.5,
        transform: [{ rotate: '-15deg' }],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    contentContainer: {
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    quoteIcon: {
        marginBottom: 4,
        opacity: 0.8,
    },
    quoteIconRight: {
        alignSelf: 'flex-end',
        marginTop: 4,
        opacity: 0.8,
    },
    content: {
        fontFamily: 'Inter_500Medium', // Changed from serif to maintain font consistency but keep it elegant
        fontSize: 16,
        color: '#FFFFFF',
        lineHeight: 24,
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    source: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginTop: 8,
    },
});
