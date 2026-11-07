---
topic: 11 张执行卡的完整落地计划——波次、每卡红绿证据、审查与归档
intent: 把 `_backlog/issues` 的 11 张卡排成可执行的波次计划，逐卡写清研发流程、质量保障与落地证明；不授予实施，等用户批准
---

# 完整执行计划（2026-11-07）

> **这份材料是什么**：11 张执行卡（A1–A8 + B1–B2）+ 程序伞卡的**执行计划**。回答三件事：按什么顺序推进、每步怎么保质量、拿什么证明“这张卡真的落地了”。
> **不是授权**：卡 `待落地` 只表示可实施；用户点名/批准本计划后才动产品代码。Plan Mode 规则 = [policy P1](../../../docs/policy.md)；执行链 = [dev-loop §1](../../../docs/guides/dev-loop.md)；收尾 = [close-out-definition](../../../.agents/skills/close-out-definition/SKILL.md)。
> **起点**：BUG-034/035 已修（`7da331a`，卡归档）；V1/V2/V4/V11 已跑原型（[验证记录](2026-11-07-validation-trial.md)）；A8/B2/B1 探针规格已写（[probe specs](2026-11-07-probe-specs.md)）；卡集审计 21 项已处置（[审计](2026-11-07-issue-set-audit.md)）；`backlog-liveness`/`md-links` 全绿。

## 1. 流程总图（每张卡都走这条）

| 段 | 做什么 | 判据/产物 | 唯一家 |
|---|---|---|---|
| **0 授权** | 用户点名 wave/card；确认范围、非目标、验收；feature 先 Plan Mode | 用户原话 + 批准范围；`待落地` ≠ 授权 | [policy P1](../../../docs/policy.md) / [dev-loop §0.5](../../../docs/guides/dev-loop.md) |
| **1 切片** | 读卡 + 相关方法 + 合同；`todo_write` 列步骤；点明非目标 | 本次改动/非目标/验收三行 | [dev-loop §1.1](../../../docs/guides/dev-loop.md) |
| **2 红先行** | 机制面先写会红的 spec/fixture；行为面先立场景；门禁先 prove-it-red；文案面先加会红的断言 | 红输出（命令 + 关键行） | [testing.md §3](../../../docs/testing.md) |
| **3 实施** | 只改拥有该事实的文件；不扩范围；同步合同/模板/docs | 最窄 diff；同 diff 合同 | [dev-loop §1.2/§1.4](../../../docs/guides/dev-loop.md) |
| **4 证据** | 先跑最窄检查，再按改动面升档；记录命令/输出/资产 | 四链证据（挂/行为/装/批准） | [tests/README](../../../tests/README.md) / [testing.md §1](../../../docs/testing.md) |
| **5 收尾** | 对照授权→四链→语义审→收割三问→指针→改口→revert→门禁→六行回执 | 六行回执 + Note + 卡 `审查` | [close-out-definition](../../../.agents/skills/close-out-definition/SKILL.md) |
| **6 归档** | 卡翻 `已结`、`git mv`、双索引、程序 Note 回填 | 归档卡 + 索引绿 | [_backlog 章程](../../README.md) |

> 一张卡 = 一个结果；实现可以是 1–3 个 commit，但**卡不拆成任务清单**；波次只是执行顺序，不是新状态。

## 2. 波次计划

| Wave | 卡 | 并行/串行 | 波次门禁（全绿才进下一波） |
|---|---|---|---|
| **W0 基线** | — | — | `pnpm verify`、`pnpm test`、`pnpm typecheck`；`git rev-parse HEAD`；工作树干净（`_backlog` 除外）；无产品改动 |
| **W1 合同/模板** | A1 → A2 | 串行（A2 依赖 A1） | `pnpm verify`；`pnpm test tests/company`；`prd-check.spec`；A1/A2 的 `## 测试资产` 红绿 |
| **W2 校验器 ∥ 角色** | 校验轨：A5 → A6；角色轨：A3 → A4a → A4b | 两轨并行；角色轨串行改 `tests/presets` | 校验轨：`pnpm test tests/company` + `typecheck` + `lint`；角色轨：`pnpm test tests/presets` + `preset-smoke` + `probe-smoke` |
| **W3 迁移/E2E** | A7 → A8 | A7 在 A6 后；A8 在 A3/A4a/A4b/A5/A6 后 | `release-smoke`（A7）；A8 真模型 probe；`pnpm verify`/`test` |
| **W4 组队** | B1 → B2 | 串行；B2 在 B1/A8 后 | `preset-smoke`、`probe-smoke`、`delegation-smoke`、`product-team-e2e-smoke`、`client-load-smoke`；`verify/test/typecheck` |
| **W5 程序收口** | 伞卡 + B2 | — | 全量 `verify/test/typecheck/lint/dup`；`release --check`（如发版）；`notes:audit`；`backlog-liveness`；归档 |

**关键路径**：A1 → A2 →（A5/A6 ∥ A3/A4a/A4b）→ A7 → A8 → B1 → B2 → W5。W2 是两条独立轨，不要串成一条；A3/A4a/A4b/B1 都改 `tests/presets`，必须串行。

## 3. 每卡执行卡（红先行 → 实施 → 证据 → 收口）

| 卡 | 红先行（先看到红） | 实施（只改自己家） | 证据（波次内） | 收口/风险 |
|---|---|---|---|---|
| **A1** 合同 | 新 `requirements-contract.spec.ts`：缺 R1–R10/退役词/`meta` 字段 → 红 | `content/state/process-docs.md`、`meta.md`、`content/AGENTS.md`（只改编号段）、`docs/guides/product-definition.md`、gates | `pnpm verify`；`pnpm test tests/company/requirements-contract.spec.ts`；临时删一节/加 `STR-001` → 红；还原 → 绿 | V1 已跑；docs 预算先搬后写；不碰 seed（A7） |
| **A2** 模板 | 新 `requirements-templates.spec.ts`：重复定义/缺 `layer`/非法 `definition` → 红 | 六个模板；PRD JSON 唯一定义；`source`+`traces`；allocation `none` | `pnpm test tests/company/prd-check.spec.ts`；新 spec；`pnpm verify` | 六个模板里 allocation 是附录；不要把摘要表当定义 |
| **A3** CMO/VP-Eng | `presets.spec` 新断言：CMO 缺 StRS / VP-Eng 多 SyRS → 红 | CMO persona/mrd-playbook；VP-Eng persona/prd-playbook；共享 product-definition | `pnpm test tests/presets`；`preset-smoke`；`probe-smoke` 快档 | 模型行为归 A8；本卡只证文案/挂载 |
| **A4a** SA | `presets.spec` 新断言：SA 出现 `VP-###`/退役词 → 红 | SA persona/systems-architecture；验证点改引用 REQ/IF | `pnpm test tests/presets`；`preset-smoke`；E/V 既有探针（只证接线） | 整链归 A8；加回 `VP-###` 必须红 |
| **A4b** SQA | `presets.spec` 新断言：SQA 出现 `VP/V/VR` → 红 | SQA persona/vv-playbook；TC/covers/L1–L4；结论原样 | `pnpm test tests/presets`；`preset-smoke`；`sa-sqa-quality-audit` | 结论“在场”不是“不被删”；整链归 A8 |
| **A5** checker | 新 `requirements-check.spec.ts`：重复/悬空/退役/孤儿 fixture → 红 | `src/lib/requirements-check.ts`；按 `definition` 形态解析；行首字段锚定；索引派生 | `pnpm test tests/company/requirements-check.spec.ts`；V2/V4/V11 结果已跑；`typecheck`/`lint` | 若定义形态/scope 复杂度超一卡，拆 A5a/A5b，不改结果合同 |
| **A6** 命令 | 新 `req-command.spec.ts`：无命令/错 slug/dataBlocked → 红 | `src/host/req-command.ts`；`src/index.ts`；`host-composition.spec`；pack README | `pnpm test tests/company`；`host-composition`；命令真跑 | 操作员跑；角色不自证 |
| **A7** 迁移 | `bootstrap.spec`：缺 seed/旧文件被覆盖 → 红 | `STATE_FILES`；bootstrap；旧盘 runbook；release 说明 | `pnpm test tests/company/bootstrap.spec.ts`；`release-smoke`；旧盘 `skipped` | 备份/diff/用户确认；不重写旧动议 |
| **A8** 五层 E2E | 用 A5 checker 对缺 TC/缺层 fixture → 红 | 新 `requirements-chain-probe.mjs`（待建，落 probes/team/）；按 [probe specs](2026-11-07-probe-specs.md) | 真模型 probe；`/req check` 绿；`pnpm verify/test` | 一轮样本；不证一般可靠性；成本 10–20min |
| **B1** 组队 | `presets.spec`：缺 `vp_cmo`/旧继承文案 → 红；keyless 根=Lead 已有手跑 | `vp-eng` preset；`eng-teaming` skill；docs/handbook/UI；pack README | `pnpm test tests/presets`；`preset-smoke`；`probe-smoke`；`client-load-smoke`；根=Lead 正式 probe | 只改团队/继承节；CEO `vp_cmo` maxDepth 不动 |
| **B2** 组队 E2E/收口 | CEO `product-team-e2e-smoke` 先跑基线；SQA 结论缺失 fixture → 红 | 新 `vp-eng-teaming-probe.mjs`（待建，落 probes/team/）；docs/index/decisions；归档 | VP-Eng 真模型 probe；`product-team-e2e-smoke`；`delegation-smoke`；`verify/test/typecheck` | CEO 回归是硬门；程序 Note 单 owner |

## 4. 质量保障（五层证据，别用一层冒充全部）

| 层 | 证明什么 | 本计划的用法 | 不证明什么 |
|---|---|---|---|
| keyless 单测 | 纯逻辑/错误路径/静态渲染 | A1/A2/A5/A6/A7 + A3/A4/B1 的文案断言 | 真入口、模型行为 |
| 装配冒烟 | 真挂载/零失败 | `preset-smoke`（A3/A4/B1）、`client-load-smoke`（B1） | 内容语义 |
| 机制冒烟 | 模型可见边界 | `delegation-smoke`（B2）、`host-composition`（A6） | 设计取舍 |
| 真模型 probe | 这一轮真实行为 | A8、B2、`probe-smoke`（A3/A4/B1） | 一般可靠性、业务价值 |
| 安装/发布 | 安装形状/入口 | `release-smoke`（A7/B2）、`release --check`（如发版） | 语义 |

**红绿纪律**：

1. 机制面：先写会红的 spec/fixture，跑红，留输出；再实现；再跑绿。
2. 门禁面：只回滚实现、保留新测试；制造回归看红→还原看绿→三步留证（[dev-loop §12](../../../docs/guides/dev-loop.md)）。
3. 行为面：先立场景（Given/When/Then + 判据点名），再改文案；模型行为由 A8/B2 probe 证，不由文案断言冒充。
4. 命令链一律 `set -o pipefail`；裸 `cmd | tail` = 假绿。
5. 未跑 = 写「未执行」，不写成绿；被阻断 = 写阻塞与原因。
6. 真模型 probe 最多重跑 1 次；记录两次差异；不把单次绿写成“稳定”。

**审查**：

- **每卡**：自审（四输入：授权原文/合同/证据选层/Note）+ 语义审 finding；blocker 与建议分开。
- **每波**：独立子代理盲审（输入 = 当前 diff + 卡 + Note + 授权原文；审与修分家），用 `code-review` skill；用户看波次回执，决定是否进下一波。
- **程序**：B2/伞卡做最终语义审；用户对照授权原文验收；机器全绿不等于语义通过。

## 5. 落地证明（每卡长什么样）

每张卡收尾时在卡内补 `## 交付证据`（这是“落地”的取证包）：

```markdown
## 交付证据

- 基线：`git rev-parse HEAD` = <sha>
- 红：`<command>` → <关键红行>（或 fixture 路径）
- 绿：`<command>` → <关键绿行>
- 资产：新增或改动的测试/门禁文件（`tests/`、`probes/`、`checks/` 下）
- 真跑：`<session/probe id>`（日期、命令、结论；没有写「未跑」）
- 文档/Note：新增或改动的 docs / `2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）#<节>
- 审查：`审查：agent — 2026-11-07` / `审查：用户 — 2026-11-07`（波次）
```

**卡的关闭证据**（缺一不算落地）：

1. `## 验收标准` 每行有判据/证据 owner，且全绿；没有“应该绿”。
2. `## 测试资产` 的资产在场；红证与绿证都留。
3. `## 交付证据` 填齐；命令可被后来者复跑。
4. `审查：agent` 已记；波次卡另有 `审查：用户`。
5. 程序 Note 有对应节；D57/D58 有路由。
6. `git mv` 到 `_archive/settled_issues/`，两边索引同步；`backlog-liveness` 绿。
7. 改动面合同 docs/模板同 diff 更新；`pnpm verify` 绿。

**程序级证明**：伞卡的 `## 验收标准` 表 + 11 张卡的 `## 交付证据` + 程序 Note 的“验证”节 + 全量门禁输出 + `release --check`（如发版）+ 归档索引。

## 6. 波次门禁命令矩阵

| Wave | 必跑 | 按需 |
|---|---|---|
| W0 | `set -o pipefail; pnpm verify && pnpm test && pnpm typecheck` | `node checks/smoke/preset-smoke.mjs`（基线挂载） |
| W1 | `pnpm verify`；`pnpm test tests/company`；`prd-check.spec` | `node tools/checks-index.mjs --write`（若新增脚本） |
| W2 校验轨 | `pnpm test tests/company`；`pnpm typecheck`；`pnpm lint`；`host-composition.spec` | `pnpm dup`（若抽公共逻辑） |
| W2 角色轨 | `pnpm test tests/presets`；`node checks/smoke/preset-smoke.mjs`；`node checks/smoke/probe-smoke.mjs` | `probe-smoke --full`（内容档，按需） |
| W3 | `pnpm verify`；`pnpm test`；`pnpm typecheck`；A8 probe | `release-smoke`（A7） |
| W4 | `preset-smoke`；`probe-smoke`；`delegation-smoke`；`product-team-e2e-smoke`；`client-load-smoke`；`pnpm test tests/client`；`pnpm verify/test/typecheck` | `ui-scene-smoke --isolated --golden`（如金样含文案） |
| W5 | 全量 `verify/test/typecheck/lint/dup`；`pnpm notes:audit`；`pnpm release --check`（如发版） | `release-smoke`；`converge`（有交付物时） |

> 所有命令链加 `set -o pipefail`；真模型档不进 `pnpm test`；跑不动就写「未执行 + 原因」。

## 7. 审查与授权点

| 点 | 谁 | 看什么 | 不通过怎么办 |
|---|---|---|---|
| **P0 计划批准** | 用户 | 本计划 + 11 卡 + 风险 | 改计划/改卡；不动产品代码 |
| **P1 W1 收** | 用户 | 合同/模板 diff + 红绿 + `verify` | 回 W1 修；不进 W2 |
| **P2 W2 收** | 用户 + 独立子代理 | 校验器/角色两轨 diff + 证据 | 单轨回退；另一轨可继续 |
| **P3 W3 收** | 用户 | A7/A8 证据 + 真跑 session | A8 重跑/停；不编绿 |
| **P4 W4 收** | 用户 | B1/B2 + CEO smoke + 客户端 | 回 B1/B2；CEO smoke 红 = 停 |
| **P5 程序收口** | 用户 | 11 卡归档 + 程序 Note + 全量门禁 | 不归档；列未完成项 |

**独立审**：每波由未被该波实现的子代理做 `code-review`（Standards + Spec 两轴），输出 finding 带缺陷/位置/影响/证据；不在实现者自审里闭环。

## 8. 停止/回滚条件

- **停止**（不硬闯）：机制证伪、验收无法变绿、关键选择需用户裁决、范围扩大。
- **回退**：被证伪的已落地切片**整片 revert**（实现+测试+docs+Note 同退），卡回 `推敲中` 并记证据；不做半 revert。
- **真模型不稳**：重跑 1 次；两次差异记入 Note；仍不稳则标「未验证」并停，不写绿。
- **波次红**：不进下一波；先修当前波或回退该卡；不把红带到下游。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| A5 checker 复杂度超一卡 | 拆 A5a 解析/索引 + A5b 规则/红证；结果合同不变；拆卡需用户点头 |
| A8/B2 真模型方差/成本 | 规格已写；每 probe 重跑 ≤1；记录 session/差异；预算 10–20min/次 |
| 文档预算顶格 | A1/B1 的 move plan 先搬后写；B2 只核对；`doc-budget` 红则搬 |
| A1/B1 共改 handbook | section map：A1 编号段 / B1 团队段；一次只改自己节 |
| A3/A4/B1 串行 tests/presets | 顺序 A3→A4a→A4b→B1；不并行改同一 spec |
| 旧盘迁移 | A7 runbook：备份→替换→diff→marker→旧盘 skipped→用户确认 |
| ID 并发撞号 | Lead 串行分配 + checker 撞号红；不承诺加锁 |
| 程序 Note 多 owner | 伞卡单 owner；B2 追加证据；偏离则加节或另开 Note |
| 发布声明无证据 | 如发版，贴 `release --check` READY 行 + commit SHA；没有就标未发布 |

## 10. 工作量与成本

| Wave | 卡 | Agent 会话估计 | 真模型/成本 |
|---|---|---|---|
| W0 | — | 0.5 | 无（keyless） |
| W1 | A1/A2 | 1–1.5 | 无 |
| W2 | A5/A6 + A3/A4a/A4b | 2–3 | `probe-smoke` 快档 15–40s/批 |
| W3 | A7/A8 | 1–2 | A8 10–20min |
| W4 | B1/B2 | 1–2 | B2 10–20min + CEO smoke 3–7min |
| W5 | 收口 | 0.5–1 | 无（全量 keyless；release 按需） |

合计约 **7–10 个 agent 会话**；用户每波 review 15–30min。真实模型总计约 30–50min（不含重跑）。

## 11. 程序完成定义

- 11 张卡全部 `已结`/归档；伞卡 `已结`；`issues/README` 与 `_archive/README` 同步。
- 程序 Note（`2026-11-07-requirements-teaming-program.md`，待建，落 notes/implemented/）含决定/输掉的方案/落地/验证/剩余风险/上游卡。
- D57/D58 有路由；docs/index 更新；pack README 已知限制更新。
- 全量 `pnpm verify` + `pnpm test` + `pnpm typecheck`（+ `lint`/`dup` 涉源码面）绿；`notes:audit` 无取代缺回链；`backlog-liveness`/`md-links` 绿。
- 如发版：`release --check` 贴 READY + commit SHA；`release-smoke` 绿；否则明说未发布。
- 用户对照授权原文验收；六行回执已发。

## 12. 不做

- 不在本计划里改 vendor、重写旧动议、加 UI 徽标/委派卡 key、发版（除非用户点名）。
- 不新开“实施批次卡”；伞卡就是程序 owner。
- 不把 `待落地` 当授权；不把真模型单次绿写成“稳定”。
- 不用全量门禁替代语义审；不用文案断言替代模型行为证据。

## 13. 立即下一步

1. **用户批准本计划 + 点名 Wave 1（A1/A2）**；如有异议只点要改的波次/卡。
2. 我跑 **W0 基线**（`verify/test/typecheck` + HEAD + 工作树核对），贴结果。
3. 基线绿后进 **W1：A1 → A2**；每卡按“红先行 → 实施 → 证据 → 收尾”走，W1 收给你看六行回执。
4. W1 通过后再由你点名 W2；**未点名不动下一波**。
