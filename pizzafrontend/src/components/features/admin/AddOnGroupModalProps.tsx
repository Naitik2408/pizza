import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Switch,
} from 'react-native';
import { X, Plus, Minus } from 'lucide-react-native';

interface AddOnGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onAddGroup: (group: { 
        name: string;
        minSelection: number;
        maxSelection: number;
        required: boolean;
    }) => void;
}

const AddOnGroupModal = ({
    visible,
    onClose,
    onAddGroup
}: AddOnGroupModalProps) => {
    const [newGroup, setNewGroup] = useState({
        name: '',
        minSelection: 0,
        maxSelection: 1,
        required: false
    });

    const handleSubmit = () => {
        if (!newGroup.name) {
            return; // Don't submit if name is empty
        }
        
        onAddGroup(newGroup);
        
        // Reset form after submission
        setNewGroup({
            name: '',
            minSelection: 0,
            maxSelection: 1,
            required: false
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
                        <Text style={styles.modalTitle}>Add Customization Group</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Group Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={newGroup.name}
                                onChangeText={(text) => setNewGroup({ ...newGroup, name: text })}
                                placeholder="e.g., Cheese Options, Toppings"
                            />
                        </View>

                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.formLabel}>Min Selections</Text>
                                <View style={styles.numberInputContainer}>
                                    <TouchableOpacity
                                        style={styles.numberInputButton}
                                        onPress={() => {
                                            if (newGroup.minSelection > 0) {
                                                setNewGroup({ ...newGroup, minSelection: newGroup.minSelection - 1 });
                                            }
                                        }}
                                    >
                                        <Minus size={16} color="#666" />
                                    </TouchableOpacity>
                                    <Text style={styles.numberInputText}>{newGroup.minSelection}</Text>
                                    <TouchableOpacity
                                        style={styles.numberInputButton}
                                        onPress={() => {
                                            if (newGroup.minSelection < newGroup.maxSelection) {
                                                setNewGroup({ ...newGroup, minSelection: newGroup.minSelection + 1 });
                                            }
                                        }}
                                    >
                                        <Plus size={16} color="#666" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>Max Selections</Text>
                                <View style={styles.numberInputContainer}>
                                    <TouchableOpacity
                                        style={styles.numberInputButton}
                                        onPress={() => {
                                            if (newGroup.maxSelection > 1 && newGroup.maxSelection > newGroup.minSelection) {
                                                setNewGroup({ ...newGroup, maxSelection: newGroup.maxSelection - 1 });
                                            }
                                        }}
                                    >
                                        <Minus size={16} color="#666" />
                                    </TouchableOpacity>
                                    <Text style={styles.numberInputText}>{newGroup.maxSelection}</Text>
                                    <TouchableOpacity
                                        style={styles.numberInputButton}
                                        onPress={() => {
                                            setNewGroup({ ...newGroup, maxSelection: newGroup.maxSelection + 1 });
                                        }}
                                    >
                                        <Plus size={16} color="#666" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Required</Text>
                            <Switch
                                trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                                thumbColor={newGroup.required ? "#FF6B00" : "#F4F4F4"}
                                onValueChange={(value) => setNewGroup({ ...newGroup, required: value })}
                                value={newGroup.required}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                !newGroup.name && styles.saveButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!newGroup.name}
                        >
                            <Text style={styles.saveButtonText}>Add Group</Text>
                        </TouchableOpacity>
                    </View>
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
        maxHeight: '70%',
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
    formRow: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
    },
    numberInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    numberInputButton: {
        padding: 8,
    },
    numberInputText: {
        fontSize: 14,
        marginHorizontal: 10,
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

export default AddOnGroupModal;