import type { Timestamp } from 'firebase/firestore';

export type FollowUpType = 'welcome' | 'check-in' | 'absentee' | 'bereavement' | 'new-convert' | 'other';
export type FollowUpStatus = 'open' | 'done';
export type TouchChannel = 'call' | 'whatsapp' | 'visit' | 'email' | 'sms' | 'other';

export const FOLLOWUP_TYPES: FollowUpType[] = ['welcome', 'check-in', 'absentee', 'bereavement', 'new-convert', 'other'];

export const FOLLOWUP_TYPE_LABEL: Record<FollowUpType, string> = {
  welcome: 'Welcome',
  'check-in': 'Check-in',
  absentee: 'Absentee',
  bereavement: 'Bereavement',
  'new-convert': 'New convert',
  other: 'Other',
};

export interface TouchLogEntry {
  channel: TouchChannel;
  note: string;
  at: Timestamp;
}

export interface FollowUp {
  id: string;
  subjectName: string;
  memberId?: string | null;
  visitorId?: string | null;
  phone?: string;
  email?: string;
  type: FollowUpType;
  status: FollowUpStatus;
  dueDate?: string;       // YYYY-MM-DD
  assignedTo?: string;
  notes?: string;
  touchLog?: TouchLogEntry[];
  createdAt: Timestamp;
  completedAt?: Timestamp | null;
}

export type NewFollowUp = Omit<FollowUp, 'id'>;
