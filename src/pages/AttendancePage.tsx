import { useState, useEffect } from 'react';
import {
  collection, doc, getDocs, setDoc, serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AttendanceRecord } from '../types/attendance';
import { formatDisplayDate } from '../utils/attendanceUtils';
import AttendanceCalendar from '../components/AttendanceCalendar';
import AttendancePieChart from '../components/AttendancePieChart';
import LoadingSpinner from '../components/LoadingSpinner';

interface FormState {
  men: number;
  women: number;
  children: number;
  visitors: number;
}

const EMPTY_FORM: FormState = { men: 0, women: 0, children: 0, visitors: 0 };

export default function AttendancePage() {
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch all records on mount
  useEffect(() => {
    const q = query(collection(db, 'attendance'), orderBy('__name__', 'desc'));
    getDocs(q)
      .then(snap => {
        const map = new Map<string, AttendanceRecord>();
        snap.forEach(d => map.set(d.id, d.data() as AttendanceRecord));
        setRecords(map);
      })
      .catch(() => setFetchError('Failed to load attendance records.'))
      .finally(() => setLoading(false));
  }, []);

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSaveStatus('idle');
    const existing = records.get(dateStr);
    if (existing) {
      setForm({ men: existing.men, women: existing.women, children: existing.children, visitors: existing.visitors });
    } else {
      setForm(EMPTY_FORM);
    }
  }

  function handleInput(field: keyof FormState, raw: string) {
    const val = Math.max(0, parseInt(raw, 10) || 0);
    setForm(f => ({ ...f, [field]: val }));
    setSaveStatus('idle');
  }

  const total = form.men + form.women + form.children + form.visitors;

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const record: Omit<AttendanceRecord, 'recordedAt'> & { recordedAt: unknown } = {
        ...form,
        total,
        recordedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'attendance', selectedDate), record, { merge: true });
      // Update local cache
      setRecords(prev => {
        const next = new Map(prev);
        next.set(selectedDate, { ...form, total } as AttendanceRecord);
        return next;
      });
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  const recordedDates = new Set(records.keys());
  const selectedRecord = selectedDate ? records.get(selectedDate) : undefined;
  const showChart = !!(selectedRecord && selectedRecord.total > 0);

  // History sorted by date descending (keys are YYYY-MM-DD so lexicographic = chronological)
  const history = Array.from(records.entries()).sort(([a], [b]) => b.localeCompare(a));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <h1 className="page-title">Attendance</h1>

      {fetchError && <div className="error-banner">{fetchError}</div>}

      {/* Top section: calendar + form */}
      <div className="attendance-top">
        <AttendanceCalendar
          selectedDate={selectedDate}
          recordedDates={recordedDates}
          onSelect={handleDateSelect}
        />

        <div className="attendance-form-card">
          <h2 className="section-title">
            {selectedDate ? formatDisplayDate(selectedDate) : 'Record Attendance'}
          </h2>
          {!selectedDate && (
            <p className="attendance-form-prompt">Select a date to record attendance.</p>
          )}
          <div className="form-fields">
            {(['men', 'women', 'children', 'visitors'] as const).map(field => (
              <label key={field} className="form-label">
                {field.charAt(0).toUpperCase() + field.slice(1)}
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={form[field]}
                  disabled={!selectedDate}
                  onChange={e => handleInput(field, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="attendance-total">Total: <strong>{total}</strong></div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedDate || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveStatus === 'success' && <p className="save-success">Saved!</p>}
          {saveStatus === 'error' && <p className="save-error">Save failed. Try again.</p>}
        </div>
      </div>

      {/* Pie chart */}
      {showChart && selectedRecord && (
        <AttendancePieChart record={selectedRecord} />
      )}

      {/* History table */}
      <div className="table-card">
        <h2 className="section-title">History</h2>
        {history.length === 0 ? (
          <p className="empty-state">No records yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Men</th>
                  <th>Women</th>
                  <th>Children</th>
                  <th>Visitors</th>
                  <th>Total</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {history.map(([dateStr, rec]) => (
                  <tr
                    key={dateStr}
                    className={dateStr === selectedDate ? 'row-selected' : ''}
                    onClick={() => handleDateSelect(dateStr)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{formatDisplayDate(dateStr)}</td>
                    <td>{rec.men}</td>
                    <td>{rec.women}</td>
                    <td>{rec.children}</td>
                    <td>{rec.visitors}</td>
                    <td><strong>{rec.total}</strong></td>
                    <td>{rec.recordedAt ? rec.recordedAt.toDate().toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
