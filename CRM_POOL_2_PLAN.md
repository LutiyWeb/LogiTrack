# План доработки CRM — Пул 2 (`CRM_POOL_2_PLAN.md`)

Этот документ подготовлен ревью-агентом для агента-разработчика.
**Цель:** реализовать 3 финальных блока логистической CRM США:
1. Живой поиск по рейсам (`BOL`, город, клиент, водитель, трак) + создание нового рейса (`+ New run`).
2. Быстрая доплата за простой на складе (`+ $150 Detention`) с авто-пересчётом прибыли и записью в `DispatchLog`.
3. Вкладка **`Brokers`** в сайдбаре — CRM заказчиков/брокеров с кредитным рейтингом, `MC#`, условиями оплаты и контролем дебиторки (`Invoiced` vs `Pending POD / Unbilled`).

---

## Главные правила простоты кода (Senior / KISS)
1. **Локальное UI-состояние не тащить в Redux**: строка поиска (`searchQuery`) и поля формы создания нового рейса (`+ New run`) должны храниться в обычном `useState` внутри своих компонентов.
2. **Не раздувать файлы**: держать каждый компонент в пределах ~80–140 строк.
3. **Динамическая агрегация**: статистика по брокерам должна считаться селектором из реальных грузов в `state.runs.runs`, чтобы при добавлении груза или нажатии `Send invoice` цифры во вкладке `Brokers` обновлялись автоматически.

---

## Чек-лист задач для выполнения

### Задача 1. Живой поиск и создание нового рейса (`+ New run`) в `Runs.tsx`

1. **Поиск по рейсам (`src/components/Workspace/Runs.tsx`)**:
   - Добавить локальный `const [search, setSearch] = useState('')`.
   - В тулбаре `Runs` добавить `<input className="runs__input" placeholder="Search truck, driver, city, customer or BOL..." aria-label="Search runs" value={search} onChange={...} />`.
   - Фильтровать `filteredRuns` по подстроке `search.trim().toLowerCase()` (проверять совпадение в `run.truck`, `run.driver`, `item.lane`, `item.yard`, а также в каждом грузе рейса: `load.customer`, `load.bol`, `load.commodity`, `load.pickup.city`, `load.delivery.city`).
2. **Создание нового рейса (`createRun` в `runsSlice.ts` + форма в `Runs.tsx`)**:
   - В `src/store/slices/runsSlice.ts` добавить редюсер:
     ```ts
     createRun(
       state,
       action: PayloadAction<{
         truck: string;
         driver: string;
         yardCity: string;
         yardState: string;
         drivingHoursLeft: number;
       }>,
     )
     ```
     Он создаёт новый объект `Run` (`id: crypto.randomUUID()`, `status: 'Planned'`, `loads: []`, `notes: []`), добавляет его в начало `state.runs` (`state.runs.unshift(newRun)`) и сразу открывает его (`state.openRunId = newRun.id`, `state.draft = { ...emptyDraft }`).
   - В `Runs.tsx` (только если `permissions.canManageLoads === true`) добавить кнопку `+ New run`, которая открывает компактную встроенную форму (4 поля: `Truck` напр. `"Truck 412"`, `Driver`, `Yard city` по умолчанию `"Indianapolis"`, `Yard state` по умолчанию `"IN"`, `Shift hours left` по умолчанию `"11"`, и кнопку `Create run`).

---

### Задача 2. Быстрая доплата за простой (`+ $150 Detention`) в карточке груза

В логистике США простой свыше 2 часов на погрузке/выгрузке компенсируется брокером (`Detention fee`, обычно `$150`).

1. **Модель и редюсер (`src/runs/demo.ts`, `src/store/slices/runsSlice.ts`)**:
   - В тип `Load` (`demo.ts`) добавить опциональное поле `detentionFee?: number`.
   - В `runsSlice.ts` добавить редюсер:
     ```ts
     addLoadDetention(
       state,
       action: PayloadAction<{
         runId: string;
         loadId: string;
         amount: number;
         author: string;
         roleTitle: string;
       }>,
     )
     ```
     - Находит рейс и груз. Если `load.detentionFee` уже задан — ничего не делает.
     - Увеличивает `load.rate += action.payload.amount` и ставит `load.detentionFee = action.payload.amount`.
     - Автоматически добавляет запись в `run.notes`:
       `text: "Added $${action.payload.amount} detention fee to ${load.customer || 'load'} (rate updated to $${load.rate})."`
2. **Кнопка в UI (`src/components/Workspace/RunDetail.tsx`)**:
   - В карточке груза (`runs__load-actions`):
     - Если `load.detentionFee` уже есть — показывать бейдж `<span className="runs__badge runs__badge--ok">+${load.detentionFee} detention</span>`.
     - Если `!load.detentionFee && permissions.canManageLoads` — показывать кнопку:
       ```tsx
       <button
         type="button"
         className="runs__button runs__button--ghost runs__button--small"
         onClick={() =>
           dispatch(
             addLoadDetention({
               runId: run.id,
               loadId: load.id,
               amount: 150,
               author: currentUser?.name ?? 'Dispatcher',
               roleTitle: currentUser?.roleTitle ?? 'Dispatch',
             }),
           )
         }
       >
         + $150 Detention
       </button>
       ```

---

### Задача 3. Вкладка `Brokers` — CRM брокеров и дебиторская задолженность (`src/components/Workspace/Brokers.tsx`)

1. **Навигация (`src/navigation.ts`, `Sidebar.tsx`, `AppShell.tsx`, `Workspace.tsx`)**:
   - В `src/navigation.ts` расширить `MenuItem['id']`: `'overview' | 'board' | 'brokers' | 'account'` и добавить `{ id: 'brokers', label: 'Brokers' }` в `menuItems`.
   - В `src/components/Sidebar/Sidebar.tsx` добавить иконку `brokers: BrokersIcon` в объект `icons`.
   - В `src/components/AppShell/AppShell.tsx`: скрывать вкладку `brokers` для роли `driver` (так же, как скрывается `overview` при `!permissions.canViewOverview`).
   - В `src/components/Workspace/Workspace.tsx` добавить `{sectionId === 'brokers' && <Brokers />}`.

2. **Справочник брокеров (`src/runs/demo.ts`) и селектор (`src/store/selectors/runsSelectors.ts`)**:
   - В `src/runs/demo.ts` добавить компактный справочник метаданных известных брокеров `brokerDirectory`:
     - `Hart Freight`: `mc: 'MC-410294'`, `creditScore: '98 · A+'`, `terms: 'QuickPay 2d'`
     - `Blue Ridge Logistics`: `mc: 'MC-582910'`, `creditScore: '95 · A'`, `terms: 'Factoring Approved'`
     - `Midwest Steel Co.`: `mc: 'MC-309182'`, `creditScore: '92 · A'`, `terms: 'Net 15'`
     - `Bluegrass Retail`: `mc: 'MC-774120'`, `creditScore: '96 · A+'`, `terms: 'QuickPay 1d'`
     - `Apex Industrial`: `mc: 'MC-619044'`, `creditScore: '89 · B+'`, `terms: 'Net 30'`
     - `Heartland Foods`: `mc: 'MC-512800'`, `creditScore: '94 · A'`, `terms: 'Factoring Approved'`
     *(Для любого другого имени заказчика возвращать дефолт: `mc: 'MC-Verified'`, `creditScore: '90 · A-'`, `terms: 'Net 30'`).*
   - В `src/store/selectors/runsSelectors.ts` создать мемоизированный селектор `selectBrokerSummaries`, который собирает все грузы из `state.runs.runs` и группирует по `load.customer`:
     - `customer: string`
     - `mc: string`, `creditScore: string`, `terms: string`
     - `loadsCount: number`
     - `totalRevenue: number` (сумма `load.rate`)
     - `invoicedRevenue: number` (сумма `load.rate`, где `load.billingStatus === 'Invoiced'`)
     - `pendingRevenue: number` (`totalRevenue - invoicedRevenue`)
     - `primaryRunId: string` и `primaryTruck: string` (чтобы по кнопке можно было перейти к рейсу этого клиента).

3. **Экран `src/components/Workspace/Brokers.tsx` (~110 строк)**:
   - Шапка `Brokers & billing CRM`.
   - 4 плашки KPI (`runs__stats`):
     1. `Active brokers` (кол-во уникальных заказчиков)
     2. `Total contracted` (сумма `totalRevenue`)
     3. `Invoiced / Billed` (сумма `invoicedRevenue`)
     4. `Pending POD / Unbilled` (сумма `pendingRevenue` — дебиторка, которую нужно дожать по документам).
   - Список карточек брокеров (`runs__list` или `runs__loads`):
     - Название компании, бейдж `creditScore`, `mc` и условия оплаты `terms`.
     - Количество грузов, `Total $...`, `Invoiced $...`, `Pending $...`.
     - Кнопка `View run ({primaryTruck})`, которая вызывает `dispatch(openRun(primaryRunId))` и `dispatch(setActiveSection('board'))`.

---

### Задача 4. Тесты (`runsSlice.test.ts`, `Runs.test.tsx`)

1. В `runsSlice.test.ts`:
   - Проверить `createRun` (создаёт новый рейс и делает его открытым).
   - Проверить `addLoadDetention` (увеличивает ставку груза на `$150`, пересчитывает `revenue` и `netProfit`, добавляет запись в `run.notes`).
   - Проверить `selectBrokerSummaries` (корректно считает `totalRevenue`, `invoicedRevenue` и `pendingRevenue`, и обновляет их после `advanceLoadBilling`).
2. В `Runs.test.tsx`:
   - Проверить поиск в `Runs` (ввод номера BOL `44821` оставляет на экране только `Truck 214`).
   - Проверить кнопку `+ $150 Detention` в карточке рейса и переход на вкладку `Brokers`.

---

## Критерии приёмки (Definition of Done)
- [x] Поиск в `Runs` мгновенно фильтрует рейсы по траку, водителю, городу, заказчику и BOL.
- [x] Кнопка `+ New run` создаёт новый рейс и открывает его карточку.
- [x] Кнопка `+ $150 Detention` увеличивает выручку/чистую прибыль и пишет лог в `Check-calls & dispatch log`.
- [x] Вкладка `Brokers` отображает сводку по всем заказчикам и дебиторке (`Invoiced` vs `Pending`).
- [x] Все тесты (`npm test -- --run`), линтер (`npm run lint`) и сборка (`npm run build`) проходят без ошибок.
