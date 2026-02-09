import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import quranData from '@/assets/data/quran.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';

export default function QuranReaderScreen() {
    const { juz } = useLocalSearchParams<{ juz: string }>();
    const juzNumber = parseInt(juz || '1', 10);
    const insets = useSafeAreaInsets();
    const { profile } = useApp();

    const [loading, setLoading] = useState(true);
    const [juzContent, setJuzContent] = useState<any>(null);
    const [lastReadAyah, setLastReadAyah] = useState<string | null>(null);

    const topInset = Platform.OS === 'web' ? 67 : insets.top;

    useEffect(() => {
        if (juzNumber) {
            loadJuz();
            loadProgress();
        }
    }, [juzNumber]);

    const loadJuz = () => {
        setLoading(true);
        // Real app would fetch specific JUZ, here we use our mock
        const found = (quranData as any[]).find((j: any) => j.juz === juzNumber) || null;
        setJuzContent(found);
        setLoading(false);
    };

    const loadProgress = async () => {
        try {
            const progress = await AsyncStorage.getItem(`progress_juz_${juzNumber}`);
            setLastReadAyah(progress);
        } catch (e) {
            console.error(e);
        }
    };

    const saveProgress = async (ayahId: string) => {
        setLastReadAyah(ayahId);
        try {
            await AsyncStorage.setItem(`progress_juz_${juzNumber}`, ayahId);
        } catch (e) {
            console.error(e);
        }
    };

    const handleComplete = () => {
        Alert.alert(
            'Okumayı Bitir',
            'Okumayı bitirmek istediğinize emin misiniz? Geri dönüp cüzü tamamlandı olarak işaretlemeyi unutmayın.',
            [
                { text: 'Devam Et', style: 'cancel' },
                {
                    text: 'Bitir ve Çık',
                    style: 'default',
                    onPress: () => {
                        router.back();
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: topInset + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{juzNumber}. Cüz</Text>
                    <Text style={styles.headerSubtitle}>Kur'an-ı Kerim Okuyucu</Text>
                </View>
                <View style={styles.headerBtn} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.reader}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                        <Text style={styles.infoText}>
                            Okuduğunuz ayetin üzerine dokunarak kaldığınız yeri işaretleyebilirsiniz.
                        </Text>
                    </View>

                    {juzContent?.surahs.map((surah: any) => (
                        <View key={surah.id} style={styles.surahContainer}>
                            <View style={styles.surahHeader}>
                                <Text style={styles.surahName}>{surah.name}</Text>
                                <Text style={styles.surahNameAr}>{surah.name_ar}</Text>
                            </View>

                            {surah.ayahs.map((ayah: any) => {
                                const ayahKey = `${surah.id}_${ayah.id}`;
                                const isHighlighted = lastReadAyah === ayahKey;
                                const isAyahSaved = isHighlighted;

                                return (
                                    <Pressable
                                        key={ayah.id}
                                        style={[styles.ayahRow, isHighlighted && styles.highlightedAyah]}
                                        onPress={() => saveProgress(ayahKey)}
                                    >
                                        <View style={styles.ayahInfo}>
                                            <View style={[styles.ayahBadge, isHighlighted && styles.highlightedBadge]}>
                                                <Text style={[styles.ayahNumber, isHighlighted && styles.highlightedNumber]}>
                                                    {ayah.id}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }} />
                                            {isAyahSaved && (
                                                <Ionicons name="bookmark" size={16} color={Colors.success} />
                                            )}
                                        </View>
                                        <View style={styles.ayahTextContainer}>
                                            <Text style={styles.ayahAr}>{ayah.text_ar}</Text>
                                            <Text style={styles.ayahTr}>{ayah.text}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}

                    <Pressable style={styles.completeBtn} onPress={handleComplete}>
                        <Text style={styles.completeBtnText}>Okumayı Bitir</Text>
                    </Pressable>

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
        backgroundColor: Colors.background,
        zIndex: 10,
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        color: Colors.text,
    },
    headerSubtitle: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reader: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '10',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: Colors.primary,
        lineHeight: 18,
    },
    surahContainer: {
        marginBottom: 32,
    },
    surahHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.backgroundSecondary,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 16,
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
    ayahRow: {
        marginBottom: 20,
        padding: 12,
        borderRadius: 12,
        backgroundColor: Colors.card, // Card background for better highlighting
        borderWidth: 1,
        borderColor: 'transparent',
    },
    highlightedAyah: {
        backgroundColor: Colors.success + '10',
        borderColor: Colors.success,
    },
    ayahInfo: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'center',
    },
    ayahBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    highlightedBadge: {
        backgroundColor: Colors.success,
    },
    ayahNumber: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    highlightedNumber: {
        color: '#FFFFFF',
    },
    ayahTextContainer: {
        gap: 16,
    },
    ayahAr: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 26,
        color: Colors.text,
        textAlign: 'right',
        lineHeight: 48,
    },
    ayahTr: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    completeBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 16,
        elevation: 2,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    completeBtnText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
