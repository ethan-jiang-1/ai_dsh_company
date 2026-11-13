---
status: 已结
opened: 2026-11-10
---

# 落地：问题与缺陷的留痕决定点——材料性共用判据 + 缺陷轨留痕裁决

> 立卡：2026-11-10 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [Note](../../../notes/implemented/2026-11-10-materiality-and-trace-decision.md)（交付同变更）
>
> 审查：agent — 语义审（授权原文 + 该面合同 + 证据选层 + Note 四输入，七条验收逐条对照）；用户 — 跳过（本轮用户点名直接落地，制度面改动，未逐条人审）
>
> 证据与研究：[issue-bug-traceability](../research/issue-bug-traceability/README.md)（事实盘点 + 判断取舍）。

**问题与期望结果：** 重要 issue 与缺陷的留痕不稳定：材料性修复可以不留 Note；`去向=note` 可以指向卡自己；fresh agent 在「手上有个 bug」时看不到分诊规则。期望结果 = **材料性工作一定有一次留痕裁决，非材料性工作由 commit 承载；落点可机械验证；两条轨用同一份「材料性」清单。**

**当前情况：**

- 53 张已修缺陷卡中 20 张卡上链到 `notes/`；96 张已结问题卡中 13 张 `去向=note`，其中 2 张落点指向卡自己；归档索引另有 6 行同样（明细见研究盘点 §2）。
- 章程第 9 行、缺陷规则第 3 行说「当场修掉的不建卡」；收尾 skill 第 30 行、`budget-and-ops` 第 53 行说「抓到异常 → BUG 卡」。同一件事两套动作。
- `pnpm verify` 在上述 self-link 存在时仍 ALL PASS——`backlog-liveness` 只查去向词，不查落点解析。
- 缺陷轨关门只查 `## 已修判定` + `审查：`，没有与问题轨 `去向` 对称的留痕决定。

**方案：**

1. **材料性定义（一处）**：在章程「缺陷的通道」写入定义——`材料性 = P0，或修复/结论触碰章程、常设指令、docs 合同、company-pack 公开行为、已记录决定`；其余三处只引用，不复制清单。
2. **两条轨的留痕规则**：缺陷轨——材料性修复在翻 `等人拍板` 的授权请示里同时给出留痕建议（`note` / `commit` / `none — 理由`）；非材料性修复不建卡，commit message 写根因与影响面。问题轨——`去向=implementation` 只用于非材料性结论；材料性结论用 `note`，或 `implementation` + 指向承载决定的 Note 链接（伞卡模式），不得只写 commit；`none` 要写理由。
3. **消解文本矛盾**：章程第 9 行、缺陷规则第 3 行加「且非材料性」限定；收尾 skill 第 30 行与 `budget-and-ops` 第 53 行加「材料性」限定。
4. **落点修复 + 留痕块**：2 张卡 + 6 行归档索引改指 `notes/` 下真实文件；缺陷卡模板与归档块增加 `留痕：Note <路径>｜commit <sha>｜none — 理由` 一行。
5. **落点解析门**：`backlog-liveness` 对归档问题卡（生效日之后）检查 `去向=note` 的 Markdown 链接必须解析到 `notes/` 下真实文件；旧卡祖父豁免。
6. **习惯与入口**：缺陷规则写「同一轮 ≥3 张卡先按根因分组」；`_backlog/AGENTS.md` 加一行分诊路由；收尾 skill 第 30 行同时承担入口钩子。

**范围与排除：**

- 不做「每 bug 一卡」，不建新目录 / 新状态，不做语义门禁，不改 `vendor/dsh/`。
- 已归档卡只修链接，不改正文与结论。
- 根 `AGENTS.md` 的净零改写不在本轮；若 close-out skill 钩子经证据证明不够，再另开卡。

## 验收标准

1. **一处定义**：`材料性` 只在 `_backlog/README.md` 定义一次；`_backlog/bugs/README.md`、收尾 skill、`docs/guides/budget-and-ops.md` 只引用或加限定语，不复制五项清单（grep 原话可证）。
2. **矛盾消解**：四处「当场修 / 抓到异常」文本一致——`grep -n '当场修掉的不建卡' _backlog` 只出现在带「非材料性」限定的句子；收尾 skill 与 `budget-and-ops` 的「抓到异常」句带「材料性」限定；章程去向表处 `implementation` 一句带「非材料性 / 带 Note 链接」限定。
3. **落点修复**：2 张卡（vpeng / user-facing）与 6 行归档索引的 `note` 落点指向 `notes/` 下真实文件；`pnpm verify` ALL PASS。
4. **门禁反证**：植入一张 `zz-probe` 归档卡（并在归档索引加行，保证只触发落点检查），`去向：note — [Note](./同目录同名.md)` → `FAIL backlog-liveness` 原话；删除卡与索引行 → ALL PASS；红绿原话记入 Note。
5. **留痕块**：缺陷卡模板与归档块出现 `留痕：` 行；用一张 `zz-probe` 卡演示形状（不追改历史卡）。
6. **回归**：`pnpm test` 全绿；若改 `backlog-liveness`，`tests/tools/backlog-liveness.spec.ts` 覆盖新检查（含负例）。
7. **语义审**：拿最近一轮的一张材料性修复（如 BUG-053）做反事实走查，确认新规则会在当时问出留痕问题；结论写进交付 Note。

## 关闭条件

上述七条全部通过、`审查：` 记录在场，且交付 Note 落 `notes/implemented/`。卡在交付同变更归档。
