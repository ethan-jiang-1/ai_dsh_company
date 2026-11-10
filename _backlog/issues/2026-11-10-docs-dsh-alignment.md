---
status: 推敲中
opened: 2026-11-10
---

# docs/ DSH 对齐：四个实质偏离怎么收

> 立卡：2026-11-10 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否
>
> 背景：结构收敛已落（commit `35ffbb05` + `59fc0162`）；DSH 对齐只到骨架。本卡只做**决策与排序**，不动文件——选定的项各自再立实施卡。

## 问题

上一轮把 `docs/` 的树位置对齐了 DSH（顶层门/宪法 + `contracts/` + `reference/` + 子树 AGENTS），但 DSH 的几条实质规则仍未对齐。不解决它们，“docs/ 已 DSH 化”就是过度声称。

## 依据（DSH `docs/AGENTS.md`）

- “A document's subject and tree position fix its scope… link to the owning descendant for lower-level detail.”
- Placement：rationale → Agent Notes；procedures → cookbooks；type definitions → subsystems；package contracts → READMEs；standing orders → root AGENTS。
- “Document current state. Keep history in commits, PRs, Agent Notes, postmortems…”
- “At or below target, retain at least 5% headroom.”
- “The tree is the working inventory”（no central index）。

本仓现状（2026-11-10 审查）：

- `design/` 4 份，全部 95–98% 顶格，仍含历史/现在时复述；DSH 会把这类“仍在指导选择的 why”放 Agent Notes。
- `index.md` 33 行逐文档登记，`doc-taxonomy` 强制；DSH 的树就是 inventory。
- 4 份 100% 顶格（decisions / delegation / environments / release-runbook）；index 70/72、AGENTS 60/62，低于 5% headroom。
- 14 处过期值；文档仍带日期/R1/R2/已退役叙述。
- 架构地图拆在 `project-map` / `runtime-map`（顶层）+ `design/architecture`（95% 顶格）。
- `contracts/` 含三种 genre：子系统语义（data-model/delegation/presets/profile/release）、运行模式（multi-human）、演示场景（demo，58% 是分镜）。

## 选项与代价

| 偏离 | 选项 A（轻） | 选项 B（严格 DSH） | 代价 | 建议 |
|---|---|---|---|---|
| 理由层 vs Agent Notes | 保留 `design/`，只留仍在指导选择的 why；历史/现在时搬合同/Note | `design/` 并回 `notes/`，4 篇改写成主题 Note | B：4 篇重写 + ~100 链接；A：瘦身 4 篇 | 先 A 后 B；B 是终态 |
| index vs 树 inventory | 保留登记表，作为受控例外写进层表 | index 改 tier map（5 层 + 入口）；`doc-taxonomy` 改 tier 可达性 | B：1 文件 + 1 门 + 层表 | B（最小结构改动，先做） |
| 5% headroom | 保留现行 20% 反棘轮 | `doc-budget` 加“内容 ≤ 95% 上限”规则，瘦身顶格文件 | B：4 份 + index/AGENTS 内容搬家 | B，但放在结构定稿后，避免瘦两次 |
| 只写 now | 先修 14 处值 | 再去日期/R1/R2/已退役叙述 | A：小；B：一轮内容 pass | A 先做，B 随后 |
| 架构地图 | 保持 project/runtime 两图 | 顶层 `architecture.md`（有序地图），why 进 Note | B：重写 1 篇 + 链接 | 与“理由层”同卡决定 |
| genre 混合 | 接受 contracts/ 多 genre | 拆 demo/multi-human/presets：合同 + guide/scenario | B：3 篇拆分 + 链接 | B，最后做 |

## 推荐顺序

1. **14 处值修正**（删数不改数，D28）：最小、独立、先把“对”补上。
2. **index → tier map**：最小结构改动，直接去掉“第二本清单”；同时改 `doc-taxonomy` 与 `docs/AGENTS.md` 新文档规则。
3. **design/ → notes/ + 顶层 architecture.md**：最大、决定终态；4 篇改写 + 地图归位。
4. **genre 拆分**（demo/multi-human/presets）：内容手术，独立。
5. **5% headroom 收口**：结构定稿后统一瘦身，避免同一内容搬两次；再加 `doc-budget` 规则。

## 需要用户拍板

1. 先做哪一项？推荐 1（14 值）→ 2（index）。
2. `design/`：先 A（瘦身）还是直接 B（并 notes）？
3. index：保留登记表（受控例外）还是改 tier map？
4. 5% headroom：只做内容瘦身，还是同时进 `doc-budget` 门禁？
5. genre：拆不拆？先拆哪一篇？

## 抽象度

- 换公司/产品类型/方法要改吗？不——`docs/` 是仓库层。
- 只有机制变才改吗？是——文档层结构/规则。
- 第二消费者：无；单例例外 = 本仓唯一的 `docs/` 树。
- 搬家成本：index/预算低；design/、genre 高 ⇒ 先做低成本项，高成本项各自立卡。
- 排除了更低的层：公司层/产品类型层只服务产品内容，不服务仓库文档。
