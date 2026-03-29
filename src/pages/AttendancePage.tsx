import { useState, useEffect } from 'react';
import {
  collection, doc, getDocs, setDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
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
  sermonTitle: string;
  preacher: string;
}

const EMPTY_FORM: FormState = { men: 0, women: 0, children: 0, visitors: 0, sermonTitle: '', preacher: '' };

export default function AttendancePage() {
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSaveStatus('idle');
    const existing = records.get(dateStr);
    if (existing) {
      setForm({
        men: existing.men,
        women: existing.women,
        children: existing.children,
        visitors: existing.visitors,
        sermonTitle: existing.sermonTitle ?? '',
        preacher: existing.preacher ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }

  function handleCount(field: 'men' | 'women' | 'children' | 'visitors', raw: string) {
    const digits = raw.replace(/\D/g, '');
    const val = digits === '' ? 0 : Math.max(0, parseInt(digits, 10) || 0);
    setForm(f => ({ ...f, [field]: val }));
    setSaveStatus('idle');
  }

  function handleText(field: 'sermonTitle' | 'preacher', value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setSaveStatus('idle');
  }

  const total = form.men + form.women + form.children + form.visitors;

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const record: Omit<AttendanceRecord, 'recordedAt'> & { recordedAt: unknown } = {
        men: form.men,
        women: form.women,
        children: form.children,
        visitors: form.visitors,
        sermonTitle: form.sermonTitle,
        preacher: form.preacher,
        total,
        recordedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'attendance', selectedDate), record, { merge: true });
      setRecords(prev => {
        const next = new Map(prev);
        next.set(selectedDate, {
          men: form.men,
          women: form.women,
          children: form.children,
          visitors: form.visitors,
          sermonTitle: form.sermonTitle,
          preacher: form.preacher,
          total,
          recordedAt: Timestamp.now(),
        });
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Attendance</h1>
        <Link to="/attendance/history">
          <button className="btn btn-secondary">History →</button>
        </Link>
      </div>

      {fetchError && <p className="error-message">{fetchError}</p>}

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
              <label key={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form[field] === 0 ? '' : String(form[field])}
                  disabled={!selectedDate}
                  placeholder="0"
                  onChange={e => handleCount(field, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label>
            Sermon Title
            <input
              type="text"
              value={form.sermonTitle}
              disabled={!selectedDate}
              placeholder="e.g. Walking in Faith"
              onChange={e => handleText('sermonTitle', e.target.value)}
            />
          </label>
          <label>
            Preacher
            <input
              type="text"
              value={form.preacher}
              disabled={!selectedDate}
              placeholder="e.g. Pastor John"
              onChange={e => handleText('preacher', e.target.value)}
            />
          </label>
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

      {showChart && selectedRecord && selectedDate && (
        <AttendancePieChart record={selectedRecord} date={selectedDate} />
      )}
    </div>
  );
}
