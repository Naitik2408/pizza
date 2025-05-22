import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { X, ShoppingBag, Check, User } from 'lucide-react-native';

interface DeliveryAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Order {
  id: string;
  _id: string;
  customer: string;
  status: string;
  deliveryAgent: string;
}

interface AssignAgentModalProps {
  visible: boolean;
  order: Order | null;
  deliveryAgents: DeliveryAgent[];
  onClose: () => void;
  onAssignAgent: (agentId: string | null, agentName: string) => void;
  isProcessing: boolean;
}

const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  visible,
  order,
  deliveryAgents,
  onClose,
  onAssignAgent,
  isProcessing,
}) => {
  if (!order) return null;

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
            <Text style={styles.modalTitle}>Assign Delivery Agent</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <View style={styles.orderSummary}>
              <ShoppingBag size={24} color="#FF6B00" />
              <View style={styles.orderSummaryText}>
                <Text style={styles.orderSummaryId}>Order #{order.id}</Text>
                <Text style={styles.orderSummaryCustomer}>{order.customer}</Text>
              </View>
            </View>

            <View style={styles.currentAgentContainer}>
              <Text style={styles.currentAgentLabel}>Current Agent:</Text>
              <View style={styles.currentAgentValue}>
                <User size={16} color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.currentAgentText} numberOfLines={1}>{order.deliveryAgent}</Text>
              </View>
            </View>

            <Text style={styles.agentSelectionLabel}>Select Delivery Agent:</Text>

            <View style={styles.agentOptions}>
              {deliveryAgents.map((agent) => (
                <TouchableOpacity
                  key={agent._id}
                  style={[
                    styles.agentOption,
                    order.deliveryAgent === agent.name && styles.agentOptionSelected
                  ]}
                  onPress={() => onAssignAgent(agent._id, agent.name)}
                  disabled={order.deliveryAgent === agent.name || isProcessing}
                  activeOpacity={0.8}
                >
                  <View style={styles.agentOptionLeft}>
                    <User size={18} color={order.deliveryAgent === agent.name ? "#FF6B00" : "#666"} />
                    <Text style={[
                      styles.agentOptionText,
                      order.deliveryAgent === agent.name && styles.agentOptionTextSelected
                    ]} numberOfLines={1}>
                      {agent.name}
                    </Text>
                  </View>
                  {order.deliveryAgent === agent.name && (
                    <Check size={18} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.agentOption,
                  order.deliveryAgent === "Unassigned" && styles.agentOptionSelected
                ]}
                onPress={() => onAssignAgent(null, "Unassigned")}
                disabled={order.deliveryAgent === "Unassigned" || isProcessing}
                activeOpacity={0.8}
              >
                <View style={styles.agentOptionLeft}>
                  <User size={18} color={order.deliveryAgent === "Unassigned" ? "#FF6B00" : "#666"} />
                  <Text style={[
                    styles.agentOptionText,
                    order.deliveryAgent === "Unassigned" && styles.agentOptionTextSelected
                  ]}>
                    Unassigned
                  </Text>
                </View>
                {order.deliveryAgent === "Unassigned" && (
                  <Check size={18} color="#FF6B00" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.agentActionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {isProcessing && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#FF6B00" />
                  <Text style={styles.loaderText}>Assigning agent...</Text>
                </View>
              </View>
            )}
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalBodyContent: {
    paddingBottom: 20,
  },
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  orderSummaryText: {
    marginLeft: 12,
  },
  orderSummaryId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  orderSummaryCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  currentAgentContainer: {
    marginBottom: 24,
  },
  currentAgentLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  currentAgentValue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '100%',
  },
  currentAgentText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  agentSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  agentOptions: {
    marginBottom: 20,
  },
  agentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
    width: '100%',
  },
  agentOptionSelected: {
    backgroundColor: '#FFE0CC',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  agentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
  },
  agentOptionText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
    flexShrink: 1,
  },
  agentOptionTextSelected: {
    color: '#FF6B00',
    fontWeight: '500',
  },
  agentActionButtons: {
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default AssignAgentModal;