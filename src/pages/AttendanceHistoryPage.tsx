import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import type { AttendanceRecord } from '../types/attendance';
import { formatDisplayDate } from '../utils/attendanceUtils';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'attendance'))
      .then(snap => {
        const map = new Map<string, AttendanceRecord>();
        snap.forEach(d => map.set(d.id, d.data() as AttendanceRecord));
        setRecords(map);
      })
      .catch(() => setFetchError('Failed to load attendance records.'))
      .finally(() => setLoading(false));
  }, []);

  const history = Array.from(records.entries()).sort(([a], [b]) => b.localeCompare(a));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Attendance History</h1>
        <Link to="/attendance">
          <button className="btn btn-secondary">← Back</button>
        </Link>
      </div>

      {fetchError && <p className="error-message">{fetchError}</p>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {history.length === 0 ? (
          <p className="empty-state" style={{ padding: '2rem' }}>No records yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Men</th>
                <th>Women</th>
                <th>Children</th>
                <th>Visitors</th>
                <th>Total</th>
                <th>Sermon Title</th>
                <th>Preacher</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {history.map(([dateStr, rec]) => (
                <tr key={dateStr}>
                  <td>{formatDisplayDate(dateStr)}</td>
                  <td>{rec.men}</td>
                  <td>{rec.women}</td>
                  <td>{rec.children}</td>
                  <td>{rec.visitors}</td>
                  <td><strong>{rec.total}</strong></td>
                  <td>{rec.sermonTitle || '—'}</td>
                  <td>{rec.preacher || '—'}</td>
                  <td>{rec.recordedAt ? rec.recordedAt.toDate().toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
