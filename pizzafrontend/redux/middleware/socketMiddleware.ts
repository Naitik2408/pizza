import { Middleware, Action } from 'redux';
import { initializeSocket, joinSocketRooms, disconnectSocket } from '../../utils/socket';
import { SocketMiddlewareState } from '../types';

// Define an interface for actions with a type property
interface TypedAction extends Action {
  type: string;
}

/**
 * Redux middleware for managing the socket connection based on auth state changes
 */
export const socketMiddleware: Middleware<{}, SocketMiddlewareState> = (store) => (next) => (action: any) => {
  const result = next(action);
  const state = store.getState();
  
  // Handle socket connection based on auth actions
  if (action.type === 'auth/login' || action.type === 'auth/restoreAuthState') {
    const { token, userId, role } = state.auth;
    
    if (token && userId && role) {
      // Initialize socket and join rooms
      const socket = initializeSocket(token);
      if (socket) {
        joinSocketRooms(userId, role);
      }
    }
  }
  
  // Handle socket disconnection on logout
  if (action.type === 'auth/logout') {
    disconnectSocket();
  }
  
  return result;
};