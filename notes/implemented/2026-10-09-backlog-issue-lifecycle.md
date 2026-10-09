# 2026-10-09 · Backlog 问题澄清与下游交接

状态：implemented（2026-10-09 用户要求将 ai_dsh_assitant/_backlog 的思路整体借入本仓；用户确认完整迁移路径与归档材料，不改对应业务功能）

## 问题

本仓把 backlog 定为推敲层、不授权实施，但 `plans/` 的“毕业判断”“毕业四门”、等待卡与活跃卡规则又要求实施范围、触发和门禁验收。大小控制也不够明确：一张卡可能同时承载可独立决定、独立验收的事项。旧规则规定 Notes/RFC 任务来源，却没有同样清楚地区分“backlog 结论足以交接/关闭”和“下游实现已经完成”。

## 决定

整体将 ai_dsh_assitant `_backlog` 的问题卡、缺陷卡、研究、按需方法、结论交接与触发索引模式迁入本仓。前序 D33 记录 [backlog-charter-refit](2026-10-03-backlog-charter-refit.md) 保留为历史决策；本 Note 与当前 `_backlog/` 合同更新其活跃流程约束，不改写 D33 当时的理由与验证证据：

- `plans/` 改为 `issues/`；`reference/` 改为 `research/`；`_done/` 改为 `_archive/`，其 closed/suspended 桶改 settled/suspended issues，缺陷桶改 fixed/suspended bugs，随卡研究材料归档；旧退役池归 `legacy/`，只保留历史意义。
- 问题单位是一个可描述的期望结果或待判问题。简单问题可以简写；大问题先列粗粒度判断依赖和范围外，本轮只细化当前分支。只有能独立决策、独立关闭且结果或触发不同，才考虑拆卡；来源同一不强迫并卡。拆分是说明清楚 owner 与结果的判断，不按行数或大小标签机械拆分，不引入执行票据或队列。
- backlog 的正常关闭条件是结论、确认、可执行验收（适用于“做”）和已提交下游处理/去向记录。关闭不等待 Note 生成或下游实施；若用户尚未确认、事实尚缺，卡留活跃并点名缺口。旧卡已承载实施后验收的保留该验收债，不外推到新卡。
- 延后是结论，可在满足关闭条件后离开活跃区并记录重议条件；未有结论且用户叫停才进入 suspended issues。触发索引从参考仓借入严格准入与扫描义务，不将延期清单再造为第二任务源。
- 按需要调用七篇方法；保留参考仓固定版本的外部技能来源和完整本体读取要求。本仓的验收证据依据与命令以 `docs/testing.md`、`tests/README.md`、`checks/README.md` 为准；没有对应证据 owner 时明确受阻，不虚构外仓脚本。
- 现有活跃问题保留原文档名和已验证事实；decision-ledger 卡不再预设所有 design 依据都必须迁为 Note，stale-pointer 卡拆出事故护栏问题卡。两张新旧问题均未获授权实施其业务改动。

同步更新根布局、docs/index、开发环、RFC/Note 分类入口及全仓 Markdown 链接目标；历史叙述正文不因路径迁移而重写。归档卡的状态语义作为历史原文保留。

## 输掉的方案

- **只把 plans 改名为 issues，保留毕业四门和等待卡**：保留“问题未结”与“已有结论但延期”的状态混淆，不能解决用户指出的尺寸和关闭边界。
- **把整个 backlog 改成实施任务清单，或要求所有已决定工作都留活跃等待**：会创建第二任务家并与已批 RFC/用户授权冲突；backlog 卡不授权实施。
- **用卡片行数或 S/M/L 分类作拆分标准**：无法表达决策依赖和结果独立性，会令尺寸刻度本身变成另一套流程。
- **按同一来源或目录归属机械拆卡/并卡**：来源相同的事项仍可能有不同决定与关闭条件；拆分标准应是可独立决策与关闭。
- **全量重写历史归档内容或回填所有 frontmatter**：历史讨论本身是证据；只迁位置、修导航并对新活跃卡使用现行模板，避免伪造当年字段和判断。
- **将来源仓的验证脚本、runner 路径和实现命令原样复制**：该仓 owner 不存在于本 repo；使用本仓验证地图，找不到合适证据时报告缺口。

## 后果

`_backlog` 的 current owner 为其章程与 issues/bugs/research/methods/_archive README。任务源仍是用户点名和 notes/proposed 的已批 RFC；backlog 结论或申请本身不是授权。清单门禁负责在场目录、活跃卡字段、方法形状、索引链接和归档生命周期结构，不能证明结论质量、卡片拆分判断或研究证据真实。研究材料随最后一张活跃消费者卡归档；长期参考不属于该区。

## 验证

- 起始 `git status --short`（2026-10-09）为空；8 次 `git mv` 后保留原文件名，归档讨论正文不重写。链接修复只针对 Markdown 目标。
- `pnpm verify`（最终）：ALL PASS，包含 md-links ×1246/255 files、doc budgets 与 `backlog-liveness`。过程首轮发现并修复旧卡/研究互链与本仓不存在的外仓方法路径；裸路径门禁另报告 5 条历史观察，不是失败。
- `pnpm exec vitest run tests/harness/backlog-liveness.spec.ts tests/harness/foundation-links.spec.ts`：39/39 通过。
- 真实文件反例，逐项 `pnpm verify` 红后恢复并重跑绿：问题卡删 `opened` → 报缺字段；归档索引改一个真实目标 → 报卡未被 owner README 索引；暂移 `issues/README.md` → 报必需索引缺失；当天新 research 文件缺 frontmatter → 报缺头。四项恢复后均 ALL PASS。首次错误造红（重复 YAML key、缺失父目录）不计有效证据，修正后重跑。
- `set -o pipefail; pnpm test`：37 个测试文件、379 个用例通过。出现一条 React SSR `useLayoutEffect` 警告，测试退出码为 0；真模型与浏览器验收不适用于本次纯流程/文档变更。

## 适配与来源

借源 `/Users/bowhead/ai_dsh_assitant/_backlog/` 的工作树文件，来源日 2026-10-09，方法定义和目录合同整体适配；无对外部主分支 HEAD 的独立 pin。保留本仓全日期命名、notes 的授权/RFC 边界、本仓测试 owner 以及 `_archive/legacy` 的历史池性质。事故复盘仍属于 `notes/postmortem/`，不迁入问题卡。
