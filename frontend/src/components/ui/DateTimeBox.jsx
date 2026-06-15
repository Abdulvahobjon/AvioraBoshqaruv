import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Popover'ni anchor (input) ostiga `position: fixed` bilan joylaydi — modal/scroll
 * ichida ham kesilmaydi va doim eng tepada turadi. Joy yetmasa ustiga ochiladi.
 */
function usePopoverStyle(anchorRef, estHeight = 320) {
  const [style, setStyle] = useState({ position: 'fixed', left: 0, top: -9999, visibility: 'hidden' });
  useEffect(() => {
    const place = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < estHeight && r.top > spaceBelow;
      setStyle({
        position: 'fixed',
        left: Math.max(8, Math.min(r.left, window.innerWidth - 280)),
        width: r.width, // anchor (input) kengligiga teng
        ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
        visibility: 'visible',
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [anchorRef, estHeight]);
  return style;
}

/**
 * DateTimeBox — qo'lda kiritish + calendar/time/month picker popover (native JS Date).
 *
 * type="date"  → DD.MM.YYYY,  value: "YYYY-MM-DD"
 * type="time"  → HH:MM (24h), value: "HH:MM"
 * type="month" → MM.YYYY,     value: "YYYY-MM"
 */

const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const DAY_NAMES = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

// ── Calendar Popover ──────────────────────────────────────────
function CalendarPopover({ value, onChange, onClose, anchorRef, dropUp }) {
  const today = new Date();
  const initDate = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [showYearMonth, setShowYearMonth] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, anchorRef]);

  const selected = value ? new Date(value) : null;
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };

  const selectDay = (d) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    onClose();
  };
  const isSelected = (d) => selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === d;
  const isToday = (d) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;

  const years = [];
  for (let y = today.getFullYear() - 10; y <= today.getFullYear() + 10; y++) years.push(y);

  const popStyle = usePopoverStyle(anchorRef, 360);
  return createPortal(
    <div
      ref={popRef}
      className="z-[9999] select-none rounded-2xl border border-stroke-sub bg-bg-base p-3 shadow-elevated"
      style={{ ...popStyle, minWidth: 260 }}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-icon-sub hover:bg-bg-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button type="button" onClick={() => setShowYearMonth((s) => !s)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-bg-1">
          <span className="text-sm font-bold text-text-strong">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-text-soft transition-transform ${showYearMonth ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-icon-sub hover:bg-bg-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {showYearMonth && (
        <div className="mb-2 flex gap-2">
          <div className="max-h-40 flex-1 overflow-y-auto rounded-xl border border-stroke-sub scrollbar-none">
            {MONTH_NAMES.map((mn, i) => (
              <button key={mn} type="button" onClick={() => { setViewMonth(i); setShowYearMonth(false); }}
                className={`w-full px-3 py-1.5 text-left text-xs ${i === viewMonth ? 'bg-accent-disabled font-semibold text-accent-strong' : 'text-text-strong hover:bg-bg-1'}`}>{mn}</button>
            ))}
          </div>
          <div className="max-h-40 w-20 overflow-y-auto rounded-xl border border-stroke-sub scrollbar-none">
            {years.map((y) => (
              <button key={y} type="button" onClick={() => { setViewYear(y); setShowYearMonth(false); }}
                className={`w-full px-3 py-1.5 text-left text-xs ${y === viewYear ? 'bg-accent-disabled font-semibold text-accent-strong' : 'text-text-strong hover:bg-bg-1'}`}>{y}</button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((d) => <div key={d} className="py-1 text-center text-[10px] font-semibold text-text-soft">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => (
          <div key={i} className="flex aspect-square items-center justify-center">
            {d ? (
              <button type="button" onClick={() => selectDay(d)}
                className={`h-8 w-8 rounded-full text-xs font-medium transition-colors
                  ${isSelected(d) ? 'bg-accent-strong text-white'
                    : isToday(d) ? 'border-2 border-accent-strong text-accent-strong hover:bg-accent-disabled'
                    : 'text-text-strong hover:bg-bg-1'}`}>{d}</button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-stroke-soft pt-2">
        <button type="button" onClick={() => { onChange(''); onClose(); }} className="rounded-lg px-2 py-1 text-xs text-text-soft hover:bg-bg-1 hover:text-accent-sub">Tozalash</button>
        <button type="button" onClick={() => { const t = new Date(); onChange(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`); onClose(); }}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-accent-strong hover:bg-accent-disabled">Bugun</button>
      </div>
    </div>,
    document.body,
  );
}

// ── Month Popover ─────────────────────────────────────────────
function MonthPopover({ value, onChange, onClose, anchorRef, dropUp }) {
  const today = new Date();
  const init = value ? new Date(value + '-01') : today;
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const popRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, anchorRef]);

  const selected = value ? { y: Number(value.split('-')[0]), m: Number(value.split('-')[1]) - 1 } : null;
  const select = (i) => { onChange(`${viewYear}-${String(i + 1).padStart(2, '0')}`); onClose(); };

  const popStyle = usePopoverStyle(anchorRef, 280);
  return createPortal(
    <div ref={popRef} className="z-[9999] select-none rounded-2xl border border-stroke-sub bg-bg-base p-3 shadow-elevated"
      style={{ ...popStyle, minWidth: 240 }}>
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" onClick={() => setViewYear((y) => y - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-icon-sub hover:bg-bg-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="text-sm font-bold text-text-strong">{viewYear}</span>
        <button type="button" onClick={() => setViewYear((y) => y + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-icon-sub hover:bg-bg-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_NAMES.map((mn, i) => {
          const isSel = selected && selected.y === viewYear && selected.m === i;
          return (
            <button key={mn} type="button" onClick={() => select(i)}
              className={`rounded-lg py-2 text-xs font-medium transition-colors ${isSel ? 'bg-accent-strong text-white' : 'text-text-strong hover:bg-bg-1'}`}>{mn.slice(0, 4)}</button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-stroke-soft pt-2">
        <button type="button" onClick={() => { onChange(''); onClose(); }} className="rounded-lg px-2 py-1 text-xs text-text-soft hover:bg-bg-1 hover:text-accent-sub">Tozalash</button>
        <button type="button" onClick={() => { const t = new Date(); onChange(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`); onClose(); }}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-accent-strong hover:bg-accent-disabled">Bu oy</button>
      </div>
    </div>,
    document.body,
  );
}

// ── Time Picker Popover ───────────────────────────────────────
function TimePopover({ value, onChange, onClose, anchorRef, dropUp }) {
  const popRef = useRef(null);
  const hourRef = useRef(null);
  const minRef = useRef(null);
  const initH = value ? parseInt(value.split(':')[0], 10) : 0;
  const initM = value ? parseInt(value.split(':')[1], 10) : 0;
  const [hour, setHour] = useState(isNaN(initH) ? 0 : initH);
  const [min, setMin] = useState(isNaN(initM) ? 0 : initM);

  useEffect(() => {
    hourRef.current?.children[hour]?.scrollIntoView({ block: 'center' });
    minRef.current?.children[min]?.scrollIntoView({ block: 'center' });
  }, []); // eslint-disable-line

  useEffect(() => {
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, anchorRef]);

  const apply = (h, m) => onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const selectHour = (h) => { setHour(h); apply(h, min); };
  const selectMin = (m) => { setMin(m); apply(hour, m); };

  const popStyle = usePopoverStyle(anchorRef, 240);
  return createPortal(
    <div ref={popRef} className="z-[9999] select-none rounded-2xl border border-stroke-sub bg-bg-base p-2.5 shadow-elevated"
      style={{ ...popStyle, minWidth: 0 }}>
      <p className="mb-1.5 text-center text-xs font-semibold text-text-sub">Vaqt tanlang</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="mb-1 text-center text-[10px] font-medium text-text-soft">Soat</p>
          <div ref={hourRef} className="h-32 overflow-y-auto rounded-xl border border-stroke-sub scroll-smooth scrollbar-none">
            {Array.from({ length: 24 }, (_, i) => (
              <button key={i} type="button" onClick={() => selectHour(i)}
                className={`w-full py-1.5 text-center text-sm transition-colors ${i === hour ? 'bg-accent-strong font-bold text-white' : 'text-text-strong hover:bg-bg-1'}`}>{String(i).padStart(2, '0')}</button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-1 text-center text-[10px] font-medium text-text-soft">Daqiqa</p>
          <div ref={minRef} className="h-32 overflow-y-auto rounded-xl border border-stroke-sub scroll-smooth scrollbar-none">
            {Array.from({ length: 60 }, (_, i) => (
              <button key={i} type="button" onClick={() => selectMin(i)}
                className={`w-full py-1.5 text-center text-sm transition-colors ${i === min ? 'bg-accent-strong font-bold text-white' : 'text-text-strong hover:bg-bg-1'}`}>{String(i).padStart(2, '0')}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-stroke-soft pt-2">
        <button type="button" onClick={() => { setHour(0); setMin(0); onChange('00:00'); onClose(); }} className="rounded-lg px-2 py-1 text-xs text-text-soft hover:bg-bg-1 hover:text-accent-sub">Tozalash</button>
        <button type="button" onClick={() => { const n = new Date(); setHour(n.getHours()); setMin(n.getMinutes()); apply(n.getHours(), n.getMinutes()); onClose(); }}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-accent-strong hover:bg-accent-disabled">Hozir</button>
      </div>
    </div>,
    document.body,
  );
}

// ── Main DateTimeBox ──────────────────────────────────────────
export function DateTimeBox({ type = 'date', placeholder, value, onChange, disabled, error, dropUp }) {
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const isoToDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}.${m}.${y}`;
  };
  const isoToMonth = (iso) => {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    if (!y || !m) return iso;
    return `${m}.${y}`;
  };

  const [dateDisplay, setDateDisplay] = useState(type === 'month' ? isoToMonth(value) : isoToDisplay(value));
  const [timeDisplay, setTimeDisplay] = useState(value || (type === 'time' ? '00:00' : ''));

  useEffect(() => {
    if (type === 'date') setDateDisplay(isoToDisplay(value));
    else if (type === 'month') setDateDisplay(isoToMonth(value));
    else setTimeDisplay(value || '00:00');
  }, [value, type]); // eslint-disable-line

  const handleDateInput = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
    setDateDisplay(formatted);
    if (digits.length === 8) {
      let d = parseInt(digits.slice(0, 2), 10), m = parseInt(digits.slice(2, 4), 10), y = parseInt(digits.slice(4, 8), 10);
      m = Math.min(Math.max(m, 1), 12);
      d = Math.min(Math.max(d, 1), new Date(y, m, 0).getDate());
      const dd = String(d).padStart(2, '0'), mm = String(m).padStart(2, '0'), yyyy = String(y).padStart(4, '0');
      setDateDisplay(`${dd}.${mm}.${yyyy}`);
      onChange(`${yyyy}-${mm}-${dd}`);
    } else if (digits.length === 0) onChange('');
  };
  const handleDateBlur = () => {
    const digits = dateDisplay.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 8) { setDateDisplay(''); onChange(''); }
  };

  const handleMonthInput = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    setDateDisplay(formatted);
    if (digits.length === 6) {
      let m = parseInt(digits.slice(0, 2), 10), y = parseInt(digits.slice(2, 6), 10);
      m = Math.min(Math.max(m, 1), 12);
      const mm = String(m).padStart(2, '0'), yyyy = String(y).padStart(4, '0');
      setDateDisplay(`${mm}.${yyyy}`);
      onChange(`${yyyy}-${mm}`);
    } else if (digits.length === 0) onChange('');
  };
  const handleMonthBlur = () => {
    const digits = dateDisplay.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 6) { setDateDisplay(isoToMonth(value)); }
  };

  const handleTimeInput = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + ':' + digits.slice(2);
    setTimeDisplay(formatted);
    if (digits.length === 4) {
      let h = Math.min(Math.max(parseInt(digits.slice(0, 2), 10), 0), 23);
      let m = Math.min(Math.max(parseInt(digits.slice(2, 4), 10), 0), 59);
      const hh = String(h).padStart(2, '0'), mm = String(m).padStart(2, '0');
      setTimeDisplay(`${hh}:${mm}`);
      onChange(`${hh}:${mm}`);
    } else if (digits.length === 0) onChange('');
  };
  const handleTimeBlur = () => {
    const digits = timeDisplay.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 4) { setTimeDisplay('00:00'); onChange('00:00'); }
    else if (digits.length === 0) setTimeDisplay('00:00');
  };

  const wrapCls = `relative flex items-center gap-1.5 rounded-xl border bg-bg-base px-3 py-2.5 transition-colors ${error ? 'border-error-strong' : 'border-stroke-sub'} ${!error && !disabled ? 'focus-within:border-accent-sub' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`;
  const inputCls = `min-w-0 flex-1 bg-transparent text-sm text-text-strong outline-none placeholder-text-soft ${disabled ? 'cursor-not-allowed' : ''}`;

  const calIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
  const clockIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;

  if (type === 'time') {
    return (
      <div ref={wrapRef} className={wrapCls}>
        <input ref={inputRef} type="text" inputMode="numeric" value={timeDisplay} onChange={(e) => handleTimeInput(e.target.value)} onBlur={handleTimeBlur} placeholder={placeholder || 'SS:DD'} disabled={disabled} maxLength={5} className={inputCls} />
        <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} className="shrink-0 text-icon-soft transition-colors hover:text-accent-sub">{clockIcon}</button>
        {open && <TimePopover value={value} onChange={(v) => { onChange(v); setTimeDisplay(v); }} onClose={() => setOpen(false)} anchorRef={wrapRef} dropUp={dropUp} />}
      </div>
    );
  }

  if (type === 'month') {
    return (
      <div ref={wrapRef} className={wrapCls}>
        <input ref={inputRef} type="text" inputMode="numeric" value={dateDisplay} onChange={(e) => handleMonthInput(e.target.value)} onBlur={handleMonthBlur} placeholder={placeholder || 'oo.yyyy'} disabled={disabled} maxLength={7} className={inputCls} />
        <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} className="shrink-0 text-icon-soft transition-colors hover:text-accent-sub">{calIcon}</button>
        {open && <MonthPopover value={value} onChange={(v) => { onChange(v); setOpen(false); }} onClose={() => setOpen(false)} anchorRef={wrapRef} dropUp={dropUp} />}
      </div>
    );
  }

  // date
  return (
    <div ref={wrapRef} className={wrapCls}>
      <input ref={inputRef} type="text" inputMode="numeric" value={dateDisplay} onChange={(e) => handleDateInput(e.target.value)} onBlur={handleDateBlur} placeholder={placeholder || 'kk.oo.yyyy'} disabled={disabled} maxLength={10} className={inputCls} />
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} className="shrink-0 text-icon-soft transition-colors hover:text-accent-sub">{calIcon}</button>
      {open && <CalendarPopover value={value} onChange={(v) => { onChange(v); setOpen(false); }} onClose={() => setOpen(false)} anchorRef={wrapRef} dropUp={dropUp} />}
    </div>
  );
}
