# converge 执行步骤的端到端证据：临时工作区真跑六步

状态：implemented（2026-10-23；架构评审候选 1 第二刀的未验项补齐）

## 决定

1. **两条测试缝**（默认值不变、CLI 行为不变）：
   - `CONVERGE_WS_REL`：converge 的工作区根，默认 `company-workspace`；
   - `DELIVERABLES_WS_REL`：成品索引生成器的扫描/输出根，默认同样；converge 起子进程时它已在环境里。
2. **搬移计划带工作区根**：`archiveMovePlan(dirName, wsRel)` 与 `steps({..., wsRel})` 同源；
   `clearLiveJournal` 与 `rewriteRefs` 的路径前缀也改读 `WS_REL`。
3. **新探针 [converge-e2e-probe.mjs](../../probes/fs-taskboard/converge-e2e-probe.mjs)**：
   在 `runtime/probe-converge-<ts>/` 造一个已闭合动议 + 一篇 journal + 台账，真跑一次收敛，断言 8 件盘面事实
   （退出码 / 完成行 / 归档家 / 活跃区消失 / journal 清 / 证据副本 / 台账行 / 索引含 slug），最后清干净
   （含空的 `snapshots/archive/convergence-<today>/` 父目录——snapshot-index 门禁把空场景目录当真场景）。

## 输掉的方案

- **直接对 live 公司盘跑**：会改 tracked 交付物与台账，还得回滚；探针必须不碰真盘。
- **把工作区放 `runtime/harness-home/` 下**：那里被 gitignore，`archive-move` 步的 `git add -A` 对忽略路径
  **exit 1**，收敛当场崩（实测）。放 `runtime/probe-*`（未忽略）才行，代价是清理时要 `git reset`。
- **跳过索引重建步**：那等于端到端少一步；改用 `DELIVERABLES_WS_REL` 让生成器指着临时盘，步照跑。

## 后果

- `executeStep` 的六个分支有了真实执行证据（此前只有「结构上与原内联代码一一对应」）。
- 两条环境变量是**测试缝**：不设时行为与之前逐字一致；README/头注已写明用途。
- 探针在 tracked 区（`snapshots/archive/`）短暂创建证据目录后删除；失败路径由 finally 兜底。

## 验证（真跑）

```text
source run/env.sh && node probes/fs-taskboard/converge-e2e-probe.mjs
#   ALL PASS（8/8）；跑后 snapshots/archive 无 convergence-2026-10-23 残留、git status 无新增
npx vitest run tests/harness/converge-rules.spec.ts   # 含自定义 wsRel 的计划用例
pnpm test     # 753 passed
pnpm verify   # ALL PASS（snapshot-index 复绿）
```

## 未验

- `resume` 路径仍未端到端覆盖（它不搬移、步骤不同；要补需另造半态夹具）。
- `--charter-backfill` 只打印指引、不执行，探针未覆盖（本就是人工收尾步）。
