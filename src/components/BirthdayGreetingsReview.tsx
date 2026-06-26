import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

interface Greeting {
  id: string;
  memberName: string;
  firstName: string;
  email: string;
  date: string;
  draft: string;
}

const sendCallable = httpsCallable<{ greetingId: string }, { ok: boolean }>(functions, 'sendBirthdayGreeting');

export default function BirthdayGreetingsReview() {
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, 'sending' | 'skipping'>>({});
  const [done, setDone] = useState<Record<string, 'sent' | 'skipped'>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'birthdayGreetings'), where('reviewStatus', '==', 'pending')))
      .then(snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Greeting))
          .sort((a, b) => b.date.localeCompare(a.date));
        setGreetings(rows);
        setDrafts(Object.fromEntries(rows.map(r => [r.id, r.draft])));
      })
      .catch(() => {/* collection may not exist yet — that's fine */})
      .finally(() => setLoading(false));
  }, []);

  async function send(g: Greeting) {
    setError(e => ({ ...e, [g.id]: '' }));
    if (!g.email) { setError(e => ({ ...e, [g.id]: 'No email on file for this member.' })); return; }
    setBusy(b => ({ ...b, [g.id]: 'sending' }));
    try {
      // Persist any edits, then send through the secure callable.
      if (drafts[g.id] !== g.draft) {
        await updateDoc(doc(db, 'birthdayGreetings', g.id), { draft: drafts[g.id] });
      }
      await sendCallable({ greetingId: g.id });
      setDone(d => ({ ...d, [g.id]: 'sent' }));
    } catch {
      setError(e => ({ ...e, [g.id]: 'Failed to send. Try again.' }));
    } finally {
      setBusy(b => { const n = { ...b }; delete n[g.id]; return n; });
    }
  }

  async function skip(g: Greeting) {
    setBusy(b => ({ ...b, [g.id]: 'skipping' }));
    try {
      await updateDoc(doc(db, 'birthdayGreetings', g.id), { reviewStatus: 'skipped' });
      setDone(d => ({ ...d, [g.id]: 'skipped' }));
    } catch {
      setError(e => ({ ...e, [g.id]: 'Failed to skip. Try again.' }));
    } finally {
      setBusy(b => { const n = { ...b }; delete n[g.id]; return n; });
    }
  }

  const pending = greetings.filter(g => !done[g.id]);
  if (loading || pending.length === 0) return null;

  return (
    <section>
      <div className="section-eyebrow">Greetings to send · {pending.length}</div>
      <div className="greetings-grid">
        {pending.map(g => (
          <div key={g.id} className="card greeting-card">
            <div className="greeting-head">
              <span className="greeting-name">{g.memberName}</span>
              <span className="greeting-email">{g.email || 'no email'}</span>
            </div>
            <textarea
              className="greeting-draft"
              rows={4}
              value={drafts[g.id] ?? ''}
              onChange={e => setDrafts(d => ({ ...d, [g.id]: e.target.value }))}
              disabled={!!busy[g.id]}
            />
            {error[g.id] && <p className="save-error">{error[g.id]}</p>}
            <div className="greeting-actions">
              <button className="btn-primary btn-sm" onClick={() => send(g)} disabled={!!busy[g.id] || !g.email}>
                {busy[g.id] === 'sending' ? 'Sending…' : 'Send greeting'}
              </button>
              <button className="btn-secondary btn-sm" onClick={() => skip(g)} disabled={!!busy[g.id]}>
                {busy[g.id] === 'skipping' ? 'Skipping…' : 'Skip'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
