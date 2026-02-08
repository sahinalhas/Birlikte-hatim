import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp, Group } from '@/contexts/AppContext';

type FilterType = 'all' | 'hatim' | 'salavat' | 'yasin';

function getGroupIcon(type: string) {
  switch (type) {
    case 'hatim': return 'book-open-variant';
    case 'salavat': return 'heart-multiple';
    case 'yasin': return 'book-open-page-variant';
    default: return 'book-open-variant';
  }
}

function getGroupLabel(type: string) {
  switch (type) {
    case 'hatim': return 'Hatim';
    case 'salavat': return 'Salavat';
    case 'yasin': return 'Yasin';
    default: return type;
  }
}

function getProgress(group: Group): number {
  if (group.type === 'hatim') {
    const assignments = (group as any).juzAssignments || [];
    const completed = assignments.filter((j: any) => j.status === 'completed').length;
    return completed / 30;
  }
  const target = (group as any).targetCount || (group as any).target_count;
  if (target && target > 0) {
    return Math.min(((group as any).currentCount || 0) / target, 1);
  }
  return 0;
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

function PublicGroupCard({ group, onJoin, isJoined }: { group: Group; onJoin: () => void; isJoined: boolean }) {
  const progress = getProgress(group);
  // Optional chaining or default to current date if endDate is missing (though it shouldn't be for active groups)
  const daysLeft = getDaysRemaining((group as any).endDate || new Date().toISOString());

  return (
    <View style={styles.publicCard}>
      <View style={styles.publicCardHeader}>
        <View style={[styles.typeIconLarge, { backgroundColor: group.type === 'hatim' ? Colors.primary + '12' : group.type === 'salavat' ? Colors.accent + '15' : Colors.primaryLight + '12' }]}>
          <MaterialCommunityIcons
            name={getGroupIcon(group.type) as any}
            size={28}
            color={group.type === 'salavat' ? Colors.accent : Colors.primary}
          />
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{getGroupLabel(group.type)}</Text>
        </View>
      </View>

      <Text style={styles.publicCardTitle}>{group.title}</Text>
      <Text style={styles.publicCardIntention}>{group.intention}</Text>

      <View style={styles.publicStats}>
        <View style={styles.publicStatItem}>
          <Ionicons name="people" size={16} color={Colors.textSecondary} />
          <Text style={styles.publicStatText}>{(group as any).total_members || 0} üye</Text>
        </View>
        <View style={styles.publicStatItem}>
          <Ionicons name="time" size={16} color={Colors.textSecondary} />
          <Text style={styles.publicStatText}>{daysLeft} gün kaldı</Text>
        </View>
      </View>

      <View style={styles.publicProgress}>
        <View style={styles.publicProgressBarBg}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.publicProgressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.publicProgressText}>
          {group.type === 'hatim'
            ? `${((group as any).juzAssignments || []).filter((j: any) => j.status === 'completed').length}/30 cüz`
            : `${((group as any).currentCount || 0).toLocaleString()}/${((group as any).targetCount || (group as any).target_count || 0).toLocaleString()}`
          }
        </Text>
      </View>

      <Pressable
        style={({ pressed }: { pressed: boolean }) => [
          styles.joinButton,
          isJoined && styles.joinedButton,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onJoin}
        disabled={isJoined}
      >
        {isJoined ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={[styles.joinButtonText, styles.joinedButtonText]}>Katıldınız</Text>
          </>
        ) : (
          <>
            <Ionicons name="add" size={18} color={Colors.textOnPrimary} />
            <Text style={styles.joinButtonText}>Gruba Katıl</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { publicGroups, groups, joinGroup } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  // Filtre ve arama
  let filteredGroups = filter === 'all'
    ? publicGroups
    : publicGroups.filter(g => g.type === filter);

  // Arama sorgusu varsa filtrele
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredGroups = filteredGroups.filter(g =>
      g.title.toLowerCase().includes(query) ||
      (g.intention && g.intention.toLowerCase().includes(query))
    );
  }

  const handleJoin = async (groupId: string) => {
    const isJoined = groups.some(g => g.id === groupId);
    if (isJoined) return;
    try {
      await joinGroup(groupId);
      Alert.alert('Başarılı', 'Gruba başarıyla katıldınız!');
    } catch (e) {
      Alert.alert('Hata', 'Bir sorun olustu.');
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tümünü Gör' },
    { key: 'hatim', label: 'Hatim' },
    { key: 'salavat', label: 'Salavat' },
    { key: 'yasin', label: 'Yasin' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.pageTitle}>Keşfet</Text>
        <Text style={styles.pageSubtitle}>Herkese açık gruplara göz atın</Text>

        {/* Arama Kutusu */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Grup ara..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(f => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredGroups.map(group => (
          <PublicGroupCard
            key={group.id}
            group={group}
            onJoin={() => handleJoin(group.id)}
            isJoined={groups.some(g => g.id === group.id)}
          />
        ))}

        {filteredGroups.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Bu kategoride grup bulunamadı'}
            </Text>
          </View>
        )}
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
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.text,
  },
  clearButton: {
    padding: 4,
  },
  filterRow: {
    marginBottom: 24,
  },
  filterContent: {
    gap: 10,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  filterChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textOnPrimary,
  },
  publicCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  publicCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  typeIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  publicCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  publicCardIntention: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  publicStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  publicStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicStatText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  publicProgress: {
    marginBottom: 20,
  },
  publicProgressBarBg: {
    height: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  publicProgressFill: {
    height: 10,
    borderRadius: 5,
  },
  publicProgressText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.text,
    textAlign: 'right',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  joinedButton: {
    backgroundColor: Colors.success + '15',
    elevation: 0,
    shadowOpacity: 0,
  },
  joinButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.textOnPrimary,
  },
  joinedButtonText: {
    color: Colors.success,
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
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.textTertiary,
  },
});
