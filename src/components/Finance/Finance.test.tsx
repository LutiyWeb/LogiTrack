import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { selectMonthResult } from '../../store/selectors/financeSelectors';
import { loginAsUser } from '../../store/slices/authSlice';
import { setFixedCost } from '../../store/slices/financeSlice';
import { addLoad } from '../../store/slices/runsSlice';
import { backhaulPreset } from '../../runs/seed';
import { createAppStore } from '../../store/store';

describe('Фінанси', () => {
  it('counts break-even from fixed and per-mile costs', () => {
    const store = createAppStore();
    const before = selectMonthResult(store.getState());
    expect(before.revenue).toBe(42850);
    expect(before.miles).toBe(13795);
    expect(before.costs).toBe(44991);
    expect(before.milesToBreakeven).toBe(1301);

    // A future backhaul changes the plan but cannot improve realized monthly profit.
    store.dispatch(addLoad({ runId: '214', draft: backhaulPreset }));
    expect(selectMonthResult(store.getState()).profit).toBe(before.profit);

    store.dispatch(setFixedCost({ key: 'lease', value: 20000 }));
    expect(selectMonthResult(store.getState()).breakeven).toBeGreaterThan(
      before.breakeven,
    );
  });

  it('is visible to the manager and hidden from the dispatcher', async () => {
    const user = userEvent.setup();
    const store = createAppStore();
    store.dispatch(loginAsUser('manager'));
    const { unmount } = render(<App customStore={store} />);

    await user.click(screen.getByRole('button', { name: 'Фінанси' }));
    expect(
      screen.getByText('До беззбитковості: ще $2,141 ≈ 1,301 миля'),
    ).toBeInTheDocument();
    unmount();

    const dispatcherStore = createAppStore();
    dispatcherStore.dispatch(loginAsUser('dispatcher'));
    render(<App customStore={dispatcherStore} />);
    expect(
      screen.queryByRole('button', { name: 'Фінанси' }),
    ).not.toBeInTheDocument();
  });
});
