# dsh-valley-meter

<div align="center">

**DeepSeek Harness minimal valley / peak widget**

Live off-peak countdown · period badge · official account balance · today's spend. Customizable valley color, numbers-only minimal mode, and switchable minimal ↔ detailed styles.

[![version](https://img.shields.io/badge/version-0.1.0-4176E6)](https://github.com/uckkk/dsh-valley-meter)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![dsh](https://img.shields.io/badge/DeepSeek%20Harness-dsh--plugin-4176E6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | [中文](README.md)

</div>

![card](docs/preview.png?v=2)

## What it is

A **minimal** DeepSeek Harness plugin that shows a single compact dark card under the composer (or in the sidebar footer) with the numbers you care about most:

| Readout | Description |
|---|---|
| **Off-peak countdown** | Live HH:MM:SS countdown to the next valley/peak switch |
| **Period badge** | Whether it's currently Peak or Valley, plus the countdown target |
| **Peak/Valley bar** | Peak (orange) / Valley (blue) segments with a marker at the current time |
| **Account balance** | Official platform balance (the plugin queries `/user/balance` itself) |
| **Today's spend** | Current-day cost (the plugin listens to `llm/stream` and meters in real time) |

## Key features

- **Customizable valley color**: change the valley (or peak) color in settings, previewed live on the card.
- **Numbers-only minimal mode**: hide the title for balance and/or today's spend and show only the number.
- **Switchable styles**: **Detailed card** ↔ **Minimal** (tighter, core numbers only).
- **Switchable position**: sidebar footer / under the composer (dock) / off.
- **Fully independent, real-time metering**: the plugin listens to `llm/stream` itself to capture usage, converts it to cost with its own price table, queries the DeepSeek official balance itself, and maintains its own ledger (`~/.dsh/storages/valley-meter/ledger.json`). It depends on no other plugin.

## Install

```bash
dsh plugin --profile web add <package-path>
```

Then reload the dsh web page to see the card.

## Configuration

Open **Settings → Peak / Valley**:

- **Valley color / Peak color**: color pickers, applied instantly.
- **Style**: `card` (detailed) / `minimal`.
- **Position**: composer footer / sidebar footer / off.
- **Balance title** / **Today title**: disable for numbers-only minimal mode.
- **Show period badge** / **Show countdown**: independent toggles.

Config is written to `~/.dsh/storages/valley-meter/config.json`.

## Data source

The plugin meters and queries on its own, with no dependency on other plugins:

- **Today's spend**: listens to `llm/stream` to capture each call's usage, converts it with the built-in model price table (peak/valley tiers) plus the peak/valley windows, and writes it to its own ledger `~/.dsh/storages/valley-meter/ledger.json`.
- **Account balance**: queries the DeepSeek official `/user/balance` endpoint with the DSH credentials / `DEEPSEEK_API_KEY`; click the balance cell to refresh.
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
