---
status: 已修
severity: P1
opened: 2026-11-06
---

# BUG-034：无电池设备没有绝对时间源——签名事件记录的时间戳不可用于举证

> 严重级别：P1（重要）｜发现：2026-11-06｜状态：已修（2026-11-07）｜审查：agent — 逐条对照用户 2026-11-07 授权（「按流程落地」BUG-034/035）与卡内「已修判定」；范围外能力组织已转 issue 卡；证据 = 卡内红证 + E2E v8 + Note

## 症状

`2026-11-06-portable-overload-detection-v4` 的落地产物里，POD-1 被定义为「市电自取电、**无电池**、超级电容只做
掉电写尾」，记录侧却要求「≥10,000 事件 + 30 天 1 min 趋势」「CRC32 + 单调序号 + 每台记录签名（ECDSA P-256）」。
两份稿子里**没有任何绝对时间来源**：无 RTC、无电池保持、无 BLE/PC 对时协议，也没有讨论"上电后时钟从哪里来"。

后果：每次断电重启时间归零后，签名只能证明"这些记录出自这台设备且未被篡改"，**不能证明事件发生在某年某月某日**。
而事件记录的业务用途正是过载事故的时间举证——这项产物在关键属性上不成立。

## 根因（已确认，2026-11-07）

- preset 侧：`system-architect` 的硬软一体检查表只有「采样/通信/供电/环境/数据/告警/可维护」，**没有时间源与可信度**；
  `system-qa` 的常见洞只有不确定度/对偶/失败态/验收/超额声明，**没有时间可信与签名密钥生命周期**。通用词不会让模型想到
  "时钟从哪来"。
- 仪器侧：`probes/team/sa-sqa-quality-audit.mjs` 的 Q1–Q7 全是结构判据，没有任何"声明了可举证记录就必须写时间源"的判据；
  且它的 SQA 文档识别把 SA/VP-Eng 稿也算进去，任何 SQA 侧判据都会被别人的话假绿。
- 产物侧（复现）：v4 与 v5 的 `sa-architecture.md` 都有 `签名`/`事件记录`，全稿 0 次 `RTC/对时/时间同步/绝对时间`
  （`grep -nE "RTC|对时|时间同步|绝对时间"` 零命中）；v4 的 `sqa-vv.md` 只有 V-002（T 计时精度）与"时钟停振夹具"。

## 暴露的失败类

「属性没人测 = 属性不存在」——凡是被业务用途依赖、但没被写成需求或验证项的属性（时间可信、溯源、签名密钥
生命周期），SA/SQA 都不会主动补。**横切排查范围**：其余交付物里凡声明"记录可举证/可追溯"的地方，逐条查
时间源与密钥管理。

## 复现

```sh
cd company-workspace/.dsh-company/deliverables/2026-11-06-portable-overload-detection-v4/drafts
grep -nE "无电池|超级电容" sa-architecture.md          # → 有
grep -nE "RTC|对时|时间同步|绝对时间" sa-architecture.md  # → 无命中
grep -nE "时间戳|时钟|溯源" sqa-vv.md                   # → 只有 V-002（T 计时）与"时钟停振夹具"
node probes/team/sa-sqa-quality-audit.mjs              # → v4/v5 的 Q8/Q10 FAIL（2026-11-07 新增）
```

## 修复关联

- preset 侧：`system-architect` 的检查表加「记录与时间可信」（上电后时钟从哪来/断电重启怎么恢复/签名时间戳凭什么是
  "那时"的；无 RTC/电池就写对时协议 + 相对计时 + 允许误差）；`system-qa` 的常见洞加「时间可信与签名密钥」
  （绝对时间来源 + 时间恢复 + 密钥生命周期；计时精度 ≠ 日期可信）。两类验证点必须单列进 SA 的 `VP-###` 清单。
- **前置修复（2026-11-07 做 E2E 时发现）**：SA/SQA 两个 preset 只装了 `skill-filesystem`（目录/catalog）而没有
  `tool-skill`（`skill` 加载工具），persona 也没说"先加载 skill" ⇒ 技能正文永远读不到（run#3/run#4 会话日志 0 次
  `systems-architecture`/`vv-playbook`，工具面没有 `skill`）。补 `tool-skill` 行 + persona 点名"开工先加载"，
  keyless 断言覆盖全部 preset（声明 skill-filesystem ⇒ 必须声明 tool-skill；子人格 persona 必须点名 skill）。
- 仪器侧：`sa-sqa-quality-audit.mjs` 新增 Q8（记录可举证 ⇒ SA 必须写时间源）与 Q10（⇒ SQA 必须有时间/密钥验证项）；
  同时修掉 SQA 文档识别（只认 `sqa…`/`vv…`/`qa…` 家族）与 IF 粗体行识别——否则 Q10 会被 SA/VP-Eng 的话假绿。
- 业务侧（未在本卡强制）：任务书应写明时间戳用途与允许误差；本轮 E2E 已在探针任务书里加入「过载事件记录 + 事后举证」
  作为触发条件。

## 已修判定

- [x] `sa-sqa-quality-audit.mjs` 能对"声明了可举证记录"的产物机械判红：无时间源即 FAIL（Q8）。红证：v4/v5 均 FAIL
  （`node probes/team/sa-sqa-quality-audit.mjs`，2026-11-07）；合成绿 fixture（SA 写 RTC + 对时、SQA 有对应验证行）
  → Q8/Q10 PASS、exit 0。
- [x] 新跑一轮 E2E 的 SA 稿里出现明确时间源（RTC/对时协议/相对+绝对两层）且 SQA 有对应验证项。
  证据（2026-11-07，`2026-11-07-portable-overload-detection-v8`）：SA §2 / §4.3 双时基（电池域单调计数 +
  可校 RTC + CLOCK_SET 留痕）、M8 / IF-014 / IF-015；SQA `vv-plan` 的 VP-33、TC-F-07、TC-G-03/04 有对应
  验证项（RTC 漂移 / 后备维持 / 重启恢复 + TIME_RESTORED/TIME_UNTRUSTED）；`sa-sqa-quality-audit` 对 v8 的
  Q8/Q10 PASS；`sa-sqa-closeout-audit` 10/10 PASS。
- [x] 两个 preset 的技能改动带 keyless 断言 + 红证：`tests/presets/presets.spec.ts` 新增「记录可举证必须有时间源
  （BUG-034）」；删掉「记录与时间可信」⇒ 1 failed / 36 passed；还原 ⇒ 37 passed。

## 修复记录

- 2026-11-07：`调查中 → 修复就绪`（根因有证据、修法选定、已修判定写好）→ 同日落树 → `修复已落地`。
- 改动：`packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md`、
  `packages/company-pack/presets/system-qa/skills/vv-playbook/SKILL.md`、
  `packages/company-pack/presets/system-architect/agent.cordis.yml`、`packages/company-pack/presets/system-qa/agent.cordis.yml`
  （补 `tool-skill` + persona 先加载）、`probes/team/sa-sqa-quality-audit.mjs`、`probes/team/sa-sqa-delegation-probe.mjs`、
  `tests/presets/presets.spec.ts`。
- 范围外：SA/SQA 的学科域能力组织另立问题卡
  [2026-11-07-sa-sqa-capability-organization](../settled_issues/2026-11-07-sa-sqa-capability-organization.md)。
