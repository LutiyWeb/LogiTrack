import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { openRun } from '../../store/slices/runsSlice';
import { createAppStore } from '../../store/store';

describe('Переписка з брокером', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends a template to the broker, shows toasts and receives a demo reply', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('dispatcher'));
    store.dispatch(openRun('214'));
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: 'Брокер' }));
    expect(screen.getByText('Кому: dispatch@hartfreight-demo.example')).toBeInTheDocument();
    expect(screen.getByText(/простій понад 2 год погодили/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Затримка' }));
    await user.click(screen.getByRole('button', { name: 'Надіслати брокеру' }));
    expect(screen.getByText('Лист надіслано: Hart Freight')).toBeInTheDocument();
    expect(screen.getByText(/водій затримується орієнтовно на 2 год/)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Нова відповідь від Hart Freight')).toBeInTheDocument();
    expect(screen.getByText(/нове вікно доставки погоджено/)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Напишіть брокеру або оберіть шаблон…'), 'Погодили нове ETA 18:00');
    await user.click(screen.getByRole('button', { name: 'Записати дзвінок' }));
    expect(screen.getByText('Дзвінок: Погодили нове ETA 18:00')).toBeInTheDocument();
    const toasts = screen.getByRole('status');
    expect(within(toasts).getByText('Дзвінок записано в переписку вантажу')).toBeInTheDocument();
  });
});
