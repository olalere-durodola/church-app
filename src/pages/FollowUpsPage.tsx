import { useEffect, useState, FormEvent } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, Timestamp, arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Member } from '../types/member';
import type { AttendanceRecord } from '../types/attendance';
import type { FollowUp, FollowUpType, TouchChannel } from '../types/followUp';
import { FOLLOWUP_TYPES, FOLLOWUP_TYPE_LABEL } from '../types/followUp';
import LoadingSpinner from '../components/LoadingSpinner';
import ContactActions from '../components/ContactActions';

const CHANNELS: TouchChannel[] = ['call', 'whatsapp', 'visit', 'email', 'sms', 'other'];
const ABSENT_WINDOW = 6;     // recent services considered
const ABSENT_THRESHOLD = 3;  // flag members absent in >= this many

function fmtWhen(ts?: Timestamp | null): string {
  if (!ts) return '';
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<(AttendanceRecord & { id: string })[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // New follow-up modal
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fMemberId, setFMemberId] = useState('');
  const [fType, setFType] = useState<FollowUpType>('check-in');
  const [fDue, setFDue] = useState('');
  const [fAssigned, setFAssigned] = useState('');
  const [fNotes, setFNotes] = useState('');

  // Log-touch modal
  const [touchFor, setTouchFor] = useState<FollowUp | null>(null);
  const [tChannel, setTChannel] = useState<TouchChannel>('call');
  const [tNote, setTNote] = useState('');
  const [tSaving, setTSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'followUps')),
      getDocs(collection(db, 'members')),
      getDocs(collection(db, 'attendance')),
    ])
      .then(([fSnap, mSnap, aSnap]) => {
        setItems(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as FollowUp)));
        setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        setAttendance(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord & { id: string })));
      })
      .catch(() => setError('Failed to load follow-ups.'))
      .finally(() => setLoading(false));
  }, []);

  async function createAbsenteeFollowUp(m: Member, missed: number) {
    setBusyId(m.id);
    try {
      const payload = {
        subjectName: `${m.firstName} ${m.lastName}`,
        memberId: m.id,
        visitorId: null,
        phone: m.phone ?? '',
        email: m.email ?? '',
        type: 'absentee' as const,
        status: 'open' as const,
        dueDate: '',
        assignedTo: '',
        notes: `Marked absent ${missed} of the last ${Math.min(ABSENT_WINDOW, attendance.length)} services.`,
        touchLog: [],
        createdAt: serverTimestamp(),
        completedAt: null,
      };
      const ref = await addDoc(collection(db, 'followUps'), payload);
      setItems(prev => [...prev, { id: ref.id, ...payload, createdAt: Timestamp.now() } as FollowUp]);
    } catch {
      setError('Failed to create follow-up.');
    } finally {
      setBusyId(null);
    }
  }

  async function addFollowUp(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const m = members.find(x => x.id === fMemberId);
    if (!m) { setFormError('Please choose a member.'); return; }
    setSaving(true);
    try {
      const payload = {
        subjectName: `${m.firstName} ${m.lastName}`,
        memberId: m.id,
        visitorId: null,
        phone: m.phone ?? '',
        email: m.email ?? '',
        type: fType,
        status: 'open' as const,
        dueDate: fDue || '',
        assignedTo: fAssigned.trim(),
        notes: fNotes.trim(),
        touchLog: [],
        createdAt: serverTimestamp(),
        completedAt: null,
      };
      const ref = await addDoc(collection(db, 'followUps'), payload);
      setItems(prev => [...prev, { id: ref.id, ...payload, createdAt: Timestamp.now() } as FollowUp]);
      setAdding(false);
      setFMemberId(''); setFType('check-in'); setFDue(''); setFAssigned(''); setFNotes('');
    } catch {
      setFormError('Failed to create follow-up. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function markDone(f: FollowUp) {
    setBusyId(f.id);
    try {
      await updateDoc(doc(db, 'followUps', f.id), { status: 'done', completedAt: serverTimestamp() });
      setItems(prev => prev.map(x => x.id === f.id ? { ...x, status: 'done', completedAt: Timestamp.now() } : x));
    } catch {
      setError('Failed to update follow-up.');
    } finally {
      setBusyId(null);
    }
  }

  async function reopen(f: FollowUp) {
    setBusyId(f.id);
    try {
      await updateDoc(doc(db, 'followUps', f.id), { status: 'open', completedAt: null });
      setItems(prev => prev.map(x => x.id === f.id ? { ...x, status: 'open', completedAt: null } : x));
    } catch {
      setError('Failed to update follow-up.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(f: FollowUp) {
    setBusyId(f.id);
    try {
      await deleteDoc(doc(db, 'followUps', f.id));
      setItems(prev => prev.filter(x => x.id !== f.id));
    } catch {
      setError('Failed to remove follow-up.');
    } finally {
      setBusyId(null);
    }
  }

  async function saveTouch(e: FormEvent) {
    e.preventDefault();
    if (!touchFor) return;
    setTSaving(true);
    const entry = { channel: tChannel, note: tNote.trim(), at: Timestamp.now() };
    try {
      await updateDoc(doc(db, 'followUps', touchFor.id), { touchLog: arrayUnion(entry) });
      setItems(prev => prev.map(x => x.id === touchFor.id
        ? { ...x, touchLog: [...(x.touchLog ?? []), entry] }
        : x));
      setTouchFor(null); setTNote(''); setTChannel('call');
    } catch {
      setError('Failed to log touch.');
    } finally {
      setTSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const visible = items
    .filter(f => (showDone ? f.status === 'done' : f.status === 'open'))
    .filter(f => (typeFilter ? f.type === typeFilter : true))
    .sort((a, b) => {
      // open: soonest due first (blank due last); done: most recently completed first
      if (!showDone) return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      return (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0);
    });

  const openCount = items.filter(f => f.status === 'open').length;
  const todayIso = new Date().toISOString().split('T')[0];

  // Absentee detection: tally absences across the most recent services.
  const recentServices = [...attendance].sort((a, b) => b.id.localeCompare(a.id)).slice(0, ABSENT_WINDOW);
  const absenceCount = new Map<string, number>();
  recentServices.forEach(r => (r.absentees ?? []).forEach(id => absenceCount.set(id, (absenceCount.get(id) ?? 0) + 1)));
  const hasOpenAbsentee = new Set(items.filter(f => f.type === 'absentee' && f.status === 'open' && f.memberId).map(f => f.memberId));
  const suggestions = [...absenceCount.entries()]
    .filter(([id, n]) => n >= ABSENT_THRESHOLD && !hasOpenAbsentee.has(id) && !dismissed.includes(id))
    .map(([id, n]) => ({ member: members.find(m => m.id === id), missed: n }))
    .filter((s): s is { member: Member; missed: number } => !!s.member)
    .sort((a, b) => b.missed - a.missed);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Follow-ups</h1>
          <p>{openCount} open · pastoral care tasks</p>
        </div>
        <button className="btn-primary" onClick={() => { setFormError(''); setAdding(true); }}>+ New Follow-up</button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {suggestions.length > 0 && (
        <div className="absentee-suggest">
          <div className="section-eyebrow" style={{ marginBottom: '0.75rem' }}>
            Suggested from absences · {suggestions.length}
          </div>
          {suggestions.map(({ member, missed }) => (
            <div key={member.id} className="absentee-suggest-row">
              <span className="absentee-suggest-name">{member.firstName} {member.lastName}</span>
              <span className="absentee-suggest-count">absent {missed}/{recentServices.length}</span>
              <button className="btn-primary btn-sm" disabled={busyId === member.id} onClick={() => createAbsenteeFollowUp(member, missed)}>
                {busyId === member.id ? '…' : 'Create follow-up'}
              </button>
              <button className="visitor-remove" onClick={() => setDismissed(d => [...d, member.id])} aria-label="Dismiss">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="filters">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{FOLLOWUP_TYPE_LABEL[t]}</option>)}
          </select>
          <button className="pipeline-toggle" style={{ marginTop: 0 }} onClick={() => setShowDone(s => !s)}>
            {showDone ? 'Show open' : 'Show completed'}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <p>{showDone ? 'No completed follow-ups.' : 'No open follow-ups.'}</p>
          <span>{showDone ? '' : 'Create one, or log a visitor to auto-generate a welcome.'}</span>
        </div>
      ) : (
        <div className="followup-grid">
          {visible.map(f => {
            const overdue = !showDone && f.dueDate && f.dueDate < todayIso;
            return (
              <div key={f.id} className={`card followup-card type-${f.type}`}>
                <div className="followup-top">
                  <div>
                    <div className="followup-name">{f.subjectName}</div>
                    <span className={`followup-type-badge type-${f.type}`}>{FOLLOWUP_TYPE_LABEL[f.type]}</span>
                  </div>
                  <button className="visitor-remove" disabled={busyId === f.id} onClick={() => remove(f)} aria-label="Remove">✕</button>
                </div>

                {(f.dueDate || f.assignedTo) && (
                  <div className="followup-meta">
                    {f.dueDate && <span className={overdue ? 'followup-overdue' : ''}>Due {f.dueDate}{overdue ? ' · overdue' : ''}</span>}
                    {f.assignedTo && <span> · {f.assignedTo}</span>}
                  </div>
                )}
                {f.notes && <div className="followup-notes">{f.notes}</div>}

                {f.touchLog && f.touchLog.length > 0 && (
                  <div className="touchlog">
                    {f.touchLog.slice(-3).map((t, i) => (
                      <div key={i} className="touchlog-row">
                        <span className="touchlog-channel">{t.channel}</span>
                        <span className="touchlog-when">{fmtWhen(t.at)}</span>
                        {t.note && <span className="touchlog-note">{t.note}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <ContactActions phone={f.phone} email={f.email} compact />

                <div className="followup-actions">
                  <button className="btn-secondary btn-sm" disabled={busyId === f.id} onClick={() => { setTouchFor(f); setTNote(''); setTChannel('call'); }}>Log touch</button>
                  {f.status === 'open'
                    ? <button className="btn-primary btn-sm" disabled={busyId === f.id} onClick={() => markDone(f)}>Mark done</button>
                    : <button className="btn-secondary btn-sm" disabled={busyId === f.id} onClick={() => reopen(f)}>Reopen</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New follow-up modal */}
      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)} role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Follow-up</h2>
              <button className="modal-close" onClick={() => setAdding(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={addFollowUp} className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label>Member *</label>
                <select value={fMemberId} onChange={e => setFMemberId(e.target.value)} required>
                  <option value="">— Choose a member —</option>
                  {[...members].sort((a, b) => a.fullName.localeCompare(b.fullName)).map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="field-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={fType} onChange={e => setFType(e.target.value as FollowUpType)}>
                    {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{FOLLOWUP_TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due date</label>
                  <input type="date" value={fDue} onChange={e => setFDue(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Assigned to</label>
                <input value={fAssigned} onChange={e => setFAssigned(e.target.value)} placeholder="Pastor / minister / HOD name" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)} />
              </div>
              {formError && <p className="error-message" style={{ marginBottom: '1rem' }}>{formError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log-touch modal */}
      {touchFor && (
        <div className="modal-backdrop" onClick={() => setTouchFor(null)} role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log touch — {touchFor.subjectName}</h2>
              <button className="modal-close" onClick={() => setTouchFor(null)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={saveTouch} className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label>Channel</label>
                <select value={tChannel} onChange={e => setTChannel(e.target.value as TouchChannel)}>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Note</label>
                <textarea rows={3} value={tNote} onChange={e => setTNote(e.target.value)} placeholder="What happened?" autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setTouchFor(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={tSaving}>{tSaving ? 'Saving…' : 'Save touch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
