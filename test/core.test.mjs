import { test } from 'node:test'
import assert from 'node:assert/strict'
import { __internals } from '../lib/index.js'

const {
  DEFAULT_CONFIG,
  calcPeak,
  costOf,
  priceEntryFor,
  weekendOffPeakAt,
  WEEKEND_OFFPEAK_FROM_MS,
} = __internals

const config = { ...DEFAULT_CONFIG, peakEnabled: true }

test('weekdays keep the official peak windows (Beijing 09:00-12:00, 14:00-18:00)', () => {
  // 2026-08-25 is a Tuesday. 10:00 Beijing = 02:00 UTC, inside the 01-04 window.
  const now = Date.parse('2026-08-25T10:00:00+08:00')
  const peak = calcPeak(config, now)
  assert.equal(peak.inPeak, true)
  assert.equal(peak.offPeakAllDay, false)
  assert.equal(peak.nextIntoPeak, false)
  assert.equal(peak.nextAtMs, Date.parse('2026-08-25T12:00:00+08:00'))
  assert.equal(peak.prevAtMs, Date.parse('2026-08-25T09:00:00+08:00'))
})

test('weekends are all off-peak after the official 2026-08-23 rule', () => {
  // 2026-08-29 is a Saturday. The next peak is Monday 09:00 Beijing.
  const now = Date.parse('2026-08-29T10:00:00+08:00')
  const peak = calcPeak(config, now)
  assert.equal(peak.inPeak, false)
  assert.equal(peak.offPeakAllDay, true)
  assert.equal(peak.nextIntoPeak, true)
  assert.equal(peak.nextAtMs, Date.parse('2026-08-31T09:00:00+08:00'))
  assert.equal(peak.prevAtMs, Date.parse('2026-08-28T18:00:00+08:00'))
})

test('the weekend rule does not apply before it takes effect', () => {
  const before = WEEKEND_OFFPEAK_FROM_MS - 1
  assert.equal(weekendOffPeakAt(config, before), false)
  const after = WEEKEND_OFFPEAK_FROM_MS
  assert.equal(weekendOffPeakAt(config, after), true)
})

test('the weekend rule can be turned off', () => {
  const now = Date.parse('2026-08-29T10:00:00+08:00')
  const peak = calcPeak({ ...config, weekendOffPeak: false }, now)
  assert.equal(peak.offPeakAllDay, false)
  assert.equal(peak.inPeak, true)
})

test('peak pricing doubles the off-peak flash rate', () => {
  const entry = priceEntryFor('deepseek-flash', undefined)
  const at = Date.parse('2026-08-25T10:00:00+08:00')
  const offPeak = costOf({ input: 1_000_000 }, entry, at, { enabled: true, inPeak: false })
  const peak = costOf({ input: 1_000_000 }, entry, at, { enabled: true, inPeak: true })
  assert.equal(offPeak, 0.22)
  assert.equal(peak, 0.44)
})

test('unknown models fall back to the default price entry', () => {
  const entry = priceEntryFor('some-unknown-model', undefined)
  assert.equal(entry.cacheMiss, 0.22)
})
