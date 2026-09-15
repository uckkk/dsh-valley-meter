// dsh-valley-meter — 峰谷电表(DeepSeek Harness):波谷倒计时、余额与今日消耗。
// 完全独立的功能插件:自己监听 llm/stream 计费、自己维护账本(storages/valley-meter/ledger.json)、
// 自己查 DeepSeek 官方余额(/user/balance),不依赖任何其它插件。
//
// 读数:峰谷实时倒计时与时段、官方账户余额、今日消耗。谷色可自定义,余额/今日花费可选
// 纯数字极简模式(隐藏标题),极简 ↔ 详细两套样式自由切换。
//
// 计费规则(官方,2026-08-23 00:00 北京时间起):工作日高峰 = 北京时间 9:00-12:00、
// 14:00-18:00,低谷价为高峰价的一半;周六、周日全天不再区分峰谷,统一按低谷价计费。
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
  { start: 1, end: 4 }, // UTC 01:00-04:00 = 北京时间 09:00-12:00(工作日高峰)
  { start: 6, end: 10 }, // UTC 06:00-10:00 = 北京时间 14:00-18:00(工作日高峰)
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
  weekendOffPeak: true, // 官方 2026-08-23 起:周六/周日全天按低谷价(见 WEEKEND_OFFPEAK_FROM_MS)
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
  balanceRefreshSec: 5, // 余额自动刷新周期(秒):getState 过期即拉官方余额,越小越实时(最低 5,避免官方接口限流)
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

// ── 周末全天低谷(官方规则,2026-08-23 00:00 北京时间起) ─────────────────
// 官方公告:工作日高峰 = 北京时间 9:00-12:00、14:00-18:00,低谷价为高峰价的一半;
// 周六、周日全天不再区分峰谷时段,统一按低谷时段价格计费(生效前的费用按原标准)。
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000
const WEEKEND_OFFPEAK_FROM_MS = Date.parse('2026-08-23T00:00:00+08:00')
// 北京时间星期几(0=周日,6=周六):平移到东八区后取 UTC 星期。
function isBeijingWeekend(atMs) {
  const day = new Date(atMs + BEIJING_OFFSET_MS).getUTCDay()
  return day === 0 || day === 6
}
// 该时刻所在「北京日」的 00:00 时间戳。
function beijingDayStart(atMs) {
  return Math.floor((atMs + BEIJING_OFFSET_MS) / 86400000) * 86400000 - BEIJING_OFFSET_MS
}
// [fromMs, toMs] 内第一个北京周末 00:00(峰段被周末截断时的落点)。
function firstWeekendStartIn(fromMs, toMs) {
  let cursor = beijingDayStart(fromMs)
  while (cursor <= toMs) {
    if (cursor >= WEEKEND_OFFPEAK_FROM_MS && isBeijingWeekend(cursor)) return cursor
    cursor += 86400000
  }
  return null
}
// 该时刻是否适用「周末全天低谷」:开关开启 + 已过规则生效时间 + 落在北京周末。
function weekendOffPeakAt(config, atMs) {
  if (config?.weekendOffPeak !== true || !Number.isFinite(atMs)) return false
  if (atMs < WEEKEND_OFFPEAK_FROM_MS) return false
  return isBeijingWeekend(atMs)
}

// ── 峰谷相位与倒计时(UTC,半开区间 [start,end)) ─────────────────────────
function isPeakHour(atMs, effectiveAtMs, windows, offPeakAllDay) {
  if (!Array.isArray(windows) || windows.length === 0) return false
  if (Number.isFinite(effectiveAtMs) && atMs < effectiveAtMs) return false
  if (offPeakAllDay === true) return false // 周末全天低谷:任何窗口都不算峰时
  const hour = new Date(atMs).getUTCHours()
  return windows.some(w => {
    const start = Number(w?.start)
    const end = Number(w?.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    if (start < end) return hour >= start && hour < end
    return hour >= start || hour < end
  })
}
function peakPhaseAt(atMs, windows, config) {
  if (!Array.isArray(windows) || windows.length === 0 || !Number.isFinite(atMs)) return null
  const hourAt = (dayOffset, hour) => {
    const date = new Date(atMs)
    date.setUTCDate(date.getUTCDate() + dayOffset)
    date.setUTCHours(hour, 0, 0, 0)
    return date.getTime()
  }
  // 周末判定按「每个候选时刻」算,不能按 now:周五晚上查询时,周末那两天的窗口同样要剔除。
  const weekendAt = (t) => weekendOffPeakAt(config, t)
  const periods = []
  // 扫描 ±4 天:周末整段跳过时,最近的峰时切换点(周五 18:00 → 周一 9:00)有 63 小时,
  // 只扫 ±1 天会取不到 next,倒计时会直接消失。
  for (let day = -4; day <= 5; day += 1) {
    for (const w of windows) {
      const start = Number(w?.start)
      const end = Number(w?.end)
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      const fromAt = hourAt(day, start)
      // 峰段起点就落在周末 → 该段整体不成立(周末全天低谷),没有切换点。
      if (weekendAt(fromAt)) continue
      let toAt = hourAt(end <= start ? day + 1 : day, end)
      // 跨午夜的长峰段尾部撞上周末 → 在周末 00:00 处截断(此后已是低谷)。
      if (weekendAt(toAt)) {
        const stopAt = firstWeekendStartIn(fromAt, toAt)
        if (stopAt !== null) toAt = stopAt
      }
      periods.push({ fromAt, toAt })
    }
  }
  const inPeak = isPeakHour(atMs, undefined, windows, weekendAt(atMs))
  // 起点=进峰、终点=进谷,两侧都要参与 prev/next 的比较;只取一侧会算出错误的下个切换点。
  let prev = null
  let next = null
  for (const p of periods) {
    if (p.fromAt <= atMs && (prev === null || p.fromAt > prev.at)) prev = { at: p.fromAt, intoPeak: true }
    if (p.toAt <= atMs && (prev === null || p.toAt > prev.at)) prev = { at: p.toAt, intoPeak: false }
    if (p.fromAt > atMs && (next === null || p.fromAt < next.at)) next = { at: p.fromAt, intoPeak: true }
    if (p.toAt > atMs && (next === null || p.toAt < next.at)) next = { at: p.toAt, intoPeak: false }
  }
  if (prev === null || next === null) return null
  return { inPeak, prevAtMs: prev.at, nextAtMs: next.at, nextIntoPeak: next.intoPeak }
}
function calcPeak(config, now) {
  if (config.peakEnabled !== true) return null
  const windows = Array.isArray(config.peakWindows) && config.peakWindows.length > 0 ? config.peakWindows : DEFAULT_WINDOWS
  const effectiveAtMs = typeof config.effectiveAt === 'string' && config.effectiveAt.length > 0 ? Date.parse(config.effectiveAt) : 0
  const offPeakAllDay = weekendOffPeakAt(config, now)
  if (Number.isFinite(effectiveAtMs) && effectiveAtMs > 0 && now < effectiveAtMs) {
    return { inPeak: false, nextIntoPeak: true, nextAtMs: effectiveAtMs, prevAtMs: now, windows, offPeakAllDay }
  }
  const phase = peakPhaseAt(now, windows, config)
  if (phase === null) return null
  return { ...phase, windows, offPeakAllDay }
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
      weekendOffPeak: config.weekendOffPeak !== false,
      balanceRefreshSec: Number(config.balanceRefreshSec) || 5,
    },
  }
}

// ── 服务对象(客户端经 remote.valleyMeter.* 调用) ────────────────────────
// 必须继承 TypertRemoteService:网关靠服务实例上的 typertRemote 绑定做发现。
// 注意:服务实例会被 cordis 以 Proxy 包裹,私有字段(#)经代理不可访问,
// 所以这里用普通属性(_ctxRef/_balanceInFlight)而非私有字段。
class ValleyMeterService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'valleyMeter')
    this._ctxRef = ctx
    this._balanceInFlight = null
    this.config = loadConfig()
    this.ledger = loadLedger()
  }

  async getState() {
    // 余额已过期时主动拉取一次,让客户端轮询 getState 就能带出最新余额(实时)。
    const refreshSec = Math.max(5, Number(this.config.balanceRefreshSec) || 5)
    const stale = Date.now() - (this.ledger.balance?.fetchedAt ?? 0) > refreshSec * 1000
    if (stale) await this.refreshBalanceInner(false)
    return buildState(this.config, this.ledger)
  }

  async updateConfig(patch) {
    if (patch !== null && typeof patch === 'object' && !Array.isArray(patch)) {
      this.config = { ...this.config, ...patch }
      saveConfig(this.config)
      // 用户改了余额刷新周期 / API Key,立即以新配置刷新一次余额。
      void this.refreshBalanceInner(true).catch(() => {})
    }
    return buildState(this.config, this.ledger)
  }

  async refreshBalance() {
    return this.refreshBalanceInner(true)
  }

  // 拉取官方余额:带防重入(并发调用共享同一次请求)与可选强制。
  async refreshBalanceInner(force = false) {
    const refreshSec = Math.max(5, Number(this.config.balanceRefreshSec) || 5)
    const stale = Date.now() - (this.ledger.balance?.fetchedAt ?? 0) > refreshSec * 1000
    if ((!force && !stale) || this._balanceInFlight !== null) return buildState(this.config, this.ledger)
    this._balanceInFlight = queryBalance(this._ctxRef, this.config.apiKeyEnv ?? 'DEEPSEEK_API_KEY')
      .then(result => {
        this.ledger = { ...this.ledger, balance: result }
        saveLedger(this.ledger)
        return result
      })
      .finally(() => { this._balanceInFlight = null })
    await this._balanceInFlight
    return buildState(this.config, this.ledger)
  }

  account(tokens, modelId, sessionId, atMs, provider) {
    const config = this.config
    const ledger = this.ledger
    const normalizedPrices = { ...DEFAULT_PRICES, ...(config.prices ?? {}) }
    const resolved = priceEntryFor(modelId, normalizedPrices)
    const effMs = typeof config.effectiveAt === 'string' && config.effectiveAt.length > 0 ? Date.parse(config.effectiveAt) : undefined
    // 按调用时刻判档:周末全天低谷时一律走 offPeak(不再按高峰价多算)。
    const peak = { enabled: config.peakEnabled === true, inPeak: isPeakHour(atMs, effMs, config.peakWindows ?? DEFAULT_WINDOWS, weekendOffPeakAt(config, atMs)) }
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

  // 启动后延迟拉一次余额(不阻塞),随后按 balanceRefreshSec 周期自动刷新,保证余额实时。
  try {
    const refreshSec = Math.max(5, Number(service.config?.balanceRefreshSec) || 5)
    const kick = setTimeout(() => { void service.refreshBalanceInner(false).catch(() => {}) }, 2000)
    if (typeof kick.unref === 'function') kick.unref()
    const loop = setInterval(() => { void service.refreshBalanceInner(false).catch(() => {}) }, refreshSec * 1000)
    if (typeof loop.unref === 'function') loop.unref()
    ctx.effect(() => () => { clearTimeout(kick); clearInterval(loop) }, 'valley-meter: balance poll')
  } catch { /* 忽略 */ }
}
