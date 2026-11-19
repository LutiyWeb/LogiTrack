import { useState } from 'react';
import { csv } from '../../integrations/adapters';
import { integrationFixtures } from '../../integrations/fixtures';
import {
  invoiceTotal,
  invoicePaid,
  invoiceBalance,
} from '../../billing/billing';
import { formatMoney, formatWhen } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { importIntegration } from '../../store/integrations';
import { Field } from './LoadOperations';

function downloadCsv(name: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(
    new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Integrations() {
  const dispatch = useAppDispatch();
  const invoices = useAppSelector((state) => state.runs.invoices);
  const operations = useAppSelector((state) => state.operations);
  const [input, setInput] = useState(() =>
    JSON.stringify(integrationFixtures.payments, null, 2),
  );
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const keys = Object.keys(
    integrationFixtures,
  ) as (keyof typeof integrationFixtures)[];
  const labels = {
    payments: 'Бухгалтерія / платежі',
    telemetry: 'GPS',
    eld: 'ELD / години',
    fuel: 'Паливні картки',
    mileage: 'Пробіг за штатами',
  };
  const states = [
    ...new Set([
      ...operations.fuel.map((item) => item.state),
      ...operations.stateMileage.map((item) => item.state),
    ]),
  ];
  return (
    <div className="runs operations">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">Інтеграції</h1>
          <p className="runs__meta">
            Тестові адаптери. Зовнішні провайдери ще не підключені. Пакет
            перевіряється повністю до застосування; повторні зовнішні id не
            дублюють дані.
          </p>
        </div>
      </header>
      <section className="runs__block">
        <h2 className="runs__subtitle">Імпорт тестових даних</h2>
        <div className="runs__load-actions">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              className="runs__button runs__button--secondary runs__button--small"
              onClick={() => {
                setInput(JSON.stringify(integrationFixtures[key], null, 2));
                setResult(null);
              }}
            >
              {labels[key]}
            </button>
          ))}
        </div>
        <form
          className="runs__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            try {
              setResult(dispatch(importIntegration(JSON.parse(input))));
            } catch {
              setResult({
                ok: false,
                message: 'Не вдалося прочитати JSON. Перевірте синтаксис.',
              });
            }
          }}
        >
          <Field label="Пакет адаптера (JSON)">
            <textarea
              className="runs__input runs__textarea"
              rows={12}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
          <button
            className="runs__button runs__button--secondary"
            type="submit"
          >
            Перевірити та імпортувати
          </button>
          {result && (
            <p
              role={result.ok ? 'status' : 'alert'}
              className={result.ok ? 'runs__note' : 'runs__field-error'}
            >
              {result.message}
            </p>
          )}
        </form>
      </section>
      <section className="runs__block">
        <h2 className="runs__subtitle">Вивантаження для бухгалтерії</h2>
        <div className="runs__load-actions">
          <button
            type="button"
            className="runs__button runs__button--secondary"
            onClick={() =>
              downloadCsv('logitrack-invoices.csv', [
                [
                  'Invoice',
                  'Customer',
                  'Issued',
                  'Due',
                  'Amount USD',
                  'Paid USD',
                  'Balance USD',
                ],
                ...invoices.map((invoice) => [
                  invoice.number,
                  invoice.customer,
                  invoice.issuedOn,
                  invoice.dueOn,
                  invoiceTotal(invoice) / 100,
                  invoicePaid(invoice) / 100,
                  invoiceBalance(invoice) / 100,
                ]),
              ])
            }
          >
            Експорт рахунків CSV
          </button>
          <button
            type="button"
            className="runs__button runs__button--secondary"
            onClick={() =>
              downloadCsv('logitrack-payments.csv', [
                [
                  'Invoice',
                  'Date',
                  'Amount USD',
                  'Method',
                  'Reference',
                  'Recorded by',
                ],
                ...invoices.flatMap((invoice) =>
                  invoice.payments.map((payment) => [
                    invoice.number,
                    payment.date,
                    payment.amountCents / 100,
                    payment.method,
                    payment.reference,
                    payment.recordedBy,
                  ]),
                ),
              ])
            }
          >
            Експорт платежів CSV
          </button>
        </div>
      </section>
      <section className="runs__block">
        <h2 className="runs__subtitle">Пальне та пробіг за штатами</h2>
        <p className="runs__meta">
          Дані для звірки та майбутньої IFTA-інтеграції. Податкова декларація та
          ставки податків тут не розраховуються.
        </p>
        <ul className="runs__driver-runs">
          {states.map((usState) => (
            <li key={usState} className="runs__meta">
              {usState} ·{' '}
              {operations.stateMileage
                .filter((item) => item.state === usState)
                .reduce((sum, item) => sum + item.miles, 0)}{' '}
              миль ·{' '}
              {operations.fuel
                .filter((item) => item.state === usState)
                .reduce((sum, item) => sum + item.gallons, 0)}{' '}
              gal ·{' '}
              {formatMoney(
                operations.fuel
                  .filter((item) => item.state === usState)
                  .reduce((sum, item) => sum + item.amountCents, 0) / 100,
                2,
              )}
            </li>
          ))}
        </ul>
        <button
          className="runs__button runs__button--secondary"
          type="button"
          onClick={() =>
            downloadCsv('logitrack-fuel.csv', [
              ['Truck', 'Date', 'State', 'Gallons', 'USD', 'Source'],
              ...operations.fuel.map((item) => [
                item.truck,
                item.date,
                item.state,
                item.gallons,
                item.amountCents / 100,
                item.source,
              ]),
            ])
          }
        >
          Експорт пального CSV
        </button>
      </section>
      <section className="runs__block">
        <h2 className="runs__subtitle">Дані ELD</h2>
        <ul className="runs__driver-runs">
          {operations.eld.map((item) => (
            <li key={item.driver} className="runs__meta">
              {item.driver} · {item.drivingHoursLeft} год водіння ·{' '}
              {item.windowHoursLeft} год у вікні зміни · {item.cycleHoursLeft}{' '}
              год тижневого ліміту · {item.at} · {item.source}
            </li>
          ))}
        </ul>
      </section>
      <section className="runs__block">
        <h2 className="runs__subtitle">Журнал обміну</h2>
        <ul className="runs__driver-runs">
          {operations.integrations.map((event) => (
            <li
              key={event.id}
              className={`runs__meta ${event.status === 'Rejected' ? 'runs__meta--danger' : ''}`}
            >
              {event.source} · {event.kind} · {formatWhen(event.at)} ·{' '}
              {event.status === 'Applied' ? 'Застосовано' : 'Відхилено'} ·{' '}
              {event.detail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
