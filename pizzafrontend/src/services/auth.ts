import apiClient from './api';
import { API_ENDPOINTS } from '../constants';
import type { User, LoginForm, SignupForm } from '../types';

export const authService = {
  // Login user
  async login(credentials: LoginForm) {
    return apiClient.post<{ user: User; token: string }>(
      API_ENDPOINTS.auth.login,
      credentials
    );
  },

  // Sign up user
  async signup(userData: SignupForm) {
    return apiClient.post<{ user: User; token: string }>(
      API_ENDPOINTS.auth.signup,
      userData
    );
  },

  // Get current user
  async getCurrentUser() {
    return apiClient.get<User>(API_ENDPOINTS.auth.me);
  },

  // Logout user
  async logout() {
    const result = await apiClient.post(API_ENDPOINTS.auth.logout);
    // Remove auth token from client
    apiClient.removeAuthToken();
    return result;
  },

  // Refresh token
  async refreshToken() {
    return apiClient.post<{ token: string }>(API_ENDPOINTS.auth.refresh);
  },

  // Set auth token
  setAuthToken(token: string) {
    apiClient.setAuthToken(token);
  },

  // Remove auth token
  removeAuthToken() {
    apiClient.removeAuthToken();
  },
};
