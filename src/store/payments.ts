import { paymentError, toCents, type PaymentInput } from '../billing/billing';
import { recordInvoicePayment } from './slices/runsSlice';
import type { AppDispatch, RootState } from './store';

export const recordPayment =
  (invoiceId: string, input: PaymentInput, paymentId: string, author: string) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const invoice = getState().runs.invoices.find(
      (item) => item.id === invoiceId,
    );
    if (!invoice) return 'Рахунок більше не існує.';
    const error = paymentError(input, invoice);
    if (error) return error;
    if (
      invoice.payments.some(
        (payment) =>
          payment.id === paymentId ||
          payment.reference.trim().toLowerCase() ===
            input.reference.trim().toLowerCase(),
      )
    )
      return 'Цей платіж уже зареєстровано. Перевірте референс.';
    dispatch(
      recordInvoicePayment({
        invoiceId,
        payment: {
          id: paymentId,
          amountCents: toCents(Number(input.amount)),
          date: input.date,
          method: input.method,
          reference: input.reference,
          recordedBy: author,
        },
      }),
    );
    return '';
  };
