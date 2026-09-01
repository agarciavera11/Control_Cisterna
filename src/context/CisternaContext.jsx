/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mockDataSource, DEFAULT_CONFIG, generateMockHistory } from '../services/mockDataSource'
import { loadLive as loadLiveFirebase, clearCache as clearLiveCache } from '../services/firebaseDataSource'
import { clamp, deriveMetrics, percentage } from '../utils/calculations'

const CisternaContext = createContext(null)

export function CisternaProvider({ children }) {
  const [initial] = useState(mockDataSource.load)
  const [config, setConfigState] = useState(initial.config)
  const [history, setHistory] = useState(initial.history)
  const [runtime, setRuntime] = useState(initial.runtime)
  const [liveStatus, setLiveStatus] = useState({ loading: false, error: null, lastSync: null, latestTs: null })
  const [liveTick, setLiveTick] = useState(0)

  const capacity = runtime.demoTank ? config.demoCapacityLiters : config.tankCapacityLiters
  const metricsConfig = useMemo(() => ({ ...config, tankCapacityLiters: capacity }), [config, capacity])
  const metrics = useMemo(() => deriveMetrics({ history, volume: runtime.volume, config: metricsConfig }), [history, runtime.volume, metricsConfig])

  // Refs para que el bucle de lectura en vivo use siempre la config/runtime actual
  // sin tener que re-suscribirse (y reiniciar el intervalo) en cada render.
  const configRef = useRef(metricsConfig)
  const runtimeRef = useRef(runtime)
  useEffect(() => { configRef.current = metricsConfig }, [metricsConfig])
  useEffect(() => { runtimeRef.current = runtime }, [runtime])

  useEffect(() => {
    mockDataSource.save({ config, history, runtime })
  }, [config, history, runtime])

  // ===== Lectura en vivo desde Firebase (ESP32) =====
  useEffect(() => {
    if (config.dataMode !== 'live' || runtime.demoTank) return undefined
    let cancelled = false

    const sync = async () => {
      setLiveStatus((s) => ({ ...s, loading: true }))
      try {
        const result = await loadLiveFirebase({ config: configRef.current, prevVolume: runtimeRef.current.volume })
        if (cancelled) return
        setHistory(result.history)
        setRuntime((current) => ({ ...current, ...result.runtime }))
        setLiveStatus(result.liveStatus)
      } catch (error) {
        if (cancelled) return
        setRuntime((current) => ({ ...current, connected: false }))
        setLiveStatus({ loading: false, error: error.message || 'No se pudo leer Firebase', lastSync: Date.now(), latestTs: null })
      }
    }

    sync()
    const ms = Math.max(2000, (Number(config.livePollSeconds) || 5) * 1000)
    const timer = window.setInterval(sync, ms)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [config.dataMode, runtime.demoTank, config.livePollSeconds, liveTick])

  // ===== Motor de simulación local (solo en modo demo o con el recipiente demo) =====
  useEffect(() => {
    if ((config.dataMode === 'live' && !runtime.demoTank) || !runtime.isRunning || runtime.flowRate <= 0 || runtime.volume <= 0) return undefined
    const timer = window.setInterval(() => {
      const consumed = runtime.flowRate / 60 * runtime.speed
      setRuntime((current) => ({
        ...current,
        volume: clamp(current.volume - consumed, 0, capacity),
        consumedSession: current.consumedSession + consumed,
        continuousFlowSeconds: current.continuousFlowSeconds + current.speed,
        isRunning: current.volume - consumed > 0,
        lastUpdated: new Date().toISOString(),
      }))
      setHistory((records) => records.map((record, index) => index === records.length - 1 ? {
        ...record,
        consumption: record.consumption + consumed,
        minLevel: Math.min(record.minLevel ?? 100, percentage(Math.max(0, runtime.volume - consumed), capacity)),
        hourly: record.hourly.map((value, hour) => hour === new Date().getHours() ? value + consumed : value),
      } : record))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [config.dataMode, runtime.isRunning, runtime.flowRate, runtime.speed, runtime.volume, runtime.demoTank, capacity])

  const updateRuntime = useCallback((patch) => setRuntime((current) => ({ ...current, ...patch, lastUpdated: new Date().toISOString() })), [])

  const setLevelPercent = useCallback((percentValue) => {
    updateRuntime({ volume: capacity * clamp(Number(percentValue), 0, 100) / 100 })
  }, [capacity, updateRuntime])

  const setVolume = useCallback((liters) => updateRuntime({ volume: clamp(Number(liters), 0, capacity) }), [capacity, updateRuntime])

  const setFlowRate = useCallback((flowRate) => {
    const value = clamp(Number(flowRate), 0, config.maxFlowLpm)
    setRuntime((current) => ({ ...current, flowRate: value, continuousFlowSeconds: value === 0 ? 0 : current.continuousFlowSeconds, lastUpdated: new Date().toISOString() }))
  }, [config.maxFlowLpm])

  const setConfig = useCallback((patch) => setConfigState((current) => ({ ...current, ...patch })), [])

  const switchTank = useCallback((demoTank) => {
    setRuntime((current) => ({
      ...current,
      demoTank,
      isRunning: false,
      volume: demoTank ? config.demoInitialLiters : config.tankCapacityLiters * .784,
      consumedSession: 0,
      continuousFlowSeconds: 0,
      lastUpdated: new Date().toISOString(),
    }))
  }, [config.demoInitialLiters, config.tankCapacityLiters])

  const reset = useCallback(() => {
    const volume = runtime.demoTank ? config.demoInitialLiters : config.tankCapacityLiters * .784
    setRuntime((current) => ({ ...current, volume, flowRate: 0, isRunning: false, speed: 1, consumedSession: 0, continuousFlowSeconds: 0, connected: true, lastUpdated: new Date().toISOString() }))
  }, [config, runtime.demoTank])

  const resetAll = useCallback(() => {
    mockDataSource.clear()
    clearLiveCache()
    setConfigState(DEFAULT_CONFIG)
    setHistory(generateMockHistory())
    setRuntime({ volume: 7840, flowRate: 5.6, isRunning: false, speed: 1, connected: true, demoTank: false, consumedSession: 0, continuousFlowSeconds: 0, lastUpdated: new Date().toISOString() })
  }, [])

  const refreshLive = useCallback(() => setLiveTick((tick) => tick + 1), [])

  const value = useMemo(() => ({
    config, history, runtime, capacity, metrics, liveStatus,
    updateRuntime, setLevelPercent, setVolume, setFlowRate, setConfig, switchTank, reset, resetAll, refreshLive,
  }), [config, history, runtime, capacity, metrics, liveStatus, updateRuntime, setLevelPercent, setVolume, setFlowRate, setConfig, switchTank, reset, resetAll, refreshLive])

  return <CisternaContext.Provider value={value}>{children}</CisternaContext.Provider>
}

export function useCisterna() {
  const context = useContext(CisternaContext)
  if (!context) throw new Error('useCisterna debe utilizarse dentro de CisternaProvider')
  return context
}
