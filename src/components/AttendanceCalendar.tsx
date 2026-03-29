import { useState } from 'react';
import { getMonthDays, toDateString } from '../utils/attendanceUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  selectedDate: string | null;
  recordedDates: Set<string>;
  onSelect: (dateStr: string) => void;
}

export default function AttendanceCalendar({ selectedDate, recordedDates, onSelect }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based

  const days = getMonthDays(year, month);
  // Monday = 0 offset in our grid; getDay() returns 0=Sun
  const firstDayOfWeek = days[0].getDay(); // 0=Sun,1=Mon,...
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // shift so Mon=0

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const todayStr = toDateString(today);

  return (
    <div className="cal-wrapper">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className="cal-title">{MONTH_NAMES[month - 1]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid">
        {DAY_NAMES.map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} className="cal-cell cal-empty" />
        ))}
        {days.map(date => {
          const str = toDateString(date);
          const isToday = str === todayStr;
          const isSelected = str === selectedDate;
          const hasRecord = recordedDates.has(str);
          return (
            <button
              key={str}
              className={`cal-cell cal-day${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}`}
              onClick={() => onSelect(str)}
              aria-label={str}
              aria-pressed={isSelected}
            >
              {date.getDate()}
              {hasRecord && <span className="cal-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
