const number = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 })
const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

export const formatLiters = (value, decimals = false) => `${decimals ? number.format(value || 0) : integer.format(value || 0)} L`
export const formatPercent = (value) => `${number.format(value || 0)} %`
export const formatFlow = (value) => `${number.format(value || 0)} L/min`
export const formatM3 = (value) => `${number.format(value || 0)} m³`
export const formatCurrency = (value) => currency.format(value || 0)
export const formatDate = (date, options = { day: '2-digit', month: 'short' }) =>
  new Intl.DateTimeFormat('es-EC', options).format(new Date(`${date}T12:00:00`))

export const relativeTime = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (seconds < 5) return 'Ahora mismo'
  if (seconds < 60) return `Hace ${seconds} segundos`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`
}
