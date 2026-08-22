/**
 * dsh-valley-meter 的 Host 面 Typert 清单(由 typert-loader 自动扫描注册)。
 * 手写清单,结构与 @deepseek-ai/dsh-typert-generator 产物一致:
 * `./typert` 导出 TYPERT,invocations 的 codec 必须是 zod v4 实例。
 */

import { z } from 'zod'

const num = z.number()

// 峰谷相位
const peakSchema = z.object({
  inPeak: z.boolean(),
  prevAtMs: num,
  nextAtMs: num,
  nextIntoPeak: z.boolean(),
  windows: z.array(z.object({ start: num, end: num })).optional(),
})

// 余额
const balanceSchema = z.object({
  status: z.string(),
  total: num.nullable(),
  granted: num,
  topped: num,
  currency: z.string(),
  fetchedAt: num.nullable(),
  message: z.string(),
})

// 插件的显示配置(客户端可写)
const displayConfigSchema = z.object({
  position: z.string(),
  peakColor: z.string(),
  valleyColor: z.string(),
  symbol: z.string(),
  decimals: num,
  showBalanceTitle: z.boolean(),
  showTodayTitle: z.boolean(),
  style: z.string(),
  showPeriod: z.boolean(),
  showCountdown: z.boolean(),
})

// 完整状态
const stateSchema = z.object({
  now: num,
  dayKey: z.string(),
  peak: peakSchema.nullable(),
  balance: balanceSchema,
  todayCost: num.nullable(),
  todayCalls: num,
  config: displayConfigSchema,
})

// updateConfig 的 patch:允许部分字段,宽松处理
const patchSchema = z.object({
  position: z.string().optional(),
  peakColor: z.string().optional(),
  valleyColor: z.string().optional(),
  symbol: z.string().optional(),
  decimals: num.optional(),
  showBalanceTitle: z.boolean().optional(),
  showTodayTitle: z.boolean().optional(),
  style: z.string().optional(),
  showPeriod: z.boolean().optional(),
  showCountdown: z.boolean().optional(),
})

const _state$codec = { mode: 'strict', typeSymbol: 'dsh-valley-meter#State', schema: stateSchema }
const _patch$codec = { mode: 'strict', typeSymbol: 'dsh-valley-meter#ConfigPatch', schema: patchSchema }

export const TYPERT = {
  package: 'dsh-valley-meter',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: 'dsh-valley-meter#valleyMeter/getState',
      service: 'valleyMeter',
      namespace: 'valleyMeter',
      method: 'getState',
      invocation: { kind: 'direct' },
      parameters: [],
      result: _state$codec,
    },
    {
      id: 'dsh-valley-meter#valleyMeter/updateConfig',
      service: 'valleyMeter',
      namespace: 'valleyMeter',
      method: 'updateConfig',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'patch', wire: 'patch', source: 'json', codec: _patch$codec },
      ],
      result: _state$codec,
    },
    {
      id: 'dsh-valley-meter#valleyMeter/refreshBalance',
      service: 'valleyMeter',
      namespace: 'valleyMeter',
      method: 'refreshBalance',
      invocation: { kind: 'direct' },
      parameters: [],
      result: _state$codec,
    },
  ],
  model: {
    services: [
      {
        key: 'valleyMeter',
        exportName: 'valleyMeter',
        description: '波谷倒计时小组件:读取峰谷相位/倒计时、官方余额与今日费用的最小快照。Minimal peak/valley countdown widget service.',
        summary: '波谷倒计时小组件服务 (dsh-valley-meter widget service)。',
        tags: [],
        jsDoc: '/** 波谷倒计时小组件服务(ctx.valleyMeter)。dsh-valley-meter widget service (ctx.valleyMeter). */',
        members: [
          {
            kind: 'method',
            name: 'getState',
            signature: 'getState(): ValleyState',
            documentation: {
              description: '返回当前峰谷相位、倒计时、官方余额与今日费用的最小快照。Return the minimal peak/valley phase, countdown, official balance and today-spend snapshot.',
              summary: '读取当前峰谷相位与读数。Read the current peak/valley phase and readouts.',
              tags: [],
              jsDoc: '/**\n * 读取当前峰谷相位、倒计时、官方余额与今日费用。\n * @returns 最小快照。\n * Read the current peak/valley phase, countdown, official balance and today-spend.\n * @returns The minimal snapshot.\n */',
            },
          },
          {
            kind: 'method',
            name: 'updateConfig',
            signature: 'updateConfig(patch: ConfigPatch): ValleyState',
            documentation: {
              description: '合并写入显示配置(谷色、样式、极简开关等)并返回新快照。Merge a display-config patch and return the new snapshot.',
              summary: '更新显示配置并返回新快照。Update display config and return the new snapshot.',
              tags: [],
              jsDoc: '/**\n * 合并写入显示配置(谷色、样式、极简开关等)。\n * @param patch - 配置补丁。\n * @returns 更新后的新快照。\n * Merge a display-config patch (valley color, style, minimal toggles).\n * @param patch - The config patch.\n * @returns The updated snapshot.\n */',
            },
          },
          {
            kind: 'method',
            name: 'refreshBalance',
            signature: 'refreshBalance(): ValleyState',
            documentation: {
              description: '立即查询 DeepSeek 官方账户余额并返回新快照。Query the DeepSeek official account balance immediately and return the new snapshot.',
              summary: '立即刷新官方余额。Refresh the official balance immediately.',
              tags: [],
              jsDoc: '/**\n * 立即查询 DeepSeek 官方账户余额。\n * @returns 更新后的新快照。\n * Query the DeepSeek official account balance immediately.\n * @returns The updated snapshot.\n */',
            },
          },
        ],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
}

export default TYPERT
