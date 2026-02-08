import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { activitiesService, realtimeService, Activity, ActivityWithUser } from '@/lib/database';
import { useApp } from '@/contexts/AppContext';

interface Props {
    groupId: string;
    userRole?: string;
}

const getActivityIcon = (type: string) => {
    switch (type) {
        case 'juz_complete':
            return { icon: 'book-check-outline', color: Colors.success };
        case 'member_joined':
            return { icon: 'account-plus-outline', color: Colors.primary };
        case 'salawat_add':
            return { icon: 'heart-plus-outline', color: Colors.accent };
        case 'announcement':
            return { icon: 'bullhorn-outline', color: Colors.accent };
        default:
            return { icon: 'bell-outline', color: Colors.textSecondary };
    }
};

const getActivityText = (activity: ActivityWithUser) => {
    const userName = activity.user?.full_name || 'Bir üye';

    switch (activity.type) {
        case 'juz_complete':
            return (
                <Text style={styles.activityText}>
                    <Text style={styles.userName}>{userName}</Text> {activity.data?.juz_number}. cüzü tamamladı 🎉
                </Text>
            );
        case 'member_joined':
            return (
                <Text style={styles.activityText}>
                    <Text style={styles.userName}>{userName}</Text> gruba katıldı 👋
                </Text>
            );
        case 'salawat_add':
            return (
                <Text style={styles.activityText}>
                    <Text style={styles.userName}>{userName}</Text> {activity.data?.count} salavat okudu 📿
                </Text>
            );
        case 'announcement':
            return (
                <View>
                    <Text style={styles.announcementLabel}>📢 Duyuru</Text>
                    <Text style={styles.announcementText}>{activity.data?.message}</Text>
                </View>
            );
        default:
            return (
                <Text style={styles.activityText}>
                    <Text style={styles.userName}>{userName}</Text> bir işlem yaptı.
                </Text>
            );
    }
};

export default function ActivityFeed({ groupId, userRole }: Props) {
    const { profile } = useApp();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const [announcement, setAnnouncement] = useState('');
    const isCreator = userRole === 'creator';

    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['activities', groupId],
        queryFn: () => activitiesService.getGroupActivities(groupId),
    });

    useEffect(() => {
        const channel = realtimeService.subscribeToActivities(groupId, (payload) => {
            if (payload.new) {
                queryClient.invalidateQueries({ queryKey: ['activities', groupId] });
            }
        });

        return () => {
            realtimeService.unsubscribe(channel);
        };
    }, [groupId, queryClient]);

    const announcementMutation = useMutation({
        mutationFn: (message: string) => activitiesService.create({
            group_id: groupId,
            user_id: profile!.id,
            type: 'announcement',
            data: { message },
            notes: null,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activities', groupId] });
            setAnnouncement('');
        },
    });

    const handleSendAnnouncement = () => {
        if (!announcement.trim() || !isCreator) return;
        announcementMutation.mutate(announcement.trim());
    };

    const renderActivity = ({ item }: { item: ActivityWithUser }) => {
        const { icon, color } = getActivityIcon(item.type);
        const isAnnouncement = item.type === 'announcement';

        return (
            <View style={[
                styles.itemContainer,
                isAnnouncement && styles.announcementContainer
            ]}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={color} />
                </View>
                <View style={styles.contentBox}>
                    {getActivityText(item)}
                    <Text style={styles.timestamp}>
                        {new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    if (activities.length === 0 && !isCreator) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="timeline-text-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Henüz bir aktivite yok.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={activities}
                renderItem={renderActivity}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: isCreator ? 16 : Math.max(insets.bottom + 16, 32) }
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="timeline-text-outline" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyText}>Henüz bir aktivite yok.</Text>
                    </View>
                }
            />

            {isCreator && (
                <View style={[styles.announcementInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.announcementInputRow}>
                        <TextInput
                            style={styles.announcementInput}
                            value={announcement}
                            onChangeText={setAnnouncement}
                            placeholder="Duyuru yaz..."
                            placeholderTextColor={Colors.textTertiary}
                            multiline
                            maxLength={300}
                        />
                        <Pressable
                            style={[styles.sendBtn, !announcement.trim() && styles.sendBtnDisabled]}
                            onPress={handleSendAnnouncement}
                            disabled={!announcement.trim() || announcementMutation.isPending}
                        >
                            <Ionicons name="megaphone" size={20} color="#FFFFFF" />
                        </Pressable>
                    </View>
                    <Text style={styles.announcementHint}>
                        📢 Sadece siz duyuru gönderebilirsiniz
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontFamily: 'Inter_400Regular',
        color: Colors.textTertiary,
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        shadowColor: Colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    contentBox: {
        flex: 1,
    },
    activityText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
        marginBottom: 4,
    },
    userName: {
        fontFamily: 'Inter_600SemiBold',
        color: Colors.primary,
    },
    timestamp: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: Colors.textTertiary,
    },
    announcementContainer: {
        borderColor: Colors.accent + '40',
        backgroundColor: Colors.accent + '08',
    },
    announcementLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: Colors.accent,
        marginBottom: 4,
    },
    announcementText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    announcementInputContainer: {
        backgroundColor: Colors.card,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    announcementInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    announcementInput: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.text,
        maxHeight: 80,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: Colors.textTertiary,
        opacity: 0.5,
    },
    announcementHint: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: Colors.textTertiary,
        marginTop: 8,
        textAlign: 'center',
    },
});
