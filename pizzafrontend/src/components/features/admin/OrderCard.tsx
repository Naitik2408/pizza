import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingBag, Calendar, User, MapPin, DollarSign, Edit, Truck, Info } from 'lucide-react-native';
import { displayOrderId } from '@/src/utils/orderUtils';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  foodType?: string;
  customizations?: any[];
}

interface Order {
  id: string;
  _id: string;
  customer: string;
  status: string;
  deliveryAgent: string;
  date: string;
  time: string;
  amount: number;
  items: OrderItem[];
  address: string;
  fullAddress?: string;
  notes: string;
}

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onUpdateStatus: () => void;
  onAssignAgent: () => void;
  getStatusColor: (status: string) => string;
}

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onPress, 
  onUpdateStatus, 
  onAssignAgent, 
  getStatusColor 
}) => {
  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <ShoppingBag size={20} color="#FF6B00" style={styles.orderIcon} />
          <View>
            <Text style={styles.orderCustomerName}>{order.customer}</Text>
            <Text style={styles.orderIdText}>{displayOrderId(order.id)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Calendar size={16} color="#666" />
          <Text style={styles.detailText}>
            {order.date} • {order.time}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <User size={16} color="#666" />
          <Text style={styles.detailText}>
            Agent: <Text style={styles.detailValue}>{order.deliveryAgent}</Text>
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {order.address || order.fullAddress}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <DollarSign size={16} color="#666" />
          <Text style={styles.detailText}>
            Total: <Text style={styles.totalAmount}>₹{order.amount.toFixed(2)}</Text>
          </Text>
        </View>

        <View style={styles.orderItems}>
          <Text style={styles.itemsText}>Items: </Text>
          <Text style={styles.itemsValue} numberOfLines={1}>
            {order.items.map((i, index) =>
              `${i.quantity}x ${i.name}${index < order.items.length - 1 ? ", " : ""}`
            )}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onUpdateStatus();
          }}
        >
          <Edit size={16} color="#FF6B00" />
          <Text style={styles.actionButtonText}>Update Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onAssignAgent();
          }}
        >
          <Truck size={16} color="#FF6B00" />
          <Text style={styles.actionButtonText}>Assign Agent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={(e) => {
            e.stopPropagation();
            onPress();
          }}
        >
          <Info size={16} color="#FF6B00" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    marginRight: 10,
  },
  orderCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderIdText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  statusText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 12,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    color: '#1F2937',
    fontWeight: '500',
  },
  totalAmount: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  orderItems: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemsText: {
    fontSize: 14,
    color: '#666',
  },
  itemsValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '500',
  },
});

export default OrderCard;