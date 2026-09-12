import { advanceLevelAlertState, LEVEL_ALERT_STATE_KEY } from './levelAlertState'

function readState() {
  try {
    return JSON.parse(localStorage.getItem(LEVEL_ALERT_STATE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveState(state) {
  try {
    localStorage.setItem(LEVEL_ALERT_STATE_KEY, JSON.stringify(state))
  } catch {
    // No se bloquea el monitoreo si el navegador no permite almacenamiento.
  }
}

export function deviceNotificationPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function requestDeviceNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

function hasUsableEmailChannel(config) {
  if (!config.alertEmailEnabled || !String(config.alertEmailWebhookUrl || '').trim() || !String(config.alertEmail || '').trim()) return false
  try {
    const url = new URL(config.alertEmailWebhookUrl)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function hasUsableDeviceChannel(config) {
  return Boolean(config.deviceNotificationsEnabled) && deviceNotificationPermission() === 'granted'
}

function messageFor(alert) {
  const level = `${alert.level.toFixed(1)} %`
  if (alert.kind === 'critical') return `Nivel crítico: la cisterna está al ${level}, por debajo del umbral crítico de ${alert.criticalThreshold} %.`
  return `Nivel bajo: la cisterna está al ${level}, por debajo del umbral de ${alert.lowThreshold} %.`
}

function sendDeviceNotification(alert) {
  new Notification(alert.kind === 'critical' ? 'Nivel de agua crítico' : 'Nivel de agua bajo', {
    body: messageFor(alert),
    tag: `cisterna-level-${alert.kind}`,
    renotify: true,
  })
}

async function sendEmailWebhook(alert, config) {
  const response = await fetch(config.alertEmailWebhookUrl.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'cisterna.level_alert',
      severity: alert.kind,
      subject: alert.kind === 'critical' ? 'Nivel de agua crítico' : 'Nivel de agua bajo',
      message: messageFor(alert),
      recipient: config.alertEmail.trim(),
      tankName: config.tankName,
      levelPercent: alert.level,
      lowThresholdPercent: alert.lowThreshold,
      criticalThresholdPercent: alert.criticalThreshold,
      occurredAt: alert.occurredAt,
    }),
  })
  if (!response.ok) throw new Error(`El webhook de correo respondió HTTP ${response.status}`)
}

async function deliver(alert, config) {
  const tasks = []
  if (hasUsableDeviceChannel(config)) tasks.push(Promise.resolve().then(() => sendDeviceNotification(alert)))
  if (hasUsableEmailChannel(config)) tasks.push(sendEmailWebhook(alert, config))
  const results = await Promise.allSettled(tasks)
  results.forEach((result) => {
    if (result.status === 'rejected') console.error('No se pudo enviar la alerta de nivel:', result.reason)
  })
}

// Se llama con cada lectura. El estado se guarda ANTES de entregar para que un
// fallo transitorio o un poll de 5 s no conviertan la alerta en una ráfaga.
export function notifyLevelIfNeeded(percent, config) {
  const next = advanceLevelAlertState(percent, config, readState())
  const canDeliver = hasUsableDeviceChannel(config) || hasUsableEmailChannel(config)

  // Aunque los canales estén apagados, una recuperación debe rearmar una alerta
  // que ya se había enviado. No se marca una alerta nueva sin un canal activo:
  // al activarlo mientras el nivel sigue bajo, el usuario sí recibe el aviso.
  if (next.recovered) saveState(next.state)
  if (!canDeliver) return null

  saveState(next.state)
  if (!next.alert) return null

  const alert = {
    kind: next.alert,
    level: Number(percent),
    lowThreshold: Number(config.lowLevelThreshold),
    criticalThreshold: Number(config.criticalLevelThreshold),
    occurredAt: new Date().toISOString(),
  }
  void deliver(alert, config)
  return alert
}
