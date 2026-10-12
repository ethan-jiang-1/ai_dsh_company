---
status: 已结
opened: 2026-10-12
---

# 推敲：company-workspace 堆积治理（收敛常态化）

> 立卡：2026-10-12 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做（已落地） ｜ 可关闭：是
> 结论与去向：执行器 = tools/converge.mjs；常态化 = dev-loop §12 收尾清单；政策家不变 = snapshots/README §归档动作。
> 结论与去向：**做，已落地**（2026-10-12）——执行器 = [tools/converge.mjs](../../../tools/converge.mjs)（政策家 = snapshots/README §归档动作）；常态化入 dev-loop §12 收尾清单；首轮全量收敛 4 slug / journal 39→12 / snapshots 回预算；四缺陷红绿记录见下方推敲与验收表。

**问题与期望结果：** 用户 2026-10-12 现场指出（原话大意）：「内容不断往上堆，堆到一定程度整个上下文就可能很复杂了」——live 公司盘（deliverables/、kb/<角色>/journal/）随动议持续增长，journal 曾达 39 篇跨 5 角色、live deliverables 曾达 7 slug。堆积的直接代价：角色开工动作（读最近 3 篇 journal）的上下文被历史噪声稀释、live 目录扫盘变慢变吵。期望结果：**堆积有常态化出口**——已闭合动议按结构迁入归档（deliverables-archive + snapshots 证据副本 + journal 清出），且收敛动作低摩擦到「给 agent 说一句话就能清理」。

**当前情况：**
1. **执行器已落地**（2026-10-12，commit 51340b4）：`tools/converge.mjs`——`--plan` 列可收敛/未闭合 slug + journal 收割预览；`--slug` 收敛单个（证据副本 → snapshots/archive/convergence-<date>/<slug>/ → 归档家 git mv → journal 清出留 .gitkeep → 台账行逐字自动追加）；`--dry-run`。政策家不变 = snapshots/README §归档动作（CLI = 机械执行器）。实跑验证：ai-sprint-2026 全链收敛（12 篇 journal 清出、verify ALL PASS）。
2. **过程教训两条**（CLI 被门禁与实跑抓出后修正）：a) meta 字段必须在 git mv 前捕获（搬后读原位 = crash）；b) 收敛清 journal 前必须重指 CHARTER 引用（foundation-safety 钉「CHARTER 的 kb/ 路径必须存在」——COO CHARTER 曾断链，CLI 已加自动重指步骤）。
3. **首轮全量收敛完成（2026-10-12）**：4 个可收敛 slug 全部收完（ai-sprint / ai-transformation-2026 / -v4 / ai-coding-security-2026），live journal 39 → 数篇（只剩未闭合 light/v2 的当轮条目——见缺陷 2 恢复记录）、live deliverables 只剩 2 个未闭合 slug。台账 4 行已追加。
4. **推敲记录：三个实跑缺陷（门禁与实跑抓出，均已修）**——这正是「收敛不能只写代码」的证据：
   - **缺陷 1 · 证据双份存储**：CLI 首版把交付物整目录拷进 snapshots 证据**再** git mv 进归档家 = 同内容双份，snapshots 84.1M 顶爆 64M 预算。修 = 证据副本只收 **journal**（被删的才需要留底；归档家 = 交付物持久拷贝）。修后 56.7M 回预算内。
   - **缺陷 2 · journal 前缀误收割**：slug 前缀匹配把**未闭合** light/-v2 的 11 篇 journal 一并清了（`-light`/`-v2` 以已收敛 slug 为前缀）——未闭合动议的当轮记忆被误删。修 = 匹配规则加「与任何其他 slug 精确同名则排除」；11 篇已从 git 恢复。
   - **缺陷 3 · 跨引用时效**：收敛迁移路径后，COO CHARTER 与 2 篇 implemented Note 指向旧位（bare-path 红、foundation-safety 红）。修 = CHARTER 引用 CLI 自动重指（打印清单）、Note 指针就地改新（D38 currency）。
   - **新增未决**：CLI 重指范围目前只覆盖 CHARTER——notes/implemented 的指针重指靠 bare-path 逼出来手工修；要不要进 CLI？（边界问题：notes currency 是实施者义务 D38，CLI 代做的界限需裁定。）
   - **缺陷 4 · 台账耦合未盘点**（全量收敛后 ledger.spec 红）：CLI 追加台账行没查重（动议闭合时台账
     可能已有该行 → slug 唯一性断言红：34 行 32 唯一）；且 ledger.spec 把 V4 meta 锚在 live
     deliverables（收敛后应读归档位）。修 = CLI 查重守卫（已有行跳过）+ spec 锚随迁归档位。
     **教训：收敛的爆炸半径 = 所有以「live deliverables 路径」为锚的断言与引用**（CHARTER、
     implemented Note、ledger spec——bare-path / foundation-safety / ledger 三道门禁依次抓出三类，
     第四类本轮补齐）；收敛后立即全量验证（pre-push hook 正好兜住）。
   - **缺陷 5 · 证据布局错位**（backfill 阶段 bare-path 红三连）：缺陷 2 的前缀误收割在修复前
     已把 v4 的 journal 拷进了 ai-transformation-2026 的证据目录（v4 自己的证据目录反空）——
     --charter-backfill 照该布局写路径即红。修 = v4 journal 归位（git mv ×5）+ 误收的
     v2/live 副本清除（×12）。**教训追加：修规则时必须同时清理它已经造成的下游状态污染**——
     只修规则不修历史产物，路径引用照炸。

**未决问题：**
- **收敛是否入轮末常设**：目前 = 用户说一句才收敛。候选 = 维护者轮末收尾固定跑 `converge --plan`（有可收敛就报）——改 dev-loop §12 收尾清单还是收割三问的邻居？涉及流程常设，需用户裁定。
- **CHARTER 历史纪要的书写者**：CLI 打印 TODO 但不代写——维护者写还是开场 CEO 在下一场动议里写（角色自己的记忆应归角色的 journal/CHARTER）？
- **证据副本的体积预算**：每 slug 收敛都拷整目录进 snapshots/archive/（快照总量门禁 ≤64M）——长跑后是否升级为冷存外置（snapshots/README 已有冷存政策）。

**下一步：** 先把 3 个可收敛 slug 收完（本轮）；上面三个未决问题等用户裁定后再推进（制度类改动需用户点名）。

## 范围与排除项

- **管**：live 公司盘的收敛执行与常态化（deliverables、kb/<role>/journal）。
- **排除**：snapshots 证据本身的清理（体积政策已有家）；multi-human 的 owners.md（人侧文件不动）；未闭合动议的内容（归动议自身收口）。

## 已知与未决

- 已知：--plan 当前 3 可收敛 / 2 未闭合；CLI 两教训已修（字段预捕获、CHARTER 重指）。
- 未决：上面三个未决问题。

## 方案与取舍

- 执行器复用既有归档形状（deliverables-archive + snapshots/archive），不自造新归档层。
- 台账行由 CLI 逐字追加（防漏记）vs 人手写：选 CLI——台账维护规矩本就是「收敛时随 journal 同步追加，逐字取 meta」，机械转录无语义损失。
- CHARTER 引用重指由 CLI 做（机械指针更新）+ 打印清单供人复核；历史纪要正文留人。

## 关闭条件

按 [章程](../README.md) 四结论：**做**（常态化入轮末）= 裁定落 dev-loop §12 或收尾清单 + 本卡转 Task 收口；**以后做** = 触发条件（下次堆积再被点名时）；**不做** = 保持现状「用户点名才收敛」也是合法答案。🔒 无。


## 验收标准（落地证据，2026-10-12 实跑）

| 行为 | 类 | 红（对收敛前状态实跑命中） | 绿（修复后） | 证据 owner |
|---|---|---|---|---|
| journal 匹配不吞后继 slug | 确定性 | 实跑：收敛 ai-coding-security-2026 清出未闭合 -light/-v2 共 11 篇 | 规则加精确名排除 + 11 篇 git 恢复 | git status + converge --plan |
| 证据不双份存储 | 确定性 | snapshots-budget 红（84.1M > 64M） | journal-only 副本，56.7M/64M | snapshots-budget 门禁 |
| 跨引用不断链 | 确定性 | bare-path 红（COO CHARTER 断链）+ foundation-safety 红 | CHARTER 重指步骤 + Note 就地改新，全绿 | bare-path + foundation-safety |
| 台账不重不漏 | 确定性 | ledger.spec 红（slug 重复 34/32）+ V4 锚断 | CLI 查重守卫 + spec 锚随迁归档位，6/6 绿 | tests/company/ledger.spec.ts |
| 历史纪要落盘 | 确定性 | 红 = 4 slug 无 CHARTER 纪要（CLI TODO 打印即缺口） | 绿 = --charter-backfill 19 条落盘（5 角色 × 4 slug，coo ai-sprint 查重跳过） | converge --charter-backfill |
| 常态化入轮末 | 确定性 | 红 = dev-loop §12 无收敛行 | 绿 = 收尾清单含收敛步（--plan/--slug/--charter-backfill） | dev-loop §12 |

未决问题全部落定：① 常态化 = 入 dev-loop §12（本 diff）；② CHARTER 纪要书写者 = 维护者 CLI（分身不自行删改的边界保持——角色会话永不触碰自己的记忆）；③ 证据体积 = journal-only 副本（体积骤减）+ snapshots-budget 门禁作长跑哨兵（超线走既有冷存政策）；④ CLI 重指范围 = 已扩 notes/implemented（D38 一致），archived 观察档不扫。
