import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Size } from '@/types/adminMenu';

interface SizePricing {
    size: Size;
    price: string;
}

interface CustomizationModalProps {
    visible: boolean;
    onClose: () => void;
    onAddCustomization: (customization: { 
        name: string; 
        available: boolean;
        sizePricing: SizePricing[];
    }) => void;
    sizes: Size[];
}

const CustomizationModal = ({
    visible,
    onClose,
    onAddCustomization,
    sizes
}: CustomizationModalProps) => {
    const [customization, setCustomization] = useState({
        name: '',
        available: true,
    });
    
    const [sizePrices, setSizePrices] = useState<{ [key: string]: string }>({
        Small: '',
        Medium: '',
        Large: ''
    });

    const handlePriceChange = (size: Size, price: string) => {
        const filtered = price.replace(/[^0-9.]/g, '');
        setSizePrices({
            ...sizePrices,
            [size]: filtered
        });
    };

    const handleSubmit = () => {
        if (!customization.name) {
            return; // Don't submit if name is empty
        }
        
        // Convert size prices to SizePricing array
        const sizePricing: SizePricing[] = sizes.map(size => ({
            size,
            price: sizePrices[size] || '0' // Default to '0' if not provided
        }));
        
        onAddCustomization({
            ...customization,
            sizePricing
        });
        
        // Reset form after submission
        setCustomization({
            name: '',
            available: true
        });
        setSizePrices({
            Small: '',
            Medium: '',
            Large: ''
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Customization Option</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Customization Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={customization.name}
                                onChangeText={(text) => setCustomization({ ...customization, name: text })}
                                placeholder="e.g., Extra Cheese"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Size-specific Pricing</Text>
                            <Text style={styles.sizeHelpText}>
                                Enter prices for each size below (leave blank to use default pricing)
                            </Text>
                            
                            {sizes.map((size) => (
                                <View key={size} style={styles.sizePriceRow}>
                                    <Text style={styles.sizeLabel}>{size}</Text>
                                    <View style={styles.priceInputWrapper}>
                                        <Text style={styles.currencySymbol}>₹</Text>
                                        <TextInput
                                            style={styles.priceInput}
                                            value={sizePrices[size]}
                                            onChangeText={(text) => handlePriceChange(size, text)}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Available</Text>
                            <Switch
                                trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                                thumbColor={customization.available ? "#FF6B00" : "#F4F4F4"}
                                onValueChange={(value) => setCustomization({ ...customization, available: value })}
                                value={customization.available}
                            />
                        </View>
                        
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                !customization.name && styles.saveButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!customization.name}
                        >
                            <Text style={styles.saveButtonText}>Add Customization</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    formContainer: {
        maxHeight: 400,
    },
    formGroup: {
        marginBottom: 15,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666666',
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
    },
    sizeHelpText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        marginBottom: 10,
    },
    sizePriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'space-between',
    },
    sizeLabel: {
        width: 80,
        fontSize: 14,
        color: '#1F2937',
    },
    priceInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        overflow: 'hidden',
    },
    currencySymbol: {
        paddingLeft: 10,
        fontSize: 14,
        color: '#666666',
    },
    priceInput: {
        flex: 1,
        padding: 10,
        fontSize: 14,
    },
    saveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    saveButtonDisabled: {
        backgroundColor: '#CCCCCC',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    }
});

export default CustomizationModal;