import type { Trip } from './types';
import { useEffect, useState } from 'react';
import TripList from './components/TripList';

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
  };

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('trips');
    if (!saved) return [];
    return JSON.parse(saved) as Trip[];
  });

  useEffect(() => {
    localStorage.setItem('trips', JSON.stringify(trips));
  });

  const [isFormOpen, setIsFormopen] = useState(false);
  const [title, setTitle] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [price, setPrice] = useState('');
  const canCreate =
    title.trim() !== '' && dateStart !== '' && dateEnd !== '' && price !== '';

  function createTrip(event: React.SubmitEvent) {
    event.preventDefault();
    const newTrip: Trip = {
      id: crypto.randomUUID(),
      title: title.trim(),
      status: 'draft',
      targetParticipants: 0,
      organizerCosts: 0,
      dateStart,
      dateEnd,
      price: Number(price),
      prepaymentAmount: 0,
      prepaymentDeadline: '',
      participants: [],
    };

    setTrips((current) => [...current, newTrip]);
    closeForm();
  }

  function closeForm() {
    setIsFormopen(false);
    setTitle('');
    setDateStart('');
    setDateEnd('');
    setPrice('');
    console.log('test');
  }

  function isTripTitle(value: string) {
    return /^[\p{L}\s]*$/u.test(value);
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
            onClick={() => setIsFormopen(true)}
          >
            Добавить поездку
          </button>
          <TripList trips={trips} />
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
          onClick={() => closeForm()}
        >
          Закрыть
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
          <label className="field">
            <span className="field__label">Цена, €</span>
            <input
              className="input"
              name="price"
              type="number"
              placeholder="120"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          {canCreate && (
            <button className="button button--primary" type="submit">
              Создать поездку
            </button>
          )}
        </form>
      </aside>
    </main>
  );
}

export default App;
