import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { theme } from '../theme/theme';
import { useAlertStore } from '../store/useAlertStore';
import { TriangleAlert, Info, CircleCheck, CircleX } from 'lucide-react-native';

const CustomAlert = () => {
    const { visible, title, message, buttons, hideAlert } = useAlertStore();

    if (!visible) return null;

    const getIcon = () => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('erro') || lowerTitle.includes('error')) return <CircleX size={40} color={theme.colors.error} />;
        if (lowerTitle.includes('sucesso') || lowerTitle.includes('success')) return <CircleCheck size={40} color={theme.colors.primary} />;
        if (lowerTitle.includes('atenção') || lowerTitle.includes('aviso') || lowerTitle.includes('warn')) return <TriangleAlert size={40} color="#FFBB33" />;
        return <Info size={40} color={theme.colors.primary} />;
    };

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.alertCard}>
                    <View style={styles.iconContainer}>
                        {getIcon()}
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {buttons.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        isDestructive && styles.destructiveButton,
                                        isCancel && styles.cancelButton,
                                        buttons.length > 2 && styles.verticalButton
                                    ]}
                                    onPress={() => {
                                        hideAlert();
                                        if (btn.onPress) btn.onPress();
                                    }}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        isCancel && styles.cancelButtonText
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        height: 48,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    destructiveButton: {
        backgroundColor: theme.colors.error,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    verticalButton: {
        width: '100%',
    },
    buttonText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButtonText: {
        color: theme.colors.textSecondary,
    }
});

export default CustomAlert;
