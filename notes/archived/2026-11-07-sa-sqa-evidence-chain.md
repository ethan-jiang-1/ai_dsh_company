# 2026-11-07 · SA/SQA 证据链必查：时间源与故障路径耐受进入 skill 与机械判据

状态：implemented（2026-11-07；用户点名修复 BUG-034/035 后落地；E2E 验收见「验证」节）

## 决定

缺陷卡 [BUG-034](../../_backlog/_archive/fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md) 与
[BUG-035](../../_backlog/_archive/fixed_bugs/BUG-035-short-circuit-withstand-undefined.md) 的根因是同一个：
**属性没人测 = 属性不存在**。两侧 skill 的清单里没有这两项，审计也没有判据，于是两轮真实运行都漏。
本决定只补这两条**条件触发**的窄判据，不动 SA/SQA 的能力组织：

1. **SA skill**（`systems-architecture`）：硬软一体检查表加「记录与时间可信」「故障路径的耐受」两条；
   交接给 SQA 时，记录可举证与故障路径耐受两类验证点必须单列成 `VP-###`。
2. **SQA skill**（`vv-playbook`）：常见洞加「时间可信与签名密钥」「边界外 ≠ 无责任」两条——
   计时精度 ≠ 日期可信；保护功能归上游 ≠ 耐受责任归上游。
3. **前置修复：技能真的能读到**。做 E2E 时发现两个子人格只装了 `skill-filesystem`（目录/catalog），
   没有 `tool-skill`（`skill` 加载工具），persona 也没说"先加载"——run#3/run#4 的 SA/SQA 会话日志里
   `systems-architecture`/`vv-playbook` 各 0 次，工具面也没有 `skill`。补 `tool-skill` 行 + persona 点名
   「开工先加载 … skill」，并加一条覆盖全部 preset 的 keyless 不变量（声明 skill-filesystem ⇒ 必须声明 tool-skill）。
4. **SA/SQA 资产（已退役删除） 新增 Q8–Q11**：Q8/Q9 判 SA 侧（时间源 / 故障电流耐受），
   Q10/Q11 判 SQA 侧（对应验证项）。条件触发、不适用打 `SKIP`、不计失败；只判「在场」，不判数值正确。
5. **顺手修审计的两处读错文档**：IF 表格行允许 `**IF-001**` 粗体（v5 的 SA 正本是粗体，旧正则把它漏掉，
   反而把 `sqa-vv.md` 当 SA 正本）；SQA 只认 `sqa…`/`vv…`/`qa…` 家族（并把 SA 稿排除）。不修的话，
   Q10/Q11 会被 SA/VP-Eng 稿里的话假绿。
6. **E2E 场景补触发条件**：`sa-sqa-delegation-probe` 的任务书加硬需求「过载事件的记录与事后举证
   （谁在何时过载、记录能否被篡改）」——场景不含这个用途，Q8/Q10 只会 SKIP，证不了修复。

**范围外**：SA/SQA 的全方位能力组织（按场景取用软件/硬件/电气/机械清单）另立问题卡
[2026-11-07-sa-sqa-capability-organization](../../_backlog/_archive/settled_issues/2026-11-07-sa-sqa-capability-organization.md)；
它牵涉 VP-Eng 任务书，不在缺陷修复里扩围。

## 输掉的方案

- **只改 skill 文案，不加机械判据**：两张卡的判据都要求"机械判红"；文案会被后续润色改掉（本仓已有先例），
  也不能对历史运行复核。
- **只补 skill 内容、不查加载链**：E2E 实测证明 SA/SQA 从没读过自己的 skill（缺 `tool-skill`、persona 没点名），
  只改正文等于改一份没人打开的文件。
- **只加机械判据，不改 skill**：审计不在生产回路里；模型拿不到指令，下一轮仍然靠临场发挥。
- **把两条判据放进 `sa-sqa-domain-audit.mjs`（业务域审计）**：那张仪器管产品同一性/算术/标准对应，
  不是"必备属性"；卡片点名 quality audit，且质量审计的定位（结构上有没有偷工）正好覆盖"该定义的没定义"。
- **SQA 侧不判，只判 SA**：失败类是"E 和 V 一起漏"；只判 SA 会把 SQA 的缺项留成下一次事故。
- **用宽词表（任何"短路"都算耐受）**：v4 SQA 里 NTC 短路、分压对地短路会被假绿；必须限定
  `短路电流/分断/耐受/故障电流/破坏性试验`。
- **本轮顺手做学科域路由**：会改两个 skill 的结构、VP-Eng 任务书和 SQA 的域审计判据，超出缺陷通道；
  改立 issue 卡（用户 2026-11-07 指示可提 issue）。

## 后果 / 边界

- Q8–Q11 是词表判据：识别"声明了该用途"的产物；隐含记录、隐含通流的产品可能 SKIP。
- 历史运行保持原样：v4 Q8/Q9/Q10/Q11 红、v5 Q8/Q10/Q11 红——这是历史证据，不回填产物。
- 仪器修好后暴露一个既有缺口：v2 的 Q7（SQA 与 SA 联动）从旧口径的假绿变红（`vv-plan.md`/`sqa-verdict.md`
  确实没有引用 IF 号，也没有 fail-closed 声明）。不在本卡修，记录在此。
- 旧 Note [SA/SQA 子人格](2026-11-06-sa-sqa-subpersonas.md) 的"7 条判据"事实已改为 Q1–Q11 并回链本 Note。

## 验证（真跑）

- `pnpm test tests/presets`：**38 passed**；红证四条（都是"本用例 FAIL、其余通过"，还原后全绿）：
  - 删「记录与时间可信」⇒ FAIL（`expected … to match /记录与时间可信/`；当时套件 1 failed / 36 passed）；
  - 把「物理上位于」改弱 ⇒ FAIL（`expected … to match /物理上位于[\s\S]{0,20}故障路径/`；当时 1 failed / 36 passed）；
  - 删 SA preset 的 `tool-skill` ⇒ FAIL（`expected … to contain 'dsh-tool-skill'`；当时 1 failed / 37 passed）；
  - 把 persona 的「先加载 `systems-architecture` skill」改弱 ⇒ FAIL（当时 1 failed / 37 passed）。
- SA/SQA 资产（已退役删除）（真实历史产物）：**exit 1**，v4 的 Q8/Q9/Q10/Q11 全红
  （Q8「声明了事件记录/签名/举证，但全稿没有时间源」；Q9「装置在通流/承力路径上，但没有故障电流/耐受/分断表述」），
  v5 的 Q8/Q10/Q11 红、Q9 绿（`短路分断` + `≤200 A/10 ms 由上游断路器分断`）——证明 Q9 不是永假。
- 合成绿 fixture（临时目录，已删）：SA 写 RTC + 对时 + 短路电流耐受、SQA 写对应验证行 ⇒ Q1–Q11 全 PASS、exit 0。
- **单轮验收**：SA/SQA 资产（已退役删除）
  ⇒ **Q1–Q11 全 PASS、exit 0**（`--run` 是本次新加的单轮过滤；不过滤时历史红会让整体 exit 1）。
- `pnpm verify`：本变更相关门禁全绿（md-links / link-debt / guard-red-record / backlog-liveness / presets 等）；
  当时仍有 **2 条 `bare-path` 红**，来自并发会话新增的 `_backlog/_archive/research/requirements-identification-numbering/2026-11-07-landing-plan.md`
  （指向尚未创建的测试文件），不属于本变更，未改。`pnpm test`：**1166 passed**；`pnpm typecheck`：通过；
  `node checks/smoke/preset-smoke.mjs`：**ALL PASS**（刷新 company profile 的 tarball 后，9 个 preset 全挂载）。
- `pnpm lint`：**红**，但命中 `tests/company/roster-backfill.spec.ts` 的 `unicorn(prefer-string-starts-ends-with)`
  （未改动文件，既有问题）；本 diff 未新增 lint 告警。
- E2E（真模型，`sa-sqa-delegation-probe --wall 1800`）：见「E2E 运行」节。

## E2E 运行

- 运行：`2026-11-07-portable-overload-detection-v8`（`sa-sqa-delegation-probe --wall 1800`，**1423s，ALL PASS，exit 0**）。
  lead `session-70db30ac…` → VP-Eng `f73ab4fb…`（depth 1）→ SA `1c7dfefd…` / SQA `c34bc1c6…`（各 depth 2，
  同一 parent）；`sa-sqa-closeout-audit` **10/10 PASS**（run#5 条目已加入该常驻审计）。
- **skill 真被加载**：SA 会话有 `skill` 工具调用，日志出现 skill 正文「记录与时间可信」；SQA 日志 5 次
  `vv-playbook`。对照：run#3/run#4 的 SA/SQA 会话日志 0 次 skill 名——这就是前置修复要解决的问题。
- 产物判据：SA/SQA 资产（已退役删除） 对 v8 **Q1–Q11 全 PASS**（Q8/Q10 时间源、Q9/Q11
  故障耐受）；同一命令下 v4 仍 Q8–Q11 红、v5 仍 Q8/Q10/Q11 红——历史运行不回填，作为缺口证据保留。
- SA 稿（`drafts/eng/system-architecture.md`）：§2 双时基（电池域单调计数 + 可校 RTC + CLOCK_SET 留痕）、
  §4.3 时钟回拨协议、M8 / IF-014 / IF-015；§7.3 故障路径耐受包络（3 kA rms / 10 ms、
  let-through I²t ≤1.5×10⁴ A²s、触点不熔焊/不起火，MCB 曲线【待证·关键】）。
- SQA 稿（`drafts/eng/vv-plan.md` / `sqa-verdict.md`）：VP-33 时间可信（RTC 漂移/后备维持/重启恢复 +
  TIME_RESTORED / TIME_UNTRUSTED）、VP-50 故障路径耐受（短路电流耐受 + 破坏性试验 n≥3 + 失效形态）、
  TC-F-07 / TC-G-03/04；结论 = **不通过**（7 条规范自洽缺陷），否决原文进 `final.md`（原文照录）。
- 布局：本轮 drafts 用子目录 `drafts/eng/`（CEO 任务书指定），三个审计已改为**递归**扫 `drafts/`——
  只扫一层会把整轮误判成"没有 SQA 稿"。

## 指针

- 卡：[BUG-034](../../_backlog/_archive/fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md)、
  [BUG-035](../../_backlog/_archive/fixed_bugs/BUG-035-short-circuit-withstand-undefined.md)
- 能力组织问题（范围外）：[2026-11-07-sa-sqa-capability-organization](../../_backlog/_archive/settled_issues/2026-11-07-sa-sqa-capability-organization.md)
- 仪器：SA/SQA 资产（已退役删除）（Q8–Q11）、SA/SQA 资产（已退役删除）（场景）
- 守卫：`tests/presets/presets.spec.ts`（两个 BUG 各一条用例）
- 被更新的旧 Note：[SA/SQA 子人格](2026-11-06-sa-sqa-subpersonas.md)
