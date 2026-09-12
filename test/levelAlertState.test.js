import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceLevelAlertState } from '../src/services/levelAlertState.js'

const config = { lowLevelThreshold: 25, criticalLevelThreshold: 12 }

test('avisa una sola vez mientras el nivel permanece bajo', () => {
  let state = {}
  let next = advanceLevelAlertState(24, config, state)
  assert.equal(next.alert, 'low')
  state = next.state

  next = advanceLevelAlertState(20, config, state)
  assert.equal(next.alert, null)
})

test('escala de bajo a crítico una sola vez', () => {
  const low = advanceLevelAlertState(24, config, {})
  const critical = advanceLevelAlertState(10, config, low.state)
  const stillCritical = advanceLevelAlertState(8, config, critical.state)

  assert.equal(low.alert, 'low')
  assert.equal(critical.alert, 'critical')
  assert.equal(stillCritical.alert, null)
})

test('solo rearma las alertas cuando el nivel supera el umbral bajo', () => {
  const critical = advanceLevelAlertState(10, config, {})
  const stillLow = advanceLevelAlertState(20, config, critical.state)
  const recovered = advanceLevelAlertState(26, config, stillLow.state)
  const lowAgain = advanceLevelAlertState(24, config, recovered.state)

  assert.equal(stillLow.alert, null)
  assert.equal(recovered.recovered, true)
  assert.equal(lowAgain.alert, 'low')
})
