---
status: 已结
opened: 2026-10-16
---

# 推敲：代码结构第三轮改善——宽接口模块接缝 + 观察项触发线

> 立卡：2026-10-16 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是

**问题与期望结果：** 用户 2026-10-16 点名做全仓代码面结构评估（「1) 结构 2) 臃肿 3) SOLID……目的是今后容易搜索到局部，改东西变得简单」），随后令出详尽改善计划（「目标明确，验收有方」「目前短期目标就是计划……别急着实施」）并令落本卡（「计划你来存放到 issues 里面去」「按你的推荐就行」）。期望结果 = 用户圈定范围（推荐 A）并下开工令后，按 2026-10-14 基线法逐项完成第三轮结构收敛（行为零漂移、红绿收据、收尾 Note 互链两篇前轮）；本卡推敲完成 = 范围拍板 + 去向记录。

**当前情况：**
- 基线（2026-10-16 实跑）：`pnpm verify` ALL PASS；`pnpm test` 60 文件 / 559 用例全绿——本轮是绿基线上的纯结构提案，无行为变更目标。
- 快评一项误判已修正：doors 寄居块 2026-10-14 已迁出，[tests/company](../../../tests/company/doors.spec.ts) 的 `<模块>.spec.ts` 一一对应已恢复（[deliverables.spec 尾注](../../../tests/company/deliverables.spec.ts) 是迁出墓碑，非活债务）。
- 本卡是第三轮：前两轮 owner = [2026-10-14 六项重构](../../../notes/implemented/2026-10-14-code-restructure.md) 与 [client-host-replay 局部化](../../../notes/implemented/2026-10-14-client-host-replay-locality.md)；本卡只接它们未接的面，不翻它们的案。
- 用户 2026-10-16 已言「按你的推荐就行」——推荐 A 记为首选范围；开工仍待明示（卡不授予实施权）。

**未决问题：** 无（① 范围 2026-10-16 拍 A；② 开工令已下，授权 = 用户「计划这么详细了, 就setup goal 推动落地」）。

**下一步：** 已全部完成，本卡结档。

> **结论与去向（2026-10-16 结）：** 范围 A **做并已落地**——Item 1（`tools/lib/deliverables.mjs` 506 行拆「形状与身份」210 行 /「声明对账」`deliverables-audit.mjs` 322 行，依赖严格单向；对应 spec 538 行拆基座 128 + 对账 462，恢复 `<模块>.spec.ts` 一一对应）＋ Item 3（`replay-smoke` 头注触发线）。范围外留档：Item 2（`presence.ts` 内部接缝）未做、留独立第二轮；另三条观察项只住本卡上表。
> 实施与验证收据 = [notes/implemented/2026-10-16-deliverables-audit-seam.md](../../../notes/implemented/2026-10-16-deliverables-audit-seam.md)（commit `fa9801f` 触发线＋毕业 / `2e73269` spec 拆分 / `3f0af0b` lib 拆分，加本 Note 归档 commit）；两处实施口径修正（`WARNING` 留基座、`presentResultRows` + `META_FINAL_RESULTS` 迁对账）见 §拍板记录，且已被实测消费面证实。上轮 owner 互链：[2026-10-14 六项重构](../../../notes/implemented/2026-10-14-code-restructure.md)、[client-host-replay 局部化](../../../notes/implemented/2026-10-14-client-host-replay-locality.md)（本卡未翻它们的案）。
> 关闭条件核对：范围已圈定（A）且去向已记录（实施通道 = 用户点名 + 基线法）⇒ 毕业头改「做」、按章程迁 settled_issues、实施与验收证据归收尾 Note（均已完成）。

## 拍板记录（2026-10-16）

范围 A 已批。实施开工前读码复核发现**两处与 §方案与取舍 Item 1 表的偏差**（均须先修正，否则拆出的依赖链会绕一圈）——按既批口径的价值判断（「形状与身份 / 声明对账」一刀两断、依赖严格单向 `audit → 基座`）就地修正，不回退方案：

| 项 | 卡表原列 | 实施口径（实测消费面为据） | 依据 |
|---|---|---|---|
| `WARNING` | 迁 audit | **留基座**（形状/盘面观察码词汇） | check 用 5 个码（SLUG_UNLEDGERED / PLACEHOLDER_CLAIMS / FINAL_WITHOUT_META / META_RESULT_PENDING / META_LEDGER_MISMATCH），其中三个是纯盘面观察，与会话对账无关；进 audit 会逼出 check → audit 的反向依赖 |
| `presentResultRows`（+ `META_FINAL_RESULTS`） | 留基座 | **迁 audit** | 输入 = `auditDeliverables().leadFinalSlugs`（会话侧）、产出 = `VIOLATION.PRESENT_RESULT_NOT_FINAL`，是纯对账面；留基座会逼出基座 → audit 的 `WARNING` 反向依赖 |

结论：`VIOLATION` 迁 audit；`WARNING` 留基座（audit 与 check 各自 import）。22 个导出按此口径划分后无一处反向依赖。分档 commit 由 3 段改 4 段（spec 拆分与 lib 拆分各成一段，使验收标准①的「拆前/拆后」各有可独立实跑的状态）。

## 范围与排除项

范围（三个 Item，可任选组合）：`tools/lib/deliverables.mjs` 拆分（Item 1）；`packages/company-pack/src/lib/presence.ts` 内部接缝（Item 2）；观察项触发线落档（Item 3）。

排除（负清单——翻案须新证据，理由见各「输掉的方案」）：
- 模块大小门禁 gate——门禁升格判据未满足（dev-loop §9：「具体错误复发过」不成立）；
- deliverables / presence 三拆；
- `packages/company-pack/src/client/` 现在分组——2026-10-14 locality 轮已否决过拆（避免过度拆分与跨文件跳转），只立回访触发线；
- `tools/lib/` 现在分组——[layering.spec](../../../tests/harness/layering.spec.ts) 只扫 tools/lib 顶层文件，分子目录会让新目录逃出 keyless 守卫（硬阻碍：先扩扫描再谈分组）。

非目标：任何判据/行为/文案语义变更；刷新 replay 夹具；动 vendor；动工作树里两笔未提交的 company-workspace journal 改动。

## 已知与未决

（事实全部 2026-10-16 实读实跑。）

- 全仓代码（除 vendor）238 文件 / 27,780 行；83% 文件 ≤200 行，仅 5 文件 >400 行（最大 715）。整体结构已被前两轮收敛，本轮只剩局部接缝。
- deliverables.mjs：506 行 / 23 导出；三套词汇混住（路径身份 / meta.md 格式 / 审计语义）；消费面三组互不重叠——[authorship-audit](../../../checks/audit/authorship-audit.mjs) 只拿 2 个身份导出、[deliverables-check](../../../checks/audit/deliverables-check.mjs) 全是审计簇、[claim-race-probe](../../../probes/team/claim-race-probe.mjs) 只要让位行常量；presets.spec 有意不 import（测试侧独立事实源，2026-10-14 轮拍板）。
- presence.ts：396 行 / 17 导出；状态/显示名词汇（约 65 行）与板/事件折算（约 330 行）混住；8 个 client importer + host 入口 `export *` + replay-smoke 经 built 入口拿 presenceFromEvents。
- 构建/门禁面：tsconfig.client 的 include 是目录制（src/lib 整目录）→ 新 lib 文件自动入编；tsdown 走 tsc 产物 → 零配置改动；[pack-exports 守卫](../../../tests/harness/pack-exports.spec.ts) 只钉 inject/apply/无 default；tools/lib 纯逻辑模块无「状态：」头注要求（script-status 只扫脚本面）。

## 方案与取舍

### Item 1（推荐首选）：deliverables 拆「形状与身份 / 声明对账」

目标形状（单向依赖 audit → 基座；新文件 `deliverables-audit.mjs` 与基座同目录）：

| 留在 deliverables.mjs（形状与身份，约 200 行） | 迁入 deliverables-audit.mjs（声明对账，约 310 行） |
|---|---|
| FINAL_BASENAME / DRAFTS_DIRNAME / SOURCES_DIRNAME / ACTIVE_ROOT / ARCHIVE_ROOT；slugFromDirName、normalizeRel、deliverableId、classifyDeliverable；META_TYPES / META_RESULTS / META_FINAL_RESULTS、parseMeta、validateMeta、presentResultRows | WARNING、VIOLATION；PLACEHOLDER_CLAIM/YIELD_LINE + isPlaceholderClaim / isPlaceholderYield；isLeadSession、uncoveredPendingMaterial、partitionArchiveViolations、parseSessionLog、auditDeliverables |

拆分逻辑：「一份交付物是什么、住在盘上哪、形状合不合法」 vs 「会话声明与盘上对账、违了哪条」。基座名不变 ⇒ 现有文档指针（[meta.md 模板头注](../../../packages/company-pack/workspace/templates/meta.md)、[snapshots/README](../../../snapshots/README.md)）零改动。

动刀清单：
1. deliverables-check.mjs：import 拆两行（validateMeta / presentResultRows 留基座，其余指 audit）+ 头注「判据逻辑一份」改指两家；
2. claim-race-probe.mjs 的动态 import 改指 audit（1 行）；
3. authorship-audit.mjs 零改动（只拿身份导出）；
4. deliverables.spec.ts 按 describe 域机械拆出 `deliverables-audit.spec.ts`（audit / 占位让位 describe 迁走，身份 / meta describe 留守）——沿 2026-10-14 恢复的一一对应，顺带消解「大镜像 spec」观察项之一。

输掉的方案：① 三拆（id / meta / audit 三文件）——meta 词表与形状合法性强耦合，第三文件徒增跳转；② 不拆只加分节注释——ISP 证据已过线（authorship 面对 23 导出只用 2 个）。

### Item 2（可选）：presence 内部接缝——状态词汇独立 + facade 保外观

目标形状：新文件 `presence-status.ts`（src/lib，约 70 行）= PresenceStatus、STATUS_LABEL、presenceStatusFromPhase、statusLabelFor、PRESET_DISPLAY_NAMES、displayNameFor；presence.ts 保留折算并再导出词汇模块（facade）。

零外观改动证据链：8 个 client importer 不动；host 入口 `export *` 不动；[replay-smoke](../../../checks/smoke/replay-smoke.mjs) 经 built 入口拿 presenceFromEvents 不动；pack-exports 只钉 inject/apply/无 default；tsconfig.client 目录制自动纳新文件；tsdown 零配置改动。同 diff 义务：[src/README 源码图](../../../packages/company-pack/src/README.md) lib 清单 10→11 + 依赖链补 presence → presence-status。

价值与代价（如实）：价值中等（词汇有独立可搜的家、presence.ts 收敛单一主题），代价低（零 importer 改动）——若只批一项，批 Item 1。

输掉的方案：① 不做 facade、8 个 importer 全改指新家——churn 无收益（多数文件两半都要）；② 词汇再拆两份（状态表 / 显示名表）——70 行模块碎片化。

### Item 3（现不做，只立触发线）

| 观察对象 | 现状 | 触发线 | 触发时动作 | 依据 / 硬阻碍 |
|---|---|---|---|---|
| [replay-smoke](../../../checks/smoke/replay-smoke.mjs) | 715 行 | >800 行或新增第 5 个 mode | 判据 / 驱动器分家（沿 replay-ui 拆分先例） | run-gates 的 >800 先例；落点 = 该文件头注 1 行 |
| src/client/ | 23 文件平铺 | >30 文件或第二次「新组件放错家」 | 按 feature 分组子目录 | 前轮已否决过拆（locality note 输掉的方案） |
| tools/lib/ | 27 模块平铺 | >40 模块或同域散居第 3 次 | 先扩 layering.spec 递归扫描再分组 | layering.spec 只扫顶层（见排除项） |
| 大镜像 spec | 538 / 454 行 | 随其模块拆分自然缩 | 不单独立项 | Item 1 顺带消解其一 |

### 推进选项

| 选项 | 内容 | 特点 |
|---|---|---|
| A（推荐） | Item 1 + Item 3 触发线落档 | 纯 tools/lib 面，不碰 pack 构建；ISP 证据最硬 |
| B | A + Item 2 全幅 | 多一层构建 / 挂载 / 重放验证面 |
| C | 只 Item 2 | — |
| D | 只落触发线，两拆都缓 | 最保守——Item 1 只会越拖越宽 |

## 关闭条件

用户圈定范围（A/B/C/D 或改条目）且去向已记录（实施通道 = 用户点名 + 基线法，或先拆 RFC 由用户定）→ 毕业头改「做」并按章程迁 settled_issues；实施与验收证据归收尾 Note（卡按自身条件离场，不等实施验收）。拍板缓办 → 毕业头改对应结论（以后做 / 不做），触发线照记。

**已满足（2026-10-16）**：范围 = A；去向 = 用户点名 + 基线法，实施已落地并验收（收据见头部结论行）。本卡按自身条件离场。

## 验收标准

（判据全部机械可查，人判断 = 无；证据 owner 均为既有检查面。红 = 变异三步留证——制造 → 见红 → 还原见绿，收据原文进收尾 Note。本节描述下游做成什么算合格，不意味已执行。）

**Item 1：**

| 行为 | 类别 | 通过信号 | 负例（红配方） | 证据 owner |
|---|---|---|---|---|
| 纯搬移零行为漂移 | 确定性 | 拆前/拆后 `pnpm exec vitest run --reporter=verbose` 全名清单 diff = 仅预期搬移 | — | vitest 全名清单（2026-10-14 基线法） |
| 回归全绿 | 确定性 | pnpm test：61 文件全绿（60 + 新 spec） | — | `pnpm test` |
| 新模块 keyless | 结构 | pnpm test tests/harness 全绿 | 塞 node:child_process 进新模块 → layering 红「tools/lib 只能保持 keyless 纯逻辑」 | [layering.spec](../../../tests/harness/layering.spec.ts) + keyless-imports 图 |
| 真入口等价 | 编排 | 拆前/拆后跑 deliverables-check 快照档（命令见下）输出逐行一致、退出码同 | — | [deliverables-check](../../../checks/audit/deliverables-check.mjs) 快照档 |
| 探针引用可达 | 编排 | node 动态 import 新模块断言 PLACEHOLDER_YIELD_LINE 原文在场（秒级绿） | — | node import 断言（真模型档复跑归该探针头注触发） |
| 审计判据钉子 | 确定性 | 新 spec（audit describe 迁移件）全绿 | 临时反转 isLeadSession → 越权断言红（expected … toContain final-presented-by-non-lead 类）→ 还原绿 | 新 spec |
| 结构门禁 | 结构 | `pnpm verify` ALL PASS | — | run-gates |

deliverables-check 快照档命令（明文日志、无 key、秒级；r1-motion 在场已核）：

```sh
source run/env.sh && node checks/audit/deliverables-check.mjs \
  --workspace snapshots/replay/r1-motion/workspace.expected \
  --sessions snapshots/replay/r1-motion --legacy-flat
```

**Item 2：**

| 行为 | 类别 | 通过信号 | 负例（红配方） | 证据 owner |
|---|---|---|---|---|
| 发布面零漂移（facade 设计目标） | 编排 | `pnpm exec vitest run tests/company/presence-board.spec.ts tests/harness/pack-exports.spec.ts` 全绿 | — | [presence-board.spec](../../../tests/company/presence-board.spec.ts) + [pack-exports.spec](../../../tests/harness/pack-exports.spec.ts) |
| 回归全绿 | 确定性 | pnpm test：60 文件 559 用例全绿 | — | `pnpm test` |
| 两半构建 | 编排 | tsc -b + tsdown 两面 complete | — | pack 构建 |
| client 真挂载 | 编排 | `source run/env.sh && node checks/smoke/client-load-smoke.mjs` ALL PASS | — | [client-load-smoke](../../../checks/smoke/client-load-smoke.mjs) |
| 重放真消费面 | 编排 | `source run/env.sh && node checks/smoke/replay-smoke.mjs --scenario r2-motion` ALL PASS | — | replay lane（presence 判据走 built 再导出链） |
| 词汇钉子 | 确定性 | presence-board.spec 全绿 | 临时让 statusLabelFor 未知值直显英文 → 红；若现无未知值断言，同 diff 先补（D-c 定案「未知值落未知」值得钉） | presence-board.spec |
| 文档同步 | 结构 | src/README 源码图更新 + `pnpm verify` ALL PASS | — | doc 门禁 |

**Item 3：** 触发线行在场（replay-smoke 头注 + 本卡上表）+ `pnpm verify` ALL PASS——无行为面。

**全局（任一 Item 获批后）**：动手前录基线（verify PASS 行 + vitest 全名清单 + 涉及审计/冒烟实跑输出，存 runtime gitignored 区）；每项一 commit；红收据原文进收尾 Note；语义审 = 独立子代理盲审四输入（dev-loop §13）。
