import type { Timestamp } from 'firebase/firestore';

export interface AttendanceRecord {
  men: number;
  women: number;
  children: number;
  visitors: number;
  total: number;
  recordedAt: Timestamp;
  sermonTitle?: string;
  preacher?: string;
  /** Member IDs recorded as absent for this Sunday (absentee-marking model). */
  absentees?: string[];
}
