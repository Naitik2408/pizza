import apiClient from './api';
import { API_ENDPOINTS } from '../constants';
import type { Order, OrderItem } from '../types';

export const orderService = {
  // Create new order
  async createOrder(orderData: {
    items: OrderItem[];
    address: any;
    paymentMethod: string;
    notes?: string;
  }) {
    return apiClient.post<Order>(API_ENDPOINTS.orders.create, orderData);
  },

  // Get user's orders
  async getMyOrders() {
    return apiClient.get<Order[]>(API_ENDPOINTS.orders.myOrders);
  },

  // Get order by ID
  async getOrder(id: string) {
    return apiClient.get<Order>(`${API_ENDPOINTS.orders.myOrders}/${id}`);
  },

  // Track order
  async trackOrder(orderNumber: string) {
    return apiClient.get<Order>(`${API_ENDPOINTS.orders.track}/${orderNumber}`);
  },

  // Rate order
  async rateOrder(orderId: string, rating: number, review?: string) {
    return apiClient.post(`${API_ENDPOINTS.orders.myOrders}/${orderId}/rate`, {
      rating,
      review,
    });
  },

  // Cancel order
  async cancelOrder(orderId: string, reason?: string) {
    return apiClient.patch(`${API_ENDPOINTS.orders.myOrders}/${orderId}/cancel`, {
      reason,
    });
  },

  // Admin: Get all orders
  async getAllOrders(filters?: {
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `${API_ENDPOINTS.admin.orders}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<{
      orders: Order[];
      total: number;
      page: number;
      totalPages: number;
    }>(endpoint);
  },

  // Admin: Update order status
  async updateOrderStatus(orderId: string, status: string, note?: string) {
    return apiClient.patch<Order>(`${API_ENDPOINTS.admin.orders}/${orderId}/status`, {
      status,
      note,
    });
  },

  // Admin: Assign delivery agent
  async assignDeliveryAgent(orderId: string, agentId: string) {
    return apiClient.patch<Order>(`${API_ENDPOINTS.admin.orders}/${orderId}/assign`, {
      deliveryAgent: agentId,
    });
  },

  // Delivery: Get assigned orders
  async getAssignedOrders() {
    return apiClient.get<Order[]>(API_ENDPOINTS.delivery.assigned);
  },

  // Delivery: Update order status
  async updateDeliveryStatus(orderId: string, status: string, location?: { lat: number; lng: number }) {
    return apiClient.patch<Order>(`${API_ENDPOINTS.delivery.update}/${orderId}`, {
      status,
      location,
    });
  },

  // Delivery: Complete order
  async completeOrder(orderId: string, completionData?: {
    photo?: string;
    signature?: string;
    notes?: string;
  }) {
    return apiClient.post<Order>(`${API_ENDPOINTS.delivery.complete}/${orderId}`, completionData);
  },
};
