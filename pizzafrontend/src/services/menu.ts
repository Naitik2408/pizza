import apiClient from './api';
import { API_ENDPOINTS } from '../constants';
import type { MenuItem } from '../types';

export const menuService = {
  // Get all menu items
  async getMenuItems() {
    return apiClient.get<MenuItem[]>(API_ENDPOINTS.menu.items);
  },

  // Get menu item by ID
  async getMenuItem(id: string) {
    return apiClient.get<MenuItem>(`${API_ENDPOINTS.menu.items}/${id}`);
  },

  // Get menu categories
  async getCategories() {
    return apiClient.get<string[]>(API_ENDPOINTS.menu.categories);
  },

  // Search menu items
  async searchItems(query: string) {
    return apiClient.get<MenuItem[]>(`${API_ENDPOINTS.menu.search}?q=${encodeURIComponent(query)}`);
  },

  // Admin: Add menu item
  async addMenuItem(itemData: Partial<MenuItem>) {
    return apiClient.post<MenuItem>(API_ENDPOINTS.menu.items, itemData);
  },

  // Admin: Update menu item
  async updateMenuItem(id: string, itemData: Partial<MenuItem>) {
    return apiClient.put<MenuItem>(`${API_ENDPOINTS.menu.items}/${id}`, itemData);
  },

  // Admin: Delete menu item
  async deleteMenuItem(id: string) {
    return apiClient.delete(`${API_ENDPOINTS.menu.items}/${id}`);
  },

  // Admin: Update item availability
  async updateAvailability(id: string, isAvailable: boolean) {
    return apiClient.patch<MenuItem>(`${API_ENDPOINTS.menu.items}/${id}/availability`, {
      isAvailable,
    });
  },
};
