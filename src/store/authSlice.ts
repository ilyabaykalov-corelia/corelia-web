import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/auth';
import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from '../api/authStorage';
import type { AuthSession, AuthUser, LoginRequest } from '../types/auth';

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

const storedSession = getStoredAuthSession();

const initialState: AuthState = {
  session: storedSession,
  user: storedSession?.user ?? null,
  loading: false,
  error: null,
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Неизвестная ошибка');

export const loginUser = createAsyncThunk('auth/login', async (payload: LoginRequest, api) => {
  try {
    const session = await authApi.login(payload);
    setStoredAuthSession(session);
    return session;
  } catch (error) {
    return api.rejectWithValue(errorMessage(error));
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, api) => {
  const state = api.getState() as { auth: AuthState };
  const refreshToken = state.auth.session?.refreshToken;

  try {
    await authApi.logout(refreshToken);
  } finally {
    clearStoredAuthSession();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<AuthSession>) => {
      state.session = action.payload;
      state.user = action.payload.user;
      state.error = null;
    },
    clearSession: (state) => {
      state.session = null;
      state.user = null;
      state.error = null;
      clearStoredAuthSession();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload ?? action.error.message);
      })
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.session = null;
        state.user = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.session = null;
        state.user = null;
      });
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
