import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { User, X, Edit, Truck, ShoppingBag, DollarSign } from 'lucide-react-native';
import { Order, OrderItem, AddOnOption } from '../../../admin/orders';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: () => void;
  onAssignAgent: () => void;
  onUpdatePayment: () => void; // Added this prop
  getStatusColor: (status: string) => string;
  getPaymentStatusColor: (status: string) => string; // Added this prop
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible,
  order,
  onClose,
  onUpdateStatus,
  onAssignAgent,
  onUpdatePayment, // Added this in the destructuring
  getStatusColor,
  getPaymentStatusColor, // Added this in the destructuring
}) => {
  if (!order) return null;

  // Helper function to check if array has valid items
  const hasValidItems = (arr?: any[]): boolean => {
    return Boolean(arr && Array.isArray(arr) && arr.length > 0 && arr.some(item => item && item.name));
  };

  // Helper function to render customizations in a cleaner way
  const renderCustomizations = (item: OrderItem) => {
    // Check for any customizations
    const hasAddOns = hasValidItems(item.addOns);
    const hasCustomizations = hasValidItems(item.customizations);
    const hasToppings = hasValidItems(item.toppings);
    const hasInstructions = Boolean(item.specialInstructions);

    const hasAnyCustomizations = hasAddOns || hasCustomizations || hasToppings || hasInstructions;

    // If no customizations at all, show a simple message
    if (!hasAnyCustomizations) {
      return (
        <View style={styles.simpleMessageContainer}>
          <Text style={styles.simpleMessageText}>Standard item - No customizations</Text>
        </View>
      );
    }

    return (
      <View style={styles.customizationsContainer}>
        {/* Regular customizations */}
        {hasCustomizations && (
          <View style={styles.customizationSection}>
            <Text style={styles.customizationTitle}>Base Options:</Text>
            {item.customizations!.map((custom, idx) => (
              <View key={`custom-${idx}`} style={styles.customizationItem}>
                <Text style={styles.customizationText}>
                  • {custom.name}: {custom.option || 'Standard'}
                  {(custom.price !== undefined && custom.price > 0) && ` (+₹${custom.price.toFixed(2)})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Add-ons */}
        {hasAddOns && (
          <View style={styles.customizationSection}>
            <Text style={styles.customizationTitle}>Add-ons:</Text>
            {item.addOns!.map((addon, idx) => (
              <View key={`addon-${idx}`} style={styles.customizationItem}>
                <Text style={styles.customizationText}>
                  • {addon.name}
                  {(addon.price !== undefined && addon.price > 0) && ` (+₹${addon.price.toFixed(2)})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Toppings */}
        {hasToppings && (
          <View style={styles.customizationSection}>
            <Text style={styles.customizationTitle}>Toppings:</Text>
            {item.toppings!.map((topping, idx) => (
              <View key={`topping-${idx}`} style={styles.customizationItem}>
                <Text style={styles.customizationText}>
                  • {topping.name}
                  {(topping.price !== undefined && topping.price > 0) && ` (+₹${topping.price.toFixed(2)})`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Special instructions */}
        {hasInstructions && (
          <View style={styles.specialInstructionsSection}>
            <Text style={styles.customizationTitle}>Special Instructions:</Text>
            <Text style={styles.specialInstructionsText}>{item.specialInstructions}</Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate item subtotal including customizations
  const calculateItemSubtotal = (item: OrderItem): number => {
    let subtotal = item.price || 0;

    // Add customization prices
    if (item.customizations) {
      subtotal += item.customizations.reduce((sum, custom) => sum + (custom.price || 0), 0);
    }

    // Add add-on prices
    if (item.addOns) {
      subtotal += item.addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
    }

    // Add topping prices
    if (item.toppings) {
      subtotal += item.toppings.reduce((sum, topping) => sum + (topping.price || 0), 0);
    }

    return subtotal * (item.quantity || 1);
  };

  // Calculate customizations total for an item
  const calculateCustomizationsTotal = (item: OrderItem): number => {
    let total = 0;

    // Add customization prices
    if (item.customizations) {
      total += item.customizations.reduce((sum, custom) => sum + (custom.price || 0), 0);
    }

    return total;
  };

  // Calculate add-ons total for an item
  const calculateAddOnsTotal = (item: OrderItem): number => {
    let total = 0;

    // Add add-on prices
    if (item.addOns) {
      total += item.addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
    }

    return total;
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
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.orderDetailSection}>
              <Text style={styles.sectionTitle}>Order Information</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>#{order.id}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>{order.date} at {order.time}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{order.paymentMethod || 'Not available'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payment Status:</Text>
                <View style={[styles.paymentStatusBadge, { 
                  backgroundColor: getPaymentStatusColor(order.paymentStatus || 'Pending')
                }]}>
                  <Text style={styles.statusText}>{order.paymentStatus || 'Pending'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.orderDetailDivider} />

            <View style={styles.orderDetailSection}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{order.customer}</Text>
              </View>
              {order.customerPhone && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{order.customerPhone}</Text>
                </View>
              )}
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Delivery Address:</Text>
                <Text style={styles.detailValue}>{order.address || order.fullAddress}</Text>
              </View>
              {order.notes && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Delivery Notes:</Text>
                  <Text style={styles.detailValue}>{order.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.orderDetailDivider} />

            <View style={styles.orderDetailSection}>
              <Text style={styles.sectionTitle}>Delivery Information</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Delivery Agent:</Text>
                <View style={styles.agentBadge}>
                  <User size={14} color="#666" />
                  <Text style={styles.agentBadgeText}>{order.deliveryAgent}</Text>
                </View>
              </View>
            </View>

            <View style={styles.orderDetailDivider} />

            <View style={styles.orderDetailSection}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    {/* Item header with name and food type */}
                    <View style={styles.orderItemHeader}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.itemName}>{item.name || "Unnamed Item"}</Text>
                        {item.foodType && item.foodType !== 'Not Applicable' && (
                          <Text style={[
                            styles.itemFoodType,
                            { color: item.foodType === 'Veg' ? '#4CAF50' : '#F44336' }
                          ]}>
                            {item.foodType}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Enhanced Customizations Display */}
                    {renderCustomizations(item)}

                    {/* Improved Price Breakdown */}
                    <View style={styles.priceBreakdownContainer}>
                      <Text style={styles.priceBreakdownTitle}>Price Breakdown</Text>

                      {/* Base price × quantity */}
                      <View style={styles.priceBreakdownRow}>
                        <Text style={styles.priceBreakdownLabel}>
                          Base Price: ₹{(item.price ?? 0).toFixed(2)} × {item.quantity ?? 1}
                        </Text>
                        <Text style={styles.priceBreakdownValue}>
                          ₹{((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}
                        </Text>
                      </View>

                      {/* Size info if available */}
                      {item.size && item.size !== 'Not Applicable' && (
                        <View style={styles.priceBreakdownRow}>
                          <Text style={styles.priceBreakdownLabel}>Size</Text>
                          <Text style={styles.priceBreakdownValue}>{item.size}</Text>
                        </View>
                      )}

                      {/* Customizations total if any */}
                      {calculateCustomizationsTotal(item) > 0 && (
                        <View style={styles.priceBreakdownRow}>
                          <Text style={styles.priceBreakdownLabel}>
                            Base Customizations {(item.quantity ?? 0) > 1 ? `× ${item.quantity}` : ''}
                          </Text>
                          <Text style={styles.priceBreakdownValue}>
                            ₹{(calculateCustomizationsTotal(item) * (item.quantity ?? 1)).toFixed(2)}
                          </Text>
                        </View>
                      )}

                      {/* Add-ons total if any */}
                      {calculateAddOnsTotal(item) > 0 && (
                        <View style={styles.priceBreakdownRow}>
                          <Text style={styles.priceBreakdownLabel}>
                            Add-ons {(item.quantity ?? 0) > 1 ? `× ${item.quantity}` : ''}
                          </Text>
                          <Text style={styles.priceBreakdownValue}>
                            ₹{(calculateAddOnsTotal(item) * (item.quantity ?? 1)).toFixed(2)}
                          </Text>
                        </View>
                      )}

                      {/* Item total */}
                      <View style={styles.priceBreakdownTotal}>
                        <Text style={styles.priceBreakdownTotalLabel}>Item Total</Text>
                        <Text style={styles.priceBreakdownTotalValue}>
                          ₹{calculateItemSubtotal(item).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noItems}>
                  <ShoppingBag size={40} color="#DDD" />
                  <Text style={styles.noItemsText}>No items in this order</Text>
                </View>
              )}

              {/* Order summary section with detailed breakdown */}
              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>

                {/* Calculate items subtotal - Fixed with type assertion */}
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Items Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    ₹{((order as any).subTotal ?? order.amount ?? 0).toFixed(2)}
                  </Text>
                </View>

                {/* Show delivery fee - Fixed with type assertion */}
                {((order as any).deliveryFee ?? 0) > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Delivery Fee:</Text>
                    <Text style={styles.summaryValue}>₹{((order as any).deliveryFee ?? 0).toFixed(2)}</Text>
                  </View>
                )}

                {/* Show taxes - Fixed with type assertion */}
                {((order as any).tax ?? 0) > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Tax (GST):</Text>
                    <Text style={styles.summaryValue}>₹{((order as any).tax ?? 0).toFixed(2)}</Text>
                  </View>
                )}

                {/* Show discount if applicable - Fixed with type assertion */}
                {((order as any).discounts ?? 0) > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: '#FF6B00' }]}>Discount:</Text>
                    <Text style={[styles.summaryValue, { color: '#FF6B00' }]}>-₹{((order as any).discounts ?? 0).toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.divider} />

                {/* Show total amount - Using existing property which should be in the type */}
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalLabel}>Grand Total:</Text>
                  <Text style={styles.orderTotalValue}>
                    ₹{(order.amount ?? 0).toFixed(2)}
                  </Text>
                </View>

                {/* Additional calculation explanation if needed */}
                <Text style={styles.calculationNote}>
                  All prices include applicable taxes and delivery charges.
                </Text>
              </View>
            </View>

            <View style={styles.detailsActionButtons}>
              <TouchableOpacity
                style={styles.detailsActionButton}
                onPress={() => {
                  onClose();
                  onUpdateStatus();
                }}
                activeOpacity={0.8}
              >
                <Edit size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.detailsActionButtonText}>Update Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailsActionButton}
                onPress={() => {
                  onClose();
                  onAssignAgent();
                }}
                activeOpacity={0.8}
              >
                <Truck size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.detailsActionButtonText}>Assign Agent</Text>
              </TouchableOpacity>
            </View>

            {/* Add the update payment button */}
            <TouchableOpacity
              style={styles.paymentActionButton}
              onPress={() => {
                onClose();
                onUpdatePayment();
              }}
              activeOpacity={0.8}
            >
              <DollarSign size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.detailsActionButtonText}>Update Payment Status</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
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
  orderDetailSection: {
    marginBottom: 20,
  },
  orderDetailDivider: {
    height: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailItem: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 12,
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  agentBadgeText: {
    marginLeft: 6,
    color: '#1F2937',
    fontWeight: '500',
  },
  // Updated item styles
  orderItem: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  orderItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  itemFoodType: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    marginLeft: 8,
  },

  // Simplified customizations container
  customizationsContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  customizationSection: {
    marginBottom: 10,
  },
  customizationTitle: {
    fontSize: 14,
    color: '#505050',
    fontWeight: '600',
    marginBottom: 6,
  },
  customizationItem: {
    marginBottom: 4,
    paddingLeft: 4,
  },
  customizationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  specialInstructionsSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
  specialInstructionsText: {
    fontSize: 14,
    color: '#5D4037',
    fontStyle: 'italic',
  },
  simpleMessageContainer: {
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  simpleMessageText: {
    color: '#757575',
    fontStyle: 'italic',
    fontSize: 14,
  },

  // New price breakdown styles
  priceBreakdownContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  priceBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceBreakdownLabel: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  priceBreakdownValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'right',
  },
  priceBreakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceBreakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  priceBreakdownTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
  },

  // Order summary section
  orderSummary: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  calculationNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Action buttons
  detailsActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
  },
  detailsActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  paymentActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 6,
    marginBottom: 24,
  },
  detailsActionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  noItems: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noItemsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
});

export default OrderDetailsModal;