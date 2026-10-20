/**
 * dsh-valley-meter 浏览器端 bundle(单文件,经 __ModuleLoader__ 加载)。
 *
 * 提供一个极简卡片:
 *   - conversation.composer.dock / sidebar.footer.action:波谷倒计时小组件
 *   - settings.section「峰谷小组件」:谷色/样式/极简开关等配置
 *
 * 数据通道:
 *   - remote.valleyMeter.getState() / updateConfig(patch) → 峰谷相位、余额、今日费用、配置。
 * 样式用 --dsw-* 主题变量并支持自定义谷色 / 峰色。
 */

window.__ModuleLoader__.load({
  id: 'dsh-valley-meter',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    // ── 语言文案 ─────────────────────────────────────────────────────────
    const MESSAGES = {
      zh: {
        sectionLabel: '峰谷电表',
        peak: '峰时',
        valley: '谷时',
        weekendValley: '周末低谷',
        weekendTip: '周六、周日全天按低谷价计费(官方 2026-08-23 起)',
        weekendOffPeak: '周末全天低谷',
        balance: '账户余额',
        today: '今天花费',
        dockTitle: '波谷小组件',
        settings: '设置',
        back: '返回',
        topUpTip: '点击打开 DeepSeek 充值页面',
        topUpLabel: '充值',
        countdownTo: (label) => `距${label}${' '}`,
        toPeak: '进入峰时',
        toValley: '进入谷时',
        cdAfterPeak: '后进入峰时',
        cdAfterValley: '后进入谷时',
        showBalanceTitle: '余额显示标题',
        showTodayTitle: '今日花费显示标题',
        valleyColor: '谷时颜色',
        peakColor: '峰时颜色',
        style: '样式',
        styleCard: '详细卡片',
        styleMinimal: '极简',
        showPeriod: '显示时段徽标',
        showCountdown: '显示倒计时',
        position: '显示位置',
        positionDock: '输入框下方',
        positionFooter: '侧边栏底部',
        positionOff: '关闭',
        hint: '提示',
        priceNote: '峰谷时段与价格档位内置于插件,余额来自 DeepSeek 官方接口。',
        noData: '暂无数据',
        refresh: '已加载',
      },
      en: {
        sectionLabel: 'Peak-Valley Meter',
        peak: 'Peak',
        valley: 'Valley',
        weekendValley: 'Weekend off-peak',
        weekendTip: 'Sat & Sun are billed at the off-peak rate all day (official rule, since 2026-08-23)',
        weekendOffPeak: 'Weekend all off-peak',
        balance: 'Balance',
        today: 'Today',
        dockTitle: 'Peak / Valley',
        settings: 'Settings',
        back: 'Back',
        topUpTip: 'Open the DeepSeek top-up page',
        topUpLabel: 'Top up',
        countdownTo: (label) => `in ${label} `,
        toPeak: 'to peak',
        toValley: 'to off-peak',
        cdAfterPeak: ' until peak',
        cdAfterValley: ' until off-peak',
        showBalanceTitle: 'Balance title',
        showTodayTitle: 'Today title',
        valleyColor: 'Valley color',
        peakColor: 'Peak color',
        style: 'Style',
        styleCard: 'Detailed',
        styleMinimal: 'Minimal',
        showPeriod: 'Show period badge',
        showCountdown: 'Show countdown',
        position: 'Position',
        positionDock: 'Under composer',
        positionFooter: 'Sidebar footer',
        positionOff: 'Off',
        hint: 'Hint',
        priceNote: 'Peak/valley windows and price tiers are built into the plugin; balance comes from the official DeepSeek API.',
        noData: 'No data',
        refresh: 'Loaded',
      },
    }

    // ── DeepSeek 官方充值页(点击余额徽章在新页签打开) ──────────────────────
    // 余额来自 DeepSeek 官方 /user/balance,所以充值入口也指向官方平台。
    const TOP_UP_URL = 'https://platform.deepseek.com/top_up';

    // ── 预置配色(中国传统色 + 潘通,沉稳系) ────────────────────────────────
    const COLOR_PRESETS = [
      // 程序员经典编辑器主题
      { id: 'onedark',   name: 'One Dark',    peak: '#E5C07B', valley: '#61AFEF', group: 'dev' },
      { id: 'dracula',   name: 'Dracula',     peak: '#FFB86C', valley: '#BD93F9', group: 'dev' },
      { id: 'nord',      name: 'Nord',        peak: '#EBCB8B', valley: '#88C0D0', group: 'dev' },
      { id: 'tokyo',     name: 'Tokyo Night', peak: '#FF9E64', valley: '#7AA2F7', group: 'dev' },
      { id: 'gruvbox',   name: 'Gruvbox',     peak: '#FE8019', valley: '#83A598', group: 'dev' },
      { id: 'solarized', name: 'Solarized',   peak: '#B58900', valley: '#268BD2', group: 'dev' },
      // 中国传统色 + 潘通
      { id: 'amber',     name: '琥珀黛蓝',    peak: '#CA6924', valley: '#425066', group: 'cn' },
      { id: 'ochre',     name: '赭石天青',    peak: '#955539', valley: '#4C809F', group: 'cn' },
      { id: 'crimson',   name: '绛纱墨青',    peak: '#8C4356', valley: '#3E4A5A', group: 'cn' },
      { id: 'pantone',   name: '靛墨潘通',    peak: '#9E6B3F', valley: '#253746', group: 'cn' },
    ]

    // ── 样式(全部走主题变量,谷/峰色为 CSS 变量便于运行时替换) ─────────────
    const CSS = [
      // 悬浮层:绝对定位在输入区(座位)底部。
      // 徽章落在底栏最右侧(状态行),不占布局;时间轴悬停时沿卡片下沿(黄线)整行浮现。
      '.vm-root{position:absolute;inset:0;z-index:6;display:block;min-height:0;pointer-events:none;font-size:var(--dsw-font-s-14-font-size,14px);box-sizing:border-box;color-scheme:dark}',
      '.vm-dock{position:relative;display:flex;justify-content:flex-end;align-items:center;min-height:26px;width:100%}',
      '.vm-top{display:flex;align-items:center;justify-content:center;gap:6px;font-variant-numeric:tabular-nums}',
      '.vm-countdown{font-size:var(--dsw-font-base-strong-16-font-size,16px);line-height:var(--dsw-font-base-strong-16-line-height,24px);font-weight:600;letter-spacing:.3px;color:var(--dsw-alias-label-secondary,#cfd3d6)}',
      '.vm-cd-tag{font-size:var(--dsw-font-xs-13-font-size,13px);font-weight:400;color:var(--dsw-alias-label-secondary,inherit)}',
      '.vm-strip{display:flex;align-items:center;gap:8px;min-width:0;width:100%}',
      '.vm-trackcol{display:flex;flex-direction:column;flex:1;min-width:0}',
      '.vm-track{position:relative;height:2.8px;min-width:0;border-radius:999px;background:var(--dsw-alias-bg-layer-3,transparent);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}',
      // 圆角裁切层:峰/谷色块整体收进圆角内;指针留在裁切层外,光晕不被裁掉。
      '.vm-trackfill{position:absolute;inset:0;border-radius:999px;overflow:hidden}',
      '.vm-seg{position:absolute;top:0;height:100%}',
      '.vm-seg-peak{background:var(--vm-peak)}',
      '.vm-seg-valley{background:var(--vm-valley)}',
      '.vm-block{position:absolute;top:50%;width:7px;height:7px;border-radius:2px;transform:translate(-50%,-50%);pointer-events:auto;z-index:0;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
      '.vm-past{position:absolute;top:-7px;left:0;height:calc(100% + 14px);width:0;background:rgba(0,0,0,.28);pointer-events:none;z-index:1;transition:width .5s ease;border-radius:999px 0 0 999px}',
      '.vm-marker{position:absolute;top:-2px;width:2px;height:calc(100% + 4px);background:var(--dsw-alias-label-primary,#fff);transform:translateX(-50%);transition:left .5s ease;z-index:2;border-radius:2px;box-shadow:0 0 6px 1px rgba(255,255,255,.9),0 0 12px 2px rgba(255,255,255,.5);animation:vm-breathe 1.6s ease-in-out infinite}',
      '.vm-ticks{display:flex;justify-content:space-between;order:-1;margin-bottom:4px;font-size:var(--dsw-font-xxs-12-font-size,11px);line-height:1;color:var(--dsw-alias-label-caption,#81858c);font-variant-numeric:tabular-nums;padding:0 1px}',
      '.vm-hh{display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--dsw-alias-label-tertiary,inherit);white-space:nowrap}',
      '.vm-legend{display:flex;align-items:center;gap:12px;font-size:10px;color:var(--dsw-alias-label-secondary,inherit);margin-top:-2px}',
      '.vm-legend-item{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
      '.vm-legend-dot{width:8px;height:8px;border-radius:50%}',
      '.vm-legend-dot.peak{background:var(--vm-peak)}',
      '.vm-legend-dot.valley{background:var(--vm-valley)}',
      '.vm-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.vm-cell{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.vm-cell-title{font-size:var(--dsw-font-s-14-font-size,14px);color:var(--dsw-alias-label-caption,#81858c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.vm-cell-value{font-size:var(--dsw-font-s-14-font-size,14px);line-height:20px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#cfd3d6);white-space:nowrap}',
      '.vm-badge{display:inline-flex;align-items:center;gap:5px;font-size:var(--dsw-font-xs-13-font-size,13px);font-weight:500;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1,transparent);color:var(--dsw-alias-label-secondary,inherit);align-self:center;margin-left:auto;max-width:100%;overflow:hidden}',
      '.vm-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}',
      '.vm-badge.peak{color:var(--vm-peak)}',
      '.vm-badge.valley{color:var(--vm-valley)}',
      '.vm-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,inherit);text-align:center}',
      // 极简样式
      '.vm-card.vm-style-minimal{gap:5px;padding:8px 10px;min-width:120px}',
      '.vm-card.vm-style-minimal .vm-countdown{font-size:20px}',
      // 设置页
      '.vm-set{display:flex;flex-direction:column;gap:12px;max-width:520px}',
      '.vm-set-row{display:flex;flex-direction:column;gap:6px}',
      '.vm-set-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,inherit)}',
      '.vm-set-input{background:var(--dsw-alias-bg-layer-3,transparent);color:var(--dsw-alias-label-primary,inherit);border:1px solid var(--dsw-alias-border-l1,transparent);border-radius:8px;padding:6px 9px;font-size:13px;width:220px;max-width:100%}',
      '.vm-set-input.vm-set-select{height:32px}',
      '.vm-set-color{width:44px;height:28px;border:1px solid var(--dsw-alias-border-l1,transparent);border-radius:8px;background:none;padding:0;cursor:pointer}',
      '.vm-set-check{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-primary,inherit)}',
      '.vm-set-row-group{display:flex;flex-wrap:wrap;gap:18px;align-items:center}',
      '.vm-set-note{font-size:11px;color:var(--dsw-alias-label-tertiary,inherit)}',
      // 动效
      '@keyframes vm-breathe{0%,100%{box-shadow:0 0 6px 1px rgba(255,255,255,.5);opacity:.85}50%{box-shadow:0 0 20px 6px rgba(255,255,255,.95);opacity:1}}',
      '@media (prefers-reduced-motion:reduce){.vm-marker{animation:none}}',
      // 收起态:底栏行内的一枚纯文字余额(无背景框、无边框),字号/字重与状态行一致。
      // 整枚文字都是充值入口;余额按档位变色(<10 橙,<5 红,<2 红闪)。
      '.vm-chip{position:absolute;right:0;bottom:4px;z-index:2;display:inline-flex;align-items:center;gap:3px;height:20px;padding:0;pointer-events:auto;background:none;border:0;color:var(--dsw-alias-label-tertiary,#81858c);font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px;font-weight:600;font-variant-numeric:tabular-nums;text-decoration:none;cursor:pointer;user-select:none;white-space:nowrap}',
      '.vm-chip:hover{color:var(--dsw-alias-label-primary,#e9eaec)}',
      '.vm-chip:focus-visible{outline:2px solid var(--vm-valley,#3b6ef5);outline-offset:2px;border-radius:4px}',
      '.vm-chip[data-level=low]{color:#e8890c}',
      '.vm-chip[data-level=danger]{color:#e5484d}',
      '.vm-chip[data-level=critical]{color:#e5484d;animation:vm-blink 1s ease-in-out infinite}',
      '@keyframes vm-blink{0%,100%{opacity:1}50%{opacity:.2}}',
      '@media (prefers-reduced-motion:reduce){.vm-chip[data-level=critical]{animation:none}}',
      '.vm-chip-sym{line-height:1;font-weight:600}',
      '.vm-chip-value{line-height:1;font-weight:600;font-variant-numeric:tabular-nums}',
      // 展开面板:绝对定位在 chip 上方(向上弹出);条件渲染(open=true 才在 DOM),
      // 无需 opacity/visibility 隐藏;保留过渡动效。
      '.vm-panel{position:absolute;bottom:calc(100% + 6px);right:0;width:max-content;max-width:min(380px,90vw);padding:12px 14px;border-radius:16px;background:var(--dsw-alias-bg-layer-2,#1c1d21);border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 30px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px;box-sizing:border-box;animation:vm-pop-in .22s ease;z-index:50}',
      // 悬停浮现的峰谷时间轴:长度 = 输入卡片宽度的 80%,在卡片内水平居中;
      // 厚度 2.8px(4px 的 70%),圆角由 vm-trackfill 裁切。
      '.vm-trackline{position:absolute;left:10%;right:auto;bottom:26px;z-index:1;width:80%;height:2.8px;margin:0;padding:0;box-sizing:border-box;pointer-events:auto;animation:vm-pop-in .2s ease}',
      // 面板头部:名称 + 极简设置齿轮
      '.vm-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.vm-panel-title{font-size:var(--dsw-font-xs-13-font-size,13px);font-weight:600;color:var(--dsw-alias-label-primary,#e9eaec);letter-spacing:.2px}',
      '.vm-gear{background:none;border:none;padding:2px;font-size:13px;line-height:1;color:var(--dsw-alias-label-tertiary,#6a6e75);cursor:pointer;border-radius:6px;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;transition:color .2s ease,background .2s ease}',
      '.vm-gear:hover{color:var(--dsw-alias-label-primary,#e9eaec);background:rgba(255,255,255,.06)}',
      // 弹入动效
      '@keyframes vm-pop-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      // 窄容器适配:藏徽标、减刻度、缩倒计时
      '@container (max-width:330px){.vm-badge{display:none}.vm-cell-title{display:none}.vm-ticks span:nth-child(2),.vm-ticks span:nth-child(4){display:none}}',
    ]

    function adoptStyles() {
      const id = 'dsh-valley-meter-styles'
      let style = document.getElementById(id)
      if (!style) {
        style = document.createElement('style')
        style.id = id
        document.head.appendChild(style)
      }
      // HMR 重载时同一页面会保留旧 <style>;每次 apply 都写回当前 bundle 的样式,
      // 否则改版 CSS 永远不会生效(旧版用 __vmStylesAdopted 一次性守卫)。
      style.textContent = CSS.join('')
    }

    // ── RPC 线路校验器(与宿主编排 zod 清单对应,宽松校验必要字段) ────────
    function fail(path, expected) { throw new Error(`[dsh-valley-meter] ${path}: expected ${expected}`) }
    function parseNum(v, path) { if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'number'); return v }
    function parseStr(v, path) { if (typeof v !== 'string') fail(path, 'string'); return v }
    function parseBool(v, path) { if (typeof v !== 'boolean') fail(path, 'boolean'); return v }

    function parsePeak(v, path) {
      if (v === null) return null
      if (typeof v !== 'object' || Array.isArray(v)) fail(path, 'object|null')
      return {
        inPeak: parseBool(v.inPeak, path + '.inPeak'),
        prevAtMs: parseNum(v.prevAtMs, path + '.prevAtMs'),
        nextAtMs: parseNum(v.nextAtMs, path + '.nextAtMs'),
        nextIntoPeak: parseBool(v.nextIntoPeak, path + '.nextIntoPeak'),
        // 周末全天低谷(官方 2026-08-23 起):为 true 时整日按低谷计,时间轴不画峰段。
        offPeakAllDay: v.offPeakAllDay === true,
        windows: Array.isArray(v.windows) ? v.windows.map((w, i) => ({ start: parseNum(w?.start, path + '.windows[' + i + ']'), end: parseNum(w?.end, path + '.windows[' + i + ']') })) : undefined,
      }
    }
    function parseBalance(v, path) {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'object')
      return {
        status: parseStr(v.status, path + '.status'),
        total: v.total === null ? null : parseNum(v.total, path + '.total'),
        granted: parseNum(v.granted, path + '.granted'),
        topped: parseNum(v.topped, path + '.topped'),
        currency: parseStr(v.currency, path + '.currency'),
        fetchedAt: v.fetchedAt === null ? null : parseNum(v.fetchedAt, path + '.fetchedAt'),
        message: typeof v.message === 'string' ? v.message : '',
      }
    }
    function parseConfig(v, path) {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'object')
      return {
        position: parseStr(v.position, path + '.position'),
        peakColor: parseStr(v.peakColor, path + '.peakColor'),
        valleyColor: parseStr(v.valleyColor, path + '.valleyColor'),
        symbol: parseStr(v.symbol, path + '.symbol'),
        decimals: parseNum(v.decimals, path + '.decimals'),
        showBalanceTitle: parseBool(v.showBalanceTitle, path + '.showBalanceTitle'),
        showTodayTitle: parseBool(v.showTodayTitle, path + '.showTodayTitle'),
        style: parseStr(v.style, path + '.style'),
        showPeriod: parseBool(v.showPeriod, path + '.showPeriod'),
        showCountdown: parseBool(v.showCountdown, path + '.showCountdown'),
        colorPreset: typeof v.colorPreset === 'string' ? v.colorPreset : 'custom',
        weekendOffPeak: v.weekendOffPeak !== false,
        balanceRefreshSec: typeof v.balanceRefreshSec === 'number' ? v.balanceRefreshSec : 5,
      }
    }
    function parseState(v, path) {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'object')
      const rawHours = Array.isArray(v.todayHours) ? v.todayHours.map((x, i) => parseNum(x, path + '.todayHours[' + i + ']')) : null
      return {
        now: parseNum(v.now, path + '.now'),
        dayKey: parseStr(v.dayKey, path + '.dayKey'),
        peak: parsePeak(v.peak, path + '.peak'),
        balance: parseBalance(v.balance, path + '.balance'),
        todayCost: v.todayCost === null ? null : parseNum(v.todayCost, path + '.todayCost'),
        todayCalls: typeof v.todayCalls === 'number' ? v.todayCalls : 0,
        todayHours: rawHours,
        config: parseConfig(v.config, path + '.config'),
      }
    }
    function codecOf(typeSymbol, parse) {
      // DSH 0.2 的 Client Typert 注册表要求严格 codec 暴露 create() 工厂,
      // 返回一个带 parse() 的对象(与宿主 zod schema 的接口一致)。
      return { mode: 'strict', typeSymbol, create: () => ({ parse }) }
    }
    const stateCodec = codecOf('dsh-valley-meter#State', parseState)
    const patchCodec = codecOf('dsh-valley-meter#ConfigPatch', (v) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) fail('patch', 'object')
      return v
    })

    // ── RPC 贡献(与服务端 ./typert 清单一一对应) ─────────────────────────
    const CONTRIBUTION = {
      package: 'dsh-valley-meter',
      descriptors: [
        {
          id: 'dsh-valley-meter#valleyMeter/getState', service: 'valleyMeter', namespace: 'valleyMeter', method: 'getState',
          invocation: { kind: 'direct' }, parameters: [],
          result: stateCodec,
        },
        {
          id: 'dsh-valley-meter#valleyMeter/updateConfig', service: 'valleyMeter', namespace: 'valleyMeter', method: 'updateConfig',
          invocation: { kind: 'direct' },
          parameters: [{ name: 'patch', wire: 'patch', source: 'json', codec: patchCodec }],
          result: stateCodec,
        },
        {
          id: 'dsh-valley-meter#valleyMeter/refreshBalance', service: 'valleyMeter', namespace: 'valleyMeter', method: 'refreshBalance',
          invocation: { kind: 'direct' }, parameters: [],
          result: stateCodec,
        },
      ],
    }

    // ── 工具 ─────────────────────────────────────────────────────────────
    const H = React.createElement
    function useTick(ms) {
      const [now, setNow] = React.useState(Date.now())
      React.useEffect(() => {
        if (ms <= 0) return undefined
        const id = setInterval(() => setNow(Date.now()), ms)
        return () => clearInterval(id)
      }, [ms])
      return now
    }
    function makeT(locale, fallbackLocale) {
      return (key, ...args) => {
        const dict = MESSAGES[locale] || MESSAGES[fallbackLocale || 'zh'] || MESSAGES.zh
        const v = dict[key]
        if (typeof v === 'function') return v(...(args || []))
        return v !== undefined ? v : key
      }
    }

    // ── 主体组件 ────────────────────────────────────────────────────────
    function stateOf(props) {
      // 渲染器把 inject 返回的 hooks.valley 转换成 useValley(selector) Hook
      // (useSyncExternalStoreWithSelector,selector 必传);兼容旧 hooks.valley 形态。
      if (props && typeof props.useValley === 'function') {
        const state = props.useValley((s) => (s && typeof s === 'object' ? s.state ?? null : null))
        return state ?? null
      }
      const hook = props?.hooks?.valley
      if (!hook) return null
      if (hook.getSnapshot) return hook.getSnapshot().state
      return hook.state ?? null
    }
    function apiOf(props) {
      return props?.api ?? props?.hooks?.valley?.api
    }
    function tOf(props, fallbackLocale) {
      return props?.t || makeT(resolveLocale())
    }
    function ValleyCard(props) {
      const state = stateOf(props)
      const api = apiOf(props)
      const t = tOf(props, 'zh')
      const rootRef = React.useRef(null)
      // Hook 必须无条件调用(不能放在条件 return 之后,否则重渲染时 Hook 数量变化会崩)。
      const now = useTick(state?.config?.showCountdown === false ? 60000 : 1000)
      // 默认只显示余额徽章,光标悬停向上展开完整信息;设置按钮弹出设置浮层。
      const [open, setOpen] = React.useState(false)
      const [showSettings, setShowSettings] = React.useState(false)
      // 覆盖层默认铺满 composer seat,但输入卡片有 max-width 并居中(宽窗口下两侧留白)。
      // 运行时按“卡片”的左右缘收窄覆盖层;余额水平居中于输入框内的发送按钮。
      React.useEffect(() => {
        const root = rootRef.current
        if (!root) return undefined
        let frame = 0
        const align = () => {
          const dock = root.closest('[data-composer-dock]')
          const card = dock !== null ? dock.previousElementSibling : null
          const seat = root.closest('[data-conversation-region="composer"]')
          if (!card || !seat) return
          const cardRect = card.getBoundingClientRect()
          const seatRect = seat.getBoundingClientRect()
          root.style.left = `${Math.max(0, Math.round(cardRect.left - seatRect.left))}px`
          root.style.right = `${Math.max(0, Math.round(seatRect.right - cardRect.right))}px`

          // 余额:水平中心对齐到输入框内的发送按钮。
          const chip = root.querySelector('.vm-chip')
          if (!chip) return
          const primaries = [...card.querySelectorAll('button')]
            .filter(button => button.offsetParent !== null && /primary/.test(String(button.className)))
          const send = primaries.length > 0 ? primaries[primaries.length - 1] : null
          if (!send) {
            chip.style.left = ''
            chip.style.right = '0px'
            return
          }
          const chipRect = chip.getBoundingClientRect()
          const sendRect = send.getBoundingClientRect()
          const center = sendRect.left + sendRect.width / 2
          chip.style.right = 'auto'
          chip.style.left = `${Math.round(center - cardRect.left - chipRect.width / 2)}px`
        }
        const schedule = () => {
          if (frame !== 0) return
          frame = requestAnimationFrame(() => { frame = 0; align() })
        }
        align()
        let observer = null
        if (typeof ResizeObserver === 'function') {
          observer = new ResizeObserver(schedule)
          const dock = root.closest('[data-composer-dock]')
          if (dock?.previousElementSibling) observer.observe(dock.previousElementSibling)
          const seat = root.closest('[data-conversation-region="composer"]')
          if (seat) observer.observe(seat)
          const chip = root.querySelector('.vm-chip')
          if (chip) observer.observe(chip)
          const primaries = [...(dock?.previousElementSibling?.querySelectorAll('button') ?? [])]
            .filter(button => button.offsetParent !== null && /primary/.test(String(button.className)))
          if (primaries.length > 0) observer.observe(primaries[primaries.length - 1])
        }
        window.addEventListener('resize', schedule)
        return () => {
          if (frame !== 0) cancelAnimationFrame(frame)
          if (observer !== null) observer.disconnect()
          window.removeEventListener('resize', schedule)
        }
      }, [state])
      if (!state) return null

      const { config } = state
      const peak = state.peak

      const marketColor = H('style', null, `.vm-root{--vm-peak:${config?.peakColor || '#f5941b'};--vm-valley:${config?.valleyColor || '#3b6ef5'}}`)

      let countdown = null
      let badge = null
      if (peak) {
        const diff = Math.max(0, peak.nextAtMs - now)
        countdown = formatDuration(diff, true)
        const into = peak.nextIntoPeak
        // 周末全天低谷:徽标直接点明「周末低谷」,倒计时指向下周一的首个峰时。
        const periodLabel = peak.inPeak ? t('peak') : (peak.offPeakAllDay ? t('weekendValley') : t('valley'))
        badge = H('span', {
          className: 'vm-badge ' + (peak.inPeak ? 'peak' : 'valley'),
          title: peak.offPeakAllDay ? t('weekendTip') : undefined,
        },
          periodLabel + ' · ' + t('countdownTo', into ? t('toPeak') : t('toValley')).trim() + countdown)
      }

      const children = []
      const detailNodes = []
      // marketColor 常驻(峰谷颜色变量).
      children.push(marketColor)
      // 面板做减法:不再重复显示倒计时文字(时间轴 marker 已表达当前时刻)。
      // 峰谷时间轴(横向):一条细线表达峰(橙)/谷(蓝)时段,自左到右=00→24 时;
      // 当前时刻用竖向 marker 标记;放在余额 chip 左侧、同一水平线,悬停浮现。
      let stripNode = null
      if (peak) {
        const prog = peakProgress(peak, now)
        // 周末全天低谷:整条时间轴都是谷时,不画任何峰段。
        const segs = peak.offPeakAllDay === true ? [] : dayPeakSegments(peak.windows)
        stripNode = H('div', { className: 'vm-strip' },
          H('div', { className: 'vm-trackcol' },
            H('div', { className: 'vm-track' },
              H('div', { className: 'vm-trackfill' },
                H('div', { className: 'vm-seg vm-seg-valley', style: { left: '0%', width: '100%' } }),
                segs.map((s, i) => H('div', { key: 's' + i, className: 'vm-seg vm-seg-peak', style: { left: s.left, width: s.width } }))),
              H('div', { className: 'vm-marker', style: { left: prog } }))))
        // 时间轴单独用 vm-trackline 展示(悬停浮现),不进 detailNodes,避免重复。
      }


      const balanceOk = state.balance.status === 'ok' && state.balance.total !== null
      const balanceVal = balanceOk
        ? formatMoney(state.balance.total, config?.decimals, config?.symbol)
        : t('noData')
      // 余额档位:<10 橙,<5 红,<2 红闪;未知/正常走默认色。
      const balanceLevel = !balanceOk
        ? 'unknown'
        : state.balance.total < 2
          ? 'critical'
          : state.balance.total < 5
            ? 'danger'
            : state.balance.total < 10
              ? 'low'
              : 'normal'
      // 徽章内拆成两组内容:人民币符号 + 余额数值(整枚是充值入口)。
      const balanceSymbol = config?.symbol || '¥'
      const balanceNum = balanceOk
        ? formatMoney(state.balance.total, config?.decimals, '')
        : t('noData')
      const todayVal = state.todayCost === null
        ? t('noData')
        : formatMoney(state.todayCost, config?.decimals, config?.symbol)

      // 展开面板(absolute 锚在本 cell,不用 fixed 避免和应用浮层冲突)。
      // 做减法:只显示余额+今天两个数字(不含标题),倒计时在时间轴上已体现,不再重复。
      const stats = H('div', { className: 'vm-stats' },
        H('div', { className: 'vm-cell', onClick: () => { if (api?.refreshBalance) void api.refreshBalance() } },
          H('div', { className: 'vm-cell-value' }, balanceVal)),
        H('div', { className: 'vm-cell' },
          H('div', { className: 'vm-cell-value' }, todayVal)))
      const body = showSettings
        ? H(ValleySettings, { ...props })
        : H('div', { className: 'vm-panel-body' }, stats, ...detailNodes)
      const panel = H('div', { className: 'vm-panel', onMouseEnter: () => setOpen(true) },
        H('div', { className: 'vm-panel-head' },
          showSettings
            ? H('span', { className: 'vm-panel-title' }, t('settings'))
            : H('span', { className: 'vm-panel-title' }, ''),
          showSettings
            ? H('button', { className: 'vm-gear', title: t('back'), 'aria-label': t('back'), onClick: (e) => { e.stopPropagation(); setShowSettings(false) } }, '‹')
            : H('button', { className: 'vm-gear', title: t('settings'), 'aria-label': t('settings'), onClick: (e) => { e.stopPropagation(); setShowSettings(true) } }, '⚙')),
        body)

      // vm-root 由 effect 锚定到输入框卡片右上角上方(absolute,底部贴卡片上沿,右缘贴卡片右缘)。
      // chip 作为 hover 触发器:默认只显示余额数字;悬停时在左侧浮现时间轴。
      // 悬浮面板已移除,只保留时间轴。
      return H('div', { className: 'vm-root', ref: rootRef,
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => { setOpen(false) },
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false),
      },
        // 常驻:峰谷颜色变量
        ...children,
        // 峰谷时间轴(悬停浮现,在余额 chip 左侧,同一水平线,横向)
        open && stripNode ? H('div', { className: 'vm-trackline', onMouseEnter: () => setOpen(true) }, stripNode) : null,
        // 余额 chip:默认极简,只有「¥」「余额」两组内容。
        // ¥ 单独成组且是唯一可点区域(新页签打开官方充值页);数值只读。
        // 纯文字余额:整枚都是充值时入口,新页签打开官方充值页。
        // 用 <a target="_blank"> 而非 window.open:交给宿主/浏览器原生处理,
        // 桌面端走外部浏览器打开,自带键盘可达与"新页签"语义。
        H('a', {
          className: 'vm-chip',
          'data-level': balanceLevel,
          href: TOP_UP_URL,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: t('topUpTip'),
          'aria-label': t('topUpTip'),
          // 只拦点击冒泡,不影响 vm-root 的 hover 展开逻辑。
          onClick: (e) => e.stopPropagation(),
        },
          H('span', { className: 'vm-chip-sym' }, balanceSymbol),
          H('span', { className: 'vm-chip-value' }, balanceNum)))
    }

    // ── 配置面板 ────────────────────────────────────────────────────────
    function ValleySettings(props) {
      const state = stateOf(props)
      const api = apiOf(props)
      const t = tOf(props, 'zh')
      if (!state) return null
      const cfg = state.config || {}
      const update = (patch) => { if (api?.updateConfig) void api.updateConfig(patch) }
      const setS = (key) => (e) => update({ [key]: e.target.value })
      const setB = (key) => (e) => update({ [key]: e.target.checked })
      const setColorPreset = (e) => {
        const p = COLOR_PRESETS.find(x => x.id === e.target.value)
        if (p) update({ colorPreset: p.id, peakColor: p.peak, valleyColor: p.valley })
      }
      const setCustomColor = (key) => (e) => update({ [key]: e.target.value, colorPreset: 'custom' })

      const presetGroups = [
        { label: '编辑器主题', items: COLOR_PRESETS.filter(p => p.group === 'dev') },
        { label: '传统配色', items: COLOR_PRESETS.filter(p => p.group === 'cn') },
      ]

      return H('div', { className: 'vm-set' },
        H('div', { className: 'vm-set-row' },
          H('label', { className: 'vm-set-label' }, '配色方案'),
          H('select', { className: 'vm-set-input', value: cfg.colorPreset || 'custom', onChange: setColorPreset },
            presetGroups.map(g => H('optgroup', { key: g.label, label: g.label },
              g.items.map(o => H('option', { key: o.id, value: o.id }, o.name)))),
            H('option', { value: 'custom' }, '自定义'))),
        H('div', { className: 'vm-set-row-group' },
          H('div', { className: 'vm-set-row' },
            H('label', { className: 'vm-set-label' }, t('valleyColor')),
            H('input', { type: 'color', className: 'vm-set-color', value: cfg.valleyColor || '#425066', onChange: setCustomColor('valleyColor') })),
          H('div', { className: 'vm-set-row' },
            H('label', { className: 'vm-set-label' }, t('peakColor')),
            H('input', { type: 'color', className: 'vm-set-color', value: cfg.peakColor || '#CA6924', onChange: setCustomColor('peakColor') }))),

        H('label', { className: 'vm-set-check' },
          H('input', { type: 'checkbox', checked: cfg.showBalanceTitle !== false, onChange: setB('showBalanceTitle') }), t('showBalanceTitle')),
        H('label', { className: 'vm-set-check' },
          H('input', { type: 'checkbox', checked: cfg.showTodayTitle !== false, onChange: setB('showTodayTitle') }), t('showTodayTitle')),
        H('label', { className: 'vm-set-check' },
          H('input', { type: 'checkbox', checked: cfg.showCountdown !== false, onChange: setB('showCountdown') }), t('showCountdown')),
        // 官方 2026-08-23 起的周末规则:默认开启,可按需关闭。
        H('label', { className: 'vm-set-check', title: t('weekendTip') },
          H('input', { type: 'checkbox', checked: cfg.weekendOffPeak !== false, onChange: setB('weekendOffPeak') }), t('weekendOffPeak')),

        H('div', { className: 'vm-set-note' }, t('priceNote')))
    }

    // ── 格式/计算 ───────────────────────────────────────────────────────
    function formatDuration(ms, withSeconds) {
      const totalSec = Math.max(0, Math.floor(ms / 1000))
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      const pad = (n) => String(n).padStart(2, '0')
      if (withSeconds) return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
      return h > 0 ? `${pad(h)}:${pad(m)}` : `${pad(m)}:${pad(s)}`
    }
    function formatMoney(v, decimals, symbol) {
      const d = Number.isFinite(Number(decimals)) && decimals >= 0 ? decimals : 2
      const num = Number(v).toFixed(d)
      return symbol ? symbol + ' ' + num : num
    }
    function clockHm(ms) {
      // 峰谷窗口以 UTC 计,进度条与时刻标签统一用 UTC,避免时区错位。
      const d = new Date(ms)
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    }
    // 当前时刻在 24h 进度条上的位置(0..100%)。
    function peakProgress(peak, now) {
      const d = new Date(now)
      const dayMs = 24 * 60 * 60 * 1000
      // 用本地时间定位当前时刻 marker(时间轴以本地时区展示,和刻度 00/06/12/18/24 直觉一致)。
      const cur = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000
      return `${(cur / dayMs * 100).toFixed(2)}%`
    }
    // 把峰时段窗口(UTC 小时)换算到本地时区,映射成横向 24h 时间轴的绝对位置(%字符串)。
    function dayPeakSegments(windows) {
      const segs = []
      if (!Array.isArray(windows)) return segs
      // 本地时区偏移(小时,东八区=+8):UTC 窗口 + offset = 本地窗口。
      const offset = -new Date().getTimezoneOffset() / 60
      const wrap = (h) => ((h % 24) + 24) % 24
      for (const w of windows) {
        const start = Number(w?.start)
        const end = Number(w?.end)
        if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) continue
        const ls = wrap(start + offset)
        const le = wrap(end + offset)
        // 换算后可能跨午夜,拆成两段。
        const ranges = ls < le ? [[ls, le]] : [[ls, 24], [0, le]]
        for (const [s, e] of ranges) {
          segs.push({ left: `${(s / 24 * 100).toFixed(2)}%`, width: `${((e - s) / 24 * 100).toFixed(2)}%` })
        }
      }
      return segs
    }
    // 第 h 个小时方块(覆盖 [h,h+1))是否落在峰段窗口内(按方块中心时刻判断)。
    function hourInPeak(h, windows) {
      if (!Array.isArray(windows)) return false
      const mid = h + 0.5
      return windows.some(w => {
        const start = Number(w?.start)
        const end = Number(w?.end)
        if (!Number.isFinite(start) || !Number.isFinite(end)) return false
        return start < end ? (mid >= start && mid < end) : (mid >= start || mid < end)
      })
    }

    // ── store ───────────────────────────────────────────────────────────
    function makeStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        set: (next) => { state = next; listeners.forEach(l => l()) },
        subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) },
      }
    }

    // ── 语言选择 ─────────────────────────────────────────────────────────
    function resolveLocale(v) {
      if (v === 'zh' || v === 'en') return v
      return (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en'
    }

    // ── 插件主体 ────────────────────────────────────────────────────────
    const inject = ['remote', 'slots', 'locale']

    async function apply(ctx) {
      try {
        adoptStyles()
        const remote = ctx.remote
        if (remote === undefined || typeof remote.$mount !== 'function') return
        const unmount = await remote.$mount(CONTRIBUTION)
        ctx.effect(() => () => { unmount() }, 'valley-meter: remote contribution')

        const valleyMeter = ctx.get('remote.valleyMeter')
        if (valleyMeter === undefined) return

      const store = makeStore({ status: 'loading', state: null })
      const call = async (method, args) => {
        const result = await valleyMeter[method](...(args ?? []))
        if (result === null || typeof result !== 'object' || result.ok !== true) {
          throw new Error(result?.error?.message ?? 'RPC failed')
        }
        return result.value
      }
      let reloading = false
      const reload = async () => {
        if (reloading) return
        reloading = true
        try {
          const state = await call('getState')
          store.set({ status: 'ready', state })
        } catch (error) {
          store.set({ status: 'error', state: store.getSnapshot().state })
        } finally {
          reloading = false
        }
      }
      ctx.effect(() => ctx.on('connection/reset', () => { void reload() }), 'valley-meter: reconnect reload')
      // 自调度轮询:每次 reload 后按 balanceRefreshSec(默认 5s)安排下一次,
      // 改小该值立即生效,余额刷新更实时。
      let pollTimer = null
      const schedulePoll = () => {
        const cur = store.getSnapshot().state
        const sec = Math.max(5, Number(cur?.config?.balanceRefreshSec) || 5)
        pollTimer = setTimeout(() => {
          if (!document.hidden) void reload()
          schedulePoll()
        }, sec * 1000)
      }
      schedulePoll()
      ctx.effect(() => () => { if (pollTimer !== null) clearTimeout(pollTimer) }, 'valley-meter: poll timer')
      const onVisible = () => { if (document.visibilityState === 'visible') void reload() }
      document.addEventListener('visibilitychange', onVisible)
      ctx.effect(() => () => { document.removeEventListener('visibilitychange', onVisible) }, 'valley-meter: visibility reload')

      const api = {
        reload,
        updateConfig: async (patch) => {
          const state = await call('updateConfig', [patch])
          store.set({ status: 'ready', state })
          return state
        },
        refreshBalance: async () => {
          const state = await call('refreshBalance')
          store.set({ status: 'ready', state })
          return state
        },
      }

      const currentLocale = () => {
        try {
          const snap = ctx.get('locale')?.getLocale?.()
          if (snap && typeof snap.active === 'string') return snap.active
        } catch { /* 回退系统语言 */ }
        return resolveLocale()
      }
      const injected = () => ({ hooks: { valley: store }, api, t: makeT(currentLocale()) })

      void reload()

      const slots = ctx.get('slots')
      if (slots === undefined || typeof slots.inject !== 'function') return

      // 挂到 conversation.composer.dock(输入卡片下方的底栏行,和上下文占用环同一行)。
      // 组件自身绝对定位到座位(composer seat)右下角,不参与底栏的 flex 排布,
      // 因此不会挤动 Activity/Usage/ContextMeter 这些既有读数。
      const registerCard = () => {
        const slotName = 'conversation.composer.dock'
        const slots = ctx.get('slots')
        if (slots === undefined) return () => {}
        try {
          return slots.inject(slotName, () => {
            return slots.register(
              { name: slotName, id: 'valley-meter', order: 100, inject: injected }, ValleyCard)
          })
        } catch (e) {
          console.log('[dsh-valley-meter] register failed:', String(e))
          return () => {}
        }
      }

      let disposeCard = null
      const tryRegister = () => {
        if (disposeCard) return
        // ctx.slots 由宿主核心 bundle 挂载,apply 时可能尚未就绪;未就绪则等重试。
        if (typeof ctx.slots?.inject !== 'function') return
        disposeCard = registerCard()
      }
      tryRegister()
      try {
        const t1 = setTimeout(tryRegister, 1200)
        const t2 = setTimeout(tryRegister, 3500)
        if (typeof t1.unref === 'function') t1.unref()
        if (typeof t2.unref === 'function') t2.unref()
        ctx.effect(() => () => { clearTimeout(t1); clearTimeout(t2) }, 'valley-meter: register retry timer')
      } catch { /* 忽略 */ }

      // 设置区块:单实例,文案跟随宿主当前语言;locale/change 时重注册刷新。
      // DSH 0.2 的 slot 渲染器会按 entry.locale(语言*命名空间*)注入 t;本插件用自带
      // 的小字典(需要函数型文案),因此不声明 locale,改为在 inject face 里自带 t。
      const sectionActive = { gen: 0, dispose: null }
      const registerSection = () => {
        const locale = MESSAGES[currentLocale()] ? currentLocale() : 'zh'
        if (sectionActive.dispose !== null) { sectionActive.dispose(); sectionActive.dispose = null }
        sectionActive.gen += 1
        const gen = sectionActive.gen
        slots.inject('settings.section', () => {
          if (sectionActive.gen !== gen) return
          const dispose = slots.register({
            name: 'settings.section',
            id: 'valley-meter',
            order: 40,
            label: MESSAGES[locale].sectionLabel,
            inject: () => ({ hooks: { valley: store }, api, t: makeT(locale) }),
          }, ValleySettings)
          if (sectionActive.gen !== gen) { dispose(); return }
          sectionActive.dispose = dispose
          return () => {
            if (sectionActive.dispose === dispose) sectionActive.dispose = null
            dispose()
          }
        })
      }
      registerSection()
      ctx.effect(() => ctx.on('locale/change', () => { registerSection() }), 'valley-meter: locale change re-register')

      return () => { if (disposeCard) disposeCard(); if (sectionActive.dispose) sectionActive.dispose() }
      } catch (e) {
        console.log('[dsh-valley-meter] apply failed:', String(e))
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
