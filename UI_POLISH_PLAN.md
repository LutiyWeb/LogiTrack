# План исправления UI-багов и визуального апгрейда — `UI_POLISH_PLAN.md`

Этот документ подготовлен ревью-агентом для агента-разработчика.
**Цель:** исправить 4 визуальных бага вёрстки и внедрить наглядные UI-компоненты логистической CRM (семантические белые KPI-карточки со спарклайнами, цветные статусы, двухцветные полоски пробега `Paid / Empty`, круговой индикатор `HOS`, логотип в сайдбаре и интерактивную SVG-карту маршрутов).

---

## Главные правила реализации (Senior / KISS)
1. **Никаких сторонних UI/Chart/Map библиотек**: спарклайны, круговой индикатор `HOS` и карта маршрутов делаются на чистом, легковесном inline SVG (~50–90 строк).
2. **Не ломать существующие тесты**: все текстовые подписи, `aria-label` и роли кнопок/секций, на которые опираются 17 тестов Vitest, должны остаться на месте!
3. **Чистая модульность**: вынести карту маршрутов в отдельный небольшой компонент `src/components/Workspace/FleetRouteMap.tsx`, а маленькие визуальные примитивы (кружок HOS, полоска миль, бейдж статуса) — в компактный `src/components/Workspace/RunVisuals.tsx`.

---

## Чек-лист задач для выполнения

### Задача 1. Исправить 4 бага вёрстки (`AppShell.scss`, `Workspace.scss`, `Sidebar.tsx`)

1. **Отступ под плашкой (`.runs__badge`) в алертах и карточках**:
   - В `Workspace.scss` для `.runs__badge` (когда за ним идёт текст/заголовок внутри `div`, например `.runs__badge + .runs__truck`) добавить `margin-top: 8px` у `.runs__truck` (или `margin-bottom: 8px` у `.runs__badge` внутри заголовков карточек `.runs__load-head > div > .runs__badge`), чтобы плашка не прилипала к тексту снизу в `Overview`, `BackhaulOffers`, `Brokers` и `LoginScreen`.
2. **Расширить сайдбар и добавить логотип компании вверху (`AppShell.scss`, `Sidebar.tsx`)**:
   - В `AppShell.scss` увеличить ширину открытого сайдбара с `212px` до **`260px`** (`grid-template-columns: 260px minmax(0, 1fr);`), чтобы имя `Sarah Jenkins` и должность `Senior Fleet Dispatcher` помещались целиком и не обрезались в `"Sarah Jen..."`.
   - В `Sidebar.tsx` добавить в самый верх фирменную шапку с логотипом (`sidebar__brand`): SVG-иконка грузовика/трассы + текст **`LogiTrack`** (`TMS & Dispatch`) и кнопка сворачивания сайдбара (`sidebar__toggle`). Блок пользователя (`sidebar__user`) расположить под брендом.
3. **Убрать пустую полосу справа (`Workspace.scss`)**:
   - В `Workspace.scss` у `.runs` изменить `max-width: 960px` на **`max-width: 1360px; width: 100%; margin-inline: auto;`**, чтобы контент гармонично заполнял широкие экраны и центрировался.
4. **Перевести KPI-карточки (`.runs__stat`) на белый фон с семантическим цветом (`labels.scss`, `Workspace.scss`)**:
   - В `labels.scss` добавить семантические переменные:
     - `--color-good: #16a34a;` / `--color-tint-red: #fee2e2;` / `--color-danger: #dc2626;` / `--color-warn: #d97706;` / `--color-primary: #2563eb;`.
   - Сделать базовую карточку `.runs__stat` **белой** (`background: var(--color-surface); border: 1px solid var(--color-line);`) вместо случайного чередования голубого и серого.
   - Добавить семантические модификаторы `.runs__stat--good` (зелёный акцент/верхняя или левая рамка), `.runs__stat--warn` (оранжевый), `.runs__stat--danger` (красный).

---

### Задача 2. Семантические KPI со спарклайнами и улучшенный блок алертов (`Overview.tsx`, `RunDetail.tsx`)

1. **Оценка KPI в `Overview.tsx` и `RunDetail.tsx`**:
   - **`Deadhead ratio`** (в `Overview`) и **`Empty miles`** (в `RunDetail`):
     - Если процент пустых миль превышает `maxEmptyPercent` (например, `47%` при норме `20%`) — карточка получает модификатор `--danger`, красное/оранжевое значение и индикатор превышения (`↑ Above 20% limit`).
     - Если в пределах нормы (`≤ 20%`) — модификатор `--good` (`✓ Within target`).
   - **`Fleet $ per mile`** (в `Overview`) и **`$ per mile`** (в `RunDetail`):
     - Если ставка `>= targetRate` — модификатор `--good` (зелёный цвет цифры + стрелка `↑`), если ниже — `--warn` (оранжевый + стрелка `↓`).
   - В каждую KPI-карточку в `Overview.tsx` добавить компактный inline-SVG спарклайн тренда (`width="64" height="20"`, тонкая ломаная линия `<polyline>`), подкрашенный в цвет статуса карточки.
2. **Улучшить карточку алерта в `Overview.tsx` (`Dispatcher alerts & backhaul queue`)**:
   - Добавить класс `.runs__load--alert` с выразительной левой полосой (`border-left: 4px solid var(--color-danger)`), SVG-иконкой предупреждения рядом с бейджем и мини-прогресс-баром пустого пробега внутри карточки.

---

### Задача 3. Визуальные индикаторы рейса: статусы, полоска `Paid / Empty` и кружок `HOS` (`src/components/Workspace/RunVisuals.tsx`)

Создать компактный файл `src/components/Workspace/RunVisuals.tsx` с 3 простыми переиспользуемыми компонентами и подключить их в `Overview.tsx`, `Runs.tsx` и `RunDetail.tsx`:

1. **Цветной бейдж статуса рейса (`<RunStatusBadge status={run.status} />`)**:
   - Заменяет голый текст `<span className="runs__status">{run.status}</span>`.
   - Сохраняет класс `runs__status` и текст статуса внутри, но добавляет цветовую стилизацию:
     - `In transit` — синий бейдж (`--in-transit`)
     - `Planned` — серый бейдж (`--planned`)
     - `Completed` — зелёный бейдж (`--completed`)
2. **Двухцветная полоска миль (`<MilesSplitBar paidMiles={...} emptyMiles={...} />`)**:
   - Рисует наглядную горизонтальную полоску (`height: 6px; width: 140px; border-radius: 999px; overflow: hidden; display: flex`):
     - Синий сегмент (`var(--color-primary)`) = процент гружёных миль (`paidMiles / totalMiles`).
     - Оранжево-серый сегмент (`var(--color-warn)`) = процент пустых миль (`emptyMiles / totalMiles`).
   - Отображается рядом с текстом `Paid ... · Empty ...` (важно: сам текст `Empty 710 mi · $2.27 / mi` в `Runs.tsx` и `Paid ... · Empty ...` в `Overview.tsx` **оставить**, чтобы существующие регулярки в тестах `Runs.test.tsx` находили его!).
3. **Круговой индикатор рабочего времени водителя (`<HosRing hoursLeft={run.drivingHoursLeft} />`)**:
   - Маленький SVG-индикатор (`20×20px`, `<circle>` со `stroke-dasharray`), рассчитывающий долю от 11-часовой смены (`Math.min(1, hoursLeft / 11)`).
   - Если `hoursLeft < 4` (например, `3.5 h` у `Truck 214`) — цвет кольца оранжевый (`var(--color-warn)`), иначе — зелёный/синий.

---

### Задача 4. Интерактивная SVG-карта маршрутов (`src/components/Workspace/FleetRouteMap.tsx`)

Создать компонент `FleetRouteMap.tsx` (~90–110 строк) на чистом SVG (без внешних библиотек):
1. Отображает схему логистического коридора **Midwest ↔ Southeast** (`viewBox="0 0 560 280"`) с фиксированными координатами наших городов:
   - `Joliet, IL`, `Indianapolis, IN` (Home Yard ★), `Greenwood, IN`, `Fort Wayne, IN`, `Columbus, OH`, `Cincinnati, OH`, `Louisville, KY`, `Bowling Green, KY`, `Nashville, TN`, `Marietta, GA`, `Atlanta, GA`.
2. Для переданных рейсов (всех рейсов в `Overview` или одного выбранного рейса в `RunDetail`) рисует:
   - **Гружёные плечи (`Paid loads`)** — сплошными синими линиями (`stroke="var(--color-primary)" strokeWidth="3"`).
   - **Пустые перегоны (`Empty legs`)** — пунктирными оранжево-красными линиями (`stroke="var(--color-warn)" strokeDasharray="5 4"`). Когда на `Truck 214` добавляется обратный груз `Blue Ridge Logistics`, длинная пунктирная линия пустого возврата `Atlanta → Indianapolis (530 mi)` прямо на глазах сменяется синей сплошной линией гружёного маршрута `Marietta → Greenwood`!
3. В `Overview.tsx` расположить блок `Dispatcher alerts & backhaul queue` и `FleetRouteMap` в 2 колонки (`runs__overview-grid` — `grid-template-columns: 1fr 1.15fr` на десктопе). также добавить компактную карту маршрута внутрь `RunDetail.tsx`.

---

## Критерии приёмки (Definition of Done)
- [ ] Плашки `.runs__badge` имеют аккуратный отступ снизу (`8px`) и не слипаются с заголовками.
- [ ] Сайдбар расширен (`260px`), сверху есть логотип `LogiTrack`, имя `Sarah Jenkins` не обрезается.
- [ ] Контент растянут до `1360px` и отцентрован, справа нет пустой дыры.
- [ ] KPI-карточки белые, со спарклайнами и семантической подсветкой (красный при высоком `deadhead`, зелёный при выполнении нормы).
- [ ] Работают цветные статусы рейсов, двухцветная полоска `Paid / Empty`, круговой индикатор `HOS` и интерактивная SVG-карта маршрутов.
- [ ] Все тесты (`npm test -- --run`), линтер (`npm run lint`) и сборка (`npm run build`) проходят без единой ошибки.
