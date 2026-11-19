import DateField from '../DateField/DateField';
import { useState } from 'react';
import {
  toCents,
  validDate,
  displayDate,
  invoiceBalance,
  invoiceOverdue,
  invoicePaid,
  invoiceTotal,
  paymentError,
  type Invoice,
  type PaymentInput,
} from '../../billing/billing';
import { formatMoney, SEED_NOW } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import { openRun, recordInvoiceFactoring } from '../../store/slices/runsSlice';
import { setActiveSection, setInvoiceFilter } from '../../store/slices/uiSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { DocumentLink, Field } from '../Operations/LoadOperations';
import { recordPayment } from '../../store/payments';

const methods = {
  'Bank transfer': 'Банківський переказ',
  Check: 'Чек',
  Cash: 'Готівка',
  Other: 'Інше',
} as const;

export default function InvoiceLedger() {
  const documents = useAppSelector((state) => state.operations.documents);
  const [factoringId, setFactoringId] = useState<string | null>(null);
  const invoices = useAppSelector((state) => state.runs.invoices);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const canRecordPayment = useAppSelector(selectPermissions).canViewFinance;
  const filter = useAppSelector((state) => state.ui.invoiceFilter);
  const setFilter = (value: 'open' | 'overdue' | 'all') =>
    dispatch(setInvoiceFilter(value));
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const visible = invoices.filter(
    (invoice) =>
      filter === 'all' ||
      (filter === 'overdue'
        ? invoiceOverdue(invoice)
        : invoiceBalance(invoice) > 0),
  );
  return (
    <section className="runs__block operations" aria-label="Реєстр рахунків">
      <div className="runs__form-head">
        <h2 className="runs__subtitle">Реєстр рахунків</h2>
        <span className="runs__meta">
          День демо: {displayDate(SEED_NOW.slice(0, 10))}
        </span>
      </div>
      <div
        className="runs__filters runs__filters--inline runs__filters--scroll"
        role="group"
        aria-label="Фільтр рахунків"
      >
        {(['open', 'overdue', 'all'] as const).map((value) => (
          <button
            key={value}
            className={`runs__filter ${filter === value ? 'is-active' : ''}`}
            type="button"
            onClick={() => setFilter(value)}
          >
            {
              {
                open: 'Не оплачені',
                overdue: 'Прострочені',
                all: 'Усі рахунки',
              }[value]
            }{' '}
            (
            {
              invoices.filter(
                (invoice) =>
                  value === 'all' ||
                  (value === 'overdue'
                    ? invoiceOverdue(invoice)
                    : invoiceBalance(invoice) > 0),
              ).length
            }
            )
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="runs__note">У цій черзі рахунків немає.</p>
      )}
      <ul className="runs__loads">
        {visible.map((invoice) => (
          <li
            key={invoice.id}
            className="runs__load"
            aria-label={`Рахунок ${invoice.number}`}
          >
            <div className="runs__load-head">
              <p className="runs__truck">
                {invoice.number} · {invoice.customer}
              </p>
              <span
                className={`runs__badge runs__badge--${invoiceBalance(invoice) === 0 ? 'ok' : invoiceOverdue(invoice) ? 'danger' : 'warn'}`}
              >
                {invoiceBalance(invoice) === 0
                  ? 'Оплачено'
                  : invoiceOverdue(invoice)
                    ? 'Прострочено'
                    : invoicePaid(invoice) > 0
                      ? 'Частково оплачено'
                      : 'Очікує оплати'}
              </span>
            </div>
            <p className="runs__meta">
              Виставлено {displayDate(invoice.issuedOn)} · Оплатити до{' '}
              {displayDate(invoice.dueOn)} · {invoice.createdBy}
            </p>
            <p className="runs__meta">
              Сума {formatMoney(invoiceTotal(invoice) / 100, 2)} · Отримано{' '}
              {formatMoney(invoicePaid(invoice) / 100, 2)} ·{' '}
              <strong>
                Залишок {formatMoney(invoiceBalance(invoice) / 100, 2)}
              </strong>
            </p>
            {invoice.factoring && (
              <p className="runs__meta">
                Факторинг: {invoice.factoring.company} · Номінал{' '}
                {formatMoney(invoiceTotal(invoice) / 100, 2)} · Комісія{' '}
                {formatMoney(invoice.factoring.feeCents / 100, 2)} · Аванс{' '}
                {formatMoney(invoice.factoring.advanceCents / 100, 2)} · Резерв{' '}
                {formatMoney(
                  (invoiceTotal(invoice) -
                    invoice.factoring.feeCents -
                    invoice.factoring.advanceCents) /
                    100,
                  2,
                )}{' '}
                · {invoice.factoring.reference}
              </p>
            )}
            {(invoice.documentIds ?? []).map((id) => {
              const document = documents.find((doc) => doc.id === id);
              return document ? (
                <p key={id} className="runs__meta">
                  POD: <DocumentLink document={document} />
                </p>
              ) : null;
            })}
            <details>
              <summary className="runs__label">
                Рядки рахунку та історія оплат
              </summary>
              <ul className="runs__driver-runs">
                {invoice.lines.map((line, index) => (
                  <li key={index} className="runs__meta">
                    {line.description} ·{' '}
                    {formatMoney(line.amountCents / 100, 2)}
                  </li>
                ))}
              </ul>
              {invoice.payments.length ? (
                <ol className="runs__driver-runs">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id} className="runs__meta">
                      {displayDate(payment.date)} ·{' '}
                      {formatMoney(payment.amountCents / 100, 2)} ·{' '}
                      {methods[payment.method]} · {payment.reference} ·{' '}
                      {payment.recordedBy}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="runs__meta">
                  Платежів ще немає. Виставлення рахунку не означає отримання
                  грошей.
                </p>
              )}
            </details>
            <div className="runs__load-actions">
              <button
                type="button"
                className="runs__button runs__button--secondary runs__button--small"
                onClick={() => {
                  dispatch(openRun(invoice.runId));
                  dispatch(setActiveSection('board'));
                }}
              >
                Відкрити вантаж
              </button>
              {canRecordPayment && invoiceBalance(invoice) > 0 && (
                <button
                  type="button"
                  className={`runs__button runs__button--secondary runs__button--small ${paymentId === invoice.id ? 'is-active' : ''}`}
                  aria-expanded={paymentId === invoice.id}
                  onClick={() =>
                    setPaymentId((value) =>
                      value === invoice.id ? null : invoice.id,
                    )
                  }
                >
                  Зареєструвати платіж
                </button>
              )}
            </div>
            {canRecordPayment &&
              !invoice.factoring &&
              invoicePaid(invoice) === 0 && (
                <button
                  type="button"
                  className={`runs__button runs__button--tertiary runs__button--small ${factoringId === invoice.id ? 'is-active' : ''}`}
                  aria-expanded={factoringId === invoice.id}
                  onClick={() =>
                    setFactoringId((value) =>
                      value === invoice.id ? null : invoice.id,
                    )
                  }
                >
                  Облік факторингу
                </button>
              )}
            {factoringId === invoice.id && !invoice.factoring && (
              <FactoringForm
                invoice={invoice}
                author={user?.name ?? ''}
                onClose={() => setFactoringId(null)}
              />
            )}
            {paymentId === invoice.id && canRecordPayment && (
              <PaymentForm
                key={invoice.id}
                invoice={invoice}
                author={user?.name ?? 'Менеджер'}
                onClose={() => setPaymentId(null)}
              />
            )}
          </li>
        ))}
      </ul>
      {!canRecordPayment && (
        <p className="runs__meta">
          Реєстрація отриманих платежів доступна менеджеру автопарку.
        </p>
      )}
    </section>
  );
}

function PaymentForm({
  invoice,
  author,
  onClose,
}: {
  invoice: Invoice;
  author: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [id] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState<PaymentInput>({
    amount: '',
    date: SEED_NOW.slice(0, 10),
    method: 'Bank transfer',
    reference: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const error = serverError || (submitted ? paymentError(input, invoice) : '');
  const patch = (values: Partial<PaymentInput>) => {
    setInput((current) => ({ ...current, ...values }));
    setServerError('');
  };
  return (
    <form
      className="runs__form"
      aria-label={`Платіж за ${invoice.number}`}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        const message = dispatch(recordPayment(invoice.id, input, id, author));
        if (message) {
          setServerError(message);
          return;
        }
        dispatch(
          showToast(
            'success',
            'Платіж зареєстровано. Залишок боргу перераховано.',
          ),
        );
        onClose();
      }}
      noValidate
    >
      <label className="runs__field">
        <span className="runs__label">Сума платежу, USD</span>
        <input
          className="runs__input"
          type="number"
          min="0.01"
          max={invoiceBalance(invoice) / 100}
          step="0.01"
          value={input.amount}
          onChange={(event) => patch({ amount: event.target.value })}
        />
      </label>
      <label className="runs__field">
        <span className="runs__label">Дата платежу</span>
        <DateField
          type="date"
          min={invoice.issuedOn}
          max={SEED_NOW.slice(0, 10)}
          value={input.date}
          onValue={(date) => patch({ date })}
        />
      </label>
      <label className="runs__field">
        <span className="runs__label">Спосіб оплати</span>
        <select
          className="runs__input"
          value={input.method}
          onChange={(event) =>
            patch({ method: event.target.value as PaymentInput['method'] })
          }
        >
          {Object.entries(methods).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="runs__field">
        <span className="runs__label">Референс платежу</span>
        <input
          className="runs__input"
          maxLength={120}
          value={input.reference}
          onChange={(event) => patch({ reference: event.target.value })}
        />
      </label>
      {error && (
        <p className="runs__field-error" role="alert">
          {error}
        </p>
      )}
      <div className="runs__load-actions">
        <button className="runs__button runs__button--secondary" type="submit">
          Зберегти платіж
        </button>
        <button
          className="runs__button runs__button--tertiary"
          type="button"
          onClick={onClose}
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}

function FactoringForm({
  invoice,
  author,
  onClose,
}: {
  invoice: Invoice;
  author: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    company: '',
    fee: '',
    advance: '',
    reference: '',
    date: SEED_NOW.slice(0, 10),
  });
  const [error, setError] = useState('');
  const fee = toCents(Number(form.fee));
  const advance = toCents(Number(form.advance));
  return (
    <form
      className="runs__form"
      aria-label="Факторинг рахунку"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !form.company.trim() ||
          !form.reference.trim() ||
          !/^\d+(?:\.\d{1,2})?$/.test(form.fee) ||
          !/^\d+(?:\.\d{1,2})?$/.test(form.advance) ||
          fee + advance > invoiceTotal(invoice) ||
          !validDate(form.date) ||
          form.date < invoice.issuedOn ||
          form.date > SEED_NOW.slice(0, 10)
        ) {
          setError(
            'Заповніть факторингову компанію, референс, дату та суми. Комісія й аванс разом не можуть перевищувати номінал.',
          );
          return;
        }
        dispatch(
          recordInvoiceFactoring({
            invoiceId: invoice.id,
            agreement: {
              id: crypto.randomUUID(),
              company: form.company.trim(),
              feeCents: fee,
              advanceCents: advance,
              date: form.date,
              reference: form.reference.trim(),
              recordedBy: author,
            },
          }),
        );
        onClose();
      }}
    >
      <Field label="Факторингова компанія">
        <input
          className="runs__input"
          maxLength={120}
          value={form.company}
          onChange={(event) =>
            setForm({ ...form, company: event.target.value })
          }
        />
      </Field>
      <Field label="Комісія факторингу, USD">
        <input
          className="runs__input"
          type="number"
          min="0"
          step="0.01"
          value={form.fee}
          onChange={(event) => setForm({ ...form, fee: event.target.value })}
        />
      </Field>
      <Field label="Аванс факторингу, USD">
        <input
          className="runs__input"
          type="number"
          min="0"
          step="0.01"
          value={form.advance}
          onChange={(event) =>
            setForm({ ...form, advance: event.target.value })
          }
        />
      </Field>
      <Field label="Дата авансу">
        <DateField
          type="date"
          value={form.date}
          onValue={(date) => setForm({ ...form, date })}
        />
      </Field>
      <Field label="Референс факторингу">
        <input
          className="runs__input"
          maxLength={120}
          value={form.reference}
          onChange={(event) =>
            setForm({ ...form, reference: event.target.value })
          }
        />
      </Field>
      <p className="runs__meta">
        Резерв:{' '}
        {formatMoney(
          Math.max(0, invoiceTotal(invoice) - fee - advance) / 100,
          2,
        )}
        . Аванс обліковується окремо та не позначає рахунок оплаченим клієнтом.
      </p>
      {error && (
        <p className="runs__field-error" role="alert">
          {error}
        </p>
      )}
      <div className="runs__load-actions">
        <button type="submit" className="runs__button runs__button--secondary">
          Зберегти факторинг
        </button>
        <button
          type="button"
          className="runs__button runs__button--tertiary"
          onClick={onClose}
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}
