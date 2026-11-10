---
topic: 需求/组队落地卡集的整体审计——结构、依赖、一致性、自洽与方法合规
intent: 把 13 张卡放在一起查系统性/结构/一致性/逻辑与方法满足度，记录审查后修正与剩余风险；不授予实施
---

# 卡集审计（2026-11-07）

## 1. 范围与方法

- **范围**：`_backlog/issues/` 全部 13 张——1 张 SA/SQA 推敲卡（不属本程序）、1 张程序伞卡、11 张执行卡。
- **机械审计**：frontmatter/status 镜像、`## 验收标准` / `## 测试资产` 在场与表列数、Note 路径、上游回链、索引、依赖 DAG、文件存在、Markdown 链接。
- **人工审计**：覆盖（有无漏面/双 owner）、依赖方向、Note 粒度、方法合规、过度声明、证明边界。
- **方法**：`validation-design` / `validation-evidence` / `issue-to-note` / `requirements-probes` / `requirements-synthesis` / `requirements-elicitation`（`_backlog/methods/`）。

## 2. 总结论

卡集**覆盖闭合、依赖无环**；每张执行卡都有独立结果、`## 验收标准` 与 `## 测试资产`。审查发现 **21 个质量问题**，均已处置：20 个直接修正；1 个（Note 粒度）按已批准口径收敛为 **1 份程序 Note**（不是 11 份）。剩余风险 6 条（§6）。

## 3. 发现与修正

| # | 维度 | 问题 | 证据 | 处置 |
|---|---|---|---|---|
| 1 | 系统性 | 11 张卡各计划 1 篇 Note，共 11 篇 | `notes/README.md` §二：Note 只收持久决定，不收收据/流水 | 改为 **1 份程序 Note**（伞卡 `note`）；执行卡 `implementation`，不再各写 Note |
| 2 | 一致性 | 卡里各自写不同的 Note 文件名 | 机械审计：`Note 计划 \`2026-11-07-...\`` | 统一到**一份**程序 Note（文件名 `2026-11-07-requirements-teaming-program.md`，待建，落 `notes/implemented/`）；未建件只写文件名不写完整路径（`_backlog/` 活跃卡在 bare-path 硬档） |
| 3 | 可追溯 | 11 张卡缺回链到伞卡/研究题 | `research/README`：新卡要链回题名页 | 每卡加 `> 上游：` 链伞卡 + 研究材料 |
| 4 | 自洽 | 卡 `去向=implementation` 却指向程序 Note，类型语义冲突 | `issue-to-note` 的类型表 | 伞卡 = `note`（程序 Note）；执行卡 = `implementation`（提交即载体，决定理由见伞卡 Note） |
| 5 | 证据 owner | A1 的 `meta` 字段路由到 `tests/host/run-bundle/bootstrap.spec.ts`，实际 `validateMeta` 在 `tests/harness/tools/deliverables.spec.ts` | 目录实况 | 改 owner，补 `meta` 测试资产行 |
| 6 | 过度声明 | A4a 用既有 SA/SQA 探针证“SA 出 SyRS/IRS”，但该探针只证 E/V 接线 | 探针任务书 | 改为“既有探针证接线；A8 证 SyRS/IRS” |
| 7 | 过度声明 | A4b 写“结论不被删”，但探针只断言“结论在场” | 探针断言 | 改为“结论在场；删除会红” |
| 8 | 弱 owner | A6 的“角色不自证”路由到 `presets.spec`/`handbook.spec`，两者未断言此条 | 现有 spec | 改为“handbook 文案 + 用户 review；如加断言落 `handbook.spec`” |
| 9 | 覆盖 | B2 没列仓库合同页（`docs/guides/product-definition.md` 等） | 伞卡旧 C6 的 docs 面 | B2 补 docs；按 owner 分给 A1/B1/B2，避免双 owner |
| 10 | 自洽 | A1 依赖行 `—（A2/A3/... 的上游）` 被机械读成 A1 依赖 A2 → 假环 | DAG 扫描 | 改 `—（无上游）` + 单独 `**下游：**` 行 |
| 11 | 归属 | 伞卡 A1 行仍写 `seed`，但 seed 已归 A7 | 伞卡表 | A1 行去掉 `seed` |
| 12 | 自洽 | A2 说“六个模板都有 `layer/definition`”，但 allocation 是附录、不是需求层 | 模板语义 | 改“五个需求模板有 layer/definition；allocation=`definition: none`、不立号” |
| 13 | 自洽 | PRD 的 `source`（MR 来源）与共识的 `traces`（跨层上游）混用 | `prd-check` 认 `source`；共识 R7 写 `Traces:` | 明确：`source` 保留为 MR 来源；`traces` 记 StRS/REQ；`/prd check` 仍认 `source` |
| 14 | 文字 | B2 排除项写 `CIO` | 笔误 | 改 `CEO` |
| 15 | 测试资产 | A3/A4a/A4b/B1 改角色内容，却没排 `probe-smoke`（角色连通/人格进 prompt） | `checks/smoke/probe-smoke.mjs` 头注：角色内容改动后跑 | 四卡补 `probe-smoke` 快档行 |
| 16 | 测试资产 | B1 改 `CultivationBoard` 用户可见文案，却没排 `client-load-smoke`/`ui-scene-smoke` | `tests/README.md` client 面板行 | 补 `client-load-smoke` + `ui-scene-smoke --isolated --golden`（如金样含文案） |
| 17 | 覆盖 | A6/B1 改包行为/已知限制，却没排 `packages/company-pack/README.md` | `notes/README.md`：pack 行为面同 diff 更新 README 已知限制 | A6/B1 补 pack README |
| 18 | 覆盖 | B1 没排 `docs/runtime-map.md`/`notes/implemented/2026-11-10-roles-isolation-rationale.md` 的旧继承说法 | 两文有“继承 Lead 组合”表述 | B1 补“如引用旧说法” |
| 19 | 覆盖 | A1 改了 `docs/guides/product-definition.md`，却没有对应验收行 | A1 scope 有该文件 | 补文档形状验收行 |
| 20 | 证据 | A7 迁移只写“手动命令 + diff”，不可复现 | `validation-evidence` §3 要 exact command/artifact | 补 `cp <file> <file>.bak-2026-11-07` + `diff -u` |
| 21 | 覆盖 | V1 词表盲测只在伞卡 D2/研究材料，没落到任何执行卡的验收/测试资产 | 共识 §7 / 伞卡 D2 | A1 补 V1 人工 gate（不写代码；结果记研究材料） |

## 4. 集合级检查（当前状态）

- **覆盖**：合同/模板/角色/host/tools/gates/tests/docs/workspace/release/Note 均有 owner；E2E 在 A8、组队在 B1、收口在 B2。
- **依赖 DAG**：A1 → A2 → A5 → A6 → A7；A3/A4a/A4b → A8；A5/A6 → A8；B1 → B2；A8 → B2。**无环**（A1 的假环已修）。
- **单 owner/串行**：A1 与 A7 拆 seed；A1 与 B1 按节改 `content/AGENTS.md`；A1/B1 与 B2 按“正文 owner / 核对 owner”分；A3/A4a/A4b/B1 串行改 `tests/presets`。
- **状态/索引**：13 张活跃；11 张执行卡 + 伞卡 `待落地`；SA/SQA 卡 `推敲中`；`issues/README` 索引全部。
- **Note**：伞卡 `note`（1 份程序 Note）；执行卡 `implementation`；无 11 份 Note。
- **测试资产**：每卡有 owner/命令/证明什么/不证明什么/红证；新 spec/probe 标“待建”；A5 的 lab 是人工 trial，不是回归资产；A8/B2 真模型不进 `pnpm test`。

## 5. 方法合规矩阵

| 方法 | 要求 | 现状 | 缺口 |
|---|---|---|---|
| `validation-design` | 行为类别/输入状态/判红/负例/证据 owner/人的判断 | 11 张执行卡都有 7 列表 | 部分“人的判断=无”，已显式写 |
| `validation-evidence` | 现有 owner 优先；新守卫先红；无 owner 记 blocked；证明边界 | 每卡有 owner/命令/证明/不证明/红证 | A5 lab 是人工 trial（已标 blocked/非回归）；A8/B2 新 probe 标“待建” |
| `issue-to-note` | 类型/目的地；待落地只写 inline code | 伞卡 `note`，执行卡 `implementation`；路径 inline code | 程序 Note 待建 |
| `requirements-probes` | 长证据进 research，短结论回卡 | A5/A8/B2 已写 | V1 已跑（A 组胜出）；V2/V4/V11 已跑原型 trial；A5 真 checker 待建 |
| `requirements-synthesis` | 方案/备选/理由/结论 | 伞卡 D1–D8 有推荐/理由/反选代价 | 无 |
| `requirements-elicitation` | 目标/边界/已确认/待确认 | 每卡有范围/排除/依赖 | 无 |

## 6. 剩余执行门槛（6 条，均有缓解）

> BUG-034/035 已修（commit `7da331a`，卡归档到 `fixed_bugs/`）；A3/A4a/A4b/B1 解锁，`tests/presets` 仍串行。

1. **A5 真 checker 未建**：V1/V2/V4/V11 已跑原型/单次（见[验证记录](2026-11-07-validation-trial.md)）；lab 不是证据 owner，原型不是产品代码。
2. **A8/B2 真模型包未跑**：探针规格已写（[probe specs](2026-11-07-probe-specs.md)），需实现后跑；一轮样本有方差，成本 10–20 分钟。
3. **A1/B1 共改手册**：section map 已写进两卡——A1 只碰「产品定义的文件名固定」/五层链/编号段；B1 只碰「组合继承」「星型汇报」「多门模式」「问人两条路」段。
4. **B2 文档预算**：move plan 已写进 A1/B1——`presets.md` 移 researcher/SA/SQA 长理由段；`delegation.md` 移 §6 验证表细节到 `tests/README.md`/脚本头注；`product-definition.md` 移 playbook 表到共享 skill reference。
5. **A7 迁移**：runbook 已写进 A7（备份/diff/新动议 marker/旧动议 skipped/用户确认）。
6. **程序 Note 单 owner**：结构已写进伞卡（决定/输掉的方案/落地/验证/剩余风险/上游卡）；B2 只追加证据，不另写 Note。

## 7. 验证记录

- `backlogLivenessProblems('_backlog')`：**全绿**（BUG-034/035 已归档，不再红）。
- `validateMarkdownLinks('.')`：`_backlog/` 无违规。
- 机械审计：11 张执行卡状态镜像 OK、`## 验收标准`/`## 测试资产` 表列一致、Note 路径统一、`> 上游` 全在、DAG 无环。
- **已跑**：V1 盲测（1 次真模型）、V2/V4/V11 原型 trial（keyless/人工）；记录 = [验证记录](2026-11-07-validation-trial.md)。
- **未跑**：`pnpm verify` / `pnpm test` 全量、A5 真 checker、A8/B2 真模型包——本卡集只改 `_backlog/`；产品面证据由各执行卡接管。

## 8. 结论

卡集在结构上闭合、依赖无环、方法义务已落到卡面；**21 个问题已处置**（20 直接修正 + 1 Note 粒度按已批准口径收敛为 1 份程序 Note）。剩余 6 条是执行门槛（A5/A8/B2 需实现；手册/预算/迁移/Note 已有具体缓解），不影响拆法成立；A3/A4a/A4b/B1 已解锁，`tests/presets` 串行即可。
