import { supabase, Tables, InsertTables, UpdateTables } from './supabase';

// Type aliases
export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;
export type JuzAssignment = Tables<'juz_assignments'>;
export type Activity = Tables<'activities'>;
export type Contribution = Tables<'contributions'>;

export type Reaction = Tables<'reactions'>;
export type Notification = Tables<'notifications'>;
export type Counter = Tables<'counters'>;



export type ActivityWithUser = Activity & {
    user: {
        id: string;
        full_name: string;
        profile_photo: string | null;
    } | null;
    reactions?: Reaction[];
};

// ============================================
// GROUPS SERVICE
// ============================================
export const groupsService = {
    // Tüm grupları getir (kullanıcının üye olduğu) - OPTİMİZE EDİLDİ
    async getMyGroups(userId: string) {
        const { data, error } = await supabase
            .from('group_members')
            .select(`
                group:groups(*)
            `)
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) throw error;
        return (data?.map((item: any) => item.group).filter(Boolean) ?? []) as unknown as Group[];
    },

    // Public grupları getir
    async getPublicGroups(limit = 20, offset = 0) {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('privacy', 'public')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data as Group[];
    },

    // Grup detayını getir
    async getGroup(groupId: string) {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .maybeSingle();

        if (error) throw error;
        return data as Group;
    },

    // Grup detaylarını getir - HİBRİT OPTİMİZASYON
    // Küçük özel gruplar: Tüm üyeleri çek (aile/arkadaş grupları)
    // Büyük veya açık gruplar: Sadece current user'ı çek (performans)
    async getGroupDetail(groupId: string, currentUserId?: string) {
        // Önce grup bilgisini çek (privacy ve total_members kontrol için)
        const { data: groupInfo, error: infoError } = await supabase
            .from('groups')
            .select('privacy, total_members')
            .eq('id', groupId)
            .single();

        if (infoError) throw infoError;

        const isSmallPrivateGroup = groupInfo.privacy === 'private' && (groupInfo.total_members || 0) <= 30;

        let query;

        if (isSmallPrivateGroup) {
            // Küçük özel grup: Tüm üyeleri çek (max 30 kişi zaten)
            query = supabase
                .from('groups')
                .select(`
                    *,
                    members:group_members(*, user:users(id, full_name, profile_photo)),
                    juz_assignments(*, user:users(id, full_name, profile_photo))
                `)
                .eq('id', groupId)
                .eq('members.status', 'active')
                .single();
        } else if (currentUserId) {
            // Büyük veya açık grup: Sadece current user'ın üyeliğini çek
            query = supabase
                .from('groups')
                .select(`
                    *,
                    members:group_members(role, status, user_id),
                    juz_assignments(*, user:users(id, full_name, profile_photo))
                `)
                .eq('id', groupId)
                .eq('members.user_id', currentUserId)
                .single();
        } else {
            // Giriş yapılmamış: Sadece grup bilgisi
            query = supabase
                .from('groups')
                .select(`
                    *,
                    juz_assignments(*, user:users(id, full_name, profile_photo))
                `)
                .eq('id', groupId)
                .single();
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // Davet kodu ile grup bul
    async getGroupByInviteCode(inviteCode: string) {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('invite_code', inviteCode)
            .single();

        if (error) throw error;
        return data as Group;
    },

    // Grup oluştur
    async createGroup(groupData: InsertTables<'groups'>) {
        // 1. Grubu oluştur (Bu adım zorunlu ve diğerlerinin ön koşulu)
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
                ...groupData,
                current_count: 0,
                total_members: 1,
                completed_percentage: 0,
                status: groupData.status || 'active'
            })
            .select()
            .single();

        if (groupError) throw groupError;

        // 2. Kritik Adım: Oluşturan kişiyi üye olarak ekle
        // Upsert kullanarak olası 'duplicate key' hatalarını önle (trigger varsa)
        if (groupData.creator_id) {
            const { error: memberError } = await supabase.from('group_members').upsert({
                group_id: group.id,
                user_id: groupData.creator_id,
                role: 'creator',
                status: 'active',
            }, { onConflict: 'group_id,user_id' });

            if (memberError) {
                console.error('Error adding creator member:', memberError);
                throw memberError; // Throw error to ensure atomicity in UI
            }
        }

        // 3. Diğer işlemleri tamamen arka planda yürüt (UI thread'i bloklama)
        setTimeout(async () => {
            try {
                const tasks = [];

                // Task 1: Aktivite oluştur
                if (groupData.creator_id) {
                    tasks.push(activitiesService.create({
                        group_id: group.id,
                        user_id: groupData.creator_id,
                        type: 'member_joined',
                        data: { is_creator: true },
                        notes: null,
                    }));
                }

                // Task 2: Hatim grubu ise 30 cüzü oluştur
                if (group.type === 'hatim') {
                    // Batch insert - tek seferde 30 satır
                    const juzAssignments = Array.from({ length: 30 }, (_, i) => ({
                        group_id: group.id,
                        juz_number: i + 1,
                        status: 'pending' as const,
                    }));

                    tasks.push(
                        supabase
                            .from('juz_assignments')
                            .insert(juzAssignments)
                            .then(({ error }) => {
                                if (error) console.error('Error creating juz assignments:', error);
                            })
                    );
                }

                await Promise.all(tasks);
            } catch (err) {
                console.error('Background tasks error:', err);
            }
        }, 0);

        return group as Group;
    },

    // Grup güncelle
    async updateGroup(groupId: string, updates: UpdateTables<'groups'>) {
        const { data, error } = await supabase
            .from('groups')
            .update(updates)
            .eq('id', groupId)
            .select()
            .single();

        if (error) throw error;
        return data as Group;
    },

    // Grup sil
    async deleteGroup(groupId: string) {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (error) throw error;
    },

    // Gruba katıl
    async joinGroup(groupId: string, userId: string) {
        const { data, error } = await supabase
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: userId,
                role: 'member',
                status: 'active',
            })
            .select()
            .single();

        if (error) throw error;

        // Aktivite kaydı oluştur
        await activitiesService.create({
            group_id: groupId,
            user_id: userId,
            type: 'member_joined',
            data: {},
            notes: null,
        });

        return data as GroupMember;
    },

    // Gruptan ayrıl
    async leaveGroup(groupId: string, userId: string) {
        const { error } = await supabase
            .from('group_members')
            .update({ status: 'left', left_at: new Date().toISOString() })
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    // Grup üyelerini getir
    async getMembers(groupId: string) {
        const { data, error } = await supabase
            .from('group_members')
            .select(`
        *,
        user:users(id, full_name, profile_photo)
      `)
            .eq('group_id', groupId)
            .eq('status', 'active');

        if (error) throw error;
        return data;
    },

    // Salavat/Yasin sayısını artır
    async incrementCount(groupId: string, count: number, userId: string) {
        // Grup sayısını güncelle
        const { data: group } = await supabase
            .from('groups')
            .select('current_count')
            .eq('id', groupId)
            .single();

        const newCount = (group?.current_count || 0) + count;

        await supabase
            .from('groups')
            .update({ current_count: newCount })
            .eq('id', groupId);

        // Kullanıcı katkısını güncelle
        await supabase.from('contributions').upsert({
            group_id: groupId,
            user_id: userId,
            count: count,
        }, {
            onConflict: 'group_id,user_id',
        });

        return newCount;
    },
};

// ============================================
// JUZ ASSIGNMENTS SERVICE
// ============================================
export const juzService = {
    // Gruptaki cüzleri getir
    async getJuzAssignments(groupId: string) {
        const { data, error } = await supabase
            .from('juz_assignments')
            .select(`
        *,
        user:users(id, full_name, profile_photo)
      `)
            .eq('group_id', groupId)
            .order('juz_number', { ascending: true });

        if (error) throw error;
        return data;
    },

    // Cüz al
    async assignJuz(juzId: string, userId: string) {
        const { data, error } = await supabase
            .from('juz_assignments')
            .update({
                user_id: userId,
                status: 'in_progress',
                assigned_at: new Date().toISOString(),
            })
            .eq('id', juzId)
            .is('user_id', null) // Sadece boş olanları al
            .select()
            .single();

        if (error) throw error;
        return data as JuzAssignment;
    },

    // Birden fazla cüz al
    async assignMultipleJuz(groupId: string, juzNumbers: number[], userId: string) {
        const { data, error } = await supabase
            .from('juz_assignments')
            .update({
                user_id: userId,
                status: 'in_progress',
                assigned_at: new Date().toISOString(),
            })
            .eq('group_id', groupId)
            .in('juz_number', juzNumbers)
            .is('user_id', null)
            .select();

        if (error) throw error;
        return data as JuzAssignment[];
    },

    // Cüz tamamla
    async completeJuz(juzId: string, userId: string, notes?: string) {
        const { data, error } = await supabase
            .from('juz_assignments')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                notes,
            })
            .eq('id', juzId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        // Aktivite oluştur
        await activitiesService.create({
            group_id: data.group_id,
            user_id: userId,
            type: 'juz_complete',
            data: { juz_number: data.juz_number },
            notes: notes ?? null,
        });

        return data as JuzAssignment;
    },

    // Cüz bırak
    async abandonJuz(juzId: string, userId: string) {
        const { data, error } = await supabase
            .from('juz_assignments')
            .update({
                status: 'abandoned',
                user_id: null,
            })
            .eq('id', juzId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as JuzAssignment;
    },

    // Kullanıcının aldığı cüzleri getir
    async getUserJuz(groupId: string, userId: string) {
        const { data, error } = await supabase
            .from('juz_assignments')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;
        return data as JuzAssignment[];
    },
};

// ============================================
// ACTIVITIES SERVICE
// ============================================
export const activitiesService = {
    // Grup aktivitelerini getir
    async getGroupActivities(groupId: string, limit = 50) {
        const { data, error } = await supabase
            .from('activities')
            .select(`
        *,
        user:users(id, full_name, profile_photo),
        reactions(*)
      `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data as ActivityWithUser[];
    },

    // Aktivite oluştur
    async create(activity: InsertTables<'activities'>) {
        const { data, error } = await supabase
            .from('activities')
            .insert(activity)
            .select()
            .single();

        if (error) throw error;
        return data as Activity;
    },

    // Reaksiyon ekle
    async addReaction(activityId: string, userId: string, emoji: string) {
        const { data, error } = await supabase
            .from('reactions')
            .upsert({
                activity_id: activityId,
                user_id: userId,
                emoji,
            })
            .select()
            .single();

        if (error) throw error;
        return data as Reaction;
    },

    // Reaksiyon sil
    async removeReaction(activityId: string, userId: string) {
        const { error } = await supabase
            .from('reactions')
            .delete()
            .eq('activity_id', activityId)
            .eq('user_id', userId);

        if (error) throw error;
    },
};



// ============================================
// NOTIFICATIONS SERVICE
// ============================================
export const notificationsService = {
    // Kullanıcı bildirimlerini getir
    async get(userId: string, limit = 50) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data as Notification[];
    },

    // Okunmamış sayısı
    async getUnreadCount(userId: string) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
        return count || 0;
    },

    // Okundu işaretle
    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (error) throw error;
    },

    // Tümünü okundu işaretle
    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
    },
};

// ============================================
// COUNTER SERVICE (Personal Tesbih)
// ============================================
export const counterService = {
    // Sayacı getir
    async get(userId: string) {
        const { data, error } = await supabase
            .from('counters')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as Counter | null;
    },

    // Sayacı güncelle veya oluştur
    async upsert(userId: string, value: number, target: number) {
        const { data, error } = await supabase
            .from('counters')
            .upsert({
                user_id: userId,
                value,
                target,
            })
            .select()
            .single();

        if (error) throw error;
        return data as Counter;
    },

    // Sayacı artır
    async increment(userId: string) {
        const current = await this.get(userId);
        const newValue = (current?.value || 0) + 1;
        return this.upsert(userId, newValue, current?.target || 33);
    },

    // Sayacı sıfırla
    async reset(userId: string) {
        const current = await this.get(userId);
        return this.upsert(userId, 0, current?.target || 33);
    },
};

// ============================================
// REALTIME SUBSCRIPTIONS - OPTİMİZE
// Tek kanal ile birden fazla tablo dinlenir (Connection Pooling)
// ============================================

// Aktif kanalları takip et (Memory leak önleme)
const activeChannels: Map<string, ReturnType<typeof supabase.channel>> = new Map();

export const realtimeService = {
    /**
     * Grup için TÜM değişiklikleri tek kanal ile dinle
     * (groups, juz_assignments, activities hepsi tek bağlantıda)
     */
    subscribeToGroupAll(
        groupId: string,
        callbacks: {
            onGroupChange?: (payload: any) => void;
            onJuzChange?: (payload: any) => void;
            onActivityChange?: (payload: any) => void;
        }
    ) {
        const channelKey = `group-all:${groupId}`;

        // Zaten varsa mevcut kanalı döndür
        if (activeChannels.has(channelKey)) {
            console.log(`[Realtime] Kanal zaten aktif: ${channelKey}`);
            return activeChannels.get(channelKey)!;
        }

        const channel = supabase.channel(channelKey);

        // Grup değişiklikleri
        if (callbacks.onGroupChange) {
            channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
                callbacks.onGroupChange
            );
        }

        // Cüz değişiklikleri
        if (callbacks.onJuzChange) {
            channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'juz_assignments', filter: `group_id=eq.${groupId}` },
                callbacks.onJuzChange
            );
        }

        // Aktivite değişiklikleri
        if (callbacks.onActivityChange) {
            channel.on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activities', filter: `group_id=eq.${groupId}` },
                callbacks.onActivityChange
            );
        }

        const subscription = channel.subscribe();
        activeChannels.set(channelKey, subscription);

        console.log(`[Realtime] Yeni kanal açıldı: ${channelKey}`);
        return subscription;
    },

    // Legacy: Sadece grup değişikliklerini dinle
    subscribeToGroup(groupId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`group:${groupId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
                callback
            )
            .subscribe();
    },

    // Legacy: Cüz değişikliklerini dinle
    subscribeToJuzAssignments(groupId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`juz:${groupId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'juz_assignments', filter: `group_id=eq.${groupId}` },
                callback
            )
            .subscribe();
    },

    // Legacy: Aktiviteleri dinle
    subscribeToActivities(groupId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`activities:${groupId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activities', filter: `group_id=eq.${groupId}` },
                callback
            )
            .subscribe();
    },

    // Subscription'ı kapat
    unsubscribe(channel: any) {
        supabase.removeChannel(channel);
    },

    // Tüm kanalları kapat (cleanup)
    unsubscribeAll() {
        activeChannels.forEach((channel, key) => {
            supabase.removeChannel(channel);
            console.log(`[Realtime] Kanal kapatıldı: ${key}`);
        });
        activeChannels.clear();
    },

    // Aktif kanal sayısını al (debug için)
    getActiveChannelCount(): number {
        return activeChannels.size;
    }
};

