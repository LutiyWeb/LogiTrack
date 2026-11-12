import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { t } from '../../i18n';

export type UserRole = 'manager' | 'dispatcher' | 'driver';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleTitle: string;
  summary: string;
  assignedRunId?: string;
};

export type RolePermissions = {
  canViewOverview: boolean;
  canManageLoads: boolean;
  canUpdateRunStatus: boolean;
  canUpdateLoadStatus: boolean;
  canEditTargets: boolean;
  /** Раздел «Фінанси»: маржа и расходы компании — только владелец. */
  canViewFinance: boolean;
};

export const demoUsers: DemoUser[] = [
  {
    id: 'manager',
    name: 'Sarah Jenkins',
    email: 'sarah@logitrack.demo',
    password: 'demo123',
    role: 'manager',
    roleTitle: 'Менеджер автопарку',
    summary:
      'Повний доступ: огляд автопарку, призначення вантажів і цілі прибутковості.',
  },
  {
    id: 'dispatcher',
    name: 'Alex Mercer',
    email: 'alex@logitrack.demo',
    password: 'demo123',
    role: 'dispatcher',
    roleTitle: 'Старший диспетчер',
    summary:
      'Операційний доступ: огляд, рейси, біржа вантажів і статуси вантажів. Цілі компанії — лише перегляд.',
  },
  {
    id: 'driver',
    name: 'Marcus Hill',
    email: 'marcus@logitrack.demo',
    password: 'demo123',
    role: 'driver',
    roleTitle: 'Водій · Тягач 214',
    summary:
      'Доступ водія: лише перегляд своїх рейсів і зміна статусу доставки вантажу.',
    assignedRunId: '214',
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  manager: {
    canViewOverview: true,
    canManageLoads: true,
    canUpdateRunStatus: true,
    canUpdateLoadStatus: true,
    canEditTargets: true,
    canViewFinance: true,
  },
  dispatcher: {
    canViewOverview: true,
    canManageLoads: true,
    canUpdateRunStatus: true,
    canUpdateLoadStatus: true,
    canEditTargets: false,
    canViewFinance: false,
  },
  driver: {
    canViewOverview: false,
    canManageLoads: false,
    canUpdateRunStatus: false,
    canUpdateLoadStatus: true,
    canEditTargets: false,
    canViewFinance: false,
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
        state.loginError = t.login.invalid;
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
