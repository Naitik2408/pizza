// Redux state types to avoid circular dependencies
export interface AuthState {
  token: string | null;
  userId: string | null;
  role: string | null;
  name: string | null;
  isGuest: boolean;
  isAuthenticated: boolean;
}

export interface CartState {
  items: any[];
  // Add other cart state properties as needed
}

// Define partial RootState to avoid circular dependency
export interface SocketMiddlewareState {
  auth: AuthState;
  // Only include the states that socket middleware needs
}
