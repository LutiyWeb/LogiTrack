import { useState } from 'react';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import FormHead from './FormHead';
import NumberField from './NumberField';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { t } from '../../i18n';
import { formatMoney } from '../../runs/seed';
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
  const isMobile = useIsMobile();
  const [showAllProfile, setShowAllProfile] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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
        <FormHead title={t.account.targetsTitle} hint={t.account.targetsSub} />
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
            aria-invalid={!ui.dispatcherName.trim()}
            value={ui.dispatcherName}
            onChange={(event) =>
              dispatch(updateCarrierTargets({ dispatcherName: event.target.value }))
            }
          />
          {!ui.dispatcherName.trim() && (
            <span className="runs__field-error">{t.validation.nameRequired}</span>
          )}
        </label>
        <NumberField
          label={t.account.targetRate(formatMoney(ui.targetRatePerMile, 2))}
          value={ui.targetRatePerMile}
          min={0}
          max={20}
          exclusiveMin
          step="0.25"
          disabled={!permissions.canEditTargets}
          onCommit={(targetRatePerMile) => dispatch(updateCarrierTargets({ targetRatePerMile }))}
        />
        <NumberField
          label={t.account.maxEmpty(ui.maxEmptyPercent)}
          value={ui.maxEmptyPercent}
          min={0}
          max={100}
          integer
          step="5"
          disabled={!permissions.canEditTargets}
          onCommit={(maxEmptyPercent) => dispatch(updateCarrierTargets({ maxEmptyPercent }))}
        />
        <NumberField
          label={t.account.fuelCost}
          value={ui.fuelCostPerMile}
          min={0}
          max={5}
          step="0.05"
          disabled={!permissions.canEditTargets}
          onCommit={(fuelCostPerMile) => dispatch(updateCarrierTargets({ fuelCostPerMile }))}
        />
        <NumberField
          label={t.account.driverPay}
          value={ui.driverPayPerMile}
          min={0}
          max={5}
          step="0.05"
          disabled={!permissions.canEditTargets}
          onCommit={(driverPayPerMile) => dispatch(updateCarrierTargets({ driverPayPerMile }))}
        />
        <NumberField
          label={t.drivers.idleSetting(ui.idleDaysAlert)}
          value={ui.idleDaysAlert}
          min={1}
          max={14}
          integer
          step="1"
          disabled={!permissions.canEditTargets}
          onCommit={(idleDaysAlert) => dispatch(updateCarrierTargets({ idleDaysAlert }))}
        />
      </section>

      {permissions.canResetData && (
        <section className="runs__block" aria-label={t.account.dataAria}>
          <div className="runs__form-head">
            <div>
              <h2 className="runs__subtitle">{t.account.dataTitle}</h2>
              <p className="runs__meta">{t.account.dataSub}</p>
            </div>
            <button
              type="button"
              className="runs__button runs__button--secondary runs__button--block"
              onClick={() => setConfirmReset(true)}
            >
              {t.account.resetData}
            </button>
          </div>
        </section>
      )}
      {confirmReset && (
        <ConfirmDialog
          title={t.account.resetTitle}
          text={t.account.resetText}
          confirmLabel={t.account.resetConfirm}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            resetAllData(dispatch);
          }}
        />
      )}
    </div>
  );
}

export default Account;
