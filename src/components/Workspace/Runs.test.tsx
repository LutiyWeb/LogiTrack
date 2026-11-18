import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import { loginAsUser } from '../../store/slices/authSlice';
import { createAppStore } from '../../store/store';

describe('LogiTrack CRM UI flows', () => {
  it('completes the core Truck 214 backhaul scenario via the backhaul form (710 empty mi / $2.27 / Net $1,409 -> 215 empty mi / $3.77 / Net $3,516)', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsUser('dispatcher'));
    render(<App customStore={testStore} />);

    expect(screen.getByRole('heading', { name: 'Рейси' })).toBeInTheDocument();
    expect(screen.getByText('Тягач 214')).toBeInTheDocument();
    expect(screen.getAllByText('Повернення порожнім').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(
        /Під вантажем 700 миль · Порожніх 710 миль · Загалом \$2\.27 \/ милю/,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Тягач 214/i }));

    expect(
      screen.getByRole('heading', { name: 'Тягач 214' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '← До рейсів' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('700 миль').length).toBeGreaterThan(0);
    expect(screen.getAllByText('710 миль').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$3,200').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Чистий $1,409 · Витрати $1,791'),
    ).toBeInTheDocument();
    expect(screen.getByText('$2.27')).toBeInTheDocument();

    const offersBoard = screen.getByRole('region', {
      name: 'Біржа вантажів',
    });
    const assignButtons = within(offersBoard).getAllByRole('button', {
      name: 'Призначити вантаж',
    });
    expect(assignButtons[1]).toBeDisabled();
    expect(assignButtons[1]).toHaveAttribute(
      'title',
      'Конфлікт годин водіння: завантаження о 17:00 не чекає обов’язкового 10-годинного відпочинку',
    );

    await user.click(
      within(offersBoard).getAllByRole('button', {
        name: 'Заповнити форму',
      })[0],
    );
    const modal = screen.getByRole('dialog', { name: 'Додати вантаж' });
    expect(within(modal).getByLabelText('Тягач / водій')).toBeInTheDocument();

    await user.click(
      within(modal).getByRole('button', {
        name: 'Заповнити: Blue Ridge Logistics',
      }),
    );
    await user.click(
      within(modal).getByRole('button', { name: 'Додати вантаж' }),
    );

    expect(screen.getByText('1,190 миль')).toBeInTheDocument();
    expect(screen.getAllByText('215 миль').length).toBeGreaterThan(0);
    expect(screen.getByText('$5,300')).toBeInTheDocument();
    expect(
      screen.getByText('Чистий $3,516 · Витрати $1,784'),
    ).toBeInTheDocument();
    expect(screen.getByText('$3.77')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Ця ділянка — 9 год\. До кінця зміни 3\.5 год\. Водій доїжджає залишок годин, потім потрібен 10-годинний відпочинок/,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Рейси' }));
    expect(screen.getByRole('heading', { name: 'Рейси' })).toBeInTheDocument();
  });

  it('filters runs by BOL search, adds $150 Detention fee, and navigates to Customers & billing with Create invoice', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsUser('dispatcher'));
    render(<App customStore={testStore} />);

    const searchInput = screen.getByLabelText('Пошук рейсів');
    await user.type(searchInput, '44821');
    expect(screen.getByText('Тягач 214')).toBeInTheDocument();
    expect(screen.queryByText('Тягач 118')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Тягач 214/i }));
    await user.click(screen.getByRole('button', { name: 'Ще' }));
    await user.click(
      screen.getByRole('menuitem', { name: '+ $150 за простій' }),
    );
    expect(screen.getByText('+$150 за простій')).toBeInTheDocument();
    expect(
      screen.getByText(/Додано \$150 за простій до Hart Freight/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Клієнти та рахунки' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Клієнти та рахунки' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Hart Freight')).toBeInTheDocument();
    expect(screen.getByText('Bluegrass Retail')).toBeInTheDocument();
    expect(screen.getAllByText('Брокер').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Вантажовідправник').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Виставити рахунок' }));
    expect(
      screen.queryByRole('button', { name: 'Виставити рахунок' }),
    ).not.toBeInTheDocument();
  });

  it('navigates between Overview, Runs, and Account and supports data reset', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsUser('dispatcher'));
    render(<App customStore={testStore} />);

    await user.click(screen.getByRole('button', { name: 'Огляд' }));
    expect(screen.getByRole('heading', { name: 'Огляд' })).toBeInTheDocument();
    expect(screen.getByText(/Прибуток по рейсах \$/)).toBeInTheDocument();
    expect(screen.getByText('$/милю загалом')).toBeInTheDocument();

    const alertsSection = screen.getByRole('region', {
      name: 'Сповіщення диспетчера',
    });
    expect(within(alertsSection).getByText(/Почніть тут:/)).toBeInTheDocument();
    expect(
      within(alertsSection).getByText('Тягач 214 · Marcus Hill'),
    ).toBeInTheDocument();
    expect(
      within(alertsSection).getByText('Тягач 118 · Dana Brooks'),
    ).toBeInTheDocument();

    await user.click(
      within(alertsSection).getAllByRole('button', {
        name: 'Знайти зворотний вантаж',
      })[0],
    );
    expect(
      screen.getByRole('heading', { name: 'Тягач 214' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Акаунт' }));
    expect(screen.getByRole('heading', { name: 'Акаунт' })).toBeInTheDocument();
    expect(screen.getByText('LogiTrack Freight LLC')).toBeInTheDocument();

    // Диспетчеру сброс данных недоступен: кнопка есть только у менеджера.
    expect(screen.queryByRole('button', { name: 'Скинути всі дані' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Рейси' }));
    expect(screen.getByRole('heading', { name: 'Рейси' })).toBeInTheDocument();
  });

  it('validates login credentials and supports one-click quick login', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    render(<App customStore={testStore} />);

    expect(
      screen.getByRole('heading', { name: 'LogiTrack' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'alex@logitrack.app');
    await user.type(screen.getByLabelText('Пароль'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Невірний email або пароль',
    );

    await user.click(screen.getByRole('button', { name: 'Вхід' }));
    expect(screen.getByRole('heading', { name: 'Рейси' })).toBeInTheDocument();
  });

  it('enforces RBAC permissions, personal driver run list, POD/invoice workflow, and DispatchLog notes', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    render(<App customStore={testStore} />);

    await user.click(
      screen.getByRole('button', { name: 'Увійти як Marcus Hill' }),
    );
    expect(
      screen.queryByRole('button', { name: 'Огляд' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Клієнти та рахунки' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Тягач 214')).toBeInTheDocument();
    expect(screen.queryByText('Тягач 118')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Тягач 214/i }));
    expect(
      screen.queryByRole('button', { name: 'Додати з черги' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Статус вантажу Hart Freight'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Підтвердити доставку' }),
    );
    expect(screen.getByText('Доставку підтверджено')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Виставити рахунок' }),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(
        'Дзвінок водія, рампа або нотатка…',
      ),
      'Signed BOL uploaded from cab',
    );
    await user.click(screen.getByRole('button', { name: 'Додати запис' }));
    expect(
      screen.getByText('Signed BOL uploaded from cab'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Акаунт' }));
    expect(screen.getByLabelText('Ім’я диспетчера')).toBeDisabled();

    await user.click(
      within(screen.getByLabelText('Акаунт')).getByRole('button', {
        name: 'Вийти',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'LogiTrack' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Увійти як Sarah Jenkins' }),
    );
    await user.click(screen.getByRole('button', { name: /Тягач 214/i }));
    await user.click(screen.getByRole('button', { name: 'Виставити рахунок' }));
    expect(screen.getByText('Рахунок виставлено')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Акаунт' }));
    expect(screen.getByLabelText('Ім’я диспетчера')).not.toBeDisabled();

    // Сброс данных — только менеджер и только после подтверждения.
    await user.click(screen.getByRole('button', { name: 'Скинути всі дані' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getAllByRole('button', { name: 'Скасувати' })[1]);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('hides revenue, costs and $/mile from the driver in the open run', async () => {
    const user = userEvent.setup();
    const testStore = createAppStore();
    testStore.dispatch(loginAsUser('driver'));
    render(<App customStore={testStore} />);

    const row = screen.queryByRole('button', { name: /Тягач 214/i });
    if (row) await user.click(row);
    expect(screen.getByRole('heading', { name: 'Тягач 214' })).toBeInTheDocument();
    expect(screen.queryByText('Виручка')).not.toBeInTheDocument();
    expect(screen.queryByText(/Витрати/)).not.toBeInTheDocument();
    expect(screen.queryByText('$/милю загалом')).not.toBeInTheDocument();
  });
});
