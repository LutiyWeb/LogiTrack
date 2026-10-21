import type { Participant, Room, Trip } from './types';
import { useEffect, useState } from 'react';
import TripList from './components/TripList';
import { formatEuro, formatLei, quoteGaps, readMoney, tripQuote } from './quote';

const sibiuHotelUrl =
  'https://www.booking.com/hotel/ro/craft-inn.ru.html?checkin=2026-11-14&checkout=2026-11-15&group_adults=12&no_rooms=4&group_children=2&age=5&age=5';

function hotelHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

function readParticipants(value: unknown): Participant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const stored = item as Partial<Participant> & { name?: string };
    const legacy = (stored.name ?? '').trim();
    const [legacyFirst = '', ...legacyRest] = legacy.split(/\s+/);
    const firstName = (stored.firstName ?? legacyFirst).trim();
    const lastName = (stored.lastName ?? legacyRest.join(' ')).trim();

    return [
      {
        id: stored.id || crypto.randomUUID(),
        firstName,
        lastName,
        comment: stored.comment ?? '',
        prepaid: Boolean(stored.prepaid),
        remind: Boolean(stored.remind),
      },
    ];
  });
}

function sameParticipants(left: Participant[], right: Participant[]) {
  if (left.length !== right.length) return false;

  return left.every((person, index) => {
    const other = right[index];
    return (
      person.id === other.id &&
      person.firstName === other.firstName &&
      person.lastName === other.lastName &&
      person.comment === other.comment &&
      person.prepaid === other.prepaid &&
      person.remind === other.remind
    );
  });
}

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
      {
        id: 'person-anna',
        firstName: 'Анна',
        lastName: '',
        comment: '',
        prepaid: true,
        remind: false,
      },
      {
        id: 'person-ivan',
        firstName: 'Иван',
        lastName: '',
        comment: '',
        prepaid: false,
        remind: true,
      },
    ],
    city: 'Брашов',
    hotel: 'Hotel Brasov',
    hotelUrl: '',
    ticketPerPerson: 1000,
    stayPerPerson: 800,
    rate: 20,
    groupBudget: 2000,
    personalCosts: 1000,
    advertising: 0,
    reservePerPerson: 0,
    earnings: 3000,
    referrals: 0,
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

  useEffect(() => {
    const restored: Trip = {
      id: 'restored-brasov',
      title: 'Брашов',
      status: 'selling',
      targetParticipants: 10,
      organizerCosts: 0,
      dateStart: '2026-10-31',
      dateEnd: '2026-11-01',
      price: 680 / 5.5,
      prepaymentAmount: 0,
      prepaymentDeadline: '',
      participants: [],
      city: 'Брашов',
      hotel: '',
      hotelUrl: '',
      rooms: [],
      ticketPerPerson: 150,
      stayPerPerson: 238,
      rate: 5.5,
      groupBudget: 20,
      personalCosts: 200,
      advertising: 0,
      reservePerPerson: 0,
      earnings: 2700,
      referrals: 0,
    };

    setTrips((current) => {
      const exists = current.some(
        (item) => item.title === 'Брашов' && item.dateStart === '2026-10-31',
      );
      if (exists) return current;
      return [...current, restored];
    });
  }, []);

  useEffect(() => {
    const sibiu: Trip = {
      id: 'sibiu-2026-11-13',
      title: 'Сибиу',
      status: 'selling',
      targetParticipants: 13,
      organizerCosts: 0,
      dateStart: '2026-11-13',
      dateEnd: '2026-11-14',
      price: 0,
      prepaymentAmount: 0,
      prepaymentDeadline: '',
      participants: [],
      city: 'Сибиу',
      hotel: 'Craft Inn',
      hotelUrl: sibiuHotelUrl,
      rooms: [],
      ticketPerPerson: 200,
      stayPerPerson: 210,
      rate: 0,
      groupBudget: 0,
      personalCosts: 0,
      advertising: 0,
      reservePerPerson: 0,
      earnings: 0,
      referrals: 13,
    };

    setTrips((current) => {
      const index = current.findIndex(
        (item) => item.title === 'Сибиу' && item.dateStart === '2026-11-13',
      );
      if (index === -1) return [...current, sibiu];

      const item = current[index];
      const placeholderCosts =
        item.groupBudget === 20 &&
        item.personalCosts === 20 &&
        item.reservePerPerson === 20 &&
        item.earnings === 300;
      if (
        item.targetParticipants === 13 &&
        item.referrals === 13 &&
        !placeholderCosts &&
        item.hotelUrl
      ) {
        return current;
      }

      const rate = item.rate > 0 ? item.rate : 0;
      const next = {
        ...item,
        targetParticipants: 13,
        referrals: 13,
        ticketPerPerson: 200,
        stayPerPerson: 210,
        groupBudget: placeholderCosts ? 0 : item.groupBudget,
        personalCosts: placeholderCosts ? 0 : item.personalCosts,
        reservePerPerson: placeholderCosts ? 0 : item.reservePerPerson,
        earnings: placeholderCosts ? 0 : item.earnings,
        price: rate > 0 ? 410 / rate : item.price,
        prepaymentAmount: rate > 0 ? 410 / rate : item.prepaymentAmount,
        hotelUrl: item.hotelUrl || sibiuHotelUrl,
      };
      return current.map((trip, tripIndex) =>
        tripIndex === index ? next : trip,
      );
    });
  }, []);

  const [isFormOpen, setIsFormopen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    city: string;
    hotel: string;
    hotelUrl: string;
    dateStart: string;
    dateEnd: string;
    tourists: string;
    ticketPerPerson: string;
    stayPerPerson: string;
    rate: string;
    groupBudget: string;
    personalCosts: string;
    advertising: string;
    reservePerPerson: string;
    earnings: string;
    referrals: string;
    rooms: Room[];
    participants: Participant[];
  } | null>(null);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [hotel, setHotel] = useState('');
  const [hotelUrl, setHotelUrl] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [tourists, setTourists] = useState('');
  const [ticketPerPerson, setTicketPerPerson] = useState('');
  const [stayPerPerson, setStayPerPerson] = useState('');
  const [rate, setRate] = useState('');
  const [groupBudget, setGroupBudget] = useState('');
  const [personalCosts, setPersonalCosts] = useState('');
  const [advertising, setAdvertising] = useState('');
  const [reservePerPerson, setReservePerPerson] = useState('');
  const [earnings, setEarnings] = useState('');
  const [referrals, setReferrals] = useState('');
  const [guests, setGuests] = useState('2');
  const [beds, setBeds] = useState('2');
  const [bedSize, setBedSize] = useState<Room['bedSize']>('single');
  const [roomCount, setRoomCount] = useState('1');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusPersonId) return;
    document.getElementById(`person-${focusPersonId}`)?.focus();
  }, [focusPersonId]);
  const canCreate = title.trim() !== '' && dateStart !== '' && dateEnd !== '';
  const hasChanges =
    draft !== null &&
    (title !== draft.title ||
      city !== draft.city ||
      hotel !== draft.hotel ||
      hotelUrl !== draft.hotelUrl ||
      dateStart !== draft.dateStart ||
      dateEnd !== draft.dateEnd ||
      tourists !== draft.tourists ||
      ticketPerPerson !== draft.ticketPerPerson ||
      stayPerPerson !== draft.stayPerPerson ||
      rate !== draft.rate ||
      groupBudget !== draft.groupBudget ||
      personalCosts !== draft.personalCosts ||
      advertising !== draft.advertising ||
      reservePerPerson !== draft.reservePerPerson ||
      earnings !== draft.earnings ||
      referrals !== draft.referrals ||
      !sameRooms(rooms, draft.rooms) ||
      !sameParticipants(participants, draft.participants));
  const canSubmit = canCreate && (editingId === null || hasChanges);
  const quoteInput = {
    tourists: readMoney(tourists),
    ticketPerPerson: readMoney(ticketPerPerson),
    stayPerPerson: readMoney(stayPerPerson),
    rate: readMoney(rate),
    groupBudget: readMoney(groupBudget),
    personalCosts: readMoney(personalCosts),
    advertising: readMoney(advertising),
    reservePerPerson: readMoney(reservePerPerson),
    earnings: readMoney(earnings),
    referrals: readMoney(referrals),
  };
  const quote = tripQuote(quoteInput);
  const gaps = quoteGaps(quoteInput);

  function savedParticipants() {
    return participants
      .map((person) => ({
        ...person,
        firstName: person.firstName.trim(),
        lastName: person.lastName.trim(),
        comment: person.comment.trim(),
      }))
      .filter((person) => person.firstName !== '' || person.lastName !== '');
  }

  function createTrip(event: React.SubmitEvent) {
    event.preventDefault();
    const nextParticipants = savedParticipants();
    const newTrip: Trip = {
      id: crypto.randomUUID(),
      title: title.trim(),
      status: 'draft',
      targetParticipants: readMoney(tourists),
      organizerCosts: 0,
      dateStart,
      dateEnd,
      price: quote?.perPerson ?? 0,
      prepaymentAmount: quote?.deposit ?? 0,
      prepaymentDeadline: '',
      participants: nextParticipants,
      city: city.trim(),
      hotel: hotel.trim(),
      hotelUrl: hotelUrl.trim(),
      rooms,
      ticketPerPerson: readMoney(ticketPerPerson),
      stayPerPerson: readMoney(stayPerPerson),
      rate: readMoney(rate),
      groupBudget: readMoney(groupBudget),
      personalCosts: readMoney(personalCosts),
      advertising: readMoney(advertising),
      reservePerPerson: readMoney(reservePerPerson),
      earnings: readMoney(earnings),
      referrals: readMoney(referrals),
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
                hotelUrl: hotelUrl.trim(),
                dateStart,
                dateEnd,
                price: quote?.perPerson ?? 0,
                prepaymentAmount: quote?.deposit ?? 0,
                targetParticipants: readMoney(tourists),
                organizerCosts: 0,
                rooms,
                ticketPerPerson: readMoney(ticketPerPerson),
                stayPerPerson: readMoney(stayPerPerson),
                rate: readMoney(rate),
                groupBudget: readMoney(groupBudget),
                personalCosts: readMoney(personalCosts),
                advertising: readMoney(advertising),
                reservePerPerson: readMoney(reservePerPerson),
                earnings: readMoney(earnings),
                referrals: readMoney(referrals),
                participants: nextParticipants,
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
    setHotelUrl('');
    setDateStart('');
    setDateEnd('');
    setTourists('');
    setTicketPerPerson('');
    setStayPerPerson('');
    setRate('');
    setGroupBudget('');
    setPersonalCosts('');
    setAdvertising('');
    setReservePerPerson('');
    setEarnings('');
    setReferrals('');
    setGuests('2');
    setBeds('2');
    setBedSize('single');
    setRoomCount('1');
    setRooms([]);
    setParticipants([]);
    setFocusPersonId(null);
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
      hotelUrl: tripToEdit.hotelUrl ?? '',
      dateStart: tripToEdit.dateStart,
      dateEnd: tripToEdit.dateEnd,
      tourists: String(tripToEdit.targetParticipants ?? 0),
      ticketPerPerson: String(tripToEdit.ticketPerPerson ?? 0),
      stayPerPerson: String(tripToEdit.stayPerPerson ?? 0),
      rate: String(tripToEdit.rate ?? 0),
      groupBudget: String(tripToEdit.groupBudget ?? 0),
      personalCosts: String(tripToEdit.personalCosts ?? 0),
      advertising: String(tripToEdit.advertising ?? 0),
      reservePerPerson: String(tripToEdit.reservePerPerson ?? 0),
      earnings: String(tripToEdit.earnings ?? 0),
      referrals: String(tripToEdit.referrals ?? 0),
      rooms: tripToEdit.rooms ?? [],
      participants: readParticipants(tripToEdit.participants),
    };

    setEditingId(tripToEdit.id);
    setDraft(nextDraft);
    setTitle(nextDraft.title);
    setCity(nextDraft.city);
    setHotel(nextDraft.hotel);
    setHotelUrl(nextDraft.hotelUrl);
    setDateStart(nextDraft.dateStart);
    setDateEnd(nextDraft.dateEnd);
    setTourists(nextDraft.tourists);
    setTicketPerPerson(nextDraft.ticketPerPerson);
    setStayPerPerson(nextDraft.stayPerPerson);
    setRate(nextDraft.rate);
    setGroupBudget(nextDraft.groupBudget);
    setPersonalCosts(nextDraft.personalCosts);
    setAdvertising(nextDraft.advertising);
    setReservePerPerson(nextDraft.reservePerPerson);
    setEarnings(nextDraft.earnings);
    setReferrals(nextDraft.referrals);
    setGuests('2');
    setBeds('2');
    setBedSize('single');
    setRoomCount('1');
    setRooms(nextDraft.rooms);
    setParticipants(nextDraft.participants);
    setFocusPersonId(null);
    setIsFormopen(true);
  }

  function addParticipant() {
    const id = crypto.randomUUID();
    setParticipants((current) => [
      ...current,
      {
        id,
        firstName: '',
        lastName: '',
        comment: '',
        prepaid: false,
        remind: false,
      },
    ]);
    setFocusPersonId(id);
  }

  function updateParticipant(
    id: string,
    patch: Partial<Omit<Participant, 'id'>>,
  ) {
    setParticipants((current) =>
      current.map((person) =>
        person.id === id ? { ...person, ...patch } : person,
      ),
    );
  }

  function removeParticipant(id: string) {
    setParticipants((current) => current.filter((person) => person.id !== id));
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

  const namedPeople = participants.filter(
    (person) => person.firstName.trim() !== '' || person.lastName.trim() !== '',
  );
  const remindCount = namedPeople.filter((person) => person.remind).length;
  const plannedTourists = readMoney(tourists);
  const peopleCountLabel =
    plannedTourists > 0
      ? `${namedPeople.length} из ${plannedTourists}`
      : String(namedPeople.length);

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
          <div className="form__main">
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
          <div className="hotel-link">
            <label className="field">
              <span className="field__label">Ссылка на отель</span>
              <input
                className="input"
                name="hotelUrl"
                type="url"
                placeholder="https://www.booking.com/..."
                value={hotelUrl}
                onChange={(event) => setHotelUrl(event.target.value)}
              />
            </label>
            {hotelHref(hotelUrl) && (
              <a
                className="hotel-link__open"
                href={hotelHref(hotelUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть
              </a>
            )}
          </div>
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
            <div className="form__row">
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
              <div className="rooms__count">
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
            <label className={gaps.needsTourists ? 'field is-needed' : 'field'}>
              <span className="field__label">Туристы</span>
              <input
                className="input"
                name="tourists"
                type="number"
                min="0"
                step="1"
                placeholder="10"
                value={tourists}
                aria-invalid={gaps.needsTourists}
                onChange={(event) => setTourists(event.target.value)}
              />
            </label>
            <label className={gaps.needsRate ? 'field is-needed' : 'field'}>
              <span className="field__label">Курс, lei за 1 €</span>
              <input
                className="input"
                name="rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="20"
                value={rate}
                aria-invalid={gaps.needsRate}
                onChange={(event) => setRate(event.target.value)}
              />
            </label>
            <div className="form__row">
              <label className="field">
                <span className="field__label">Билеты, lei с человека</span>
                <input
                  className="input"
                  name="ticketPerPerson"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1000"
                  value={ticketPerPerson}
                  onChange={(event) => setTicketPerPerson(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Жильё, lei с человека</span>
                <input
                  className="input"
                  name="stayPerPerson"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="800"
                  value={stayPerPerson}
                  onChange={(event) => setStayPerPerson(event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Еда и напитки, lei на всех</span>
              <input
                className="input"
                name="groupBudget"
                type="number"
                min="0"
                step="0.01"
                placeholder="2000"
                value={groupBudget}
                onChange={(event) => setGroupBudget(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Реклама, lei на всех</span>
              <input
                className="input"
                name="advertising"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={advertising}
                onChange={(event) => setAdvertising(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Личные расходы, lei на всех</span>
              <input
                className="input"
                name="personalCosts"
                type="number"
                min="0"
                step="0.01"
                placeholder="1000"
                value={personalCosts}
                onChange={(event) => setPersonalCosts(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">НЗ, lei с человека</span>
              <input
                className="input"
                name="reservePerPerson"
                type="number"
                min="0"
                step="0.01"
                placeholder="20"
                value={reservePerPerson}
                onChange={(event) => setReservePerPerson(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Заработок, lei на всех</span>
              <input
                className="input"
                name="earnings"
                type="number"
                min="0"
                step="0.01"
                placeholder="3000"
                value={earnings}
                onChange={(event) => setEarnings(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Рефералка, человек</span>
              <input
                className="input"
                name="referrals"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={referrals}
                onChange={(event) => setReferrals(event.target.value)}
              />
            </label>
            {(gaps.needsTourists || gaps.needsRate) && (
              <p className="quote__missing">
                {gaps.needsTourists && gaps.needsRate
                  ? 'Чтобы увидеть цену для клиента, укажи туристов и курс.'
                  : gaps.needsTourists
                    ? 'Чтобы увидеть цену для клиента, укажи туристов.'
                    : 'Чтобы увидеть цену для клиента, укажи курс.'}
              </p>
            )}
            {quote && (
              <>
                <dl className="quote__result">
                  <div className="quote__row">
                    <dt>Билеты</dt>
                    <dd>
                      {formatLei(quote.ticketLei)} ·{' '}
                      {formatEuro(quote.ticketPerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>Жильё</dt>
                    <dd>
                      {formatLei(quote.stayLei)} ·{' '}
                      {formatEuro(quote.stayPerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>Еда и напитки</dt>
                    <dd>
                      {formatLei(quote.foodLei)} ·{' '}
                      {formatEuro(quote.foodPerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>Реклама</dt>
                    <dd>
                      {formatLei(quote.advertisingLei)} ·{' '}
                      {formatEuro(quote.advertisingPerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>Личные расходы</dt>
                    <dd>
                      {formatLei(quote.personalLei)} ·{' '}
                      {formatEuro(quote.personalPerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>НЗ</dt>
                    <dd>
                      {formatLei(quote.reserveLei)} ·{' '}
                      {formatEuro(quote.reservePerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>Заработок</dt>
                    <dd>
                      {formatLei(quote.earningsLei)} ·{' '}
                      {formatEuro(quote.earningsPerPerson)}
                    </dd>
                  </div>
                  <div className="quote__row quote__total">
                    <dt>С человека</dt>
                    <dd>
                      {formatLei(quote.perPersonLei)} ·{' '}
                      {formatEuro(quote.perPerson)}
                    </dd>
                  </div>
                  <div className="quote__row">
                    <dt>На всех</dt>
                    <dd>
                      {formatLei(quote.totalLei)} · {formatEuro(quote.total)}
                    </dd>
                  </div>
                </dl>
                <div className="quote__deposit">
                  <span>Задаток в пост</span>
                  <strong>
                    {formatLei(quote.depositLei)} · {formatEuro(quote.deposit)}
                  </strong>
                </div>
                <div className="quote__referral">
                  <span>Агентству, 10%</span>
                  <strong>
                    {formatLei(quote.referralLei)} · {formatEuro(quote.referral)}
                  </strong>
                </div>
              </>
            )}
          </div>
          </div>
          <section className="people">
            <div className="people__head">
              <div>
                <h2>Люди</h2>
                <p>
                  {peopleCountLabel}
                  {remindCount > 0 ? ` · написать ${remindCount}` : ''}
                </p>
              </div>
              <button
                className="people__plus"
                type="button"
                aria-label="Добавить человека"
                onClick={addParticipant}
              >
                +
              </button>
            </div>
            {participants.length === 0 && (
              <p className="people__empty">Пока никого</p>
            )}
            <ul className="people__list">
              {participants.map((person) => (
                <li
                  className={
                    person.remind ? 'people__item is-remind' : 'people__item'
                  }
                  key={person.id}
                >
                  <div className="people__name">
                    <input
                      id={`person-${person.id}`}
                      className="input"
                      aria-label="Имя"
                      placeholder="Имя"
                      value={person.firstName}
                      onChange={(event) =>
                        updateParticipant(person.id, {
                          firstName: event.target.value,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        addParticipant();
                      }}
                    />
                    <input
                      className="input"
                      aria-label="Фамилия"
                      placeholder="Фамилия"
                      value={person.lastName}
                      onChange={(event) =>
                        updateParticipant(person.id, {
                          lastName: event.target.value,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        addParticipant();
                      }}
                    />
                    <button
                      className="icon-button people__remove"
                      type="button"
                      aria-label="Убрать человека"
                      onClick={() => removeParticipant(person.id)}
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    className="input"
                    aria-label="Комментарий"
                    rows={2}
                    placeholder="Комментарий: не ест мясо, другой задаток"
                    value={person.comment}
                    onChange={(event) =>
                      updateParticipant(person.id, {
                        comment: event.target.value,
                      })
                    }
                  />
                  <div className="people__flags">
                    <label className="people__check">
                      <input
                        type="checkbox"
                        checked={person.prepaid}
                        onChange={(event) =>
                          updateParticipant(person.id, {
                            prepaid: event.target.checked,
                          })
                        }
                      />
                      Задаток
                    </label>
                    <label className="people__check">
                      <input
                        type="checkbox"
                        checked={person.remind}
                        onChange={(event) =>
                          updateParticipant(person.id, {
                            remind: event.target.checked,
                          })
                        }
                      />
                      Написать
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {canSubmit && (
            <button className="button button--primary form__submit" type="submit">
              {editingId ? 'Сохранить' : 'Создать поездку'}
            </button>
          )}
        </form>
      </aside>
    </main>
  );
}

export default App;
