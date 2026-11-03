---
topic: 仓库卫生
intent: "第六轮七维打扫（2026-11-03）：fresh agent 独立复评七个维度、对照第五轮 A- 结论找残余与新腐化，产出带 file:line 与实跑读数的 GAP 清单、分批计划与层次化改判。"
---

# 第六轮七维审计（2026-11-03，fresh agent）

> 服务：[第六轮七维打扫卡](../../settled_issues/2026-11-03-repo-hygiene-round6.md)
> 上一轮：[第五轮审计](../repo-hygiene-round5/2026-11-03-seven-dimension-audit.md)（结论 A-/A-/A-/A-/A-/A-/A-）与 [复评](../repo-hygiene-round5/2026-11-03-fresh-recheck.md)
> 口径：fresh agent 只读评审 + 主 agent 亲跑 keyless 全链（`verify` / `test` / `typecheck` / `coverage` / `ui-scene-smoke`）+ 四个独立子代理分维深挖；P0/P1 逐条回查原文件与 git 历史。
> 基线 = `1f61723`；`pnpm verify` 53 门 ALL PASS + 2 无对象；`pnpm test` **139 spec / 1108 例**（修复前）；`pnpm typecheck` exit 0。

## 0. 一句话结论

**骨架仍是 A- 档，问题不在结构而在"结构看不见的地方"：** 门禁只守被强制的形状，于是**当日一次类型迁移静默覆盖掉整份 DAG spec**（无人发现，套件仍全绿）；同一逻辑让**三个链接豁免区藏 41 条死链**而 `md-links` 报 0。第五轮修的是"看得见的腐化"；本轮暴露的是**腐化通道**——缺的是"同一内容不许出现两份""豁免区要报数"这类反证面，以及用户点名的**层次化**（平铺目录）。

## 1. 七维评级（本轮独立评分，对照第五轮）

| 维 | 本轮 | 上轮 | 判据（证据） |
|---|---|---|---|
| D1 文档与渐进披露 | **A-** | A- | 入口链真实薄：根 AGENTS 84 行自动注入，`docs/AGENTS.md` / `_backlog/AGENTS.md` 触碰注入；32/32 文档有「何时读」；契约层 0 死链。残余：设计层两处与现役矛盾（`docs/design/ui-demo.md:139` 仍称已删的 `CompanyView.tsx`「仅测试引用」；`docs/index.md:17`「四条协作通道」而通道 D 已退役）；"51+6 名单"式过期枚举 7 处；129 篇 implemented 中 76 篇零入链。 |
| D2 代码与测试层次 | **B+** | A- | 源码三面（host/lib/client）方向由 `src-layering` + `tsc -b` 双守、0 环 0 反向边；但**平铺**：`src/client` 41 文件、`tests/client` 48、`tools/lib` 48、`checks/gates` 53、`tests/harness` 53；85 个源码模块只有 36 个有同名 spec（42%）；`src/host/cultivation.ts`（710 行）无直接 spec，只有 `tests/support/cultivation-harness.ts` 间接引用。用户本轮明示要求层次化——与上轮 D2「不建议重组」相反，改判为 GAP。 |
| D3 文档—执行—验收 | **A-** | A- | 授权（policy P1–P5）、执行（dev-loop 六节 + 重定向）、验收（testing 宪法 + tests/README 行级映射 + 五个完成定义 skill + 六行回执）各单家；pre-push 三件套接线。残余：验收结论仍靠人贴（`审查：` 手写）；`_backlog` 制度面 ~427 行服务 3 张活卡，比例偏重。 |
| D4 上下文腐化 | **B** | A- | **当日实证腐化**：`d6d1f92` 把 `tests/company/dag.spec.ts` 整体覆盖为 `cultivation-lib.spec.ts` 的字节副本（md5 相同），全绿、无人发现（→ 已修，见 §2 R6-01）。41 条死链全落在门禁三个豁免区（`snapshots/`、`runtime/`、`company-workspace/` 前缀 / `archive` 目录名 / 归档只查 `.md`）；设计层"现状声明"无人守（bare 文件名不进 `bare-path`）；76 篇零入链在"分诊"后数量不变。 |
| D5 测试资产 | **B+** | A- | 1108 例 / 覆盖率阈值 10 模块 / 21 条 BUG 守卫带红配方 / layering 守卫真实；但被腐化面击中一次（重复 spec 21 例、DAG 模块 0 单测）+ 15 处源码文本断言 + `expect(true).toBe(true)` 式同义反复 + `catalog-wiring` 两条空断言 + vitest 内零快照比对 + presets 仅文本断言 + 18 模块无直接 spec。 |
| D6 反馈通路 | **B+** | A- | 真页面车道真的通（本轮亲跑 `ui-scene-smoke --isolated --golden` = 9/9 页签金样一致）；`--steps`/截图/`body.txt`/`verdict.json` 可复现失败。但**首屏不指路**：`pnpm orient` 只列 verify/test/orient，不提真页面、`diagnose`、`diagnosis/`、客户端错误日志；`orient --scenario visual/*` 给出会崩的 `replay-smoke` 命令；`diagnose --help` 静默忽略参数去打一份会话摘要；客户端错误落盘条件苛刻（历史上只写过 1 行）。 |
| D7 DSH 插件约定 | **A-** | A- | 机制面教科书级：bundle patch 数组 / 六 preset insert / `dsh.client` / `files`（无 src、无 bin）/ `engines.dsh` / 应用内安装形状 / 卸载与重装冒烟（release-smoke ⑦）/ market index 经 DSH 真校验器。**seam 面偏离**：①「安装 profile ≠ 启动 profile」——Plugins 页装当前 profile，文档却把 `dsh --profile company` 写成唯一入口（R6-13）；②卸载残留清单不准（lease 在 home 根不在 `company/`，workspace 登记/客户端日志/localStorage 未列，R6-14）；③`<DSH_HOME>/company/settings.json` 被文档当现行 tier，生产只读不写（R6-15）；④lease 在 workspace 解析前获取，与「无 workspace 零写」表述相反（R6-16）；⑤market index 只列单版本 + 生成时 `publishTimestamp`，与参考生成器行为不同（R6-17，外部发布面）。 |

**总评：结构面 A-，腐化面 B，层次面 B+。** 与上轮差异集中在 D4/D5/D6：不是退步，而是**上轮把"没有门禁的腐化"当成了"没有腐化"**。

## 2. 分级发现

### P0 / P1

| # | 维 | 级 | 发现 | 状态 |
|---|---|---|---|---|
| R6-01 | D4/D5 | **P0** | `tests/company/dag.spec.ts` 在 `d6d1f92` 被覆盖成 `cultivation-lib.spec.ts` 的字节副本：`lib/dag.ts`（261 行布局算法）失去唯一单测，套件多 21 条重复用例且全绿（`md5` 相同；`git show d6d1f92 -- tests/company/dag.spec.ts` 为整文件替换）。 | **已修**：恢复原 spec + 补 `TaskRow.description` 字段（`pnpm typecheck` 0 / 该 spec 20 例绿） |
| R6-02 | D4 | **P0** | 腐化通道无门：任何一份 spec 被复制/覆盖时，另一份仍在跑，套件全绿。 | **已修**：新增 `checks/gates/spec-duplicates.mjs`（测试文件字节重复即红，带造红留证） |
| R6-03 | D2/D5 | **P1** | `tsconfig.test-harness.json` 用 51 行手工 include 清单代替目录 glob；同目录 `tests/client` / `tests/company` 早已是 glob+exclude。手工清单会静默漏新 spec，并在本轮暴露真实 type error（`company-tab-catalog.spec.ts:20` 少传第二个参数）。 | **已修**：改 glob + 单条 exclude（`pack-exports`，混合面无法被任一项目类型检查——实测两向均红）；补参数；`pnpm typecheck` 0 |
| R6-04 | D6 | **P1** | `orient --scenario <visual/场景>` 的「验证命令」硬编码为 `replay-smoke --scenario`，实跑 ENOENT（visual 场景没有 `snapshot.yml`）；正确入口 = `ui-scene-smoke --isolated --golden`。 | 待修 |
| R6-05 | D6 | **P1** | `diagnose` / `orient` 不实现 `--help`：未知参数被静默忽略，`--help` 会打印一份真实摘要并 exit 0（agent 以为拿到了用法）。 | 待修 |
| R6-06 | D6 | **P1** | 首屏不指路：`pnpm orient` 的「便宜检查」只有 verify/test/orient --scenario；真页面、`diagnose`、`diagnosis/`、`company-client-errors.log` 分散在三份文档里。 | 待修 |
| R6-07 | D4 | **P1** | 41 条死链全在门禁豁免区：`markdown-links.mjs:171` 对 `snapshots/ runtime/ company-workspace/` 前缀缺失直接 return；`EXCLUDED` 按目录名 `archive` 整类放行；`notes-archived-links.mjs:28` 只查 `.md`。活层也中招：`_backlog/methods/requirements-elicitation.md:36` 指向 gitignored 的 `company-workspace/AGENTS.md`。 | 待修 |
| R6-08 | D1/D4 | **P1** | 设计层两处与现役相反：`docs/design/ui-demo.md:139`（已删的 `CompanyView.tsx`）、`docs/index.md:17`（「四条协作通道」，通道 D 已退役；`docs/terminology.md:16` 同）。`runtime/second-machine*/` 里的旧源码副本让 `find` 仍能找到该文件——正是此类声明"看着为真"的原因。 | 待修 |
| R6-09 | D1 | **P2** | 「51 个不变量 spec（a/b/c/d/e/f）」在 7 处复述同一过期枚举；数字对、名单只覆盖 6 份。D28 同款病。 | 待修 |
| R6-10 | D2 | **P1（用户点名）** | 平铺无层次：`src/client` 41、`tests/client` 48、`tools/lib` 48、`checks/gates` 53、`tests/harness` 53。Agent 进目录先吃 41–53 个名字。 | 待修（分批） |
| R6-11 | D5 | **P2** | 18 个模块无直接 spec（`host/cultivation` 710 / `workspace-doors` 87 / `client/company-data-plane` / `client/session-source` 0 引用…）；`catalog-wiring.spec.ts:82-94` 有两条空断言；`candidate-scan-labels.spec.ts:298-301` 是 `expect(true).toBe(true)`。 | 待修 |
| R6-12 | D5 | **P2** | 15 处源码文本断言（`client-face` 断 `useState(false)`、`client-css`/`motion-css` 解析 CSS 文本、`team-tool-card` 断 vendor 源码字符串）：行为保持的重构会红，行为回归只要拼写不变仍绿。 | 待修（择重点） |

| R6-13 | D7 | **P1** | 安装 profile ≠ 启动 profile：Plugins 页装的是**当前 profile**（release-smoke ④c 实测装进 `web`），而 `README.md` / `packages/company-pack/README.md` / `docs/release.md` 把 `dsh --profile company` 写成唯一入口；`company` 不是出厂 profile，缺失时 DSH 直接报错。 | **已修**（README / profile.md / 安装手册模板按「装进哪个就启动哪个」改写） |
| R6-14 | D7 | **P1** | 卸载残留清单不准：`<DSH_HOME>/company-pack.lock` 实际在 home 根（手册写在 `company/` 下）；`storages/workspace.json` 的登记行、`logs/company-client-errors.log`、浏览器 localStorage 键未列。DSH 无卸载清理钩子 ⇒ 唯一合规动作 = 精确披露。 | **已修**（模板表格 + 清理命令；`_dist` 手册待下次 `release --prepare` 再生） |
| R6-15 | D7 | **P2** | `<DSH_HOME>/company/settings.json` 被 4 处文档写成 workspace 解析的一层，但生产端只读不写——文档承诺了一个不会发生的便利。 | **已修**：实现写侧（内容未变不重写、写失败只告警）；Note = [workspace-choice-and-lease-order](../../../../notes/implemented/2026-11-03-workspace-choice-and-lease-order.md) |
| R6-16 | D7 | **P2** | `runtime-guard` 在 workspace 解析**之前**取 lease（写 `<DSH_HOME>/company-pack.lock`），与「无 workspace 时零写」表述相反；另 cwd 启发式会把任意「可用目录」当 workspace 自动写 `.dsh-company/`。 | **已修一半**：lease 挪到解析之后（无 workspace 不取锁）；cwd 启发式保留（产品行为，见 Note 的输掉的方案） |
| R6-17 | D7 | **P3** | market index 只列 0.8.7 单版本、`publishTimestamp` = 生成时刻；参考生成器列全部已发布版本 + 真实发布时间。`_dist/market/index.json` 仍是 0.7.0（gitignored）。 | 外部发布面（未 publish，本轮不动） |

### P3 / 观察

- `runtime/` 跟 3 个**一次性探针**（`probe-drill.mjs` / `probe-schedule.mjs` / `probe-two-instances.mjs`，头注自认「用完可删」，对应卡均已归档），却靠 `.gitignore` 的 `!runtime/probe-*.mjs` 白名单 + `gitignore-shape` 门禁固定——**源码住"运行残留家"是分类错误**。
- `runtime/README.md` 的归档语义行写着 `外部私有证据仓（不进产品仓）/` ——路径槽里是散文，读者无处可去。
- `checks/INDEX.generated.md` 是受控的第二清单（`script-index` 门禁保新鲜）；可以接受，但它是唯一例外。
- `_backlog/research/README.md:62` 的活题目录只到 round5；本轮新增 round6 需登记。
- 覆盖率读数（本轮）：`pnpm test:coverage` 阈值 10 模块全过；`tools/lib` 侧 `diagnosis.mjs` / `install-manual.mjs` / `probe-window.mjs` 为 0%（由 smokes 覆盖，不入 keyless 面）。

## 3. 与第五轮的关系

- **守住且本轮复核通过**：入口链与注入面、`docs/` 分层与 `doc-taxonomy`、行预算棘轮、`notes` 状态行纪律（抽样 20/20）、`release-smoke` 的卸载/重装、`ui-scene-smoke` 金样档、`retired-path` 的 v3 前缀、`tests/client`+`tests/company` 进 tsc。
- **第五轮判过、本轮改判**：①「不建议重组平铺目录」→ 用户明示要求层次化，改判 GAP（R6-10）；②「tests 类型面 51/53 已收口」→ 手工清单本身是腐化面（R6-03）；③「零入链 76 篇已全量分诊」→ 分诊不动链接图，指标不变（D1 残余，不本轮处理）。
- **新形态**：**腐化发生在"门禁不看的形状"里**——重复内容（R6-02）、豁免区（R6-07）、无门禁的设计层现状声明（R6-08）。这比"旧文过期"更难：旧文还在被引用，且看起来合理。

## 4. 计划（分批，每批同 diff 证据）

| 批 | 内容 | 维 | 风险 | 验收 |
|---|---|---|---|---|
| A · 止血 ✅ | R6-01/02/03/08/09（已落地）+ R6-13/14 | D1/D4/D5/D7 | 低 | `pnpm verify` + `pnpm test` + `typecheck` |
| B · 首屏与反馈 ✅ | R6-04/05/06：`orient` 首屏补真页面/诊断/日志入口；`--scenario` 分场景给正确命令；`diagnose`/`orient` 实现 `--help` 与未知参数 fail-loud | D6 | 低 | 实跑四个命令流；`orient` spec |
| C · 豁免区算账 ✅ | R6-07：活层死链先修；新增 `checks/gates/link-debt.mjs` + `checks/gates/lib/link-debt.json`（archived 32 / moved 0 / live 0） | D4 | 中 | 造红两条：加 moved 死链 / 往归档加死链 → 超基线红；还原绿 |
| D · 层次化（代码）✅ | R6-10 第一刀：`src/client` → `index.ts` + `wiring/ data/ ui/ tabs/ cultivation/`；同步 `company-tab-catalog` / `ui-golden-freshness` / `cdp-probe` 的源路径 | D2 | 中高 | `typecheck` + `pnpm test` + `verify` + `ui-scene-smoke` 全绿 |
| E · 层次化（测试）✅ | R6-10 第二刀：`tests/client` 镜像五组；`tests/harness` → `repo/ tools/ session/ evidence/ ui/`（54 → 5，顶层 0） | D2 | 中 | 同上；三次真实路径失效被抓（tsconfig 排除 / entry-probe 根 / skip-budget 自身） |
| F · 测试质量 ✅（首刀+二刀） | R6-11/12：`workspace-doors` / `install-manual` / `error-relay` 补判据；`catalog-wiring` 空断言改真行为；删 `expect(true)`；`dag-panel` 负向正则收窄到 inline style；`host/cultivation` 仍只经 harness（明说不用重复造） | D5 | 低 | 覆盖率读数 + 四次造红 |
| H · 行为面收口 ✅ | R6-15/16（settings tier 真的写、lease 挪到解析后）；D6 错误中继队列化 + e2e 补「加载即报错」段 | D6/D7 | 中 | 单测造红 + 两条真页面 smoke ALL PASS |
| G · 老旧资产 ✅ | 三个一次性探针删除（`runtime/` 白名单 5→2 件，`gitignore-shape` 同步）；`runtime/README` 散文路径槽修正 | D1/D4 | 低 | `verify`（gitignore-shape 同步）+ `script-index` |

**不做**：`npm publish`（人工）、`vendor/` 改动、`tests/*` 以外的大规模搬迁（`checks/gates` / `tools/lib` 的 48/53 平铺在 D 批视效果决定是否跟进——它们被 53 门与 86 脚本以相对路径引用，搬迁收益低于风险，需单独论证）。

## 5. 本轮实跑读数（原样）

```text
pnpm verify                       # ALL PASS 53 门 + 2 SKIP
pnpm test                         # 审计时 139 files / 1108；批 A 后 1107（dag 去重 −21、恢复 +20）；批 B 后 1109（+2 orient）
pnpm typecheck                    # exit 0
pnpm test:coverage                # 10 个模块阈值全过；tools/lib 侧 diagnosis/install-manual/probe-window 0%（smoke 面）
node checks/smoke/ui-scene-smoke.mjs --isolated --golden   # PASS：9/9 页签金样一致
node tools/orient.mjs             # 6 slug / 凭据 ✓；「便宜检查」只有 verify/test/orient
node tools/orient.mjs --scenario visual/company-shell      # 「验证命令」= replay-smoke（实跑 ENOENT）
node tools/diagnose.mjs --help    # 忽略 --help，打印最新会话摘要 exit 0
md5 tests/company/dag.spec.ts tests/company/cultivation-lib.spec.ts   # 修复前同值 3255b4cedbe1f35b193e156756a3f889
```

## 6. 本轮没覆盖的

- 真模型认证档（`entry-probe` / `delegation-smoke` / `probe --full`）：成本与授权。
- `npm publish` / 远程 market 托管：人工 handoff。
- `notes/` 76 篇零入链的逐篇处置：上轮已定性「不批量迁」，本轮只记录。
- Desktop 壳首屏的像素级走查：只看了 Web 隔离页。

## 7. 本轮落地后的复评（2026-11-03，批 A–E 与 G）

> 口径：同一天、同一 HEAD 基线；只记**已落地并验证**的变化，未做的仍按 §1 计。

| 维 | 审计时 | 现在 | 变的证据 |
|---|---|---|---|
| D1 | A- | **A-** | 设计层两处现状改口、过期枚举删除；残余（76 篇零入链）未动 |
| D2 | B+ | **A** | `src/client` 41 → 1 入口 + 5 关切目录；`tests/client` 48 → 根 1 + 五组镜像；`tests/harness` 54 → 五组（repo/tools/session/evidence/ui）；0 环仍成立；`checks/gates`(54) / `tools/lib`(48) 判为同质目录、不搬（见 §8 决策） |
| D3 | A- | **A-** | 未动（无新增验收面） |
| D4 | B | **A-** | 重复 spec 门禁 + 链接欠账棘轮（archived 32 / moved 0 / live 0，超基线即红）；残余 = 冻结层 32 条死链（按政策只设天花板）、设计层现状声明仍无机械面（人工复核）、76 篇零入链（上轮定性不批量迁） |
| D5 | B+ | **A-** | DAG spec 恢复（+20 例）、混合面类型洞收口、orient +2 例；F 批：`workspace-doors` 直接 spec（4 例，带造红）、`install-manual` 模板判据（4 例，零覆盖 → 有判据，含 lease 归属的回归守卫）、`catalog-wiring` 空断言改真行为、删掉 `expect(true)`；套件 1108 → 1116。残余 = 少量源码文本断言（CSS/装配面，刻意保留） |
| D6 | B+ | **A-** | 首屏真页面/诊断入口、`--scenario` 按类型分派、`--help` 与未知参数 fail-loud；客户端错误改为有界队列中继（无会话排队、会话出现后补送、节流不再丢条目）；残余 = 「先抛错再开会话」的端到端时序未做探针 |
| D7 | A- | **A-** | 安装=启动 profile、卸载残留披露；D7 两项已决并落地——「最近选择」真的写、lease 挪到 workspace 解析之后（无 workspace 零写含锁文件）；残余 = npm 未发布、market index 单版本（外部发布面） |

**总评：A- / A- / A- / B+ / B+ / A- / A-。** 剩余两档 B+ 各自有明确批次（D4 = 冻结层天花板不动 + 设计层现状人工；
D5 = F 批测试质量）。下一轮优先级：F 批（测试质量）→ C 批余项（豁免区从"有天花板"到"定向清账"）→ `checks/` 与 `tools/` 的层次论证。

## 8. 层次化边界：哪些搬了、哪些明确不搬

| 目录 | 判断 | 依据 |
|---|---|---|
| `src/client`（41） | **搬**：1 入口 + `wiring/ data/ ui/ tabs/ cultivation/` | 41 个名字混着五种关切，`ls` 不传达架构；产品代码，读者最多 |
| `tests/client`（48） | **搬**：镜像 `src/client` 五组，根只留整客户端组合 spec | 测试树要能按被测面导航；与源码同构最省猜 |
| `tests/harness`（54） | **搬**：`repo/ tools/ session/ evidence/ ui/` | 54 个名字混着五类判据（仓库不变量/工具纯逻辑/会话/协作证据/金样） |
| `checks/gates`（54） | **不搬** | 同质目录：**一门禁一文件**，名字即不变量；读者是加门禁的维护者，`gate-wiring` 依赖「目录 = 清单」；搬迁要动 54 门 + runner + 97 处文档引用，收益是"分组"，风险在验证链本身 |
| `tools/lib`（48） | **不搬** | 同质目录：**一模块一文件**，被 54 门 + 86 脚本以相对路径引用；分组维度与门禁/脚本的消费关系不同构，搬了要先发明第二套目录约定 |
| `probes/*`（59，四域） | 不搬 | 已按机制域四子目录；单目录内是"一次探针一文件" |

**复访条件**：`checks/gates` > 70 或出现第二位维护者按主题找门禁时再议；届时先立「门禁 → 关切」的
目录约定与 `gate-wiring` 的递归判据，再一次性搬（附 tension note：D28 的"枚举的家 = 实现自己"仍成立，
分组只是让清单可扫得更快，不产生第二份清单）。

## 9. 收口：R6 逐条状态（2026-11-03 末）

> 口径：已落地 = 有同 diff 证据（Note/测试/门禁）；延后 = 写明触发条件或不做的理由。不留悬空编号。

| # | 状态 | 落点 |
|---|---|---|
| R6-01 DAG spec 被覆盖 | ✅ 已修 | 恢复原 spec（+`TaskRow.description`）；20 例绿 |
| R6-02 重复 spec 无门禁 | ✅ 已修 | `checks/gates/spec-duplicates.mjs`（造红留证） |
| R6-03 harness tsconfig 手工清单 | ✅ 已修 | glob + 单条 exclude；隐藏 TS2554 修好 |
| R6-04 `--scenario` 错误命令 | ✅ 已修 | 按 kind 分派（replay/visual/归档） |
| R6-05 `--help` 静默忽略 | ✅ 已修 | orient/diagnose `--help` + 未知参数 exit 2 |
| R6-06 首屏不指路 | ✅ 已修 | orient「看到真页面 / 查失败现场」节 |
| R6-07 豁免区死链 | ✅ 已修 | `link-debt` 棘轮 + 5 条活层死链改写 |
| R6-08 设计层两处现状矛盾 | ✅ 已修 | ui-demo / index / terminology 改口 |
| R6-09 过期枚举 | ✅ 已修 | 7 处「51+6 名单」改为规则表述 |
| R6-10 平铺无层次 | ✅ 已修 | src/client + tests/client + tests/harness 三树；checks/tools 判定不搬（§8） |
| R6-11 无直接 spec 的模块 | ✅ 部分 | 补 workspace-doors / install-manual / error-relay；`host/cultivation` 仍经 harness（5 档真跑，不重复造）；`client/session-source` 无直接 spec（10 行副作用导入）→ 延后，触发 = 改它时补 |
| R6-12 源码文本断言 | ✅ 部分 | dag-panel 收窄；client-face 装配面**刻意保留**（`client-load-smoke` 抓不到同键冲突，注释已论证）；CSS/夹具文本断言属产物契约，保留 |
| R6-13 安装≠启动 profile | ✅ 已修 | README / profile.md / 手册模板 |
| R6-14 卸载残留清单 | ✅ 已修（模板） | 模板已改；`_dist/安装手册.md` 待下次 `release --prepare` 再生（触发 = 发布轮） |
| R6-15 settings tier 只读不写 | ✅ 已修 | 实现写侧 + 单测 + home 白名单 |
| R6-16 lease 先于 workspace | ✅ 已修（一半） | lease 挪后；cwd 启发式保留（产品行为，Note 记了输掉的方案） |
| R6-17 market index 单版本/时间戳 | ⏸ 延后 | 外部发布面；触发 = `npm publish` 后按参考生成器重生成（`publish-handoff`） |
| R6-18 首屏错误无盘上证据 | ✅ 已修 | 错误中继队列 + e2e「加载即报错」段 |
| R6-19 `_dist` 手册与模板不同步 | ⏸ 延后 | 生成物，不手改；触发 = 下次 `release --prepare` |

**结论**：17 条原始 GAP 中 15 条已闭或部分闭合（部分项写明了保留理由），2 条延后且都写了触发条件；
新增 2 条由本轮改动暴露（R6-18/19）并已处理/登记。材料本身即"评估 + GAP + 计划 + 证据"四件套；
实施证据散在 8 篇 `notes/implemented/2026-11-03-*` 与提交链里。
