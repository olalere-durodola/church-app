import { Timestamp } from 'firebase/firestore';

export type MemberRole = 'pastor' | 'minister' | 'hod' | null;

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
  departments: string[];
  membershipDate: Timestamp | null;
  notes: string;
  createdAt: Timestamp;
  photoURL?: string;
  role?: MemberRole;
  hodDepartments?: string[];
}

export type NewMember = Omit<Member, 'id'>;
