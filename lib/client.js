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
        balance: '账户余额',
        today: '今天花费',
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
        balance: 'Balance',
        today: 'Today',
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
      '.vm-root{--vm-peak:#f5941b;--vm-valley:#3b6ef5;color-scheme:dark;width:100%;align-self:stretch;display:flex;flex-direction:column}',
      '.vm-card{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:16px;background:var(--dsw-alias-bg-base,#151517);border:1px solid rgba(255,255,255,.06);width:100%;align-self:stretch;box-sizing:border-box;overflow:hidden;margin:0 auto;border-radius:22px;box-shadow:0 1px 3px rgba(0,0,0,.08);container-type:inline-size}',
      '.vm-top{display:flex;align-items:center;justify-content:center;gap:6px;font-variant-numeric:tabular-nums}',
      '.vm-countdown{font-size:var(--dsw-font-base-strong-16-font-size,16px);line-height:var(--dsw-font-base-strong-16-line-height,24px);font-weight:600;letter-spacing:.3px;color:var(--dsw-alias-label-secondary,#cfd3d6)}',
      '.vm-cd-tag{font-size:var(--dsw-font-xs-13-font-size,13px);font-weight:400;color:var(--dsw-alias-label-secondary,inherit)}',
      '.vm-strip{display:flex;align-items:center;gap:8px;min-width:0}',
      '.vm-trackcol{display:flex;flex-direction:column;flex:1;min-width:0}',
      '.vm-track{position:relative;height:4px;min-width:0;border-radius:999px;background:var(--dsw-alias-bg-layer-3,transparent);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}',
      '.vm-seg{position:absolute;top:0;height:100%}',
      '.vm-seg-peak{background:var(--vm-peak)}',
      '.vm-seg-valley{background:var(--vm-valley)}',
      '.vm-block{position:absolute;top:50%;width:7px;height:7px;border-radius:2px;transform:translate(-50%,-50%);pointer-events:auto;z-index:0;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
      '.vm-past{position:absolute;top:-7px;left:0;height:calc(100% + 14px);width:0;background:rgba(0,0,0,.28);pointer-events:none;z-index:1;transition:width .5s ease;border-radius:999px 0 0 999px}',
      '.vm-marker{position:absolute;top:0;width:2px;height:100%;background:var(--dsw-alias-label-secondary,#cfd3d6);transform:translateX(-50%);transition:left .5s ease;z-index:2;border-radius:2px;animation:vm-breathe 2.4s ease-in-out infinite}',
      '.vm-ticks{display:flex;justify-content:space-between;margin-top:4px;font-size:var(--dsw-font-xxs-12-font-size,11px);line-height:1;color:var(--dsw-alias-label-caption,#81858c);font-variant-numeric:tabular-nums;padding:0 1px}',
      '.vm-hh{display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--dsw-alias-label-tertiary,inherit);white-space:nowrap}',
      '.vm-legend{display:flex;align-items:center;gap:12px;font-size:10px;color:var(--dsw-alias-label-secondary,inherit);margin-top:-2px}',
      '.vm-legend-item{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
      '.vm-legend-dot{width:8px;height:8px;border-radius:50%}',
      '.vm-legend-dot.peak{background:var(--vm-peak)}',
      '.vm-legend-dot.valley{background:var(--vm-valley)}',
      '.vm-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:2px;padding:0 13px;}',
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
      '@keyframes vm-breathe{0%,100%{box-shadow:0 0 2px 0 rgba(207,211,214,.3);opacity:.75}50%{box-shadow:0 0 12px 3px rgba(207,211,214,.8);opacity:1}}',
      '@media (prefers-reduced-motion:reduce){.vm-marker{animation:none}}',
      // 倒计时/徽标默认淡出,悬停时间轴时浮现
      '.vm-fade{opacity:0;max-height:0;overflow:hidden;margin-top:-8px;transition:max-height .3s ease,opacity .3s ease,margin-top .3s ease}',
      '.vm-card:hover .vm-fade{opacity:1;max-height:80px;margin-top:0}',
      '@media (hover:none){.vm-fade{opacity:1;max-height:80px;margin-top:0}}',
      // 窄容器(侧边栏)适配:藏徽标、减刻度、缩倒计时
      '@container (max-width:330px){.vm-badge{display:none}.vm-cell-title{display:none}.vm-ticks span:nth-child(2),.vm-ticks span:nth-child(4){display:none}}',
    ]

    function adoptStyles() {
      const id = 'dsh-valley-meter-styles'
      if (window.__vmStylesAdopted) return
      window.__vmStylesAdopted = true
      let style = document.getElementById(id)
      if (!style) {
        style = document.createElement('style')
        style.id = id
        document.head.appendChild(style)
      }
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
        balanceRefreshSec: typeof v.balanceRefreshSec === 'number' ? v.balanceRefreshSec : 15,
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
    function codecOf(parse) { return { parse } }
    const stateCodec = codecOf(parseState)
    const patchCodec = codecOf(v => {
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
          result: { mode: 'strict', typeSymbol: 'dsh-valley-meter#State', schema: stateCodec },
        },
        {
          id: 'dsh-valley-meter#valleyMeter/updateConfig', service: 'valleyMeter', namespace: 'valleyMeter', method: 'updateConfig',
          invocation: { kind: 'direct' },
          parameters: [{ name: 'patch', wire: 'patch', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-valley-meter#ConfigPatch', schema: patchCodec } }],
          result: { mode: 'strict', typeSymbol: 'dsh-valley-meter#State', schema: stateCodec },
        },
        {
          id: 'dsh-valley-meter#valleyMeter/refreshBalance', service: 'valleyMeter', namespace: 'valleyMeter', method: 'refreshBalance',
          invocation: { kind: 'direct' }, parameters: [],
          result: { mode: 'strict', typeSymbol: 'dsh-valley-meter#State', schema: stateCodec },
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
      // dock 模式下与输入卡片等宽(实时同步);footer 模式容器窄,不受影响。
      React.useEffect(() => {
        const el = rootRef.current
        if (!el) return undefined
        const ta = document.querySelector('textarea')
        let inputCard = null
        let w = ta ? ta.parentElement : null
        for (let i = 0; w && i < 6; i++) {
          const br = parseFloat(getComputedStyle(w).borderRadius)
          if (br >= 16) { inputCard = w; break }
          w = w.parentElement
        }
        if (!inputCard) return undefined
        const syncWidth = () => {
          const r = inputCard.getBoundingClientRect()
          if (r.width > 0) el.style.maxWidth = Math.round(r.width) + 'px'
        }
        syncWidth()
        const ro = new ResizeObserver(syncWidth)
        ro.observe(inputCard)
        return () => ro.disconnect()
      }, [])
      // Hook 必须无条件调用(不能放在条件 return 之后,否则重渲染时 Hook 数量变化会崩)。
      const now = useTick(state?.config?.showCountdown === false ? 60000 : 1000)
      if (!state) return null

      const { config } = state
      const peak = state.peak
      const styleCls = config?.style === 'minimal' ? 'vm-style-minimal' : ''

      const marketColor = H('style', null, `.vm-root{--vm-peak:${config?.peakColor || '#f5941b'};--vm-valley:${config?.valleyColor || '#3b6ef5'}}`)

      let countdown = null
      let badge = null
      if (peak) {
        const diff = Math.max(0, peak.nextAtMs - now)
        countdown = formatDuration(diff, true)
        const into = peak.nextIntoPeak
        badge = H('span', { className: 'vm-badge ' + (peak.inPeak ? 'peak' : 'valley') },
          (peak.inPeak ? t('peak') : t('valley')) + ' · ' + t('countdownTo', into ? t('toPeak') : t('toValley')).trim() + countdown)
      }

      const children = []
      children.push(marketColor)

      // 顶部:倒计时(默认悬停时间轴时浮现;showCountdown=true 时常驻)
      if (countdown) {
        children.push(H('div', { className: 'vm-top' + (config?.showCountdown === true ? '' : ' vm-fade') },
          H('span', { className: 'vm-countdown' }, countdown),
          H('span', { className: 'vm-cd-tag' }, peak.nextIntoPeak ? t('cdAfterPeak') : t('cdAfterValley'))))
      }

      // 峰谷时间轴:一条细线表达峰(橙)/谷(蓝)时段,线上 24 枚圆角方块按
      // 颜色深浅表示各小时消耗金额;指针=当前时刻,已过时段整体压暗。
      if (peak) {
        const prog = peakProgress(peak, now)
        const hours = Array.isArray(state.todayHours) ? state.todayHours : null
        const maxH = hours ? Math.max(...hours, 0) : 0
        children.push(H('div', { className: 'vm-strip' },
          H('div', { className: 'vm-trackcol' },
            H('div', { className: 'vm-track' },
              H('div', { className: 'vm-seg vm-seg-valley', style: { left: '0%', width: '100%' } }),
              dayPeakSegments(peak.windows).map((s, i) => H('div', { key: 's' + i, className: 'vm-seg vm-seg-peak', style: { left: s.left, width: s.width } })),
              hours ? hours.map((v, h) => {
                const frac = v > 0 && maxH > 0 ? Math.sqrt(v / maxH) : 0
                const op = v > 0 ? 0.35 + 0.65 * frac : 0.3
                const inP = hourInPeak(h, peak.windows)
                const hh = (n) => String(((n % 24) + 24) % 24).padStart(2, '0')
                return H('div', {
                  key: 'b' + h,
                  className: 'vm-block' + (inP ? ' is-peak' : ''),
                  style: {
                    left: `${(((h + 0.5) / 24) * 100).toFixed(3)}%`,
                    backgroundColor: inP ? 'var(--vm-peak)' : 'var(--vm-valley)',
                    opacity: String(op),
                  },
                  title: `${hh(h)}:00–${hh(h + 1)}:00 · ${formatMoney(v, config?.decimals, config?.symbol)}`,
                })
              }) : null,
              H('div', { className: 'vm-past', style: { width: prog } }),
              H('div', { className: 'vm-marker', style: { left: prog } })),
            H('div', { className: 'vm-ticks' },
              ['00', '06', '12', '18', '24'].map(t => H('span', { key: t }, t))))))
      }


      const balanceOk = state.balance.status === 'ok' && state.balance.total !== null
      const balanceVal = balanceOk
        ? formatMoney(state.balance.total, config?.decimals, config?.symbol)
        : t('noData')
      const todayVal = state.todayCost === null
        ? t('noData')
        : formatMoney(state.todayCost, config?.decimals, config?.symbol)

      return H('div', { className: 'vm-root', ref: rootRef },
        H('div', { className: 'vm-stats' },
          H('div', { className: 'vm-cell', onClick: () => { if (api?.refreshBalance) void api.refreshBalance() } },
            config?.showBalanceTitle !== false ? H('div', { className: 'vm-cell-title' }, t('balance')) : null,
            H('div', { className: 'vm-cell-value' }, balanceVal)),
          H('div', { className: 'vm-cell' },
            config?.showTodayTitle !== false ? H('div', { className: 'vm-cell-title' }, t('today')) : null,
            H('div', { className: 'vm-cell-value' }, todayVal))),
        H('div', { className: 'vm-card ' + styleCls }, ...children))
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
      const cur = (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) * 1000
      return `${(cur / dayMs * 100).toFixed(2)}%`
    }
    // 把 UTC 峰时段窗口映射成 24h 时间轴的绝对位置(%字符串)。
    function dayPeakSegments(windows) {
      const segs = []
      if (!Array.isArray(windows)) return segs
      for (const w of windows) {
        const start = Number(w?.start)
        const end = Number(w?.end)
        if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) continue
        // 跨午夜窗口拆分成两段。
        const ranges = start < end ? [[start, end]] : [[start, 24], [0, end]]
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
      // 自调度轮询:每次 reload 后按 balanceRefreshSec(默认 15s)安排下一次,
      // 改小该值立即生效,余额刷新更实时。
      let pollTimer = null
      const schedulePoll = () => {
        const cur = store.getSnapshot().state
        const sec = Math.max(3, Number(cur?.config?.balanceRefreshSec) || 15)
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

      // 卡片固定挂载于侧边栏底部(sidebar.footer.action,scope:root,常驻)。
      // 注册方式与 dsh-cost-meter 完全一致:get(slots) + inject(slotName, cb)。
      const registerCard = () => {
        const slotName = 'sidebar.footer.action'
        const slots = ctx.get('slots')
        if (slots === undefined) return () => {}
        try {
          return slots.inject(slotName, () => {
            return slots.register(
              { name: slotName, id: 'valley-meter', order: 5, inject: injected }, ValleyCard)
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
            locale: locale,
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
      } catch (e) { console.log('[dsh-valley-meter] apply failed:', String(e)) }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
