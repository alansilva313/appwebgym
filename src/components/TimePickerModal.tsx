import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { theme } from '../theme/theme';
import { X } from 'lucide-react-native';

const { height: screenHeight } = Dimensions.get('window');

interface TimePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    initialTime?: string;
}

const ITEM_HEIGHT = 50;

const TimePickerModal = ({ visible, onClose, onSelect, initialTime = '08:00' }: TimePickerModalProps) => {
    const [selectedHour, setSelectedHour] = useState(8);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const hourListRef = useRef<FlatList>(null);
    const minuteListRef = useRef<FlatList>(null);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    useEffect(() => {
        if (visible && initialTime) {
            const [h, m] = initialTime.split(':').map(Number);
            setSelectedHour(h || 0);
            setSelectedMinute(m || 0);

            // Pequeno delay para garantir que o layout foi feito antes do scroll
            setTimeout(() => {
                hourListRef.current?.scrollToIndex({
                    index: h || 0,
                    animated: false,
                    viewPosition: 0.5
                });
                minuteListRef.current?.scrollToIndex({
                    index: m || 0,
                    animated: false,
                    viewPosition: 0.5
                });
            }, 100);
        }
    }, [visible, initialTime]);

    const handleConfirm = () => {
        const hh = selectedHour.toString().padStart(2, '0');
        const mm = selectedMinute.toString().padStart(2, '0');
        onSelect(`${hh}:${mm}`);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Selecionar Horário</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.pickerContainer}>
                        <View style={styles.column}>
                            <Text style={styles.columnLabel}>Hora</Text>
                            <FlatList
                                ref={hourListRef}
                                data={hours}
                                keyExtractor={(item) => `h-${item}`}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={ITEM_HEIGHT}
                                getItemLayout={(_, index) => (
                                    { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.item,
                                            selectedHour === item && styles.selectedItem
                                        ]}
                                        onPress={() => setSelectedHour(item)}
                                    >
                                        <Text style={[
                                            styles.itemText,
                                            selectedHour === item && styles.selectedItemText
                                        ]}>
                                            {item.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <Text style={styles.separator}>:</Text>

                        <View style={styles.column}>
                            <Text style={styles.columnLabel}>Minutos</Text>
                            <FlatList
                                ref={minuteListRef}
                                data={minutes}
                                keyExtractor={(item) => `m-${item}`}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={ITEM_HEIGHT}
                                getItemLayout={(_, index) => (
                                    { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.item,
                                            selectedMinute === item && styles.selectedItem
                                        ]}
                                        onPress={() => setSelectedMinute(item)}
                                    >
                                        <Text style={[
                                            styles.itemText,
                                            selectedMinute === item && styles.selectedItemText
                                        ]}>
                                            {item.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                        <Text style={styles.confirmBtnText}>Confirmar</Text>
                    </TouchableOpacity>
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
    },
    content: {
        width: '80%',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 24,
        maxHeight: screenHeight * 0.6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 280,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        paddingVertical: 10,
        marginVertical: 10,
    },
    column: {
        flex: 1,
        height: '100%',
    },
    columnLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        marginBottom: 8,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    separator: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginHorizontal: 15,
        opacity: 0.5,
    },
    item: {
        height: ITEM_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        marginHorizontal: 10,
    },
    selectedItem: {
        backgroundColor: 'rgba(187, 242, 70, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(187, 242, 70, 0.3)',
    },
    itemText: {
        fontSize: 22,
        color: 'rgba(255,255,255,0.4)',
    },
    selectedItemText: {
        fontSize: 28,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    confirmBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnText: {
        color: theme.colors.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default TimePickerModal;
