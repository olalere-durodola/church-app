import type { Timestamp } from 'firebase/firestore';

export type VisitorStage = 'New' | 'Contacted' | 'Returned' | 'Joined' | 'Lapsed';

export const VISITOR_STAGES: VisitorStage[] = ['New', 'Contacted', 'Returned', 'Joined', 'Lapsed'];

export interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  howHeard: string;       // e.g. "Invited by a friend", "Social media", "Walk-in"
  invitedBy: string;      // name of the member who invited them, if any
  firstVisitDate: string; // YYYY-MM-DD
  prayerRequest: string;
  notes: string;
  stage: VisitorStage;
  createdAt: Timestamp;
  convertedMemberId?: string | null; // set when converted to a Member
}

export type NewVisitor = Omit<Visitor, 'id'>;
