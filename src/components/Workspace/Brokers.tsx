import { customerKindLabel, t } from '../../i18n';
import { formatMoney } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectBrokerSummaries } from '../../store/selectors/runsSelectors';
import {
  invoiceCustomerLoads,
  openRun,
} from '../../store/slices/runsSlice';
import { showToast } from '../../store/slices/toastsSlice';
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
          <h1 className="workspace__title">{t.brokers.title}</h1>
          <p className="runs__meta">{t.brokers.subtitle}</p>
        </div>
      </header>

      <dl className="runs__stats" aria-label={t.brokers.kpiAria}>
        <div className="runs__stat runs__stat--blue">
          <dt>{t.brokers.activeAccounts}</dt>
          <dd>{brokers.length}</dd>
          <span className="runs__meta">{t.brokers.activeAccountsSub}</span>
        </div>
        <div className="runs__stat runs__stat--slate">
          <dt>{t.brokers.totalContracted}</dt>
          <dd>{formatMoney(totalContracted, 0)}</dd>
          <span className="runs__meta">{t.brokers.totalContractedSub}</span>
        </div>
        <div className="runs__stat runs__stat--good">
          <dt>{t.brokers.invoiced}</dt>
          <dd>{formatMoney(totalInvoiced, 0)}</dd>
          <span className="runs__meta">{t.brokers.invoicedSub}</span>
        </div>
        <div className="runs__stat runs__stat--warn">
          <dt>{t.brokers.pending}</dt>
          <dd>{formatMoney(totalPending, 0)}</dd>
          <span className="runs__meta">{t.brokers.pendingSub}</span>
        </div>
      </dl>

      <section className="runs__block" aria-label={t.brokers.directoryAria}>
        <h2 className="runs__subtitle">{t.brokers.directoryTitle}</h2>
        <ul className="runs__loads">
          {brokers.map((broker) => (
            <li key={broker.customer} className="runs__load runs__account">
              <div className="runs__account-info">
                <span className="runs__row-title">
                  <span className="runs__badge">{customerKindLabel(broker.kind)}</span>
                  <span className="runs__badge runs__badge--ok">
                    {t.brokers.credit(broker.creditScore)}
                  </span>
                </span>
                <p className="runs__truck">{broker.customer}</p>
                <p className="runs__meta">{t.brokers.terms(broker.mc, broker.terms)}</p>
                <p className="runs__meta">
                  {t.brokers.totals(
                    t.common.loadsCount(broker.loadsCount),
                    formatMoney(broker.totalRevenue, 0),
                    formatMoney(broker.invoicedRevenue, 0),
                    formatMoney(broker.pendingRevenue, 0),
                  )}
                </p>
              </div>
              <span
                className={`runs__badge runs__account-status runs__badge--${broker.pendingRevenue > 0 ? 'warn' : 'ok'}`}
              >
                {broker.pendingRevenue > 0
                  ? t.brokers.pendingBadge(formatMoney(broker.pendingRevenue, 0))
                  : t.brokers.allBilled}
              </span>
              <div className="runs__load-actions runs__account-actions">
                {broker.readyToInvoiceCount > 0 && (
                  <button
                    type="button"
                    className="runs__button runs__button--small"
                    onClick={() => {
                      dispatch(invoiceCustomerLoads(broker.customer));
                      dispatch(showToast('success', t.notify.invoiced(broker.customer)));
                    }}
                  >
                    {t.brokers.createInvoice}
                  </button>
                )}
                <button
                  type="button"
                  className="runs__button runs__button--secondary runs__button--small"
                  onClick={() => {
                    dispatch(openRun(broker.primaryRunId));
                    dispatch(setActiveSection('board'));
                  }}
                >
                  {t.brokers.viewRun(broker.primaryTruck)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Brokers;
