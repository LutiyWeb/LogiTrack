# План доработки фронтенда до полноценного демо (LogiTrack CRM / TMS)

Этот документ фиксирует план работ **только по фронтенду** (без бэкенда). Все доработки выполнены в ветке `feat/frontend-demo-redux`.

---

## Стек и архитектура
- **UI**: React 19 + TypeScript + Vite + SCSS (с соблюдением БЭМ и правил порядка CSS-свойств из `.cursor/rules/css-property-order.mdc`).
- **State Management**: **Redux Toolkit (`@reduxjs/toolkit`) + `react-redux`** — единый стор для рейсов, доски грузов, фильтров, ручного ввода пустых миль и настроек диспетчера + синхронизация с `localStorage` (чтобы данные не пропадали при перезагрузке) и кнопка быстрого сброса к исходному состоянию демо.
- **Тестирование**: **Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`)** — юнит-тесты бизнес-логики, тесты Redux-слайсов/селекторов и интеграционные тесты UI-сценариев.

---

## Задачи (Roadmap)

### Задача 1. Подключение Redux Toolkit и перенос состояния в Store
**Цель**: Показать современную продакшн-архитектуру управления состоянием в React через Redux Toolkit.
- [x] Установить `@reduxjs/toolkit` и `react-redux`.
- [x] Создать структуру `src/store/`:
  - `store.ts` — конфигурация `configureStore` + сохранение/восстановление состояния из `localStorage`.
  - `hooks.ts` — типизированные хуки `useAppDispatch` и `useAppSelector`.
  - `slices/runsSlice.ts` — управление списком рейсов (`runs`), открытым рейсом (`openRunId`), черновиком формы (`draft`), ручными пустыми милями (`manualMiles`), экшены:
    - `openRun`, `addLoadFromDraft`, `addLoadDirect`, `updateLoadStatus`, `removeLoad`, `updateRunStatus`, `setManualMiles`, `setDraft`, `patchDraft`, `applyPresetToDraft`, `resetRunsState`.
  - `slices/uiSlice.ts` — активная вкладка меню (`overview` | `board` | `account`), состояние сайдбара (`isSidebarOpen`), фильтры по статусу рейсов и целевые нормативы перевозчика.
  - `selectors/runsSelectors.ts` — мемоизированные селекторы (`createSelector`) для расчёта метрик как отдельного рейса (`paidMiles`, `emptyMiles`, `revenue`, `$/mi`, `deadheadPercent`), так и сводных KPI по всему автопарку (`selectFleetKpis`).
- [x] Обернуть приложение в `<Provider store={store}>` в `src/App.tsx` и перевести `AppShell` и `Runs` с локального `useState` на Redux.

---

### Задача 2. Наполнение реалистичными данными и управление статусами
**Цель**: Убрать пустые поля и нули в существующих рейсах, дать возможность менять статусы вживую во время показа демо.
- [x] Дополнить стартовые данные (`seedRuns`) в `src/runs/demo.ts`:
  - **Truck 214 (Marcus Hill)** — главный демо-рейс (`In transit`, 710 пустых миль до добавления обратного груза).
  - **Truck 118 (Dana Brooks)** — заполнен заказчик (`Midwest Steel Co.`), ставка (`$1,450`), мили (`160 mi`), время в пути (`3.5 h`), BOL и груз (`Steel coils`), добавлены известные пустые плечи в таблицу.
  - **Truck 107 (Luis Ortega)** — заполнен завершённый рейс (`Completed`, заказчик `Bluegrass Retail`, ставка `$950`, `115 mi`, `2.5 h`, `Consumer electronics`).
  - **Truck 305 (Elena Rostova)** — добавлен 4-й рейс (`In transit`, `Cincinnati, OH → Nashville, TN → Indianapolis, IN` с 2 грузами).
- [x] В карточке рейса (`RunDetail`) добавлены:
  - Переключение статуса самого рейса (`Planned` → `In transit` → `Completed`).
  - Быстрое изменение статуса каждого груза на рейсе (`Assigned` → `At pickup` → `In transit` → `Delivered`).
  - Возможность удалить добавленный груз (`Remove`).

---

### Задача 3. Доска доступных грузов от брокеров (Backhaul Load Board) и таймлайн маршрута
**Цель**: Сделать выбор обратного груза наглядным для людей, которые не разбираются в логистике — показать, почему один груз выгодный и подходит по часам водителя, а другие нет.
- [x] Добавлен в `RunDetail` блок **Available Backhaul Offers** с 3 вариантами обратного груза для `Truck 214`:
  1. **Blue Ridge Logistics (Best backhaul match)**: `Marietta, GA → Greenwood, IN`, `$2,100`, `490 mi`, `9 h`. Пустые мили падают с `710` до `215 mi`, ставка рейса растёт до `$3.77 / mi`. Время погрузки ждёт после 10ч отдыха.
  2. **Southern Express Brokerage (HOS conflict · Urgent pickup)**: срочный забор в 17:00, водитель не успевает из-за лимита смены (`3.5 h left`, нужен `10 h off-duty reset`).
  3. **Delta Freight Partners (High deadhead · Low $/mi)**: большой пустой перегон до погрузки и низкая ставка (`$1,250`).
- [x] Кнопки `Fill form` и `Assign load` на каждой карточке предложения + сохранён быстрый пресет `Use Blue Ridge Logistics`.
- [x] Наглядный блок маршрута (**Route & leg breakdown**): визуальная цепочка `Yard → Pickup 1 → Delivery 1 → ... → Yard` с разделением на `Paid load` и `Empty leg`.

---

### Задача 4. Экран `Overview` — Дашборд автопарка и диспетчера
**Цель**: Наполнить вкладку `Overview`, чтобы при переключении в сайдбаре открывался полноценный аналитический экран CRM.
- [x] Сводные **KPI-карточки по парку** (`Fleet revenue`, `Fleet $ per mile`, `Deadhead ratio`, `Active trucks`).
- [x] Блок **Dispatcher alerts & backhaul queue**: подсветка `Truck 214` с высоким холостым пробегом (`50% deadhead`) и кнопкой `Find backhaul`, которая сразу открывает карточку `Truck 214`.
- [x] Сводный список всех рейсов (`Fleet runs summary`) с быстрым переходом в детали.

---

### Задача 5. Экран `Account` — Профиль диспетчера, нормативы компании и управление демо
**Цель**: Убрать пустую заглушку во вкладке `Account` и дать удобные инструменты для презентации.
- [x] Карточка профиля диспетчера и компании-перевозчика (`LogiTrack Freight LLC`, `MC-849201`, `USDOT 3194820`, `Indianapolis, IN`).
- [x] Настройки целевых показателей парка (`Target rate per mile`, `Max empty miles threshold`, `Dispatcher name`).
- [x] Блок **Demo environment controls**: кнопка `Reset Demo Data` (сбрасывает Redux store и `localStorage` к начальному состоянию).

---

### Задача 6. Покрытие тестами на Vitest
**Цель**: Полный набор зелёных тестов (`npm test`), проверяющих расчёты, Redux store и пользовательские сценарии.
- [x] **`src/runs/demo.test.ts`** — 6 юнит-тестов всех формул и HOS-расчётов.
- [x] **`src/store/runsSlice.test.ts`** — 4 теста редюсеров и мемоизированных селекторов Redux Toolkit.
- [x] **`src/components/Workspace/Runs.test.tsx`** — 2 интеграционных теста UI-сценариев.
