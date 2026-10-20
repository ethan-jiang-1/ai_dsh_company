# fresh-agent 审计后的总账/反馈清扫（2026-10-20）

状态：implemented（2026-10-20；用户授权「发现的问题都要修复」；批次 0–2 + 结构切片；`pnpm verify` ALL PASS、`pnpm test` 76 文件 / 711 用例全绿）

> 审计报告 = [_backlog/research/repo-hygiene/2026-10-20-fresh-agent-audit.md](../../_backlog/research/repo-hygiene/2026-10-20-fresh-agent-audit.md)；
> 问题卡 = [fresh-agent-repo-hygiene](../../_backlog/issues/2026-10-20-fresh-agent-repo-hygiene.md)；
> token 类级守卫 = [tracked-token guard](./2026-10-20-tracked-token-guard.md) / [BUG-029](../../_backlog/_archive/fixed_bugs/BUG-029-committed-web-token-recurrence.md)。

## 决定

**不按「逐条改字」收口，按「总账 + 反馈原语 + 结构切片」收口。**

1. **总账**：角色数统一为「5 公司角色 + researcher」；`snapshots/README.md` 补 4 个场景、去掉过期的 44/9 场景/1 可跑；`src/README` 删手写模块枚举；`checks/README.md` 补 5 个公开入口；`docs/index.md` 把决策台账与外部材料登记迁出为
   [decisions.md](../../docs/decisions.md) / [external-research.md](../../docs/external-research.md)，index 从 129 行降到 60 行。
2. **类级守卫**：`snapshot-index`（目录 ↔ README 场景表）、`script-index`（公开入口 ↔ checks/README）、`tracked-token`（tracked 面 token URL）；三条都有红→还原→绿证据。
3. **真实页面反馈**：`cdp-probe` 的页签清单改从 `company-tab-registration.ts` 解析，9/9；面板体断言 `data-company-tab-title` 可见且非空，不再只查 `body.innerText`；失败写
   `runtime/harness-home/diagnosis/cdp-probe-<timestamp>/`（截图/body/verdict/console）。`client-load` / `replay --ui` 失败现场同走 `diagnosisDir`，不再覆盖 `/tmp` 固定名。
4. **日志查询面**：新增 `pnpm diagnose [--session <slug>[/<id>]]`（只读；失败 turn / tool error / 非 allow 审批 / 待答问询 / present / 最后正文；token 脱敏）。
5. **验收合同**：`docs/testing.md` 明确 whole-client 组合子层与 mock 白名单现状；`tests/README.md` 的 client 面板行补 `cdp-probe`/visual probe，安装行补 researcher；`release-smoke` 真验 researcher。
6. **结构切片**：`docs/design/` 加行数预算；`architecture.md` §7/§10 降为指针；`firstText` / `memberDot` 收进共享词汇层；`client/index.ts` 两处数据面构造收成 `company-data-plane.ts`；成品目录 generator→parser 加契约测试；`LedgerTab` 用 isomorphic layout effect 消除 SSR 警告。

## 输掉的方案

- **只改字，不立守卫**：BUG-013→BUG-029 已证明路径级修复不够；`snapshot-index`/`script-index` 的实际红例也说明手维护清单必然再漂。
- **全量 a2 tracked 扫描**：会命中两处测试替身；改用窄 token-URL 正则 + 单测。
- **直接删除 8 个不可重放场景**：它们仍是历史证据；先明确「当前 2/10 可跑」并保留 `replayEligible` 日期，修/归档另轮。
- **把 `docs/design` 全部重写/归档**：设计依据仍有指导价值；先冻结增长、把操作表降指针，内容级归档另轮。
- **历史重写 token**：同 BUG-013，进程级 token 已失效，只 untrack + 轮换。
- **保留 `/tmp` 失败现场**：跨会话不可回溯，且会覆盖上一次；改诊断区。

## 后果

- `pnpm verify` 新增 3 道门禁（snapshot-index / script-index / tracked-token），公开入口 81 个全部入索引；文档预算新增 external/decisions/design 四篇。
- `pnpm diagnose` 成为日志反馈入口；`cdp-probe` 现在真的覆盖 9 个页签并断言面板体有内容。
- 代码面：`client/index.ts` 少两处重复工厂；`firstText`/`memberDot` 各一份；成品目录生成器与页签 parser 有契约测试。
- 未解决（下一轮/用户拍板）：`company-workspace/AGENTS.md` 本轮做了一次去重（190→187 行、26,424→26,209B；删历史 rollout 句、压缩「不在场分档」重复），仍接近 190 行顶格——完整流程细节迁 skills/CHARTER 属产品内容重构，需 `preset-smoke` + `handbook-smoke` 与角色行为复验，本轮只把「17.4KB」过期货和饱和风险登记；重放 2/10 的修复/归档要内容成本；host 入口 `export *` 内部读模型保留（package private，replay 读 built index 的现有 seam，另开 test-only 子路径不值得）。
- 证据：`pnpm verify` ALL PASS；`pnpm test` 76/711；`client-load-smoke` ALL PASS；`cdp-probe` 9/9；`release-smoke` ALL PASS（含 researcher）；`replay --ui` ALL PASS（SKIP 显式化）；`snapshot-index`/`script-index`/`tracked-token` 均红→绿留证。

## 实跑收据（2026-10-20）

```text
pnpm verify                                      # ALL PASS（含 snapshot-index ×47、script-index ×81、tracked-token ×1744）
pnpm test                                        # 76 files / 711 tests 全绿
node checks/smoke/client-load-smoke.mjs          # ALL PASS
node probes/browser-visual/cdp-probe.mjs <url>   # tabsOpened 9/9（含成品）；tabFailures []
node checks/smoke/release-smoke.mjs              # ALL PASS（roster 6 + session/create researcher）
node checks/smoke/replay-smoke.mjs --scenario r2-motion --ui  # ALL PASS；SKIP 行显式
node tools/diagnose.mjs --session <slug>         # 失败摘要（502 events / present 1 / 0 failures）
```
