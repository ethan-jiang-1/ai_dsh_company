---
topic: 两产品结构审计
intent: 记录 E0–E4 的假设、命令、原始输出与结论；每条结论可复跑、可被反例推翻。
---

# 证据账本（E0–E4）

> 日期：2026-11-11。原始输出住 `experiments/raw/`；脚本住 `experiments/`。
> 结论分级：**证实**（观察与假设一致）/ **证伪**（观察推翻假设）/ **待定**（证据不足，继续实验）。

## E0 基线：仓库当前是绿的

- 命令：`pnpm verify`（2026-11-11 00:28）
- 观察：`verify: ALL PASS`；两条 replay 门无对象跳过。
- 命令：`pnpm vitest run tests/content/product-types.spec.ts tests/host/commands/req-command.spec.ts`
- 观察：`2 files / 21 tests passed`。
- 结论：**基线绿**。后面的问题不是“测试已经红了”，而是“门禁没覆盖到的语义不一致”。
- 备注：新建本研究目录后 `pnpm verify` 曾因题名页未索引而红（`backlog-liveness` 报缺题名页）；补题名页与研究索引后复跑，属预期的索引缺页，不是产品缺陷。

## E1 产品类型“允许值”矩阵

- 假设：同一个产品类型 id，在 agent 可读的各个源里不是同一套。
- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e1-allowed-values.mjs`
- 原始输出：[raw/e1.txt](experiments/raw/e1.txt)
- 观察（矩阵）：

| 源 | hardware-software | business-software | project-services |
|---|---|---|---|
| `content/product-types/` 目录 | 有 | 有 | **无** |
| `product-definition` skill 表 | 有 | 有 | **有** |
| CMO 章程“品类 playbook” | 有 | **无** | **有** |
| `templates/meta.md` 允许值 | 有 | 有 | 无 |
| `templates/mrd.md` 示例 | 有 | 有 | 无 |
| CEO `assembling-the-team` | 有 | 有 | 无 |
| `docs/guides/product-definition.md` | 有 | 有 | **有** |
| 两个 `check-rules.json` | 有 | 有 | **无** |

- 结论：**证实**。允许值至少有两套：skill/CMO/指南说有三类；content/meta/CEO/checker 只认两类。CMO 章程还把唯一受支持的 `business-software` 漏了。
- 候选：C-01。

## E2 `project-services` 是否可执行

- 假设：`project-services` 在 skill 表里是可选类型，但机器不认。
- 命令：`node --import tsx/esm _backlog/_archive/research/two-product-structure-audit/experiments/e2-req-check-project-services.mjs`
- 原始输出：[raw/e2.txt](experiments/raw/e2.txt)
- 观察：同一份 MRD/StRS/PRD，只换 `meta.md` 的产品类型：
  - `business-software` → `kind: success`，`层 = MRD/StRS/PRD；动议类型 = business-software`
  - `project-services` → `kind: error`，`未知产品类型「project-services」（来自 动议 meta.md）；可用类型：business-software / hardware-software`
- 结论：**证实**。第三类在 agent 面被点名，在机器面不存在；照 skill 选类型会撞硬错误。
- 候选：C-01。

## E3 默认值 vs 业务叙事 vs 机会清单

- 假设：默认产品类型与公司实际业务不一致。
- 命令：同 E1 脚本的后半段（E3 输出）。
- 原始输出：[raw/e1.txt](experiments/raw/e1.txt) 末节。
- 观察：
  - `content/state/company.md`：`productType: hardware-software`；正文写“出厂 = hardware-software”。
  - `content/state/org.md`：公司业务 = 软件开发 / 服务 / 系统集成；编制里是 8 名 ERP/财务系统集成工程师，没有硬件/固件/认证席位。
  - `content/charters/cmo.md`：把“硬软一体产品”列为**可能的新机会方向**，不是当前业务。
- 结论：**证实**。默认值指向“新机会”，而公司叙事指向软件/服务/系统集成；首个没有显式写 `产品类型` 的动议会继承错误的 playbook。
- 候选：C-02。

## E4 fresh 盘播种是否随产品类型

- 假设：`kb/process-docs.md` 的播种源固定为 hardware-software，与 `company.md` 的 `productType` 无关。
- 命令：`node --import tsx/esm _backlog/_archive/research/two-product-structure-audit/experiments/e4-bootstrap-seed.mjs`
- 原始输出：[raw/e4.txt](experiments/raw/e4.txt)
- 观察：两个仅 `productType` 不同的临时 workspace，跑真实 `bootstrapCompanyWorkspace`：
  - 两者 `plan entry` 都是 `source=product-types/hardware-software/requirements-model.md` → `.dsh-company/kb/process-docs.md`
  - 两者 `sha256` 相同：`7502db2644f99b28…`
  - 两者 `has hardware-software: true`，`has SyRS/IRS/V&V: true/true/true`
  - 差分：`business == hardware: true`
- 结论：**证实**。business-software 的 fresh 盘会拿到硬软五层编号合同；播种完全不看产品类型。
- 候选：C-03。

## E5 硬软能力矩阵

- 假设：hardware-software 的 playbook 要求 BOM/供应链/认证/试产/售后等能力，但 org 里没有对应席位。
- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e5-capability-matrix.mjs`
- 原始输出：[raw/e5.txt](experiments/raw/e5.txt)
- 观察（行命中数）：
  - playbook：BOM 5、供应链 3、认证 10、EVT/DVT/PVT 3、DFM 4、OTA 4、FAT/SAT 2、MTBF 2、固件 8、试产 6、良率 3、备件 2、返修 3。
  - org：**全部 0**；charters：**全部 0**；roleSkills：除“现场”1 外**全部 0**；methods（质量环方法包）：固件 2、电气 3、机械 3、认证 1、现场 3。
- 结论：**证实**。hardware-software 只是一条文档链 + 方法包，org 没有硬件/固件/电气/机械/认证/供应链/试产/售后席位。
  这不一定是一个代码 bug（pack 可以服务“自己补了硬件席位”的部署），但当前没有任何“能力前置检查”告诉角色
  “你的 org 接不住这个类型”。归为**决策项 D-01**：要么加 capability precondition（缺席位就报缺，不进入报价/承诺），
  要么在类型包里写明“使用本类型前必须补齐的席位”。未立 BUG 卡，避免把设计选择混进缺陷轨。

## E6 财务/运营/销售方法是否随类型

- 假设：产品类型只驱动 CMO/VP-Eng 的文档链，CFO/COO/VP-Sales 的方法不随类型变。
- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e6-method-coverage.mjs`
- 原始输出：[raw/e6.txt](experiments/raw/e6.txt)
- 观察：CFO/COO/VP-Sales 的 skills + charters 对 `SaaS|私有化|永久授权|订阅|ARR|CAC|churn|留存|SLO|tenant`
  以及 `BOM|质保|认证|试产|返修|供应链|固件` 全部 **0 命中**；只命中项目制词（3-4-3 / SOW / UAT / 人·周 / 维护年费 / 里程碑）。
- 结论：**证实**。默认已是 business-software，但经营侧仍按项目制方法算账/验收/报价。
- 候选：C-04 → BUG-064。

## E7 费率/人名证据是否有出处

- 假设：CFO/COO 的 skill 引用了不存在的事实。
- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e7-evidence-gaps.mjs`
- 原始输出：[raw/e7.txt](experiments/raw/e7.txt)
- 观察：
  - `cfo-workflow` / `project-economics` 都说“费率基准见 org.md / CHARTER”；但 org.md、cfo charter、policy-lines 的
    “费率/rate/工资/成本基准”命中均为 **0**。
  - `ops-feasibility` 要求“8 人编制里谁、每周几小时；写不出人名 = 没人”；org.md 只有 8 个席位、没有姓名；
    owners.md 有 8 个 `<待填>`，且只到角色级，不到 seat 级。
- 结论：**证实**。费率是纯悬空引用；人名是“证据粒度与载体错位”。
- 候选：C-05 → BUG-065；C-06 → BUG-066。

## E8 `process-docs` 死指针

- 假设：编号合同搬家后仍有旧路径被当作权威。
- 命令：`test -e packages/company-pack/content/state/process-docs.md; grep -rn "content/state/process-docs.md" packages/company-pack docs --include='*.md'`
- 观察：文件 **MISSING**；仍有 4 处引用：
  `content/templates/meta.md:7`、`content/product-types/business-software/document-map.md:9`、
  `content/product-types/hardware-software/document-map.md:5`、`packages/company-pack/README.md:68`。
  `product-definition` skill 的同一指针已被修复方改掉，这 4 处仍在。
- 结论：**证实**。基线 `pnpm verify` 曾 ALL PASS，说明这些反引号路径不在门禁扫描面。
- 候选：C-07 → BUG-067。

## E9 base-clean 是否漏掉部署个案语言

- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e9-base-clean-blindspot.mjs`
- 原始输出：[raw/e9.txt](experiments/raw/e9.txt)
- 观察：默认章程仍有“公司财务 agent 案”“日期待核”“公司内部财务 agent workflow 动议”；`base-clean` 对现状判 **OK**；
  往临时副本的 charter 再加一句“客户 X 的财务 agent 案：日期待核”，仍判 **OK**。
- 结论：**证实**。门禁只查日期前缀/归档引用，不查个案散文；教义“零部署历史”没有被完整执行。
- 候选：C-08 → BUG-068。

## E10 T1/T2 与 10% 政策线

- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e10-tier-policy-coverage.mjs`
- 原始输出：[raw/e10.txt](experiments/raw/e10.txt)
- 观察：两个 overview 头写“加载：T1 摘要”，manifest 都登记在 **t2**；`content-manifest` OK。
  `charters/cfo.md` 有“服务信用 ≤ 当年维护费 10%”，`policy-lines.md` 的 10% 命中 **0**；`content-single-home` OK。
- 结论：**证实**。tier 声明与政策数字都只是自由文本，门禁只覆盖了部分形状。
- 候选：C-09 → BUG-069。

## E11 `maxDepth` 绝对语义

- 命令：`node --import tsx/esm _backlog/_archive/research/two-product-structure-audit/experiments/e11-maxdepth-truth-table.mjs`
- 原始输出：[raw/e11.txt](experiments/raw/e11.txt)
- 观察：真值表 `parent=1/max=1 → child 2 → THROW SubagentDepthError`；delegation.md 第 40 行却说
  “`vp_eng` 行 maxDepth 1——VP-Eng 可能是团队成员（depth 1），子代落 2”。
- 结论：**证实**。绝对语义下该例子不成立；若指 `vp_cmo`（maxDepth 2）则文案混了两行。
- 候选：C-10 → BUG-070。

## 候选 → 卡

| 候选 | 结论 | 卡 | 严重级 |
|---|---|---|---|
| C-01 允许值多源 / 幽灵第三类 | 证实（E1 + E2） | [BUG-061](../../fixed_bugs/BUG-061-product-type-allowed-values-drift.md) | P1 |
| C-02 默认类型与业务叙事相反 | 证实（E3） | [BUG-062](../../fixed_bugs/BUG-062-default-product-type-contradicts-business.md) | P1 |
| C-03 播种恒为硬软合同 | 证实（E4） | [BUG-063](../../fixed_bugs/BUG-063-bootstrap-process-docs-always-hardware.md) | P1 |
| C-04 方法不随类型 | 证实（E6） | [BUG-064](../../fixed_bugs/BUG-064-methods-not-product-type-aware.md) | P1 |
| C-05 CFO 费率悬空 | 证实（E7） | [BUG-065](../../fixed_bugs/BUG-065-cfo-rate-card-missing.md) | P1 |
| C-06 COO seat 级名册缺失 | 证实（E7） | [BUG-066](../../fixed_bugs/BUG-066-coo-person-level-staffing-without-roster.md) | P2 |
| C-07 process-docs 死指针 | 证实（E8） | [BUG-067](../../fixed_bugs/BUG-067-process-docs-dead-pointers.md) | P1 |
| C-08 base-clean 漏个案语言 | 证实（E9） | [BUG-068](../../fixed_bugs/BUG-068-base-clean-deployment-case-language.md) | P2 |
| C-09 T1/T2 与 10% 门禁覆盖 | 证实（E10） | [BUG-069](../../fixed_bugs/BUG-069-tier-policy-gate-coverage.md) | P2 |
| C-10 maxDepth 例子错误 | 证实（E11） | [BUG-070](../../fixed_bugs/BUG-070-delegation-maxdepth-example-wrong.md) | P2 |
| D-01 硬软能力无前置检查 | 证实（E5） | —（决策项） | — |

> 2026-11-11 收口：C-01 / C-02 / C-03 已修并迁
> [fixed_bugs](../../fixed_bugs/README.md)；修复后 E1/E2/E4 与 E16 复跑见文末。

## E16 red-team 新门禁 `product-type-sources`

- 背景：修复方已新增 `checks/gates/product-type-sources.mjs` 并接入 `run-gates`；本实验在临时 root
  复制 content/presets/docs，逐案变异，验证“该红则红、该绿则绿”。门禁快照 = 2026-11-11 00:45 左右。
- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e16-redteam-product-type-sources.mjs`
- 原始输出：[raw/e16.txt](experiments/raw/e16.txt)
- 结果：

| 案例 | 变异 | 门禁 | 判断 |
|---|---|---|---|
| C0 | 当前真树（修复方已改内容） | GREEN | 符合预期：修复方内容已满足门禁 |
| C1 | “未来类型”移出可选表 + playbook 标记 | GREEN | 符合预期 |
| C2 | 默认值写成 YAML 引号 `productType: "business-software"` | **RED** | **误伤**：合法 YAML，门禁把引号算进 id，解析不到 |
| C3 | 默认值带行内注释 `productType: business-software # 默认` | **RED** | **误伤**：合法 YAML，正则 `\s*$` 不匹配，报“缺 productType” |
| C4 | 可选面裸写 `project-services`（不加反引号） | GREEN | 覆盖边界：门禁只抓反引号/路径/字段；裸散文不判 |
| C5 | 品类表保留“未来类型”行（带 future 标记） | **RED** | 策略选择：门禁不允许 future 行留在表里；当前 skill 已写“不要列进可选表”，不算缺陷 |
| C6 | 从 CMO/meta/CEO 删掉 `business-software` | GREEN | 完整性不判；但 meta/CMO/CEO 已改为指向类型包目录，不再维护第二套枚举，故不构成缺口 |

- 结论：
  - 门禁主目标成立：当前真树因修复方已改内容而绿；未来类型 playbook 已标 future；默认值可解析。
  - **真实问题 = C2/C3 误伤**：`company.md` 的合法 YAML 写法会让 `pnpm verify` 红。建议 ④ 用 YAML 标量解析
    （去引号、切 ` #` 注释）或至少剥引号 + 允许行尾注释；加 C2/C3 两条回归用例。
  - C4 是有意边界（“反引号 id 才算选值”），但该约定没写在门禁头注里；补一句即可。
  - C5 是策略不是缺陷；若产品要把“第三类（未来）”列在表里，需要门禁支持带标记的 future 行；当前选择是
    “未来类型不进表”，与 skill 文案一致。
  - C6 不再是缺口：第二套枚举已被移除（meta/CMO/CEO 指向 `content/product-types/`），不需要完整性门禁。
  - 未开新 BUG 卡：门禁由修复方持有，先报给他们；若他们不收，再按 P2 立卡。
  - **修复方回应（2026-11-11）**：C2/C3 已修——`/req check`、bootstrap、`kb-seeds`、两道门禁统一按
    YAML 标量解析（去引号、去 ` #` 注释）；`req-command.spec` / `bootstrap.spec` / `kb-seeds.spec` 加回归。
    E16 复跑 C2/C3 = GREEN；C0 因真树已修而 GREEN；C4/C5/C6 按已定边界保留（不抓裸散文 / 未来类型
    不进表 / 指针面不判完整性）。

## E12 工具面矩阵

- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e12-tool-surface-matrix.mjs`
- 原始输出：[raw/e12.txt](experiments/raw/e12.txt)
- 观察：support preset 与文案基本一致——`quality-loop-verifier` 有 `write:false`/`edit:false`、无 bash；
  `worker` 无 team/subagent/workflow/control/ask-user/present；`worker-researcher` 只读；CEO 无 control 行；
  只有 vp-eng 有 `tool-workflow`。`team` 列全为 `—` 是预期的：team 工具在 bundle 层，不在 preset YAML 里。
- 结论：**未发现新缺陷**。矩阵正则会把注释里的 `dsh-tool-subagent` 算成“有”，这是脚本局限；
  该实验反而证伪了“tool surface 与文案大面积不一致”的怀疑。

## E13 质量环独立性

- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e13-quality-loop-independence.mjs`
- 原始输出：[raw/e13.txt](experiments/raw/e13.txt)
- 观察：`quality-loop` skill、`review-protocol`、`docs/guides/quality-loop.md` 都明确写
  “上下文独立复核（同模异上下文，独立性有限）”“不得报成异人/双人复核”；verifier 无 bash、write/edit 关闭。
- 结论：**未发现过度声称**。独立性的边界已被文档承认；这是设计限制，不是缺陷。

## E14 四个动议走查

| 动议 | 类型 | 走查结果 | 卡 / 决策 |
|---|---|---|---|
| 硬软一体新品 | `hardware-software` | `/req check` 三层通过；SyRS/IRS/V&V 可选；但 CFO/COO 方法仍是项目制，org 无硬件席位 | BUG-064 + D-01（能力前置检查） |
| 企业软件 SaaS | `business-software` | `/req check` 通过；CFO 仍按 3-4-3 + 维护年费，COO 仍按 SOW/UAT | BUG-064 |
| ERP 集成项目 | `project-services` | 仍是“未来类型”：`/req check` 报未知类型；business-software 排除 SOW，hardware-software 又要求硬件 | D-02（第三类何时发布 / 公司 SI 主业用什么类型） |
| 现有客户增购 | 无 | CMO（新市场/新产品）vs VP-Sales（现有客户/定价）路由清晰，未发现重叠 | 无 |

- 结论：前三个动议各有明确卡点；第四个证伪了“路由表必然重叠”的怀疑。

## E15 反证

- 命令：`node _backlog/_archive/research/two-product-structure-audit/experiments/e15-falsification.mjs`
- 原始输出：[raw/e15.txt](experiments/raw/e15.txt)
- 结果：
  - H1 “org 编制总数 ≠ 50” → **REFUTED**（25 行合计 50）。
  - H2 “worker 带 team/subagent/workflow/control/ask/present” → **REFUTED**（0 条）。
  - H3 “quality-loop-verifier 能写/能跑 bash” → **REFUTED**（只读）。
- 结论：这三条怀疑是错的，记录为负知识；本次审计的正面发现不是“看什么都像 bug”。

## 下一步

- 已完成：E0–E16（E14 为走查）；10 张卡（061–070 全部已修）。
- 待跑：无；修复方已复跑 E1/E2/E4/E16 与 `pnpm verify`，收口见两篇 Note。

## 已知边界

- E2/E4 证明的是 handler / bootstrap 的真实行为，不是真模型会话行为；真模型是否会“照 skill 选 project-services”尚未跑（需 key）。
- E3 是文本一致性结论，不是运行时判定；默认值是否“应该”是 business-software 仍取决于公司与样例的定位，卡里单列待拍板。
- E16 是门禁快照；修复方继续改门禁后需重跑。

## 2026-11-11 根因组 A 修复后复跑

- E1：`project-services` 在所有 agent 选值面为 `—`（类型目录 = 2；mrd 示例仍 business-software）。
- E2：business-software → `kind: success`；project-services → `kind: error`（可用 2 类）。
- E4：`business == hardware: false`（修前 true）；process-docs sha business `fbbb32d3…` /
  hardware `7502db26…`。
- E16 复跑：C2/C3（引号 / 行尾注释）由 RED 转 GREEN——按 YAML 标量解析并加回归；C0 因真树已修
  而 GREEN；C4/C5/C6 是已定边界（不抓裸散文 / 未来类型不进表 / 指针面不判完整性）。
- 决定与红→绿原话 = [Note](../../../../notes/implemented/2026-11-11-product-type-single-source.md)。


## 2026-11-11 经营组 B/E 修复后复跑

- E6：`business-software` 列不再全 0——命中只出现在明确“不适用 / fail-closed”句
  （project-economics / ops-feasibility / pricing / sales-workflow）。
- E7：`cfo-workflow` / `project-economics` 的“费率基准见 org.md/CHARTER” claim 消失
  （`claim: (no match)`）；`ops-feasibility` 的“写不出人名 = 没人”已删除；`owners <待填>=8` 保留为部署状态，
  但 COO 现在报“配置缺口”。
- 决定与红→绿原话 = [Note](../../../../notes/implemented/2026-11-11-method-contract-type-facts.md)。

## 2026-11-11 内容/门禁组 C + D 修复后复跑

- 067：`pack-content-paths ×9`；4 处 process-docs 旧指针清零（grep 空）；反证改回旧路径 → 红。
- 068：`base-clean` 对“客户 X 的财务 agent 案：日期待核；内部动议”判红；默认章程清零。
- 069：`content-manifest` tier 对账（overview T2）；`content-single-home` 从 policy-lines 派生
  9 个政策数字，content / presets / src 零复述；反证 tier / 30% / 删核心线 → 红。
- 070：`delegation-depth-truth-table.spec.ts` 5 passed；1/1→THROW、1/2→ALLOW 由 vendor
  `resolveChildDepth` 钉住；`doc-budget` 114/120。
- 决定与红→绿原话 = [Note](../../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)。

## 2026-11-11 研究侧独立复核（10/10）

- 全量：`pnpm verify` **ALL PASS**；`pnpm test` **175 files / 1463 tests passed**；`pnpm typecheck` 退出 0；
  `preset-smoke` **ALL PASS（6 角色 + 5 support）**。
- 复跑研究脚本（`raw/after-fix/`）：
  - E1：可选面只剩 hardware/business；`project-services` 仅作未来 reference。
  - E2：business-software success；project-services 仍 error（未来类型，预期）。
  - E4：business 3 层 / hardware 5 层，`business == hardware: false`。
  - E6：business-software 命中只出现在 fail-closed 句；方法契约门禁 PASS。
  - E7：费率指向 `rates.md`、席位指向 `roster.md`；`<待填>` = 配置缺口，不再判“没人”。
  - E9：默认章程个案语言清零；临时副本加个案句 → 红。
  - E10：overview 头 = T2 且与 manifest 一致；10% 移入 policy-lines；门禁派生 9 个政策数字。
  - E11：1/1→THROW、1/2→ALLOW 真值表与文档一致。
  - E16：C0–C6 全部符合已定边界（C2/C3 已修；C4/C5/C6 是政策边界）。
- 卡：BUG-061..070 全部在 `_archive/fixed_bugs/`；Next BUG ID = 71；固定索引/活跃索引一致。
- 残余（不是回归）：
  - **D-01** 硬软能力无前置检查（org 无硬件席位）；**D-02** project-services 第三类何时发布。
  - `rates.md` / `roster.md` 出厂是 `<待填>` 模板，填数是部署动作；方法契约已 fail-closed。
  - 方法契约暂时把项目制/SI 方法挂在 `hardware-software`，因为 `project-services` 未发布；
    Note 已写明，第三类发布时需搬迁方法。
- 结论：**10 张卡均满足各自「已修判定」，未发现回归**；剩余两项是已登记的设计决策，不是本次修复的失败。

## 2026-11-11 两轴 v1：project-services + managed-service

决定与实现 = [Note](../../../../notes/implemented/2026-11-11-delivery-mode-axis.md)。

### 测试资产矩阵（“有这一侧，另一侧呢？”）

| 关切 | product-type 侧 | delivery-mode 侧 | 对称性 |
|---|---|---|---|
| 包形状 | `tests/content/product-types.spec.ts` + `tests/presets/product-type-coverage.spec.ts`（五件齐 + playbook + fixture） | `tests/content/delivery-modes.spec.ts`（包 + requiredSections） | 两侧都有；类型多 fixture，模式多模板 |
| 唯一枚举门禁 | `checks/gates/product-type-sources.mjs` | `checks/gates/delivery-mode-sources.mjs` | 两侧都有；负例合并进 `tests/checks/two-axis-gates.test.mjs` |
| 行为矩阵 | `tests/host/commands/product-type-scenarios.spec.ts`（默认链 / SyRS 可选 / 类型不支持层 / 缺层） | `tests/host/commands/delivery-mode-scenarios.spec.ts`（两类型 × 四模式 + 占位/引号/注释/未知/误写 + 缺文档提醒） | 两侧都有 |
| 角色方法 / workflow | 产品类型不挂经营方法；唯一枚举在 product-definition 品类表（by design） | `tests/presets/delivery-mode-coverage.spec.ts`（每模式三角色方法 + 三 workflow + persona） | **刻意不对称**：类型决定需求链，模式决定经营方法 |
| awareness | `product-type-coverage`（meta/手册/CEO 指针 + 品类表 + fixture） | `delivery-mode-coverage`（meta/手册/product-definition/CEO/经营 persona） | 两侧都有；模式多 persona 面 |
| 运行时回执 | 类型来源/未知类型/需求层子集（`req-command`） | 交付模式回执/未知模式/缺文档提醒（`req-command`） | 同一命令、两个轴 |
| fixture | `tests/fixtures/companies/*` 按公司身份 | 场景测试里的临时动议 fixture（不落静态树） | **刻意不对称**：类型是公司身份，模式是动议属性 |

### “加东西”的清单

1. `content/delivery-modes/<id>/`：overview + document-map + delivery-rules + templates + glossary。
2. `meta.md` / `AGENTS.md` / `product-definition` / CEO step / 经营 persona 的 awareness。
3. CFO / COO / VP-Sales 各至少一个方法，契约写 `适用交付模式 = <id>`。
4. 三个 workflow 写 `交付模式` 分派 + fail-closed。
5. `/req check` 回执点名模式；缺模式文档时给 warning。
6. 四个测试：包形状、coverage、scenario、awareness；sources 门禁。
7. 少一件：coverage / scenario / gate 会红。

### 验证

- `pnpm verify` **ALL PASS**；`pnpm test` **180 files / 1514 tests passed**；`pnpm typecheck` 0；
  `preset-smoke` **ALL PASS**；`two-axis-gates-smoke` **ALL PASS**。
- 原始输出：`experiments/raw/e28-*`、`e30-*`、`e27-two-axis-gates-smoke.txt`。

## 实验索引（E17–E39）

> 计数是快照；现行以 `pnpm verify` / `pnpm test` 输出为准，不在文档里手抄长期数字。

| 区间 | 目的 | 资产 / 证据 |
|---|---|---|
| E17–E20 | BUG-061..070 修复后复跑；两轴 v1 首轮 verify/test | `raw/e17–e20*` |
| E21–E26 | 两轴包形状 / coverage / scenario / 对称性 / warning | `tests/content/delivery-modes.spec.ts`、`tests/presets/{product-type,delivery-mode}-coverage.spec`、`tests/host/commands/{product-type,delivery-mode}-scenarios.spec`、`raw/e21–e26*` |
| E27–E30 | 两个 sources 门禁负例 smoke；persona awareness；全量绿 | `tests/checks/two-axis-gates.test.mjs`、`raw/e27–e30*` |
| E31–E34 | issues / notes 留痕：已结卡 + 活跃 v2 卡 + Note 双向链接 | `_archive/settled_issues/2026-11-11-delivery-mode-axis.md`、`_archive/settled_issues/2026-11-11-delivery-mode-v2.md`、`raw/e33–e34*` |
| E35 | 2×3 方法适用性真值表（方法看交付模式，不看产品类型） | `tests/presets/two-axis-applicability.spec.ts`、`raw/e35*` |
| E36 | 真实合同差异 + 真实 content bootstrap（BUG-063 内容级反证） | `tests/content/type-seed-divergence.spec.ts`、`tests/host/run-bundle/bootstrap-content.spec.ts`、`raw/e36*` |
| E37 | `content-single-home` 正向必需项：删「服务信用」必须红 | `checks/gates/content-single-home.mjs`、`raw/e37*` |
| E38 | 门禁负例 smoke：method-contract / pack-content-paths / content-single-home / content-manifest / base-clean | `tests/checks/gates-negative.test.mjs`、`raw/e38*` |
| E39 | 独立审计采纳后的 targeted 复跑（真合同 / 2×3 / 两轴 scenario） | `raw/e39*` |

### 审计采纳取舍（摘要）

- 采纳：2×3 适用性真值表、真实合同/播种差异、`content-single-home` 必需项与负例、受关注门禁的负例 smoke、
  `delivery-rules` 的 file/requiredFields/v1Reminder 校验、manifest 派生预算、导航与空测试修正。
- 部分采纳：安装形状不做全量指针重构，改为手册前言明确“`content/...` 与 `<company-content>` 同根”+ 新指针测试；
  行为层不加真模型 E2E，改为在 Note 显式降级“行为未验”。
- 不采纳：默认交付模式不由测试审计替产品决定（留在 v2 活卡）；不为 69 个门禁全部补负例（按材料性选）；
  不把现有硬件 R1–R10 合同测试改写成泛化矩阵（保留硬件合同 + 新增 business 差异测试）。

## 2026-11-11 交付检查 v2（E40–E45）

- 决定 = [交付检查 v2 Note](../../../../notes/implemented/2026-11-11-delivery-check-v2.md)；
  已结卡 = [2026-11-11-delivery-mode-v2](../../settled_issues/2026-11-11-delivery-mode-v2.md)。
- `/delivery check` 独立命令：`productized` 无要求；`project-services` / `managed-service` 按
  `delivery-rules.json` 查 `documents.file` + `requiredSections`；未知模式 error；productized + SOW/SLA 提醒。
- D-01：`hardware-software/capabilities.md` 八类能力 + 缺席位报缺/不进入报价；overview + product-definition 指向。
- 未做：productized 方法（以后做，触发 = 真实产品报价/定价动议）；默认交付模式保留 `productized`。
- 测试：`delivery-command.spec` 9 例、`hardware-capabilities.spec` 2 例；全量 **185 files / 1537 tests**。

| 实验 | 目的 | 证据 |
|---|---|---|
| E40 | 审计采纳后 verify | `raw/e40-verify-audit-adoption.txt` |
| E41 | 审计采纳后全量 test / typecheck / 两个 gate smoke | `raw/e41-*` |
| E42 | `/delivery check` 单测 | `tests/host/commands/delivery-command.spec.ts`、`raw/e42-delivery-command.txt` |
| E43 | v2 能力前置测试 + typecheck | `tests/content/hardware-capabilities.spec.ts`、`raw/e43-*` |
| E44 | v2 全量 verify/test/typecheck/preset-smoke | `raw/e44-*` |
| E45 | v2 归档后全量 test | `raw/e45-test-v2.txt` |
