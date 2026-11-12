import { useState } from 'react';
import { DEFAULT_DEV_USER, runDevAutoLogin } from '../../auth/devAutoAuth';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { demoUsers, loginWithCredentials } from '../../store/slices/authSlice';
import { t } from '../../i18n';
import '../Workspace/Workspace.scss';

function LoginScreen() {
  const dispatch = useAppDispatch();
  const loginError = useAppSelector((state) => state.auth.loginError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleQuickLogin(roleOrId: string) {
    runDevAutoLogin({
      roleOrId,
      onFillInputs: (devEmail, devPass) => {
        setEmail(devEmail);
        setPassword(devPass);
      },
      dispatch,
    });
  }

  return (
    <main className="auth-screen" aria-label={t.login.ariaLabel}>
      <div className="runs auth-screen__card">
        <header className="runs__heading">
          <div>
            <h1 className="workspace__title">{t.app.title}</h1>
            <p className="runs__meta">{t.login.subtitle}</p>
          </div>
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            onClick={() => handleQuickLogin(DEFAULT_DEV_USER.id)}
          >
            {t.login.devLogin(DEFAULT_DEV_USER.name)}
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
            <h2 className="runs__subtitle">{t.login.formTitle}</h2>
            <span className="runs__meta">{t.login.passwordHint}</span>
          </div>
          <label className="runs__field">
            <span className="runs__label">{t.login.email}</span>
            <input className="runs__input" type="email" placeholder="alex@logitrack.demo" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="runs__field">
            <span className="runs__label">{t.login.password}</span>
            <input className="runs__input" type="password" placeholder="demo123" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {loginError && (
            <p className="runs__note runs__note--error" role="alert">{loginError}</p>
          )}
          <div className="runs__form-submit">
            <button className="runs__button" type="submit">{t.login.submit}</button>
          </div>
        </form>

        <section className="runs__block" aria-label={t.login.demoAria}>
          <h2 className="runs__subtitle">{t.login.demoTitle}</h2>
          <ul className="runs__offers">
            {demoUsers.map((user) => (
              <li key={user.id} className="runs__offer">
                <div className="runs__load-head">
                  <div>
                    <span className="runs__badge runs__badge--ok">{user.roleTitle}</span>
                    <p className="runs__truck">{user.name}</p>
                    <p className="runs__meta">{user.email}</p>
                  </div>
                  <button type="button" className="runs__button runs__button--secondary runs__button--small" onClick={() => handleQuickLogin(user.id)}>
                    {t.login.signInAs(user.name)}
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
