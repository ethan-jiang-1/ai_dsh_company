# 代码结构重构轮（2026-10-14）：六项收敛 + run-gates 兑现自设切分线

状态：implemented（授权 = 用户点名六项清单：「我们都想调整……代码可以拆，放入不同的地方等等都行……但是不许破坏原来的逻辑」「动手前你怎么测，动手完之后没有 break 任何东西」；审查报告与执行同会话，收据 = 八个 commit 8579598…1e99f11）

## 决定（六项，每项一 commit）

1. **doors 守卫迁出**：`tests/harness/deliverables.spec.ts` 尾部寄居的 BUG-002 块迁独立 `tests/company/doors.spec.ts`，恢复 tests/company `<模块>.spec.ts` 一一对应（负例留证行随守卫同迁——guard-red-record 门禁按声明文件找留证）。
2. **测试夹具去重**：deliverables 九处同形 Lead 内联 → 顶层 `leadSession(slug, {覆写})`（异形 cwd/多 presented/legacy/BUG-003 drafts 保留内联）；candidate-scan-labels 的 case-14 六行漂移形状两处逐字重复 → 文件级 `CASE14_BRIEF/CASE14_DRAFTS`；presets.spec 六处角色数组 → 文件级 `ROLES`、十一处读盘 → `roleYml()`。
3. **五角色数组单源**：`tools/lib/company-roles.mjs` 的 `COMPANY_ROLE_IDS` 为 mjs 侧唯一事实家（10 处消费：authorship/candidate-scan[死导出删]/deliverables/converge/run-gates presets 门禁/四 smoke/journal-audit）；journal-audit 原字母序以 `[...COMPANY_ROLE_IDS].sort()` 保持零漂移。
4. **zstd 解压收 drivers**：`tools/drivers/zstd.mjs` 的 `zstdText(file,{maxBuffer})` 收拢 4 处近似拷贝（orient/snapshot-motion/session-log-export/journal-audit）；各调用点 maxBuffer 沿用现值。
5. **verdict 抽 lib**：team-concurrency 判分（`concurrencyVerdict` + `verdictOutcome`）自探针内联抽出，collaboration-probe-verdict.spec 第一块改普通 import（其余五探针切片维持——各自抽出时再迁）。
6. **probe-kit + replay-ui + run-gates 切分**：33 处 sleep 与 16 处 check（V1 results 版 ×10→`makeCheck`、V2 failures 版 ×5→`makeFailingCheck`、V3 异步版 ×1 有意保留）收敛 `tools/lib/probe-kit.mjs`（37 探针迁移，输出格式 3 条 keyless 钉住；**顺带**：replay-smoke 主文件的内联 check/sleep 与 kit 逐字同义，05cddbe 一并收敛——kit 消费面实为 37 探针 + 1 smoke）；replay-smoke 浏览器档（589-830 段）拆 `checks/smoke/lib/replay-ui.mjs`（env 显式注入 check/firstDiff/旗标，共享可变状态留主文件）；run-gates 兑现 2026-10-05 自设触发线——31 个门禁文件（名 = ok/fail 短名，取代已重复的 2c-bis 编号）+ `checks/gates/lib/pin.mjs`（pin 常量唯一家，sync-dsh/export-dist 解析路径同 diff 改指）+ 92 行薄 runner 按原顺序装配。拆分的非逐字改动全量申报（盲审核对原文件 388 条注释行仅 8 处不匹配）：**注释行修正 2**（pin-currency 与 vendor-pin 的「唯一事实家 = 本文件」→「gates/lib/pin.mjs」）；**代码行重定向 1**（retired-path 自排除目标 run-gates.mjs→retired-path.mjs，退役前缀映射表随门禁搬家）；其余 5 行 = runner 头注自身的必然重写（触发线兑现叙述 + 墓碑并入去编号）。

## 输掉的方案

- **角色数组从 presets/ 目录 fs 派生**（加角色零改代码）——败于 readdir 无序：派生必须显式排序列表，等于把常量换个地方写；且改序 = 输出序变化 = 行为变更，违反本轮「不破坏」约束。静态常量 + presets 门禁（checks/gates/presets.mjs）的存在性核对承担守卫。
- **presets.spec 的 ROLES 改 import 共享常量**——败于守卫独立性：共享常量被误删一角时，测试会静默跳过该角色全部断言（守卫失效不红）。测试侧持独立字面量 = 独立事实源。pack src 的 `CULTIVATION_ROLES`/`PRESET_KEYS` 同理不迁：pack 发布面自包含（files 不含 tools/），不许反向依赖维护工具层。
- **zstd 统一 maxBuffer**——败于「统一缓冲上限 = 行为变更」：64M/256M/512M 各有现场理由，参数化保持现值，统一属另一轮须先验证超大日志场景。
- **run-gates 常量留 runner**（免改 sync-dsh）——败于 ESM 循环：门禁模块要 import 常量、runner 要 import 门禁，常量必须住独立模块（pin.mjs）。
- **三份 walkMd 合并成共享 walker**——败于 skip 列表实异（vendor/node_modules/lib 三种组合），合并即语义风险；各门禁自洽优先。
- **check 做成共享函数（非工厂）**——败于它闭包探针本地 results/failures 数组：`makeCheck(results)` 工厂是唯一保持「定义行换一行、调用点零改动」的形状。
- **replay-ui 全段 589-999 整体迁出**——败于段内混着主流程共享可变状态（`let parsed/replayUrl/replayBase/workspace/runRoot`）：干净切分界是 589-830，状态留主文件、env 传依赖。
- **门禁体统一重排缩进**——败于可验证性：逐字节切片让「原文区间 vs 门禁文件」可机械 diff（本轮注释核对即靠它）；重排留给后续轮零风险做。

## 后果

- 加第 6 角色：mjs 侧改 1 处（company-roles.mjs）+ 建 preset 目录（presets 门禁强制），原 10 处 → 1 处；加门禁 = `checks/gates/` 加一个文件 + runner 两行（import + 调用），分区编号腐化（两个 2c-bis/2c-ter/2d-quater）随之消解——文件名即门禁短名，FAIL 行可直达文件。
- 探针改输出格式：先红 `tests/harness/probe-kit.spec.ts`（3 条钉格式），不再要点几十处。
- 判分类探针要 keyless 回归：照 team-concurrency-verdict.mjs 先例抽 lib + spec 普通 import（不再源码切片 + vm 求值——探针一改锚就假红，2026-10-10 probe-web 抽取同款病灶同款修法，互链 [2026-10-10-probe-web-and-backlog-liveness-extraction](../archived/2026-10-10-probe-web-and-backlog-liveness-extraction.md)）。
- 重放 lane 的 3 个预存 FAIL（cultivation_propose 进 sidecar 对比、金样「最小往返探针/Ping VP-Eng」第 35 行漂移）**属培养回路轮（fe3c0c9）遗留、非本轮造成**——本轮以「与基线逐行一致」为不变量如实保留，刷新金样归该面 owner。

## 验证（全部实跑；基线存 `runtime/e2e/refactor-baseline/`，gitignored）

- **基线法**：动手前录 `pnpm verify`（46 PASS）+ `pnpm exec vitest run --reporter=verbose`（54 文件/538 条全名清单）+ `node checks/smoke/replay-smoke.mjs`（默认档，3 预存 FAIL 原样入档）；每阶段后对基线 diff。
- **纯搬移等价**：A/B 阶段排序后 538 条测试全名 diff 恰为预期搬移/零差异；verify PASS 行每阶段仅实测计数漂移（新文件入扫描面：spec 数、脚本注释面数——每处漂移均对账到因）。
- **实跑面**：converge 计划模式、`pnpm orient`（568 会话）、snapshot-motion-smoke PASS、session-log-export 568 份导出 0 失败、journal-audit --limit 3 ALL PASS、sync-dsh 簿记一致；zstdText 对真实 592499 字节多帧日志与 CLI 全文字节一致。
- **replay 双跑**：默认档输出与基线逐行一致（3 预存 FAIL 不变）；`--ui` 档用 git stash 在拆分前后各跑一次，PASS/FAIL 集**完全一致**（4 FAIL 全预存）——拆分零行为漂移的实证。
- **红测（红→还原→绿，原话如下）**：
  - doc-budget（验收方亲跑）：docs/orient.md 临时加 6 行 → `FAIL doc-budget: docs/orient.md 81 行超上限 80（先搬内容到该去的家，再压；不直接加行）`（verify: 1 FAILURE(S)）→ 还原 → PASS + ALL PASS；
  - vendor-pin（拆分子代理跑）：pin.mjs 的 expectedSha 末字符 4→5 → `FAIL vendor-pin: HEAD 是 639ed015397290b3745d163aafe02ffee4aa3f84，簿记为 …aa3f85（dsh-v0.2.0-rc.2）` + pin-bookkeeping 同轮红（2 FAILURE(S)，证 pin.mjs 常量链路真的会红）→ 还原 → 双 PASS；
  - md-newline（拆分子代理跑）：docs/ 下无尾换行临时文件 → `FAIL md-newline: …/docs/zz-red-test-no-newline.md 需以单个换行结尾`（doc-taxonomy 对未登记文件同轮红，属预期）→ 删除 → ALL PASS。
  guard-red-record 的 11 例「缺 X ⇒ 恰一红」本身即内建红配方。
- **语义审（独立盲审，§13 四输入）**：结论 = 六项完整兑现、零行为破坏证据链成立（独立复现基线→HEAD 测试全名差恰为 3 搬移 + 3 新增、verify 逐字节一致、replay 双 lane 逐字节一致、388 条注释行机械核对、zstd/sync-dsh 实测）；**blocker 无**；5 条建议已处置 3（漏改 docs-tier-taxonomy Note 指针→本轮修；Note ⑥ 补顺带收敛与申报点名→本轮补；红测原话入 Note→本轮补），2 记录在案（阶段存档有缺口——verify-after-B/E 与 test-after-C/D/E 未存盘，主张见各 commit message、计数链跨存档点对账为间接证；c2ae9ee 后探针尾段 4 行布线不再 keyless 覆盖——判分本体已由 lib 直测 + backlog-liveness 同款先例）。
- **run-gates 拆分等价**：46 条 PASS 行对拆分前基线**除两条实测计数（script-status 72→103、retired-path 158→190）外逐字节一致**；`pnpm exec vitest run` 56 文件/541 条全绿（新增 probe-kit.spec 3 条）。
- **后续结构收敛**（Client tabs/session adapters、Host cultivation seam、replay pure helpers）：[2026-10-14-client-host-replay-locality](./2026-10-14-client-host-replay-locality.md)。本 Note 原六项决定与验证收据保持本轮历史原文。
