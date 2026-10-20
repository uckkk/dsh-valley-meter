# dsh-valley-meter 插件市场索引

DSH 0.2 的**插件市场**是一个静态 JSON 索引（format 1），由「发现」页读取：
**插件 → 更多 → 自定义插件市场**（打开实验性组合包）→ **发现 → 添加索引源**。

> DSH 官方不内置任何市场索引，也没有中心化「官方市场」；官方提供的是索引格式与
> 参考生成器，索引由插件作者自行托管。DSH 0.2 的官方文档：
> <https://deepseek-harness.github.io/deepseek-harness/guide/plugin-market>

本目录就是本插件的索引源：

| 文件 | 用途 |
|---|---|
| `index.json` | format 1 索引，列出 `dsh-valley-meter` 的 0.2.0 版本（Git source，锁定 commit） |
| `icon.svg` | 相对索引解析的插件图标 |

## 添加索引源

索引托管在 GitHub Pages：

```text
https://uckkk.github.io/dsh-valley-meter/market/index.json
```

或直接使用仓库 raw 地址（无重定向，DSH 同样接受）：

```text
https://raw.githubusercontent.com/uckkk/dsh-valley-meter/main/market/index.json
```

添加后即可在「发现」页搜索「峰谷 / valley / balance」并安装。

## 安装目标

索引里的 Git 版本会被 DSH 转成：

```bash
git+https://github.com/uckkk/dsh-valley-meter.git#<40-hex-commit>
```

当前锁定 commit 见 `index.json` 的 `versions[0].source.commit`。

## 发布新版本

1. 修改 `package.json` 的 `version` 并更新 `CHANGELOG.md`；
2. `pnpm check` 通过后提交并推送；
3. 用新 commit 与版本更新本目录 `index.json` 的 `versions`，必要时补 `engines.dsh`；
4. 如果已发布到 npm，可把该版本改为 `{ "type": "npm" }`（DSH 会安装
   `dsh-valley-meter@<version>`，并沿用用户配置的 registry）。

索引可用 `@deepseek-ai/dsh-plugin-market-index` 的 `parseMarketIndex()` 在发布前校验。
