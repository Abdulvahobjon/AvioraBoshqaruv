import { DatePicker } from 'antd';
import dayjs from 'dayjs';

/**
 * antd DatePicker wrapper — string value in/out (faqat Hisobotlar + Loyiha modallari uchun).
 * picker="month" → value "YYYY-MM"; aks holda value "YYYY-MM-DD". Ko'rinish: DD.MM.YYYY / MM.YYYY.
 */
export function AntDate({ value, onChange, placeholder, picker, allowClear = true, disabled, showTime, defaultTime }) {
  const withTime = !!showTime && picker !== 'month';
  const fmtOut = picker === 'month' ? 'YYYY-MM' : withTime ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD';
  const fmtView = picker === 'month' ? 'MM.YYYY' : withTime ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY';
  return (
    <DatePicker
      value={value ? dayjs(value) : null}
      onChange={(d) => onChange(d ? d.format(fmtOut) : '')}
      format={fmtView}
      picker={picker}
      showTime={withTime ? { format: 'HH:mm', defaultValue: dayjs(defaultTime || '00:00', 'HH:mm') } : false}
      placeholder={placeholder || (picker === 'month' ? 'oy.yil' : 'kun.oy.yil')}
      allowClear={allowClear}
      disabled={disabled}
      size="large"
      className="w-full"
    />
  );
}
