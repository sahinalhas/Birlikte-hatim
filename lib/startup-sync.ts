import { counterStorage } from './counter-storage';
import { supabase } from './supabase';

/**
 * Uygulama açılışında bekleyen verileri senkronize eder
 * Bu servis, kullanıcı uygulamayı kapatıp açtığında veri kaybını önler
 */
export const startupSyncService = {
    /**
     * Bekleyen tüm salavat/zikir verilerini sunucuya gönder
     */
    async syncPendingCounts(userId: string): Promise<{
        synced: number;
        failed: number;
    }> {
        let synced = 0;
        let failed = 0;

        try {
            const pendingItems = await counterStorage.getAllPendingForSync();

            if (pendingItems.length === 0) {
                console.log('[StartupSync] Bekleyen veri yok');
                return { synced: 0, failed: 0 };
            }

            console.log(`[StartupSync] ${pendingItems.length} grup için veri gönderiliyor...`);

            for (const item of pendingItems) {
                try {
                    // Tek RPC ile atomik güncelleme
                    const { error } = await supabase.rpc('add_salavat', {
                        p_group_id: item.groupId,
                        p_user_id: userId,
                        p_count: item.count
                    });

                    if (error) {
                        // RPC yoksa fallback
                        console.warn('[StartupSync] RPC hatası, fallback:', error.message);

                        // Manuel güncelleme yap
                        const { data: group } = await supabase
                            .from('groups')
                            .select('current_count')
                            .eq('id', item.groupId)
                            .single();

                        await supabase
                            .from('groups')
                            .update({ current_count: (group?.current_count || 0) + item.count })
                            .eq('id', item.groupId);

                        const { data: contribution } = await supabase
                            .from('contributions')
                            .select('count')
                            .eq('group_id', item.groupId)
                            .eq('user_id', userId)
                            .single();

                        await supabase
                            .from('contributions')
                            .upsert({
                                group_id: item.groupId,
                                user_id: userId,
                                count: (contribution?.count || 0) + item.count,
                                last_updated: new Date().toISOString(),
                            }, { onConflict: 'group_id,user_id' });
                    }

                    // Başarılı - yerel veriyi temizle
                    await counterStorage.clearPendingCount(item.groupId);
                    await counterStorage.setLastSyncTime(item.groupId);
                    synced++;

                    console.log(`[StartupSync] ✓ Grup ${item.groupId}: ${item.count} adet gönderildi`);
                } catch (itemError) {
                    console.error(`[StartupSync] ✗ Grup ${item.groupId} hatası:`, itemError);
                    failed++;
                }
            }

            console.log(`[StartupSync] Tamamlandı: ${synced} başarılı, ${failed} başarısız`);
        } catch (error) {
            console.error('[StartupSync] Genel hata:', error);
        }

        return { synced, failed };
    },

    /**
     * Cache'i başlat (uygulama açılışında çağrılmalı)
     */
    async initialize(): Promise<void> {
        await counterStorage.initCache();
        console.log('[StartupSync] Cache yüklendi');
    }
};

export default startupSyncService;
