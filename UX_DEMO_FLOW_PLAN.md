# План продуктового апдейта демо-сценария — `UX_DEMO_FLOW_PLAN.md`

Этот документ фиксирует 8 пунктов доработки UX и бизнес-логики LogiTrack для американского диспетчера / Fleet Manager.
**Главное правило:** делать ТОЛЬКО описанные ниже изменения, сохранять единый источник демо-данных в `src/runs/demo.ts`, работоспособность кнопки `Reset Demo Data` на странице `Account` и английский язык интерфейса.

---

## Чек-лист задач

### 1. Демо-сценарий на `Overview` (`src/components/Workspace/Overview.tsx`, `RunDetail.tsx`)
- На карточке алерта `Truck 214` добавить заметный бейдж/подсказку **`Start here`**:
  `"Start here: Truck 214 is returning empty → click Find backhaul → assign a load → watch All-in $/mi jump."`
- Клик по кнопке `"Find backhaul"` открывает карточку этого рейса и плавно прокручивает экран к блоку `"Available backhaul offers"` (например, через флаг/хэш или `useEffect` + `scrollIntoView` на секции `aria-label="Broker load board"`).
- После нажатия `"Assign load"` KPI на `Overview` и список алертов автоматически обновляются (алерт для `Truck 214` исчезает).

### 2. Структура страницы `Runs` и модалка `New load` (`AppShell.tsx`, `Runs.tsx`, `RunDetail.tsx`, `AddLoadForm.tsx`, `BackhaulOffers.tsx`)
- Клик по пункту `"Runs"` в левом сайдбаре (`AppShell.tsx`) должен всегда открывать список ВСЕХ рейсов (`dispatch(openRun(null))` + `dispatch(setActiveSection('board'))`).
- В списке рейсов (`Runs.tsx`) в каждой строке наглядно отображать: `Truck`, `Driver`, `Route` (`lane`), `Status` (цветной бейдж), `Loads count` (`1 load` / `2 loads`), горизонтальную полосу `Paid mi / Empty mi` с цифрами, `Revenue` и `All-in $/mi`.
- На странице открытого рейса (`RunDetail.tsx`) кнопка возврата в список должна называться **`← Back to runs`**.
- Убрать встроенную форму `"Add a load"` снизу страницы `RunDetail.tsx`.
- Вместо неё сделать модальное окно (`AddLoadModal` в `AddLoadForm.tsx`):
  - В списке рейсов (`Runs.tsx`) и в шапке секции `Loads` (`RunDetail.tsx`) добавить кнопку **`New load`**, открывающую модалку.
  - Внутри модалки: селект **`Truck / Driver`** (позволяющий выбрать существующий рейс/трак или опцию `+ New run (Truck 412 · Sam Carter)`) + поля формы груза + быстрая кнопка `"Use Blue Ridge Logistics"`.
  - Кнопка `"Fill form"` на карточке предложения в `BackhaulOffers.tsx` открывает эту же модалку с уже заполненными полями выбранного оффера!

### 3. Логика статусов (`src/runs/demo.ts`, `runsSlice.ts`, `RunVisuals.tsx`, `RunDetail.tsx`)
- Расширить `RunStatus`: `'Planned' | 'In transit' | 'Empty return' | 'Completed'`.
- Добавить чистую функцию `deriveRunStatus(run: Run): RunStatus` в `src/runs/demo.ts`, чтобы статус рейса всегда вычислялся из его грузов и участков и никогда им не противоречил:
  - Если грузов нет или все грузы `'Assigned'` → `'Planned'`.
  - Если хотя бы один груз `'At pickup'` или `'In transit'`, либо есть доставленный груз и следом назначен ещё один (`'Assigned'`) → `'In transit'`.
  - Если все грузы `'Delivered'` и город последней выгрузки совпадает с базой (`yardCity, yardState`) → `'Completed'`.
  - Если все грузы `'Delivered'`, но последняя выгрузка НЕ на базе (машина едет на базу пустой, как `Truck 214` в `Atlanta, GA`) → **`'Empty return'`**.
- Начальный статус `Truck 214` в `demo.ts` — **`'Empty return'`** (оранжевый бейдж в `RunVisuals.tsx`). При добавлении второго груза (`Assigned`), смене статуса груза или удалении груза в `runsSlice.ts` автоматически пересчитывать `run.status = deriveRunStatus(run)`.
- **Показывать каждый статус ТОЛЬКО ОДИН РАЗ** (убрать дублирование «текст + дропдаун»):
  - В шапке `RunDetail.tsx`: показывать только цветной бейдж `<RunStatusBadge status={run.status} />` (так как статус рейса вычисляется автоматически из грузов).
  - В карточке груза (`RunDetail.tsx`): если `permissions.canUpdateLoadStatus === true`, показывать **только** цветной `<select>` статуса груза (без текстового `<p className="runs__status">` рядом!). Если прав нет — показывать только цветной бейдж статуса груза (`Delivered` — зелёный, `In transit` / `At pickup` — синий, `Assigned` — серый).

### 4. Алерты и правила (`src/store/selectors/runsSelectors.ts`, `BackhaulOffers.tsx`)
- В `runsSelectors.ts` создавать алерт (`needsBackhaul = true`) для **КАЖДОГО активного рейса** (`run.status !== 'Completed'`), у которого `deadheadPercent > maxEmptyPercent` (убрать лишнее условие `&& perMile < targetRatePerMile`, из-за которого `Truck 118` с `65%` порожняка не попадал в алерты!). Завершённые рейсы (`Completed`) алертов не получают.
- В `BackhaulOffers.tsx`: для предложений с HOS-конфликтом (`preview.hosNote.includes('drops off')` или `offer.tone === 'warning'`) кнопка **`"Assign load"` должна быть `disabled`** с `title` тултипом, объясняющим конфликт (`"HOS conflict: pickup at 5:00 PM does not wait for required 10h off-duty reset"`).

### 5. Рейсы с несколькими грузами (`src/runs/demo.ts`, `Overview.tsx`, `Runs.tsx`, `RunDetail.tsx`)
- В функции `lane(run: Run)` в `demo.ts`: если на рейсе больше одного груза (например, `Truck 305`), выводить все уникальные остановки маршрута по порядку (`Cincinnati, OH → Nashville, TN → Bowling Green, KY → Indianapolis, IN`).
- В `"Fleet runs summary"` на `Overview.tsx` показывать метку количества грузов (`2 loads` / `1 load`).
- Не показывать `"HOS remaining"` и `<HosRing />` у завершённых рейсов (`run.status === 'Completed'`).

### 6. Подписи и удаление дублирующего блока `Empty miles` (`Overview.tsx`, `Runs.tsx`, `RunDetail.tsx`)
- Переименовать `"$ per mile"` / `"Fleet $ per mile"` в **`"All-in $/mi"`** везде и добавить тултип `title="Revenue ÷ total miles (paid + empty)"`.
- На странице рейса (`RunDetail.tsx`) **убрать секцию `"Empty miles"`** (так как она дублирует `"Route & leg breakdown"`). Чтобы ручной ввод неизвестных пустых миль продолжал работать, рендерить `<input aria-label="Empty miles from ... to ..." />` прямо внутри соответствующего шага `Empty leg` в секции `"Route & leg breakdown"`, когда участок неизвестен (`!isKnownEmptyLeg(step.from, step.to)`).

### 7. Страница `Brokers` → `Customers & billing` (`navigation.ts`, `demo.ts`, `runsSelectors.ts`, `runsSlice.ts`, `Brokers.tsx`)
- Переименовать пункт меню и заголовок страницы `Brokers` в **`Customers & billing`**.
- В `brokerDirectory` (`demo.ts`) добавить тип контрагента `kind: 'Broker' | 'Shipper'`:
  - `Midwest Steel Co.`, `Bluegrass Retail`, `Heartland Foods` → **`Shipper`**
  - `Hart Freight`, `Blue Ridge Logistics`, `Apex Industrial` → **`Broker`**
- На каждой карточке аккаунта в `Brokers.tsx` показывать бейдж `Broker` или `Shipper`.
- Если у аккаунта есть груз(ы) в статусе `billingStatus === 'POD received'`, показывать на карточке этого аккаунта кнопку **`Create invoice`**. Клик по ней переводит все `'POD received'` грузы этого клиента в `'Invoiced'`, перенося сумму из `Pending` в `Invoiced` и обновляя KPI-карточки!

### 8. Проверка и тесты
- Обновить и дополнить тесты (`demo.test.ts`, `runsSlice.test.ts`, `Runs.test.tsx`) под новые подписи (`All-in $/mi`, `Empty return`, модалка `New load`, `Customers & billing`, `Create invoice`).
- Проверить `npm test -- --run`, `npm run lint` и `npm run build`.
