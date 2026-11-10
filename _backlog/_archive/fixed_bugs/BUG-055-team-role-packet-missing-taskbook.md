---
status: 已修
severity: P2
opened: 2026-11-10
---

# BUG-055：team 角色包没有任务书路径，成员签名行指向不存在的 `drafts/ceo.md`

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：已修（2026-11-10：调查中 → 修复就绪 → 修复已落地 → 已修）
>
> 来源：第八轮 exploratory test（[问题卡](../settled_issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)）；
> 证据 = 团队探针输出
> `runtime/rehearsal-workspace/.dsh-company/deliverables/2026-11-10-probe-team-role-packet/drafts/coo.md`。
> 留痕：Note [2026-11-10-team-role-packet-taskbook](../../../notes/implemented/2026-11-10-team-role-packet-taskbook.md)。
> 修复 = 角色包补 `任务书` 字段 + CEO 先落任务书再 spawn + 署名行只抄真实路径（无文件时显式标注）。
> 审查：agent — 对照「已修判定」逐条核过；keyless 与真模型探针见「修复落地」。

## 症状

CEO 用 `spawn_teammate` 起 COO 成员，任务书按 `assembling-the-team` 的角色包给了
角色 / CHARTER / 角色 skill / KB / 产出 / 边界。成员正确读了 CHARTER 与两份 skill，产出了
`drafts/coo.md`；但稿首署名行写：

`出稿：coo（对应角色 COO）｜版本 v1｜任务书 = .dsh-company/deliverables/2026-11-10-probe-team-role-packet/drafts/ceo.md`

该 `drafts/ceo.md` **不存在**（CEO 只发了 spawn prompt，没有落任务书文件）。成员的产出可读，但
署名行的「任务书」指针指向空文件，操作员收口时无法按署名行核对任务书。

## 根因（确认，2026-11-10）

`assembling-the-team` 的角色包模板有角色 / CHARTER / 角色 skill / KB / 产出 / 边界，**没有
`任务书` 字段**；`generic/work-handoff.md` 的署名行合同却固定要求
`任务书 = .dsh-company/deliverables/<日期>-<slug>/drafts/ceo.md`。成员按合同写默认路径，CEO 没有
写对应文件，于是出现悬空指针。

这不是新机制错，是**角色包与署名合同的字段缺口**：角色包没有告诉成员任务书在哪，也没有要求 CEO
先落任务书；成员只能套默认路径。探针现场的输出也自曝了这个缺口：模型在路径后补了
「本会话任务书＝角色包，该文件尚未落盘」——它知道自己指错了，但没有可指的合法锚。

## 暴露的失败类

**产出 provenance 指针悬空**：署名行是交付物可回溯的锚；角色包/任务书没有把「任务书路径」作为
必填字段，成员就可能指向不存在的文件。横切：所有 team 角色包、`work-handoff` 署名行、`meta.md`
的「派活行」是否共享同一个任务书路径。

## 复现

```sh
node runtime/team-role-packet-exploratory-2026-11-10.mjs
# 读 outputs drafts/coo.md 的署名行；ls drafts/ceo.md → 不存在
```

## 修复关联（实际做法）

- `assembling-the-team`：角色包加 `任务书：.dsh-company/deliverables/<slug>/drafts/ceo.md`；
  同一 skill 的第 6 步加硬前置「先落任务书再 spawn」——任务书写明目标/约束/验收、在屋名单与通道、
  每个成员的角色包、派活行；盘上没有这份文件就不许 spawn。
- `generic/work-handoff.md`：署名行模板从写死路径改成 `<角色包给的任务书路径>`，并明确
  「路径只从任务书/角色包抄，不得按默认模板编造」；确实没有文件时写
  `任务书 = 角色包（无文件）`。
- `generic/collaboration.md`：team 角色包清单同步加「任务书路径」。
- `tests/presets/presets.spec.ts`：keyless 断言角色包含 `任务书` + `drafts/ceo.md`、spawn 前置句、
  署名行契约与 fallback。
- 新增 `probes/session-context/team-taskbook-probe.mjs`：真模型单成员场景，断言 `drafts/ceo.md`
  存在且 `drafts/coo.md` 署名行指向它。

## 修复落地（2026-11-10）

- 红：`pnpm exec vitest run tests/presets/presets.spec.ts` → 1 failed（新断言：
  「角色包必须带任务书路径字段」）。
- 绿：同一命令 → **43 passed**。
- 真模型：`node probes/session-context/team-taskbook-probe.mjs --wall 300` → **ALL PASS（294s）**；
  `drafts/ceo.md` 先落盘，`drafts/coo.md` 首行
  `出稿：COO｜版本 v1｜任务书 = .dsh-company/deliverables/2026-11-10-taskbook-probe/drafts/ceo.md`，
  指向真实文件。第一次跑（probe 自身 60s 早退）曾误报「成员稿没出」——把等待改成「CEO 收口后
  再给成员 180s」后复跑绿；这是 probe 的时序 bug，不是产品红。
- 同 diff 记录：见 [BUG-055 Note](../../../notes/implemented/2026-11-10-team-role-packet-taskbook.md)。

## 已修判定

- 新的 team 角色包任务书包含 `任务书` 路径，且该文件在成员出稿前存在；
- 成员 `drafts/coo.md` 的署名行指向真实文件（或显式写「无文件」而不是编造路径）；
- presets spec 对角色包 `任务书` 字段有 keyless 断言；team 探针复跑绿。
