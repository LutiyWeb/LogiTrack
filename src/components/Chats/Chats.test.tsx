import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsUser } from '../../store/slices/authSlice';
import { sendChatMessage } from '../../store/slices/chatsSlice';
import { createAppStore } from '../../store/store';

describe('Чати', () => {
  it('shows chats and sends a reply; chat messages stay out of the run log', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsUser('dispatcher'));
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

    // Переписка в журнал рейса не дублируется, записи диспетчера остаются.
    await user.click(screen.getByRole('button', { name: 'Відкрити рейс · Тягач 214' }));
    const feed = screen.getByRole('region', { name: 'Журнал диспетчера' });
    expect(within(feed).queryByText(/вже 2 години на складі/)).not.toBeInTheDocument();
    expect(within(feed).queryByText('Беремо зворотний з Marietta')).not.toBeInTheDocument();
    expect(within(feed).getByText(/Розвантажився на South Park Warehouse/)).toBeInTheDocument();
  });

  it('marks a chat as read when it is opened', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsUser('dispatcher'));
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: /Чати/ }));
    await user.click(screen.getByRole('button', { name: /Marcus Hill/ }));
    expect(store.getState().chats.chats.find((chat) => chat.driver === 'Marcus Hill')?.unread).toBe(0);
    expect(within(screen.getByRole('button', { name: /Чати/ })).getByText('2')).toBeInTheDocument();
  });

  it('opens the chat panel from any page and from a run, and closes it with Esc', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsUser('dispatcher'));
    render(<App customStore={store} />);

    // Кнопка панели со счётчиком непрочитанных.
    const launcher = screen.getByRole('button', { name: 'Панель чатів' });
    expect(within(launcher).getByText('3')).toBeInTheDocument();
    await user.click(launcher);
    const panel = screen.getByRole('dialog', { name: 'Панель чатів' });
    expect(within(panel).getByRole('list', { name: 'Список чатів' })).toBeInTheDocument();

    // Поиск и фильтр «Непрочитані».
    await user.click(within(panel).getByRole('button', { name: /Непрочитані/ }));
    expect(within(panel).queryByText('Dana Brooks')).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /Непрочитані/ }));
    await user.type(within(panel).getByRole('searchbox'), 'Dana');
    expect(within(panel).getByText('Dana Brooks')).toBeInTheDocument();
    expect(within(panel).queryByText('Marcus Hill')).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Панель чатів' })).not.toBeInTheDocument();

    // Из рейса — сразу на переписку с водителем рейса.
    await user.click(screen.getByRole('button', { name: 'Рейси' }));
    await user.click(screen.getByRole('button', { name: /Тягач 214/ }));
    await user.click(screen.getByRole('button', { name: 'Чат з водієм' }));
    expect(within(screen.getByRole('dialog', { name: 'Панель чатів' })).getByText(/вже 2 години на складі/)).toBeInTheDocument();
  });

  it('shows only the latest messages and loads older ones on request', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsUser('dispatcher'));
    for (let i = 0; i < 45; i += 1) {
      store.dispatch(sendChatMessage({ driver: 'Dana Brooks', author: 'Alex Mercer', text: `Повідомлення ${i}` }));
    }
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: /Чати/ }));
    await user.click(screen.getByRole('button', { name: /Dana Brooks/ }));
    expect(screen.getByText('Повідомлення 44')).toBeInTheDocument();
    expect(screen.queryByText('Повідомлення 0')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Показати раніші/ }));
    await user.click(screen.getByRole('button', { name: /Показати раніші/ }));
    expect(screen.getByText('Повідомлення 0')).toBeInTheDocument();
  });
});
