import type { Timestamp } from 'firebase/firestore';

export interface Department {
  id: string;
  name: string;
  createdAt: Timestamp;
}
