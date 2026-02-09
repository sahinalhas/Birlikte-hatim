import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform,
    Dimensions,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import quranData from '@/assets/data/quran.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';

// Android için LayoutAnimation aktivasyonu
if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

interface Ayah {
    id: number;
    text: string;
    text_ar: string;
    surah_id?: number; // Veri yapısına göre opsiyonel olabilir
}

interface Surah {
    id: number;
    name: string;
    name_ar: string;
    ayahs: Ayah[];
}

// Flattened data type for FlatList
type ListItem =
    | { type: 'header'; data: { number: number; totalAyahs: number } }
    | { type: 'surah_header'; data: Surah }
    | { type: 'ayah'; data: Ayah; surah: Surah; index: number }
    | { type: 'footer'; data: { juzNumber: number } };

export default function QuranReaderScreen() {
    const { juz } = useLocalSearchParams<{ juz: string }>();
    const juzNumber = parseInt(juz || '1', 10);
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const [loading, setLoading] = useState(true);
    const [listData, setListData] = useState<ListItem[]>([]);
    const [lastReadAyahKey, setLastReadAyahKey] = useState<string | null>(null);
    const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);

    const topInset = Platform.OS === 'web' ? 67 : insets.top;

    useEffect(() => {
        if (juzNumber) {
            loadJuz();
            loadProgress();
        }
    }, [juzNumber]);

    // Otomatik Scroll: Veri ve son okunan yer hazır olduğunda o konuma git
    useEffect(() => {
        if (!loading && listData.length > 0 && lastReadAyahKey) {
            const index = listData.findIndex(item =>
                item.type === 'ayah' && `${item.surah.id}_${item.data.id}` === lastReadAyahKey
            );

            if (index !== -1) {
                // Biraz gecikme ile scroll yap ki liste render olsun
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.1 // Ayet ekranın üst kısmına yakın olsun
                    });
                }, 500);
            }
        }
    }, [loading, listData, lastReadAyahKey]);

    const loadJuz = () => {
        setLoading(true);
        // JSON verisini FlatList için düz bir listeye çeviriyoruz
        const foundJuz = (quranData as any[]).find((j: any) => j.juz === juzNumber);

        if (foundJuz) {
            const data: ListItem[] = [];
            let totalAyahCount = 0;

            // Cüz Başlığı
            data.push({
                type: 'header',
                data: { number: juzNumber, totalAyahs: 0 } // Sonra güncellenecek
            });

            foundJuz.surahs.forEach((surah: Surah) => {
                // Sure Başlığı
                data.push({ type: 'surah_header', data: surah });

                // Ayetler
                surah.ayahs.forEach((ayah, index) => {
                    data.push({
                        type: 'ayah',
                        data: ayah,
                        surah: surah,
                        index: index + 1
                    });
                    totalAyahCount++;
                });
            });

            // Footer
            data.push({ type: 'footer', data: { juzNumber } });

            // Toplam ayet sayısını güncelle (Header referansı ile değil, yeniden oluşturarak veya basitçe kabul ederek)
            // Header verisini güncellemek yerine, render sırasında hesaplanan değeri kullanabiliriz veya state'e atabiliriz.
            // Şimdilik basitçe ilk elemanı güncelleyelim:
            if (data.length > 0 && data[0].type === 'header') {
                data[0].data.totalAyahs = totalAyahCount;
            }

            setListData(data);
        }
        setLoading(false);
    };

    const loadProgress = async () => {
        try {
            const progress = await AsyncStorage.getItem(`progress_juz_${juzNumber}`);
            setLastReadAyahKey(progress);
        } catch (e) {
            console.error(e);
        }
    };

    const saveProgress = async (ayahKey: string) => {
        setLastReadAyahKey(ayahKey);
        try {
            await AsyncStorage.setItem(`progress_juz_${juzNumber}`, ayahKey);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleCard = (key: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCardKey(prev => prev === key ? null : key);
    };

    const handleComplete = () => {
        Alert.alert(
            'Cüzü Tamamla',
            'Allah kabul etsin! Cüzü bitirdin mi?',
            [
                { text: 'Okumaya Devam', style: 'cancel' },
                {
                    text: 'Bitirdim',
                    style: 'default',
                    onPress: () => {
                        router.back();
                        // Burada bir event fırlatılabilir veya dönüşte parametre geçilebilir
                        // Şimdilik kullanıcıya manuel işaretlemesi gerektiğini hatırlatıyoruz
                        setTimeout(() => {
                            Alert.alert('Hatırlatma', 'Lütfen listeden ilgili cüzü "Tamamlandı" olarak işaretlemeyi unutma.');
                        }, 500);
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ListItem }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.headerContainer}>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{item.data.number}</Text>
                    </View>
                    <Text style={styles.headerTitle}>Cüz</Text>
                    <Text style={styles.headerSubtitle}>{item.data.totalAyahs} Ayet</Text>
                    <View style={styles.divider} />
                </View>
            );
        }

        if (item.type === 'surah_header') {
            return (
                <View style={styles.surahHeaderContainer}>
                    <LinearGradient
                        colors={[Colors.primary + '10', Colors.primary + '05']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.surahHeaderContent}
                    >
                        <View style={styles.surahIconFrame}>
                            <Ionicons name="book" size={18} color={Colors.primary} />
                        </View>
                        <Text style={styles.surahName}>{item.data.name}</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.surahNameAr}>{item.data.name_ar}</Text>
                    </LinearGradient>
                </View>
            );
        }

        if (item.type === 'ayah') {
            const { data: ayah, surah } = item;
            const ayahKey = `${surah.id}_${ayah.id}`;
            const isLastRead = lastReadAyahKey === ayahKey;
            const isExpanded = expandedCardKey === ayahKey;

            return (
                <Pressable
                    style={[
                        styles.ayahCard,
                        isLastRead && styles.ayahCardLastRead,
                        isExpanded && styles.ayahCardExpanded
                    ]}
                    onPress={() => toggleCard(ayahKey)}
                    onLongPress={() => saveProgress(ayahKey)}
                    delayLongPress={300}
                >
                    {/* Üst Bilgi Çubuğu */}
                    <View style={styles.ayahMetaRow}>
                        <View style={[styles.ayahNumberBadge, isLastRead && styles.ayahNumberBadgeActive]}>
                            <Text style={[styles.ayahNumberText, isLastRead && styles.ayahNumberTextActive]}>
                                {ayah.id}
                            </Text>
                        </View>
                        {isLastRead && (
                            <View style={styles.lastReadLabel}>
                                <Ionicons name="bookmark" size={12} color="#FFFFFF" />
                                <Text style={styles.lastReadText}>Kaldığın Yer</Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }} />
                        <Ionicons
                            name={isExpanded ? "language" : "swap-horizontal"}
                            size={16}
                            color={Colors.textTertiary}
                        />
                    </View>

                    {/* İçerik Alanı */}
                    <View style={styles.ayahContent}>
                        {/* Arapça Metin - Her zaman görünür ama expanded modda biraz daha farklı durabilir */}
                        <Text style={[styles.ayahTextAr, isExpanded && { color: Colors.textSecondary, fontSize: 24 }]}>
                            {ayah.text_ar}
                        </Text>

                        {/* Türkçe Meal - Sadece expand olunca görünür */}
                        {isExpanded && (
                            <View style={styles.translationContainer}>
                                <View style={styles.translationDivider} />
                                <Text style={styles.ayahTextTr}>{ayah.text}</Text>
                            </View>
                        )}
                    </View>

                    {/* Alt İpucu (Sadece kapalıyken) */}
                    {!isExpanded && (
                        <Text style={styles.tapHint}>Meal için dokun • İşaretlemek için basılı tut</Text>
                    )}
                </Pressable>
            );
        }

        if (item.type === 'footer') {
            return (
                <View style={styles.footerContainer}>
                    <Pressable
                        style={({ pressed }) => [styles.finishBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                        onPress={handleComplete}
                    >
                        <LinearGradient
                            colors={[Colors.primary, Colors.primaryLight]}
                            style={styles.finishBtnGradient}
                        >
                            <Ionicons name="checkmark-done-circle" size={24} color="#FFFFFF" />
                            <Text style={styles.finishBtnText}>Cüzü Bitirdim</Text>
                        </LinearGradient>
                    </Pressable>

                    <Text style={styles.footerNote}>
                        Allah kabul etsin 🤲
                    </Text>
                    <View style={{ height: 120 }} />
                </View>
            );
        }

        return null;
    };

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={[styles.navHeader, { paddingTop: topInset + 10 }]}>
                <Pressable onPress={() => router.back()} style={styles.navBackBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </Pressable>
                <Text style={styles.navTitle}>{juzNumber}. Cüz Okuma</Text>
                <View style={styles.navBackBtn} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Cüz Hazırlanıyor...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => {
                        if (item.type === 'ayah') return `${item.surah.id}_${item.data.id}`;
                        return `${item.type}_${index}`;
                    }}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    onScrollToIndexFailed={info => {
                        const wait = new Promise(resolve => setTimeout(resolve, 500));
                        wait.then(() => {
                            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                        });
                    }}
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
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
        zIndex: 10,
    },
    navBackBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    navTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: Colors.text,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    // Header Styles
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    headerBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: Colors.primary + '30',
    },
    headerBadgeText: {
        fontFamily: 'Inter_800ExtraBold',
        fontSize: 24,
        color: Colors.primary,
    },
    headerTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 20,
        color: Colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    divider: {
        width: 40,
        height: 4,
        backgroundColor: Colors.cardBorder,
        borderRadius: 2,
        marginTop: 16,
    },
    // Surah Header Styles
    surahHeaderContainer: {
        marginBottom: 12,
        marginTop: 12,
    },
    surahHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    surahIconFrame: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    surahName: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: Colors.primary,
    },
    surahNameAr: {
        fontFamily: 'Amiri_700Bold',
        fontSize: 20,
        color: Colors.primary,
    },
    // Ayah Card Styles
    ayahCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    ayahCardLastRead: {
        borderColor: Colors.success,
        backgroundColor: Colors.success + '05',
    },
    ayahCardExpanded: {
        borderColor: Colors.primary,
        backgroundColor: Colors.background,
        elevation: 4,
        shadowOpacity: 0.1,
    },
    ayahMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    ayahNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ayahNumberBadgeActive: {
        backgroundColor: Colors.success,
    },
    ayahNumberText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    ayahNumberTextActive: {
        color: '#FFFFFF',
    },
    lastReadLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
        gap: 4,
    },
    lastReadText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 10,
        color: '#FFFFFF',
    },
    ayahContent: {
        gap: 8,
    },
    ayahTextAr: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 28,
        color: Colors.text,
        textAlign: 'right',
        lineHeight: 50,
        marginBottom: 4,
    },
    ayahTextTr: {
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        color: Colors.text,
        lineHeight: 24,
    },
    translationContainer: {
        marginTop: 8,
    },
    translationDivider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginBottom: 12,
        width: '100%',
    },
    tapHint: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginTop: 8,
    },
    // Footer Styles
    footerContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    finishBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    finishBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    finishBtnText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        color: '#FFFFFF',
    },
    footerNote: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 16,
        color: Colors.textSecondary,
    },
});
