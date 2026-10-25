import type { Participant, Room, Trip } from './types';
import { useEffect, useRef, useState } from 'react';
import TripList, { statusLabel } from './components/TripList';
import {
  formatEuro,
  formatLei,
  quoteGaps,
  readMoney,
  tripQuote,
} from './quote';

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

function roomGroupKey(room: Room) {
  return `${room.guests}-${room.beds}-${room.bedSize}`;
}

function bedSizeFor(
  guestCount: number,
  bedCount: number,
  size: Room['bedSize'],
): Room['bedSize'] {
  if (guestCount === 2 && bedCount === 1) return 'double';
  return size;
}

function roomKindLabel(room: Pick<Room, 'guests' | 'beds' | 'bedSize'>) {
  const mod10 = room.guests % 10;
  const mod100 = room.guests % 100;
  const guestWord =
    mod10 === 1 && mod100 !== 11
      ? 'гость'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'гостя'
        : 'гостей';
  const bedWord =
    room.bedSize === 'single'
      ? room.beds === 1
        ? 'односпальная'
        : 'односпальные'
      : room.beds === 1
        ? 'двуспальная'
        : 'двуспальные';
  return `${room.guests} ${guestWord}, ${room.beds} ${bedWord}`;
}

function personLabel(person: Participant) {
  const name = `${person.firstName} ${person.lastName}`.trim();
  return name || 'Без имени';
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
      status: 'planned',
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

  useEffect(() => {
    if (localStorage.getItem('sibiu-status-migrated')) return;

    setTrips((current) => {
      const index = current.findIndex(
        (item) => item.title === 'Сибиу' && item.dateStart === '2026-11-13',
      );
      if (index === -1 || current[index].status !== 'selling') return current;

      return current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, status: 'planned' } : item,
      );
    });
    localStorage.setItem('sibiu-status-migrated', '1');
  }, []);

  const [isFormOpen, setIsFormopen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    status: Trip['status'];
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
  const [status, setStatus] = useState<Trip['status']>('planned');
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
  const [sideTab, setSideTab] = useState<'people' | 'rooms'>('people');
  const [openRoomGroup, setOpenRoomGroup] = useState<string | null>(null);
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);
  const [roomGuestName, setRoomGuestName] = useState('');

  useEffect(() => {
    if (!focusPersonId) return;
    document.getElementById(`person-${focusPersonId}`)?.focus();
  }, [focusPersonId]);

  useEffect(() => {
    if (!tripToDelete) return;

    cancelDeleteRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setTripToDelete(null);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tripToDelete]);
  const canCreate = title.trim() !== '' && dateStart !== '' && dateEnd !== '';
  const hasChanges =
    draft !== null &&
    (title !== draft.title ||
      status !== draft.status ||
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
      status,
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
                status,
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
    setStatus('planned');
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
    setSideTab('people');
    setOpenRoomGroup(null);
    setOpenRoomId(null);
    setRoomGuestName('');
  }

  function closeForm() {
    setIsFormopen(false);
    resetForm();
  }

  function deleteTrip(id: string) {
    setTrips((current) => current.filter((item) => item.id !== id));
  }

  function askDelete(id: string) {
    setTripToDelete(trips.find((item) => item.id === id) ?? null);
  }

  function confirmDelete() {
    if (!tripToDelete) return;
    deleteTrip(tripToDelete.id);
    setTripToDelete(null);
  }

  function openCreate() {
    resetForm();
    setIsFormopen(true);
  }

  function openEdit(tripToEdit: Trip) {
    const nextDraft = {
      title: tripToEdit.title,
      status: tripToEdit.status ?? 'planned',
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
    setStatus(nextDraft.status);
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
    setRooms((current) =>
      current.map((room) => ({
        ...room,
        occupantIds: (room.occupantIds ?? []).filter(
          (personId) => personId !== id,
        ),
      })),
    );
  }

  function addRooms() {
    const guestCount = Number(guests);
    const bedCount = Number(beds);
    const count = Number(roomCount);
    if (guestCount < 1 || bedCount < 1 || count < 1) return;

    const size = bedSizeFor(guestCount, bedCount, bedSize);
    const nextRooms = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      guests: guestCount,
      beds: bedCount,
      bedSize: size,
      occupantIds: [],
    }));

    setBedSize(size);
    setRooms((current) => [...current, ...nextRooms]);
    setOpenRoomGroup(`${guestCount}-${bedCount}-${size}`);
  }

  function removeRoom(id: string) {
    setRooms((current) => current.filter((room) => room.id !== id));
  }

  function addGuestToRoom(roomId: string) {
    const firstName = roomGuestName.trim();
    if (!firstName) return;
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    if ((room.occupantIds ?? []).length >= room.guests) return;

    const id = crypto.randomUUID();
    setParticipants((current) => [
      ...current,
      {
        id,
        firstName,
        lastName: '',
        comment: '',
        prepaid: false,
        remind: false,
      },
    ]);
    setRooms((current) =>
      current.map((item) =>
        item.id === roomId
          ? { ...item, occupantIds: [...(item.occupantIds ?? []), id] }
          : item,
      ),
    );
    setRoomGuestName('');
  }

  function toggleOccupant(roomId: string, personId: string) {
    setRooms((current) => {
      const room = current.find((item) => item.id === roomId);
      if (!room) return current;
      const occupants = room.occupantIds ?? [];
      const already = occupants.includes(personId);
      if (!already && occupants.length >= room.guests) return current;

      return current.map((item) => {
        const ids = item.occupantIds ?? [];
        if (item.id === roomId) {
          return {
            ...item,
            occupantIds: already
              ? ids.filter((id) => id !== personId)
              : [...ids, personId],
          };
        }
        if (!already) {
          return {
            ...item,
            occupantIds: ids.filter((id) => id !== personId),
          };
        }
        return item;
      });
    });
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
        room.bedSize === other.bedSize &&
        (room.occupantIds ?? []).join() === (other.occupantIds ?? []).join()
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

  const roomGroups = rooms.reduce<{ key: string; rooms: Room[] }[]>(
    (groups, room) => {
      const key = roomGroupKey(room);
      const group = groups.find((item) => item.key === key);
      if (group) group.rooms.push(room);
      else groups.push({ key, rooms: [room] });
      return groups;
    },
    [],
  );
  const assignedIds = new Set(rooms.flatMap((room) => room.occupantIds ?? []));

  const pageTitle = title.trim() || (editingId ? 'Поездка' : 'Новая поездка');

  return (
    <div className="shell">
      <aside className="nav">
        <p className="nav__logo">TripBoard</p>
        <button
          className="nav__item is-active"
          type="button"
          onClick={() => closeForm()}
        >
          Поездки
        </button>
      </aside>
      <div className="workspace">
        {isFormOpen ? (
          <form className="form" onSubmit={createTrip}>
            <header className="board__bar">
              <div>
                <button
                  className="board__back"
                  type="button"
                  onClick={() => closeForm()}
                >
                  Поездки
                </button>
                <h1>{pageTitle}</h1>
              </div>
              {canSubmit && (
                <button className="button button--primary" type="submit">
                  {editingId ? 'Сохранить' : 'Создать поездку'}
                </button>
              )}
            </header>
            <section className="summary" aria-label="Итог">
              <article className="summary__card summary__card--price">
                <span>С человека</span>
                <strong>
                  {quote
                    ? `${formatLei(quote.perPersonLei)} · ${formatEuro(quote.perPerson)}`
                    : '—'}
                </strong>
              </article>
              <article className="summary__card summary__card--deposit">
                <span>Задаток в пост</span>
                <strong>
                  {quote
                    ? `${formatLei(quote.depositLei)} · ${formatEuro(quote.deposit)}`
                    : '—'}
                </strong>
              </article>
              <article className="summary__card summary__card--agency">
                <span>Агентству, 10%</span>
                <strong>
                  {quote
                    ? `${formatLei(quote.referralLei)} · ${formatEuro(quote.referral)}`
                    : '—'}
                </strong>
              </article>
            </section>
            <div className="form__main">
              <div className="form__row">
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
                  <span className="field__label">Статус</span>
                  <select
                    className="input"
                    name="status"
                    value={status}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value in statusLabel)
                        setStatus(value as Trip['status']);
                    }}
                  >
                    {Object.entries(statusLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
                <div className="form__row">
                  <label
                    className={gaps.needsTourists ? 'field is-needed' : 'field'}
                  >
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
                  <label
                    className={gaps.needsRate ? 'field is-needed' : 'field'}
                  >
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
                </div>
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
                      onChange={(event) =>
                        setTicketPerPerson(event.target.value)
                      }
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
                <div className="form__row">
                  <label className="field">
                    <span className="field__label">
                      Еда и напитки, lei на всех
                    </span>
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
                </div>
                <div className="form__row">
                  <label className="field">
                    <span className="field__label">
                      Личные расходы, lei на всех
                    </span>
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
                </div>
                <div className="form__row">
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
                      onChange={(event) =>
                        setReservePerPerson(event.target.value)
                      }
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
                </div>
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
                          {formatLei(quote.totalLei)} ·{' '}
                          {formatEuro(quote.total)}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </div>
            </div>
            <section className="people">
              <div className="side-tabs" role="tablist">
                <button
                  className={
                    sideTab === 'people'
                      ? 'side-tabs__tab is-active'
                      : 'side-tabs__tab'
                  }
                  type="button"
                  role="tab"
                  aria-selected={sideTab === 'people'}
                  onClick={() => setSideTab('people')}
                >
                  Люди
                </button>
                <button
                  className={
                    sideTab === 'rooms'
                      ? 'side-tabs__tab is-active'
                      : 'side-tabs__tab'
                  }
                  type="button"
                  role="tab"
                  aria-selected={sideTab === 'rooms'}
                  onClick={() => setSideTab('rooms')}
                >
                  Номера
                </button>
              </div>
              {sideTab === 'people' ? (
                <>
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
                          person.remind
                            ? 'people__item is-remind'
                            : 'people__item'
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
                </>
              ) : (
                <div className="rooms">
                  <div className="form__row">
                    <label className="field">
                      <span className="field__label">Гости</span>
                      <input
                        className="input"
                        name="guests"
                        type="number"
                        min="1"
                        value={guests}
                        onChange={(event) => {
                          const next = event.target.value;
                          setGuests(next);
                          setBedSize((current) =>
                            bedSizeFor(Number(next), Number(beds), current),
                          );
                        }}
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
                        onChange={(event) => {
                          const next = event.target.value;
                          setBeds(next);
                          setBedSize((current) =>
                            bedSizeFor(Number(guests), Number(next), current),
                          );
                        }}
                      />
                    </label>
                  </div>
                  <div className="form__row">
                    <label className="field">
                      <span className="field__label">Тип кровати</span>
                      <select
                        className="input"
                        name="bedSize"
                        value={bedSizeFor(
                          Number(guests),
                          Number(beds),
                          bedSize,
                        )}
                        disabled={Number(guests) === 2 && Number(beds) === 1}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === 'single' || value === 'double') {
                            setBedSize(
                              bedSizeFor(Number(guests), Number(beds), value),
                            );
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
                  {roomGroups.length === 0 && (
                    <p className="people__empty">
                      Номеров пока нет. Добавь тип один раз, потом список можно
                      править.
                    </p>
                  )}
                  {roomGroups.map((group) => {
                    const taken = group.rooms.filter(
                      (room) => (room.occupantIds ?? []).length > 0,
                    ).length;
                    const open = openRoomGroup === group.key;
                    return (
                      <div className="rooms__group" key={group.key}>
                        <button
                          className="rooms__group-toggle"
                          type="button"
                          aria-expanded={open}
                          onClick={() =>
                            setOpenRoomGroup(open ? null : group.key)
                          }
                        >
                          <span>{roomKindLabel(group.rooms[0])}</span>
                          <span>
                            занято {taken} из {group.rooms.length}
                          </span>
                        </button>
                        {open && (
                          <div className="rooms__slots">
                            {group.rooms.map((room, index) => {
                              const occupants = room.occupantIds ?? [];
                              const choices = namedPeople.filter(
                                (person) =>
                                  occupants.includes(person.id) ||
                                  !assignedIds.has(person.id),
                              );
                              const openRoom = openRoomId === room.id;
                              const names = occupants
                                .map((id) =>
                                  namedPeople.find(
                                    (person) => person.id === id,
                                  ),
                                )
                                .filter((person) => person !== undefined)
                                .map((person) => personLabel(person));
                              return (
                                <div className="rooms__slot" key={room.id}>
                                  <div className="rooms__slot-head">
                                    <button
                                      className="rooms__slot-open"
                                      type="button"
                                      aria-expanded={openRoom}
                                      onClick={() => {
                                        setOpenRoomId(
                                          openRoom ? null : room.id,
                                        );
                                        setRoomGuestName('');
                                      }}
                                    >
                                      <span>Номер {index + 1}</span>
                                      <span>
                                        {names.length > 0
                                          ? names.join(', ')
                                          : 'свободен'}
                                      </span>
                                    </button>
                                    <button
                                      className="icon-button"
                                      type="button"
                                      aria-label="Убрать номер"
                                      onClick={() => removeRoom(room.id)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {openRoom && (
                                    <div className="rooms__slot-body">
                                      {choices.map((person) => {
                                        const checked = occupants.includes(
                                          person.id,
                                        );
                                        return (
                                          <label
                                            className="people__check"
                                            key={person.id}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              disabled={
                                                !checked &&
                                                occupants.length >= room.guests
                                              }
                                              onChange={() =>
                                                toggleOccupant(
                                                  room.id,
                                                  person.id,
                                                )
                                              }
                                            />
                                            {personLabel(person)}
                                          </label>
                                        );
                                      })}
                                      <div className="rooms__add-guest">
                                        <input
                                          className="input"
                                          aria-label="Имя в номер"
                                          placeholder="Имя"
                                          value={roomGuestName}
                                          onChange={(event) =>
                                            setRoomGuestName(event.target.value)
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key !== 'Enter') return;
                                            event.preventDefault();
                                            addGuestToRoom(room.id);
                                          }}
                                        />
                                        <button
                                          className="button button--primary"
                                          type="button"
                                          onClick={() =>
                                            addGuestToRoom(room.id)
                                          }
                                        >
                                          В номер
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </form>
        ) : (
          <section className="board">
            <header className="board__bar">
              <div>
                <p className="board__crumb">TripBoard</p>
                <h1>Поездки</h1>
              </div>
              <button
                className="button button--primary"
                type="button"
                onClick={openCreate}
              >
                Добавить
              </button>
            </header>
            <TripList trips={trips} onEdit={openEdit} oneDelete={askDelete} />
          </section>
        )}
      </div>
      {tripToDelete && (
        <div className="dialog" onClick={() => setTripToDelete(null)}>
          <div
            className="dialog__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-title">Удалить поездку?</h2>
            <p>
              «{tripToDelete.title}» пропадёт из списка. Это нельзя отменить.
            </p>
            <div className="dialog__actions">
              <button
                ref={cancelDeleteRef}
                className="button button--ghost"
                type="button"
                onClick={() => setTripToDelete(null)}
              >
                Отмена
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={confirmDelete}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
