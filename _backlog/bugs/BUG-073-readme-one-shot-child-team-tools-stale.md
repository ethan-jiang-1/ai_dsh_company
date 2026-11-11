---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-073：company-pack README 仍写 one-shot child 可见 Team 工具，与 0.2.1 守卫相反

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

[packages/company-pack/README.md](../../packages/company-pack/README.md) 的「已知限制」仍写：

> **one-shot 委托 child 的目录里看得见 Team 工具但调不通**（上游已登记限制，vendor tool-agent-team README
> "One-shot child tool visibility"；2026-10-02 真跑实证：child 目录 41 工具含全部六个 Team 工具，调用在身份确认后被拒）。

但同一仓的 [delegation 合同](../../docs/contracts/delegation.md) 写：

> `delegation-smoke --delegate` [3] 钉住 child 首帧 `agentPreset = vp-eng` 且工具目录**没有** Team 工具
> （组合按 preset 解析，旧的"one-shot child 误见 Team 工具"不再复现）。

2026-11-11 实跑 `node checks/smoke/delegation-smoke.mjs --delegate`：
`[3] child 24d3660a：preset=vp-eng，目录 75 个工具，Team 工具不在场` → **ALL PASS**。
E5C 的命名 child（vp-eng）同样 `spawnTeamTool=false`。

也就是说 README 的“已知限制”是 2026-10-02（0.2.0?）的旧观察；0.2.1 的 install-timing 已修掉，
现役守卫反而要求“不在场”。文档把已修的行为写成限制，和合同/守卫/实测三处相反。

## 根因（假设）

BUG-070 系列/0.2.1 升 pin 时更新了 `delegation-smoke` 与 `docs/contracts/delegation.md`，但
`packages/company-pack/README.md` 的「已知限制」行只追加了 capability header 的一句，没有把旧的
“one-shot child 看到 Team 工具”删掉。README 曾是 0.2.0 的现场记录，0.2.1 之后不再成立。

## 暴露的失败类

**已修限制未从 README 删除**：合同/守卫更新了，但部署者视角的 README 仍把旧限制当现状；同型检查：
所有“已知限制”是否有一条对应的现役守卫在反方向断言？若有，限制应降级为历史/删除。

## 复现

```sh
source run/env.sh
node checks/smoke/delegation-smoke.mjs --delegate
```

- `[3] child ...：preset=vp-eng，目录 75 个工具，Team 工具不在场`；
- `delegation-smoke: ALL PASS`。
- 对照 README 第 158 行与 `docs/contracts/delegation.md:92`-`93`。

## 修复方向（未授权）

- 删除 README 的“one-shot child 可见 Team 工具”限制，或改写成历史注记（“0.2.0 曾见；0.2.1 起
  `delegation-smoke --delegate` [3] 钉不在场”），保留 capability header 对非 Lead 的说明。
- 若要保留一个现役限制，改成实际仍成立的：teammate 工具面仍可能有 `spawn_teammate`（Lead-only 执行），
  见 BUG-071/BUG-072。
- 验收：README 不再与 `delegation-smoke --delegate`/`delegation.md` 相反；`pnpm verify`/`pnpm test` 绿。

## 修复关联

未修。发现于 [委派能力域化回归 + 探索卡](../issues/2026-11-11-delegation-capability-scoping-regression-exploration.md)
A4 静态债；证据 = `delegation-smoke --delegate` 2026-11-11 实跑。
