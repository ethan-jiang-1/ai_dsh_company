---
status: 已修
severity: P1
opened: 2026-11-06
---

# BUG-035：串在回路里的装置只有 25 A/10 s 包络，未定义短路电流耐受

> 严重级别：P1（重要）｜发现：2026-11-06｜状态：已修（2026-11-07）｜审查：agent — 逐条对照用户 2026-11-07 授权（「按流程落地」BUG-034/035）与卡内「已修判定」；范围外能力组织已转 issue 卡；证据 = 卡内红证 + E2E v8 + Note

## 症状

POD-1 是**串在 16 A 插座回路里的通流装置**（铜排直通 + 0.5 mΩ 分流器）。SA 给出的电气包络只有
「25 A/10 s 不损坏」；SQA 的 `V-006` 也只验到 25 A/10 s 与 16 A 连续 4 h 温升。

但回路短路时，故障电流会流经本装置直到上游断路器分断（典型 5–10 倍额定、分断时间 0.1–10 s 量级，
视断路器曲线；工频短路可达数百安）。**没有任何一条需求或验证项覆盖「故障电流流经装置时不得起火/熔焊/炸裂」**。
SA 只把"短路保护功能"划归上游设备——那是**功能归属**，不等于**耐受责任**；装置本身仍是通流路径的一部分。

## 根因（已确认，2026-11-07）

- preset 侧：`system-architect` 的检查表没有"通流/承力路径的故障电流/故障载荷耐受必须单独定义"；
  `system-qa` 的常见洞没有"边界外但物理在路径内，是否有耐受判据"。SA 把短路整条放进「边界外」，
  SQA 又照架构稿的边界写判据，两侧一起漏。
- 仪器侧：`sa-sqa-quality-audit.mjs` 的 Q1–Q7 不检查故障电流耐受；且 SQA 侧文档识别错误（见 BUG-034 修复记录）。
- 产物侧（复现）：v4 SA 只有 `25 A/10 s` 与"短路保护归上游"，全稿无 `分断/故障电流/短路耐受` 的量化表述；
  SQA 的 `短路` 只出现在 NTC/分压故障注入里，没有故障电流耐受项。

## 暴露的失败类

边界外 ≠ 无责任：凡装置**物理上位于**某条故障路径中（通流、通压、承力），即使功能不在范围内，也必须定义
"承受而不失效/不造成次生灾害"的耐受指标。横切排查：其余产物里凡"上游负责 X"的表述，逐条问"X 发生时我
扛不扛得住"。

## 复现

```sh
cd company-workspace/.dsh-company/deliverables/2026-11-06-portable-overload-detection-v4/drafts
grep -nE "短路|耐受|熔焊" sa-architecture.md   # → 只有"边界外：短路保护归上游"
grep -nE "短路|耐受|熔焊" sqa-vv.md           # → 只在故障注入里出现，无故障电流耐受项
grep -n "25 A/10 s" sa-architecture.md sqa-vv.md
node probes/team/sa-sqa-quality-audit.mjs      # → v4 的 Q9/Q11 FAIL（2026-11-07 新增）
```

## 修复关联

- preset 侧：`system-architect` 的检查表加「故障路径的耐受」（物理位于故障路径 ⇒ 单独定义故障电流/故障载荷
  耐受包络 + 依据来源）；`system-qa` 的常见洞加「边界外 ≠ 无责任」（故障电流、分断时间、破坏性试验与样品量、
  失效形态）。两类验证点必须单列进 SA 的 `VP-###` 清单。
- **前置修复（2026-11-07 做 E2E 时发现）**：SA/SQA 两个 preset 缺 `tool-skill` 且 persona 未点名"先加载 skill"，
  技能正文读不到（详见 BUG-034 修复关联）；已补 `tool-skill` + persona 先加载 + 覆盖全部 preset 的 keyless 断言。
- 仪器侧：`sa-sqa-quality-audit.mjs` 新增 Q9（通流/承力路径 ⇒ SA 必须定义故障电流耐受）与 Q11（⇒ SQA 必须有
  对应验证项）。
- 业务侧（未在本卡强制）：需要断路器曲线或客户现场分断时间作为输入，否则只能给保守包络并标【待证】。

## 已修判定

- [x] 新增机械判据：产物若声明"串在通流回路"，必须出现"故障电流/短路耐受/分断时间"之一的量化表述，否则红（Q9）。
  红证：v4 FAIL（"装置在通流/承力路径上，但没有故障电流/耐受/分断表述"）；v5 PASS（`短路分断` + `≤200 A/10 ms
  由上游断路器分断`）——证明判据不是永假。
- [x] 新跑一轮 E2E 的 SA 稿给出耐受包络（含依据来源或标【待证】），SQA 有对应验证项（含样机破坏性试验与判据）。
  证据（2026-11-07，`2026-11-07-portable-overload-detection-v8`）：SA §7.3 故障路径耐受包络（3 kA rms / 10 ms、
  let-through I²t ≤1.5×10⁴ A²s、触点不熔焊/不起火、PE 连续，上游 MCB 曲线【待证·关键】）；SQA `vv-plan` 的
  VP-50 有对应验证项（短路电流耐受 + 破坏性试验 n≥3 + 失效形态不得起火/熔焊）；`sa-sqa-quality-audit` 对 v8 的
  Q9/Q11 PASS；`sa-sqa-closeout-audit` 10/10 PASS。
- [x] 两个 preset 的技能改动带 keyless 断言 + 红证：`tests/presets/presets.spec.ts` 新增「物理在故障路径就要有
  耐受判据（BUG-035）」；把「物理上位于」改弱 ⇒ 1 failed / 36 passed；还原 ⇒ 37 passed。

## 修复记录

- 2026-11-07：`调查中 → 修复就绪`（根因有证据、修法选定、已修判定写好）→ 同日落树 → `修复已落地`。
- 改动：`packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md`、
  `packages/company-pack/presets/system-qa/skills/vv-playbook/SKILL.md`、
  `packages/company-pack/presets/system-architect/agent.cordis.yml`、`packages/company-pack/presets/system-qa/agent.cordis.yml`
  （补 `tool-skill` + persona 先加载）、`probes/team/sa-sqa-quality-audit.mjs`、`probes/team/sa-sqa-delegation-probe.mjs`、
  `tests/presets/presets.spec.ts`。
- 范围外：SA/SQA 的学科域能力组织另立问题卡
  [2026-11-07-sa-sqa-capability-organization](../../issues/2026-11-07-sa-sqa-capability-organization.md)。
