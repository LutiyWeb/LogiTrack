export type Trip = {
  id: string;
  title: string;
  status: 'planned' | 'draft' | 'selling' | 'confirmed' | 'done' | 'cancelled';
  targetParticipants: number;
  organizerCosts: number;
  dateStart: string;
  dateEnd: string;
  price: number;
  prepaymentAmount: number;
  prepaymentDeadline: string;
  participants: Participant[];
  city: string;
  hotel: string;
  hotelUrl: string;
  rooms: Room[];
  ticketPerPerson: number;
  stayPerPerson: number;
  rate: number;
  groupBudget: number;
  personalCosts: number;
  advertising: number;
  reservePerPerson: number;
  earnings: number;
  referrals: number;
};

export type Room = {
  id: string;
  guests: number;
  beds: number;
  bedSize: 'single' | 'double';
  occupantIds?: string[];
};

export type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  comment: string;
  prepaid: boolean;
  remind: boolean;
};
