---
topic: maintenance-surface-taxonomy
intent: 本仓最小迁移的可执行草案（只列动作与验证，不实施），含 P2 预算分叉与回滚
---

> **状态：过程材料。** 早期草案（6 件版）；最终 P1 方案以 reorg-company §4 为准（7 件 + 完整撞墙点）。

# 最小迁移草案（本仓，待批准后实施）

> 目标：让 `checks/` 只放 judge、`probes/` 只放 show、`tools/` 只放 operate。只迁入口文件与引用，不改任何脚本行为、不改 gate 判据。**本文件是立项，不是落地**；实施需用户点名或已批 RFC。

## 1. 目标树

```
checks/     judge    gates/ lanes/ audit/
probes/     show     team/ fs-taskboard/ browser-visual/ session-context/ analyze/（拟建）
tools/      operate  dev/ repo/ release/
非面：tools/lib  tools/drivers  probes 内 fixture  run/  tests/  snapshots/  runtime/
```

`analyze/` 是新域，理由：6 件迁移件共享**同一套 harness（zstd + 会话日志/notes 读取）、同一数据源、同一失败模式**，符合"域 = 共享 harness + 证据源 + 失败模式"的定义；它们不 boot 世界，所以不能塞进现有四机制域。

## 2. 逐文件迁移

| 现路径 | 新路径 | 动作 |
|---|---|---|
| tools/observe/orient.mjs | probes/analyze/orient-probe.mjs | git mv + 改名 |
| tools/observe/ask-latency.mjs | probes/analyze/ask-latency-probe.mjs | 同上 |
| tools/observe/diagnose.mjs | probes/analyze/diagnose-probe.mjs | 同上 |
| tools/observe/explore-evidence.mjs | probes/analyze/explore-evidence-probe.mjs | 同上 |
| tools/observe/notes-audit.mjs | probes/analyze/notes-audit-probe.mjs | 同上 |
| tools/observe/propose-sampler.mjs | probes/analyze/propose-sampler-probe.mjs | 同上 |
| tools/observe/session-log-export.mjs | tools/repo/session-log-export.mjs | 留 operate，离开 observe 组 |
| tools/repo/refactor-drift.mjs | checks/audit/refactor-drift-audit.mjs | 改名满足 `-audit` 后缀 |

```sh
git mv tools/observe/orient.mjs            probes/analyze/orient-probe.mjs
git mv tools/observe/ask-latency.mjs       probes/analyze/ask-latency-probe.mjs
git mv tools/observe/diagnose.mjs          probes/analyze/diagnose-probe.mjs
git mv tools/observe/explore-evidence.mjs  probes/analyze/explore-evidence-probe.mjs
git mv tools/observe/notes-audit.mjs       probes/analyze/notes-audit-probe.mjs
git mv tools/observe/propose-sampler.mjs   probes/analyze/propose-sampler-probe.mjs
git mv tools/observe/session-log-export.mjs tools/repo/session-log-export.mjs
git mv tools/repo/refactor-drift.mjs       checks/audit/refactor-drift-audit.mjs
rmdir tools/observe
```

相对 import 全部是 `../lib/...` / `../drivers/...`；tools/observe/ 与 probes/analyze（拟建） 同为两层深，`tools/repo/` 与 `checks/audit/` 也同为两层深，**无需改 import**。

## 3. 注册表、门禁与预算

1. `tools/lib/core/asset-lanes.mjs` 的 `PROBES` 增 6 条，`domain: 'analyze'`；`FAILURE_CLASS_BY_NAME` 增 6 条（候选：orient / ask-latency / diagnose / explore-evidence = `会话持久化`，notes-audit = `文档指针`，propose-sampler = `模型可见文本`）。
2. `tests/repo/budget/test-census.spec.ts` 的 `MAX_PROBES`：**A** 59 → 65（一次性抬顶 + Note）或 **B** 保持 59、同批退役 6 支同族探针。**未决，需用户裁。**
3. `tools/lib/core/checks-index.mjs`：探针分组/计数排除 `probes/**/index.mjs`（fixture 入口不是资产），修掉 60 vs 59。
4. 重生成：`node tools/repo/checks-index.mjs --write`、`node tools/repo/test-census.mjs --write`。
5. 新文件头注：`// 状态：` 与 `// 何时跑：` 已在原文件，改名不动内容，门禁应继续绿。

## 4. 引用替换（现存文件）

| 文件 | 位置 | 改什么 |
|---|---|---|
| `package.json` | 16–18 | orient / notes:audit / diagnose 三条脚本路径 |
| `checks/README.md` | 13、14、56、58 | 链接与命令字面量 |
| `tools/README.md` | 12 行组表 | 删 observe 组，四组 → 三组 + 说明 |
| `notes/implemented/2026-10-30-notes-consistency-governance.md` | 21 | notes-audit 路径 |
| `notes/implemented/2026-11-10-exploration-asset-strategy.md` | 31、59、72 | explore-evidence 路径 |
| `checks/lib/coverage-baseline.json` | 801 | 豁免 reason 里的 diagnose 路径（键 `tools/lib/probe/diagnosis.mjs` 不动） |
| `probes/lib/orient.mjs` | 3 | 注释里的 CLI 面路径 |
| `tools/lib/session/session-evidence.mjs` | 5 | 注释里的调用方路径 |
| 本题研究材料 | 多篇 | 这是**自指成本**：research 材料在 bare-path 扫描面内，迁完必须同步改路径，否则它们会把迁移判红 |

> 自指成本是这轮的新发现：**研究文档也是消费者**。以后写迁移类研究，要么在实施同 diff 更新研究材料，要么先把材料归档。后者会让证据离开活区，不推荐。

## 5. 验证计划（红 → 绿）

1. **基线**：`pnpm verify` 绿；`pnpm test:checks` 绿。
2. **只搬不改引用**：预期 `script-index`（库存过期）、`bare-path` / `md-links`（旧路径）、`test-census.spec`（probes 下 6 个未登记）红。**先记录这些红**，它们是"迁移真的发生了"的证据。
3. **补注册表 + 引用 + 重生成**：预期 `pnpm verify` 绿、`pnpm test:checks` 绿（在 A 决策下；B 则需先退役）。
4. **行为面**：`pnpm orient`、`pnpm diagnose`、`pnpm notes:audit` 各跑一次（只读），确认命令仍可用。
5. **覆盖率**：`pnpm coverage:ratchet`。入口脚本不被 spec import，理论上不进基线；若报 stale/missing，按 `--update` 前先读差异，不盲目更新。

## 6. 回滚

单 commit：`git revert <sha>`；或实施前 `git branch backup-taxonomy`。迁移不碰 runtime/ 与 snapshots/，回滚无数据风险。

## 7. 成本与未决

- 8 次 `git mv`、~10 个引用文件、2 份生成物、1 次预算裁决。
- 未决 A/B（P2）、`analyze` 域是否接受"level-2 混轴"（机制域 + 数据源域）、`session-log-export` 落 `repo/` 还是新 `data/`。
- 明确不做：把 `checks/audit` 拆成 wired / manual 两层（那是第二级，不是这次的面）；动 `tests/` 的归属；动 `run/`。
