'use client';

import { useState } from 'react';

function parseTime(value: string): { hour: number; period: 'AM' | 'PM' } {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return { hour: 12, period: 'AM' };
  const raw = Number(match[1]) % 12;
  return { hour: raw === 0 ? 12 : raw, period: match[3].toUpperCase() as 'AM' | 'PM' };
}

const clockHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function TimePicker({ value, onCancel, onConfirm }: { value: string; onCancel: () => void; onConfirm: (value: string) => void }) {
  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const angle = (hour % 12) * 30;
  const radians = (angle * Math.PI) / 180;
  const handX = 50 + 30 * Math.sin(radians);
  const handY = 50 - 30 * Math.cos(radians);
  return <div className="time-picker-backdrop">
    <button type="button" className="time-picker-scrim" aria-label="Close time picker" onClick={onCancel} />
    <dialog open className="time-picker" aria-label="Select time">
      <header className="time-picker-head">
        <strong>{String(hour).padStart(2, '0')}</strong>
        <div className="time-picker-period">
          <button type="button" className={period === 'AM' ? 'active' : ''} onClick={() => setPeriod('AM')}>AM</button>
          <button type="button" className={period === 'PM' ? 'active' : ''} onClick={() => setPeriod('PM')}>PM</button>
        </div>
      </header>
      <div className="time-picker-clock-wrap">
        <svg viewBox="0 0 100 100" className="time-picker-clock" role="presentation">
          <circle cx="50" cy="50" r="46" className="time-picker-face" />
          {clockHours.map((item) => {
            const itemAngle = (item % 12) * 30;
            const itemRadians = (itemAngle * Math.PI) / 180;
            const x = 50 + 38 * Math.sin(itemRadians);
            const y = 50 - 38 * Math.cos(itemRadians);
            const selected = item === hour;
            return <g key={item} className="time-picker-hour" onClick={() => setHour(item)}>
              {selected && <circle cx={x} cy={y} r="7.5" fill="#ff9800" />}
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="6" fontWeight="600" fill={selected ? '#fff' : '#333'}>{item}</text>
            </g>;
          })}
          <line x1="50" y1="50" x2={handX} y2={handY} stroke="#ff9800" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="1.6" fill="#ff9800" />
        </svg>
      </div>
      <div className="time-picker-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" onClick={() => onConfirm(`${String(hour).padStart(2, '0')}:00 ${period}`)}>OK</button>
      </div>
    </dialog>
  </div>;
}
