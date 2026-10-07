# orient：驾驭者五问（白话入口）

> 这页给**驾驭本仓库的人**：五问各一跳直达唯一家。正文只导航与白话定义，不复述事实（防漂）；
> 一切细节以链接目标为准。维护本仓库的 coding agent 从 [AGENTS.md](../AGENTS.md) 进。

## 一问：这仓库是什么？

一句话：一个 DSH 插件包（company-pack）扮演一家五角色虚拟公司——wochen；CEO、VP-Eng、VP-Sales、
COO、CFO 各自是独立 preset，跑在 DSH 会话里，你通过 web 观察窗驾驭。

→ 全貌：[README](../README.md) · 空间导航：[项目地图](project-map.md)

## 二问：怎么跑起来？

白话三步：进开发环境（`source run/env.sh`）→ 起观察窗（`pnpm dsh web`）→ 浏览器开门
（token URL 在启动横幅里读）。**headless 只证明 CLI 能跑，不是公司运行。**

→ 唯一步步骤：[demo.md §前置](demo.md)

## 三问：改东西从哪进？

按你要改的面选入口：角色内容（persona/skills）→ preset 合同；host / Web 代码 → 源码地图；
流程与授权 → 开发环。

→ 入口表：[项目地图 · 按任务进入](project-map.md)

## 四问：测试资产在哪、怎么选？

三层：**秒级回归**（`pnpm test`）→ **真实入口冒烟**（[检查索引](../checks/README.md) 的 smoke 与
audit 分区）→ **录制回放与证据**（[snapshots](../snapshots/README.md)）。改完东西选最窄检查：
按改动面查表。

→ 查表：[tests/README「改动面 → 最窄检查」](../tests/README.md) · 证据政策：[testing.md](testing.md)

## 补一问：怎么知道「做完了」且质量可靠？（2026-10-07 补）

四条链各要独立证据，前一条绿不豁免后一条：**挂得上**（preset-smoke）→ **行为对**（场景/判据，
[testing.md](testing.md) §2）→ **装得上**（release-smoke）→ **批得下**（语义审 + 你验收——机器全绿
只证断言通过，「做的是不是这件事」由这两道把关，形状 = [开发环 §13](guides/dev-loop.md)）。测试资产
**双向反查**：改动面 → 最窄检查（[tests/README](../tests/README.md)）；场景 → 固定住什么行为
（[snapshots 索引](../snapshots/README.md)）。

## 五问：agent loop、skills、运行态、run bundle 在哪？

- **loop 本体不在本仓库**——它在 [vendor/dsh](../vendor/dsh/)（钉版本、只读）；本仓只拥有
  喂给 loop 的输入（preset、skills、patch）和接住 loop 的输出（会话日志、workspace、证据）。
  别在本仓里找主循环，也别改 vendor。
- **skills**：`packages/company-pack/presets/<角色>/skills/`——盘上可见，一角色一目录。
- **运行态**：[runtime/](../runtime/README.md)（gitignored，跑过留下的状态全在这）；
  一条命令看全景：`pnpm orient`。
- **run bundle**：**一次运行 = 四件套**（代码与组合 / DSH 运行状态 / 会话 cwd / 证据）——
  `pnpm orient` 默认全景直接显示这四件；某次运行的证据链按需算视图：
  `pnpm orient --scenario replay/r2-motion`（引用不复制，防第二权威）。

→ 时序与四条状态轴：[运行态地图](runtime-map.md)

## 现在就想看点什么？

`pnpm orient`——keyless、秒级、只读：当前 home（含「没 source env.sh = 用了日用 home」警告）、
在场 profiles、最近会话、公司盘概览、run bundle 四件套、待核工作候选（R3′ 口径扫描——零容忍未达门槛，
只显示不进待办）、便宜检查清单。不用为了「看看现在什么状态」拉起整个公司。
