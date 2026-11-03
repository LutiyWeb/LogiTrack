import { formatMoney } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectBrokerSummaries } from '../../store/selectors/runsSelectors';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';

function Brokers() {
  const dispatch = useAppDispatch();
  const brokers = useAppSelector(selectBrokerSummaries);

  const totalContracted = brokers.reduce((s, b) => s + b.totalRevenue, 0);
  const totalInvoiced = brokers.reduce((s, b) => s + b.invoicedRevenue, 0);
  const totalPending = brokers.reduce((s, b) => s + b.pendingRevenue, 0);

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">Brokers & billing CRM</h1>
          <p className="runs__meta">
            Approved freight brokers, credit ratings & accounts receivable
          </p>
        </div>
      </header>

      <dl className="runs__stats" aria-label="Broker KPIs">
        <div className="runs__stat runs__stat--blue">
          <dt>Active brokers</dt>
          <dd>{brokers.length}</dd>
          <span className="runs__meta">Verified MC authority</span>
        </div>
        <div className="runs__stat runs__stat--slate">
          <dt>Total contracted</dt>
          <dd>{formatMoney(totalContracted, 0)}</dd>
          <span className="runs__meta">All active & completed loads</span>
        </div>
        <div className="runs__stat runs__stat--blue">
          <dt>Invoiced / Billed</dt>
          <dd>{formatMoney(totalInvoiced, 0)}</dd>
          <span className="runs__meta">Sent to factoring / QuickPay</span>
        </div>
        <div className="runs__stat runs__stat--slate">
          <dt>Pending POD / Unbilled</dt>
          <dd>{formatMoney(totalPending, 0)}</dd>
          <span className="runs__meta">Awaiting delivery or invoice</span>
        </div>
      </dl>

      <section className="runs__block" aria-label="Broker directory">
        <h2 className="runs__subtitle">Customer & broker accounts</h2>
        <ul className="runs__loads">
          {brokers.map((broker) => (
            <li key={broker.customer} className="runs__load">
              <div className="runs__load-head">
                <div>
                  <span className="runs__badge runs__badge--ok">
                    Credit {broker.creditScore}
                  </span>
                  <p className="runs__truck">{broker.customer}</p>
                  <p className="runs__meta">
                    {broker.mc} · Terms: {broker.terms}
                  </p>
                </div>
                <div className="runs__load-actions">
                  {broker.pendingRevenue > 0 ? (
                    <span className="runs__badge runs__badge--warn">
                      Pending {formatMoney(broker.pendingRevenue, 0)}
                    </span>
                  ) : (
                    <span className="runs__badge runs__badge--ok">
                      All billed
                    </span>
                  )}
                  <button
                    type="button"
                    className="runs__button runs__button--ghost runs__button--small"
                    onClick={() => {
                      dispatch(openRun(broker.primaryRunId));
                      dispatch(setActiveSection('board'));
                    }}
                  >
                    View run ({broker.primaryTruck})
                  </button>
                </div>
              </div>
              <p className="runs__meta">
                {broker.loadsCount === 1
                  ? '1 load'
                  : `${broker.loadsCount} loads`}{' '}
                · Total {formatMoney(broker.totalRevenue, 0)} · Invoiced{' '}
                {formatMoney(broker.invoicedRevenue, 0)} · Pending{' '}
                {formatMoney(broker.pendingRevenue, 0)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Brokers;
