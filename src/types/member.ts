import { Timestamp } from 'firebase/firestore';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  gender: 'Male' | 'Female';
  status: 'Active' | 'Inactive' | 'Visitor';
  department: string | null;
  membershipDate: Timestamp | null;
  notes: string;
  createdAt: Timestamp;
}

export type NewMember = Omit<Member, 'id'>;
