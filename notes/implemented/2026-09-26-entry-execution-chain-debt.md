# 2026-09-26 · 技术债清扫：两条链收敛 + 共享盘归档

状态：implemented（2026-09-26 用户批准并交付；②–⑥ 全部落地，逐条见 §交付实况。**本 Note 是活跃决策记忆**：门禁与脚本实现事实变化时同步更新）

## 进度（逐条销账；每条一 commit + push）

| 条目 | 状态 | commits | 实况 |
|---|---|---|---|
| ② 门禁真相与探针补齐 | ✅ 完成 | `1dc024d` `7e33d8f` | B1 假绿修复（三态反证）；B6 门禁清单单一源；裸路径门禁扩面 5→22 文件（203 条零假阳性，抓到 3 条真腐化）；新门禁 `pin-bookkeeping` + `pin-currency`；状态行门禁修跨行盲区；entry-probe 8→12 问 + **修尺子自身三处缺陷**；基线 = **12/12 + 3 条未消矛盾**（独立复现 B3/B12/R5） |
| ③ 执行链收敛 | ✅ 完成 | `107f2ce` `0b97cde` `e8df28a` | B7 改"触发条件的家 = 脚本头注" + `script-triggers` 门禁（18 脚本；不往顶到上限的 dev-loop 塞行）；B8 ROADMAP **429→73 行**（历史段删除，blob `d159b0228e2b` 留证，3 处入站引用标注）；B9 状态三态语义；B10 搁置项不是任务源；R4 计数常量/升队条件/场景 D 撞名；B3 `rejected/` 残影（执行链第一跳）；B11 D27 入台账 + intents 行预算 + push 落点；R7 五个断指针；R11 公司手册入布局 |
| ④ 腐化清扫 | ✅ 完成 | `78308c1` `88df276` `01b3ba5` | R1 版本常量改指针（release/architecture/pack README）；R2 机制三代（**profile.md 最重**：把已退役 `company` profile 当现行形状、`file:` 那条写反——实测 inode 不同/link count 1 = 真拷贝；architecture 的 roots 模型、roles-isolation 的四角色+已消失包名、ui-demo 的 `remote.agentTeams`/`dist/client.js`、pack JSDoc 四处、cordis 头注自相矛盾）；R3 死指针 5 条（含两条**门禁盲区**里的：dev README 与 .gitignore，非 .md/被排除树）；R4 僵尸待办 7 处（R3 待验证点、随升 pin、轮末、归 R5、R4 定稿、驾驶舱旧名、role-content-plan skills 清单）；R5 枚举双写 3 处（改成自查命令与指针）；R6 矛盾对（tests 标题四角色）；R7 其余 5 处；noise 5 处（src/README 重写、architecture §7 stub 保号改写、死测试数、升 pin 证据落点、ROADMAP≡dev-loop 重复规则） |
| ⑤ 共享盘归档 | ✅ 完成 | `c318f29` | 台账补两行 + 09-26 轮末收敛（23 篇 journal → 五份 CHARTER 历史纪要）+ 新快照 `memory-convergence-2026-09-26`（64 文件）+ 29 份已归档过程稿移出 live + 身份规则按受众拆（成员侧只加 slug 唯一性 / 维护者侧进 snapshots README）+ 两道观察项（`slug-collision` / `slug-unledgered`，均带回归）。`company-workspace/` 108 → **56**；deliverables-check 实跑 0 违规；journal-audit 4 场全判「在场(已归档)」 |
| ⑥ 最终收敛验收 | ✅ 完成 | `2d0fe36` | **entry-probe 12/12 MACHINE CHECKS PASS 且 `conflicts` 空**（EXIT=0）；探针四轮共抓出 6 条真矛盾（其中 2 条是我自己的漂移：完成即离队漏执行、标记语义越权）与 5 处尺子自身缺陷，全部处置 |

## 问题

用户提问三件：① 一个 fresh agent 进本仓，**探查链**（AGENTS → index → dev-loop → ROADMAP → notes →
vendor）与**执行链**（取任务 → 判授权 → 实施 → 选验证 → 收尾）清不清楚、渐进式披露是不是"不多不少"；
② 全仓有没有 A→B→C 变迁留下的**内容腐化**（降信噪比）；③ `company-workspace/` 哪些该长期留 git、
哪些该清。

审计方式：4 路独立只读子代理（探查链 / 执行链 / 腐化猎捕 / 共享盘逐文件分类）+ 主会话亲核。
基线 `d035e6d`，工作树干净；`pnpm verify` 与 `deliverables-check` 均**实跑 ALL PASS**。

## 审计结论：两条链

- **探查链：广度好，深度有系统性漏修。** `docs/index.md` 地图 13 个目标文件 100% 存在；术语映射
  12 条 vendor 源码路径 100% 命中；全仓 446 条相对链接只有 1 条真断链。但 fresh agent 读到的
  **第一批话**里就含已废的 `rejected/` 层、已移除的 `remote.agentTeams` 机制、三个不同的"钉住 tag"。
- **执行链：两跳是断的。** ① "这条能不能开工"没有可靠信号——唯一队列项既无 ▶ 也无 ⏸，三处文本
  给出三种动作；② "按改动面选检查"断裂——`§9.1` 被指定为"何时跑"的唯一家却漏 6 个已存在脚本，
  只能回到 AGENTS.md 命令表，而命令表自称"何时跑 = §9.1"，**成环**。
- **渐进式披露：分层做得好，接缝无守卫。** verify 只守文档**形状**（链接/裸路径/行预算），守不住
  "两份清单不一致""台账缺 D 号""搁置池计数对不上"这类**规则一致性**。

### 腐化的三个源头

1. **升 pin 的消费面只改了一半**——新写的代码（`use-company-data.ts:6-13`、`presence.ts:97`、
   `cordis.patch.yml:11-14`）改对了；叙述机制的老文档/老注释全留在上一代。读者无法从文风分辨
   哪句是 now，只能交叉核对。
2. **枚举型事实写在两处、实现那处更新了**——verify 门禁清单、认证档清单、`requireDevHome` 守卫
   清单、排练场 cwd 清单、快照目录清单、命令表脚本清单，**六份同一种病**。这类清单是 agent 的
   "下一步动作表"，漏项直接改变行为。
3. **单篇内部自相矛盾**（比跨文件更贵，因为同时给出两个"权威"）——`dev-loop:6` vs `:76`、
   `AGENTS:36` vs `:87`、`profile:13` vs `:33-40`、`cordis.patch.yml:4` vs `:11`、
   `presence.ts:97` vs `:264`。

## Findings 台账（逐条销账：修 / 留案并给理由 / 转磨清单）

### B · blocker（13）

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| B1 | `scripts/release-smoke.mjs:60`、`docs/release.md:64`、`packages/company-pack/tsdown.config.ts:9` | solution root 上 `tsc -p` 不展开 references ⇒ 零输入静默退出 0（TS18002 报错条件被非空 references 抑制）⇒ 发布门禁**要么 no-op、要么验旧产物** | 三处统一 `tsc -b`；反证 = `rm -rf lib` 后跑 release-smoke 红 → 还原绿 |
| B2 | `docs/guides/dev-loop.md:6`（+`:140`） | 唯一执行手册头部核对基线 = `dsh-v0.1.5-rc.2`（实际 0.1.7-rc.2）；`:76` 同文件已写 rc.2 | 改 rc.2 并指向 pin-upgrade Note 实况节 |
| B3 | `docs/guides/dev-loop.md:25`、`docs/index.md:80` | `rejected/` 层已废（2026-09-25 裁断不设）却写在**执行链第一跳**与台账里；裸词逃过 bare-path 门禁 | 改指各 Note「输掉的方案」节；台账行标"部分处置" |
| B4 | `docs/release.md:10`、`:27` | 依赖版本与 compat 矩阵过期；照抄会让 `pack-compat` 变红 | 改 rc.2；矩阵块改指针（以 manifest 为准） |
| B5 | `docs/index.md:83`（D22） | 已移除的 `remote.agentTeams` / `openSubagent` 写成现在时 | 改写为投影读法或按体例标历史 |
| B6 | `AGENTS.md:36` vs `:87` | 同一门禁集合两份清单互不一致，**两份都漏 `bare-path`** | 删 `:36` 那份，只留 `:87` 并补 bare-path |
| B7 | `docs/guides/dev-loop.md:338-347`（§9.1） | "何时跑"唯一家漏 6 个已存在脚本（human-loop-e2e / journal-audit / date-rule / dag-visual / dag-midflight / entry-probe） | 补行（需先腾行预算） |
| B8 | `ROADMAP.md:59` vs `:179` | 历史段边界两句互斥；模糊区含 5 次"队列清空"与现行队列冲突 | 历史段整体处置；删重复免责句 |
| B9 | `ROADMAP.md:11`、`:13-17` | 唯一队列项无 ▶/⏸；§0.5 分支②无法判定；三处文本给出三种动作 | 加状态标记；待裁点写进条目 |
| B10 | `ROADMAP.md:3` vs `:11/:34` | 文件头把"搁置项"写成可取任务源 | 改为"只从当前条目（及池内项复活条件）读" |
| B11 | `docs/index.md` 台账 | 缺 **D27**（5 处引用它）——"登记偏离"这个收尾动作的落点坏了 | 补台账行 |
| B12 | `company-workspace/AGENTS.md:34` vs `:123` | 「固定支出 ≥$500/月 CFO 会签」一处算"签字线"、一处只算"两条必批" ⇒ **公司角色无法判断要不要走 `request_signoff`**（行为级） | 手册内对齐，口径唯一见 `kb/org.md` |
| B13 | `snapshots/dag-midflight/`、`notes/implemented/2026-09-26-long-chain-motion-dag-midflight.md:96` | **归档证据与 Note 不符**：`run.json` = `session-41515cf5`（标题「动议观察 · 23684」，卡死场 4/5）；两份 `-nodes.json` 的 7 个节点标题全是「续约 Y」（`renewal-y-2026`）；Note 却称图来自 `ca50e97f`（「DAG 中途形态 · 长链动议 81160」= `sea-entry-2026`）。dev home 无第二套图 | 用 `--session ca50e97f` 重采，或改正 Note；并在快照 README 记明来源 |

### R · rot（按主题归并）

| 组 | 条数 | 位置 |
|---|---|---|
| R1 pin/版本常量 | 5 | `dev-loop:6,140`；`index:121`（与同页 `:110` 自相矛盾）；`architecture:259`；`release:10,27`；`tests/entry-probe.spec.ts:11` 夹具 |
| R2 机制三代共存 | 9 | `profile:28-29,35`（roots 模型：行 id/语义/机制三错）；`architecture:30,39,73-74,98,114,208,263`；`roles-isolation:63,125-126,164`；`ui-demo:26,33,34,66,72-88,104`；`cordis.patch.yml:4-5` 头注；`src/lib/board.ts:5,79`、`src/lib/presence.ts:264,388` JSDoc；`company-pack/README:3,5,9`；`src/README.md`（描述不存在的 `delegation/`、`tools/`） |
| R3 死指针与门禁盲区 | 8 | `dev/harness-home/README:4`（`docs/design/10-architecture.md`）；`.gitignore:5`（`guides/60 §7`）；`proposed/README:10`（vendor note MISSING）；`demo.md:12`（`finance-agent-workflow-vp-eng.md` MISSING）；`index:99,121`（`20、30`/`–40` 编号残影）；`snapshots/README:42`（`../../notes/` 应为 `../notes/`）；`architecture:39,208` 两条 vendor 路径 |
| R4 僵尸待办/时态 | 8 | `architecture:166-170`（"R3 待验证点"，结论早在 `delegation.md §2`）；`delegation:79`（"随升 pin 处理"，已交付）；`delegation:101,102`（"轮末"）；`snapshots/README:43` + `snapshot-motion.mjs:4`（"归 R5"）；`demo.md:1,5`（自述 R4 定稿，实际已有场景 D/E）；`budget-and-ops:38`（驾驶舱旧名）；`README:9`（"全程沿用"） |
| R5 枚举清单双写 | 6 | `dev-loop:152-153`（六→16）；`dev-loop:159-160`+`rehearsal-init:3`（四→≥8）；`dev-loop:347`（认证档漏 4）；`AGENTS:43-50`（漏 entry-probe/harvest-probe；`node scripts/<名>.mjs` 模板 16 个里 10 个不成立）；`snapshots/README:16-42`（6/16 目录）；`role-content-plan:37-59,64,74`（skills 清单与盘上不符、journal 命名旧式） |
| R6 矛盾对 | 3 | `profile:21-23` vs `dev-loop:204`（`file:` 硬链接 vs 真拷贝）；`company-workspace/AGENTS.md:34` vs `:123`（=B12）；`tests/presets.spec.ts:43,56,85`（标题"四角色"、用例遍历五项） |
| R7 其余 | 7 | `AGENTS:35,52,78,79,81` 五个断指针（§6.5 / §1 第⑥步 / 收尾模板 / 行预算 / 环境状态）；`ROADMAP:6,20/23,41,73,298,313`；`dev-loop:357`（禁物 4 vs 实 5）；`verify.mjs:2,47,48,231`（头注不全 / 预算注释漂 / 状态行只读首物理行）；`index:26,34,58`；`kb/org.md:59` 表结构；`chairing-staff-meeting/SKILL.md:26`；`markdown-links.mjs:14` |

### N · noise

`ROADMAP.md:59-415`（357 行历史，与 `intents.md` 同事实双写）；`ROADMAP.md:13-17`（队列项复述 RFC，
自违 ≤3 行规则）；`dev-loop:19`≡`ROADMAP:5`；`dev-loop:41`≡`:418-420`；`dev-loop:42`≡`:421`
（执行链实际 6 跳而声明 5 跳）；`scripts/harvest-probe.mjs`（孤儿：只在两处当代码范例）；
`packages/company-pack/src/README.md`；`architecture:320-323`（stub 节）；
`notes/2026-09-25-pin-review-dsh-v0.1.7-rc.2.json`（被 release.md 要求却零引用、无落点约定）。

### S · 结构性（信噪比）

| # | 事实 | 处置 |
|---|---|---|
| S1 | `ROADMAP.md` 415 行里 **357 行是历史**（86%），时间序还非单调 | 历史段整体处置（内容已在 `intents.md` + 各 Note） |
| S2 | `notes/intents.md` 5 天 **585 B → 40,543 B**（≈8 行/天、600 B/行），append-only **无压缩规则**，每行复述其 Note | 立行预算 + 压缩规则（行 = 一行指针，详情归 Note） |
| S3 | `snapshots/` 469/788 追踪文件（**60%**）、33 MB；同一批交付物在 3–5 个快照里重复 | 另立「快照层瘦身审计」条目（回归资产，需单独取证） |
| S4 | **文档预算余量 ≈ 0**（dev-loop 447/448、index 142/145、AGENTS 108/115）⇒ "补全唯一规则家"与行预算冲突 | 次序上**先删后加** |
| S5 | `entry-probe`（现成 fresh-agent 尺子，8 问）**2026-09-24 后停跑**，只覆盖探查链，无触发规则，不在命令表 | 扩到执行链 + 首跑基线 + 立触发规则 |

## 交付实况（5 个条目）

次序理由：先修**尺子**（①）→ 再修**取任务/选验证**主链（②）→ 再扫叙述层腐化（③）→ 再动共享盘
（④，规则要先立）→ **最后才写地图**（⑤，地图必须描述最终状态）。**先删后加**是硬约束（S4）。

| | 条目 | 关键动作 | 验收 |
|---|---|---|---|
| ① | 门禁真相与探针补齐 | B1 `tsc -b` 三处同步；B6 verify 清单单一源；三道门禁扩面（裸路径扩到 docs/notes/README、**pin 版本一致性**、状态行跨行盲区）；S5 entry-probe 扩到执行链 + 首跑基线 | 新门禁**红→还原→绿**反证；基线分在案 |
| ② | 执行链收敛 | B8/B9/B10 ROADMAP 处置 + 活条目加 ▶；B7 §9.1 补行（先腾预算）；R7 的 AGENTS 五个断指针 + R5 命令表改真实文件名 + 公司手册入布局；**收尾动作 owner 补齐**（B11 D27／S2 intents 压缩规则／push 命令落点／认证档清单单一源） | entry-probe 复跑；§0.5 三分支人工复核 |
| ③ | 腐化清扫 | R1→R7 七批，每批一个 commit | 每批可独立 revert；死指针 0 |
| ④ | 共享盘归档（非删除） | 补台账两行（`renewal-y-2026` / `sea-entry-2026`，注明探针来源）；为 4 场 09-26 动议建快照（`workspace.actual` + `snapshot.yml`，`renewal-y-2026` README 记"两场撞 slug + 探针来源"）；执行 09-26 **轮末收敛**（23 篇 journal → CHARTER 历史纪要 → `journal/` 清空留 `.gitkeep`）；29 份非点名 drafts 随轮归档；落身份规则 9 条 + 修 B12；补两道门禁（**探针禁写真盘**、**slug 撞车检测**） | `deliverables-check` **实跑仍 0 违规**；`company-workspace/` 108 → 约 56；13 份 `final.md` 一份不动；新门禁红绿反证 |
| ⑤ | 最终收敛验收 | 地图最终形态（AGENTS/index/dev-loop 只写 now）；entry-probe **全绿 + `conflicts` 空**；收尾 Note + 中立体清扫 | 全绿 + 清扫 findings 零悬空 |

## 输掉的方案

- **重写 git 历史把清理做彻底**（用户 2026-09-26 裁"只清当前树"）：否决理由是硬的——`notes/`、
  `ROADMAP`、`intents.md` 里引用了几十个 commit SHA，重写会让它们全部指向不存在的对象，
  等于用一次清理制造一片新的死指针；且证据层（`$DSH_HOME/sessions/`）本就在 git 外，重写历史
  对它毫无作用。
- **删 `final.md` 给共享盘减重**：否决——13/13 被 `presented-final-missing` 反向锁死（实跑取证），
  且它们是 demo 的实质内容与公司历史。
- **删 52 份 `drafts/`**：否决——23 份被 `dangling-present` 锁死；另 29 份是唯一副本且被 `final.md`
  正文引用，还是"无人值守/日期待核"两条新规矩的真动议证据。
- **为 `notes/implemented/` 建主题索引**：否决——与 vendor 纪律（"lifecycle tree is the inventory"、
  不建生成索引）和本仓 `proposed/README` 的既有裁断冲突；改用 `docs/index.md` 的**人工主题路由**
  补跳板（少量、可控、不会漂）。
- **把 entry-probe 加进 `pnpm verify`**：否决——它是真模型认证档（分钟级、要 key），进 verify 会
  破坏秒级 keyless 结构门禁的分层纪律（§9.1 硬规矩 1）；改为立"何时跑"的触发规则。
- **逐条改腐化而不建门禁**：否决——腐化有复发史（bare-path 门禁的立项理由就是同一类），
  机械可查的不变量必须进门禁并带反证。

## 后果 / 验证（实跑，2026-09-26）

| 验收项 | 实况 |
|---|---|
| `pnpm verify` / `pnpm test` | ALL PASS / 25 文件 **207 项**全绿（起点 203） |
| 门禁面变化（逐项，均带红→还原→绿反证） | `verify.mjs` **+3 道**（`pin-bookkeeping` / `pin-currency` / `script-triggers`，16 → 19 项）；**扩面 1**（`bare-path` 5 → 22 文件，203 条零假阳性）；**修盲区 1**（`proposal-graduated` 只读首物理行 ⇒ 跨行状态可逃逸）；**修假绿 1**（`release-smoke` 在 solution root 上用 `tsc -p` 静默编 0 文件）；`deliverables-check` **+2 观察项**（`slug-collision` / `slug-unledgered`，观察项不判红 + 带回归） |
| `deliverables-check` 实跑 | **0 违规 ALL PASS**（13 成品 / 过程稿 52 → 23）；观察项 2 条（`renewal-y-2026` 与 `agent-workflow` 的 slug 复用，后者是本次新发现） |
| `journal-audit` 实跑 | 4 场 09-26 动议全判「在场(已归档)」；仍报 4 条缺席**非本轮引入**，已在快照 README 登记 |
| `entry-probe`（8→12 问，扩到执行链） | **12/12 且 conflicts 空**。四轮基线：0/12（尺子坏）→ 8/12 → 10/12 → 12/12 |
| findings 台账逐条销账 | 13 blocker 全处置（B13 按「改正 Note」分支）；45 rot / 10 noise / 5 结构性全处置或显式留案 |
| 行预算 | AGENTS 108→**104**/115；dev-loop 451→**444**/448（先搬后加，净腾出余量）；index 142→**143**/145 |
| 文件规模 | `ROADMAP.md` **429 → 73 行**；`company-workspace/` **108 → 56 文件** |

## 仍然开着的（交回队列/磨清单，不假装已闭）

- **B12 的行为面**：手册 $500 档位已按事实家对齐（文本层），但**没有行为面认证档**验证公司角色
  真的不再为 $500 发起 `request_signoff`（真模型档，按需）。
- **`snapshots/` 层的重复与体积**（33 MB / 同批交付物 3–5 份）**未审计**——另立条目。
- **探针的语义层**：12/12 是**机器判据**通过，`semantic review pending`——机器过不等于语义审阅过
  （dev-loop §12 已写明这条边界）。

## 风险与未知（交付后仍成立的部分）

- `renewal-y-2026` 目录内两场动议的产物**逐文件归属未核实**（归档按"整目录 + README 说明"处理）。
- `snapshots/` 体积与重复未审计（见上节）。
- 探针的 `conflicts` 是**强信号但非全覆盖**：它只报模型读到的矛盾，读不到的不会报。
- 快照层审计需配 `--only <slug>`（整盘拷贝 + 单轮日志的输入不成对），已在脚本文件头与快照 README 写明。
