import { useState } from 'react';
import { DEFAULT_DEV_USER, runDevAutoLogin } from '../../auth/devAutoAuth';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  demoUsers,
  loginAsDemoUser,
  loginWithCredentials,
  type DemoUser,
} from '../../store/slices/authSlice';
import { setActiveSection, updateCarrierTargets } from '../../store/slices/uiSlice';
import '../Workspace/Workspace.scss';

function LoginScreen() {
  const dispatch = useAppDispatch();
  const loginError = useAppSelector((state) => state.auth.loginError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleQuickLogin(user: DemoUser) {
    setEmail(user.email);
    setPassword(user.password);
    dispatch(loginAsDemoUser(user.id));
    dispatch(updateCarrierTargets({ dispatcherName: user.name }));
    if (user.role === 'driver') dispatch(setActiveSection('board'));
  }

  return (
    <main className="auth-screen" aria-label="Sign in">
      <div className="runs auth-screen__card">
        <header className="runs__heading">
          <div>
            <h1 className="workspace__title">LogiTrack</h1>
            <p className="runs__meta">Sign in to dispatch workspace</p>
          </div>
          <button
            type="button"
            className="runs__button runs__button--small"
            onClick={() =>
              runDevAutoLogin({
                roleOrId: DEFAULT_DEV_USER.id,
                onFillInputs: (devEmail, devPass) => {
                  setEmail(devEmail);
                  setPassword(devPass);
                },
                dispatch,
              })
            }
          >
            Dev auto-login ({DEFAULT_DEV_USER.name})
          </button>
        </header>

        <form
          className="runs__form"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch(loginWithCredentials({ email, password }));
          }}
        >
          <div className="runs__form-head">
            <h2 className="runs__subtitle">Sign in with credentials</h2>
            <span className="runs__meta">Password for all demo accounts: demo123</span>
          </div>
          <label className="runs__field">
            <span className="runs__label">Email</span>
            <input className="runs__input" type="email" placeholder="alex@logitrack.demo" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="runs__field">
            <span className="runs__label">Password</span>
            <input className="runs__input" type="password" placeholder="demo123" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {loginError && (
            <p className="runs__note runs__form-head" role="alert">{loginError}</p>
          )}
          <div className="runs__form-submit">
            <button className="runs__button" type="submit">Sign in</button>
          </div>
        </form>

        <section className="runs__block" aria-label="Demo accounts">
          <h2 className="runs__subtitle">Demo accounts · Quick sign in</h2>
          <ul className="runs__offers">
            {demoUsers.map((user) => (
              <li key={user.id} className="runs__offer">
                <div className="runs__load-head">
                  <div>
                    <span className="runs__badge runs__badge--ok">{user.roleTitle}</span>
                    <p className="runs__truck">{user.name}</p>
                    <p className="runs__meta">{user.email}</p>
                  </div>
                  <button type="button" className="runs__button runs__button--small" onClick={() => handleQuickLogin(user)}>
                    Sign in as {user.name}
                  </button>
                </div>
                <p className="runs__meta">{user.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default LoginScreen;
