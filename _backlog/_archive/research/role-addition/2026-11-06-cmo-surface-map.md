---
topic: 新增角色/子人格要动哪些面（CMO 实证）
intent: 用 0.9.0 加 CMO 的 9 个提交、97 个文件反推「加一个角色」的完整面清单，供 SA/SQA 落地时逐条核对，避免丢三落四
---

# CMO 加角色的完整面清单（2026-11-05/06 实证）

## 为什么要这份材料

0.9.0 加一个 CMO 用了 **9 个提交**才收干净：首个功能提交 48 个文件，之后五轮矩阵扫描（4939328、
d506ea3、150a353、3a4d128、bb1b3ce）加两个检查补洞（8e4377e、02e82fb），最后才补上 CEO 汇报线与
实跑证据（9a74994、e99d8a9）。**并集 97 个文件**。目的：把「加角色」从凭记忆改成照清单核。

取法：`git show --stat` 逐提交取文件名并集（`ffdf0ef 9a74994 02e82fb 8e4377e bb1b3ce 3a4d128
150a353 d506ea3 4939328`），按面归组。分布：pack 32 / tools 6 / tests 15 / checks 11 / docs 16 /
市场索引 2 / notes 2 / probes 5 / 根 README 1。

## 关键差异（先读这条，它决定面的大小）

| 档 | 是什么 | 进哪些面 |
|---|---|---|
| **A 角色级**（CMO 走的路） | 第七个职能，有汇报线与编制 | `COMPANY_ROLE_IDS`、org 六条线、owners、kb charter、在场板、署名、角色徽标、全量 smoke |
| **B 子人格级**（`researcher` 走的路） | 委派 child 的 preset，不是职能 | `COMPANY_SUPPORT_PRESET_IDS`、presets 声明门禁、preset-smoke 真挂载、委托行；**不进**编制/在场板/署名 |

SA/SQA 应走 **B 档**（VP-Eng 条线下专职岗，不是第七/第八条汇报线）。下面每面都标「B 档需要吗」，A 档
动作只作历史参考。

## 面清单（逐条核）

| # | 面 | CMO（A 档）改了什么 | SA/SQA（B 档） | 判据 |
|---|---|---|---|---|
| 1b | **包内注册** | `package.json` 的 `dsh.bundle.patch` 数组逐行登记每个 preset（0.9.0 已有 CMO 行） | **必需**：两个 `./presets/system-*/agent.cordis.yml` 必须进数组——目录存在但没登记 = 装上了也不进名册（2026-11-06 实踩：preset-smoke 报 `Unknown agent preset`） | `checks/gates/presets.mjs` 新增 `preset-bundle` 检查；`preset-smoke` |
| 1 | preset 声明 | `presets/cmo/agent.cordis.yml` + `skills/mrd-playbook` | **必需**：两个 `presets/system-architect|system-qa/agent.cordis.yml` + 各 ≥1 skill | `checks/gates/presets.mjs` 声明文件检查；`preset-smoke` 真挂载 |
| 2 | 名单单一事实家 | `tools/lib/company-roles.mjs` 进 `COMPANY_ROLE_IDS` | **必需**：进 `COMPANY_SUPPORT_PRESET_IDS`（`researcher` 同款；注释写清不是角色） | presets 门禁/preset-smoke 自动收；probe-smoke、release-smoke 若枚举也要收 |
| 3 | 委派行 + 深度 | CEO preset 加 `vp_cmo` 行（`agentPreset: cmo`） | **必需**：CEO + vp-eng 两处各加 `system_architect` / `system_qa` 行，`maxDepth: 2`（今天 CEO 的 `vp_eng` 是 1，成员 depth 1 起子代 = 2，必须放行） | `delegation-smoke` / 真 E2E：成员会话能起子代 |
| 4 | 编制 `org.md` | 加「市场与产品（CMO，3）」节 + 条线计数 +1 | 可选：VP-Eng 条线加两行岗位（不改六条线计数） | bootstrap/backfill 测试；`org.md` 渲染检查 |
| 5 | 归属 `owners.md` | 加 CMO 行 | 不加（不是汇报线） | `tests/host/run-bundle/bootstrap.spec.ts` |
| 6 | 章程 `content/charters/<role>.md` + kb 种子 | `charters/cmo.md`；`COMPANY_ROLES` 驱动 kb 目录 | **不加**（`researcher` 无 CHARTER 先例）；如要 journal 二期再议 | `base-clean`、`release-smoke` 首启清单 |
| 7 | 模板/手册 `content/templates`、`content/AGENTS.md` | `mrd.md`、`prd.md`；手册角色表与路由 | 建议：架构/接口模板 + V&V 计划模板；手册加「谁起 SA/SQA」 | handbook-budget；
| 8 | 客户端身份面 | `RoleBadge.tsx`、`styles.ts`、`client-css.spec`、`role-badge.spec`、`role-mark-fixture`、`presence-status.ts` | **若子代会话会在 UI 被打开**：需要徽标颜色/标签，否则显示「未知角色」 | 真页面探针（`sidebar-role-mark-probe`） |
| 9 | 委托卡/接线 | `DelegationCard.tsx`、`wiring/delegation-keys.ts` | 视 UI 是否需要卡片；不需要则跳过 | `tests/client/ui` |
| 10 | 门禁 | `base-clean`、`handbook-budget`、`doc-budget`、`ledger-participation` | 逐条核对：base-clean 卸载残留清单、handbook 行数、doc 预算、台账参与 | `pnpm verify` |
| 11 | smoke | `preset-smoke`、`probe-smoke`、`channel-matrix-smoke`、`release-smoke`、`replay-smoke` | `preset-smoke`（自动）、`delegation-smoke`（深度）、`release-smoke`（首启/升级补种）、必要时 `probe-smoke` | 各脚本头注 |
| 12 | 工具层字面量 | `authorship`、`candidate-scan`、`converge-rules`、`install-manual`、`bundle-init`、`converge`、`ask-latency`、`question-stop` | 按 grep 结果改：凡持角色字面量处补/说明；署名规则要决定 SA/SQA 稿署谁 | `pnpm test`；`candidate-scan`/`authorship` spec |
| 13 | 测试 | presets（独立 ROLES 字面量）、company（bootstrap/host-composition/presence-board/prd-*）、client、harness（market-index/dev-install/foundation-safety） | **必需**：presets 断言（两个 support preset 声明 + 委托行 + maxDepth）、delegation 深度断言、E2E | `pnpm test`；真模型 E2E |
| 14 | 文档 | presets/role-content-plan/architecture/roles-isolation/product-definition/budget-and-ops/index/orient/project-map/runtime-map/release/demo/multi-human/web-rpc | **必需**：`docs/presets.md`（子人格表）、`docs/delegation.md`（深度 2 与谁起）、`docs/design/role-content-plan.md`；其余按引用 | `pnpm verify`（md-links/doc-budget） |
| 15 | 发布面 | `package.json` 0.9.0、README、CHANGELOG、`market-index.json(.staged)`、`_dist` 手册 | 版本号决定（子人格新增 → minor）；README/CHANGELOG；市场索引若发布 | `pnpm release --check` |
| 16 | 收口 | Note `2026-11-05-cmo-prd-product-definition.md` + backlog 卡 | Note + 卡归档（五道门） | `pnpm verify` backlog-liveness |

## 机制事实（这轮已核实，写死在卡里防返工）

- `spawn_teammate` **只有 Lead 能调**，参数无 preset ⇒ 团队成员的人格继承 Lead（今天实测
  `vp-eng` 成员 `agentPreset: "ceo"`、`delegationDepth: 1`）。
- 命名 subagent 行可带 `agentPreset`，深度由行上 `maxDepth` 控制（默认 1 = 不能带下一代）。
- 结论：**VP-Eng 要自己起 SA/SQA，只能走命名 subagent 通道**（独立上下文 + 独立 preset），且行上必须
  `maxDepth: 2`；团队成员通道（spawn_teammate）在工具层就做不到。

## 开放问题（交卡上定）

1. 名字：`system-architect` / `system-qa`（显示名「系统架构师（SA）」「系统质量保证（SQA · V&V）」）是否照定。
2. SQA 的独立性：挂 VP-Eng 条线但 **veto 直达 CEO**，还是独立汇报线？
3. SA/SQA 的稿子署名：署自己（要改 authorship）还是署 VP-Eng 并注明分工？
4. 是否进 `org.md` 岗位表（建议进）；是否要自己的 journal（建议一期不要）。
5. demo 与落地的触发判据：谁判定「这是落地项目」——用户点名 / VP-Eng 自判 / CEO 在任务书里写？
