import { useEffect, useState, FormEvent } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, Timestamp, query, where,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import type { Visitor, VisitorStage } from '../types/visitor';
import { VISITOR_STAGES } from '../types/visitor';
import { normalizeFullName } from '../utils/memberUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ContactActions from '../components/ContactActions';

const ACTIVE_STAGES: VisitorStage[] = ['New', 'Contacted', 'Returned'];

const EMPTY = {
  firstName: '', lastName: '', phone: '', email: '',
  howHeard: '', invitedBy: '', firstVisitDate: '', prayerRequest: '', notes: '',
};

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLapsed, setShowLapsed] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'visitors'))
      .then(snap => setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visitor))))
      .catch(() => setError('Failed to load visitors.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        firstVisitDate: form.firstVisitDate || isoToday(),
        stage: 'New' as VisitorStage,
        convertedMemberId: null,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'visitors'), payload);
      setVisitors(prev => [...prev, { id: ref.id, ...payload, createdAt: Timestamp.now() } as Visitor]);

      // Auto-create a welcome follow-up (non-critical — don't block the add on it)
      try {
        await addDoc(collection(db, 'followUps'), {
          subjectName: `${payload.firstName} ${payload.lastName}`,
          memberId: null,
          visitorId: ref.id,
          phone: payload.phone,
          email: payload.email,
          type: 'welcome',
          status: 'open',
          dueDate: '',
          assignedTo: '',
          notes: 'First-time visitor — reach out to welcome them.',
          touchLog: [],
          createdAt: serverTimestamp(),
          completedAt: null,
        });
      } catch { /* follow-up is a nice-to-have; ignore failures */ }

      setForm({ ...EMPTY });
      setAdding(false);
    } catch {
      setFormError('Failed to add visitor. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function moveStage(v: Visitor, stage: VisitorStage) {
    setBusyId(v.id);
    try {
      await updateDoc(doc(db, 'visitors', v.id), { stage });
      setVisitors(prev => prev.map(x => x.id === v.id ? { ...x, stage } : x));
    } catch {
      setError('Failed to update stage.');
    } finally {
      setBusyId(null);
    }
  }

  async function convertToMember(v: Visitor) {
    setBusyId(v.id);
    setError('');
    try {
      const fullName = normalizeFullName(v.firstName, v.lastName);
      // Avoid duplicate member records
      const dup = await getDocs(query(collection(db, 'members'), where('fullName', '==', fullName)));
      if (!dup.empty) {
        setError(`A member named ${fullName} already exists — marked as Joined instead.`);
        await moveStage(v, 'Joined');
        return;
      }
      const member = {
        firstName: v.firstName,
        lastName: v.lastName,
        fullName,
        phone: v.phone,
        email: v.email,
        address: '',
        birthdayMonth: null,
        birthdayDay: null,
        gender: 'Male',
        status: 'Active',
        departments: [],
        membershipDate: Timestamp.fromDate(new Date()),
        notes: v.notes ? `From visitor record: ${v.notes}` : '',
        role: null,
        hodDepartments: [],
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'members'), member);
      await updateDoc(doc(db, 'visitors', v.id), { stage: 'Joined', convertedMemberId: ref.id });
      setVisitors(prev => prev.map(x => x.id === v.id ? { ...x, stage: 'Joined', convertedMemberId: ref.id } : x));
    } catch {
      setError('Failed to convert to member.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(v: Visitor) {
    setBusyId(v.id);
    try {
      await deleteDoc(doc(db, 'visitors', v.id));
      setVisitors(prev => prev.filter(x => x.id !== v.id));
    } catch {
      setError('Failed to remove visitor.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  const stagesToShow = showLapsed ? VISITOR_STAGES : VISITOR_STAGES.filter(s => s !== 'Lapsed');
  const byStage = (s: VisitorStage) => visitors.filter(v => v.stage === s);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Visitors</h1>
          <p>First-time guests, from welcome to membership.</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ ...EMPTY }); setFormError(''); setAdding(true); }}>
          + Log Visitor
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="pipeline">
        {stagesToShow.map(stage => {
          const rows = byStage(stage);
          return (
            <div key={stage} className="pipeline-col">
              <div className="pipeline-col-head">
                <span className={`stage-dot stage-${stage.toLowerCase()}`} />
                {stage}
                <span className="pipeline-count">{rows.length}</span>
              </div>
              <div className="pipeline-col-body">
                {rows.length === 0 ? (
                  <p className="pipeline-empty">—</p>
                ) : (
                  rows.map(v => (
                    <div key={v.id} className="visitor-card">
                      <div className="visitor-name">{v.firstName} {v.lastName}</div>
                      {(v.howHeard || v.invitedBy) && (
                        <div className="visitor-meta">
                          {v.invitedBy ? `Invited by ${v.invitedBy}` : v.howHeard}
                        </div>
                      )}
                      {v.firstVisitDate && <div className="visitor-meta">First visit · {v.firstVisitDate}</div>}
                      {v.prayerRequest && <div className="visitor-prayer">🙏 {v.prayerRequest}</div>}

                      <ContactActions phone={v.phone} email={v.email} compact />

                      <div className="visitor-card-actions">
                        {ACTIVE_STAGES.includes(stage) && (
                          <select
                            className="visitor-stage-select"
                            value={stage}
                            disabled={busyId === v.id}
                            onChange={e => moveStage(v, e.target.value as VisitorStage)}
                            aria-label="Move stage"
                          >
                            {VISITOR_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        {stage !== 'Joined' && (
                          <button className="btn-primary btn-sm" disabled={busyId === v.id} onClick={() => convertToMember(v)}>
                            {busyId === v.id ? '…' : 'Make member'}
                          </button>
                        )}
                        {stage === 'Joined' && v.convertedMemberId && (
                          <Link className="btn-secondary btn-sm" to={`/members/${v.convertedMemberId}`}>View member</Link>
                        )}
                        <button className="visitor-remove" disabled={busyId === v.id} onClick={() => remove(v)} title="Remove" aria-label="Remove visitor">✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="pipeline-toggle" onClick={() => setShowLapsed(s => !s)}>
        {showLapsed ? 'Hide lapsed' : 'Show lapsed'}
      </button>

      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)} role="dialog" aria-modal="true">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log a Visitor</h2>
              <button className="modal-close" onClick={() => setAdding(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleAdd} className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="field-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required autoFocus />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                </div>
              </div>
              <div className="field-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="field-row">
                <div className="form-group">
                  <label>How did they hear about us?</label>
                  <input value={form.howHeard} onChange={e => setForm(f => ({ ...f, howHeard: e.target.value }))} placeholder="e.g. Social media, walk-in" />
                </div>
                <div className="form-group">
                  <label>Invited by</label>
                  <input value={form.invitedBy} onChange={e => setForm(f => ({ ...f, invitedBy: e.target.value }))} placeholder="Member's name" />
                </div>
              </div>
              <div className="form-group">
                <label>First visit date</label>
                <input type="date" value={form.firstVisitDate} onChange={e => setForm(f => ({ ...f, firstVisitDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Prayer request</label>
                <textarea rows={2} value={form.prayerRequest} onChange={e => setForm(f => ({ ...f, prayerRequest: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {formError && <p className="error-message" style={{ marginBottom: '1rem' }}>{formError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Visitor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
