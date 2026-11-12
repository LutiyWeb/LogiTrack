import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { buildDriverRows, seedDrivers } from '../../drivers/drivers';
import { selectEnrichedRuns } from '../../store/selectors/runsSelectors';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('Водії', () => {
  it('derives driver statuses from runs, hours and documents', () => {
    const store = createAppStore();
    const rows = buildDriverRows(seedDrivers, selectEnrichedRuns(store.getState()), 0.65, []);
    const status = (name: string) => rows.find((row) => row.driver.name === name)?.status;

    expect(status('Marcus Hill')).toBe('OnRun');
    expect(status('Luis Ortega')).toBe('Resting');
    expect(status('Priya Nair')).toBe('Free');
    expect(status('Jamal Wright')).toBe('DocsExpired');
    expect(rows.find((row) => row.driver.name === 'Priya Nair')?.idleDays).toBe(3);
    // Пройдено 515 + 175 миль по $0.65.
    expect(rows.find((row) => row.driver.name === 'Elena Rostova')?.weekPay).toBe(449);
  });

  it('shows drivers, opens a driver card and marks a payout as paid', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('manager'));
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: 'Водії' }));
    expect(screen.getByRole('heading', { name: 'Водії' })).toBeInTheDocument();
    expect(screen.getByText('Медсправка: прострочено')).toBeInTheDocument();
    expect(screen.getByText('Медсправка: закінчується через 12 днів')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Priya Nair/ }));
    expect(screen.getByText('(317) 555-0177')).toBeInTheDocument();

    const payouts = screen.getByRole('region', { name: 'Виплати водіям' });
    const elena = within(payouts).getByText('Elena Rostova').closest('li')!;
    await user.click(within(elena).getByRole('button', { name: 'Позначити виплаченим' }));
    expect(within(elena).getByText('Виплачено')).toBeInTheDocument();
    expect(store.getState().drivers.paidThisWeek).toContain('Elena Rostova');
  });

  it('shows driver alerts on the overview', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('manager'));
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: 'Огляд' }));
    expect(screen.getByText('Тягач 226 / Priya Nair без рейсу 3 дні')).toBeInTheDocument();
    expect(screen.getByText('Dana Brooks — медсправка: закінчується через 12 днів')).toBeInTheDocument();
    expect(screen.getByText(/До виплати водіям цього тижня: \$/)).toBeInTheDocument();
  });
});
