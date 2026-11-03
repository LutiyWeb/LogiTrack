import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { createAppStore } from '../../store/store';

describe('LogiTrack CRM Demo UI flows', () => {
  it('completes the core Truck 214 backhaul scenario (710 empty mi / $2.27 -> 215 empty mi / $3.77)', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    render(<App customStore={testStore} />);

    expect(screen.getByRole('heading', { name: 'Runs' })).toBeInTheDocument();
    expect(screen.getByText('Truck 214')).toBeInTheDocument();
    expect(screen.getByText(/Empty 710 mi · \$2\.27 \/ mi/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Truck 214/i }));

    expect(
      screen.getByRole('heading', { name: 'Truck 214' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('700 mi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('710 mi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$3,200').length).toBeGreaterThan(0);
    expect(screen.getByText('$2.27')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Use Blue Ridge Logistics' }),
    );
    await user.click(screen.getByRole('button', { name: 'Add load' }));

    expect(screen.getByText('1,190 mi')).toBeInTheDocument();
    expect(screen.getAllByText('215 mi').length).toBeGreaterThan(0);
    expect(screen.getByText('$5,300')).toBeInTheDocument();
    expect(screen.getByText('$3.77')).toBeInTheDocument();
    expect(
      screen.getByText(
        /This leg is 9 h\. 3\.5 h left in this shift\. He drives the remaining hours, then needs 10 h off before hours start again\./,
      ),
    ).toBeInTheDocument();
  });

  it('navigates between Overview, Runs, and Account and supports Demo Reset', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    render(<App customStore={testStore} />);

    await user.click(screen.getByRole('button', { name: 'Overview' }));
    expect(
      screen.getByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();

    const alertsSection = screen.getByRole('region', {
      name: 'Dispatcher alerts',
    });
    expect(within(alertsSection).getByText(/Truck 214/)).toBeInTheDocument();

    await user.click(
      within(alertsSection).getByRole('button', { name: 'Find backhaul' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Truck 214' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(
      screen.getByRole('heading', { name: 'Account' }),
    ).toBeInTheDocument();
    expect(screen.getByText('LogiTrack Freight LLC')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset Demo Data' }));
    await user.click(screen.getByRole('button', { name: 'Runs' }));
    expect(screen.getByRole('heading', { name: 'Runs' })).toBeInTheDocument();
  });
});
