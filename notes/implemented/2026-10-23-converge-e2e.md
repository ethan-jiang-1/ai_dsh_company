# converge 执行步骤的端到端证据：临时工作区真跑六步

状态：implemented（2026-10-23；架构评审候选 1 第二刀的未验项补齐）

> **2026-10-30 部分取代**：run bundle 后 `company-workspace/` 整树 gitignored，归档搬移已改**纯 fs rename**
> （不再 `git add`）；探针不再写 `snapshots/archive`，journal 副本随归档件进
> `deliverables-archive/<目录>/journal/`。本文 §决定 3、§输掉的方案 的 “runtime 未忽略/git add” 与
> §后果 的 snapshots 路径作废；新 owner = [converge-evidence-home](./2026-10-30-converge-evidence-home.md)。

## 决定

1. **两条测试缝**（默认值不变、CLI 行为不变）：
   - `CONVERGE_WS_REL`：converge 的工作区根，默认 `company-workspace`；
   - `DELIVERABLES_WS_REL`：成品索引生成器的扫描/输出根，默认同样；converge 起子进程时它已在环境里。
2. **搬移计划带工作区根**：`archiveMovePlan(dirName, wsRel)` 与 `steps({..., wsRel})` 同源；
   `clearLiveJournal` 与 `rewriteRefs` 的路径前缀也改读 `WS_REL`。
3. **新探针 [converge-e2e-probe.mjs](../../probes/fs-taskboard/converge-e2e-probe.mjs)**：
   在 `runtime/probe-converge-<ts>/` 造一个已闭合动议 + 一篇 journal + 台账，真跑一次收敛，断言 8 件盘面事实
   （退出码 / 完成行 / 归档家 / 活跃区消失 / journal 清 / 归档件内 journal 副本 / 台账行 / 索引含 slug），最后清干净。

## 输掉的方案

- **直接对 live 公司盘跑**：会改 tracked 交付物与台账，还得回滚；探针必须不碰真盘。
- **把工作区放 `runtime/harness-home/` 下**：那里被 gitignore，`archive-move` 步的 `git add -A` 对忽略路径
  **exit 1**，收敛当场崩（实测）。当时以为放 `runtime/probe-*` 就“未忽略”——实际也被 `runtime/*` 忽略；
  2026-10-30 起归档改纯 fs rename，这个替代方案不再成立。
- **跳过索引重建步**：那等于端到端少一步；改用 `DELIVERABLES_WS_REL` 让生成器指着临时盘，步照跑。

## 后果

- `executeStep` 的六个分支有了真实执行证据（此前只有「结构上与原内联代码一一对应」）。
- 两条环境变量是**测试缝**：不设时行为与之前逐字一致；README/头注已写明用途。
- 探针当时在 tracked 区（`snapshots/archive/`）短暂创建证据目录后删除；2026-10-30 起不再写该路径。

## 验证（真跑）

```text
source run/env.sh && node probes/fs-taskboard/converge-e2e-probe.mjs
#   ALL PASS（8/8；2026-10-30 扩到 16/16，覆盖 resume --dry-run 与 backfill 边界）；当时跑后 snapshots/archive 无残留、git status 无新增
npx vitest run tests/harness/converge-rules.spec.ts   # 含自定义 wsRel 的计划用例
pnpm test     # 753 passed
pnpm verify   # ALL PASS（snapshot-index 复绿）
```

## 未验

- `resume` 仍未**全量**端到端覆盖：探针只跑 `--dry-run`（退出 0、不动盘）；真搬移/清 journal 仍缺半态夹具。
- `--charter-backfill` 已真执行并有探针覆盖（退出 0 / 全员 5 角色 / 两次幂等），见 [converge-evidence-home](./2026-10-30-converge-evidence-home.md) §验证；本段其余是 2026-10-23 当时的未验状态。
