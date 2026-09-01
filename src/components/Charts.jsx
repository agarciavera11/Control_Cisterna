import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import { formatDate } from '../utils/formatters'

const tooltipStyle = { border: '0', borderRadius: '16px', boxShadow: '0 12px 35px rgba(20,35,31,.12)', fontSize: '12px' }

export function DailyConsumptionChart({ history, days = 7, height = 270 }) {
  const data = history.slice(-days).map((item) => ({ ...item, label: formatDate(item.date, { weekday: 'short' }) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 2, left: -22, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e9efec" strokeDasharray="3 3" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#7a8783', fontSize: 11 }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9aa5a1', fontSize: 10 }} />
        <Tooltip cursor={{ fill: '#eff8f5' }} contentStyle={tooltipStyle} formatter={(value) => [`${Math.round(value).toLocaleString('es-EC')} L`, 'Consumo']} labelFormatter={(_, payload) => payload[0] ? formatDate(payload[0].payload.date, { day: 'numeric', month: 'long' }) : ''} />
        <Bar dataKey="consumption" fill="#2ea892" radius={[8, 8, 8, 8]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TankLevelChart({ history, currentPercent, height = 270 }) {
  const today = history.at(-1)
  const data = (today?.hourly || []).map((_, hour) => {
    const range = (today?.maxLevel || currentPercent) - (today?.minLevel || currentPercent)
    const percent = Math.max(0, (today?.maxLevel || currentPercent) - range * (hour / 23) + Math.sin(hour * .8) * 1.5)
    return { hour: `${String(hour).padStart(2, '0')}:00`, percent: Number(percent.toFixed(1)) }
  })
  if (data.length) data[new Date().getHours()] = { hour: `${String(new Date().getHours()).padStart(2, '0')}:00`, percent: currentPercent }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
        <defs><linearGradient id="levelGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#40bca6" stopOpacity={.28} /><stop offset="100%" stopColor="#40bca6" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#e9efec" strokeDasharray="3 3" />
        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#7a8783', fontSize: 10 }} interval={5} dy={8} />
        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9aa5a1', fontSize: 10 }} tickFormatter={(value) => `${value}%`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)} %`, 'Nivel']} />
        <Area type="monotone" dataKey="percent" stroke="#23937f" strokeWidth={2.5} fill="url(#levelGradient)" activeDot={{ r: 5, fill: '#23937f', stroke: 'white', strokeWidth: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HourlyChart({ history, height = 300 }) {
  const data = (history.at(-1)?.hourly || []).map((consumption, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, consumption }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e9efec" strokeDasharray="3 3" />
        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#7a8783', fontSize: 10 }} interval={3} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9aa5a1', fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)} L`, 'Consumo']} />
        <Bar dataKey="consumption" fill="#6cc9b8" radius={[5, 5, 5, 5]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LiveChart({ points, height = 190 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 6, left: -26, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e9efec" strokeDasharray="3 3" />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#7a8783', fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9aa5a1', fontSize: 10 }} tickFormatter={(value) => `${value}%`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)} %`, 'Nivel']} />
        <Line type="monotone" dataKey="level" stroke="#23937f" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
