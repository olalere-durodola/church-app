import { useState, useEffect, FormEvent } from 'react';
import { doc, getDoc, updateDoc, Timestamp, getDocs, query, collection, where } from 'firebase/firestore';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import type { Member } from '../types/member';
import { normalizeFullName, getValidDaysForMonth } from '../utils/memberUtils';
import LoadingSpinner from '../components/LoadingSpinner';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString();
}

function formatBirthday(month: number | null, day: number | null): string {
  if (month === null || day === null) return '—';
  return `${MONTHS[month]} ${day}`;
}

function StatusBadge({ status }: { status: Member['status'] }) {
  const cls = status === 'Active' ? 'badge-active' : status === 'Inactive' ? 'badge-inactive' : 'badge-visitor';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ color: 'var(--color-text-primary)', fontSize: '0.9375rem' }}>{value || '—'}</div>
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Visitor'>('Active');
  const [membershipDate, setMembershipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'members', id))
      .then(snap => {
        if (!snap.exists()) { setNotFound(true); return; }
        setMember({ id: snap.id, ...snap.data() } as Member);
      })
      .catch(() => setFetchError('Failed to load member.'))
      .finally(() => setLoading(false));
  }, [id]);

  function startEditing(m: Member) {
    setFirstName(m.firstName);
    setLastName(m.lastName);
    setPhone(m.phone);
    setEmail(m.email);
    setAddress(m.address);
    setBirthdayMonth(m.birthdayMonth !== null ? String(m.birthdayMonth) : '');
    setBirthdayDay(m.birthdayDay !== null ? String(m.birthdayDay) : '');
    setGender(m.gender);
    setStatus(m.status);
    setMembershipDate(m.membershipDate ? m.membershipDate.toDate().toISOString().split('T')[0] : '');
    setNotes(m.notes);
    setSaveError('');
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!member || !id) return;
    setSaveError('');

    const hasMonth = birthdayMonth !== '';
    const hasDay = birthdayDay !== '';
    if (hasMonth !== hasDay) {
      setSaveError('Please select both a birthday month and day, or leave both blank.');
      return;
    }

    const newFullName = normalizeFullName(firstName, lastName);

    if (newFullName !== member.fullName) {
      const q = query(collection(db, 'members'), where('fullName', '==', newFullName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSaveError('A member with this name already exists.');
        return;
      }
    }

    setSaving(true);
    try {
      const updates = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: newFullName,
        phone,
        email,
        address,
        birthdayMonth: hasMonth ? parseInt(birthdayMonth, 10) : null,
        birthdayDay: hasDay ? parseInt(birthdayDay, 10) : null,
        gender,
        status,
        membershipDate: membershipDate ? Timestamp.fromDate(new Date(membershipDate)) : null,
        notes,
      };
      await updateDoc(doc(db, 'members', id), updates);
      setMember(prev => prev ? { ...prev, ...updates } : prev);
      setEditing(false);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (notFound) return (
    <div className="page">
      <p className="error-message">Member not found.</p>
      <Link to="/members"><button className="btn-secondary" style={{ marginTop: '1rem' }}>← Back to Members</button></Link>
    </div>
  );
  if (fetchError) return (
    <div className="page"><p className="error-message">{fetchError}</p></div>
  );
  if (!member) return null;

  const selectedMonth = parseInt(birthdayMonth, 10);
  const maxDay = birthdayMonth ? getValidDaysForMonth(selectedMonth) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  if (!editing) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{member.firstName} {member.lastName}</h1>
            <StatusBadge status={member.status} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => startEditing(member)}>Edit</button>
            <Link to="/members"><button className="btn-secondary">← Back</button></Link>
          </div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <Field label="Phone" value={member.phone} />
            <Field label="Email" value={member.email} />
            <Field label="Address" value={member.address} />
            <Field label="Gender" value={member.gender} />
            <Field label="Birthday" value={formatBirthday(member.birthdayMonth, member.birthdayDay)} />
            <Field label="Membership Date" value={formatDate(member.membershipDate)} />
            <Field label="Department" value={member.department} />
          </div>
          {member.notes && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <Field label="Notes" value={member.notes} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Edit Member</h1>
        <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
      </div>
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSave}>
          <div className="field-row">
            <div className="form-group">
              <label>First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="field-row">
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="form-group">
              <label>Birthday</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={birthdayMonth} onChange={e => { setBirthdayMonth(e.target.value); setBirthdayDay(''); }} style={{ flex: 2 }}>
                  <option value="">— Month —</option>
                  {MONTHS.slice(1).map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
                <select value={birthdayDay} onChange={e => setBirthdayDay(e.target.value)} style={{ flex: 1 }} disabled={!birthdayMonth}>
                  <option value="">— Day —</option>
                  {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Membership Date</label>
              <input type="date" value={membershipDate} onChange={e => setMembershipDate(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="form-group">
              <label>Gender *</label>
              <select value={gender} onChange={e => setGender(e.target.value as 'Male' | 'Female')}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive' | 'Visitor')}>
                <option value="Visitor">Visitor</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {saveError && <p className="error-message" style={{ marginBottom: '1rem' }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
