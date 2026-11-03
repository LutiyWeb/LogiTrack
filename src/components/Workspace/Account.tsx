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
          <h1 className="workspace__title">Account</h1>
          <p className="runs__meta">
            Dispatcher profile, carrier operating standards & demo controls
          </p>
        </div>
        <button
          type="button"
          className="runs__button runs__button--ghost runs__button--small"
          onClick={() => dispatch(logout())}
        >
          Sign out
        </button>
      </header>

      <section className="runs__block" aria-label="Carrier profile">
        <h2 className="runs__subtitle">Carrier & dispatcher profile</h2>
        <div className="runs__stats">
          <div className="runs__stat runs__stat--blue">
            <dt>Carrier</dt>
            <dd className="runs__stat-text">{carrierProfile.carrierName}</dd>
            <span className="runs__meta">{carrierProfile.mcNumber}</span>
          </div>
          <div className="runs__stat runs__stat--slate">
            <dt>DOT authority</dt>
            <dd className="runs__stat-text">{carrierProfile.dotNumber}</dd>
            <span className="runs__meta">Active interstate carrier</span>
          </div>
          <div className="runs__stat runs__stat--blue">
            <dt>Home terminal</dt>
            <dd className="runs__stat-text">{carrierProfile.homeYard}</dd>
            <span className="runs__meta">Midwest dispatch region</span>
          </div>
          <div className="runs__stat runs__stat--slate">
            <dt>Signed in user</dt>
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

      <section className="runs__form" aria-label="Dispatch targets">
        <div className="runs__form-head">
          <h2 className="runs__subtitle">Dispatch profitability targets</h2>
          <span className="runs__meta">
            Used across Runs and Overview to flag high deadhead or low-rate
            loads
          </span>
        </div>
        {!permissions.canEditTargets && (
          <p className="runs__note runs__form-head">
            Read-only for your role · Only Fleet Manager can modify company
            profitability targets
          </p>
        )}
        <label className="runs__field">
          <span className="runs__label">Dispatcher name</span>
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
            Target rate per mile ({formatMoney(ui.targetRatePerMile, 2)}/mi)
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
            Max empty miles threshold ({ui.maxEmptyPercent}%)
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
            Fuel cost per mile ($/mi)
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
            Driver pay per mile ($/mi)
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
      </section>

      <section className="runs__block" aria-label="Demo controls">
        <div className="runs__load-head">
          <div>
            <h2 className="runs__subtitle">Demo environment controls</h2>
            <p className="runs__meta">
              Restore all runs, loads, and settings to the initial presentation
              state (Truck 214 before backhaul assignment).
            </p>
          </div>
          <button
            type="button"
            className="runs__button"
            onClick={() => resetAllDemoData(dispatch)}
          >
            Reset Demo Data
          </button>
        </div>
      </section>
    </div>
  );
}

export default Account;
