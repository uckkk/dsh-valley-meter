# 峰谷电表 dsh-valley-meter

<div align="center">

**DeepSeek Harness 峰谷电表 · 余额徽章 + 悬停峰谷时间轴**

**已适配 DSH 0.2（0.2.1-rc.2）** · 余额数字徽章 · 悬停 24 小时峰谷时间轴 · 官方余额 5 秒刷新 · 今日消耗独立计费 — 10 套沉稳配色预置 + 谷/峰色自定义，全中文界面。

[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.1--rc.2-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | 中文

</div>

![余额数字徽章](docs/preview.png?v=5)

**悬停浮现峰谷时间轴**

![悬停态](docs/screenshots/hover.png)

![悬停展开演示](docs/demo.gif)

## 这是什么

一个**极简**的 DeepSeek Harness 插件,在输入框右下角(底栏)挂一枚低调的**余额数字徽章**;光标悬停时,沿输入卡片下沿整行浮现一条 **24 小时峰谷时间轴**:

| 读数 | 说明 |
|---|---|
| **余额数字徽章** | 默认只显示官方账户余额数值(插件独立查询 `/user/balance`,每 5 秒自动刷新);框内分「¥」「数值」两组,默认无任何多余元素 |
| **峰谷时间轴** | 悬停时沿输入卡片下沿(底栏上缘)整行浮现的 24 小时横向时间轴:峰段(橙) / 谷段(蓝)双色 + 白色发光指针标当前本地时刻,00/06/12/18/24 刻度在上方;周末全天低谷时整条轴为谷色 |
| **今日消耗** | 当日费用(插件独立监听 `llm/stream` 实时计费,写入账本) |

## DSH 0.2 兼容性

0.2 的插件内核与 0.1 有破坏性变化,0.2.0 已逐项适配:

- **Typert 清单**:0.2 的 `typert-loader` 要求每个 invocation 的 codec 都是 strict codec,并带 `create()` 工厂。改为 `createTypertRemoteInfo()` 组装,与服务端/客户端两套注册表完全一致。
- **客户端 RPC 贡献**:0.2 的 Client Typert 注册表同样要求 result / parameter codec 带 `create()`;`$mount(contribution)` 的约定未变,但旧的 `{mode,typeSymbol,schema}` 形态会被拒绝。
- **`settings` 服务**:0.2 只保留 `describe/update/configure`(表单),移除了 `get(ns)`;余额查询不再读设置分节,改为 `credentials.resolve()` + `DEEPSEEK_BASE_URL` / 内置官方端点。
- **`dsh.client` 声明**:0.2 把「模块依赖」拆成 `dsh.client.inject` / `dsh.client.external`;本插件只依赖平台内置的 `react`,不再声明已不存在的 `dsh-client-runtime` / `dsh-client-ui-slots`。
- **设置分区文案**:0.2 的 slot 渲染器会按 `entry.locale`(语言命名空间)注入 `t`;插件自带函数型文案,因此不声明 `locale`,改在 inject face 里自带 `t`,避免文案变成 key。
- **包清单**:新增 `dsh.manifestVersion: 1` 与 `engines.dsh: ">=0.2.0-rc.1"`,插件管理器会据此做安装前兼容性检查。
- **模型价格表**:补上 0.2 官方模型 id `deepseek-flash`(DeepSeek-V4.1-Flash),保留 `deepseek-v4-pro` 与旧 id 兼容项。

## 核心特性

- 💳 **一键充值**:点击框内的人民币符号「¥」即在新页签打开 DeepSeek 官方充值页(`platform.deepseek.com/top_up`),余额不够时不用再翻菜单找入口;光标移入徽章时,¥ 身下会浮现一枚圆形底色,其左侧与徽章左端圆角完全重合。
- 🎨 **配色方案**:内置 10 套沉稳配色预置(One Dark / Dracula / Nord / Tokyo Night / Gruvbox / Solarized + 中国传统色 / 潘通),也可用拾色器自定义谷色 / 峰色,改完即时生效。
- 👆 **悬停即见**:默认只显示余额数字;光标悬停时时间轴沿输入卡片下沿整行浮现,不占输入区空间。
- ⚡ **实时余额**:官方余额每 5 秒自动刷新,无需手动操作。
- 🕐 **本地时区时间轴**:峰/谷时段按 UTC 窗口自动换算成本地时区显示,白色发光指针标当前时刻。
- 🗓️ **周末全天低谷(官方规则)**:2026-08-23 00:00 起,周六、周日全天不再区分峰谷,统一按低谷价计费。插件按**北京时间**判断周末,当天整条时间轴显示为谷色,计费自动走低谷价(不会再把周末按高峰价多算一倍);倒计时直接指向下周一 09:00 的首个峰时。可在设置面板关闭该规则。
- 🔌 **完全独立、实时计费**:插件自己监听 `llm/stream` 捕获用量、按官方价格折算费用,自己查询 DeepSeek 官方余额,自己维护账本(`~/.dsh/storages/valley-meter/ledger.json`),**不依赖任何其它插件**。

## 安装

### 方式一:本地 link 安装(开发/自用)

```bash
# 在插件仓库根目录
pnpm install

# 把插件挂进当前 profile(以桌面版 desktop 为例;dsh web 用 web)
dsh plugin --profile desktop add link:/absolute/path/to/dsh-valley-meter
```

然后在 profile 的 `cordis.patch.yml` 末尾加一行(或使用插件管理器选中该 bundle):

```yaml
- insert:
    - id: valley-meter
      name: dsh-valley-meter
```

HMR 会重组合配置,浏览器自动加载新的 client bundle,无需重启。

### 方式二:市场安装

DSH 0.2 的插件市场是自托管的 format-1 索引。本仓库的索引已托管在 GitHub Pages:

```text
https://uckkk.github.io/dsh-valley-meter/market/index.json
```

打开 **插件 → 更多 → 自定义插件市场** → **发现 → 添加索引源**,粘贴上面的 URL,
即可在「发现」页搜索「峰谷 / valley / balance」并一键安装。索引当前锁定 Git commit
(GitHub 源),不依赖 npm 是否已发布。

也可以直接命令行安装:

```bash
dsh plugin --profile desktop add "git+https://github.com/uckkk/dsh-valley-meter.git#<commit>"
```

版本发布到 npm 后,索引里的 `source` 可切换为 `{ "type": "npm" }`,届时
`dsh plugin add dsh-valley-meter@0.2.0` 也可用。

## 配置

打开 **设置 → 峰谷电表**:

- **配色方案**:10 套预置(编辑器主题 6 套 + 中国传统色 / 潘通 4 套)或「自定义」。
- **谷时颜色 / 峰时颜色**:拾色器,选「自定义」后即时生效。
- **余额显示标题** / **今日花费显示标题** / **显示倒计时**:分别开关。
- **周末全天低谷**:默认开启。官方 2026-08-23 起周六、周日全天按低谷价计费;若官方规则再变,可在此关闭,关闭后周末恢复按峰谷窗口计费。

配置写入 `~/.dsh/storages/valley-meter/config.json`。

## 数据来源说明

本插件**独立计费与查询**,不依赖任何其它插件:

- **今日费用**:监听 `llm/stream` 捕获每次调用的 usage,按内置模型价格表(含峰/谷两档)+ 峰谷时段折算,写入自己的账本 `~/.dsh/storages/valley-meter/ledger.json`。
- **账户余额**:通过 DSH 0.2 的 `ctx.credentials.resolve('DEEPSEEK_API_KEY')` 读取凭据(每次操作重新解析,轮换 key 无需重启),查询 DeepSeek 官方 `/user/balance`,每 5 秒自动刷新。
- **峰谷窗口**:内置于插件(默认 UTC 01–04、06–10 = 北京时间 09:00–12:00、14:00–18:00),写在 config.json 的 `peakWindows` 里;设置面板目前只提供周末规则开关,不提供窗口编辑器。
- **周末规则**:官方 2026-08-23 00:00(北京时间)起,周六、周日全天统一按低谷时段价格计费;工作日高峰为北京时间 9:00–12:00 与 14:00–18:00,低谷价为高峰价的一半。插件按北京时间判定周末,生效前的时刻仍按原规则计算。

未配置 API Key 时,余额显示「暂无数据」,今日费用仍正常累计,不会报错。

## 开发

```bash
pnpm install
pnpm test    # node:test:峰谷/周末/计费 + Typert 清单/编解码
pnpm build   # 产物一致性检查(手写 bundle,无打包步骤)
pnpm check   # 语法检查 + test + build
```

`lib/` 是手写产物:`lib/index.js`(Host)、`lib/typert.host.js`(Typert 清单)、
`lib/client.js`(浏览器单文件 bundle)。`build.mjs` 校验清单/导出/注册 id 与 strict codec,
不会重新打包。

## License

MIT
