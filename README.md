# 峰谷电表 dsh-valley-meter

<div align="center">

**DeepSeek Harness 峰谷电表 · 波谷倒计时与余额读数**

峰谷实时倒计时 · 时段徽标 · 官方账户余额 · 今日消耗 — 谷色可自定义,余额/花费纯数字极简模式,极简 ↔ 详细样式自由切换。

[![version](https://img.shields.io/badge/version-0.1.0-4176E6)](https://github.com/uckkk/dsh-valley-meter)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![dsh](https://img.shields.io/badge/DeepSeek%20Harness-dsh--plugin-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

English | **中文**

</div>

![卡片示意](docs/preview.png?v=4)

## 这是什么

一个**极简**的 DeepSeek Harness 插件,在输入框下方(或侧边栏底部)挂一张深色圆角卡片,一屏集中在最关心的几个数字:

| 读数 | 说明 |
|---|---|
| **波谷倒计时** | 距下一次进入谷时/峰时的倒计时(HH:MM:SS),实时跳动 |
| **时段徽标** | 当前是「峰时」还是「谷时」,以及倒计时目标 |
| **峰谷进度条** | 峰段(橙) / 谷段(蓝)双色 + 当前时刻白色指针 |
| **账户余额** | 官方开放平台账户余额(插件独立查询 `/user/balance`) |
| **今日消耗** | 当日费用(插件独立监听 `llm/stream` 实时计费) |

## 核心特性

- **谷时颜色自定义**:在设置中改谷色(或峰色),卡片实时预览。
- **纯数字极简模式**:余额 / 今日花费可各自隐藏标题,只留数字。
- **样式自由切换**:**详细卡片** ↔ **极简**(更紧凑、只留核心数字)两套样式。
- **位置可切**:侧边栏底部(footer) / 输入框下方(dock) / 关闭(off)。
- **完全独立、实时计费**:插件自己监听 `llm/stream` 捕获用量、按官方价格折算费用,自己查询 DeepSeek 官方余额,自己维护账本(`~/.dsh/storages/valley-meter/ledger.json`),**不依赖任何其它插件**。

## 安装

```bash
# 在 web profile 中安装(把 <包路径> 换成该插件包的本地路径或 npm 包名)
dsh plugin --profile web add <包路径>
```

然后重启 dsh web 页面即可看到卡片。

## 配置

打开 **设置 → 峰谷小组件**:

- **谷时颜色 / 峰时颜色**:拾色器,改完即时生效。
- **样式**:`card`(详细卡片)/ `minimal`(极简)。
- **显示位置**:composer 下方 / sidebar 底部 / 关闭。
- **余额显示标题** / **今日花费显示标题**:关闭即纯数字极简模式,只显示数值。
- **显示时段徽标** / **显示倒计时**:分别开关。

配置写入 `~/.dsh/storages/valley-meter/config.json`。

## 数据来源说明

本插件**独立计费与查询**,不依赖任何其它插件:

- **今日费用**:监听 `llm/stream` 捕获每次调用的 usage,按内置模型价格表(含峰/谷两档)+ 峰谷时段折算,写入自己的账本 `~/.dsh/storages/valley-meter/ledger.json`。
- **账户余额**:用 DSH 凭据库/`DEEPSEEK_API_KEY` 查询 DeepSeek 官方 `/user/balance`;点击卡片余额可手动刷新。
- **峰谷窗口**:插件自身配置(默认 UTC 01–04、06–10),可在设置里调整。

未配置 API Key 时,余额显示「暂无数据」,今日费用仍正常累计,不会报错。

## 开发

```bash
pnpm install
pnpm run build   # 构建 lib/client.js bundle
pnpm run check   # typecheck + test + build
```

## License

MIT
