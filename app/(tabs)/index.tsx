
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { groupsService, Group } from '@/lib/database';
import { counterStorage } from '@/lib/counter-storage';
import { supabase } from '@/lib/supabase';
import DailyCard from '@/components/DailyCard';


// ==========================================
// Zikirmatik Modal Bileşeni
// ==========================================
interface ZikirmatikModalProps {
  visible: boolean;
  onClose: () => void;
  group: Group;
  onSync: (count: number) => Promise<void>;
}

function ZikirmatikModal({ visible, onClose, group, onSync }: ZikirmatikModalProps) {
  const [localCount, setLocalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const pulseScale = useSharedValue(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setPendingCount(counterStorage.getPendingCountSync(group.id));
      setLocalCount(0); // Modal açılınca lokal sıfırla, toplamı pending'den göster
    }
  }, [visible, group.id]);

  // Uygulama arka plana geçtiğinde sync yap
  useEffect(() => {
    if (!visible) return;

    const subscription = Platform.OS !== 'web' ? require('react-native').AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        handleSync();
      }
    }) : { remove: () => { } };

    return () => {
      subscription.remove();
    };
  }, [visible, pendingCount]);

  const handleSync = async () => {
    const count = counterStorage.getPendingCountSync(group.id);
    if (count > 0 && !isSyncing) {
      setIsSyncing(true);
      try {
        await onSync(count);
        await counterStorage.clearPendingCount(group.id);
        setPendingCount(0);
        setLocalCount(0);
      } catch (error) {
        console.error('Sync error:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleClose = async () => {
    await handleSync();
    onClose();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleTap = useCallback(() => {
    // Animasyon
    pulseScale.value = withSequence(
      withSpring(0.95, { duration: 50 }),
      withSpring(1, { duration: 150 })
    );

    // Haptic
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Increment
    counterStorage.increment(group.id).then(res => {
      setLocalCount(prev => prev + 1);
      setPendingCount(res.localCount);

      if (res.shouldHaptic && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  }, [group.id]);

  const currentTotal = (group.current_count || 0) + pendingCount;
  const target = group.target_count || 0;
  const progress = target > 0 ? Math.min(currentTotal / target, 1) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, Platform.OS === 'android' && { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>{group.title}</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn} disabled={isSyncing}>
            {isSyncing ? <ActivityIndicator size="small" color={Colors.textSecondary} /> : <Ionicons name="close-circle" size={32} color={Colors.textSecondary} />}
          </Pressable>
        </View>

        <View style={styles.zikirContainer}>
          <Text style={styles.zikirTargetLabel}>İlerleme</Text>
          <Text style={styles.zikirTarget}>
            {currentTotal.toLocaleString()} / {target.toLocaleString()}
          </Text>

          {/* Progress Bar */}
          <View style={styles.modalProgressBg}>
            <View style={[styles.modalProgressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.zikirCircleWrapper}>
            <Animated.View style={animStyle}>
              <Pressable style={styles.zikirBtn} onPress={handleTap} disabled={isSyncing}>
                <LinearGradient
                  colors={[Colors.accent, Colors.accentLight]}
                  style={styles.zikirGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.zikirInnerCircle}>
                    <Text style={styles.zikirCount}>{localCount}</Text>
                    <Text style={styles.zikirLabel}>Dokun</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Ionicons name="cloud-upload-outline" size={16} color={Colors.accent} />
              <Text style={styles.pendingText}>
                {isSyncing ? 'Gönderiliyor...' : `${pendingCount} adet çıkışta gönderilecek`}
              </Text>
            </View>
          )}

          <Text style={styles.zikirHint}>
            Uygulama kapanırken veya çıkışta otomatik kaydedilir.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// Ana Sayfa Bileşeni
// ==========================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const { profile } = useApp();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedZikirGroup, setSelectedZikirGroup] = useState<Group | null>(null);

  // useApp() hook'undan merkezi verileri alıyoruz
  const { groups, isLoadingGroups: isLoading, refreshGroups: refetch } = useApp();

  const activeGroups = groups?.filter(g => g.status === 'active') || [];
  const hatimGroups = activeGroups.filter(g => g.type === 'hatim');
  const zikirSalavatGroups = activeGroups.filter(g => g.type !== 'hatim');

  // Sync Mutation (Tasks.tsx'den alındı)
  const syncMutation = useMutation({
    mutationFn: async ({ groupId, count }: { groupId: string; count: number }) => {
      if (!profile?.id) throw new Error('Kullanıcı oturumu yok');

      const { error } = await supabase.rpc('add_salavat', {
        p_group_id: groupId,
        p_user_id: profile.id,
        p_count: count
      });

      if (error) {
        console.warn('RPC hatası, fallback yapılıyor:', error);

        // Fallback: Manuel güncelleme
        const { data: group } = await supabase
          .from('groups')
          .select('current_count')
          .eq('id', groupId)
          .single();

        await supabase.from('groups').update({ current_count: (group?.current_count || 0) + count }).eq('id', groupId);

        const { data: contribution } = await supabase.from('contributions')
          .select('count')
          .eq('group_id', groupId).eq('user_id', profile.id).single();

        await supabase.from('contributions').upsert({
          group_id: groupId,
          user_id: profile.id,
          count: (contribution?.count || 0) + count,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'group_id,user_id' });
      }

      if (count >= 100) {
        await supabase.from('activities').insert({
          group_id: groupId,
          user_id: profile.id,
          type: 'salavat_add',
          data: { count },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-details'] });
    },
  });

  const handleSync = async (count: number) => {
    if (selectedZikirGroup && count > 0) {
      await syncMutation.mutateAsync({ groupId: selectedZikirGroup.id, count });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderHatimItem = (group: Group) => (
    <Link href={`/group/${group.id}`} asChild key={group.id}>
      <Pressable style={styles.taskCard}>
        <View style={styles.taskIconBox}>
          <MaterialCommunityIcons name="book-open-page-variant" size={24} color={Colors.primary} />
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{group.title}</Text>
          <Text style={styles.taskSubtitle}>Hatim okunuyor...</Text>
          <View style={styles.progressBarBg}>
            <View style={{ ...styles.progressBarFill, width: `${(group.current_count || 0) / 30 * 100}%` }} />
          </View>
          <Text style={styles.progressText}>%{Math.round((group.current_count || 0) / 30 * 100)} Tamamlandı</Text>
        </View>
        <View style={styles.chevronBox}>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </View>
      </Pressable>
    </Link>
  );

  const renderZikirItem = (group: Group) => {
    const progress = group.target_count ? Math.min((group.current_count || 0) / group.target_count, 1) : 0;
    return (
      <Link href={`/group/${group.id}`} asChild key={group.id}>
        <Pressable style={styles.taskCard}>
          <View style={{ ...styles.taskIconBox, backgroundColor: Colors.accent + '15' }}>
            <MaterialCommunityIcons name="heart-multiple" size={24} color={Colors.accent} />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{group.title}</Text>
            <Text style={styles.taskSubtitle}>
              {(group.target_count || 0) - (group.current_count || 0)} adet kaldı
            </Text>
            <View style={{ ...styles.progressBarBg, backgroundColor: Colors.accent + '15' }}>
              <View style={{ ...styles.progressBarFill, width: `${progress * 100}%`, backgroundColor: Colors.accent }} />
            </View>
            <Text style={{ ...styles.progressText, color: Colors.accent }}>
              %{Math.round(progress * 100)} Tamamlandı
            </Text>
          </View>
          <View style={styles.chevronBox}>
            <Pressable
              style={styles.actionBtn}
              onPress={(e) => {
                // Modal açılırken navigasyonu engelle
                e.stopPropagation();
                setSelectedZikirGroup(group);
              }}
            >
              <Text style={styles.actionBtnText}>Zikir</Text>
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={{ marginTop: 8, alignSelf: 'center' }} />
          </View>
        </Pressable>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ ...styles.scrollContent, paddingTop: topInset + 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Selâmün Aleyküm</Text>
            <Text style={styles.userName}>{profile?.full_name || 'Hoş Geldiniz'}</Text>
          </View>
          <View style={styles.headerButtons}>
            <Link href="/join" asChild>
              <Pressable style={styles.joinBtn}>
                <Ionicons name="enter-outline" size={22} color={Colors.primary} />
              </Pressable>
            </Link>
            <Link href="/create-group" asChild>
              <Pressable style={styles.addBtn}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Günün Ayeti */}
        <DailyCard
          type="verse"
          title="Günün Ayeti"
          content="Şüphesiz, zorlukla beraber bir kolaylık vardır."
          source="İnşirah Suresi, 5. Ayet"
        />

        {activeGroups.length > 0 ? (
          <>
            {/* Zikir / Salavat Hedefleri */}
            {zikirSalavatGroups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Zikir ve Salavatlarım</Text>
                <View style={styles.cardList}>
                  {zikirSalavatGroups.map(renderZikirItem)}
                </View>
              </View>
            )}

            {/* Hatimler */}
            {hatimGroups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aktif Hatimlerim</Text>
                <View style={styles.cardList}>
                  {hatimGroups.map(renderHatimItem)}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-open-page-variant" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Henüz göreviniz yok</Text>
            <Text style={styles.emptySubtitle}>Katıldığınız veya oluşturduğunuz gruplar burada listelenecek.</Text>
            <Link href="/create-group" asChild>
              <Pressable style={styles.createButton}>
                <Text style={styles.createButtonText}>Grup Oluştur</Text>
              </Pressable>
            </Link>
            <Link href="/(tabs)/discover" asChild>
              <Pressable style={{ ...styles.createButton, backgroundColor: Colors.card, marginTop: 12, borderWidth: 1, borderColor: Colors.cardBorder }}>
                <Text style={{ ...styles.createButtonText, color: Colors.text }}>Keşfet</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>

      {selectedZikirGroup && (
        <ZikirmatikModal
          visible={!!selectedZikirGroup}
          group={selectedZikirGroup}
          onClose={() => setSelectedZikirGroup(null)}
          onSync={handleSync}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  userName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  cardList: {
    gap: 14,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  taskIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  taskTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  taskSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  actionBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    elevation: 3,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  chevronBox: {
    paddingHorizontal: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.cardBorder,
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  zikirContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  zikirTargetLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 20,
  },
  zikirTarget: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: 20,
  },
  modalProgressBg: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 32,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  zikirCircleWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  zikirBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
  zikirGradient: {
    flex: 1,
    borderRadius: 115,
    padding: 8,
  },
  zikirInnerCircle: {
    flex: 1,
    borderRadius: 107,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zikirCount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 64,
    color: '#FFFFFF',
  },
  zikirLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  pendingText: {
    fontFamily: 'Inter_500Medium',
    color: Colors.accent,
    fontSize: 14,
  },
  zikirHint: {
    marginTop: 20,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
  },
});
