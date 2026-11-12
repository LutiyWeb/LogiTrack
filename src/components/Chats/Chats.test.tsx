import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('Чати', () => {
  it('shows chats, sends a reply and puts the run messages into the run feed', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={store} />);

    const navItem = screen.getByRole('button', { name: /Чати/ });
    expect(within(navItem).getByText('3')).toBeInTheDocument();

    await user.click(navItem);
    await user.click(screen.getByRole('button', { name: /Marcus Hill/ }));
    expect(screen.getByText(/вже 2 години на складі/)).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Чати/ })).getByText('2')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Відповідь піде в WhatsApp…'), 'Беремо зворотний з Marietta');
    await user.click(screen.getByRole('button', { name: 'Надіслати' }));
    expect(screen.getByText('Беремо зворотний з Marietta')).toBeInTheDocument();

    // Сообщения водителя и ответ видны в ленте рейса.
    await user.click(screen.getByRole('button', { name: 'Відкрити рейс · Тягач 214' }));
    const feed = screen.getByRole('region', { name: 'Журнал диспетчера' });
    expect(within(feed).getByText(/вже 2 години на складі/)).toBeInTheDocument();
    expect(within(feed).getByText('Беремо зворотний з Marietta')).toBeInTheDocument();
    expect(within(feed).getByText(/Розвантажився на South Park Warehouse/)).toBeInTheDocument();
  });
});
