import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import AppShell from './components/AppShell/AppShell';
import { pathToState, stateToPath } from './routes';
import { createAppStore } from './store/store';

function Address() {
  return <output aria-label="address">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  const store = createAppStore();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell />
        <Address />
      </MemoryRouter>
    </Provider>,
  );
  return userEvent.setup();
}

describe('routes', () => {
  it('maps sections and runs to addresses and back', () => {
    expect(stateToPath({ sectionId: 'board', runId: null })).toBe('/runs');
    expect(stateToPath({ sectionId: 'board', runId: '214' })).toBe('/runs/214');
    expect(stateToPath({ sectionId: 'brokers', runId: '214' })).toBe('/customers');
    expect(pathToState('/runs/214')).toEqual({ sectionId: 'board', runId: '214' });
    expect(pathToState('/chats')).toEqual({ sectionId: 'chats', runId: null });
    expect(pathToState('/chats/5')).toBeNull();
    expect(pathToState('/nope')).toBeNull();
    expect(pathToState('/')).toBeNull();
  });

  it('opens the page from a link that was opened before signing in', async () => {
    const user = renderAt('/chats');
    await user.click(screen.getByRole('button', { name: 'Увійти як Alex Mercer' }));
    expect(screen.getByRole('heading', { name: 'Чати з водіями' })).toBeInTheDocument();
    expect(screen.getByLabelText('address')).toHaveTextContent('/chats');
  });

  it('opens a run from its address and shows it in the address when navigating', async () => {
    const user = renderAt('/runs/214');
    await user.click(screen.getByRole('button', { name: 'Увійти як Alex Mercer' }));
    expect(screen.getByRole('button', { name: /До рейсів/ })).toBeInTheDocument();
    expect(screen.getByLabelText('address')).toHaveTextContent('/runs/214');

    await user.click(screen.getByRole('button', { name: /До рейсів/ }));
    expect(screen.getByLabelText('address')).toHaveTextContent(/^\/runs$/);

    await user.click(screen.getByRole('button', { name: /Планування/ }));
    expect(screen.getByLabelText('address')).toHaveTextContent('/planning');
  });

  it('falls back to the runs list for an unknown run', async () => {
    const user = renderAt('/runs/999');
    await user.click(screen.getByRole('button', { name: 'Увійти як Alex Mercer' }));
    expect(screen.getByLabelText('address')).toHaveTextContent(/^\/runs$/);
  });

  it('falls back to the current page for an unknown address or a forbidden section', async () => {
    const user = renderAt('/nope');
    await user.click(screen.getByRole('button', { name: 'Увійти як Marcus Hill' }));
    expect(screen.getByLabelText('address')).toHaveTextContent(/^\/runs$/);
  });
});
