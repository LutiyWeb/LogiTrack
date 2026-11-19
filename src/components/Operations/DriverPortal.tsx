import { facilityKey } from '../../operations/facilities';
import { useState } from 'react';
import {
  buildDriverRows,
  seedDrivers,
  CURRENT_WEEK,
} from '../../drivers/drivers';
import { formatMiles, formatMoney, formatWhen } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectEnrichedRuns } from '../../store/selectors/runsSelectors';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { updateLoadStatus } from '../../store/slices/runsSlice';
import { LoadStatusSelect } from '../Workspace/RunVisuals';
import StatTile from '../Workspace/StatTile';
import LoadOperations from './LoadOperations';
import { InspectionForm, InspectionHistory } from './Fleet';

export default function DriverPortal() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const runs = useAppSelector(selectEnrichedRuns).filter(
    (item) => item.run.driver === user?.name,
  );
  const state = useAppSelector((state) => state);
  const [inspectionAsset, setInspectionAsset] = useState('');
  if (user?.role !== 'driver') return null;
  const row = buildDriverRows(
    seedDrivers.filter((driver) => driver.name === user.name),
    runs,
    state.ui.driverPayPerMile,
    state.drivers.paidThisWeek,
    state.drivers.paidAmounts,
    state.operations.adjustments,
  )[0];
  const assets = state.operations.assets.filter((asset) =>
    runs.some(
      (item) =>
        item.run.truck === asset.number || item.run.trailerId === asset.id,
    ),
  );
  return (
    <div className="runs operations">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">Моє завдання та виплати</h1>
          <p className="runs__meta">
            {user.name} · {CURRENT_WEEK}
          </p>
        </div>
      </header>
      <dl className="runs__stats runs__stats--kpi">
        <StatTile
          label="Підтверджений пробіг"
          value={formatMiles(row?.weekMiles ?? 0)}
        />
        <StatTile
          label="Нараховано"
          value={formatMoney(row?.weekPay ?? 0, 2)}
        />
        <StatTile
          label="Виплачено"
          value={formatMoney(row?.paidAmount ?? 0, 2)}
        />
        <StatTile
          label="Залишок до виплати"
          value={formatMoney(row?.due ?? 0, 2)}
        />
      </dl>
      <section className="runs__block" aria-label="Мій розрахунковий лист">
        <h2 className="runs__subtitle">Розрахунковий лист</h2>
        <p className="runs__meta">
          Ставка {formatMoney(state.ui.driverPayPerMile, 2)}/милю. Майбутній
          пробіг показано лише в прогнозі.
        </p>
        <ul className="runs__driver-runs">
          {row?.earnings.map((entry) => (
            <li key={entry.id} className="runs__meta">
              {entry.from} → {entry.to} ·{' '}
              {entry.miles === null
                ? 'Пробіг потребує уточнення'
                : formatMiles(entry.miles)}{' '}
              · {entry.basis}
            </li>
          ))}
          {row?.adjustments.map((adjustment) => (
            <li key={adjustment.id} className="runs__meta">
              {formatMoney(adjustment.amountCents / 100, 2)} ·{' '}
              {adjustment.reason} · {adjustment.approvedBy}
            </li>
          ))}
        </ul>
        <p className="runs__meta">
          Прогноз: {formatMiles(row?.forecastMiles ?? 0)} ·{' '}
          {formatMoney(row?.forecastPay ?? 0, 2)}. Це не сума до виплати.
        </p>
        {state.drivers.payments
          ?.filter((payment) => payment.driver === user.name)
          .map((payment) => (
            <p key={payment.id} className="runs__meta">
              Виплата {formatMoney(payment.amount, 2)} ·{' '}
              {formatWhen(payment.at)} · {payment.author}
            </p>
          ))}
      </section>
      <section className="runs__block">
        <h2 className="runs__subtitle">Мої вантажі</h2>
        {!runs.length && <p className="runs__note">Активних завдань немає.</p>}
        {runs.map((item) => (
          <div key={item.run.id}>
            <h3 className="runs__subtitle">{item.run.truck}</h3>
            <ul className="runs__loads">
              {item.run.loads.map((load) => (
                <li className="runs__load" key={load.id}>
                  <p className="runs__truck">
                    {load.customer} · {load.loadNumber || load.bol}
                  </p>
                  <p className="runs__meta">
                    Завантаження: {load.pickup.address || load.pickup.place},{' '}
                    {load.pickup.city}, {load.pickup.state} ·{' '}
                    {formatWhen(load.pickup.at)} ·{' '}
                    {load.pickup.timeZone || 'місцевий час'}
                  </p>
                  <p className="runs__meta">
                    Доставка: {load.delivery.address || load.delivery.place},{' '}
                    {load.delivery.city}, {load.delivery.state} ·{' '}
                    {formatWhen(load.delivery.at)} ·{' '}
                    {load.delivery.timeZone || 'місцевий час'}
                  </p>
                  {load.specialInstructions && (
                    <p className="runs__note">
                      Інструкції: {load.specialInstructions}
                    </p>
                  )}
                  {state.operations.facilities
                    .filter((facility) =>
                      [
                        facilityKey(load.pickup),
                        facilityKey(load.delivery),
                      ].includes(facility.id),
                    )
                    .map((facility) =>
                      facility.instructions ||
                      facility.contact ||
                      facility.phone ? (
                        <p className="runs__note" key={facility.id}>
                          {facility.name} · {facility.contact} ·{' '}
                          {facility.phone}
                          <br />
                          {facility.instructions}
                        </p>
                      ) : null,
                    )}
                  <LoadStatusSelect
                    status={load.status}
                    ariaLabel={`Мій статус ${load.customer}`}
                    disabled={load.billingStatus === 'Invoiced'}
                    onChange={(status) =>
                      dispatch(
                        updateLoadStatus({
                          runId: item.run.id,
                          loadId: load.id,
                          status,
                        }),
                      )
                    }
                  />
                  <LoadOperations runId={item.run.id} load={load} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="runs__block">
        <h2 className="runs__subtitle">Мій передрейсовий огляд</h2>
        <label className="runs__field">
          <span className="runs__label">Моя техніка</span>
          <select
            className="runs__input"
            value={inspectionAsset}
            onChange={(event) => setInspectionAsset(event.target.value)}
          >
            <option value="">Оберіть тягач або причіп</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.number}
              </option>
            ))}
          </select>
        </label>
        {inspectionAsset && (
          <InspectionForm
            key={inspectionAsset}
            assetId={inspectionAsset}
            onDone={() => setInspectionAsset('')}
          />
        )}
        <InspectionHistory
          inspections={state.operations.inspections.filter(
            (inspection) => inspection.driver === user.name,
          )}
        />
      </section>
    </div>
  );
}
