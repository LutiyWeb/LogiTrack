import {
  users,
  loginWithCredentials,
  type User,
  type UserRole,
} from '../store/slices/authSlice';
import { openRun } from '../store/slices/runsSlice';
import {
  setActiveSection,
  updateCarrierTargets,
} from '../store/slices/uiSlice';
import type { AppDispatch } from '../store/store';

export const DEFAULT_USER: User = users[0]; // Sarah Jenkins (Fleet Manager · Full access)

export function getUserByRole(
  roleOrId: UserRole | string = 'manager',
): User {
  return (
    users.find((u) => u.id === roleOrId || u.role === roleOrId) ??
    DEFAULT_USER
  );
}
export function quickLogin({
  roleOrId = 'manager',
  onFillInputs,
  dispatch,
}: {
  roleOrId?: UserRole | string;
  onFillInputs?: (email: string, password: string) => void;
  dispatch: AppDispatch;
}) {
  const user = getUserByRole(roleOrId);
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
