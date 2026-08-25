// dsh-valley-meter — 波谷倒计时小组件(DeepSeek Harness)。
// 完全独立的功能插件:自己监听 llm/stream 计费、自己维护账本(storages/valley-meter/ledger.json)、
// 自己查 DeepSeek 官方余额(/user/balance),不依赖任何其它插件。
//
// 读数:峰谷实时倒计时与时段、官方账户余额、今日消耗。谷色可自定义,余额/今日花费可选
// 纯数字极简模式(隐藏标题),极简 ↔ 详细两套样式自由切换。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

export const name = 'valley-meter'
export const inject = ['credentials', 'settings']

// ── 路径(自包含) ────────────────────────────────────────────────────────
function dshHome() {
  const env = process.env.DSH_HOME
  if (typeof env === 'string' && env.trim().length > 0) return env.trim()
  return join(homedir(), '.dsh')
}
const CONFIG_DIR = () => join(dshHome(), 'storages', 'valley-meter')
const CONFIG_FILE = () => join(CONFIG_DIR(), 'config.json')
const LEDGER_FILE = () => join(CONFIG_DIR(), 'ledger.json')

// ── 内置默认(首次/缺失时) ───────────────────────────────────────────────
const DEFAULT_WINDOWS = [
  { start: 1, end: 4 },
  { start: 6, end: 10 },
]
const DEFAULT_PRICES = {
  'deepseek-v4-flash': { cacheHit: 0.007, cacheMiss: 0.22, output: 0.66, offPeak: { cacheHit: 0.007, cacheMiss: 0.22, output: 0.66 }, peak: { cacheHit: 0.014, cacheMiss: 0.44, output: 1.32 } },
  'deepseek-v4-pro': { cacheHit: 0.022, cacheMiss: 0.66, output: 1.98, offPeak: { cacheHit: 0.022, cacheMiss: 0.66, output: 1.98 }, peak: { cacheHit: 0.044, cacheMiss: 1.32, output: 3.96 } },
  'deepseek-chat': { cacheHit: 0.0028, cacheMiss: 0.14, output: 0.28, offPeak: { cacheHit: 0.0028, cacheMiss: 0.14, output: 0.28 }, peak: { cacheHit: 0.0028, cacheMiss: 0.14, output: 0.28 } },
  'default': { cacheHit: 0.007, cacheMiss: 0.22, output: 0.66 },
}
const DEFAULT_CONFIG = {
  position: 'footer', // 固定侧边栏底部(保留字段兼容旧配置)
  peakEnabled: true,
  peakWindows: DEFAULT_WINDOWS,
  effectiveAt: '',
  peakColor: '#CA6924',
  valleyColor: '#425066',
  colorPreset: 'amber',
  symbol: '¥',
  currency: 'CNY',
  decimals: 2,
  showBalanceTitle: true,
  showTodayTitle: true,
  style: 'minimal', // minimal(默认,极简) | card(详细)
  colorPreset: 'amber',
  showPeriod: false, // false=悬停时间轴时浮现,true=常驻
  showCountdown: false,
  apiKeyEnv: 'DEEPSEEK_API_KEY',
}

// ── 轻量 JSON 读写 ───────────────────────────────────────────────────────
function readJson(path, fallback) {
  try {
    const raw = readFileSync(path, 'utf8')
    if (!raw || !raw.trim()) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}
function writeJson(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}
function loadConfig() {
  const saved = readJson(CONFIG_FILE(), {})
  return { ...DEFAULT_CONFIG, ...saved }
}
function saveConfig(config) { writeJson(CONFIG_FILE(), config) }

function emptyDay(date) {
  return { date, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, calls: 0, cost: 0 }
}
function defaultLedger() {
  return { version: 1, days: {}, balance: { status: 'off', fetchedAt: 0, total: null, granted: 0, topped: 0, currency: 'CNY', message: '' } }
}
function loadLedger() {
  const loaded = readJson(LEDGER_FILE(), defaultLedger())
  return {
    version: 1,
    days: loaded?.days && typeof loaded.days === 'object' ? loaded.days : {},
    balance: { ...defaultLedger().balance, ...(loaded?.balance ?? {}) },
  }
}
function saveLedger(ledger) { writeJson(LEDGER_FILE(), ledger) }

function localDayKey(now) {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 峰谷相位与倒计时(UTC,半开区间 [start,end)) ─────────────────────────
function isPeakHour(atMs, effectiveAtMs, windows) {
  if (!Array.isArray(windows) || windows.length === 0) return false
  if (Number.isFinite(effectiveAtMs) && atMs < effectiveAtMs) return false
  const hour = new Date(atMs).getUTCHours()
  return windows.some(w => {
    const start = Number(w?.start)
    const end = Number(w?.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    if (start < end) return hour >= start && hour < end
    return hour >= start || hour < end
  })
}
function peakPhaseAt(atMs, windows) {
  if (!Array.isArray(windows) || windows.length === 0 || !Number.isFinite(atMs)) return null
  const hourAt = (dayOffset, hour) => {
    const date = new Date(atMs)
    date.setUTCDate(date.getUTCDate() + dayOffset)
    date.setUTCHours(hour, 0, 0, 0)
    return date.getTime()
  }
  const points = []
  for (let day = -1; day <= 1; day += 1) {
    for (const w of windows) {
      const start = Number(w?.start)
      const end = Number(w?.end)
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      points.push({ at: hourAt(day, start), intoPeak: true })
      points.push({ at: hourAt(end <= start ? day + 1 : day, end), intoPeak: false })
    }
  }
  const inPeak = isPeakHour(atMs, undefined, windows)
  let prev = null
  let next = null
  for (const p of points) {
    if (p.at <= atMs && (prev === null || p.at > prev.at)) prev = p
    if (p.at > atMs && (next === null || p.at < next.at)) next = p
  }
  if (prev === null || next === null) return null
  return { inPeak, prevAtMs: prev.at, nextAtMs: next.at, nextIntoPeak: next.intoPeak }
}
function calcPeak(config, now) {
  if (config.peakEnabled !== true) return null
  const windows = Array.isArray(config.peakWindows) && config.peakWindows.length > 0 ? config.peakWindows : DEFAULT_WINDOWS
  const effectiveAtMs = typeof config.effectiveAt === 'string' && config.effectiveAt.length > 0 ? Date.parse(config.effectiveAt) : 0
  if (Number.isFinite(effectiveAtMs) && effectiveAtMs > 0 && now < effectiveAtMs) {
    return { inPeak: false, nextIntoPeak: true, nextAtMs: effectiveAtMs, prevAtMs: now, windows }
  }
  const phase = peakPhaseAt(now, windows)
  if (phase === null) return null
  return { ...phase, windows }
}

// ── 计费:按模型价格 + 峰谷档位折算 cost(单位 1e6 token) ─────────────────
function priceEntryFor(modelId, prices) {
  const table = prices && typeof prices === 'object' ? prices : DEFAULT_PRICES
  const norm = s => String(s ?? '').toLowerCase().replace(/[\s._-]/g, '')
  const nId = norm(modelId)
  for (const key of Object.keys(table)) {
    if (key === 'default') continue
    if (norm(key) === nId || nId.includes(norm(key)) || norm(key).includes(nId)) return table[key] ?? null
  }
  return table.default ?? { cacheHit: 0.007, cacheMiss: 0.22, output: 0.66 }
}
function tierFor(entry, atMs, peak) {
  const e = entry ?? {}
  if (peak?.enabled === true && peak.inPeak) return e.peak ?? e
  return e.offPeak ?? e
}
function costOf(tokens, entry, atMs, peak) {
  const tier = tierFor(entry, atMs, peak)
  const input = Math.max(0, Number(tokens?.input) || 0)
  const output = Math.max(0, Number(tokens?.output) || 0)
  const cacheRead = Math.max(0, Number(tokens?.cacheRead) || 0)
  const cacheWrite = Math.max(0, Number(tokens?.cacheWrite) || 0)
  const reasoning = Math.max(0, Number(tokens?.reasoning) || 0)
  const reasoningPrice = typeof tier.reasoning === 'number' ? tier.reasoning : 0
  const cost = (input * (tier.cacheMiss ?? 0)
    + output * (tier.output ?? 0)
    + (cacheRead + cacheWrite) * (tier.cacheHit ?? 0)
    + reasoning * reasoningPrice) / 1_000_000
  return Math.max(0, cost)
}

// ── 官方余额查询(独立,凭据 + DeepSeek 官方端点) ─────────────────────────
function sanitizeBaseUrl(raw) {
  let base = String(raw ?? '').trim().replace(/\/+$/, '')
  if (base.length === 0) base = String(process.env.DEEPSEEK_BASE_URL ?? '').trim().replace(/\/+$/, '')
  if (base.length === 0) base = 'https://api.deepseek.com'
  if (/\/v\d+$/i.test(base)) base = base.replace(/\/v\d+$/i, '')
  try { const host = new URL(base).host.toLowerCase(); if (host !== 'api.deepseek.com') return null } catch { return null }
  return base
}
function pickBalanceInfo(infos) {
  if (!Array.isArray(infos)) return undefined
  const cny = infos.find(i => i?.currency === 'CNY')
  if (cny !== undefined) return cny
  let best = undefined
  for (const i of infos) {
    if (best === undefined) best = i
    else if (Number(i?.total_balance) > Number(best?.total_balance)) best = i
  }
  return best
}
async function queryBalance(ctx, apiKeyEnv) {
  let baseURL = null
  let envName = apiKeyEnv
  const settings = ctx.get('settings')
  try {
    const section = typeof settings?.get === 'function' ? settings.get('llm-deepseek') : undefined
    if (section?.baseURL !== undefined) baseURL = section.baseURL
    if (typeof section?.apiKeyEnv === 'string' && section.apiKeyEnv.length > 0) envName = section.apiKeyEnv
  } catch { /* 忽略设置读取错误 */ }

  let apiKey = null
  const credentials = ctx.get('credentials')
  if (credentials !== undefined && typeof credentials.resolve === 'function') {
    // resolve(ref) 的 ref 是字符串(如 'DEEPSEEK_API_KEY'),返回 { value, source } 或 undefined。
    try {
      const hit = await credentials.resolve(envName)
      if (hit && hit.value !== undefined && String(hit.value).length > 0) apiKey = String(hit.value)
    } catch { /* 回退到环境变量 */ }
    if (apiKey === null) {
      try {
        const hit2 = await credentials.resolve({ type: 'env', name: envName })
        if (hit2 && hit2.value !== undefined && String(hit2.value).length > 0) apiKey = String(hit2.value)
      } catch { /* 回退到环境变量 */ }
    }
  }
  if (apiKey === null && typeof process.env[envName] === 'string') apiKey = process.env[envName]
  if (apiKey === null || apiKey.length === 0) {
    return { status: 'off', total: null, granted: 0, topped: 0, currency: 'CNY', fetchedAt: Date.now(), message: `未配置密钥 ${envName}` }
  }
  const endpoint = sanitizeBaseUrl(baseURL)
  if (endpoint === null) return { status: 'error', total: null, granted: 0, topped: 0, currency: 'CNY', fetchedAt: Date.now(), message: '仅支持 DeepSeek 官方端点' }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    let response
    try {
      response = await fetch(`${endpoint}/user/balance`, {
        headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    if (!response.ok) return { status: 'error', total: null, granted: 0, topped: 0, currency: 'CNY', fetchedAt: Date.now(), message: `HTTP ${response.status}` }
    const data = await response.json()
    const info = pickBalanceInfo(data?.balance_infos)
    if (info === undefined) return { status: 'error', total: null, granted: 0, topped: 0, currency: 'CNY', fetchedAt: Date.now(), message: '未解析到余额信息' }
    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
    return {
      status: 'ok',
      total: num(info.total_balance),
      granted: num(info.granted_balance),
      topped: num(info.topped_up_balance),
      currency: typeof info.currency === 'string' ? info.currency : 'CNY',
      fetchedAt: Date.now(),
    }
  } catch (e) {
    return { status: 'error', total: null, granted: 0, topped: 0, currency: 'CNY', fetchedAt: Date.now(), message: String(e?.message ?? e) }
  }
}

// ── 状态快照 ─────────────────────────────────────────────────────────────
function buildState(config, ledger) {
  const now = Date.now()
  const dayKey = localDayKey(now)
  const today = ledger.days?.[dayKey] ?? emptyDay(dayKey)
  const peak = calcPeak(config, now)
  const bal = ledger.balance ?? {}
  const balance = {
    status: bal.status ?? 'off',
    total: bal.status === 'ok' ? bal.total : null,
    granted: bal.status === 'ok' ? bal.granted : 0,
    topped: bal.status === 'ok' ? bal.topped : 0,
    currency: config.symbol ?? '¥',
    fetchedAt: bal.fetchedAt ?? null,
    message: bal.message ?? '',
  }
  // 今日各 UTC 小时消耗(24 格,供时间轴方块使用)。
  const byHour = today.byHour ?? {}
  const todayHours = Array.from({ length: 24 }, (_, h) => {
    const v = Number(byHour[String(h)] ?? byHour[h] ?? 0)
    return Number.isFinite(v) && v > 0 ? v : 0
  })
  return {
    now,
    dayKey,
    peak,
    balance,
    todayCost: today.cost,
    todayCalls: today.calls,
    todayHours,
    config: {
      position: config.position,
      peakColor: config.peakColor,
      valleyColor: config.valleyColor,
      colorPreset: config.colorPreset,
      symbol: config.symbol,
      decimals: config.decimals,
      showBalanceTitle: config.showBalanceTitle,
      showTodayTitle: config.showTodayTitle,
      style: config.style,
      showPeriod: config.showPeriod,
      showCountdown: config.showCountdown,
    },
  }
}

// ── 服务对象(客户端经 remote.valleyMeter.* 调用) ────────────────────────
// 必须继承 TypertRemoteService:网关靠服务实例上的 typertRemote 绑定做发现。
class ValleyMeterService extends TypertRemoteService {
  #ctxRef

  constructor(ctx) {
    super(ctx, 'valleyMeter')
    this.#ctxRef = ctx
    this.config = loadConfig()
    this.ledger = loadLedger()
  }

  async getState() {
    return buildState(this.config, this.ledger)
  }

  async updateConfig(patch) {
    if (patch !== null && typeof patch === 'object' && !Array.isArray(patch)) {
      this.config = { ...this.config, ...patch }
      saveConfig(this.config)
    }
    return buildState(this.config, this.ledger)
  }

  async refreshBalance() {
    return this.refreshBalanceInner(true)
  }

  async refreshBalanceInner(force = false) {
    const stale = Date.now() - (this.ledger.balance?.fetchedAt ?? 0) > 60_000
    if (!force && !stale) return buildState(this.config, this.ledger)
    const result = await queryBalance(this.#ctxRef, this.config.apiKeyEnv ?? 'DEEPSEEK_API_KEY')
    this.ledger = { ...this.ledger, balance: result }
    saveLedger(this.ledger)
    return buildState(this.config, this.ledger)
  }

  account(tokens, modelId, sessionId, atMs, provider) {
    const config = this.config
    const ledger = this.ledger
    const normalizedPrices = { ...DEFAULT_PRICES, ...(config.prices ?? {}) }
    const resolved = priceEntryFor(modelId, normalizedPrices)
    const effMs = typeof config.effectiveAt === 'string' && config.effectiveAt.length > 0 ? Date.parse(config.effectiveAt) : undefined
    const peak = { enabled: config.peakEnabled === true, inPeak: isPeakHour(atMs, effMs, config.peakWindows ?? DEFAULT_WINDOWS) }
    const cost = costOf(tokens, resolved, atMs, peak)
    const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0 }
    const buckets = { input: num(tokens?.input), output: num(tokens?.output), cacheRead: num(tokens?.cacheRead), cacheWrite: num(tokens?.cacheWrite), reasoning: num(tokens?.reasoning) }
    const date = localDayKey(atMs)
    let day = ledger.days?.[date]
    if (!day || typeof day !== 'object') { day = emptyDay(date); ledger.days = { ...(ledger.days ?? {}), [date]: day } }
    day.input += buckets.input; day.output += buckets.output
    day.cacheRead += buckets.cacheRead; day.cacheWrite += buckets.cacheWrite
    day.reasoning += buckets.reasoning; day.calls += 1; day.cost += cost
    // 按 UTC 小时记账(时间轴方块数据源)。
    const hourKey = String(new Date(atMs).getUTCHours())
    day.byHour = day.byHour ?? {}
    day.byHour[hourKey] = (Number(day.byHour[hourKey]) || 0) + cost
    const providerKey = `${typeof provider === 'string' && provider.length > 0 ? provider : 'deepseek'}:${String(modelId ?? 'default')}`
    day.byProviderModel = day.byProviderModel ?? {}
    const pk = day.byProviderModel[providerKey] ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, calls: 0, cost: 0 }
    day.byProviderModel[providerKey] = { input: pk.input + buckets.input, output: pk.output + buckets.output, cacheRead: pk.cacheRead + buckets.cacheRead, cacheWrite: pk.cacheWrite + buckets.cacheWrite, reasoning: pk.reasoning + buckets.reasoning, calls: pk.calls + 1, cost: pk.cost + cost }
    saveLedger(ledger)
    return cost
  }
}

// 供 cordis 校验插件配置用的 schema(插件自身配置存 JSON 文件,此处声明空对象)。
export const Config = null

export function apply(ctx) {
  const service = new ValleyMeterService(ctx)

  // 自己监听 llm/stream:在写入前捕获 usage 块,按官方价格计入自己的账本。
  ctx.on('llm/stream', (options, next) => {
    const downstream = next()
    return (async function* valleyMeterStream() {
      let usage = null
      try {
        for await (const chunk of downstream) {
          if (chunk !== null && chunk !== undefined && chunk.type === 'usage' && chunk.usage !== undefined) {
            usage = chunk.usage
          }
          yield chunk
        }
      } finally {
        if (usage !== null) {
          try {
            service.account({
              input: usage.inputTokens ?? 0,
              output: usage.outputTokens ?? 0,
              cacheRead: usage.cacheReadTokens ?? 0,
              cacheWrite: usage.cacheWriteTokens ?? 0,
              reasoning: usage.reasoningTokens ?? 0,
            }, options?.model, options?.sessionId, Date.now(), options?.provider)
          } catch (error) {
            ctx.logger?.warn?.(`[dsh-valley-meter] 计费失败: ${String(error)}`)
          }
        }
      }
    })()
  })

  // 启动后延迟拉一次余额(不阻塞)。
  try {
    const timer = setTimeout(() => { void service.refreshBalanceInner(false).catch(() => {}) }, 2000)
    if (typeof timer.unref === 'function') timer.unref()
  } catch { /* 忽略 */ }
}
