# Peak-Valley Meter (dsh-valley-meter)

<div align="center">

**DeepSeek Harness peak/valley electricity meter: off-peak countdown, balance & spend**

Balance-number chip · hover 24h peak/valley timeline · 5s official balance refresh · independent spend metering. 10 curated muted color presets plus custom valley/peak colors, all-Chinese UI.

[![version](https://img.shields.io/badge/version-0.1.0-4176E6)](https://github.com/uckkk/dsh-valley-meter)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![dsh](https://img.shields.io/badge/DeepSeek%20Harness-dsh--plugin-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | [中文](README.md)

</div>

![balance-number chip](docs/preview.png?v=4)

**Hover to reveal the peak/valley timeline**

![hover state](docs/screenshots/hover.png)

## What it is

A **minimal** DeepSeek Harness plugin that shows a low-key **balance-number chip** at the top-right of the composer; hovering reveals a **24-hour peak/valley timeline** to its left:

| Readout | Description |
|---|---|
| **Balance chip** | Shows only the official account balance by default (the plugin queries `/user/balance` itself, refreshed every 5 seconds) |
| **Peak/Valley timeline** | A 24h horizontal bar revealed on hover: Peak (orange) / Valley (blue) segments, a glowing white marker at the current local time, with 00/06/12/18/24 ticks above |
| **Today's spend** | Current-day cost (the plugin listens to `llm/stream` and meters in real time into its ledger) |

## Key features

- **Color presets**: 10 curated muted presets (One Dark / Dracula / Nord / Tokyo Night / Gruvbox / Solarized + traditional Chinese & Pantone), or custom valley/peak colors via pickers.
- **Hover to reveal**: only the balance number shows by default; the timeline appears on hover without taking composer space.
- **Live balance**: official balance refreshes every 5 seconds automatically.
- **Local-timezone timeline**: peak/valley windows (UTC) are converted to local time; a glowing white marker shows the current moment.
- **Fully independent, real-time metering**: the plugin listens to `llm/stream` itself to capture usage, converts it to cost with its own price table, queries the DeepSeek official balance itself, and maintains its own ledger (`~/.dsh/storages/valley-meter/ledger.json`). It depends on no other plugin.

## Install

```bash
dsh plugin --profile web add <package-path>
```

Then reload the dsh web page to see the card.

## Configuration

Open **Settings → Peak-Valley Meter**:

- **Color presets**: 10 presets (6 editor themes + 4 traditional Chinese / Pantone) or "Custom".
- **Valley color / Peak color**: color pickers, applied instantly when Custom is selected.
- **Balance title** / **Today title** / **Show countdown**: independent toggles.

Config is written to `~/.dsh/storages/valley-meter/config.json`.

## Data source

The plugin meters and queries on its own, with no dependency on other plugins:

- **Today's spend**: listens to `llm/stream` to capture each call's usage, converts it with the built-in model price table (peak/valley tiers) plus the peak/valley windows, and writes it to its own ledger `~/.dsh/storages/valley-meter/ledger.json`.
- **Account balance**: queries the DeepSeek official `/user/balance` endpoint with the DSH credentials / `DEEPSEEK_API_KEY`; refreshed automatically every 5 seconds.
- **Peak/valley windows**: the plugin's own config (default UTC 01–04, 06–10), adjustable in settings.

When no API key is configured the balance shows "No data" while today's cost keeps accumulating — it never errors.

## Development

```bash
pnpm install
pnpm run build   # build lib/client.js bundle
pnpm run check   # typecheck + test + build
```

## License

MIT
