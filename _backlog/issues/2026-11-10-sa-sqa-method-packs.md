---
status: 推敲中
opened: 2026-11-10
---

# 推敲：SA/SQA 方法包——系统架构 + V&V 的两侧方法与升级

> 立卡：2026-11-10 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否
>
> 上游研究：[SA/SQA 方法包](../research/org-coordination-topology/2026-11-10-sa-sqa-method-packs.md)；
> 组织拓扑 [README](../research/org-coordination-topology/README.md)。
> 前置：产品类型语义由[另一卡](2026-11-10-product-type-semantics.md)定；本卡只做“硬软一体的系统能力怎么回来”。
>
> **结论/去向**：待推敲（研究建议：两个方法包 `system-architecture` + `vv-plan`，starter 安装；
> 不恢复旧 SA/SQA persona；独立 V&V 作者档与 blocker 升级按需另定）。

**问题与期望结果：** SA/SQA 在 2026-11-09 退役后，VP-Eng 只剩质量环骨架：
`quality_loop_produce` / `quality_loop_verify` 两个 support 能力档 + 外部方法层，**没有默认方法包**；
verifier 只读、写不了 `vv-plan.md`，也拿不到旧 SQA 的“否决直达 CEO”。硬软一体默认公司的
SyRS/IRS/V&V 仍然没有默认可用的方法。期望结果：定清楚「方法包怎么切、怎么装、谁来写 V&V、
blocker 怎么升级」，让硬软动议能按需跑系统架构/V&V；不恢复旧 persona。推敲完成 = 包清单、方法契约、
安装路径、作者身份、升级合同、验收口径写清。

**当前情况：**

- 旧 SA/SQA 的方法仍在 git：`bf04ab1c` 的 `systems-architecture` 与 `vv-playbook`，用
  `git show bf04ab1c:packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md`
  与 `.../system-qa/skills/vv-playbook/SKILL.md` 取（不链历史 blob，避免当前树无文件）。
- 旧 SA = 架构作者（SyRS/IRS/architecture）；旧 SQA = V&V 计划作者 + 独立评审，否决直达 CEO
  （[退役 Note](../../notes/implemented/2026-11-09-retire-sa-sqa.md)）。
- 质量环：verifier `write:false` / `edit:false` / 无 bash
  （[`quality-loop-verifier/agent.cordis.yml:44-51`](../../packages/company-pack/presets/quality-loop-verifier/agent.cordis.yml)）；
  方法必须点名 `<pack>@<version>`，没有默认包
  （[`docs/guides/quality-loop.md:30`](../../docs/guides/quality-loop.md)）；
  只在 VP-Eng 有两条命名行（[`:14`](../../docs/guides/quality-loop.md)）。
- 方法层路径：`<DSH_HOME>/company/methods/quality-loop-producer/<pack>/SKILL.md` 与
  `.../quality-loop-verifier/<pack>/SKILL.md`；示例夹具在
  `tests/fixtures/methods/dsh-home/company/methods/{requirements-trace,api-contract}`。
- 审计核：两侧 method/version 配对、check-id 全覆盖、verifier 只读、先产后验、裁决原文
  （[`tools/lib/quality-loop.mjs`](../../tools/lib/quality-loop.mjs)）。
- `business-software`（用户 2026-11-10 已定名）不需要 SyRS/IRS/V&V（见产品类型卡）；本卡只服务
  `hardware-software`。

**未决问题：**

1. 两个包（`system-architecture` + `vv-plan`）还是一个包（`system-engineering`）？建议两个。
2. starter 放包内 fallback root，还是 `bundle:init` 复制到 `<DSH_HOME>/company/methods/`？
3. V&V 计划作者：先用通用 producer（同侧写、另一侧审），还是加一个薄 `system-qa`-like producer 档？
4. blocker 升级：只写合同（VP-Eng 必须原样进 final/升级 CEO），还是加 final/meta 机械锚？
5. 纯软 `business-software` 是否也要 `requirements-trace` 方法包，还是质量环只服务硬软？
6. 方法包去公司化：旧 skill 有没有公司名/编制/产品类型词？要清到可换公司。

**下一步：** 用户拍板 1–4；若做，先写两份 `SKILL.md`（producer/verifier 同 method/version）+
starter 安装 + keyless method fixture + 一次真模型质量环；不恢复旧 preset。依赖产品类型卡定
`hardware-software` 的 `需求层`/SyRS/IRS/V&V 边界。

## 范围与排除项

- **在范围内**：方法包切分、方法契约、starter 安装、V&V 作者身份、blocker 升级、审计/测试、
  去公司化。
- **排除**：恢复 `system-architect` / `system-qa` persona；产品类型语义（另卡）；动议级路由（另卡）；
  COO/CFO 通道（另卡）；质量环 host 机制重写（不改 vendor）。

## 已知与未决

- 已知：质量环能承载方法；审计能核配对/覆盖/只读/次序；旧方法内容完整、有 3 轮真模型 E2E 证据。
- 未知：producer 写 V&V 时会不会“自己审自己”的锚定；starter 方法根的加载优先级；verifier 只读
  对动态 V&V 的覆盖够不够（跑不了测试）；blocker 进 final 的机械可核性。

## 方案与取舍

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| **A 两个方法包 + starter** | `system-architecture` + `vv-plan`；包内 starter/`bundle:init` 安装；不加角色 | 结构复用；方法外置；可审计；开箱可用 | 要写/维护方法包；两次质量环 |
| B A + 薄 V&V 作者档 | 再加一个 producer 能力档 | 独立 V&V 作者更接近旧 SQA | 维护面 +1；身份/方法边界更复杂 |
| C 恢复 SA/SQA persona | 方法写回 preset | 行为最接近旧版 | 退役理由仍在；换公司要改包 |
| D 只写文档 | 保持可选、用户自装 | 零改动 | 能力仍空；README 承诺要降级 |

**建议 A**；只有真实动议反复出现“producer 写 V&V 不可接受”时才上 B。

## 关闭条件

- 选定包切分、安装路径、V&V 作者、blocker 升级；
- 若做，写出实施验收：两份 `SKILL.md` 同 method/version + check-id 表；starter 能被
  `quality_loop_produce/verify` 加载；`quality-loop-audit --self-test` 仍绿；一次硬软动议的
  真模型质量环（或明确的未跑边界）；
- 用户确认结论，卡顶补 `> **结论/去向**：...`，状态翻 `待落地` 或 `已结`。

## 抽象度

- 换公司要改吗？→ **方法会，框架不会**。方法包是公司/行业方法，换公司应替换；质量环/方法契约是机制。
- 换产品类型要改吗？→ **会**。硬软用系统方法，纯软可能用 `requirements-trace` 或不用；方法按类型选。
- 换做法要改吗？→ **不会**；方法包就是“做法”的载体，换做法只换包。
- 只有机制本身变才改吗？→ 不是；方法是内容，放方法层，不进 persona/preset。
- 第二消费者：VP-Eng 的硬软动议；未来 `project-services` 的 SOW/UAT 方法可复用同一质量环。
- 搬家成本：中（方法包 + starter + 测试）；先做 `system-architecture`/`vv-plan` 两个具体包，
  不预先造方法 DSL。
