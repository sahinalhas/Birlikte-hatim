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
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp, GroupType } from '@/contexts/AppContext';

interface GroupTypeOption {
    type: GroupType['type'];
    label: string;
    description: string;
    icon: string;
    color: string;
}

const groupTypes: GroupTypeOption[] = [
    {
        type: 'hatim',
        label: 'Hatim',
        description: "30 cuz arasinda dagitim yapin",
        icon: 'book-open-variant',
        color: Colors.primary,
    },
    {
        type: 'salavat',
        label: 'Salavat',
        description: 'Toplu salavat hedefi belirleyin',
        icon: 'heart-multiple',
        color: Colors.accent,
    },
    {
        type: 'yasin',
        label: 'Yasin-i Serif',
        description: 'Toplu Yasin okuma grubu',
        icon: 'book-open-page-variant',
        color: Colors.primaryLight,
    },
];

const durationOptions = [
    { days: 3, label: '3 Gün' },
    { days: 7, label: '1 Hafta' },
    { days: 14, label: '2 Hafta' },
    { days: 30, label: '1 Ay' },
];

const templates = [
    {
        id: 'general',
        label: 'Genel',
        icon: 'apps',
        title: '',
        intention: '',
        duration: 7
    },
    {
        id: 'funeral',
        label: 'Vefat / Mevlid',
        icon: 'heart-outline',
        title: 'Merhum [İsim] Ruhu İçin Hatim',
        intention: 'Allah rızası için merhumun ruhuna hediye edilmek üzere...',
        duration: 3
    },
    {
        id: 'kandil',
        label: 'Kandil Özel',
        icon: 'moon-outline',
        title: 'Kandil Özel İbadet Grubu',
        intention: 'Mübarek gece hürmetine dualarımızın kabulü niyetiyle.',
        duration: 1
    },
];

export default function CreateGroupScreen() {
    const insets = useSafeAreaInsets();
    const { createGroup, profile, refreshGroups } = useApp();
    const [selectedType, setSelectedType] = useState<GroupType['type']>('hatim');
    const [title, setTitle] = useState('');
    const [intention, setIntention] = useState('');
    const [durationDays, setDurationDays] = useState(7);
    const [targetCount, setTargetCount] = useState('1000');
    const [privacy, setPrivacy] = useState<'private' | 'public'>('private');
    const [selectedTemplate, setSelectedTemplate] = useState('general');
    const [isCreating, setIsCreating] = useState(false);

    const topInset = Platform.OS === 'web' ? 67 : insets.top;

    const applyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            if (template.id !== 'general') {
                setTitle(template.title);
                setIntention(template.intention);
                setDurationDays(template.duration);
            }
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('Hata', 'Grup adı zorunludur.');
            return;
        }
        if (title.trim().length < 3) {
            Alert.alert('Hata', 'Grup adı en az 3 karakter olmalıdır.');
            return;
        }

        if (!profile?.id) {
            Alert.alert('Hata', 'Grup oluşturmak için giriş yapmalısınız.');
            return;
        }

        setIsCreating(true);
        try {
            const now = new Date();
            const startDate = now.toISOString();
            const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Provide all required fields matching the database schema (snake_case)
            const group = await createGroup({
                creator_id: profile.id,
                title: title.trim(),
                description: null,
                type: selectedType,
                intention: intention.trim() || null,
                intention_person: null,
                start_date: startDate,
                end_date: endDate,
                privacy,
                target_count: selectedType !== 'hatim' ? parseInt(targetCount, 10) || 1000 : null,
                total_juz: selectedType === 'hatim' ? 30 : 0,
                distribution_mode: 'auto',
                status: 'active',
                invite_code: inviteCode,
                qr_code_url: null,
                settings: {},
                completed_at: null,
            });

            // Refresh groups to ensure the new group is visible
            await refreshGroups();

            router.replace('/(tabs)');
        } catch (e: any) {
            console.error('Group creation error:', e);
            Alert.alert('Hata', 'Grup oluşturulurken bir sorun oluştu: ' + (e.message || 'Bilinmeyen hata'));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.header, { paddingTop: topInset + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Yeni Grup</Text>
                <Pressable
                    onPress={handleCreate}
                    disabled={isCreating || !title.trim()}
                    style={[styles.headerBtn, (!title.trim() || isCreating) && { opacity: 0.4 }]}
                >
                    <Ionicons name="checkmark" size={26} color={Colors.primary} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.sectionLabel}>Hızlı Şablonlar</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.templateScroll}
                    contentContainerStyle={styles.templateContainer}
                >
                    {templates.map(t => (
                        <Pressable
                            key={t.id}
                            style={[styles.templateChip, selectedTemplate === t.id && styles.templateChipActive]}
                            onPress={() => applyTemplate(t.id)}
                        >
                            <Ionicons
                                name={t.icon as any}
                                size={18}
                                color={selectedTemplate === t.id ? '#FFFFFF' : Colors.textSecondary}
                            />
                            <Text style={[styles.templateChipText, selectedTemplate === t.id && styles.templateChipTextActive]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <Text style={styles.sectionLabel}>İbadet Tipi</Text>
                <View style={styles.typeGrid}>
                    {groupTypes.map(gt => (
                        <Pressable
                            key={gt.type}
                            style={[styles.typeCard, selectedType === gt.type && styles.typeCardActive]}
                            onPress={() => setSelectedType(gt.type)}
                        >
                            <View style={[styles.typeIconBox, { backgroundColor: gt.color + '15' }]}>
                                <MaterialCommunityIcons name={gt.icon as any} size={28} color={gt.color} />
                            </View>
                            <Text style={[styles.typeLabel, selectedType === gt.type && styles.typeLabelActive]}>{gt.label}</Text>
                            <Text style={styles.typeDesc}>{gt.description}</Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.sectionLabel}>Grup Adi</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Ornegin: Annem icin Hatim"
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={100}
                />

                <Text style={styles.sectionLabel}>Niyet (Opsiyonel)</Text>
                <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={intention}
                    onChangeText={setIntention}
                    placeholder="Kimin icin, hangi niyetle?"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    maxLength={200}
                />


                {selectedType !== 'hatim' && (
                    <>
                        <Text style={styles.sectionLabel}>Hedef Sayisi</Text>
                        <TextInput
                            style={styles.input}
                            value={targetCount}
                            onChangeText={setTargetCount}
                            placeholder="1000"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="numeric"
                        />
                    </>
                )}

                <Text style={styles.sectionLabel}>Sure</Text>
                <View style={styles.durationRow}>
                    {durationOptions.map(d => (
                        <Pressable
                            key={d.days}
                            style={[styles.durationChip, durationDays === d.days && styles.durationChipActive]}
                            onPress={() => setDurationDays(d.days)}
                        >
                            <Text style={[styles.durationChipText, durationDays === d.days && styles.durationChipTextActive]}>
                                {d.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.sectionLabel}>Gizlilik</Text>
                <View style={styles.privacyRow}>
                    <Pressable
                        style={[styles.privacyOption, privacy === 'private' && styles.privacyOptionActive]}
                        onPress={() => setPrivacy('private')}
                    >
                        <Ionicons name="lock-closed" size={20} color={privacy === 'private' ? Colors.primary : Colors.textTertiary} />
                        <Text style={[styles.privacyLabel, privacy === 'private' && styles.privacyLabelActive]}>Ozel</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.privacyOption, privacy === 'public' && styles.privacyOptionActive]}
                        onPress={() => setPrivacy('public')}
                    >
                        <Ionicons name="earth" size={20} color={privacy === 'public' ? Colors.primary : Colors.textTertiary} />
                        <Text style={[styles.privacyLabel, privacy === 'public' && styles.privacyLabelActive]}>Herkese Acik</Text>
                    </Pressable>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.9 }, (!title.trim() || isCreating) && { opacity: 0.5 }]}
                    onPress={handleCreate}
                    disabled={isCreating || !title.trim()}
                >
                    <LinearGradient
                        colors={[Colors.primary, Colors.primaryLight]}
                        style={styles.createBtnGradient}
                    >
                        {isCreating ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                        )}
                        <Text style={styles.createBtnText}>
                            {isCreating ? 'Oluşturuluyor...' : 'Grup Oluştur'}
                        </Text>
                    </LinearGradient>
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
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
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.background,
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 17,
        color: Colors.text,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: Colors.text,
        marginBottom: 8,
        marginTop: 6,
    },
    typeGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    typeCard: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.cardBorder,
        gap: 6,
    },
    typeCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    typeIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeLabel: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: Colors.text,
    },
    typeLabelActive: {
        color: Colors.primary,
    },
    typeDesc: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: Colors.textTertiary,
        textAlign: 'center',
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        marginBottom: 10,
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    durationRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    durationChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        alignItems: 'center',
    },
    durationChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    durationChipText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    durationChipTextActive: {
        color: Colors.textOnPrimary,
    },
    privacyRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    privacyOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.card,
        borderWidth: 2,
        borderColor: Colors.cardBorder,
    },
    privacyOptionActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    privacyLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    privacyLabelActive: {
        color: Colors.primary,
    },
    createBtn: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    createBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    createBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    templateScroll: {
        marginBottom: 16,
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    templateContainer: {
        gap: 10,
        paddingRight: 40,
    },
    templateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    templateChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    templateChipText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    templateChipTextActive: {
        color: '#FFFFFF',
    },
});
