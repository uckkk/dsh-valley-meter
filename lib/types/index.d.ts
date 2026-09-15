export interface PeakPhase {
  inPeak: boolean
  prevAtMs: number
  nextAtMs: number
  nextIntoPeak: boolean
  windows?: Array<{ start: number; end: number }>
  /** 周末全天低谷(官方 2026-08-23 起):为 true 时整日按低谷价,时间轴不画峰段。 */
  offPeakAllDay?: boolean
}

export interface Balance {
  total: number | null
  granted: number
  topped: number
  currency: string
  at: number | null
}

export interface ValleyConfig {
  position: string
  peakColor: string
  valleyColor: string
  symbol: string
  decimals: number
  showBalanceTitle: boolean
  showTodayTitle: boolean
  style: string
  showPeriod: boolean
  showCountdown: boolean
  /** 是否应用「周六周日全天低谷」规则(默认 true)。 */
  weekendOffPeak: boolean
}

export interface ValleyState {
  now: number
  dayKey: string
  peak: PeakPhase | null
  balance: Balance
  todayCost: number | null
  config: ValleyConfig
  sourcePresent: boolean
}

export type ConfigPatch = Partial<ValleyConfig>

export const name: string
export const inject: string[]
export function apply(ctx: unknown, config?: Record<string, unknown>): void
