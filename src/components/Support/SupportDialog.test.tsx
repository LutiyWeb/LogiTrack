import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('Підтримка', () => {
  it('sends an urgent problem report with context and shows a toast', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('driver'));
    render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: 'Підтримка' }));
    const dialog = screen.getByRole('dialog', { name: 'Повідомити про проблему' });
    expect(dialog).toHaveTextContent('Користувач: Marcus Hill');
    expect(dialog).toHaveTextContent('Розділ: Рейси');

    await user.type(screen.getByLabelText('Що сталося'), 'Не відкривається рейс');
    await user.click(screen.getByLabelText('Терміново — заважає працювати'));
    await user.click(screen.getByRole('button', { name: 'Надіслати в підтримку' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/надіслано з позначкою «терміново»/)).toBeInTheDocument();

    // Клик по затемнённому фону закрывает окно.
    await user.click(screen.getByRole('button', { name: 'Підтримка' }));
    await user.click(screen.getByRole('dialog', { name: 'Повідомити про проблему' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
