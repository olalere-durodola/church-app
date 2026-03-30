import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import type { Member } from '../types/member';
import { filterMembers } from '../utils/memberFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';

export default function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [gender, setGender] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'members'))
      .then(snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        setMembers(docs);
      })
      .catch(() => setError('Failed to load members.'))
      .finally(() => setLoading(false));
  }, []);

  const departments = Array.from(new Set(members.flatMap(m => m.departments))).sort();

  const filtered = filterMembers(members, search, status, gender, department);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Members</h1>
        <Link to="/members/new">
          <button className="btn-primary">+ Add Member</button>
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="filters">
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Visitor">Visitor</option>
          </select>
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {members.length === 0 ? 'No members yet.' : 'No members match your filters.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Gender</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/members/${m.id}`} style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                      {m.firstName} {m.lastName}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{m.phone || '—'}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{m.gender}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{m.departments.length ? m.departments.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
            {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
