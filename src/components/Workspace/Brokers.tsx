import { customerKindLabel, t } from '../../i18n';
import { getBrokerInfo, formatMoney } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectBrokerSummaries } from '../../store/selectors/runsSelectors';
import {
  invoiceCustomerLoads,
  issueLoadSupplement,
  openRun,
} from '../../store/slices/runsSlice';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import InvoiceLedger from '../Billing/InvoiceLedger';
import StatTile from './StatTile';

function Brokers() {
  const dispatch = useAppDispatch();
  const brokers = useAppSelector(selectBrokerSummaries);
  const runs = useAppSelector((state) => state.runs.runs);
  const user = useAppSelector(selectCurrentUser);
  const sum = (
    key:
      | 'plannedRevenue'
      | 'pendingRevenue'
      | 'outstandingRevenue'
      | 'paidRevenue',
  ) => brokers.reduce((total, broker) => total + broker[key], 0);
  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.brokers.title}</h1>
          <p className="runs__meta">
            Від плану доставки до повної оплати. Виставлений рахунок залишається
            боргом до отримання платежу.
          </p>
        </div>
      </header>
      <dl
        className="runs__stats runs__stats--kpi"
        aria-label={t.brokers.kpiAria}
      >
        <StatTile
          label="Очікувана виручка"
          value={formatMoney(sum('plannedRevenue'), 2)}
          meta="Вантажі ще не доставлено"
        />
        <StatTile
          label="Доставлено без рахунку"
          value={formatMoney(sum('pendingRevenue'), 2)}
          meta="Включно з доплатами, ще не внесеними до рахунку"
        />
        <StatTile
          label="Відкритий борг"
          value={formatMoney(sum('outstandingRevenue'), 2)}
          meta="Виставлено та ще не оплачено"
        />
        <StatTile
          label="Отримано коштів"
          value={formatMoney(sum('paidRevenue'), 2)}
          meta="Лише зареєстровані платежі"
        />
      </dl>
      <InvoiceLedger />
      <section className="runs__block" aria-label={t.brokers.directoryAria}>
        <h2 className="runs__subtitle">{t.brokers.directoryTitle}</h2>
        <ul className="runs__loads">
          {brokers.map((broker) => (
            <li key={broker.customer} className="runs__load runs__account">
              <div className="runs__account-info">
                <span className="runs__badge">
                  {customerKindLabel(broker.kind)}
                </span>
                <p className="runs__truck">{broker.customer}</p>
                <p className="runs__meta">
                  {t.brokers.terms(broker.mc, broker.terms)}
                </p>
                <p className="runs__meta">
                  Рейтинг: {broker.creditScore} · Джерело:{' '}
                  {getBrokerInfo(broker.customer).creditSource ??
                    'Демонстраційні дані'}
                  {getBrokerInfo(broker.customer).creditCheckedAt
                    ? ` · ${getBrokerInfo(broker.customer).creditCheckedAt}`
                    : ' · Дата зовнішньої перевірки не задана'}
                </p>
                <p className="runs__meta">
                  {t.common.loadsCount(broker.loadsCount)} · За договорами{' '}
                  {formatMoney(broker.totalRevenue, 2)} · Виставлено{' '}
                  {formatMoney(broker.invoicedRevenue, 2)} · Отримано{' '}
                  {formatMoney(broker.paidRevenue, 2)}
                </p>
                <p className="runs__meta">
                  Очікується доставка {formatMoney(broker.plannedRevenue, 2)} ·
                  Без рахунку {formatMoney(broker.pendingRevenue, 2)}
                </p>
                {broker.overdueRevenue > 0 && (
                  <p className="runs__meta runs__meta--danger">
                    Прострочено {formatMoney(broker.overdueRevenue, 2)}
                  </p>
                )}
              </div>
              <span
                className={`runs__badge runs__account-status runs__badge--${broker.outstandingRevenue > 0 ? 'warn' : 'ok'}`}
              >
                Відкритий борг {formatMoney(broker.outstandingRevenue, 2)}
              </span>
              <div className="runs__load-actions runs__account-actions">
                {broker.readyToInvoiceCount > 0 && (
                  <button
                    type="button"
                    className="runs__button runs__button--small"
                    onClick={() => {
                      dispatch(
                        invoiceCustomerLoads({
                          customer: broker.customer,
                          author: user?.name ?? 'Диспетчер',
                        }),
                      );
                      for (const run of runs)
                        for (const load of run.loads)
                          if (
                            load.customer.trim() === broker.customer &&
                            load.billingStatus === 'Invoiced'
                          )
                            dispatch(
                              issueLoadSupplement({
                                runId: run.id,
                                loadId: load.id,
                                author: user?.name ?? 'Диспетчер',
                              }),
                            );
                      dispatch(
                        showToast(
                          'success',
                          t.notify.invoiced(broker.customer),
                        ),
                      );
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
