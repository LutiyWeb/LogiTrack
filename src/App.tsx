import type { Room, Trip } from './types';
import { useEffect, useState } from 'react';
import TripList from './components/TripList';
import { formatEuro, readMoney, tripQuote } from './quote';

function App() {
  const trip: Trip = {
    id: '1',
    title: 'Брашов',
    status: 'selling',
    targetParticipants: 10,
    organizerCosts: 100,
    dateStart: '2026-05-10',
    dateEnd: '2026-05-12',
    price: 120,
    prepaymentAmount: 30,
    prepaymentDeadline: '2026-04-20',
    participants: [
      { name: 'Анна', prepaid: true },
      { name: 'Иван', prepaid: false },
    ],
    city: 'Брашов',
    hotel: 'Hotel Brasov',
    ticketPerPerson: 50,
    stayPerPerson: 40,
    groupBudget: 100,
    personalCosts: 50,
    earnings: 150,
    rooms: [
      { id: 'room-1', guests: 2, beds: 2, bedSize: 'single' },
      { id: 'room-2', guests: 2, beds: 2, bedSize: 'single' },
      { id: 'room-3', guests: 2, beds: 2, bedSize: 'single' },
      { id: 'room-4', guests: 2, beds: 2, bedSize: 'single' },
      { id: 'room-5', guests: 2, beds: 1, bedSize: 'double' },
      { id: 'room-6', guests: 2, beds: 1, bedSize: 'double' },
    ],
  };

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('trips');
    if (!saved) return [trip];
    return JSON.parse(saved) as Trip[];
  });

  useEffect(() => {
    localStorage.setItem('trips', JSON.stringify(trips));
  });

  const [isFormOpen, setIsFormopen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    city: string;
    hotel: string;
    dateStart: string;
    dateEnd: string;
    tourists: string;
    ticketPerPerson: string;
    stayPerPerson: string;
    groupBudget: string;
    personalCosts: string;
    earnings: string;
    rooms: Room[];
  } | null>(null);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [hotel, setHotel] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [tourists, setTourists] = useState('');
  const [ticketPerPerson, setTicketPerPerson] = useState('');
  const [stayPerPerson, setStayPerPerson] = useState('');
  const [groupBudget, setGroupBudget] = useState('');
  const [personalCosts, setPersonalCosts] = useState('');
  const [earnings, setEarnings] = useState('');
  const [guests, setGuests] = useState('2');
  const [beds, setBeds] = useState('2');
  const [bedSize, setBedSize] = useState<Room['bedSize']>('single');
  const [roomCount, setRoomCount] = useState('1');
  const [rooms, setRooms] = useState<Room[]>([]);
  const canCreate = title.trim() !== '' && dateStart !== '' && dateEnd !== '';
  const hasChanges =
    draft !== null &&
    (title !== draft.title ||
      city !== draft.city ||
      hotel !== draft.hotel ||
      dateStart !== draft.dateStart ||
      dateEnd !== draft.dateEnd ||
      tourists !== draft.tourists ||
      ticketPerPerson !== draft.ticketPerPerson ||
      stayPerPerson !== draft.stayPerPerson ||
      groupBudget !== draft.groupBudget ||
      personalCosts !== draft.personalCosts ||
      earnings !== draft.earnings ||
      !sameRooms(rooms, draft.rooms));
  const canSubmit = canCreate && (editingId === null || hasChanges);
  const quote = tripQuote({
    tourists: readMoney(tourists),
    ticketPerPerson: readMoney(ticketPerPerson),
    stayPerPerson: readMoney(stayPerPerson),
    groupBudget: readMoney(groupBudget),
    personalCosts: readMoney(personalCosts),
    earnings: readMoney(earnings),
  });

  function createTrip(event: React.SubmitEvent) {
    event.preventDefault();
    const newTrip: Trip = {
      id: crypto.randomUUID(),
      title: title.trim(),
      status: 'draft',
      targetParticipants: readMoney(tourists),
      organizerCosts: 0,
      dateStart,
      dateEnd,
      price: quote?.perPerson ?? 0,
      prepaymentAmount: 0,
      prepaymentDeadline: '',
      participants: [],
      city: city.trim(),
      hotel: hotel.trim(),
      rooms,
      ticketPerPerson: readMoney(ticketPerPerson),
      stayPerPerson: readMoney(stayPerPerson),
      groupBudget: readMoney(groupBudget),
      personalCosts: readMoney(personalCosts),
      earnings: readMoney(earnings),
    };

    if (editingId) {
      setTrips((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                title: title.trim(),
                city: city.trim(),
                hotel: hotel.trim(),
                dateStart,
                dateEnd,
                price: quote?.perPerson ?? 0,
                targetParticipants: readMoney(tourists),
                organizerCosts: 0,
                rooms,
                ticketPerPerson: readMoney(ticketPerPerson),
                stayPerPerson: readMoney(stayPerPerson),
                groupBudget: readMoney(groupBudget),
                personalCosts: readMoney(personalCosts),
                earnings: readMoney(earnings),
              }
            : item,
        ),
      );
    } else {
      setTrips((current) => [...current, newTrip]);
    }

    closeForm();
  }

  function resetForm() {
    setEditingId(null);
    setDraft(null);
    setTitle('');
    setCity('');
    setHotel('');
    setDateStart('');
    setDateEnd('');
    setTourists('');
    setTicketPerPerson('');
    setStayPerPerson('');
    setGroupBudget('');
    setPersonalCosts('');
    setEarnings('');
    setGuests('2');
    setBeds('2');
    setBedSize('single');
    setRoomCount('1');
    setRooms([]);
  }

  function closeForm() {
    setIsFormopen(false);
    resetForm();
  }

  function deleteTrip(id: string) {
    setTrips((current) => current.filter((item) => item.id !== id));
  }

  function openCreate() {
    resetForm();
    setIsFormopen(true);
  }

  function openEdit(tripToEdit: Trip) {
    const nextDraft = {
      title: tripToEdit.title,
      city: tripToEdit.city ?? '',
      hotel: tripToEdit.hotel ?? '',
      dateStart: tripToEdit.dateStart,
      dateEnd: tripToEdit.dateEnd,
      tourists: String(tripToEdit.targetParticipants ?? 0),
      ticketPerPerson: String(tripToEdit.ticketPerPerson ?? 0),
      stayPerPerson: String(tripToEdit.stayPerPerson ?? 0),
      groupBudget: String(tripToEdit.groupBudget ?? 0),
      personalCosts: String(tripToEdit.personalCosts ?? 0),
      earnings: String(tripToEdit.earnings ?? 0),
      rooms: tripToEdit.rooms ?? [],
    };

    setEditingId(tripToEdit.id);
    setDraft(nextDraft);
    setTitle(nextDraft.title);
    setCity(nextDraft.city);
    setHotel(nextDraft.hotel);
    setDateStart(nextDraft.dateStart);
    setDateEnd(nextDraft.dateEnd);
    setTourists(nextDraft.tourists);
    setTicketPerPerson(nextDraft.ticketPerPerson);
    setStayPerPerson(nextDraft.stayPerPerson);
    setGroupBudget(nextDraft.groupBudget);
    setPersonalCosts(nextDraft.personalCosts);
    setEarnings(nextDraft.earnings);
    setGuests('2');
    setBeds('2');
    setBedSize('single');
    setRoomCount('1');
    setRooms(nextDraft.rooms);
    setIsFormopen(true);
  }

  function addRooms() {
    const guestCount = Number(guests);
    const bedCount = Number(beds);
    const count = Number(roomCount);
    if (guestCount < 1 || bedCount < 1 || count < 1) return;

    const nextRooms = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      guests: guestCount,
      beds: bedCount,
      bedSize,
    }));

    setRooms((current) => [...current, ...nextRooms]);
  }

  function isTripTitle(value: string) {
    return /^[\p{L}\s]*$/u.test(value);
  }

  function sameRooms(left: Room[], right: Room[]) {
    if (left.length !== right.length) return false;

    return left.every((room, index) => {
      const other = right[index];
      return (
        room.id === other.id &&
        room.guests === other.guests &&
        room.beds === other.beds &&
        room.bedSize === other.bedSize
      );
    });
  }

  return (
    <main>
      <section className="screen">
        <div className="hero">
          <img className="hero__photo" src="/hero-landscape.jpg" alt="" />
          <p className="hero__word">Adventure</p>
          <img className="hero__foreground" src="/hero-foreground.png" alt="" />
          <button
            className="button button--primary hero__action"
            type="button"
            onClick={openCreate}
          >
            Добавить поездку
          </button>
          <TripList trips={trips} onEdit={openEdit} oneDelete={deleteTrip} />
        </div>
      </section>
      <button
        className={isFormOpen ? 'overlay is-open' : 'overlay'}
        type="button"
        aria-label="Закрыть"
        onClick={() => closeForm()}
      />
      <aside className={isFormOpen ? 'sidebar is-open' : 'sidebar'}>
        <button
          className="sidebar__close"
          type="button"
          aria-label="Закрыть"
          onClick={() => closeForm()}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3.5 3.5l9 9M12.5 3.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <form className="form" onSubmit={createTrip}>
          <label className="field">
            <span className="field__label">Название</span>
            <input
              className="input"
              name="title"
              placeholder="Брашов"
              value={title}
              onChange={(event) => {
                if (isTripTitle(event.target.value)) {
                  setTitle(event.target.value);
                }
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">Город</span>
            <input
              className="input"
              name="city"
              placeholder="Брашов"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Отель</span>
            <input
              className="input"
              name="hotel"
              placeholder="Hotel Brasov"
              value={hotel}
              onChange={(event) => setHotel(event.target.value)}
            />
          </label>
          <div className="rooms">
            <p className="rooms__title">Комнаты</p>
            <div className="form__row">
              <label className="field">
                <span className="field__label">Гости</span>
                <input
                  className="input"
                  name="guests"
                  type="number"
                  min="1"
                  value={guests}
                  onChange={(event) => setGuests(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Кровати</span>
                <input
                  className="input"
                  name="beds"
                  type="number"
                  min="1"
                  value={beds}
                  onChange={(event) => setBeds(event.target.value)}
                />
              </label>
            </div>
            <div className="form__row rooms__row">
              <label className="field">
                <span className="field__label">Тип кровати</span>
                <select
                  className="input"
                  name="bedSize"
                  value={bedSize}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'single' || value === 'double') {
                      setBedSize(value);
                    }
                  }}
                >
                  <option value="single">Односпальная</option>
                  <option value="double">Двуспальная</option>
                </select>
              </label>
              <label className="field">
                <span className="field__label">Сколько таких</span>
                <input
                  className="input"
                  name="roomCount"
                  type="number"
                  min="1"
                  value={roomCount}
                  onChange={(event) => setRoomCount(event.target.value)}
                />
              </label>
              <button
                className="icon-button rooms__add"
                type="button"
                aria-label="Добавить комнаты"
                onClick={addRooms}
              >
                +
              </button>
            </div>
            {rooms.length > 0 && (
              <ul className="rooms__list">
                {rooms.map((room, index) => (
                  <li className="rooms__item" key={room.id}>
                    {index + 1}. {room.guests} гостей, {room.beds}{' '}
                    {room.bedSize === 'single' ? 'односпальные' : 'двуспальная'}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form__row">
            <label className="field">
              <span className="field__label">Начало</span>
              <input
                className="input"
                name="dateStart"
                type="date"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Конец</span>
              <input
                className="input"
                name="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(event) => setDateEnd(event.target.value)}
              />
            </label>
          </div>
          <div className="quote">
            <p className="quote__title">Расчёт</p>
            <label className="field">
              <span className="field__label">Туристы</span>
              <input
                className="input"
                name="tourists"
                type="number"
                min="0"
                step="1"
                placeholder="10"
                value={tourists}
                onChange={(event) => setTourists(event.target.value)}
              />
            </label>
            <div className="form__row">
              <label className="field">
                <span className="field__label">Билеты, € с человека</span>
                <input
                  className="input"
                  name="ticketPerPerson"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50"
                  value={ticketPerPerson}
                  onChange={(event) => setTicketPerPerson(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Жильё, € с человека</span>
                <input
                  className="input"
                  name="stayPerPerson"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="40"
                  value={stayPerPerson}
                  onChange={(event) => setStayPerPerson(event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Еда и напитки, € на всех</span>
              <input
                className="input"
                name="groupBudget"
                type="number"
                min="0"
                step="0.01"
                placeholder="100"
                value={groupBudget}
                onChange={(event) => setGroupBudget(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Личные расходы, € на всех</span>
              <input
                className="input"
                name="personalCosts"
                type="number"
                min="0"
                step="0.01"
                placeholder="50"
                value={personalCosts}
                onChange={(event) => setPersonalCosts(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Заработок, € на всех</span>
              <input
                className="input"
                name="earnings"
                type="number"
                min="0"
                step="0.01"
                placeholder="150"
                value={earnings}
                onChange={(event) => setEarnings(event.target.value)}
              />
            </label>
            {quote && (
              <dl className="quote__result">
                <div className="quote__row">
                  <dt>Билеты</dt>
                  <dd>{formatEuro(quote.ticketPerPerson)}</dd>
                </div>
                <div className="quote__row">
                  <dt>Жильё</dt>
                  <dd>{formatEuro(quote.stayPerPerson)}</dd>
                </div>
                <div className="quote__row">
                  <dt>Еда и напитки</dt>
                  <dd>{formatEuro(quote.foodPerPerson)}</dd>
                </div>
                <div className="quote__row">
                  <dt>Личные расходы</dt>
                  <dd>{formatEuro(quote.personalPerPerson)}</dd>
                </div>
                <div className="quote__row">
                  <dt>Заработок</dt>
                  <dd>{formatEuro(quote.earningsPerPerson)}</dd>
                </div>
                <div className="quote__row quote__total">
                  <dt>С человека</dt>
                  <dd>{formatEuro(quote.perPerson)}</dd>
                </div>
                <div className="quote__row">
                  <dt>На всех</dt>
                  <dd>{formatEuro(quote.total)}</dd>
                </div>
              </dl>
            )}
          </div>
          {canSubmit && (
            <button className="button button--primary" type="submit">
              {editingId ? 'Сохранить' : 'Создать поездку'}
            </button>
          )}
        </form>
      </aside>
    </main>
  );
}

export default App;
