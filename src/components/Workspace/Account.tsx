import { useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { t } from '../../i18n';
import { formatMoney, readNumber } from '../../runs/seed';
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
import { resetAllData } from '../../store/store';
import StatTile from './StatTile';

function Account() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((state) => state.ui);
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [showAllProfile, setShowAllProfile] = useState(false);

  return (
    <div className="runs">
      <header className="runs__heading runs__heading--with-action">
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
        <dl className="runs__stats runs__stats--kpi">
          <StatTile
            label={t.account.carrier}
            value={carrierProfile.carrierName}
            valueClassName="runs__stat-text"
            meta={carrierProfile.mcNumber}
          />
          {(!isMobile || showAllProfile) && (
            <>
              <StatTile
                label={t.account.dot}
                value={carrierProfile.dotNumber}
                valueClassName="runs__stat-text"
                meta={t.account.dotSub}
              />
              <StatTile
                label={t.account.homeTerminal}
                value={carrierProfile.homeYard}
                valueClassName="runs__stat-text"
                meta={t.account.homeTerminalSub}
              />
            </>
          )}
          <StatTile
            label={t.account.signedIn}
            value={currentUser?.name ?? ui.dispatcherName}
            valueClassName="runs__stat-text"
            meta={`${currentUser?.roleTitle ?? carrierProfile.dispatcherRole}${currentUser ? ` · ${currentUser.email}` : ''}`}
          />
        </dl>
        {isMobile && (
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small runs__button--block"
            aria-expanded={showAllProfile}
            onClick={() => setShowAllProfile((value) => !value)}
          >
            {showAllProfile ? t.account.showLess : t.account.showAll}
          </button>
        )}
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

      <section className="runs__block" aria-label={t.account.dataAria}>
        <div className="runs__form-head">
          <div>
            <h2 className="runs__subtitle">{t.account.dataTitle}</h2>
            <p className="runs__meta">{t.account.dataSub}</p>
          </div>
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--block"
            onClick={() => resetAllData(dispatch)}
          >
            {t.account.resetData}
          </button>
        </div>
      </section>
    </div>
  );
}

export default Account;
