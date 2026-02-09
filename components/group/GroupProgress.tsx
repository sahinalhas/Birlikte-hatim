
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface GroupProgressProps {
    percentage: number; // 0 - 100 arası
    totalMembers: number;
    daysLeft?: number;
}

export default function GroupProgress({ percentage, totalMembers, daysLeft }: GroupProgressProps) {
    // Motivasyon mesajı
    const getMessage = () => {
        if (percentage >= 100) return "Elhamdülillah! Hatim tamamlandı.";
        if (percentage >= 80) return "Maşallah! Çok az kaldı, gayret!";
        if (percentage >= 50) return "Yarıyı geçtik, Allah kabul etsin.";
        if (percentage >= 20) return "Güzel gidiyoruz, devam!";
        return "Bismillah! Yolculuk başladı.";
    };

    const progressColor = percentage >= 100 ? Colors.success : percentage >= 50 ? Colors.primary : Colors.accent;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Genel İlerleme</Text>
                <Text style={[styles.percentage, { color: progressColor }]}>%{percentage.toFixed(0)}</Text>
            </View>

            <View style={styles.progressBarBg}>
                <View
                    style={[
                        styles.progressBarFill,
                        { width: `${percentage}%`, backgroundColor: progressColor }
                    ]}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.message}>{getMessage()}</Text>
                {daysLeft !== undefined && (
                    <Text style={styles.daysLeft}>
                        {daysLeft <= 0 ? "Süre Doldu" : `${daysLeft} gün kaldı`}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: Colors.text,
    },
    percentage: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: Colors.backgroundSecondary,
        borderRadius: 5,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    message: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        flex: 1,
    },
    daysLeft: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: Colors.error, // Dikkat çeksin diye
        backgroundColor: Colors.error + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
});
