export type Trip = {
    id: string;
    title: string;
    status: 'draft' | 'selling' | 'confirmed' | 'done' | 'cancelled';
    targetParticipants: number;
    organizerCosts: number;
    dateStart: string;
    dateEnd: string;
    price: number;
    prepaymentAmount: number;
    prepaymentDeadline: string;
    participants: Participant[];
}

export type Participant = {
    name: string;
    prepaid: boolean;
}