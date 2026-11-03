import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'manager' | 'dispatcher' | 'driver';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleTitle: string;
  summary: string;
};

export type RolePermissions = {
  canViewOverview: boolean;
  canManageLoads: boolean;
  canUpdateRunStatus: boolean;
  canUpdateLoadStatus: boolean;
  canEditTargets: boolean;
};

export const demoUsers: DemoUser[] = [
  {
    id: 'manager',
    name: 'Sarah Jenkins',
    email: 'sarah@logitrack.demo',
    password: 'demo123',
    role: 'manager',
    roleTitle: 'Fleet Manager',
    summary:
      'Full access: fleet overview, load assignment, and profitability targets.',
  },
  {
    id: 'dispatcher',
    name: 'Alex Mercer',
    email: 'alex@logitrack.demo',
    password: 'demo123',
    role: 'dispatcher',
    roleTitle: 'Senior Fleet Dispatcher',
    summary:
      'Operations access: overview, runs, broker load board, and load statuses. Company targets are read-only.',
  },
  {
    id: 'driver',
    name: 'Marcus Hill',
    email: 'marcus@logitrack.demo',
    password: 'demo123',
    role: 'driver',
    roleTitle: 'Driver · Truck 214',
    summary:
      'Driver access: view assigned runs and update load delivery status only.',
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  manager: {
    canViewOverview: true,
    canManageLoads: true,
    canUpdateRunStatus: true,
    canUpdateLoadStatus: true,
    canEditTargets: true,
  },
  dispatcher: {
    canViewOverview: true,
    canManageLoads: true,
    canUpdateRunStatus: true,
    canUpdateLoadStatus: true,
    canEditTargets: false,
  },
  driver: {
    canViewOverview: false,
    canManageLoads: false,
    canUpdateRunStatus: false,
    canUpdateLoadStatus: true,
    canEditTargets: false,
  },
};

export type AuthState = {
  currentUser: DemoUser | null;
  loginError: string | null;
};

export function createInitialAuthState(
  defaultUser: DemoUser | null = null,
): AuthState {
  return {
    currentUser: defaultUser,
    loginError: null,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: createInitialAuthState(),
  reducers: {
    loginWithCredentials(
      state,
      action: PayloadAction<{ email: string; password: string }>,
    ) {
      const normalizedEmail = action.payload.email.trim().toLowerCase();
      const matched = demoUsers.find(
        (user) =>
          user.email.toLowerCase() === normalizedEmail &&
          user.password === action.payload.password,
      );

      if (!matched) {
        state.loginError = 'Invalid email or password';
        return;
      }

      state.currentUser = matched;
      state.loginError = null;
    },
    loginAsDemoUser(state, action: PayloadAction<string>) {
      const matched = demoUsers.find((user) => user.id === action.payload);
      if (matched) {
        state.currentUser = matched;
        state.loginError = null;
      }
    },
    logout(state) {
      state.currentUser = null;
      state.loginError = null;
    },
  },
});

export const { loginWithCredentials, loginAsDemoUser, logout } =
  authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) =>
  state.auth.currentUser;

export const selectPermissions = (state: {
  auth: AuthState;
}): RolePermissions =>
  state.auth.currentUser
    ? ROLE_PERMISSIONS[state.auth.currentUser.role]
    : ROLE_PERMISSIONS.driver;

export default authSlice.reducer;
