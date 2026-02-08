import AsyncStorage from '@react-native-async-storage/async-storage';

// Eşik değerleri
export const SYNC_THRESHOLDS = {
    autoSync: 999999,    // Otomatik sync devre dışı (Sadece çıkışta)
    hapticFeedback: 33,  // Her 33'te haptic feedback devam etsin
    maxPending: 10000,   // Maksimum yerel biriktirme
};

// Pending counts type
interface PendingCount {
    groupId: string;
    count: number;
    lastUpdated: number;
}

// Storage keys
const KEYS = {
    pendingCounts: '@counter_pending_counts',
    lastSyncTime: '@counter_last_sync_time',
};

// Cache for sync operations
let pendingCountsCache: Record<string, PendingCount> | null = null;

/**
 * Yerel sayaç depolama servisi
 * Her tıklamada sunucuya gitmek yerine yerel depolar ve toplu gönderir
 */
export const counterStorage = {
    /**
     * Bekleyen tüm sayıları getir (async)
     */
    async getPendingCounts(): Promise<Record<string, PendingCount>> {
        if (pendingCountsCache !== null) {
            return pendingCountsCache;
        }
        try {
            const data = await AsyncStorage.getItem(KEYS.pendingCounts);
            if (!data) return {};
            pendingCountsCache = JSON.parse(data);
            return pendingCountsCache || {};
        } catch {
            return {};
        }
    },

    /**
     * Bir grup için bekleyen sayıyı getir (sync - cache'den)
     */
    getPendingCountSync(groupId: string): number {
        if (!pendingCountsCache) return 0;
        return pendingCountsCache[groupId]?.count || 0;
    },

    /**
     * Sayacı artır ve kaydet (sync işlem)
     * @returns Güncel yerel toplam ve sync gerekip gerekmediği
     */
    async increment(groupId: string, amount: number = 1): Promise<{
        localCount: number;
        shouldSync: boolean;
        shouldHaptic: boolean;
    }> {
        const counts = await this.getPendingCounts();
        const current = counts[groupId]?.count || 0;
        const newCount = current + amount;

        counts[groupId] = {
            groupId,
            count: newCount,
            lastUpdated: Date.now(),
        };

        pendingCountsCache = counts;

        // Async kaydet ama beklemeyebiliriz (fire and forget)
        AsyncStorage.setItem(KEYS.pendingCounts, JSON.stringify(counts)).catch(console.error);

        return {
            localCount: newCount,
            shouldSync: newCount >= SYNC_THRESHOLDS.autoSync && newCount % SYNC_THRESHOLDS.autoSync === 0,
            shouldHaptic: newCount % SYNC_THRESHOLDS.hapticFeedback === 0,
        };
    },

    /**
     * Manuel ekleme (fiziksel tesbih kullananlar için)
     */
    async addManual(groupId: string, count: number): Promise<{ localCount: number; shouldSync: boolean }> {
        const result = await this.increment(groupId, count);
        // Manuel girişte her zaman sync et
        return { ...result, shouldSync: true };
    },

    /**
     * Sync sonrası sayacı sıfırla
     */
    async clearPendingCount(groupId: string): Promise<void> {
        const counts = await this.getPendingCounts();
        delete counts[groupId];
        pendingCountsCache = counts;
        await AsyncStorage.setItem(KEYS.pendingCounts, JSON.stringify(counts));
    },

    /**
     * Belirli miktar kadar azalt (kısmi sync için)
     */
    async reducePendingCount(groupId: string, amount: number): Promise<void> {
        const counts = await this.getPendingCounts();
        if (counts[groupId]) {
            counts[groupId].count = Math.max(0, counts[groupId].count - amount);
            if (counts[groupId].count === 0) {
                delete counts[groupId];
            }
            pendingCountsCache = counts;
            await AsyncStorage.setItem(KEYS.pendingCounts, JSON.stringify(counts));
        }
    },

    /**
     * Tüm bekleyen sayıları getir (app kapanırken sync için)
     */
    async getAllPendingForSync(): Promise<PendingCount[]> {
        const counts = await this.getPendingCounts();
        return Object.values(counts).filter(c => c.count > 0);
    },

    /**
     * Son sync zamanını kaydet
     */
    async setLastSyncTime(groupId: string): Promise<void> {
        try {
            const data = await AsyncStorage.getItem(KEYS.lastSyncTime);
            const times = data ? JSON.parse(data) : {};
            times[groupId] = Date.now();
            await AsyncStorage.setItem(KEYS.lastSyncTime, JSON.stringify(times));
        } catch (error) {
            console.error('Error saving last sync time:', error);
        }
    },

    /**
     * Son sync zamanlarını getir
     */
    async getLastSyncTimes(): Promise<Record<string, number>> {
        try {
            const data = await AsyncStorage.getItem(KEYS.lastSyncTime);
            if (!data) return {};
            return JSON.parse(data);
        } catch {
            return {};
        }
    },

    /**
     * Cache'i yükle (uygulama başlangıcında çağır)
     */
    async initCache(): Promise<void> {
        await this.getPendingCounts();
    },

    /**
     * Tüm verileri temizle (debug/test için)
     */
    async clearAll(): Promise<void> {
        pendingCountsCache = null;
        await AsyncStorage.multiRemove([KEYS.pendingCounts, KEYS.lastSyncTime]);
    },
};

export default counterStorage;
