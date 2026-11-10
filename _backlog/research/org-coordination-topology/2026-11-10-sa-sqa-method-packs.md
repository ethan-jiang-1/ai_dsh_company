---
topic: SA/SQA 方法包：质量环怎么承载系统架构与 V&V，而不是恢复旧 persona
intent: 把旧 SA/SQA 的方法、作者身份、否决权映射到 quality-loop producer/verifier + 方法包，给出可立卡的安装/迁移/缺口结论；不实施
---

# SA/SQA 方法包：结构可以复用，身份不能假装

> 本文是[组织协同拓扑](README.md)的 SA/SQA 分支材料。只做研究，不改代码。
> 触发：用户 2026-11-10「VP-Eng 的 SA/SQA 退役后靠什么承接硬软一体研发」。

## 0. 一句话

旧 SA/SQA = **两个作者身份 + 两套方法 + 一条否决权**。质量环（producer → verifier）接过的是
**E/V 分离的结构**，不是这两个身份：verifier 只读、写不了 `vv-plan.md`，也拿不到 SQA 的直达 CEO 否决。
要把能力接回来，最干净的是**方法包**（`system-architecture` + `vv-plan`，各含 producer/verifier 两侧），
加上可选的**独立 V&V 作者档**和**blocker 升级合同**；不建议恢复旧 `system-architect` / `system-qa`
persona 把方法写回去。

## 1. 旧 SA/SQA 到底是什么

2026-11-06 落地、2026-11-09 退役（[退役 Note](../../../notes/implemented/2026-11-09-retire-sa-sqa.md)）。
旧文件仍在 git：`bf04ab1c`。

### 1.1 system-architect（SA）

- 输入：PRD（REQ/AC/slice）、StRS、技术栈、现场约束。
- 输出：`syrs.md`（`layer: SyRS` + `definition: headings` + `REQ-###`，`traces` 指 PRD）、
  `irs.md`（`layer: IRS` + `IF-###`，`traces` 指 SyRS）、`allocation.md`（不立号）、
  `system-architecture.md`（引用面）。
- 方法（`systems-architecture`）：五学科域判定（软件/固件/电气/机械/系统测试，固定五行 + 依据）、
  纯软件不硬凑、含物理件不漏域、系统/子系统/接口三层、硬软一体检查表（采样/通信/供电/环境/数据/
  记录时间/故障路径/告警/可维护性）、关键权衡表、验证点清单（引用 REQ/IF，不发号）。
- 身份：架构**作者**；不写验证结论，不改 PRD。

### 1.2 system-qa（SQA）

- 输入：PRD / StRS / 架构稿 / SyRS / IRS / 交付约束。
- 输出：`vv-plan.md`（`layer: V&V` + `definition: table-rows` + `TC-###` + `covers` 指 REQ/IF，
  层级 L1–L4、方法、判据、环境与样本）、`sqa-review.md`（E 侧逐条结论 + 一分钟摘要）。
- 方法（`vv-playbook`）：先做域审计（SA 五行是否成立、排除是否举证、承接面是否矛盾、纯软件是否硬凑、
  在域是否落地）、V 模型左右映射、TC 判据可复现、记录时间可信、故障路径耐受、对偶口径、超额声明检查。
- 身份：V&V 计划**作者** + 独立评审者；**否决直达 CEO**，VP-Eng 不能删结论。
- 工具面：能读全盘、能写自己的两份稿、无委派；不是只读。

### 1.3 为什么退役

- 方法（V 模型层级、TC 编号、五学科清单）写进了 persona/skill，换公司要改包
  （[质量环 Note:13](../../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md)）。
- 用户明确要求清理旧 preset；退役删除 preset、父级委托行、specialist 模型、support/patch、文档/测试/探针。
- SyRS/IRS/V&V 改为可选文档；默认链缩到 MRD→StRS→PRD；不再有 SQA veto 直达 CEO 的运行时路径。

## 2. 质量环现在给什么、不给什么

质量环 = `quality_loop_produce`（producer，有手）→ 收工 → `quality_loop_verify`（verifier，只读）
（[`quality-loop/SKILL.md`](../../../packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md)）。

| 给 | 不给 |
|---|---|
| 两个独立 activation（上下文隔离） | verifier 不能写盘：`vv-plan.md` 只能由 producer 写 |
| 方法外置：`method: <pack>@<version>`，两侧同名同版本 | 没有默认方法包；缺了就 fail-closed |
| 裁决逐 check-id、findings、处置三选一、复验 | verifier 没有 bash：跑不了测试/仿真，动态证据靠 producer |
| 事后审计（原文/配对/覆盖/只读/先产后验） | blocker 只到 VP-Eng；没有直达 CEO 的否决路径 |
| 只在 VP-Eng 有两条命名行 | CEO/其他角色不能直接发起质量环 |

关键结论：**质量环是复核骨架，不是 SA/SQA 的等价替代**。它能把“做”和“验”分开，但不能让 verifier
变成 V&V 计划的作者，也不能自动恢复 SQA 的治理权。

## 3. 映射：两个方法包，而不是一个

### 3.1 `system-architecture@1.0.0`

- **producer 侧**（对应旧 SA）：
  - 输入契约：PRD/StRS/任务书边界/技术栈。
  - 程序：五学科域判定 → SyRS → IRS → 分配附录 → 架构稿 → 验证点清单。
  - 检查表（示例 id）：
    - `SA-P01` 五行齐全且依据可反驳；
    - `SA-P02` 纯软件不硬凑 / 含物理件不漏域；
    - `SA-P03` 系统/子系统/接口三层在场；
    - `SA-P04` SyRS `traces` 指 PRD、IRS `traces` 指 SyRS；
    - `SA-P05` 关键权衡表每条有代价/触发改判条件；
    - `SA-P06` 验证点引用 REQ/IF，不另立号；
    - `SA-P07` 记录时间/故障路径两类验证点单列（适用时）。
  - 输出契约：四件产物 + 一页结论。
- **verifier 侧**（对应旧 SQA 的架构审计）：
  - 输入：交接包（基线/产物/约束/方法）+ 产物；不读 producer 推理/自评。
  - 检查表（示例 id，必须与 producer 同批）：
    - `SA-V01` 五行是否原样、判词/依据是否可反驳；
    - `SA-V02` 域审计：在域是否有 V&V 落点、不在域是否有排除证据、承接面是否矛盾；
    - `SA-V03` 接口字段（方向/介质/协议/频率/失败态）是否齐；
    - `SA-V04` SyRS/IRS 追溯是否断/悬空；
    - `SA-V05` 验证点是否覆盖记录时间/故障路径；
    - `SA-V06` 是否把假设写成结论、是否漏【待验】。

### 3.2 `vv-plan@1.0.0`

- **producer 侧**（对应旧 SQA 的 V&V 计划作者）：
  - 输入：架构稿/SyRS/IRS/PRD/约束。
  - 程序：左→右映射 → TC 编号 → 层级 L1–L4 → 判据/环境/样本 → 覆盖矩阵。
  - 检查表（示例 id）：
    - `VV-P01` 左侧每个产物有右侧验证（需求↔验收、架构↔系统、接口↔集成、设计↔单元）；
    - `VV-P02` 每条 `TC-###` 有 `covers`（REQ/IF），编号唯一；
    - `VV-P03` 每条判据可复现（数值/条件/样本）；
    - `VV-P04` L1–L4 四层都有行，或声明缺口 + 补验条件；
    - `VV-P05` 失败态/记录时间/边界外耐受有验证项（适用时）；
    - `VV-P06` 覆盖计数与行数一致，不超额声明。
  - 输出契约：`vv-plan.md`（表头带 `covers`、层级列）。
- **verifier 侧**（对应旧 SQA 的独立评审）：
  - 检查表（示例 id）：
    - `VV-V01` 覆盖矩阵是否一一对应、有无孤儿/悬空；
    - `VV-V02` 判据是否可被第三方照着重跑；
    - `VV-V03` 层级缺口是否声明；
    - `VV-V04` 域审计结论是否与架构稿一致；
    - `VV-V05` 超额声明/计数不符；
    - `VV-V06` blocker 是否给了最小修复建议。

> 检查表 id 只是研究草案；真正落包时要按质量环方法契约（`metadata.method/version/side` +
> check-id 表 + 输入/程序/检查表/输出四段）写成两份 `SKILL.md`。审计工具会核两侧
> `method/version` 配对与 check-id 全覆盖（[`quality-loop.mjs`](../../../tools/lib/quality-loop.mjs)）。

### 3.3 为什么不是一个大包

- 一个 `system-engineering` 包会把架构、V&V、域审计塞进同一份检查表；producer 一次要交四件产物，
  verifier 一次要核两套方法，裁决容易失焦。
- 两个包可以分别按动议需要发工：只做架构 → `system-architecture`；已有架构 → `vv-plan`。
- 代价：两次质量环 = 两次 activation + 两次裁决；但这是复杂度税，不是重复。

## 4. 安装与启动：没有默认方法包是当前的断点

- 方法层路径：`<DSH_HOME>/company/methods/quality-loop-producer/<pack>/SKILL.md` 与
  `.../quality-loop-verifier/<pack>/SKILL.md`（[`docs/guides/quality-loop.md:1-30`](../../../docs/guides/quality-loop.md)）。
- 当前没有默认包；任务书不点名 = fail-closed。SA/SQA 的方法在 git 里，不在运行时。
- 三种启动方案：

| 方案 | 做法 | 优点 | 代价 |
|---|---|---|---|
| A starter fallback | 包内 `content/methods/` 发 starter；preset 的 `customSkillDirs` 加这个 fallback root；人方法层优先 | 开箱可用；方法仍是独立文件、可覆盖 | 需要 skill 根优先级测试；方法随包升级 |
| B bootstrap copy | `bundle:init` 把 `content/methods/` 复制到 `<DSH_HOME>/company/methods/` | 保持“方法归人”的边界；可编辑 | 安装步骤多；升级/回滚要管 |
| C docs-only | 只发示例，用户手动装 | 最干净 | 开箱仍不可用；用户要自己找方法 |

**建议 A 或 B**；A 更适合“装好就能用”，B 更适合“方法必须是人拥有的”。无论哪种，方法包都要版本化，
任务书点名 `<pack>@<version>`，审计核配对。

## 5. 两个不能假装的地方

### 5.1 V&V 计划的作者身份

质量环的 producer 是通用能力档，不是 SQA。让 producer 写 `vv-plan.md`，再由 verifier 复核，
得到的是“同一侧写计划、另一侧审计划”的结构；它比“自己写自己验”好，但不是旧 SQA 的“独立作者”。
如果用户要“独立 V&V 作者”，需要：

- 一个薄 `system-qa`-like **producer** 能力档（有写手、方法槽），仍不把方法写进 persona；或
- 让 `quality_loop_produce` 的任务书明确“你是 V&V 作者，不是架构作者”，并在方法包里把作者边界写死。
  这仍是一个通用 producer 的身份切换，不是独立角色。

研究建议：**先做方法包，不急着加角色**；如果真实动议里 producer 写 V&V 出现“自己审自己”的锚定，
再加薄作者档。

### 5.2 SQA 否决直达 CEO

旧 SQA 的 blocker 可以原样进 `sqa-review.md`，CEO 在收口时看到；VP-Eng 不能删。质量环的裁决只到
VP-Eng；VP-Eng 可以把 blocker 写进 final 并升级 CEO，但这是**合同要求**，不是运行时强制。
如果保留否决权，需要：

- 在 `quality-loop` skill / VP-Eng persona 写「blocker 必须原样进 final/升级 CEO，不得以接受结案」；
- 审计工具已有 `blocker-accepted` 红（接受 blocker = 红），但“是否进 final”没有机械检查；
- 若要机械核，需在 final/meta 里加 blocker 引用，或让 auditor 读 final。

研究建议：**在 issue 里把它写成治理合同**，不要声称质量环自动继承 SQA veto。

## 6. 选项与建议

| 选项 | 做法 | 评价 |
|---|---|---|
| A 两个方法包 + starter | `system-architecture` + `vv-plan`，A/B 安装；不加角色 | **推荐**；结构复用、方法外置、可审计 |
| B 方法包 + 薄 V&V 作者档 | 再加一个 producer 能力档（方法槽） | 只在真实需要“独立作者”时做；维护面 +1 |
| C 恢复 SA/SQA persona | 把方法写回 preset | 不推荐；退役理由仍在 |
| D 只写文档、不装方法 | 保持可选层 | 能力仍空；README 承诺要降级 |

## 7. 未决问题

1. starter 方法包放包内 fallback，还是 `bundle:init` 复制？两者都要测 skill 根优先级。
2. `system-architecture` 与 `vv-plan` 是两个包还是一个包的两个方法？建议两个。
3. V&V 计划作者：先用通用 producer，还是加薄 `system-qa` 作者档？
4. blocker 升级：只写合同，还是加 final/meta 机械锚？
5. 纯软（`business-software`）是否需要 `requirements-trace` 方法包，还是质量环只用于硬软？
6. 方法包的语言/公司名中性：旧 skill 有「梦之队」吗？检查后要去公司化。

## 8. 证据与边界

- 旧 skill 内容：`git show bf04ab1c:packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md`
  与 `.../system-qa/skills/vv-playbook/SKILL.md`。
- 质量环契约/审计：`presets/_shared/skills/quality-loop/SKILL.md`、`tools/lib/quality-loop.mjs`、
  `docs/guides/quality-loop.md`、`tests/fixtures/methods/`。
- 本轮没有真模型 E2E；没有写方法包；没有改 preset。方法包是否真能被执行，需 issue 后跑一次
  keyless method fixture + 一次真模型质量环。
