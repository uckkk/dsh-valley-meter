import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('manifest declares the DSH 0.2 bundle, web client, and typert face', () => {
  assert.equal(pkg.name, 'dsh-valley-meter')
  assert.equal(pkg.engines.dsh, '>=0.2.0-rc.1')
  assert.equal(pkg.dsh.manifestVersion, 1)
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.exports['.'].default, './lib/index.js')
  assert.equal(pkg.exports['./client'].default, './lib/client.js')
  assert.equal(pkg.exports['./typert'].default, './lib/typert.host.js')
  assert.equal(pkg.dependencies['@deepseek-ai/dsh-typert-protocol'], '0.2.1-rc.2')
})

test('TYPERT manifest carries strict codecs with create() factories', async () => {
  const { TYPERT } = await import('../lib/typert.host.js')
  assert.equal(TYPERT.package, 'dsh-valley-meter')
  assert.equal(TYPERT.face, 'host')
  assert.equal(TYPERT.invocations.length, 3)
  const endpoints = TYPERT.invocations.map((entry) => `${entry.namespace}/${entry.method}`)
  assert.deepEqual(endpoints.sort(), ['valleyMeter/getState', 'valleyMeter/refreshBalance', 'valleyMeter/updateConfig'])
  for (const invocation of TYPERT.invocations) {
    assert.equal(invocation.result.mode, 'strict')
    assert.equal(typeof invocation.result.create, 'function')
    assert.equal(typeof invocation.result.create().parse, 'function')
    for (const parameter of invocation.parameters) {
      assert.equal(parameter.codec.mode, 'strict')
      assert.equal(typeof parameter.codec.create, 'function')
    }
  }
})

test('state codec accepts the client-facing snapshot shape', async () => {
  const { TYPERT } = await import('../lib/typert.host.js')
  const state = TYPERT.invocations.find((entry) => entry.method === 'getState')
  const snapshot = {
    now: 1_790_000_000_000,
    dayKey: '2026-09-01',
    peak: {
      inPeak: false,
      prevAtMs: 1_789_999_000_000,
      nextAtMs: 1_790_001_000_000,
      nextIntoPeak: true,
      windows: [{ start: 1, end: 4 }],
      offPeakAllDay: false,
    },
    balance: {
      status: 'ok',
      total: 12.34,
      granted: 0,
      topped: 12.34,
      currency: '¥',
      fetchedAt: 1_789_999_500_000,
      message: '',
    },
    todayCost: 0.42,
    todayCalls: 7,
    todayHours: Array.from({ length: 24 }, () => 0),
    config: {
      position: 'footer',
      peakColor: '#CA6924',
      valleyColor: '#425066',
      symbol: '¥',
      decimals: 2,
      showBalanceTitle: true,
      showTodayTitle: true,
      style: 'minimal',
      showPeriod: false,
      showCountdown: false,
      colorPreset: 'amber',
      weekendOffPeak: true,
      balanceRefreshSec: 5,
    },
  }
  assert.deepEqual(state.result.create().parse(snapshot), snapshot)
})

test('config patch codec accepts a partial patch', async () => {
  const { TYPERT } = await import('../lib/typert.host.js')
  const update = TYPERT.invocations.find((entry) => entry.method === 'updateConfig')
  const codec = update.parameters[0].codec
  assert.deepEqual(codec.create().parse({ valleyColor: '#123456', balanceRefreshSec: 10 }), {
    valleyColor: '#123456',
    balanceRefreshSec: 10,
  })
})
