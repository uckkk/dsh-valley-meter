export interface PeakPhase {
  inPeak: boolean
  prevAtMs: number
  nextAtMs: number
  nextIntoPeak: boolean
  windows?: Array<{ start: number; end: number }>
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
