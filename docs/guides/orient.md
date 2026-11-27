# orient：驾驭者七问（白话入口）

> 什么时候读：第一次接管、或想用白话理解这家公司在做什么时。
> 这页给**驾驭本仓库的人**：七问各一跳直达唯一家，正文只导航不复述事实。维护本仓库的 Coding Agent 从 [AGENTS.md](../../AGENTS.md) 进。
> 词表：「观察窗」=「驾驶舱」=「驾驶座」同指人侧 Web 窗口；活跃调研在 `_backlog/research/`，外部研究材料登记在 [external.md](../reference/external.md)。

## 一问：这仓库是什么？

一句话：一个 DSH 插件包（`company-pack`；DSH = DeepSeek Harness，钉在 `vendor/dsh` 子模块）扮演一家梦之队（Dream Team）虚拟公司；各角色是独立 preset，跑在 DSH 会话里，你通过 Web 观察窗驾驭。

→ 全貌：[README](../../README.md) · 文档总入口：[docs/README.md](../README.md)

## 二问：怎么跑起来？

白话三步：进开发环境（`source run/env.sh`）→ 起公司（`pnpm company …`）→ 浏览器开门（token URL 在启动横幅里读）。**headless 只证明 CLI 能跑，不是公司运行。**

→ 唯一步步骤：[演示 runbook](./demo-scenes.md#前置本机)

## 三问：改东西从哪进？

按你要改的面选入口：角色内容（persona/skills）→ [presets.md](../contracts/presets.md)；host / Web 代码 → [src/README](../../packages/company-pack/src/README.md)；流程与授权 → [开发环](./dev-loop.md)。

→ 总入口表：[docs/README.md](../README.md)

## 四问：测试资产在哪、怎么选？

三层：**秒级回归**（`pnpm test`）→ **真实入口冒烟**（[检查索引](../../checks/README.md)）→ **录制回放与证据**（[snapshots](../../snapshots/README.md)）。改完东西按改动面选最窄检查。

→ 查表：[tests/README「改动面 → 最窄检查」](../../tests/README.md) · 证据宪法：[testing.md](../testing.md)

## 五问：怎么知道「做完了」且质量可靠？

四条链各要独立证据，前一条绿不豁免后一条：**挂得上 → 行为对 → 装得上 → 已获批**——机器全绿只证断言通过，「做的是不是这件事」由语义审和你验收把关。

→ 细则：[开发环 §2 完成判断链](./dev-loop.md#2-执行链从授权到有证据交接) + [policy §P5 语义审最小清单](../policy.md) · 双向反查：[tests/README](../../tests/README.md) / [snapshots 索引](../../snapshots/README.md)。

## 六问：agent loop、skills、运行态、公司状态 在哪？

- **loop 本体不在本仓库**——它在 [vendor/dsh](../../vendor/dsh/)（钉版本、只读）；本仓只拥有喂给 loop 的输入（preset、skills、patch）和接住 loop 的输出（会话日志、workspace、证据）。
- **skills**：`packages/company-pack/presets/<角色>/skills/`——盘上可见，一角色一目录。
- **运行态**：[runtime/](../../runtime/README.md)（gitignored）；一条命令看全景：`source run/env.sh && pnpm orient`（不 source 会读日用 home）。
- **公司状态（workspace 单元）**：用户 workspace + `<workspace>/.dsh-company/`（v3；`bundle.json` 为 legacy 文件名），不进 git；home 只留 DSH 运行时与 host 治理。
- **run trace（四件套）**：代码与组合 / DSH 运行状态 / 会话 cwd / 证据——`pnpm orient` 默认全景直接展示，`pnpm orient --scenario replay/foundation-workspace` 按需算视图。

→ 时序与四条状态轴：[architecture.md §2](../architecture.md#2-完整-web-运行链时序与四条状态轴)

## 七问：我驱动一轮，该在哪几脚踩刹车？

四个介入点，其余默认不打扰你：
- **立项脚**：批 RFC = 定验收（验收原文写清「怎么测」，质量杠杆最重的一脚）。
- **实施脚**：红绿环自跑，不拉你。
- **收口脚**：收**轮次回执**（六行固定形状，唯一家 = [close-out skill](../../.agents/skills/close-out-definition/SKILL.md)），对照授权原文验收。
- **体验脚**：实例 + 走查单等人侧四件套（[policy §P5](../policy.md)）。

## 现在就想看点什么？

`source run/env.sh && pnpm orient`——keyless、秒级、只读：当前 home、在场 profiles、最近会话、公司盘概览、run trace 四件套、待核工作候选与便宜检查清单。不用为了「看看现在什么状态」拉起整个公司。
