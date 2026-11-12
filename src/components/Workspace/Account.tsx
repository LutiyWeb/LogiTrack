import { t } from '../../i18n';
import { formatMoney, readNumber } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  logout,
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import {
  carrierProfile,
  updateCarrierTargets,
} from '../../store/slices/uiSlice';
import { resetAllDemoData } from '../../store/store';

function Account() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((state) => state.ui);
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.account.title}</h1>
          <p className="runs__meta">{t.account.subtitle}</p>
        </div>
        <button
          type="button"
          className="runs__button runs__button--tertiary runs__button--small"
          onClick={() => dispatch(logout())}
        >
          {t.nav.signOut}
        </button>
      </header>

      <section className="runs__block" aria-label={t.account.profileAria}>
        <h2 className="runs__subtitle">{t.account.profileTitle}</h2>
        <div className="runs__stats">
          <div className="runs__stat runs__stat--blue">
            <dt>{t.account.carrier}</dt>
            <dd className="runs__stat-text">{carrierProfile.carrierName}</dd>
            <span className="runs__meta">{carrierProfile.mcNumber}</span>
          </div>
          <div className="runs__stat runs__stat--slate">
            <dt>{t.account.dot}</dt>
            <dd className="runs__stat-text">{carrierProfile.dotNumber}</dd>
            <span className="runs__meta">{t.account.dotSub}</span>
          </div>
          <div className="runs__stat runs__stat--blue">
            <dt>{t.account.homeTerminal}</dt>
            <dd className="runs__stat-text">{carrierProfile.homeYard}</dd>
            <span className="runs__meta">{t.account.homeTerminalSub}</span>
          </div>
          <div className="runs__stat runs__stat--slate">
            <dt>{t.account.signedIn}</dt>
            <dd className="runs__stat-text">
              {currentUser?.name ?? ui.dispatcherName}
            </dd>
            <span className="runs__meta">
              {currentUser?.roleTitle ?? carrierProfile.dispatcherRole}
              {currentUser ? ` · ${currentUser.email}` : ''}
            </span>
          </div>
        </div>
      </section>

      <section className="runs__form" aria-label={t.account.targetsAria}>
        <div className="runs__form-head">
          <h2 className="runs__subtitle">{t.account.targetsTitle}</h2>
          <span className="runs__meta">{t.account.targetsSub}</span>
        </div>
        {!permissions.canEditTargets && (
          <p className="runs__note runs__form-head">
            {t.account.readOnly}
          </p>
        )}
        <label className="runs__field">
          <span className="runs__label">{t.account.dispatcherName}</span>
          <input
            className="runs__input"
            disabled={!permissions.canEditTargets}
            value={ui.dispatcherName}
            onChange={(event) =>
              dispatch(
                updateCarrierTargets({ dispatcherName: event.target.value }),
              )
            }
          />
        </label>
        <label className="runs__field">
          <span className="runs__label">
            {t.account.targetRate(formatMoney(ui.targetRatePerMile, 2))}
          </span>
          <input
            className="runs__input"
            type="number"
            min="0"
            max="10"
            step="0.25"
            disabled={!permissions.canEditTargets}
            value={ui.targetRatePerMile || ''}
            onChange={(event) =>
              dispatch(
                updateCarrierTargets({
                  targetRatePerMile: readNumber(event.target.value),
                }),
              )
            }
          />
        </label>
        <label className="runs__field">
          <span className="runs__label">
            {t.account.maxEmpty(ui.maxEmptyPercent)}
          </span>
          <input
            className="runs__input"
            type="number"
            min="0"
            max="80"
            step="5"
            disabled={!permissions.canEditTargets}
            value={ui.maxEmptyPercent || ''}
            onChange={(event) =>
              dispatch(
                updateCarrierTargets({
                  maxEmptyPercent: readNumber(event.target.value),
                }),
              )
            }
          />
        </label>
        <label className="runs__field">
          <span className="runs__label">
            {t.account.fuelCost}
          </span>
          <input
            className="runs__input"
            type="number"
            min="0"
            max="5"
            step="0.05"
            disabled={!permissions.canEditTargets}
            value={ui.fuelCostPerMile || ''}
            onChange={(event) =>
              dispatch(
                updateCarrierTargets({
                  fuelCostPerMile: readNumber(event.target.value),
                }),
              )
            }
          />
        </label>
        <label className="runs__field">
          <span className="runs__label">
            {t.account.driverPay}
          </span>
          <input
            className="runs__input"
            type="number"
            min="0"
            max="5"
            step="0.05"
            disabled={!permissions.canEditTargets}
            value={ui.driverPayPerMile || ''}
            onChange={(event) =>
              dispatch(
                updateCarrierTargets({
                  driverPayPerMile: readNumber(event.target.value),
                }),
              )
            }
          />
        </label>
        <label className="runs__field">
          <span className="runs__label">{t.drivers.idleSetting(ui.idleDaysAlert)}</span>
          <input
            className="runs__input"
            type="number"
            min="1"
            max="14"
            step="1"
            disabled={!permissions.canEditTargets}
            value={ui.idleDaysAlert || ''}
            onChange={(event) =>
              dispatch(updateCarrierTargets({ idleDaysAlert: readNumber(event.target.value) }))
            }
          />
        </label>
      </section>

      <section className="runs__block" aria-label={t.account.demoAria}>
        <div className="runs__load-head">
          <div>
            <h2 className="runs__subtitle">{t.account.demoTitle}</h2>
            <p className="runs__meta">{t.account.demoSub}</p>
          </div>
          <button
            type="button"
            className="runs__button runs__button--secondary"
            onClick={() => resetAllDemoData(dispatch)}
          >
            {t.account.resetDemo}
          </button>
        </div>
      </section>
    </div>
  );
}

export default Account;
