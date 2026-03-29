import type { Member } from '../types/member';

export default function StatusBadge({ status }: { status: Member['status'] }) {
  const cls = status === 'Active' ? 'badge-active' : status === 'Inactive' ? 'badge-inactive' : 'badge-visitor';
  return <span className={`badge ${cls}`}>{status}</span>;
}
