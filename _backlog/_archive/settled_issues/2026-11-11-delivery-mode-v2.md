---
status: 已结
opened: 2026-11-11
---

# 推敲：两轴交付模式 v2——逐动议交付检查 + productized 方法 + 能力前置

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 语义审（交付命令 + D-01 判据 + 以后做/保留决策）+ verify/test/typecheck/preset-smoke/two-axis-gates-smoke 实跑
>
> **结论/去向**：note — [交付检查 v2 Note](../../../notes/implemented/2026-11-11-delivery-check-v2.md)。
>
> 上游：[两轴交付模式 v1 已结卡](2026-11-11-delivery-mode-axis.md)；
> 决定记忆 = [v1 Note](../../../notes/implemented/2026-11-11-delivery-mode-axis.md)；
> 证据 = [两产品结构审计](../research/two-product-structure-audit/README.md) E14 / D-01 / D-02。

**问题与期望结果：** v1 已把 `project-services` / `managed-service` 落成 content 一等能力：
包、meta 字段、CFO/COO/VP-Sales 方法、workflow 分派、awareness、sources 门禁与两轴测试矩阵。
但还有三类未决，不解决就不算“两轴完全可用”：

1. **逐动议交付检查**：`/req check` 只对交付模式给 warning（缺 SOW/UAT/SLA/Runbook），
   不校验 SOW 的 in/out scope、UAT 是否覆盖 REQ/AC、SLA 的响应/赔付字段、月报/续约是否齐。
2. **productized 方法缺口**：`productized` 是默认模式，但 CFO/COO/VP-Sales 没有产品经济/定价/交付方法；
   现在只能 fail-closed。要不要补、补到什么粒度，未定。
3. **能力前置（D-01）**：hardware-software 的 playbook 要 BOM/认证/试产/供应链/售后，org 没有对应席位；
   当前没有“缺席位就报缺”的机制。要不要加 capability precondition，未定。

期望结果：把这三类收敛成“做 / 不做 / 以后做”的结论；若做，给出验收与最小实施面，不把 warning 直接升成红。

**当前情况：**

- v1 的验证全绿：`pnpm verify`、`pnpm test` 180/1514、`pnpm typecheck`、`preset-smoke`、
  `two-axis-gates-smoke`；两轴 scenario/coverage/package/awareness 测试在场。
- `/req check` 已有：未知模式 error、未知类型层 error、缺模式文档 warning、productized 出现 SOW/SLA warning。
- `productized` 没有方法包；`content/delivery-modes/productized/` 不存在（默认态，不是遗漏）。
- D-01 仍是研究结论里的决策项，不在 v1 范围。

**未决问题：**

1. `/delivery check` 独立命令，还是扩 `/req check`？前者边界清、后者入口少。
2. 逐动议检查的“红/黄”线：缺 SOW/UAT 是 warning 还是 error？谁有权限把 warning 升红？
3. productized 的方法范围：只做“产品定价/经济性”，还是也做“产品交付验收（SaaS/私有化/永久授权）”？
4. D-01 的判据：org 缺席位时，是阻断报价/承诺，还是只要求在 final 里报缺？谁签字接受？
5. 这三项是否同一轮做，还是拆成三张卡？

**下一步：** 已完成本轮落地（A 独立命令 + E D-01 判据）；productized 方法与默认模式留“以后做/保留”，不再开新卡。

## 验收标准

- `/delivery check <slug>` 存在并注册：`productized` 无交付文档要求；`project-services` / `managed-service`
  按 `delivery-rules.json` 的 `documents.file` 与 `requiredSections` 逐份检查，缺文档/缺 section = error；
  未知模式 = error；`productized` 出现 SOW/SLA = warning。
- D-01：`hardware-software` 有 `capabilities.md`（能力清单 + 缺席位报缺 + 不进入报价/承诺），
  `product-definition` / hardware overview 指向它；有内容级测试。
- `productized` 方法：明确“以后做”及触发条件（真实产品报价/定价动议），不写空方法。
- 默认交付模式：保留 `productized`，`/req check` 回执点名“未声明 = 默认”；不静默改默认。
- `pnpm verify` + `pnpm test` + `pnpm typecheck` + `preset-smoke` 全绿；两轴既有测试不回归。

## 范围与排除项

- **在范围内**：逐动议交付检查的形态与判据；productized 方法的最小范围；D-01 的能力前置判据。
- **排除**：把 SaaS/私有化/永久授权做成新 delivery-mode；把 project-services 做成第三产品类型；
  改 v1 已定的两轴模型；真模型 E2E（需 key，另档）。

## 已知与未决

- 已知：v1 的包/方法/workflow/awareness/测试资产已齐；`/req check` 是唯一操作员入口。
- 未知：真实动议会多频繁地在 `project-services` 下缺 SOW/UAT；productized 报价是否真的会来；
  D-01 的阻断是否会误伤现有 SI 项目（它们现在挂在 hardware-software × project-services 下）。

## 方案与取舍

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| A 独立 `/delivery check` | 新命令读 `交付模式` + 交付文档 | 边界清，不污染编号检查 | 新命令/注册/测试；操作员多记一个入口 |
| B 扩 `/req check` | 同一命令加交付检查 | 入口少，回执已有模式 | 编号检查与交付检查耦合；红/黄线要设计 |
| C 只保留 warning | 不新增检查 | 零实施 | “模式有了但没人核”，v1 的提醒可能被忽略 |
| D productized 先不做 | 继续 fail-closed | 不编不存在的业务判据 | 默认模式无法出经济/定价结论 |
| E D-01 只写判据 | Note + 角色 skill 报缺 | 不误伤现有 SI | 没有机械闸门，靠人 |

**倾向（待用户拍板）**：先 A（独立 `/delivery check`，warning→error 分两级）与 E（D-01 判据）；
productized 方法等真实动议再开，避免为不存在的业务写一套判据。

## 交付证据

- 新命令 [delivery-command.ts](../../../packages/company-pack/src/host/commands/delivery-command.ts) +
  [delivery-command.spec.ts](../../../tests/host/commands/delivery-command.spec.ts)（9 例）。
- 能力前置 [capabilities.md](../../../packages/company-pack/content/product-types/hardware-software/capabilities.md) +
  [hardware-capabilities.spec.ts](../../../tests/content/hardware-capabilities.spec.ts)（2 例）。
- `pnpm verify` **ALL PASS**；`pnpm test` **185 files / 1537 tests**；`pnpm typecheck` 0；
  `preset-smoke` **ALL PASS**；`gates-negative-smoke` / `two-axis-gates-smoke` **ALL PASS**。
- 决定与证据 = [Note](../../../notes/implemented/2026-11-11-delivery-check-v2.md)。

## 关闭条件

- 三项各自有结论：做 / 不做 / 以后做，并写清触发条件；
- 若做，至少一项落地并有测试资产（命令/门禁/spec），`pnpm verify` + `pnpm test` 绿；
- 未做项写进 Note 的“未决/边界”，不留在口头。

## 抽象度

- 换公司要改吗？→ 不会。检查命令/判据随 pack 走；公司只填 meta 与 rates/roster。
- 换产品类型要改吗？→ 不会。交付检查只看 `交付模式`，需求层仍由产品类型决定。
- 换做法要改吗？→ 会。逐动议检查若从 warning 升 error，要同步角色 skill 与操作员手册。
- 只有机制本身变才改吗？→ 判据住 content/命令；preset 只留“读 meta → 加载/报缺”的指针。
- 第二消费者：COO/CFO 用检查结果收口；操作员用回执；CEO 用 final 的待确认项。
- 搬家成本：命令/判据是 host/content 面，换部署成本低；若以后加第三轴，另开轴，不塞进 delivery-modes。
