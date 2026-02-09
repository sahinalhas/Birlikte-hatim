import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

function getBadges(stats: any): BadgeInfo[] {
  return [
    {
      id: 'first_hatim',
      name: 'İlk Hatim',
      description: 'İlk hatminizi tamamlayın',
      icon: 'star',
      color: '#FFD700',
      unlocked: stats.totalHatims >= 1,
    },
    {
      id: 'salavat_100',
      name: '100 Salavat',
      description: '100 salavat okuyun',
      icon: 'heart',
      color: '#E91E63',
      unlocked: stats.totalSalavat >= 100,
    },
    {
      id: 'group_creator',
      name: 'Topluluk Kurucusu',
      description: '3 grup oluşturun',
      icon: 'people',
      color: '#2196F3',
      unlocked: stats.totalGroupsCreated >= 3,
    },
    {
      id: 'active_member',
      name: 'Aktif Üye',
      description: '5 gruba katılın',
      icon: 'ribbon',
      color: '#9C27B0',
      unlocked: stats.totalGroupsJoined >= 5,
    },
    {
      id: 'salavat_1000',
      name: 'Salavat Kahramanı',
      description: '1000 salavat okuyun',
      icon: 'trophy',
      color: '#FF9800',
      unlocked: stats.totalSalavat >= 1000,
    },
    {
      id: 'hatim_5',
      name: 'Hatim Ustası',
      description: '5 hatim tamamlayın',
      icon: 'medal',
      color: '#4CAF50',
      unlocked: stats.totalHatims >= 5,
    },
  ];
}

function BadgeCard({ badge }: { badge: BadgeInfo }) {
  return (
    <View style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}>
      <View style={[styles.badgeIcon, { backgroundColor: badge.unlocked ? badge.color + '20' : Colors.backgroundSecondary }]}>
        <Ionicons
          name={badge.icon as any}
          size={24}
          color={badge.unlocked ? badge.color : Colors.textTertiary}
        />
      </View>
      <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>{badge.name}</Text>
      <Text style={styles.badgeDesc}>{badge.description}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, refreshProfile, isLoadingProfile } = useApp();
  const { signOut, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  // Update local state when profile changes
  React.useEffect(() => {
    if (profile?.full_name) {
      setEditName(profile.full_name);
    }
  }, [profile]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  // Loading state
  if (isLoadingProfile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="wifi-off" size={64} color={Colors.textTertiary} style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>Profil yüklenemedi.</Text>
        <Text style={styles.errorSubText}>Lütfen internet bağlantınızı kontrol edin.</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            refreshProfile().catch(() => {
              Alert.alert('Hata', 'İnternet bağlantınızı kontrol edip tekrar deneyin.');
            });
          }}
        >
          <Text style={styles.retryButtonText}>Yeniden Dene</Text>
        </Pressable>
      </View>
    );
  }

  // Create stats object from profile data (mapping snake_case to camelCase)
  const stats = {
    totalHatims: profile.total_hatims || 0,
    totalSalavat: profile.total_salawat || 0,
    totalYasin: 0, // Not currently in DB schema
    totalGroupsCreated: profile.total_groups_created || 0,
    totalGroupsJoined: profile.total_groups_joined || 0,
  };

  const badges = getBadges(stats);
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const handleSave = async () => {
    if (editName.trim().length < 2) {
      Alert.alert('Hata', 'İsim en az 2 karakter olmalıdır.');
      return;
    }
    const { error } = await updateProfile({ full_name: editName.trim() });
    if (error) {
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
      return;
    }
    setIsEditing(false);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?');
      if (confirmed) {
        signOut();
      }
    } else {
      Alert.alert(
        'Çıkış Yap',
        'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Profil</Text>
        </View>

        <View style={styles.profileCard}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {profile.full_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </LinearGradient>

          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Adınızı girin"
                autoFocus
              />
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Ionicons name="checkmark" size={22} color={Colors.primary} />
              </Pressable>
              <Pressable onPress={() => { setIsEditing(false); setEditName(profile.full_name); }} style={styles.cancelBtn}>
                <Ionicons name="close" size={22} color={Colors.error} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.full_name}</Text>
                <Pressable onPress={() => setIsEditing(true)}>
                  <Ionicons name="pencil" size={18} color={Colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.memberTag}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.memberText}>Aktif Üye</Text>
              </View>
              {user?.email && (
                <Text style={styles.profileEmail}>{user.email}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsGridItem}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color={Colors.primary} />
            <Text style={styles.statsGridValue}>{stats.totalHatims}</Text>
            <Text style={styles.statsGridLabel}>Hatim</Text>
          </View>
          <View style={styles.statsGridItem}>
            <MaterialCommunityIcons name="heart-multiple" size={24} color={Colors.accent} />
            <Text style={styles.statsGridValue}>{stats.totalSalavat}</Text>
            <Text style={styles.statsGridLabel}>Salavat</Text>
          </View>
          <View style={styles.statsGridItem}>
            <Ionicons name="book" size={24} color={Colors.primaryLight} />
            <Text style={styles.statsGridValue}>{stats.totalYasin}</Text>
            <Text style={styles.statsGridLabel}>Yasin</Text>
          </View>
          <View style={styles.statsGridItem}>
            <Ionicons name="people" size={24} color={Colors.warning} />
            <Text style={styles.statsGridValue}>{stats.totalGroupsCreated + stats.totalGroupsJoined}</Text>
            <Text style={styles.statsGridLabel}>Toplam Grup</Text>
          </View>
        </View>

        <View style={styles.badgesSection}>
          <View style={styles.badgesSectionHeader}>
            <Text style={styles.sectionTitle}>Rozetler</Text>
            <Text style={styles.badgeCount}>{unlockedCount}/{badges.length}</Text>
          </View>
          <View style={styles.badgesGrid}>
            {badges.map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutAction,
            pressed && styles.logoutActionPressed
          ]}
        >
          <Ionicons name="log-out" size={22} color={Colors.error} />
          <Text style={styles.logoutActionText}>Güvenli Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.text,
  },
  logoutAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '10',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.error + '20',
    gap: 10,
  },
  logoutActionPressed: {
    backgroundColor: Colors.error + '20',
    opacity: 0.9,
  },
  logoutActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.error,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: '#FFFFFF',
  },
  nameContainer: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  profileName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  profileEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  memberText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  saveBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statsGridItem: {
    width: '47%' as any,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 6,
    flexGrow: 1,
  },
  statsGridValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  statsGridLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badgesSection: {
    marginBottom: 20,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  badgeCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '30%' as any,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexGrow: 1,
    gap: 6,
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: Colors.textTertiary,
  },
  badgeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  errorSubText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
