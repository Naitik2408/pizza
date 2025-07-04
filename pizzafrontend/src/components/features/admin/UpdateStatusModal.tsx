import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { X, ShoppingBag, Check } from 'lucide-react-native';

interface Order {
  id: string;
  _id: string;
  customer: string;
  status: string;
}

type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';

interface UpdateStatusModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  getStatusColor: (status: string) => string;
  isProcessing: boolean;
  userRole?: 'admin' | 'delivery' | 'customer'; // Add user role prop
}

const statusOptions: OrderStatus[] = ['Pending', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'];

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  visible,
  order,
  onClose,
  onUpdateStatus,
  getStatusColor,
  isProcessing,
  userRole = 'admin', // Default to admin
}) => {
  if (!order) return null;

  // Filter status options based on user role and current status
  const getAvailableStatusOptions = (): OrderStatus[] => {
    if (userRole === 'delivery') {
      // Delivery agents can only update to specific statuses based on current status
      if (order.status === 'Preparing') {
        return ['Out for delivery'];
      } else if (order.status === 'Out for delivery') {
        return ['Delivered'];
      } else {
        return []; // No valid transitions for other statuses
      }
    } else if (userRole === 'customer') {
      // Customers can only cancel orders if they're in Pending or Preparing status
      if (order.status === 'Pending' || order.status === 'Preparing') {
        return ['Cancelled'];
      } else {
        return []; // Cannot cancel orders in other statuses
      }
    } else {
      // Admin can update to any status
      return statusOptions;
    }
  };

  const availableStatusOptions = getAvailableStatusOptions();

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
            <Text style={styles.modalTitle}>Update Order Status</Text>
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

            <View style={styles.currentStatusContainer}>
              <Text style={styles.currentStatusLabel}>Current Status:</Text>
              <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusTextLarge}>{order.status}</Text>
              </View>
            </View>

            <Text style={styles.statusSelectionLabel}>Select New Status:</Text>

            {availableStatusOptions.length === 0 ? (
              <View style={styles.noOptionsContainer}>
                <Text style={styles.noOptionsText}>
                  No status updates available for this order at the moment.
                </Text>
              </View>
            ) : (
              <View style={styles.statusOptions}>
                {availableStatusOptions.map((status, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: order.status === status
                          ? '#F5F5F5'
                          : getStatusColor(status),
                        opacity: order.status === status ? 0.5 : 1
                      }
                    ]}
                    onPress={() => onUpdateStatus(status)}
                    disabled={order.status === status || isProcessing}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      order.status === status && { color: '#666' }
                    ]}>
                      {status}
                    </Text>
                    {order.status === status && (
                      <Check size={18} color="#666" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.statusActionButtons}>
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
                  <Text style={styles.loaderText}>Updating...</Text>
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
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  currentStatusLabel: {
    fontSize: 15,
    color: '#666',
    marginRight: 10,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  statusTextLarge: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 14,
  },
  statusSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusOptions: {
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusOptionText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 15,
  },
  statusActionButtons: {
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
  noOptionsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  noOptionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UpdateStatusModal;