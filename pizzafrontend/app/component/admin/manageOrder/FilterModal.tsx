import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { X, User } from 'lucide-react-native';

interface DeliveryAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
}

type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';

interface FilterModalProps {
  visible: boolean;
  filters: {
    date: string;
    status: string;
    deliveryAgent: string;
  };
  deliveryAgents: DeliveryAgent[];
  statusOptions: OrderStatus[];
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  onFilterChange: (filterType: 'date' | 'status' | 'deliveryAgent', value: string) => void;
  getStatusColor: (status: string) => string;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  deliveryAgents,
  statusOptions,
  onClose,
  onApply,
  onReset,
  onFilterChange,
  getStatusColor,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.smallerModal]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Orders</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Status:</Text>
              <View style={styles.statusFilterOptions}>
                {statusOptions.map((status, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.statusFilterOption,
                      filters.status === status && {
                        backgroundColor: getStatusColor(status),
                        borderColor: getStatusColor(status)
                      }
                    ]}
                    onPress={() => onFilterChange('status', filters.status === status ? '' : status)}
                  >
                    <Text style={[
                      styles.statusFilterText,
                      filters.status === status && { color: '#FFF' }
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Delivery Agent:</Text>
              <ScrollView
                style={styles.agentFilterScrollContainer}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {deliveryAgents.map((agent, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.agentFilterOption,
                      filters.deliveryAgent === agent.name && styles.agentFilterOptionSelected
                    ]}
                    onPress={() => onFilterChange('deliveryAgent', filters.deliveryAgent === agent.name ? '' : agent.name)}
                  >
                    <User size={14} color={filters.deliveryAgent === agent.name ? "#FF6B00" : "#666"} />
                    <Text
                      style={[
                        styles.agentFilterText,
                        filters.deliveryAgent === agent.name && { color: '#FF6B00' }
                      ]}
                      numberOfLines={1}
                    >
                      {agent.name}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[
                    styles.agentFilterOption,
                    filters.deliveryAgent === "Unassigned" && styles.agentFilterOptionSelected
                  ]}
                  onPress={() => onFilterChange('deliveryAgent', filters.deliveryAgent === "Unassigned" ? '' : "Unassigned")}
                >
                  <User size={14} color={filters.deliveryAgent === "Unassigned" ? "#FF6B00" : "#666"} />
                  <Text
                    style={[
                      styles.agentFilterText,
                      filters.deliveryAgent === "Unassigned" && { color: '#FF6B00' }
                    ]}
                    numberOfLines={1}
                  >
                    Unassigned
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.filterActionButton, styles.resetButton]}
                onPress={onReset}
              >
                <Text style={styles.filterActionButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterActionButton, styles.applyButton]}
                onPress={onApply}
              >
                <Text style={[styles.filterActionButtonText, styles.applyButtonText]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    width: '90%',
    alignSelf: 'center',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  smallerModal: {
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
  filterOption: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  statusFilterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
  },
  statusFilterOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
  },
  agentFilterScrollContainer: {
    maxHeight: 200,
    width: '100%',
  },
  agentFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  agentFilterOptionSelected: {
    backgroundColor: '#FFE0CC',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  agentFilterText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    flexShrink: 1,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filterActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  applyButton: {
    backgroundColor: '#FF6B00',
  },
  applyButtonText: {
    color: '#fff',
  },
  filterActionButtonText: {
    fontWeight: '500',
  },
});

export default FilterModal;