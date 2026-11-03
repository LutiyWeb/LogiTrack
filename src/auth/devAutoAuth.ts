import {
  demoUsers,
  loginWithCredentials,
  type DemoUser,
  type UserRole,
} from '../store/slices/authSlice';
import { openRun } from '../store/slices/runsSlice';
import { setActiveSection, updateCarrierTargets } from '../store/slices/uiSlice';
import type { AppDispatch } from '../store/store';

export const DEFAULT_DEV_USER: DemoUser = demoUsers[0]; // Sarah Jenkins (Fleet Manager · Full access)

export function getDevUserByRole(roleOrId: UserRole | string = 'manager'): DemoUser {
  return (
    demoUsers.find((u) => u.id === roleOrId || u.role === roleOrId) ??
    DEFAULT_DEV_USER
  );
}

/**
 * Dev helper script: populates the login form inputs with valid dev credentials
 * and immediately dispatches authentication into the Redux store.
 */
export function runDevAutoLogin({
  roleOrId = 'manager',
  onFillInputs,
  dispatch,
}: {
  roleOrId?: UserRole | string;
  onFillInputs?: (email: string, password: string) => void;
  dispatch: AppDispatch;
}) {
  const user = getDevUserByRole(roleOrId);
  onFillInputs?.(user.email, user.password);
  dispatch(
    loginWithCredentials({
      email: user.email,
      password: user.password,
    }),
  );
  dispatch(updateCarrierTargets({ dispatcherName: user.name }));
  dispatch(openRun(null));
  dispatch(setActiveSection('board'));
  return user;
}
