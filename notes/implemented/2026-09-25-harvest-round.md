# 2026-09-25 · 收割轮：rc.2 能力收割（delta §④ 十五项逐条判定 + 选收落地）

状态：已交付（2026-09-25：台账 15/15 零待定 + 切片全落 + 六轮探针实测；实况见文末）

## 问题

升 pin（已交付）挂账的 **15 条可收割新能力**（清单 =
上游增量报告 §④〔该稿已按 research 层规则毕业删除，全文归 git〕，逐条带证据 SHA）一直停在"待续"——
没有逐条判定，有价值的能力躺在 vendor 里没进本仓实践；不判定它们也不会自己消失，反而会在下次
升 pin 时滚成两倍的对照面。

## 盘算（预判，实施时逐条核实修正）

**三类预归宿**（同 harness-alignment 台账的二分法，零"待定"）：

1. **已收（随升 pin 被动收割）**：#1 agentTeam 投影（client 迁移已完成——升 pin 的强制路径）；
   #10 job 完成唤醒 idle owner（基座默认行为）。
2. **收（值得进本仓实践，多为"验证 + 登记 + 小接线"）**：
   - **#5 inspect 双工具**：web bundle 已带 host 侧 providers（`cordis-inspect-providers` 行），
     但**角色 preset 需声明 `tool-cordis` 行**模型才能用 ⇒ 给五角色加行（正常 preset 内容工作，
     preset-smoke 验收）+ dev-loop §2 调试阶梯补"进程内查询"档（harness-alignment 台账 §D 已判定绑本轮）；
   - **#8 workspace-changes**（出厂自带）：实测一次（turn 级文件变更审阅卡）+ 在手册/交付物流叙述里登记；
   - **#9 office 预览**（出厂自带）：实测 xlsx/pdf 交付物预览一次 + 登记；
   - **#4 manifest 品牌化字段**（部分收）：pack package.json 加 title/description/icon/tags（先核字段名）
     ——插件作者入口的廉价补强；
   - **#11 Team 容量参数**：手册或 dev-loop 一行登记（哪里调 maxMembers/信箱背压）；
   - **#13 `--dump-config-schema`**：dev-loop §5 组合层工具登记一行（同 harness-alignment 判定）。
3. **不收（+理由，多进搁置池留触发）**：#2 RemoteStream 双工（无交互式面板需求）、#3 presetId
   （session/create 参数面只有 `agentPreset`——**delta 描述与 rc.2 实际不符**，判定时核实是否描述失准）、
   #6 subagent 上限 Web 设置页（改 patch 就能调，无频调需求）、#7 job/terminal 控制器（demo 运维线，
   demo 需求出现再收）、#12 remote-mock（测试链重构，现有 keyless 链够用）、#14 新工具族（demo 储备，
   无需求不预挂）、#15 OTLP（默认不挂载，无运营侧需求）。

## 方案

1. **判定台账**（阶段 1）：15 条逐条判（已收 / 收 / 不收 + 理由 + 证据），落
   `notes/archived/2026-09-25-harvest-ledger.md`——同 harness-alignment 台账形态，零"待定"。
2. **选收落地**（阶段 2，每片独立验收 + commit）：
   - 切片一：preset 加 `tool-cordis` 行（五角色）+ preset-smoke + 调试阶梯补档；
   - 切片二：workspace-changes / office 预览实测（排练场起会话各验一次，截图/日志留证）+ 手册登记；
   - 切片三：manifest 品牌化 + 容量参数 + `--dump-config-schema` 登记（文档面小修）。
3. **不收项**进搁置池或台账记理由（有触发条件的给触发条件）。

## 输掉的方案

- **15 条全部落地**：#2/#14 那类 demo 储备无需求先挂 = 为不存在的要求付维护面（D13/语料 07 同判）；输给逐条二分。
- **继续搁置整张清单**：下轮升 pin 对照面翻倍；输给"现在判完"。
- **跳过台账直接做**：没判定的"收"容易收错；输给"判定先行、零待定"。

## 验收

- 台账 15 行全覆盖、零"待定"；每条"收"有落地切片与该面最小真检查；每条"不收"有理由（进搁置池的带复活条件）。
- preset 改动完成定义 = `preset-smoke` ALL PASS；实测项各留一条真证据；`pnpm verify` + `pnpm test` 全绿。

## 风险

- delta §④ 的个别描述可能与 rc.2 实际不符（#3 已见嫌疑）——判定时以 vendor 现状为准，台账记修正；
- "实测"项都是真模型/真浏览器分钟级（合计 ≈ $1–2）；preset 加行属正常内容工作（非红线——同 驾驶舱③ 加
  ask-user 行先例），但若发现要动声明**模型**则停下报人。


## 实施实况（2026-09-25 交付）

**台账** = [research/harvest-ledger](../archived/2026-09-25-harvest-ledger.md)：15/15 零待定——
已收 2（#1 投影随升 pin／#10 基座默认）· 收 5（#5 #8 #9 #11 #13）· 不收 8（含 **delta 描述失准修正 ×2**：
#3 presetId 是内部 API 非消费面、#4 plugin-manager 无 title/icon/tags 字段）。

**切片落地**：
- 切片一：五角色 preset 加 `tool-cordis` 裸行（出厂 cordis preset 同款）+ peer
  `@deepseek-ai/dsh-tool-cordis ^0.1.7-rc.2`（preset-dep 门禁当场红证 → 补声明 → 绿）；
  **preset-smoke ALL PASS**；dev-loop §2 调试阶梯补「进程内查询」档（inspect 双工具 +
  `--dump-config-schema`，#5 #13）。
- 切片二：`scripts/harvest-probe.mjs` 六轮真模型探针（≈$3）——**#9 预览确凿**（CSV+PDF 侧栏预览双开，
  入口 = present 行「在侧边栏打开」）；**#8 host 侧确凿**（`workspace/changes` 事件落日志）+
  实测知识：**变更捕获需 git 仓**（无仓只抓 file-tool 编辑、bash 写入不可见——真公司盘在本仓内天然有 git ✓）；
  审阅卡 headless 定位未遂（vendor e2e 走自有 data-* 钩子），观察窗人工终验一步即收。手册登记两行。
- 切片三：profile.md 登记 Team 容量/信箱背压调参处（#11）。

**不收 8 项**：2 项描述失准修正记台账；6 项进搁置池（各带复活条件）。
**验证**：verify ALL PASS（dev-loop 预算 440→448，依据与说明在 verify 注释 + 台账）/ test 186 /
preset-smoke ALL PASS。
