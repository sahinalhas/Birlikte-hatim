import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface JuzCellProps {
    juz: { id: string; juz_number: number; status: string; user_id?: string | null };
    isSelected: boolean;
    onPress: () => void;
}

export default function JuzCell({ juz, isSelected, onPress }: JuzCellProps) {
    const bgColor = juz.status === 'completed'
        ? Colors.success + '20'
        : juz.status === 'in_progress'
            ? Colors.accent + '18'
            : isSelected
                ? Colors.primary + '18'
                : Colors.card;

    const borderColor = juz.status === 'completed'
        ? Colors.success + '40'
        : juz.status === 'in_progress'
            ? Colors.accent + '40'
            : isSelected
                ? Colors.primary
                : Colors.cardBorder;

    const textColor = juz.status === 'completed'
        ? Colors.success
        : juz.status === 'in_progress'
            ? Colors.accentDark
            : isSelected
                ? Colors.primary
                : Colors.text;

    return (
        <Pressable
            style={[styles.juzCell, { backgroundColor: bgColor, borderColor }]}
            onPress={onPress}
            disabled={juz.status === 'completed' || juz.status === 'in_progress'}
        >
            <Text style={[styles.juzNumber, { color: textColor }]}>{juz.juz_number}</Text>
            {juz.status === 'completed' && (
                <Ionicons name="checkmark" size={12} color={Colors.success} style={styles.juzIcon} />
            )}
            {juz.status === 'in_progress' && (
                <Ionicons name="person" size={10} color={Colors.accentDark} style={styles.juzIcon} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    juzCell: {
        width: 52,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    juzNumber: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
    },
    juzIcon: {
        position: 'absolute',
        bottom: 4,
        right: 4,
    },
});
