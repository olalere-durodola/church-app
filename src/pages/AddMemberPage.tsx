import { useState, FormEvent } from 'react';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { normalizeFullName, getValidDaysForMonth } from '../utils/memberUtils';
import type { NewMember } from '../types/member';
import { MONTHS } from '../utils/dateConstants';

export default function AddMemberPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Visitor'>('Visitor');
  const [membershipDate, setMembershipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedMonth = parseInt(birthdayMonth, 10);
  const maxDay = birthdayMonth ? getValidDaysForMonth(selectedMonth) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const hasMonth = birthdayMonth !== '';
    const hasDay = birthdayDay !== '';
    if (hasMonth !== hasDay) {
      setError('Please select both a birthday month and day, or leave both blank.');
      return;
    }

    const fullName = normalizeFullName(firstName, lastName);

    const q = query(collection(db, 'members'), where('fullName', '==', fullName));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setError('A member with this name already exists.');
      return;
    }

    setSaving(true);
    try {
      const newMember: NewMember = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        phone,
        email,
        address,
        birthdayMonth: hasMonth ? selectedMonth : null,
        birthdayDay: hasDay ? parseInt(birthdayDay, 10) : null,
        gender,
        status,
        department: null,
        membershipDate: membershipDate ? Timestamp.fromDate(new Date(membershipDate)) : null,
        notes,
        createdAt: Timestamp.now(),
      };
      const ref = await addDoc(collection(db, 'members'), newMember);
      navigate(`/members/${ref.id}`);
    } catch {
      setError('Failed to save member. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Add Member</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Add a new member to the church directory
          </p>
        </div>
        <Link to="/members"><button className="btn-secondary">Cancel</button></Link>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="field-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input id="address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="field-row">
            <div className="form-group">
              <label>Birthday</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={birthdayMonth}
                  onChange={e => { setBirthdayMonth(e.target.value); setBirthdayDay(''); }}
                  style={{ flex: 2 }}
                >
                  <option value="">— Month —</option>
                  {MONTHS.slice(1).map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={birthdayDay}
                  onChange={e => setBirthdayDay(e.target.value)}
                  style={{ flex: 1 }}
                  disabled={!birthdayMonth}
                >
                  <option value="">— Day —</option>
                  {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="membershipDate">Membership Date</label>
              <input
                id="membershipDate"
                type="date"
                value={membershipDate}
                onChange={e => setMembershipDate(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select id="gender" value={gender} onChange={e => setGender(e.target.value as 'Male' | 'Female')}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select id="status" value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive' | 'Visitor')}>
                <option value="Visitor">Visitor</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Member'}
            </button>
            <Link to="/members"><button type="button" className="btn-secondary">Cancel</button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
