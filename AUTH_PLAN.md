# План реализации авторизации и ролевой модели (RBAC) — `AUTH_PLAN.md`

Этот документ подготовлен ревью-агентом для агента-разработчика.
**Цель:** добавить экран авторизации (`LoginScreen`) и систему разграничения прав по ролям (**RBAC — Role-Based Access Control**), сохранив максимальную простоту кода (принцип KISS), компактные файлы и все зелёные тесты.

---

## Архитектурные принципы (как писать просто)
1. **Никаких сложных проверок `if (role === 'manager' || role === 'dispatcher')` внутри JSX**:
   Все права описываются одной плоской таблицей `ROLE_PERMISSIONS` в `authSlice.ts`. Компоненты получают готовый объект флагов (`canViewOverview`, `canManageLoads`, `canUpdateRunStatus`, `canEditTargets`) через селектор `selectPermissions`.
2. **Состояние инпутов логина и пароля (`email`, `password`) хранится в локальном `useState` внутри `LoginScreen.tsx`**, а не в глобальном сторе Redux.
3. **Компактность**: каждый новый файл должен быть небольшим (до 100–120 строк) с коротким списком импортов.

---

## Чек-лист задач для выполнения

### Задача 1. Создать `src/store/slices/authSlice.ts` и подключить в `store.ts`

1. **Определить типы и 3 демо-пользователей (`demoUsers`)**:
   ```ts
   export type UserRole = 'manager' | 'dispatcher' | 'driver';

   export type DemoUser = {
     id: string;
     name: string;
     email: string;
     password: string;
     role: UserRole;
     roleTitle: string;
     summary: string;
   };

   export type RolePermissions = {
     canViewOverview: boolean;
     canManageLoads: boolean;      // Добавление/удаление грузов, брокерские офферы, ввод пустых миль
     canUpdateRunStatus: boolean;  // Смена статуса рейса (Planned / In transit / Completed)
     canUpdateLoadStatus: boolean; // Смена статуса груза (Assigned / At pickup / In transit / Delivered)
     canEditTargets: boolean;      // Изменение нормативов $/mi и % пустых миль в Account
   };
   ```

2. **Список `demoUsers`**:
   - **Sarah Jenkins (`manager`)**:
     - `email`: `'sarah@logitrack.demo'`, `password`: `'demo123'`
     - `roleTitle`: `'Fleet Manager'`
     - `summary`: `'Full access: fleet overview, load assignment, and profitability targets.'`
   - **Alex Mercer (`dispatcher`)**:
     - `email`: `'alex@logitrack.demo'`, `password`: `'demo123'`
     - `roleTitle`: `'Senior Fleet Dispatcher'`
     - `summary`: `'Operations access: overview, runs, broker load board, and load statuses. Company targets are read-only.'`
   - **Marcus Hill (`driver`)**:
     - `email`: `'marcus@logitrack.demo'`, `password`: `'demo123'`
     - `roleTitle`: `'Driver · Truck 214'`
     - `summary`: `'Driver access: view assigned runs and update load delivery status only.'`

3. **Плоская таблица прав `ROLE_PERMISSIONS`**:
   ```ts
   export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
     manager: {
       canViewOverview: true,
       canManageLoads: true,
       canUpdateRunStatus: true,
       canUpdateLoadStatus: true,
       canEditTargets: true,
     },
     dispatcher: {
       canViewOverview: true,
       canManageLoads: true,
       canUpdateRunStatus: true,
       canUpdateLoadStatus: true,
       canEditTargets: false,
     },
     driver: {
       canViewOverview: false,
       canManageLoads: false,
       canUpdateRunStatus: false,
       canUpdateLoadStatus: true,
       canEditTargets: false,
     },
   };
   ```

4. **Редюсеры в `authSlice`**:
   - `loginWithCredentials(state, action: PayloadAction<{ email: string; password: string }>)`:
     Ищет пользователя в `demoUsers` (email сравнивать через `.trim().toLowerCase()`). Если найден и пароль совпадает — записывает в `state.currentUser` и очищает `state.loginError = null`. Иначе ставит `state.loginError = 'Invalid email or password'`.
   - `loginAsDemoUser(state, action: PayloadAction<string>)`:
     Находит пользователя по `id` в `demoUsers`, ставит в `state.currentUser` и очищает `state.loginError = null`.
   - `logout(state)`:
     Ставит `state.currentUser = null` и `state.loginError = null`.
   - Селекторы:
     - `selectCurrentUser = (state: RootState) => state.auth.currentUser`
     - `selectPermissions = (state: RootState): RolePermissions => state.auth.currentUser ? ROLE_PERMISSIONS[state.auth.currentUser.role] : ROLE_PERMISSIONS.driver`

5. **Подключение в `src/store/store.ts`**:
   - Добавить `auth: authReducer` в `rootReducer` и `loadPersistedState`.
   - При вызове `resetAllDemoData(dispatch)` **не разлогинивать** текущего пользователя (или сбрасывать только `runs` и `ui`), чтобы кнопка `Reset demo` сбрасывала данные рейсов, не выбрасывая пользователя на экран логина.

---

### Задача 2. Создать экран входа `src/components/Auth/LoginScreen.tsx` (~90–110 строк)

1. Когда `currentUser === null`, `AppShell.tsx` рендерит `<LoginScreen />` вместо основного `div.shell`.
2. **Что должно быть на `LoginScreen`**:
   - Заголовок `LogiTrack` и подзаголовок `Sign in to dispatch workspace`.
   - **Форма входа по Email и паролю**:
     - Локальные `useState` для `email` и `password`.
     - Поля `Email` и `Password` и кнопка `Sign in`.
     - Если в сторе есть `loginError` — вывести сообщение об ошибке (`role="alert"`).
   - **Блок быстрого входа в 1 клик (`Demo accounts · Quick sign in`)**:
     - Карточки для каждого из 3 пользователей (`demoUsers`): имя, `roleTitle`, email, краткое описание прав (`summary`).
     - На каждой карточке кнопка `Sign in as {user.name}` (вызывает `dispatch(loginAsDemoUser(user.id))`; также при входе под `driver`, у которого нет доступа к `Overview`, переключать `setActiveSection('board')`).
3. Стили оформить аккуратно (в `Workspace.scss` или `AppShell.scss`), переиспользуя существующие CSS-переменные и классы (`runs__form`, `runs__input`, `runs__button`, `runs__badge`) и соблюдая порядок CSS-свойств.

---

### Задача 3. Применить права (`permissions`) в интерфейсе

1. **`src/components/AppShell/AppShell.tsx` и `src/components/Sidebar/Sidebar.tsx`**:
   - Если `!currentUser`, возвращать `<LoginScreen />`.
   - Фильтровать `menuItems`: если `!permissions.canViewOverview`, скрывать вкладку `overview` (чтобы водитель видел только `Runs` и `Account`).
   - В `Sidebar` передавать `userName={currentUser.name}`, дополнительно показывать `currentUser.roleTitle` и кнопку выхода `Sign out` (вызывает `dispatch(logout())`).

2. **`src/components/Workspace/RunDetail.tsx`**:
   - Получать `const permissions = useAppSelector(selectPermissions);`.
   - **Селект статуса рейса (`Run status`)**: показывать `<select>` только если `permissions.canUpdateRunStatus === true` (иначе показывать только текстовый бейдж `<p className="runs__status">{run.status}</p>`).
   - **Кнопка `Remove` у груза**: показывать только если `permissions.canManageLoads && run.loads.length > 1`.
   - **Инпуты ручных пустых миль (`Empty miles`)**: если `!permissions.canManageLoads`, выводить просто текст вместо `<input>`.
   - **Блоки `<BackhaulOffers />` и `<AddLoadForm />`**: рендерить только если `permissions.canManageLoads === true`.

3. **`src/components/Workspace/Account.tsx`**:
   - В первой секции показывать данные текущего пользователя (`currentUser.name`, `currentUser.roleTitle`, `currentUser.email`) и кнопку `Sign out`.
   - В секции `Dispatch profitability targets`:
     - Если `!permissions.canEditTargets` (например, для `dispatcher` и `driver`), делать инпуты `disabled` и показывать заметку `Read-only for your role · Only Fleet Manager can modify company profitability targets`.

---

### Задача 4. Обновить и дополнить тесты (`Runs.test.tsx`, `runsSlice.test.ts`)

1. В существующих тестах (`Runs.test.tsx`), где тестируется работа внутри CRM, при создании тестового стора (или в начале теста) учитывать авторизацию (например, либо в `createAppStore` для тестов передавать залогиненного диспетчера, либо первым действием в UI-тесте кликать `Sign in as Alex Mercer`).
2. Добавить тесты на авторизацию и роли:
   - Вход через форму с неверным паролем показывает ошибку `Invalid email or password`, а с верным (`alex@logitrack.demo` / `demo123`) — открывает рабочую область.
   - Вход под ролью `Driver` (`Marcus Hill`) скрывает вкладку `Overview`, скрывает форму `Add a load` и брокерские офферы, но позволяет менять статус груза.
   - Вход под ролью `Dispatcher` (`Alex Mercer`) блокирует (`disabled`) редактирование целевых нормативов в `Account`, а вход под `Fleet Manager` (`Sarah Jenkins`) разрешает их менять.
   - Кнопка `Sign out` возвращает пользователя на экран входа.

---

## Критерии приёмки (Definition of Done)
- [x] При первом открытии приложения без сохранённой сессии отображается аккуратный `LoginScreen` с формой Email/Password и 3 карточками быстрого демо-входа.
- [x] Права проверяются только через `selectPermissions` и таблицу `ROLE_PERMISSIONS`, без дублирования условий по ролям в компонентах.
- [x] Все тесты (`npm test -- --run`), линтер (`npm run lint`) и сборка (`npm run build`) проходят без ошибок.
