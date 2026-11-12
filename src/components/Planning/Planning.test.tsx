import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('Планування', () => {
  it('shows upcoming events, completes a reminder and confirms a tentative load', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={store} />);

    const navItem = screen.getByRole('button', { name: /Планування/ });
    expect(within(navItem).getByText('2')).toBeInTheDocument();

    await user.click(navItem);
    expect(screen.getByRole('heading', { name: 'Планування' })).toBeInTheDocument();
    expect(screen.getByText(/Переспитати Blue Ridge Logistics/)).toBeInTheDocument();
    expect(screen.getByText(/Northbound Logistics Group: Newark, NJ → Columbus, OH — не підтверджено/)).toBeInTheDocument();

    // Отметить напоминание выполненным.
    const reminder = screen.getByText(/Переспитати Blue Ridge Logistics/).closest('li')!;
    await user.click(within(reminder).getByLabelText('Виконано'));
    expect(within(screen.getByRole('button', { name: /Планування/ })).getByText('1')).toBeInTheDocument();

    // Брокер подтвердил предварительный груз — он уходит в очередь «Новий».
    const tentative = screen.getByText(/Newark, NJ → Columbus, OH — не підтверджено/).closest('li')!;
    await user.click(within(tentative).getByRole('button', { name: 'Брокер підтвердив' }));
    expect(store.getState().inbox.items.find((item) => item.id === 'plan-newjersey')?.status).toBe('New');
    expect(screen.getByText(/Вантаж Northbound Logistics Group підтверджено/)).toBeInTheDocument();
  });

  it('adds a tentative load with a reminder', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: /Планування/ }));
    await user.click(screen.getByRole('button', { name: '+ Попередній вантаж' }));
    const form = screen.getByRole('form', { name: 'Новий попередній вантаж' });
    await user.type(within(form).getByLabelText('Брокер / клієнт'), 'Prairie Route Brokerage');
    await user.type(within(form).getByLabelText('Звідки, місто'), 'Lafayette');
    await user.type(within(form).getByLabelText('Куди, місто'), 'St. Louis');
    await user.type(within(form).getByLabelText('Орієнтовна дата'), '2026-11-20');
    await user.type(within(form).getByLabelText('Нагадати'), '2026-11-17');
    await user.type(within(form).getByLabelText('Що зробити'), 'Переспитати Prairie');
    await user.click(within(form).getByRole('button', { name: 'Зберегти' }));

    const added = store.getState().inbox.items.find((item) => item.draft.customer === 'Prairie Route Brokerage');
    expect(added?.status).toBe('Tentative');
    expect(store.getState().planner.reminders.some((item) => item.inboxId === added?.id)).toBe(true);
  });
});
