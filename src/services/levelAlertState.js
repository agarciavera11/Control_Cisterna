export const LEVEL_ALERT_STATE_KEY = 'cisterna-level-alert-state-v1'

const emptyState = () => ({ lowNotified: false, criticalNotified: false })

export function levelAlertKind(percent, { lowLevelThreshold, criticalLevelThreshold }) {
  const level = Number(percent)
  const low = Number(lowLevelThreshold)
  const critical = Number(criticalLevelThreshold)

  if (!Number.isFinite(level) || !Number.isFinite(low) || !Number.isFinite(critical)) return null
  if (level <= critical) return 'critical'
  if (level <= low) return 'low'
  return null
}

// Las dos banderas permiten escalar de "bajo" a "crítico" una vez, pero no
// volver a avisar hasta que el tanque se recupere por encima del nivel bajo.
export function advanceLevelAlertState(percent, config, previous = emptyState()) {
  const state = {
    lowNotified: Boolean(previous.lowNotified),
    criticalNotified: Boolean(previous.criticalNotified),
  }
  const kind = levelAlertKind(percent, config)

  if (!kind) return { state: emptyState(), alert: null, recovered: state.lowNotified || state.criticalNotified }

  if (kind === 'critical') {
    const shouldNotify = !state.criticalNotified
    return {
      state: { lowNotified: true, criticalNotified: true },
      alert: shouldNotify ? 'critical' : null,
      recovered: false,
    }
  }

  const shouldNotify = !state.lowNotified
  return {
    state: { lowNotified: true, criticalNotified: state.criticalNotified },
    alert: shouldNotify ? 'low' : null,
    recovered: false,
  }
}
