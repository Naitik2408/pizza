import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config';
import { socketConnected, socketDisconnected } from '../../redux/slices/authSlice';
import { Dispatch, AnyAction } from '@reduxjs/toolkit';

let socket: Socket | null = null;
let dispatch: Dispatch<AnyAction> | null = null;

/**
 * Set the dispatch function to be used by socket event handlers
 * @param dispatchFn Redux dispatch function
 */
export const setSocketDispatch = (dispatchFn: Dispatch<AnyAction>): void => {
  dispatch = dispatchFn;
};

/**
 * Initialize socket connection
 * @param token JWT token for authentication
 * @param dispatchFn Redux dispatch function (optional if already set)
 * @returns Socket instance or null if no token provided
 */
export const initializeSocket = (token: string | null, dispatchFn?: Dispatch<AnyAction>): Socket | null => {
  if (!token) return null;
  
  // Set dispatch if provided
  if (dispatchFn) {
    dispatch = dispatchFn;
  }
  
  if (socket && socket.connected) {
    return socket;
  }

  // Close existing socket if it exists
  if (socket) {
    socket.disconnect();
  }

  // Create new socket connection
socket = io(`${API_URL}`, {
  auth: { token },
  // Allow both websocket and polling transport
  transports: ['websocket', 'polling'],  // <-- Change this line
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
  
  // Setup listeners
  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    if (dispatch) {
      dispatch(socketConnected());
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    if (dispatch) {
      dispatch(socketDisconnected());
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    if (dispatch) {
      dispatch(socketDisconnected());
    }
  });
  
  return socket;
};

/**
 * Join rooms for role-based and user-specific events
 * @param userId User ID
 * @param role User role (admin, delivery, customer)
 */
export const joinSocketRooms = (userId: string | null, role: string | null): void => {
  if (!socket || !socket.connected || !userId || !role) return;
  
  socket.emit('join', { userId, role });
  console.log(`Joined rooms for user ${userId} with role ${role}`);
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    if (dispatch) {
      dispatch(socketDisconnected());
    }
  }
};

/**
 * Get current socket instance
 * @returns Socket instance or null if not connected
 */
export const getSocket = (): Socket | null => socket;

/**
 * Check if socket is connected
 * @returns Boolean indicating connection status
 */
export const isSocketConnected = (): boolean => {
  return socket ? socket.connected : false;
};

/**
 * Force reconnect socket if disconnected
 * @param token JWT token for authentication
 * @returns Socket instance or null
 */
export const ensureSocketConnection = (token: string | null): Socket | null => {
  if (!token) return null;
  
  if (!socket || !socket.connected) {
    console.log('Socket disconnected, attempting to reconnect...');
    return initializeSocket(token);
  }
  
  return socket;
};

/**
 * Add a listener for a specific socket event
 * @param event Event name
 * @param callback Function to call when event is received
 */
export const onSocketEvent = <T>(event: string, callback: (data: T) => void): void => {
  if (!socket) return;
  socket.on(event, callback);
};

/**
 * Remove a listener for a specific socket event
 * @param event Event name
 * @param callback Function to remove
 */
export const offSocketEvent = <T>(event: string, callback?: (data: T) => void): void => {
  if (!socket) return;
  if (callback) {
    socket.off(event, callback);
  } else {
    socket.off(event);
  }
};

/**
 * Emit a socket event
 * @param event Event name
 * @param data Data to send
 */
export const emitSocketEvent = <T>(event: string, data: T): void => {
  if (!socket || !socket.connected) return;
  socket.emit(event, data);
};