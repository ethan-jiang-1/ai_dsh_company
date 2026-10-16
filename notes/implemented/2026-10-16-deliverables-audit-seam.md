# 代码结构第三轮（2026-10-16）：deliverables 宽接口拆「形状与身份 / 声明对账」＋触发线落档

状态：implemented（授权 = 用户 2026-10-16 圈定卡 `2026-10-16-code-structure-round3` 范围 A 并下开工令「计划这么详细了, 就setup goal 推动落地」；来源卡与拍板记录 = [_archive/settled_issues](../../_backlog/_archive/settled_issues/2026-10-16-code-structure-round3.md)；收据 = 三个 commit `fa9801f` / `2e73269` / `3f0af0b`）

## 决定

**动机**：用户 2026-10-16 点名做全仓结构评估，判据 =「今后容易搜索到局部，改东西变得简单」——第三轮只接前两轮未接的宽接口模块，不翻它们的案。

**① `tools/lib/deliverables.mjs` 506 行 → 按「形状与身份 / 声明对账」拆两个模块**（依赖严格单向）：
- 基座 `tools/lib/deliverables.mjs` 210 行 / 18 导出——身份解析（`deliverableId`）、形状合法性（`classifyDeliverable`）、meta 行形状与词表（`parseMeta` / `validateMeta` / `META_TYPES` / `META_RESULTS`）、占位与让位首行判定、`WARNING`（观察项码词表）、`normalizeRel`。
- 对账 `tools/lib/deliverables-audit.mjs` 322 行 / 8 导出——`VIOLATION`、`parseSessionLog`、`auditDeliverables`、`isLeadSession`、`uncoveredPendingMaterial`、`partitionArchiveViolations`、`presentResultRows` + `META_FINAL_RESULTS`（只被 `presentResultRows` 消费）、私有 `idKey`。

**判据是「谁消费」而不是「名字像谁」**，两处据此修正了来源卡的分表（卡 §拍板记录已同 diff 记录）：
- `WARNING` **留基座**：它的 7 个码里 check 侧用 5 个（`SLUG_UNLEDGERED` / `PLACEHOLDER_CLAIMS` / `FINAL_WITHOUT_META` / `META_RESULT_PENDING` / `META_LEDGER_MISMATCH`），其中三个是纯盘面观察、与会话对账无关；放对账侧会逼出 `deliverables-check → audit` 的反向依赖。
- `presentResultRows` **迁对账**：输入是 `auditDeliverables().leadFinalSlugs`（会话侧）、产出 `VIOLATION.PRESENT_RESULT_NOT_FINAL`；留基座会逼出基座 → 对账的反向依赖。

**② 对应 spec 机械拆分**：`tests/company/deliverables.spec.ts` 538 行 → 基座 128 行 + `deliverables-audit.spec.ts` 462 行（恢复 `tests/company` 的 `<模块>.spec.ts` 一一对应，沿 2026-10-14 doors 迁出先例）。

**③ 观察项触发线落档**：`checks/smoke/replay-smoke.mjs` 头注立触发线（>800 行或再增第 5 个 mode ⇒ 判据/驱动器分家，沿 replay-ui 拆出先例）。另三条观察项（`src/client/`、`tools/lib/`、大镜像 spec）没有自然宿主文件，只住来源卡上表，不硬塞头注。

## 输掉的方案

- **`WARNING` 与 `VIOLATION` 一起迁对账侧**（来源卡原表）：败于消费面实测——盘面观察码归对账模块会让 check 反向依赖对账，正好把「单向」拆反。
- **`presentResultRows` 留基座**（来源卡原表）：败于它的输入是会话声明、产出是对账违规码；留基座即基座 → 对账反向依赖。
- **spec 与 lib 各成一个 commit（共 3 段）**：败于验收标准①的判据形态——「拆前/拆后跑真入口输出逐行一致」需要**两个可独立实跑的状态**；spec 拆分是行为中性的独立状态，于是拆成 4 段，每段 `pnpm test` 全绿、每段 diff 可单独审。
- **主 describe 整块随对账迁走**：败于其中 4 条只断言形状与身份（`deliverableId` 的平铺旧形状两约定、`slugFromDirName`、`A1 日期前缀目录的身份`、`归档根交付物与活跃根同构`）——它们作为**基座 spec 的新顶层 describe**（标题「交付物形状与身份（R4 判据的基座半边）」）留下，主 describe 的形状半边随之改标题。实测口径以「落点 = 该文件里所有 `it` 是否只 import 基座」为准：**留在对账 spec 的**是 3 条 `classifyDeliverable` 形状断言（legacyFlat / source / material 三态）与 `meta.md 是白名单形状`——它们断言的是形状，但栖在对账 describe 里且与 `auditDeliverables` 同块，本轮按「只搬对账簇」的最小口径未动（挪它们属夹具级重组，非本轮授权面）。
- **同轮做夹具去重**（两侧同名的 `leadSession`、基座侧已无消费者的 `r1CopyWith` 等）：败于结构轮不混语义变更——按「逐字搬移」口径让夹具两侧各留一份，基座 spec 注释点名其为后续轮清理项。
- **触发线做成门禁**：败于无效复发证据（dev-loop §9：无「具体错误复发过」不升门禁）——落档为头注一行 + 卡上表。触发线断言脚本本身也只住 `runtime/`（读真项目文件，不进 `pnpm test`）。

## 后果

- 改对账判据：只进 `deliverables-audit.mjs`（322 行单一主题），不再在 506 行里翻找；改形状/身份：只进基座。**审计面与形状面的消费者不再跨半个文件跳**：`authorship-audit` 只吃 2 个身份导出（本轮**零改动**，即 ISP 的实证）。
- 回归层新增一个结构不变量：`<模块>.spec.ts` 一一对应（形状 spec 只 import 基座，对账 spec import 两家）。
- 触发线可绊人：`runtime/e2e/round3-receipts/trigger-check.mjs` 是那条触发线的可跑判据（读真文件、5 mode/717 行 ⇒ PASS；注入第 6、7 个 mode ⇒ FAIL），红证见验证节。它不进 `pnpm test`（读真项目文件，属认证档口径）。
- **收割一件常驻资产**：本轮反复手搓的「全名清单 diff」沉淀为 [checks/smoke/refactor-drift-oracle.mjs](../../checks/smoke/refactor-drift-oracle.mjs)——`--names` 出人读清单、`--hashes` 出「归一全名 + 测试体指纹」档（**判等价用这档**：除改名/增删外还拦测试体改动），`--compare` 自动识别档位；两档都放行文件与 describe 归属搬家。索引见 [checks/README](../../checks/README.md)。下一次结构轮的「零漂移」判据不必再手搓 sed。**判别力边界**：它证「这些测试体一字未动」，不证「体里的断言仍有意义」——后者归语义审。
- 待清残留：基座 spec 里 6 个夹具/辅助（`R1`、`listFiles`、`readSessions`、`r1WorkspaceFiles`、`r1Sessions`、`TMP_DIRS`、`r1CopyWith`、`afterAll`）当前只被对账 spec 的反证用例使用——已在基座 spec 注释点名，清理归后续轮。
- 未做（本轮范围外、来源卡已排除）：`presence.ts` 内部接缝（Item 2，留独立第二轮）、模块大小门禁、`src/client/` 与 `tools/lib/` 分组。

## 验证

全部实跑；基线三件与红证收据存 `runtime/e2e/round3-baseline/`、`runtime/e2e/round3-receipts/`（gitignored）。

- **基线（动手前）**：`pnpm verify` → `verify: ALL PASS`；`pnpm exec vitest run` → `60 passed (60)` / `559 passed (559)`；真入口档 `node checks/audit/deliverables-check.mjs --workspace snapshots/replay/r1-motion/workspace.expected --sessions snapshots/replay/r1-motion --legacy-flat` → 退出码 0，`违规 0 条 —— ALL PASS` + 观察项 `final-without-meta` 1 条。
- **验收① 零行为漂移（oracle，两档）**：`--hashes` 档（`<归一全名>\t<测试体指纹>`）拆前 559 / 拆后 559，`--compare` → `ALL PASS 规范化后逐行一致：零新增 / 零删除 / 零改名 / 零测试体改动`；`--names` 档同判。规范前的原始 diff 每条都落在「文件前缀搬家」或「describe 归属搬家」两类，无第三种差异：正文文件层面 36 删/36 增全在两个 deliverables 文件内；用例层面 40 条中 6 条改了 describe 归属（4 条迁入基座 spec 的新 describe + 2 条在对账 spec 内部随簇归位），标题与断言不变。**所以措辞按实际收紧：「零行为漂移」成立，「纯搬移」只在测试用例粒度成立。** 首轮曾漏 3 条（`classifyDeliverable` 三态两条 + legacyFlat 一条）与重复一条 `onlySlug 作用域`，由该 oracle 抓出并补齐——**这就是这条 oracle 存在的意义**。
- **验收② 回归**：`pnpm test` → `61 passed (61)` / `559 passed (559)`（60 + 新 spec）。
- **验收③ keyless 与结构门禁**：`pnpm verify` → `verify: ALL PASS`（`guard-red-record` 现报 `×11 条守卫声明（61 个 spec…）`，证明 BUG-003 / BUG-004 的负例留证行随 describe 同迁后仍按文件找得到）；`pnpm exec vitest run tests/harness` → `24 passed (24)` / `243 passed (243)`。
- **验收④ 真入口等价**：拆前/拆后同一条快照档命令，输出 `diff` 为空、退出码同为 0。
- **验收⑤ 探针引用可达**：`node --input-type=module -e "const { PLACEHOLDER_YIELD_LINE } = await import('./tools/lib/deliverables.mjs')…"` → 原文在场（该常量属形状词表，留基座 ⇒ `claim-race-probe.mjs` 指针**无需改动**，比来源卡预期少一处改动）。
- **导出普查守恒**：拆前 `git show 3f0af0b~1:tools/lib/deliverables.mjs` 的 26 个导出（22 函数 + 4 常量）＝拆后 18 + 8，**两侧零重名、零丢失**；`audit` 从基座取的 8 个符号全部在基座导出面内；基座不 import 对账（单向）。首轮构建曾把 `VIOLATION` 与 `presentResultRows` 误落基座、并漏掉 `idKey` 与 `META_FINAL_RESULTS`，均由「导出普查 + 冒烟 import」抓出并修正。
- **红证（制造 → 见红 → 还原见绿，原文）**：
  - ① keyless 面（破坏真东西）：往新模块注入 `import { execFileSync } from 'node:child_process'` → `FAIL …tools/lib 只能保持 keyless 纯逻辑；本地驱动、危险 builtin 和运行调用必须隔离`，明细行 = `"tools/lib/deliverables-audit.mjs → forbidden builtin: node:child_process [tools/lib/deliverables-audit.mjs]"`（`Test Files 1 failed / Tests 1 failed | 3 passed`）→ 还原 → `4 passed (4)`。**这条同时证明新文件真的进了 layering 的扫描面**（不是溜出守卫）。
  - ② 审计判据钉子：把 `isLeadSession` 反转成 `identity.agentPreset === leadPreset`（去掉 `delegationDepth === 0` 门）→ 三条红：`承诺权… expected [] to include 'final-presented-by-non-lead'`、`Lead 判据… expected true to be false`、`反向检查只追 Lead 声明… expected [ { code: 'dangling-present', …(2) } ] to deeply equal []` → 还原 → `32 passed (32)`。
  - ③ 常量原文钉子：把 `PLACEHOLDER_YIELD_LINE` 的「，」改成「,」→ 独立 import 断言红 `❌ 原文漂移被抓：期望「让位=认领撤销，非出稿」，实得「让位=认领撤销,非出稿」`，且 spec 钉子同轮红 `expected '让位=认领撤销,非出稿' to be '让位=认领撤销，非出稿'` → 还原 → 绿。
  - ④ 触发线本身可绊人：`node runtime/e2e/round3-receipts/trigger-check.mjs` 现状 `replay-smoke: 717 行 / 5 个 mode 声明 —— 触发线 800 行 / 6 mode` → `PASS（触发线未触发）`；注入两个 mode 声明后 `719 行 / 7 个 mode 声明` → `FAIL mode 声明 7 个 > 触发线 6（… --red-probe-a --red-probe-b） ⇒ 该分家了`（exit 1）→ 还原 → PASS。**首版判据自身有假绿**（正则把 `--wall` 当 mode、且 `--` 列表被重复计数），由「先跑绿再跑红」的次序抓出并重写。
- **语义审（独立子代理盲审，§13 四输入）**：两名独立审查者分工盲审（一名比测试体与导出面/依赖，一名验证据可信度并自写 oracle 复算），**blocker 无**；findings 与处置见下方「语义审回执」。
- **收割资产的自身红绿**（新判据从没红过就不知道它会不会红）：`--names` 录清单 559 条 → `--compare` 同一份前后 → `ALL PASS`（exit 0）；注入「删一条 / 改名一条 / 加一条」→ `FAIL 真差异：拆前独有 2 条、拆后独有 2 条` + 逐条点名（exit 1）；只把所有行改成另一个 spec 文件名 → 仍 `ALL PASS`（豁免方向对）。**加 `--hashes` 档后再红一次**：把一条测试的**体指纹**单独改成 `deadbeefdeadbeef`（名字保持原样）→ `FAIL 真差异：拆前独有 1 条、拆后独有 1 条` + 点名该条前后指纹（`c1acff51512b49d7` → `deadbeefdeadbeef`），exit 1；**同一改动在 `--names` 档下仍然 ALL PASS**——这就是加这档的理由（名字相等的清单看不出测试体被削弱）。

## 语义审回执

（两名独立子代理盲审；四输入 = 授权/验收原文、该面合同文档、证据选层、本 Note。审查者未接受本 Note 的自述，自写脚本读 diff 与实跑。首名审查者困在自设的穷尽验证里未收口，已换两名窄口审查者——该失败本身记在此，不掩盖。）

**审查者 A（测试体 / 导出面 / 依赖）**：结论 ①「行为层成立，『逐字』字面不成立」② 导出面守恒成立 ③ 依赖单向成立。独立复算：`baseline its 40 | new base 8 | new audit 32 | sum 40`，missing 0 / added 0，`identical(exact) 35 / indent-only 4 / changed 1`，matcher 多重集与 `expect` 数零差异（无 `toBe→toContain`、无删断言）；导出 `before 26 | base 18 | audit 8 | union 26`，`LOST/ NEW/ COLLISION` 皆无，**全部 29 个顶层声明函数体逐字一致**；`authorship-audit` 零改动经 `git diff` 复核属实（ISP 实证）。

**审查者 B（证据可信度 / 独立复算 oracle）**：结论「证据可信 + 零漂移被独立复现」。四重自证 `vitest.json` 是拆前件（60 spec 无新文件、带旧 describe 名、40 条 `it` 与 `git show fa9801f` 相符、mtime 早于拆出提交）；自写 oracle 三份 JSON 各 559 条归一后逐行一致；`deliverables-check` 拆前/拆后**逐字节相同**（md5 同）且当天在 HEAD 实跑 exit 0 与基线逐字节一致。

**findings 与处置**（blocker 无）：

| # | finding | 处置 |
|---|---|---|
| A1 | 对账 spec `sessions: [lead]` → `[leadSession('foo')]`（夹具内联）：语义等价、断言未削弱，但「逐字搬移」字面不成立 | 收：本 Note 与「输掉的方案」按实际措辞收紧，不改码 |
| A2 | 本 Note 原称 4 条只断言形状的测试「留基座」——与实物不符（那 3 条 `classifyDeliverable` 断言仍在对账 spec，`meta.md 是白名单形状` 也在且改了体） | 收：已按实物重写该条（留基座的是另 4 条身份/日期前缀测试；栖在对账簇里的形状断言本轮按最小口径未动，属夹具级重组、非本卡授权面） |
| A3 | `--names` 档只比 `fullName`，抓不住测试体改动/断言削弱（本轮那条体改动它照样 PASS） | 收：加 `--hashes` 档（测试体指纹）并**先红后绿**跑过（见验证节）；`--names` 保留为人读档，判等价口径改指 `--hashes` |
| A4 | 基线区那份「拆前 spec 冻结副本」仍 import 已迁符号，已不可执行且污染 grep（bare-path 门禁在删件后同轮点红，见下） | 收：删除该副本（拆前件随时可由 `git show <commit>:<file>` 重建）；指针随之改写，`pnpm verify` 复绿 |
| B1 | 基线与红证全在 gitignored 区，「拆前」侧第三方无法从仓库重建 ⇒ 可审计性打折（不影响本轮正确性） | 部分收：`--hashes` 档把判据变成可复跑命令；基线件本身仍留 gitignored 区（tracked 大 JSON 与仓库纪律相抵），重建立方 = `git show fa9801f:<file>` + 本 Note 记录的命令 |
| B2 | 基座 spec 的 4 条测试缩进与文件其余部分不一致 | 收：重建基座 spec 使缩进统一（`it` 2 格 / 体内 4 格），重建后 `--hashes` 档复跑仍 `ALL PASS` |
| B3 | 前后对比跨了两个 `deliverables-check.mjs` 版本（该文件在同轮改了注释与 import 拆分，无逻辑行） | 收：措辞改为「同一条命令、两个状态」，并补「HEAD 脚本 == 拆后那次」的复核结论 |

**未验证（显式）**：审查者按窄口指示未跑 `pnpm verify` 与完整 `pnpm test`（其复算的 559/559 取自交付 JSON，且已证该 JSON 对应的 `tests/`+`tools/` 树与 HEAD 逐字相同）；`red2-islead.txt` 变异未由审查者复跑（本轮自查跑过）；lib 的模块级副作用语句未单独审（顶层声明体已全覆盖）。
