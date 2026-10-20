---
status: 推敲中
opened: 2026-10-20
---

# 推敲：fresh agent 全仓打扫卫生——六轴腐化面与修复优先级

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 毕业：未定 ｜ 可关闭：否

**问题与期望结果：** 用户要求以 fresh agent 视角做一次「打扫卫生」，沿六轴检查：
①文档/代码清晰度与渐进披露；②代码结构层次与深模块；③文档-执行-验收的整体结构；
④上下文腐化与偏移；⑤测试资产组织/测试点/覆盖/类型；⑥日志与端到端真实页面观察的反馈通路。
期望结果 = 有实据的分级发现清单 + 可执行的修复顺序，而不是泛泛的「多写文档/多补测试」。
本轮推敲完成 = 证据落盘、用户授权修复、批次进展与剩余登记。

**当前情况：** 审计报告 = [research/repo-hygiene/2026-10-20-fresh-agent-audit.md](../research/repo-hygiene/2026-10-20-fresh-agent-audit.md)。
系统整体健康：本轮 `pnpm verify` ALL PASS、`pnpm test` 76 文件 / 711 用例全绿、
`client-load-smoke` ALL PASS、`preset-smoke` 6 个 preset 全挂、`replay-smoke` r3 full 零 diff、
r2 presence + `--ui` 全绿。问题集中在**总账与反馈面**：新增角色/页签/场景后，手维护的
清单和成本声明没有同步；通用「全部页签」探针是文本级且少一个页签；失败现场落 `/tmp`
且被下一次运行覆盖。最严重的一件 [BUG-029](../_archive/fixed_bugs/BUG-029-committed-web-token-recurrence.md)
（观察窗 token 第二次随 runtime 日志入库）已修：untrack + `.gitignore` + tracked-token 窄扫，
批次 0–2 + 结构切片已完成；剩余三件见下。

**进展（2026-10-20）：** 批次 0（BUG-029/类级 token 守卫）、批次 1（角色数/快照索引/cdp-probe 9 页签+内容/失败现场/src README/runtime/成本声明/checks 索引+script-index 门禁/release-smoke researcher）、批次 2（testing.md 分层与 mock、tests/README 映射、PASS/SKIP、`pnpm diagnose`）与结构切片（docs/index 拆 decisions/external、design 预算、firstText/memberDot、数据面工厂、catalog 契约、SSR 警告）均已完成；证据 = [consistency sweep Note](../../notes/implemented/2026-10-20-fresh-agent-consistency-sweep.md)。

**进展（2026-10-20 第二轮，同日晚）：** 用户令持续跟进，四子代理 + 主 agent 亲跑七条 keyless lane 复评六维度，报告 =
[research/repo-hygiene/2026-10-20-followup-six-dimension-audit.md](../research/repo-hygiene/2026-10-20-followup-six-dimension-audit.md)。
复评结论：上轮批次 0–2 修复全部守住（36 门 / 711 用例 / 6 preset / cdp-probe 9/9 活体复验）；新抓三件硬发现——
① **replay 回归网实际 1/10**：r3 full 档被 21:58 手册去重提交（589d785，纯 docs）打断，「归一化零 diff」红，改动面映射表无「注入面 → replay」行、门禁不跑进程，无人发现；② **BUG A**：diagnose 审批判读字段错位（读 decision/answer，真实 v4 日志是 {id,outcome}——session-1d120f37 一手复现 `approval ? →`，夹具用想象形状故套件绿）；③ **BUG C**：`orient --scenario replay/r3-delegation` ENOTDIR 崩（children 文件/目录假设）。语义面债务清单与改善优先级（P0 反馈通路正确性 → P4 常驻层与检索）见报告 §5，**待用户 REVIEW 选批**。另：用户点名处理 notes/implemented 归档迁移，分诊进行中。

**剩余（不阻塞当前绿）：** ① 手册 187/190 行、26.2KB（同上轮）；② replay 实际 1/10 runnable（r3 待重录或翻 archived——需拍板）；③ host 入口 `export *` 已接受取舍（同上轮）；④ 新增：BUG A/C 修复、注入面 freshness 门禁、四份 ≥95% 文档与 11 份无预算合同的棘轮处置、notes 记忆层检索配方与归档。

**下一步：** 用户 REVIEW 改善清单选批 → 按批实施（P0 为 keyless 小切片：BUG A/C + replay 映射行 + replay-fixture-freshness 门禁 + r3 处置拍板）；notes 归档分诊完成 → 复核执行（同 diff 改链 + 门禁复绿）。

## 范围与排除项

- 范围：`docs/`、根入口、`packages/company-pack/`、`tests/`、`checks/`、`probes/`、`tools/`、
  `snapshots/README.md`、`runtime/README.md`、`company-workspace/AGENTS.md`、`_backlog` 制度面。
- 排除：`vendor/dsh/`（只读，不改）；真模型探针（成本与时长，本轮未跑）；`snapshots/` 的
  历史 payload（只读，不改写）；公司业务产物内容（只看制度与索引，不评业务质量）。
- 本轮真跑过浏览器（client-load / replay `--ui`），但未跑真模型认证档。

## 已知与未决

已知（详见审计报告）：

- 6 个 preset 实际存在，但 README、presets、release、bootstrap、profile、architecture 仍写
  「五角色 / 五张卡」；release-smoke 只验 5 个公司角色，researcher 无安装形状证据。
- `snapshots/README.md` 43 行 vs 盘上 47 个场景；4 个新场景未登记；成品目录仍写「44 行」而
  生成索引是 47；「9 场景 1 可跑」已过期为「10 场景 2 可跑」。
- `cdp-probe.mjs` 的 tabs 数组 8 个（少「成品」），且只断言 `body.innerText` 含页签词，
  不断言面板体内容；`docs/demo.md` 与 `docs/guides/cdp-probe.md` 仍称「全部公司页签」。
- `docs/testing.md` 说 keyless「不证明装配」「现状零 mock」，但
  `tests/client/company-client-composition.spec.ts` 真 boot 生产 client + RemoteMock，
  `tests/harness/foundation-safety.spec.ts` 用 `vi.mock('node:os')`；层表与成本预算都过期。
- `replay-ui` 失败现场写 `/tmp/replay-ui-fail.png|.aria` 与固定名 console log，下一次运行覆盖；
  `client-load-smoke` / `cdp-probe` 失败无截图。仓库已有 `runtime/harness-home/replay-diagnosis`
  却没接上。
- `src/README` 列 11 个 lib 模块，实际 12 个（漏 `deliverables-catalog`）；`project-map` 说
  runtime「全部 gitignored」，根 `AGENTS.md:25` 与 `runtime/README.md` 的 tracked 白名单也漏了
  runtime/web-logs/*.log；审计时 11 件 tracked（含 BUG-029 的两件日志），修复后 9 件。
- 文档预算 9/9 都在 86% 以上、2 个顶格（`docs/guides/web-rpc.md` 47/47、
  `company-workspace/AGENTS.md` 190/190）；`docs/design/` 718 行不在预算内且混入现在时/操作表。
- 代码不是平铺的（host/lib/client 分层成立）；深模块问题主要是缝上的重复：
  `memberDot` ×2、`firstText` ×2、`client/index.ts` 两处重复构造数据面、成品目录 schema
  在 TS parser 与 JS generator 各一份、host 入口 `export *` 内部读模型。

未决：上述哪些算「必须现在修」、哪些只是可接受的历史负担；生成式索引是否值得新增维护面；
手册瘦身是否影响角色行为；重放场景修/归档的取舍。

## 方案与取舍

- **方案 A（逐条修字，最快）**：只改错的数字/清单，不加门禁。成本最低，但同一类漂移会
  第三次出现；BUG-013→BUG-029 已经证明「路径级修复」不够。
- **方案 B（修字 + 少量类级守卫，推荐先做）**：A 的内容 + tracked token-URL 守卫 +
  snapshot-index 覆盖门禁 + tab 探针清单与注册面一致性门禁。新增门禁都有明确负例，
  维护面小。
- **方案 C（B + 生成式总账）**：`checks/README.md` 与 `snapshots/README.md` 的逐条清单改由
  脚本头注 / `snapshot.yml` 生成，文档只留导航。根治手维护清单，但要新增生成器、
  纳入 `pnpm verify`，并迁移现有文字说明。
- **方案 D（C + 结构瘦身）**：再拆 `docs/index.md` 的决策台账/外部研究登记，给 `docs/design/`
  加预算并迁出已落地叙述，手册把流程细节迁到 skills/CHARTER。收益最大，改动面也最大，
  需要 Note 与 preset/浏览器复验。

取舍：B 是「先让绿有意义」；C 是「让清单不再靠人记」；D 是「让常驻上下文回到可读」。
不建议只做 A。

## 关闭条件

- 审计报告被用户接受（或指出要补的轴）；
- 用户选定批次（B/C/D）与手册/重放两个具体取舍；
- 后续实施卡或授权已记录；本轮推敲即可关闭（实施验收另算）。
