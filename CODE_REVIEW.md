# Code Review & План рефакторинга (`feat/frontend-demo-redux`)

Этот документ подготовлен ревью-агентом для агента-разработчика.
**Цель:** сохранить весь функционал демо и Redux Toolkit, но **максимально упростить код (принцип KISS)**, избавиться от простыней импортов, убрать проп-дриллинг, дублирование вычислений и разбить перегруженный `Runs.tsx` (767 строк) на компактные смысловые компоненты.

---

## Главные правила рефакторинга
1. **Redux Toolkit оставляем**, так как он нужен для демонстрации навыков работы со стором.
2. **Все существующие фичи и тесты сохраняем**: `Overview`, `Runs`, `Account`, `Broker Load Board`, `Route timeline` и все 12 тестов Vitest должны работать как раньше.
3. **Пишем проще**: меньше бойлерплейта, меньше пропсов, никаких лишних пересчётов одних и тех же данных в разных местах.

---

## Чек-лист задач для выполнения

### Задача 1. Разбить `src/components/Workspace/Runs.tsx` (767 строк) на 4 смысловых компонента

**Проблема сейчас:**
В одном файле `Runs.tsx` лежат сразу 4 разных экрана/блока (`Runs`, `RunList`, `RunDetail`, `OfferCard` + огромная форма на 15 полей). Из-за этого в шапке файла **53 строки импортов**, а корневой компонент `Runs` работает бесполезным «курьером», доставая данные и экшены из Redux и прокидывая **13 пропсов** в `RunDetail`.

**Что нужно сделать:**
Разделить `src/components/Workspace/Runs.tsx` на понятные файлы (можно положить рядом в `src/components/Workspace/` или в подпапку `src/components/Workspace/runs/`):

1. **`Runs.tsx` (~90–110 строк)**:
   - Проверяет `selectOpenRun`. Если рейс открыт — рендерит `<RunDetail />` (без прокидывания 13 пропсов!). Если не открыт — рендерит список рейсов (`RunList`).
2. **`RunDetail.tsx` (~170–200 строк)**:
   - Сам берёт открытый рейс из стора через `useAppSelector(selectOpenRun)` и сам вызывает `useAppDispatch()` для изменения статуса рейса/груза, удаления груза и ввода `manualMiles`.
   - Рендерит шапку, KPI (`Stat`), список грузов, пустые мили, таймлайн маршрута, `<BackhaulOffers />` и `<AddLoadForm />`.
3. **`BackhaulOffers.tsx` (~80–90 строк)**:
   - Секция `Available backhaul offers near Atlanta, GA` и карточка `OfferCard`.
   - Принимает только `run: Run` (или берёт из стора) и сама диспатчит `applyPresetToDraft` и добавление груза.
4. **`AddLoadForm.tsx` (~70–90 строк)**:
   - Форма `Add a load` (см. Задачу 2). Сама работает с `draft` из стора и диспатчит `patchDraft`, `applyPresetToDraft`, `addLoadFromDraft`.

---

### Задача 2. Сократить форму `AddLoadForm.tsx` в 2.5 раза (со 175 до ~70 строк)

**Проблема сейчас:**
В `Runs.tsx` (строки 473–645) 15 раз подряд вручную скопирован шаблон `<Field label="..."><input className="runs__input" ... /></Field>`. При этом поля погрузки (`Pickup place`, `Pickup city`, `Pickup state`, `Pickup time`) и выгрузки (`Delivery place`, `Delivery city`, `Delivery state`, `Delivery time`) имеют идентичную структуру.

**Что нужно сделать:**
1. Внутри `AddLoadForm.tsx` сделать компактный вспомогательный компонент поля ввода `FormInput` (объединяющий `<label className="runs__field">`, `<span className="runs__label">` и `<input className="runs__input">`), чтобы каждое поле записывалось в 1–2 строки вместо 10.
2. По желанию выделить компактную группу `StopFields` (для `Pickup` и `Delivery`), чтобы не дублировать 4 поля дважды.
3. **Важно для тестов:** сохранить все тексты `<span className="runs__label">` и кнопку `Use Blue Ridge Logistics` / `Add load` один в один, чтобы тесты и вёрстка не сломались.

---

### Задача 3. Убрать дублирование расчётов между `runsSelectors.ts` и `RunDetail`

**Проблема сейчас:**
В `src/store/selectors/runsSelectors.ts` селектор `selectEnrichedRuns` уже считает для каждого рейса `legs`, `paidMiles`, `emptyMiles`, `revenue`, `dollarsPerMile`.
Но `selectOpenRun` возвращает «сырой» `Run`, из-за чего в `RunDetail` снова импортируются функции `runLegs`, `paidMiles`, `emptyMilesTotal`, `revenue`, `dollarsPerMile` и вызываются по второму кругу:
```tsx
const legs = runLegs(run, manualMiles);
const empty = emptyMilesTotal(legs);
const perMile = dollarsPerMile(run, legs);
```

**Что нужно сделать:**
1. В `src/store/selectors/runsSelectors.ts` переписать `selectOpenRun`, чтобы он брал уже посчитанный `EnrichedRun` из `selectEnrichedRuns`:
   ```ts
   export const selectOpenRun = createSelector(
     [selectEnrichedRuns, selectOpenRunId],
     (enrichedRuns, openRunId) =>
       enrichedRuns.find((item) => item.run.id === openRunId) ?? null,
   );
   ```
   *(Если в тестах `runsSlice.test.ts` проверяется `selectOpenRun(state)?.truck`, можно либо оставить `selectOpenRun` возвращающим `Run` и добавить `selectOpenEnrichedRun`, либо поправить обращение в тесте — главное, чтобы `RunDetail` брал готовые метрики из селектора и не импортировал `runLegs`, `paidMiles`, `emptyMilesTotal`, `revenue`, `dollarsPerMile`).*

---

### Задача 4. Почистить Redux-слайсы и мёртвый код (`runsSlice.ts`, `uiSlice.ts`, `demo.ts`)

1. **Сброс черновика при смене рейса (`src/store/slices/runsSlice.ts`)**:
   - В редюсере `openRun` сбрасывать `state.draft = { ...emptyDraft }`, чтобы недописанная форма из одного рейса не оставалась при открытии другого рейса.
2. **Убрать дублирование `addLoadFromDraft` и `addLoadDirect` (`src/store/slices/runsSlice.ts`)**:
   - Сейчас это два почти одинаковых редюсера. Можно сделать один универсальный редюсер или общую внутреннюю функцию добавления груза: если передан `draft` — берём его, иначе берём `state.draft`, пушим в `run.loads` и очищаем `state.draft`.
3. **Убрать неизменяемую статику из `uiSlice` (`src/store/slices/uiSlice.ts`)**:
   - Поля `dispatcherRole`, `carrierName`, `mcNumber`, `dotNumber`, `homeYard` никогда не изменяются (для них даже нет экшенов), но лежат в Redux-сторе и сериализуются в `localStorage`.
   - Вынести их в экспортируемую константу `carrierProfile` в `uiSlice.ts` (или `demo.ts`), а в `UiState` оставить только реально изменяемое состояние (`activeSectionId`, `isSidebarOpen`, `statusFilter`, `dispatcherName`, `targetRatePerMile`, `maxEmptyPercent`).
4. **Удалить мёртвые поля в `RouteStep` (`src/runs/demo.ts`)**:
   - В типе `RouteStep` и функции `routeTimeline` поля `status`, `legKey`, `isKnownEmpty` заполняются, но нигде в компонентах и тестах не читаются. Удалить их для чистоты типа.

---

### Задача 5. Исправить числовые инпуты в `src/components/Workspace/Account.tsx`

**Проблема сейчас:**
В `Account.tsx` (строки 78–83 и 97–102):
```tsx
onChange={(event) => {
  const next = Number(event.target.value);
  if (Number.isFinite(next) && next > 0) {
    dispatch(updateCarrierTargets({ targetRatePerMile: next }));
  }
}}
```
Если пользователь пытается стереть число в поле (`Backspace`), `event.target.value` становится `""`, `Number("")` даёт `0`, условие `next > 0` блокирует обновление, и последняя цифра в инпуте не стирается.

**Что нужно сделать:**
Позволить нормально редактировать поле (например, обрабатывать пустую строку или хранить ввод корректно, не блокируя очистку поля).

---

## Критерии приёмки (Definition of Done)
- [x] В `Runs.tsx` и новых компонентах (`RunDetail.tsx`, `AddLoadForm.tsx`, `BackhaulOffers.tsx`) короткие, чистые списки импортов (до 10–15 строк).
- [x] Нет передачи 13 пропсов из `Runs` в `RunDetail`.
- [x] Форма `AddLoadForm.tsx` занимает до ~80–90 строк без копипасты 15 одинаковых обёрток.
- [x] `RunDetail` использует готовые расчёты из селектора, а не пересчитывает `runLegs`, `paidMiles`, `emptyMilesTotal`, `revenue`, `dollarsPerMile` вручную.
- [x] Команды `npm test -- --run`, `npm run lint` и `npm run build` проходят без единой ошибки.
