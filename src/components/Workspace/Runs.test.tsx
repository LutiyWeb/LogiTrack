import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsDemoUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('LogiTrack CRM Demo UI flows', () => {
  it('completes the core Truck 214 backhaul scenario (710 empty mi / $2.27 / Net $1,409 -> 215 empty mi / $3.77 / Net $3,516)', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsDemoUser('dispatcher'));
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
    expect(screen.getByText('Net $1,409 · Cost $1,791')).toBeInTheDocument();
    expect(screen.getByText('$2.27')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Use Blue Ridge Logistics' }),
    );
    await user.click(screen.getByRole('button', { name: 'Add load' }));

    expect(screen.getByText('1,190 mi')).toBeInTheDocument();
    expect(screen.getAllByText('215 mi').length).toBeGreaterThan(0);
    expect(screen.getByText('$5,300')).toBeInTheDocument();
    expect(screen.getByText('Net $3,516 · Cost $1,784')).toBeInTheDocument();
    expect(screen.getByText('$3.77')).toBeInTheDocument();
    expect(
      screen.getByText(
        /This leg is 9 h\. 3\.5 h left in this shift\. He drives the remaining hours, then needs 10 h off before hours start again\./,
      ),
    ).toBeInTheDocument();
  });

  it('filters runs by BOL search, adds $150 Detention fee, and navigates to Brokers CRM', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={testStore} />);

    const searchInput = screen.getByLabelText('Search runs');
    await user.type(searchInput, '44821');
    expect(screen.getByText('Truck 214')).toBeInTheDocument();
    expect(screen.queryByText('Truck 118')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Truck 214/i }));
    await user.click(screen.getByRole('button', { name: '+ $150 Detention' }));
    expect(screen.getByText('+$150 detention')).toBeInTheDocument();
    expect(
      screen.getByText(/Added \$150 detention fee to Hart Freight/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Brokers' }));
    expect(
      screen.getByRole('heading', { name: 'Brokers & billing CRM' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Hart Freight')).toBeInTheDocument();
    expect(screen.getByText('Bluegrass Retail')).toBeInTheDocument();
  });

  it('navigates between Overview, Runs, and Account and supports Demo Reset', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsDemoUser('dispatcher'));
    render(<App customStore={testStore} />);

    await user.click(screen.getByRole('button', { name: 'Overview' }));
    expect(
      screen.getByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Net profit \$/)).toBeInTheDocument();

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

  it('validates login credentials and supports one-click dev auto-login', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    render(<App customStore={testStore} />);

    expect(
      screen.getByRole('heading', { name: 'LogiTrack' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'alex@logitrack.demo');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    );

    await user.click(
      screen.getByRole('button', { name: /Dev auto-login/i }),
    );
    expect(screen.getByRole('heading', { name: 'Runs' })).toBeInTheDocument();
  });

  it('enforces RBAC permissions, personal driver run list, POD/invoice workflow, and DispatchLog notes', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    render(<App customStore={testStore} />);

    await user.click(
      screen.getByRole('button', { name: 'Sign in as Marcus Hill' }),
    );
    expect(
      screen.queryByRole('button', { name: 'Overview' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Brokers' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Truck 214')).toBeInTheDocument();
    expect(screen.queryByText('Truck 118')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Truck 214/i }));
    expect(
      screen.queryByRole('heading', { name: 'Add a load' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Run status'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Status for Hart Freight'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm POD' }));
    expect(screen.getByText('POD received')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send invoice' }),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(
        'Log check-call, dock # or broker note...',
      ),
      'Signed BOL uploaded from cab',
    );
    await user.click(screen.getByRole('button', { name: 'Post note' }));
    expect(
      screen.getByText('Signed BOL uploaded from cab'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(screen.getByLabelText('Dispatcher name')).toBeDisabled();

    await user.click(
      within(screen.getByLabelText('Account')).getByRole('button', {
        name: 'Sign out',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'LogiTrack' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Sign in as Sarah Jenkins' }),
    );
    await user.click(screen.getByRole('button', { name: /Truck 214/i }));
    await user.click(screen.getByRole('button', { name: 'Send invoice' }));
    expect(screen.getByText('Invoiced')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(screen.getByLabelText('Dispatcher name')).not.toBeDisabled();
  });
});
