import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { selectMonthResult } from '../../store/selectors/financeSelectors';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { setFixedCost } from '../../store/slices/financeSlice';
import { addLoad } from '../../store/slices/runsSlice';
import { backhaulPreset } from '../../runs/demo';
import { createAppStore } from '../../store/store';

describe('Фінанси', () => {
  it('counts break-even from fixed and per-mile costs', () => {
    const store = createAppStore();
    const before = selectMonthResult(store.getState());
    expect(before.revenue).toBe(46650);
    expect(before.miles).toBe(15240);
    expect(before.costs).toBe(47100);
    expect(before.milesToBreakeven).toBe(282);

    // Зворотний вантаж Тягача 214 виводить місяць у плюс.
    store.dispatch(addLoad({ runId: '214', draft: backhaulPreset }));
    expect(selectMonthResult(store.getState()).profit).toBeGreaterThan(0);

    store.dispatch(setFixedCost({ key: 'lease', value: 20000 }));
    expect(selectMonthResult(store.getState()).breakeven).toBeGreaterThan(before.breakeven);
  });

  it('is visible to the manager and hidden from the dispatcher', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsDemoUser('manager'));
    const { unmount } = render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: 'Фінанси' }));
    expect(screen.getByText('До беззбитковості: ще $450 ≈ 282 милі')).toBeInTheDocument();
    unmount();

    const dispatcherStore = createAppStore();
    dispatcherStore.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={dispatcherStore} />);
    expect(screen.queryByRole('button', { name: 'Фінанси' })).not.toBeInTheDocument();
  });
});
