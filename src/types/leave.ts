import type { Timestamp } from 'firebase/firestore';

export interface Leave {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  department: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  createdAt: Timestamp;
}

export type NewLeave = Omit<Leave, 'id'>;
