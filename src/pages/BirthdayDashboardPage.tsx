import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import type { Member } from '../types/member';
import { getBirthdaysThisMonth, getBirthdaysComingUp } from '../utils/birthdayUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { MONTHS } from '../utils/dateConstants';

function BirthdayTable({ rows }: { rows: Member[] }) {
  if (rows.length === 0) {
    return <div className="empty-state" style={{ padding: '1.5rem' }}>None.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Birthday</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(m => (
          <tr key={m.id}>
            <td>
              <Link to={`/members/${m.id}`} style={{ fontWeight: 500 }}>
                {m.firstName} {m.lastName}
              </Link>
            </td>
            <td>{MONTHS[m.birthdayMonth!]} {m.birthdayDay}</td>
            <td><StatusBadge status={m.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function BirthdayDashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'members'))
      .then(snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member))))
      .catch(() => setError('Failed to load members.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="page">
      <h1 style={{ marginBottom: '1rem' }}>Birthdays</h1>
      <p className="error-message">{error}</p>
    </div>
  );

  const today = new Date();
  const thisMonth = getBirthdaysThisMonth(members, today);
  const comingUp = getBirthdaysComingUp(members, today);

  return (
    <div className="page">
      <h1 style={{ marginBottom: '2rem' }}>Birthdays</h1>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <section>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            🎂 Coming Up This Week
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <BirthdayTable rows={comingUp} />
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            📅 This Month — {MONTHS[today.getMonth() + 1]}
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <BirthdayTable rows={thisMonth} />
          </div>
        </section>
      </div>
    </div>
  );
}
