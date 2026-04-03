import { useState, useEffect, FormEvent } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../firebase';
import type { Member } from '../types/member';
import type { Leave, NewLeave } from '../types/leave';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

const COLOURS = [
  '#3b82f6', '#ec4899', '#f97316', '#a855f7',
  '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
];

export default function LeavePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete
  const [confirmDeleteLeave, setConfirmDeleteLeave] = useState<Leave | null>(null);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(collection(db, 'leaves')),
    ])
      .then(([mSnap, lSnap]) => {
        setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        setLeaves(lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Leave)).sort((a, b) => a.startDate.localeCompare(b.startDate)));
      })
      .catch(() => setFetchError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  // Departments that have at least one member
  const departments = Array.from(new Set(members.flatMap(m => m.departments ?? []))).sort();

  // Members in selected department
  const deptMembers = selectedDept
    ? members.filter(m => (m.departments ?? []).includes(selectedDept)).sort((a, b) => a.fullName.localeCompare(b.fullName))
    : [];

  // Colour map per department
  const deptColour: Record<string, string> = {};
  departments.forEach((d, i) => { deptColour[d] = COLOURS[i % COLOURS.length]; });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedDept || !selectedMemberId || !startDate || !endDate) {
      setToast({ message: 'Please fill in all fields.', type: 'error' });
      return;
    }
    const startStr = toISODate(startDate);
    const endStr = toISODate(endDate);
    if (endStr < startStr) {
      setToast({ message: 'End date must be on or after start date.', type: 'error' });
      return;
    }
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    setSubmitting(true);
    try {
      const newLeave: NewLeave = {
        memberId: member.id,
        memberName: member.fullName,
        memberEmail: member.email ?? '',
        department: selectedDept,
        startDate: startStr,
        endDate: endStr,
        createdAt: Timestamp.now(),
      };
      const ref = await addDoc(collection(db, 'leaves'), newLeave);
      setLeaves(prev => [...prev, { id: ref.id, ...newLeave }].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setSelectedMemberId('');
      setStartDate(null);
      setEndDate(null);
      setToast({ message: 'Leave scheduled and notifications sent.', type: 'success' });
    } catch {
      setToast({ message: 'Failed to submit leave. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(leaveId: string) {
    try {
      await deleteDoc(doc(db, 'leaves', leaveId));
      setLeaves(prev => prev.filter(l => l.id !== leaveId));
      setConfirmDeleteLeave(null);
    } catch {
      setToast({ message: 'Failed to delete leave record.', type: 'error' });
      setConfirmDeleteLeave(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  const today = isoToday();
  const upcoming = leaves.filter(l => l.endDate >= today);
  const past = leaves.filter(l => l.endDate < today);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Leave Schedule</h1>
      </div>

      {fetchError && <p className="error-message">{fetchError}</p>}

      {/* Submit form */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 className="section-title">Schedule Leave</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="form-group">
              <label>Department</label>
              <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedMemberId(''); }}>
                <option value="">— Select department —</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Member</label>
              <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} disabled={!selectedDept}>
                <option value="">— Select member —</option>
                {deptMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => { setStartDate(date); if (endDate && date && endDate < date) setEndDate(null); }}
                minDate={new Date()}
                dateFormat="MMM d, yyyy"
                placeholderText="Select start date"
                className="datepicker-input"
                calendarClassName="datepicker-calendar"
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                minDate={startDate ?? new Date()}
                dateFormat="MMM d, yyyy"
                placeholderText="Select end date"
                className="datepicker-input"
                calendarClassName="datepicker-calendar"
                disabled={!startDate}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Schedule Leave'}
          </button>
        </form>
      </div>

      {/* Upcoming leaves */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Upcoming & Current Leave</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty-state" style={{ padding: '2rem' }}>No upcoming leave scheduled.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Start</th>
                <th>End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(l => {
                const m = members.find(x => x.id === l.memberId);
                return (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {l.memberName}
                      {m?.status === 'Inactive' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>Inactive</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="leave-dept-badge" style={{ background: deptColour[l.department] + '22', color: deptColour[l.department], border: `1px solid ${deptColour[l.department]}44` }}>
                      {l.department}
                    </span>
                  </td>
                  <td>{formatDate(l.startDate)}</td>
                  <td>{formatDate(l.endDate)}</td>
                  <td style={{ width: '1px', whiteSpace: 'nowrap' }}>
                    <button className="btn-danger" style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }} onClick={() => setConfirmDeleteLeave(l)}>Remove</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Past leaves */}
      {past.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Past Leave</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Start</th>
                <th>End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {past.map(l => {
                const m = members.find(x => x.id === l.memberId);
                return (
                <tr key={l.id} style={{ opacity: 0.6 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {l.memberName}
                      {m?.status === 'Inactive' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>Inactive</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="leave-dept-badge" style={{ background: deptColour[l.department] + '22', color: deptColour[l.department], border: `1px solid ${deptColour[l.department]}44` }}>
                      {l.department}
                    </span>
                  </td>
                  <td>{formatDate(l.startDate)}</td>
                  <td>{formatDate(l.endDate)}</td>
                  <td style={{ width: '1px', whiteSpace: 'nowrap' }}>
                    <button className="btn-danger" style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }} onClick={() => setConfirmDeleteLeave(l)}>Remove</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave delete confirmation modal */}
      {confirmDeleteLeave && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteLeave(null)} role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remove Leave Record?</h2>
              <button className="modal-close" onClick={() => setConfirmDeleteLeave(null)} aria-label="Close">✕</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Remove leave for <strong style={{ color: 'var(--color-text-primary)' }}>{confirmDeleteLeave.memberName}</strong>?
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                {formatDate(confirmDeleteLeave.startDate)} — {formatDate(confirmDeleteLeave.endDate)} · {confirmDeleteLeave.department}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" autoFocus onClick={() => setConfirmDeleteLeave(null)}>Cancel</button>
                <button className="btn-danger" onClick={() => handleDelete(confirmDeleteLeave.id)}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
