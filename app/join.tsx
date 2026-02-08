import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Pressable,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useInviteLink } from '@/lib/hooks';
import { useApp } from '@/contexts/AppContext';

export default function JoinGroupScreen() {
    const insets = useSafeAreaInsets();
    const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
    const [inviteCode, setInviteCode] = useState(initialCode || '');
    const [isSearching, setIsSearching] = useState(false);
    const { profile, refreshGroups } = useApp();

    const { group, isLoading, error, isJoined, join } = useInviteLink(inviteCode.length >= 6 ? inviteCode : '');

    const topInset = Platform.OS === 'web' ? 67 : insets.top;

    const handleJoin = async () => {
        if (!profile) {
            Alert.alert('Giriş Gerekli', 'Gruba katılmak için giriş yapmalısınız.');
            router.push('/auth');
            return;
        }

        if (isJoined && group) {
            // Zaten üye, direkt gruba git
            router.replace(`/group/${group.id}`);
            return;
        }

        try {
            const joinedGroup = await join();
            await refreshGroups();
            Alert.alert('Başarılı! 🎉', `"${joinedGroup.title}" grubuna katıldınız!`, [
                {
                    text: 'Gruba Git',
                    onPress: () => router.replace(`/group/${joinedGroup.id}`),
                },
            ]);
        } catch (e: any) {
            Alert.alert('Hata', e.message || 'Gruba katılırken bir sorun oluştu.');
        }
    };

    const getGroupTypeLabel = (type: string) => {
        switch (type) {
            case 'hatim': return 'Hatim';
            case 'salavat': return 'Salavat';
            case 'yasin': return 'Yasin-i Şerif';
            default: return 'Grup';
        }
    };

    const getGroupIcon = (type: string) => {
        switch (type) {
            case 'hatim': return 'book-outline';
            case 'salavat': return 'heart-outline';
            case 'yasin': return 'book-outline';
            default: return 'people-outline';
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.header, { paddingTop: topInset + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Gruba Katıl</Text>
                <View style={styles.headerBtn} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={[Colors.primary, Colors.primaryLight]}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="people" size={48} color="#FFFFFF" />
                    </LinearGradient>
                </View>

                <Text style={styles.title}>Davet Kodu Girin</Text>
                <Text style={styles.subtitle}>
                    Size gönderilen 6 haneli davet kodunu girerek gruba katılabilirsiniz.
                </Text>

                <TextInput
                    style={styles.codeInput}
                    value={inviteCode}
                    onChangeText={(text) => setInviteCode(text.toUpperCase())}
                    placeholder="ABC123"
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={8}
                    autoCapitalize="characters"
                    autoCorrect={false}
                />

                {/* Grup Önizleme */}
                {isLoading && inviteCode.length >= 6 && (
                    <View style={styles.previewCard}>
                        <ActivityIndicator color={Colors.primary} />
                        <Text style={styles.previewLoading}>Grup aranıyor...</Text>
                    </View>
                )}

                {group && !isLoading && (
                    <View style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <View style={[styles.previewIcon, { backgroundColor: Colors.primary + '15' }]}>
                                <Ionicons name={getGroupIcon(group.type) as any} size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.previewInfo}>
                                <Text style={styles.previewTitle}>{group.title}</Text>
                                <Text style={styles.previewType}>{getGroupTypeLabel(group.type)}</Text>
                            </View>
                        </View>

                        {group.intention && (
                            <Text style={styles.previewIntention}>📿 {group.intention}</Text>
                        )}

                        <View style={styles.previewStats}>
                            <View style={styles.previewStat}>
                                <Text style={styles.previewStatValue}>{group.total_members || 0}</Text>
                                <Text style={styles.previewStatLabel}>Üye</Text>
                            </View>
                            <View style={styles.previewStatDivider} />
                            <View style={styles.previewStat}>
                                <Text style={styles.previewStatValue}>{Math.round((group.completed_percentage || 0))}%</Text>
                                <Text style={styles.previewStatLabel}>İlerleme</Text>
                            </View>
                        </View>

                        {isJoined && (
                            <View style={styles.alreadyJoinedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                <Text style={styles.alreadyJoinedText}>Zaten bu grubun üyesisiniz</Text>
                            </View>
                        )}
                    </View>
                )}

                {error && inviteCode.length >= 6 && (
                    <View style={styles.errorCard}>
                        <Ionicons name="alert-circle-outline" size={24} color={Colors.error} />
                        <Text style={styles.errorText}>Grup bulunamadı. Davet kodunu kontrol edin.</Text>
                    </View>
                )}

                <Pressable
                    style={({ pressed }) => [
                        styles.joinBtn,
                        pressed && { opacity: 0.9 },
                        (!group || isLoading) && { opacity: 0.5 },
                    ]}
                    onPress={handleJoin}
                    disabled={!group || isLoading}
                >
                    <LinearGradient
                        colors={[Colors.primary, Colors.primaryLight]}
                        style={styles.joinBtnGradient}
                    >
                        <Ionicons name={isJoined ? "enter-outline" : "person-add"} size={22} color="#FFFFFF" />
                        <Text style={styles.joinBtnText}>
                            {isJoined ? 'Gruba Git' : 'Gruba Katıl'}
                        </Text>
                    </LinearGradient>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.background,
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 17,
        color: Colors.text,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        marginTop: 20,
        marginBottom: 24,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Inter_700Bold',
        fontSize: 22,
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    codeInput: {
        width: '100%',
        backgroundColor: Colors.card,
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingVertical: 14,
        fontFamily: 'Inter_700Bold',
        fontSize: 24,
        color: Colors.text,
        textAlign: 'center',
        letterSpacing: 8,
        borderWidth: 2,
        borderColor: Colors.cardBorder,
        marginBottom: 20,
    },
    previewCard: {
        width: '100%',
        backgroundColor: Colors.card,
        borderRadius: 18,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    previewLoading: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 12,
        textAlign: 'center',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewInfo: {
        flex: 1,
        marginLeft: 14,
    },
    previewTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 17,
        color: Colors.text,
    },
    previewType: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: Colors.primary,
        marginTop: 2,
    },
    previewIntention: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: 16,
        lineHeight: 22,
    },
    previewStats: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 12,
        padding: 14,
    },
    previewStat: {
        flex: 1,
        alignItems: 'center',
    },
    previewStatValue: {
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        color: Colors.text,
    },
    previewStatLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    previewStatDivider: {
        width: 1,
        backgroundColor: Colors.divider,
    },
    alreadyJoinedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 10,
        backgroundColor: Colors.success + '12',
        borderRadius: 10,
    },
    alreadyJoinedText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: Colors.success,
    },
    errorCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Colors.error + '10',
        borderRadius: 14,
        padding: 16,
        marginBottom: 24,
    },
    errorText: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.error,
    },
    joinBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    joinBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    joinBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
