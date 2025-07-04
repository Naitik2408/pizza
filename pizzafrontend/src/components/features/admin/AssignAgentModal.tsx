import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { X, ShoppingBag, Check, User, Wifi, WifiOff, Clock, Info, RefreshCw } from 'lucide-react-native';
import { API_URL } from '@/config';
import { getSocket, onSocketEvent, offSocketEvent } from '@/src/utils/socket';

// Updated to match your User model structure with correct path to isOnline
interface DeliveryAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
  deliveryDetails?: {
    vehicleType?: string;
    isVerified?: boolean;
    status?: string;
    isOnline?: boolean;
    lastActiveTime?: string;
  };
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
  token?: string;
  onRefreshAgents?: () => Promise<void>;
}

const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  visible,
  order,
  deliveryAgents,
  onClose,
  onAssignAgent,
  isProcessing,
  token,
  onRefreshAgents
}) => {
  if (!order) return null;

  // State for refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Replace the formatLastSeen function with this custom implementation
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Unknown";

    try {
      const date = new Date(timestamp);
      const now = new Date();

      // Time difference in milliseconds
      const diffMs = now.getTime() - date.getTime();

      // Convert to seconds, minutes, hours, days
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      // Format based on time difference
      if (diffSecs < 60) {
        return `${diffSecs} seconds ago`;
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else {
        // For dates older than a week, show the actual date
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `on ${day}/${month}/${year}`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return "Unknown";
    }
  };

  // Function to refresh agents list
  const refreshAgentsList = async () => {
    if (!token || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/delivery-agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delivery agents');
      }

      const data = await response.json();
      // No need to update local state, we'll rely on the parent component

      
      // Notify parent component to update its state
      if (onRefreshAgents) {
        await onRefreshAgents();
      }
    } catch (err) {
      console.error('Error refreshing agents:', err);
      Alert.alert('Error', 'Could not refresh delivery agents list');
    } finally {
      setIsRefreshing(false);
    }
  };



  // Separate delivery agents by online status
  const { onlineAgents, offlineAgents } = useMemo(() => {
    const online: DeliveryAgent[] = [];
    const offline: DeliveryAgent[] = [];

    deliveryAgents.forEach(agent => {
      // Check isOnline status in the deliveryDetails object
      if (agent.deliveryDetails && agent.deliveryDetails.isOnline === true) {
        online.push(agent);
      } else {
        offline.push(agent);
      }
    });

    return { onlineAgents: online, offlineAgents: offline };
  }, [deliveryAgents]);

  // Handle assignment attempt for offline agents
  const handleOfflineAgentSelection = (agent: DeliveryAgent) => {
    Alert.alert(
      "Agent is Offline",
      `${agent.name} is currently offline. Are you sure you want to assign this order?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Assign Anyway",
          onPress: () => onAssignAgent(agent._id, agent.name),
          style: "destructive"
        }
      ]
    );
  };

  // Get vehicle type icon
  const getVehicleIcon = (vehicleType?: string) => {
    switch (vehicleType) {
      case 'scooter':
        return '🛵';
      case 'bike':
        return '🏍️';
      case 'bicycle':
        return '🚲';
      case 'car':
        return '🚗';
      default:
        return '🚚';
    }
  };

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

            {/* Refresh button */}
            <TouchableOpacity
              style={[
                styles.refreshButton,
                isRefreshing && styles.refreshingButton
              ]}
              onPress={refreshAgentsList}
              disabled={isRefreshing || isProcessing}
              activeOpacity={0.7}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#FF6B00" />
              ) : (
                <RefreshCw size={18} color="#FF6B00" />
              )}
              <Text style={styles.refreshButtonText}>
                {isRefreshing ? 'Refreshing...' : 'Refresh agents status'}
              </Text>
            </TouchableOpacity>

            {/* Unassigned option */}
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

            {/* Message if no online agents */}
            {onlineAgents.length === 0 && (
              <View style={styles.noOnlineAgentsContainer}>
                <Info size={18} color="#FF9800" />
                <Text style={styles.noOnlineAgentsText}>
                  No delivery agents are currently online
                </Text>
              </View>
            )}

            {/* Online Agents Section */}
            {onlineAgents.length > 0 && (
              <View style={styles.agentGroupSection}>
                <View style={styles.agentGroupHeader}>
                  <Wifi size={16} color="#2ECC71" />
                  <Text style={styles.agentGroupTitle}>Online Agents ({onlineAgents.length})</Text>
                </View>

                <View style={styles.agentOptions}>
                  {onlineAgents.map((agent) => (
                    <TouchableOpacity
                      key={agent._id}
                      style={[
                        styles.agentOption,
                        order.deliveryAgent === agent.name && styles.agentOptionSelected,
                        styles.onlineAgentOption
                      ]}
                      onPress={() => onAssignAgent(agent._id, agent.name)}
                      disabled={order.deliveryAgent === agent.name || isProcessing}
                      activeOpacity={0.8}
                    >
                      <View style={styles.agentOptionLeft}>
                        <View style={styles.agentAvatarContainer}>
                          <Text style={styles.agentAvatarText}>
                            {agent.name.charAt(0).toUpperCase()}
                          </Text>
                          <View style={styles.onlineIndicator} />
                        </View>
                        <View style={styles.agentOptionTextContainer}>
                          <Text style={[
                            styles.agentOptionText,
                            order.deliveryAgent === agent.name && styles.agentOptionTextSelected
                          ]} numberOfLines={1}>
                            {agent.name} {getVehicleIcon(agent.deliveryDetails?.vehicleType)}
                          </Text>
                          <View style={styles.agentStatusRow}>
                            <View style={styles.onlineStatusBadge}>
                              <Text style={styles.onlineStatusText}>Online</Text>
                            </View>
                            {agent.deliveryDetails?.isVerified && (
                              <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>Verified</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      {order.deliveryAgent === agent.name ? (
                        <Check size={18} color="#FF6B00" />
                      ) : (
                        <Text style={styles.assignText}>Assign</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Offline Agents Section - always show but with warning */}
            {offlineAgents.length > 0 && (
              <View style={styles.agentGroupSection}>
                <View style={styles.agentGroupHeader}>
                  <WifiOff size={16} color="#95A5A6" />
                  <Text style={styles.agentGroupTitle}>Offline Agents ({offlineAgents.length})</Text>
                </View>

                <View style={styles.offlineWarningBox}>
                  <Info size={16} color="#FF9800" />
                  <Text style={styles.offlineWarningText}>
                    These agents are offline and may not respond immediately
                  </Text>
                </View>

                <View style={styles.agentOptions}>
                  {offlineAgents.map((agent) => (
                    <TouchableOpacity
                      key={agent._id}
                      style={[
                        styles.agentOption,
                        order.deliveryAgent === agent.name && styles.agentOptionSelected,
                        styles.offlineAgentOption
                      ]}
                      onPress={() => handleOfflineAgentSelection(agent)}
                      disabled={order.deliveryAgent === agent.name || isProcessing}
                      activeOpacity={0.8}
                    >
                      <View style={styles.agentOptionLeft}>
                        <View style={styles.agentAvatarContainer}>
                          <Text style={styles.agentAvatarText}>
                            {agent.name.charAt(0).toUpperCase()}
                          </Text>
                          <View style={styles.offlineIndicator} />
                        </View>
                        <View style={styles.agentOptionTextContainer}>
                          <Text style={[
                            styles.agentOptionText,
                            order.deliveryAgent === agent.name && styles.agentOptionTextSelected
                          ]} numberOfLines={1}>
                            {agent.name} {getVehicleIcon(agent.deliveryDetails?.vehicleType)}
                          </Text>
                          <View style={styles.lastSeenContainer}>
                            <Clock size={12} color="#95A5A6" />
                            <Text style={styles.lastSeenText}>
                              Last active: {formatLastSeen(agent.deliveryDetails?.lastActiveTime)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {order.deliveryAgent === agent.name ? (
                        <Check size={18} color="#FF6B00" />
                      ) : (
                        <Text style={styles.assignTextDisabled}>Offline</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {deliveryAgents.length === 0 && (
              <View style={styles.noAgentsContainer}>
                <Text style={styles.noAgentsText}>No delivery agents found</Text>
              </View>
            )}

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
    maxHeight: '80%',
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
    marginBottom: 16,
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FFF5EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFDAB9',
    marginBottom: 16,
  },
  refreshingButton: {
    backgroundColor: '#F9F9F9',
    borderColor: '#E0E0E0',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B00',
    marginLeft: 8,
  },
  noOnlineAgentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  noOnlineAgentsText: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 8,
  },
  agentGroupSection: {
    marginBottom: 20,
  },
  agentGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  agentGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  agentOptions: {
    marginBottom: 4,
  },
  agentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
    width: '100%',
  },
  onlineAgentOption: {
    backgroundColor: '#F0FFF4',
    borderLeftWidth: 3,
    borderLeftColor: '#2ECC71',
  },
  offlineAgentOption: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 3,
    borderLeftColor: '#95A5A6',
  },
  agentOptionSelected: {
    backgroundColor: '#FFE0CC',
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderLeftWidth: 3,
  },
  agentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
  },
  agentAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  agentAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ECC71',
    borderWidth: 2,
    borderColor: '#fff',
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#95A5A6',
    borderWidth: 2,
    borderColor: '#fff',
  },
  agentOptionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  agentOptionText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  agentOptionTextSelected: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  agentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineStatusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineStatusText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '600',
  },
  lastSeenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lastSeenText: {
    fontSize: 12,
    color: '#95A5A6',
    marginLeft: 4,
  },
  assignText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  assignTextDisabled: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  offlineWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineWarningText: {
    fontSize: 12,
    color: '#854D0E',
    marginLeft: 8,
    flex: 1,
  },
  noAgentsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginVertical: 16,
  },
  noAgentsText: {
    fontSize: 15,
    color: '#666',
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