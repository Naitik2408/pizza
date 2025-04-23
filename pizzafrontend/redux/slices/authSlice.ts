import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  role: string | null;
  name: string | null;
  email: string | null;
  isGuest: boolean;
}

const initialState: AuthState = {
  token: null,
  role: null,
  name: null,
  email: null,
  isGuest: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{
      token: string;
      role: string;
      name: string;
      email: string;
      isGuest?: boolean;
    }>) => {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.isGuest = action.payload.isGuest || false;
    },
    logout: (state) => {
      state.token = null;
      state.role = null;
      state.name = null;
      state.email = null;
      state.isGuest = false;
    },
    restoreAuthState: (state, action: PayloadAction<{
      token: string;
      role: string;
      name: string;
      email: string;
      isGuest?: boolean;
    }>) => {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.isGuest = action.payload.isGuest || false;
    },
    // Add this new reducer
    updateProfile: (state, action: PayloadAction<{
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    }>) => {
      if (action.payload.name) state.name = action.payload.name;
      if (action.payload.email) state.email = action.payload.email;
      // We don't update phone and address here as they're not in the auth state
    },
  },
});

export const { login, logout, restoreAuthState, updateProfile } = authSlice.actions;
export default authSlice.reducer;