# Peak-Valley Meter (dsh-valley-meter)

<div align="center">

**DeepSeek Harness peak/valley meter · balance badge + hover peak/valley timeline**

Balance-number chip · hover 24h peak/valley timeline · 5s official balance refresh · independent spend metering — 10 curated muted color presets plus custom valley/peak colors, all-Chinese UI.

[![npm version](https://img.shields.io/npm/v/dsh-valley-meter)](https://www.npmjs.com/package/dsh-valley-meter)
[![npm downloads](https://img.shields.io/npm/dm/dsh-valley-meter)](https://www.npmjs.com/package/dsh-valley-meter)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-dsh--plugin-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | [中文](README.md)

</div>

![balance-number chip](docs/preview.png?v=5)

**Hover to reveal the peak/valley timeline**

![hover state](docs/screenshots/hover.png)

![hover demo](docs/demo.gif)

## What it is

A **minimal** DeepSeek Harness plugin that shows a low-key **balance-number chip** at the top-right of the composer; hovering reveals a **24-hour peak/valley timeline** to its left:

| Readout | Description |
|---|---|
| **Balance chip** | Shows only the official account balance by default (the plugin queries `/user/balance` itself, refreshed every 5 seconds). Two groups inside: the currency symbol and the number — nothing else by default. |
| **Peak/Valley timeline** | A 24h horizontal bar revealed on hover: Peak (orange) / Valley (blue) segments, a glowing white marker at the current local time, with 00/06/12/18/24 ticks above; on weekends the whole bar is off-peak blue |
| **Today's spend** | Current-day cost (the plugin listens to `llm/stream` and meters in real time into its ledger) |

## Key features

- 💳 **One-click top-up**: clicking the currency symbol inside the chip opens the official DeepSeek top-up page (`platform.deepseek.com/top_up`) in a new tab. Hovering the chip fades in a circular backdrop under the symbol whose left arc coincides exactly with the chip's own left rounded edge.
- 🎨 **Color presets**: 10 curated muted presets (One Dark / Dracula / Nord / Tokyo Night / Gruvbox / Solarized + traditional Chinese & Pantone), or custom valley/peak colors via pickers.
- 👆 **Hover to reveal**: only the balance number shows by default; the timeline appears on hover without taking composer space.
- ⚡ **Live balance**: official balance refreshes every 5 seconds automatically.
- 🕐 **Local-timezone timeline**: peak/valley windows (UTC) are converted to local time; a glowing white marker shows the current moment.
- 🗓️ **Weekend all off-peak (official rule)**: since 2026-08-23 00:00 (Beijing time) Saturday and Sunday are billed at the off-peak price all day. The plugin decides by **Beijing time**, shows an all-valley timeline on those days, meters spend at the off-peak tier (no more double-charging weekends at peak rates) and counts down to Monday 09:00. Can be turned off in the settings panel.
- 🔌 **Fully independent, real-time metering**: the plugin listens to `llm/stream` itself to capture usage, converts it to cost with its own price table, queries the DeepSeek official balance itself, and maintains its own ledger (`~/.dsh/storages/valley-meter/ledger.json`). It depends on no other plugin.

## Install

```bash
# npm (recommended)
npm install dsh-valley-meter

# or install straight from GitHub
dsh plugin add github:uckkk/dsh-valley-meter
```

Then reload the dsh web page to see the balance-number chip.

## Configuration

Open **Settings → Peak-Valley Meter**:

- **Color presets**: 10 presets (6 editor themes + 4 traditional Chinese / Pantone) or "Custom".
- **Valley color / Peak color**: color pickers, applied instantly when Custom is selected.
- **Balance title** / **Today title** / **Show countdown**: independent toggles.
- **Weekend all off-peak**: on by default. Since 2026-08-23 the official rule bills Saturday and Sunday at the off-peak price all day; turn this off to fall back to plain peak/valley windows on weekends.

Config is written to `~/.dsh/storages/valley-meter/config.json`.

## Data source

The plugin meters and queries on its own, with no dependency on other plugins:

- **Today's spend**: listens to `llm/stream` to capture each call's usage, converts it with the built-in model price table (peak/valley tiers) plus the peak/valley windows, and writes it to its own ledger `~/.dsh/storages/valley-meter/ledger.json`.
- **Account balance**: queries the DeepSeek official `/user/balance` endpoint with the DSH credentials / `DEEPSEEK_API_KEY`; refreshed automatically every 5 seconds.
- **Peak/valley windows**: built into the plugin (default UTC 01–04, 06–10 = Beijing 09:00–12:00 and 14:00–18:00) and stored as `peakWindows` in config.json; the settings panel only exposes the weekend-rule toggle, not a window editor.
- **Weekend rule**: since 2026-08-23 00:00 Beijing time, Saturday and Sunday are billed at the off-peak price all day. On weekdays the peak hours are Beijing 9:00–12:00 and 14:00–18:00, and the off-peak price is half the peak price. The weekend test is done in Beijing time, and moments before the rule took effect still use the old windows.

When no API key is configured the balance shows "No data" while today's cost keeps accumulating — it never errors.

## Development

```bash
pnpm install
pnpm run build   # build lib/client.js bundle
pnpm run check   # typecheck + test + build
```

## License

MIT
