import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/lib/query-client';
import { realtimeService } from '@/lib/database';
import { notificationService } from '@/lib/notification-service';

import ActivityFeed from '@/components/group/ActivityFeed';
import QuranReaderModal from '@/components/group/QuranReaderModal';
import SalavatCounter from '@/components/group/SalavatCounter';
import JuzCell from '@/components/group/JuzCell';
import { useApp } from '@/contexts/AppContext';
import { useGroupDetail } from '@/lib/hooks';

function getGroupIcon(type: string) {
  switch (type) {
    case 'hatim': return 'book-open-variant';
    case 'salavat': return 'heart-multiple';
    case 'yasin': return 'book-open-page-variant';
    default: return 'book-open-variant';
  }
}

function getDaysRemaining(endDate: string): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}




export default function GroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, deleteGroup } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'activity'>('status');
  const [readerVisible, setReaderVisible] = useState(false);
  const [readingJuz, setReadingJuz] = useState<number | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number[]>([]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const {
    group,
    juzAssignments,
    members,
    activities,
    isLoading,
    isBusy,
    selectJuz,
    completeJuz,
    abandonJuz,
    addCount,
  } = useGroupDetail(id || '');

  if (isLoading || !group) {
    return (
      <View style={[styles.container, { paddingTop: topInset + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.emptyText}>{isLoading ? 'Yükleniyor...' : 'Grup bulunamadı'}</Text>
        </View>
      </View>
    );
  }

  const completedJuz = juzAssignments.filter((j: any) => j.status === 'completed').length;
  const takenJuz = juzAssignments.filter((j: any) => j.status === 'in_progress').length;
  const availableJuz = juzAssignments.filter((j: any) => j.status === 'pending').length;
  const daysLeft = getDaysRemaining(group.end_date || '');
  const progress = group.type === 'hatim'
    ? completedJuz / 30
    : group.target_count ? Math.min((group.current_count || 0) / group.target_count, 1) : 0;

  const currentUserMember = members.find((m: any) => m.user_id === profile?.id);
  const userRole = currentUserMember?.role || 'member';

  const handleJuzToggle = (juzNumber: number) => {
    setSelectedJuz(prev =>
      prev.includes(juzNumber)
        ? prev.filter(j => j !== juzNumber)
        : [...prev, juzNumber]
    );
  };

  const handleSelectJuz = async () => {
    if (selectedJuz.length === 0 || isBusy) return;

    try {
      await selectJuz(selectedJuz);

      for (const juzNum of selectedJuz) {
        notificationService.scheduleJuzReminder(
          group.title,
          juzNum,
          group.end_date
        );
      }

      setSelectedJuz([]);
      Alert.alert('Başarılı', 'Cüzler başarıyla alındı. Hatırlatıcınız kuruldu! 🔔');
    } catch (e) {
      Alert.alert('Hata', 'Cüzler alınırken bir sorun oluştu.');
    }
  };

  const handleCompleteJuz = (juzNumber: number, skipConfirmation = false) => {
    const performComplete = async () => {
      const targetJuz = juzAssignments.find((j: any) => j.juz_number === juzNumber);
      if (targetJuz) {
        try {
          await completeJuz(targetJuz.id);
          if (!skipConfirmation) {
            Alert.alert('Tebrikler 🤲', 'Cüz tamamlandı olarak işaretlendi! Allah kabul etsin.');
          }
        } catch (e: any) {
          Alert.alert('Hata', e.message || 'Cüz tamamlanırken bir hata oluştu');
        }
      }
    };

    if (skipConfirmation) {
      performComplete();
      return;
    }

    Alert.alert(
      'Cüzü Tamamla',
      'Bu cüzü okuduğunuzu onaylıyor musunuz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet, Tamamladım', style: 'default', onPress: performComplete },
      ]
    );
  };

  const handleAbandonJuz = (juzNumber: number) => {
    Alert.alert(
      'Cüzü Bırak',
      'Bu cüzü okumaktan vazgeçmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Bırak',
          style: 'destructive',
          onPress: async () => {
            const targetJuz = juzAssignments.find((j: any) => j.juz_number === juzNumber);
            if (targetJuz) {
              await abandonJuz(targetJuz.id);
            }
          },
        },
      ]
    );
  };

  const handleAddSalavat = async (count: number) => {
    await addCount(count);
  };

  const handleDelete = () => {
    Alert.alert(
      'Grubu Sil',
      'Bu grubu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(id || '');
            router.back();
          },
        },
      ]
    );
  };

  const handleShareInvite = async () => {
    try {
      const inviteCode = group.invite_code;
      const groupTypeLabel = group.type === 'hatim' ? 'Hatim' : group.type === 'salavat' ? 'Salavat' : 'Yasin';

      const message = `🕌 *${group.title}*
\n${group.intention ? `📿 ${group.intention}\n\n` : ''}${groupTypeLabel} grubuna katılmak ister misin?
\n📲 Uygulama üzerinden bu kodu gir:
*${inviteCode}*
\nveya bu linke tıkla:
birliktehatim://join/${inviteCode}
\n🤲 Hayırlı ibadetler dilerim!`;

      await Share.share({
        message,
        title: `${group.title} - Davet`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderStatus = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroIconBox}>
            <MaterialCommunityIcons name={getGroupIcon(group.type) as any} size={32} color="#FFFFFF" />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{group.title}</Text>
            {group.intention ? (
              <Text style={styles.heroIntention}>{group.intention}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{Math.round(progress * 100)}%</Text>
            <Text style={styles.heroStatLabel}>İlerleme</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{group.total_members || members.length}</Text>
            <Text style={styles.heroStatLabel}>Üye</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{daysLeft}</Text>
            <Text style={styles.heroStatLabel}>Gün Kaldı</Text>
          </View>
        </View>

        {group.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.completedBannerText}>Tamamlandı!</Text>
          </View>
        )}
      </LinearGradient>

      {group.type === 'hatim' && (
        <>
          <View style={styles.juzSummary}>
            <View style={[styles.juzSummaryItem, { backgroundColor: Colors.success + '12' }]}>
              <Text style={[styles.juzSummaryValue, { color: Colors.success }]}>{completedJuz}</Text>
              <Text style={styles.juzSummaryLabel}>Bitti</Text>
            </View>
            <View style={[styles.juzSummaryItem, { backgroundColor: Colors.accent + '12' }]}>
              <Text style={[styles.juzSummaryValue, { color: Colors.accentDark }]}>{takenJuz}</Text>
              <Text style={styles.juzSummaryLabel}>Alınmış</Text>
            </View>
            <View style={[styles.juzSummaryItem, { backgroundColor: Colors.primary + '12' }]}>
              <Text style={[styles.juzSummaryValue, { color: Colors.primary }]}>{availableJuz}</Text>
              <Text style={styles.juzSummaryLabel}>Boş</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Cüz Tablosu</Text>
          <View style={styles.juzGrid}>
            {juzAssignments.map((juz: any) => (
              <JuzCell
                key={juz.juz_number}
                juz={juz}
                isSelected={selectedJuz.includes(juz.juz_number)}
                onPress={() => handleJuzToggle(juz.juz_number)}
              />
            ))}
          </View>

          {selectedJuz.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.selectBtn, pressed && { opacity: 0.9 }]}
              onPress={handleSelectJuz}
              disabled={isBusy}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.selectBtnGradient}
              >
                <Ionicons name={isBusy ? "ellipsis-horizontal" : "hand-left"} size={20} color="#FFFFFF" />
                <Text style={styles.selectBtnText}>{isBusy ? 'İşleniyor...' : `${selectedJuz.length} cüz seç`}</Text>
              </LinearGradient>
            </Pressable>
          )}

          {juzAssignments.filter((j: any) => j.status === 'in_progress').length > 0 && (
            <View style={styles.myJuzSection}>
              <Text style={styles.sectionTitle}>Alınan Cüzler</Text>
              {juzAssignments
                .filter((j: any) => j.status === 'in_progress')
                .map((j: any) => {
                  const isMyJuz = j.user_id === profile?.id;
                  const canManage = isMyJuz || userRole === 'admin' || userRole === 'creator';

                  return (
                    <View key={j.juz_number} style={styles.myJuzRow}>
                      <View style={styles.myJuzInfo}>
                        <Text style={styles.myJuzNumber}>{j.juz_number}. Cüz</Text>
                        <Text style={styles.myJuzAssignee}>
                          {isMyJuz ? 'Siz' : (j.user?.full_name || 'İsimsiz')}
                        </Text>
                      </View>

                      {canManage ? (
                        <View style={styles.myJuzActions}>
                          <Pressable
                            style={styles.abandonBtn}
                            onPress={() => handleAbandonJuz(j.juz_number)}
                            disabled={isBusy}
                          >
                            <Ionicons name="close-circle-outline" size={26} color={Colors.error} />
                          </Pressable>

                          <Pressable
                            style={styles.readBtn}
                            onPress={() => {
                              setReadingJuz(j.juz_number);
                              setReaderVisible(true);
                            }}
                          >
                            <Ionicons name="book-outline" size={20} color={Colors.primary} />
                            <Text style={styles.readBtnText}>Oku</Text>
                          </Pressable>

                          <Pressable
                            style={styles.completeBtn}
                            onPress={() => handleCompleteJuz(j.juz_number)}
                            disabled={isBusy}
                          >
                            <Ionicons
                              name={isBusy ? "ellipsis-horizontal" : "checkmark-circle"}
                              size={26}
                              color={Colors.success}
                            />
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.otherUserStatus}>
                          <Text style={styles.otherUserStatusText}>Okunuyor...</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          )}
        </>
      )}

      {(group.type === 'salavat' || group.type === 'yasin') && (
        <SalavatCounter group={group} groupId={id || ''} onAdd={handleAddSalavat} />
      )}

      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Üyeler ({group.total_members || members.length})</Text>
        {members.map((member: any) => (
          <View key={member.id} style={styles.memberRow}>
            <LinearGradient
              colors={member.role === 'creator' ? [Colors.accent, Colors.accentLight] : [Colors.primaryLight, Colors.primary]}
              style={styles.memberAvatar}
            >
              <Text style={styles.memberAvatarText}>{(member.user?.full_name || '?').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.user?.full_name || 'İsimsiz Üye'}</Text>
              <Text style={styles.memberRole}>
                {member.role === 'creator' ? 'Kurucu' : member.role === 'admin' ? 'Yönetici' : 'Üye'}
              </Text>
            </View>
          </View>
        ))}
        {group.total_members > members.length && (
          <View style={styles.memberRow}>
            <LinearGradient
              colors={[Colors.backgroundSecondary, Colors.backgroundSecondary]}
              style={[styles.memberAvatar, { alignItems: 'center', justifyContent: 'center' }]}
            >
              <Text style={[styles.memberAvatarText, { color: Colors.textSecondary, fontSize: 12 }]}>+{group.total_members - members.length}</Text>
            </LinearGradient>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: Colors.textSecondary }]}>Diğer üyeler...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Davet Butonu - Zincirleme büyüme için */}
      <View style={styles.inviteSection}>
        <Pressable
          style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.9 }]}
          onPress={handleShareInvite}
        >
          <LinearGradient
            colors={[Colors.card, Colors.card]}
            style={styles.inviteBtnGradient}
          >
            <View style={styles.inviteIconBox}>
              <Ionicons name="person-add" size={20} color={Colors.primary} />
            </View>
            <View style={styles.inviteInfo}>
              <Text style={styles.inviteTitle}>Arkadaşlarını Davet Et</Text>
              <Text style={styles.inviteSubtitle}>Grubu büyüt, daha çok sevap kazan</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </LinearGradient>
        </Pressable>
      </View>

      <View style={{ height: Math.max(insets.bottom + 32, 80) }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.title}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShareInvite} style={styles.headerActionBtn}>
            <Ionicons name="share-social-outline" size={22} color={Colors.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.headerActionBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'status' && styles.tabBtnActive]}
              onPress={() => setActiveTab('status')}
            >
              <Text style={[styles.tabText, activeTab === 'status' && styles.tabTextActive]}>Durum</Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'activity' && styles.tabBtnActive]}
              onPress={() => setActiveTab('activity')}
            >
              <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Aktivite</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {activeTab === 'status' && renderStatus()}

          {activeTab === 'activity' && <ActivityFeed groupId={id || ''} userRole={userRole} />}
        </View>
      </KeyboardAvoidingView>

      {
        readingJuz && (
          <QuranReaderModal
            isVisible={readerVisible}
            onClose={() => setReaderVisible(false)}
            juzNumber={readingJuz}
            onComplete={() => handleCompleteJuz(readingJuz, true)}
          />
        )
      }
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tabsContainer: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.card,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 18,
  },
  heroTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroIntention: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    paddingVertical: 18,
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 18,
    gap: 10,
  },
  completedBannerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  juzSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  juzSummaryItem: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  juzSummaryValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 22,
  },
  juzSummaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  juzGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },

  selectBtn: {
    marginBottom: 24,
  },
  selectBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  selectBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  myJuzSection: {
    marginBottom: 24,
  },
  myJuzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  myJuzInfo: {
    flex: 1,
  },
  myJuzNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  myJuzAssignee: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  myJuzActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  readBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  completeBtn: {
    padding: 4,
  },

  abandonBtn: {
    padding: 8,
    backgroundColor: Colors.error + '15',
    borderRadius: 12,
  },
  otherUserStatus: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
  },
  otherUserStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },

  membersSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },
  memberName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  memberRole: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  inviteBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    backgroundColor: Colors.card,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inviteBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  inviteIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  inviteSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
