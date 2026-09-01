export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const percentage = (liters, capacity) => capacity > 0 ? clamp((liters / capacity) * 100, 0, 100) : 0
export const toM3 = (liters) => (Number(liters) || 0) / 1000
export const estimatedCost = (liters, rate) => toM3(liters) * (Number(rate) || 0)
export const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
export const percentageChange = (current, reference) => reference > 0 ? ((current - reference) / reference) * 100 : null
export const projectedMonth = (history) => {
  if (!history.length) return 0
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const elapsedDays = Math.max(1, now.getDate())
  const monthTotal = history.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).reduce((sum, item) => sum + item.consumption, 0)
  return (monthTotal / elapsedDays) * daysInMonth
}

export const levelStatus = (percent, config) => {
  if (percent <= config.criticalLevelThreshold) return { label: 'Nivel crítico', tone: 'critical' }
  if (percent <= config.lowLevelThreshold) return { label: 'Nivel bajo', tone: 'low' }
  if (percent < 70) return { label: 'Nivel normal', tone: 'normal' }
  return { label: 'Nivel alto', tone: 'high' }
}

export const flowStatus = (flow, maxFlow = 30) => {
  if (flow <= 0) return 'Sin consumo'
  if (flow < maxFlow * .2) return 'Consumo bajo'
  if (flow < maxFlow * .7) return 'Consumo normal'
  return 'Consumo alto'
}

export const deriveMetrics = ({ history, volume, config }) => {
  const today = history.at(-1)?.consumption || 0
  const yesterday = history.at(-2)?.consumption || 0
  const last7 = history.slice(-7)
  const now = new Date()
  const currentMonth = history.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthRecords = history.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    return date.getMonth() === previousDate.getMonth() && date.getFullYear() === previousDate.getFullYear()
  })
  const monthly = currentMonth.reduce((sum, item) => sum + item.consumption, 0)
  const previousMonth = previousMonthRecords.reduce((sum, item) => sum + item.consumption, 0)
  const projected = projectedMonth(history)
  const dailyAverage = average(last7.map((item) => item.consumption))
  const reference = config.savingsMode === 'goal' ? config.monthlyGoalLiters : previousMonth
  const comparisonValue = config.savingsMode === 'goal' ? projected : monthly
  const savings = Math.max(0, reference - comparisonValue)
  const maxDay = history.reduce((best, item) => !best || item.consumption > best.consumption ? item : best, null)
  const minDay = history.reduce((best, item) => !best || item.consumption < best.consumption ? item : best, null)
  const currentPercent = percentage(volume, config.tankCapacityLiters)
  const autonomy = dailyAverage > 0 ? volume / dailyAverage : null

  return {
    today,
    yesterday,
    todayChange: percentageChange(today, yesterday),
    weekly: last7.reduce((sum, item) => sum + item.consumption, 0),
    dailyAverage,
    monthly,
    previousMonth,
    monthlyChange: percentageChange(monthly, previousMonth),
    projected,
    savings,
    savingsPercent: reference > 0 ? savings / reference * 100 : null,
    savingsMoney: estimatedCost(savings, config.waterRatePerM3),
    monthlyCost: estimatedCost(monthly, config.waterRatePerM3),
    projectedCost: estimatedCost(projected, config.waterRatePerM3),
    autonomy,
    maxDay,
    minDay,
    currentPercent,
    missingLiters: Math.max(0, config.tankCapacityLiters - volume),
    minLevelToday: history.at(-1)?.minLevel ?? currentPercent,
    maxLevelToday: history.at(-1)?.maxLevel ?? currentPercent,
  }
}
