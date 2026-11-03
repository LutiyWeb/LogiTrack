# План следующего пула доработок CRM (`CRM_NEXT_POOL_PLAN.md`)

Этот документ подготовлен ревью-агентом для агента-разработчика.
**Цель:** добавить в LogiTrack ключевой операционный функционал логистической CRM США (расчёт чистой прибыли `Net Profit`, подтверждение документов `POD / Invoicing` и журнал связи `Check-calls / Dispatch Log`), а также поправить 2 мелких замечания по коду авторизации.

---

## Главные требования к коду (Senior / KISS)
1. **Простота прежде всего**: никаких сложных вложенных состояний или лишних абстракций.
2. **Не раздувать `RunDetail.tsx`**: вынести блок диспетчерского журнала в отдельный маленький компонент `src/components/Workspace/DispatchLog.tsx` (~50–60 строк).
3. **Сохранить все существующие тесты зелёными** и добавить тесты на новый функционал.

---

## Чек-лист задач для выполнения

### Задача 1. Исправить 2 замечания по коду авторизации (`LoginScreen.tsx`, `authSlice.ts`, `runsSelectors.ts`)

1. **Убрать дублирование между `LoginScreen.tsx` и `devAutoAuth.ts`**:
   - В `src/components/Auth/LoginScreen.tsx` функция `handleQuickLogin(user)` делает ровно то же самое, что `runDevAutoLogin` из `src/auth/devAutoAuth.ts`.
   - Заменить тело `handleQuickLogin(user)` на вызов `runDevAutoLogin({ roleOrId: user.id, onFillInputs: (e, p) => { setEmail(e); setPassword(p); }, dispatch })`.
2. **Персональный список рейсов для роли `Driver`**:
   - В `src/store/slices/authSlice.ts` добавить в тип `DemoUser` опциональное поле `assignedRunId?: string`, и для водителя `Marcus Hill` указать `assignedRunId: '214'`.
   - В `src/store/selectors/runsSelectors.ts` в селекторе `selectFilteredRuns` учитывать текущего пользователя (`state.auth.currentUser`): если у него есть `assignedRunId`, фильтровать список рейсов так, чтобы водитель видел только свой рейс (`Truck 214`).

---

### Задача 2. Экономика рейса и Чистая прибыль (`Net Profit` & `Operating Cost`)

В логистике США пустые мили критичны тем, что на них сгорают топливо (`Fuel cost`) и оплата водителю за милю (`Driver pay`).

1. **Добавить нормативы расходов в `src/store/slices/uiSlice.ts`**:
   - В `UiState` и `createInitialUiState()` добавить:
     - `fuelCostPerMile: 0.62` ($0.62/mi на дизель)
     - `driverPayPerMile: 0.65` ($0.65/mi зарплата водителя)
   - Расширить `updateCarrierTargets`, чтобы он принимал `fuelCostPerMile?: number` и `driverPayPerMile?: number`.
2. **Расширить расчёты в `src/store/selectors/runsSelectors.ts`**:
   - Себестоимость мили: `costPerMile = fuelCostPerMile + driverPayPerMile` (по умолчанию `$1.27 / mi`).
   - В `EnrichedRun` добавить:
     - `operatingCost: number | null` — если `totalMiles !== null`, то `Math.round(totalMiles * costPerMile)`, иначе `null`.
     - `netProfit: number | null` — если `operatingCost !== null`, то `revenue - operatingCost`, иначе `null`.
   - В `FleetKpiSummary` (`selectFleetKpis`) добавить:
     - `totalOperatingCost: number` (сумма `operatingCost ?? 0` по всем рейсам)
     - `totalNetProfit: number` (`totalRevenue - totalOperatingCost`)
   - *Проверка цифр на `Truck 214`*:
     - До добавления обратного груза (`1,410 mi` всего): `Revenue = $3,200`, `Operating Cost = $1,791`, **`Net Profit = $1,409`**.
     - После добавления `Blue Ridge Logistics` (`1,405 mi` всего): `Revenue = $5,300`, `Operating Cost = $1,784`, **`Net Profit = $3,516`** (чистая прибыль вырастает в **2.5 раза**!).
3. **Отобразить `Net Profit` в UI**:
   - В **`Overview.tsx`**: в первой KPI-карточке (`Fleet revenue`) или в `subtext` вывести чистую прибыль парка: `Net profit ${formatMoney(kpis.totalNetProfit, 0)} · Paid ${formatMiles(kpis.totalPaidMiles)}`.
   - В **`RunDetail.tsx`**: в плашке `<Stat label="Revenue" ... />` добавить `subtext`:
     ```tsx
     subtext={
       netProfit !== null && operatingCost !== null
         ? `Net ${formatMoney(netProfit, 0)} · Cost ${formatMoney(operatingCost, 0)}`
         : undefined
     }
     ```
   - В **`Account.tsx`**: в секции `Dispatch profitability targets` добавить 2 числовых инпута:
     - `Fuel cost per mile ($/mi)` (`step="0.05"`, управляет `fuelCostPerMile`)
     - `Driver pay per mile ($/mi)` (`step="0.05"`, управляет `driverPayPerMile`)
     (также `disabled={!permissions.canEditTargets}`, как и остальные таргеты).

---

### Задача 3. Подтверждение доставки (`POD`) и статус выставления счёта (`Invoiced`) на грузах

В США после доставки (`Delivered`) водитель должен загрузить/подтвердить `POD` (Proof of Delivery / подписанный BOL), а диспетчер — отправить счёт брокеру (`Invoiced`).

1. **Модель данных (`src/runs/demo.ts`)**:
   - Добавить тип:
     ```ts
     export type BillingStatus = 'POD required' | 'POD received' | 'Invoiced';
     ```
   - В тип `Load` добавить опциональное поле `billingStatus?: BillingStatus`.
   - В стартовых данных (`runs` в `demo.ts`):
     - На `Truck 214` у доставленного груза `Hart Freight` поставить `billingStatus: 'POD required'`.
     - На `Truck 107` (завершённый рейс) у груза `Bluegrass Retail` поставить `billingStatus: 'Invoiced'`.
     - На `Truck 305` у первого груза `Apex Industrial` поставить `billingStatus: 'POD received'`.
2. **Экшен в `src/store/slices/runsSlice.ts`**:
   - В `updateLoadStatus`: если груз переводится в статус `'Delivered'` и у него ещё нет `billingStatus`, автоматически ставить `load.billingStatus = 'POD required'`.
   - Добавить редюсер `advanceLoadBilling(state, action: PayloadAction<{ runId: string; loadId: string }>)`:
     - Если `load.billingStatus === 'POD required'` (или не задан) → меняет на `'POD received'`.
     - Если `load.billingStatus === 'POD received'` → меняет на `'Invoiced'`.
3. **Отображение в карточке груза (`RunDetail.tsx`)**:
   - Если `load.status === 'Delivered'`, показывать рядом со статусом груза (или в действиях груза):
     - Бейдж текущего `billingStatus` (`POD required` — `--warn`, `POD received` — обычный, `Invoiced` — `--ok`).
     - Если `billingStatus === 'POD required'` и `permissions.canUpdateLoadStatus` (доступно и водителю, и диспетчеру, и менеджеру) — кнопку `Confirm POD`.
     - Если `billingStatus === 'POD received'` и `permissions.canManageLoads` (доступно диспетчеру и менеджеру) — кнопку `Send invoice`.

---

### Задача 4. Диспетчерский журнал связи (`DispatchLog.tsx` — Check-calls & Notes)

1. **Модель данных (`src/runs/demo.ts`)**:
   - Добавить тип заметки:
     ```ts
     export type DispatchNote = {
       id: string;
       author: string;
       roleTitle: string;
       at: string;
       text: string;
     };
     ```
   - В тип `Run` добавить `notes?: DispatchNote[]`.
   - В стартовых данных `Truck 214` добавить 2 начальных check-call сообщения:
     1. `{ id: 'n1', author: 'Marcus Hill', roleTitle: 'Driver · Truck 214', at: 'Oct 28, 2:15 PM', text: 'Unloaded at South Park Warehouse (Atlanta, GA). 3.5 h driving shift remaining.' }`
     2. `{ id: 'n2', author: 'Alex Mercer', roleTitle: 'Senior Fleet Dispatcher', at: 'Oct 28, 2:30 PM', text: 'Checking Atlanta backhaul offers that allow a 10 h overnight reset.' }`
2. **Экшен в `src/store/slices/runsSlice.ts`**:
   - Добавить редюсер `addRunNote(state, action: PayloadAction<{ runId: string; author: string; roleTitle: string; text: string }>)`:
     Добавляет новую запись в `run.notes` (с `id: crypto.randomUUID()`, `at: 'Just now'`).
3. **Компонент `src/components/Workspace/DispatchLog.tsx` (~55 строк)**:
   - Принимает `run: Run`.
   - Выводит список заметок `run.notes` (автор, роль, время и текст).
   - Содержит компактную форму (1 инпут с `placeholder="Log check-call, dock # or broker note..."` и кнопку `Post note`), доступную всем авторизованным ролям (`currentUser` берётся из `selectCurrentUser`).
   - Подключить `<DispatchLog run={run} />` в `RunDetail.tsx`.

---

### Задача 5. Тесты (`Runs.test.tsx`, `runsSlice.test.ts`)

1. В `runsSlice.test.ts`:
   - Проверить расчёт `operatingCost` и `netProfit` на `Truck 214` до и после добавления обратного груза (`$1,409` → `$3,516`).
   - Проверить переходы `advanceLoadBilling` (`POD required` → `POD received` → `Invoiced`) и добавление заметки `addRunNote`.
2. В `Runs.test.tsx`:
   - Проверить, что водитель `Marcus Hill` видит в списке только свой `Truck 214`, может нажать `Confirm POD` и оставить заметку в `DispatchLog`, но не видит кнопку `Send invoice` и форму добавления груза.

---

## Критерии приёмки (Definition of Done)
- [x] Код остаётся простым и модульным (`DispatchLog.tsx` вынесен в отдельный файл, `RunDetail.tsx` не перегружен).
- [x] Нет дублирования между `LoginScreen.tsx` и `devAutoAuth.ts`.
- [x] На экране рейса и в `Overview` видна чистая прибыль (`Net profit`) и расходы (`Cost`), которые пересчитываются при добавлении груза.
- [x] Работает цепочка `Confirm POD` → `Send invoice` и добавление заметок в `DispatchLog`.
- [x] Все тесты (`npm test -- --run`), линтер (`npm run lint`) и сборка (`npm run build`) проходят без ошибок.
