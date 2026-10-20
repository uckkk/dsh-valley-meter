# Changelog

## 0.2.0 (2026-10-20)

适配 DSH 0.2（0.2.1-rc.2，最新官方版）。

- **底栏布局重排**:余额徽章从输入框上方移到输入框右下角(底栏),并进一步改为**纯文字余额**(无背景框/边框,13px、字重 600,与状态行一致);整枚文字都是充值链接,点击新页签打开官方充值页。
- **余额告警色**:<¥10 橙色、<¥5 红色、<¥2 红色闪烁(`prefers-reduced-motion` 下不闪)。
- **时间轴长度**:从卡片全宽改为**卡片宽度的 80%**、右对齐;新增 `vm-trackfill` 圆角裁切层,轨道四角圆角且指针光晕不被裁掉。
- **挂载点调整**:客户端注册从 `conversation.input.dock` 改为 `conversation.composer.dock`,并以运行时测量的输入卡片左右缘收窄覆盖层(宽窗口下 seat 比卡片宽),徽章/时间轴严格贴卡片边缘。
- **修复 HMR 样式不更新**:移除 `__vmStylesAdopted` 一次性守卫,每次 apply 都写回当前 bundle 的 `<style>`;此前改版 CSS 在同一页面永远不会生效。

- **Typert 清单升级**:0.2 的 `typert-loader` 要求每个 invocation 的 codec 为 strict codec 且带 `create()` 工厂。`lib/typert.host.js` 改用 `createTypertRemoteInfo()` 组装,`TYPERT.invocations` 直接返回 `$remote.descriptors`;已用 0.2 的真实 `validateTypertManifest()` 通过校验。
- **客户端 RPC 修复**:0.2 的 Client Typert 注册表同样要求 result / parameter codec 带 `create()`(`validateCodec`)。旧的 `{mode,typeSymbol,schema}` 会被拒绝,改为 `create: () => ({ parse })`。
- **`settings` 服务变更**:0.2 移除了 `settings.get(ns)`,只保留表单 `describe/update/configure`。余额查询改用 `credentials.resolve()` + `DEEPSEEK_BASE_URL`(或配置 `baseURL`)+ 内置官方端点,不再依赖设置分节。
- **`dsh.client` 声明**:移除已不存在的 `@deepseek-ai/dsh-client-runtime` / `dsh-client-ui-slots` 模块声明;插件只用平台内置的 `react`。
- **设置分区文案**:不再把语言 id 当作 locale 命名空间(0.2 会据此注入 `t` 并覆盖自带文案);改由 inject face 自带 `t`,`locale/change` 时重注册。
- **包清单**:新增 `dsh.manifestVersion: 1`、`engines.dsh: ">=0.2.0-rc.1"`;`dshhub.compatibility` 同步到 0.2。
- **依赖升级**:`@deepseek-ai/dsh-typert-protocol` → `0.2.1-rc.2`,`zod` → `^4.4.3`;移除失效的 client 侧 peer。
- **模型价格表**:新增 `deepseek-flash`(DeepSeek-V4.1-Flash),保留 `deepseek-v4-pro` 与旧 id 兼容项;usage 同时兼容 `usage` 与 `finish` chunk。
- **工程化**:补 `build.mjs`(产物一致性 + strict codec 校验)、`test/`(node:test,10 项)、`pnpm check`;修复 `package.json` 中重复的 `colorPreset` 键。
- **本地验证**:在 DSH 0.2.1-rc.2 桌面版(profile `desktop`)link 安装,Host 服务、官方余额(¥12.59)与客户端轮询 `getState` 均正常。

## 0.1.6 (2026-09-15)

- 同步 `dsh.plugin.json` 里的版本与描述(此前停留在 0.1.0,且描述里还写着已经不存在的「极简/详细样式切换」)。
- README 更正:峰谷窗口内置于插件(config.json 的 `peakWindows`),设置面板只提供周末规则开关,并没有窗口编辑器 —— 原文写成「可在设置里调整」,与实现不符。

## 0.1.5 (2026-09-15)

- **修复周末电价算错(用户 issue #1)**:官方自 2026-08-23 00:00(北京时间)起,周六、周日全天不再区分峰谷时段,统一按低谷时段价计费。此前插件每天套用同一套峰谷窗口,导致周末被当作峰时——不仅时间轴误标,`account()` 还会按高峰价计费,把周末花费多算一倍。
- 新增按**北京时间**判定的周末全天低谷:日历与计费都走低谷档,当天时间轴整条显示为谷色(不画橙段),倒计时直接指向下周一 09:00 的首个峰时。
- 周末判定按「每个候选时刻」计算而非「当前时刻」:周五晚间查询也能正确跳过周末两天的窗口,最近切换点会跨越 63 小时(周五 18:00 → 周一 09:00),倒计时不再断裂。
- 修复峰谷切换点计算只取窗口单侧的缺陷:此前 `prev` 只取窗口起点、`next` 只取窗口终点,导致谷时段算不出「何时进峰」、且下个切换点可能取错。
- 跨午夜的长峰段若尾部撞上周末,现在会在周末 00:00 处截断。
- 新增设置开关「周末全天低谷」(默认开启),官方规则再变时可一键关闭,关闭后周末恢复按峰谷窗口计费。
- 补充测试:50 项峰谷/周末逻辑用例 + 24 项周末 UI 与两端编解码用例。

## 0.1.1 (2026-09-06)

- 移除悬浮面板,UI 精简为「余额数字徽章 + 悬停峰谷时间轴」:默认只显示官方余额数字,光标悬停时在左侧浮现 24h 峰谷时间轴。
- 峰谷时间轴:峰橙/谷蓝时段、白色发光指针标当前本地时刻、00/06/12/18/24 刻度在上方。
- 官方余额每 5 秒自动刷新;今日消耗独立计费(监听 `llm/stream`,写入账本)。
- 内置 10 套配色预置(编辑器主题 6 套 + 中国传统色/潘通 4 套),支持谷色/峰色自定义。
- README/描述统一到当前 UI(去除已不存在的「按小时消耗方块阵列」「样式切换」「位置切换」等旧说法)。

## 0.1.0 (2026-08-22)

- 首个版本:波谷倒计时小组件。
- 极简卡片:峰谷实时倒计时、时段徽标、峰/谷双色进度条(当前时刻指针)、官方账户余额、今日消耗。
- 谷时颜色/峰时颜色可在设置中自定义(实时预览)。
- 余额 / 今日花费支持纯数字极简模式(隐藏标题)。
- 极简 ↔ 详细两套样式,可自由切换。
- 复用 dsh-cost-meter 账本(峰谷窗口、官方余额、今日费用),账本缺失时优雅降级。
