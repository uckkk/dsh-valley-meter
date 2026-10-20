/**
 * dsh-valley-meter 的 Host 面 Typert 清单(由 typert-loader 自动扫描注册)。
 *
 * DSH 0.2 起,TYPERT 清单的 invocation 描述必须带严格 codec,且每个 codec 都要有
 * `create()` 工厂(返回 zod schema)。这里用 `createTypertRemoteInfo()` 组装,
 * 与官方 `dsh-typert-generator` 的产物结构一致:
 *   TYPERT.invocations === $remote.descriptors   (lazy getter)
 *
 * 兼容版本:@deepseek-ai/dsh-typert-protocol >= 0.2.1-rc.2
 */

import { z } from 'zod'
import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol'

const num = z.number()

// ── 数据形状 ─────────────────────────────────────────────────────────────
// 峰谷相位
const peakSchema = z.object({
  inPeak: z.boolean(),
  prevAtMs: num,
  nextAtMs: num,
  nextIntoPeak: z.boolean(),
  windows: z.array(z.object({ start: num, end: num })).optional(),
  // 周末全天低谷(官方 2026-08-23 起):为 true 时窗口内也不计峰时。
  offPeakAllDay: z.boolean().optional(),
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
  colorPreset: z.string().optional(),
  weekendOffPeak: z.boolean(),
  balanceRefreshSec: num.optional(),
})

// 完整状态
const stateSchema = z.object({
  now: num,
  dayKey: z.string(),
  peak: peakSchema.nullable(),
  balance: balanceSchema,
  todayCost: num.nullable(),
  todayCalls: num,
  todayHours: z.array(num),
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
  colorPreset: z.string().optional(),
  weekendOffPeak: z.boolean().optional(),
  balanceRefreshSec: num.optional(),
})

// 同一个 schema 实例可以复用;create() 只要求返回带 parse() 的对象。
const strictCodec = (typeSymbol, schema) => ({
  mode: 'strict',
  typeSymbol,
  create: () => schema,
})

const stateCodec = strictCodec('dsh-valley-meter#State', stateSchema)
const patchCodec = strictCodec('dsh-valley-meter#ConfigPatch', patchSchema)

const $remote = createTypertRemoteInfo({
  package: 'dsh-valley-meter',
  methods: {
    'valleyMeter/getState': {
      service: 'valleyMeter',
      description: '返回当前峰谷相位、倒计时、官方余额与今日费用的最小快照。',
      invocation: { kind: 'direct' },
      parameters: [],
      result: stateCodec,
    },
    'valleyMeter/updateConfig': {
      service: 'valleyMeter',
      description: '合并写入显示配置(谷色、样式、极简开关等)并返回新快照。',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'patch', wire: 'patch', source: 'json', codec: patchCodec },
      ],
      result: stateCodec,
    },
    'valleyMeter/refreshBalance': {
      service: 'valleyMeter',
      description: '立即查询 DeepSeek 官方账户余额并返回新快照。',
      invocation: { kind: 'direct' },
      parameters: [],
      result: stateCodec,
    },
  },
}, z)

export const TYPERT = {
  package: 'dsh-valley-meter',
  face: 'host',
  schemas: [],
  get invocations() { return $remote.descriptors },
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
