import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('Вхідні вантажі', () => {
  it('shows the queue, assigns a checked load to a free truck and rejects another', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={store} />);

    // Счётчик новых грузов в меню.
    const navItem = screen.getByRole('button', { name: /Вхідні вантажі/ });
    expect(within(navItem).getByText('2')).toBeInTheDocument();

    await user.click(navItem);
    expect(screen.getByRole('heading', { name: 'Вхідні вантажі' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Очікують (3)' })).toBeInTheDocument();
    expect(screen.getByText('Northbound Logistics Group')).toBeInTheDocument();
    expect(screen.getByText('Не заповнено: милі під вантажем')).toBeInTheDocument();

    // Ручной груз «Готовий» → назначить на свободный тягач.
    const card = screen.getByText('Midwest Steel Co.').closest('li')!;
    await user.click(within(card).getByRole('button', { name: 'Перевірити і призначити' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Створити рейс · Тягач 412/ }));

    expect(screen.getByRole('heading', { name: 'Тягач 412' })).toBeInTheDocument();
    expect(screen.getAllByText('Midwest Steel Co.').length).toBeGreaterThan(0);
    expect(store.getState().inbox.items.find((item) => item.id === 'inbox-phone')?.status).toBe(
      'Assigned',
    );

    // Отклонить письмо Northbound.
    await user.click(screen.getByRole('button', { name: /Вхідні вантажі/ }));
    const northbound = screen.getByText('Northbound Logistics Group').closest('li')!;
    await user.click(within(northbound).getByRole('button', { name: 'Відхилити' }));
    expect(screen.queryByText('Northbound Logistics Group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Очікують (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Відхилені' }));
    expect(screen.getByText('Northbound Logistics Group')).toBeInTheDocument();
  });

  it('hides the queue from drivers', () => {
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('driver'));
    render(<App customStore={store} />);
    expect(screen.queryByRole('button', { name: /Вхідні вантажі/ })).not.toBeInTheDocument();
  });
});
