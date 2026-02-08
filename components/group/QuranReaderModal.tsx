import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Dimensions,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/colors';
import quranData from '@/assets/data/quran.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface QuranReaderModalProps {
    isVisible: boolean;
    onClose: () => void;
    juzNumber: number;
    onComplete?: () => void;
}

export default function QuranReaderModal({ isVisible, onClose, juzNumber, onComplete }: QuranReaderModalProps) {
    const [loading, setLoading] = useState(true);
    const [juzContent, setJuzContent] = useState<any>(null);
    const [lastReadAyah, setLastReadAyah] = useState<string | null>(null);

    useEffect(() => {
        if (isVisible) {
            loadJuz();
            loadProgress();
        }
    }, [isVisible, juzNumber]);

    const loadJuz = () => {
        setLoading(true);
        // Real app would fetch specific JUZ, here we use our mock
        const found = (quranData as any[]).find((j: any) => j.juz === juzNumber) || null;
        setJuzContent(found);
        setLoading(false);
    };

    const loadProgress = async () => {
        const progress = await AsyncStorage.getItem(`progress_juz_${juzNumber}`);
        setLastReadAyah(progress);
    };

    const saveProgress = async (ayahId: string) => {
        setLastReadAyah(ayahId);
        await AsyncStorage.setItem(`progress_juz_${juzNumber}`, ayahId);
    };

    const handleComplete = () => {
        Alert.alert(
            'Cüzü Bitirdin mi?',
            'Cüzü tamamladığını işaretlemek üzeresin. Bu işlem geri alınamaz.',
            [
                { text: 'Henüz Değil', style: 'cancel' },
                {
                    text: 'Evet, Bitirdim',
                    style: 'default',
                    onPress: () => {
                        if (onComplete) {
                            onComplete();
                        }
                        onClose();
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.container}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>{juzNumber}. Cüz</Text>
                            <Text style={styles.headerSubtitle}>Kur'an-ı Kerim Okuyucu</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={Colors.text} />
                        </Pressable>
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
                                <Text style={styles.completeBtnText}>Cüzü Bitirdim Olarak İşaretle</Text>
                            </Pressable>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        height: '92%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.cardBorder,
    },
    headerTitle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
        color: Colors.text,
    },
    headerSubtitle: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    highlightedAyah: {
        backgroundColor: Colors.success + '10',
        borderLeftWidth: 3,
        borderLeftColor: Colors.success,
    },
    ayahInfo: {
        flexDirection: 'row',
        marginBottom: 8,
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
        gap: 12,
    },
    ayahAr: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 24,
        color: Colors.text,
        textAlign: 'right',
        lineHeight: 40,
    },
    ayahTr: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    completeBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    completeBtnText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
