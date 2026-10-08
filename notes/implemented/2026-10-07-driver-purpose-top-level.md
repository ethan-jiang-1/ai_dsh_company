# 驾驭者四用途顶层化：run / checks / probes / tools 取代形态名目录

状态：已交付（2026-10-07，S1–S5 五切片全收口；批准：用户 2026-10-07 对话呈批通过，
方案含目标树与五切片，实施次序 S1→S5 由用户给定；每片独立 commit，收口 = 436436f）
> 姊妹篇 = [2026-10-05 职责分区](2026-10-05-repository-responsibility-layout.md)（scripts 内部分区与
> 快照分桶的先例，本轮把同一分类学**升到顶层**，不是重开诉讼）。

## 问题

驾驭者 2026-10-07 提出五条感受：①运行态/测试/调试/交互应各有其目录，拒绝过大混合子目录；②运行入口与逻辑串联看不清；③测试资产组织要可读；④agent loop、skills、运行态、run bundle 要显性化；⑤鼓励调整目录结构。

探索诊断（同日）：内容大半已存在（tests/ 四区、scripts 内部分区、[orient 五问](../../docs/orient.md)、
[改动面→最窄检查](../../tests/README.md)），病在**顶层按形态命名不按用途命名**：

- `scripts/` 是形态词（"脚本"），smoke/probes/audit/tools 挤在其下，顶层读不出"验证/调试/工具"；
  smoke 与 probe 的分层边界（如 presence-e2e-smoke vs multi-user-e2e-probe）只能靠 [脚本索引](../../checks/README.md) 解释。
- `dev/` 名实不符：装的是运行面（env.sh + overlay），名字叫 dev；运行面知识散在
  [demo](../../docs/demo.md)、[dev-loop §6](../../docs/guides/dev-loop.md)、runtime/README 三处。
- [probes/](../../probes/) 26 文件混四种机制域（团队/文件任务板/浏览器视觉/会话上下文）——上轮整理自造的新混合目录。
- run bundle 有工具（`pnpm orient --scenario`）没有默认可见面：默认全景不显示"一次运行 = 哪四件套"。
- 驾驭者唯一可用把手因此退化为端到端（其原话："最差劲的做法"）——分层已建，但对驾驭者不可见不可操作。

## 方案

四用途升顶层；`scripts/` 与 `dev/` 两个形态名消失；顶层每目录回答一个用途：

```
packages/        代码（不动）
run/             运行面：env.sh、company.overlay.yml、entry-probe.patch.yml、README（四件套导航）
checks/          验证面：checks/smoke/（真实入口冒烟）+ checks/audit/（盘面日志判据）+ 根 run-gates.mjs
probes/          调试面：按机制域四子目录（见 S3）
tools/           工具面：维护工具 + lib/ + drivers/ + archive/ 归其下
tests/           keyless 回归（不动）；snapshots/ 证据（不动）；runtime/ 残留（不动）
docs/ notes/ _backlog/ company-workspace/ vendor/（不动）
```

交互面 = web 观察窗：本体在代码与合同文档（demo/multi-human/cdp-probe），不挪——目录回答"资产在哪"，交互是行为不是资产。

五切片（全部已交付；每片独立 commit，`pnpm verify` + `pnpm test` 全绿过片）：

- **S1 dev→run**（40ab1b1）：目录改名 + 全部活跃引用更新（~105 处；快照冻结收据不改写）+ run-gates TOP_DIRS
  换判据 + run/README 增"一次运行四件套"导航节（只导航到 [运行态地图](../../docs/runtime-map.md)，不复制）。
- **S2 scripts 升格**（824e578）：smoke→checks/smoke、audit→checks/audit、run-gates.mjs 留 checks/ 根；
  tools/lib/drivers/archive→tools/；package.json 三命令路径；~350 处活跃引用 + 导航链接机械更新；
  门禁（TOP_DIRS、脚本自述递归清单、keyless-imports、layering、repository-layout、entry-probe 允许面）同 diff 改判据当网。
- **S3 probes 分域**（138f3ad）：team/(9)、fs-taskboard/(7)、browser-visual/(4)、session-context/(6)；48 处引用同步。
- **S4 驾驭者面板**（38d7410）：`pnpm orient` 默认输出新增「run bundle 四件套」节（代码与组合/运行状态/会话 cwd/证据）；
  [orient.md](../../docs/orient.md) 五问同步指向。
- **S5 导航收口**（436436f）：根 [AGENTS.md](../../AGENTS.md) 布局节、[项目地图](../../docs/project-map.md)、
  [检查索引](../../checks/README.md) 叙述同步。

## 输掉的方案

- **只加面板不动目录**：病根（形态名顶层）保留，驾驭者仍需文档链拼装全貌——用户明确拒绝。
- **顶层平铺 smoke/ 与 audit/ 不加 checks 壳**：少一层，但 "smoke" 对新进 agent 不自解释"验证面"；
  checks/ 壳让验证面的两半（入口冒烟/盘面判据）共享一个用途名。
- **probes 只加 README 不分子目录**：混合目录保留，正是用户点名的病。
- **把 run bundle 落盘成文件**：违反"引用不复制、防第二权威"——运行单元按需现算（orient --scenario），
  显性化 = 默认可见，不是物化快照。
- **改写快照冻结收据里的旧路径**：篡改记录；旧路径经 snapshot-path 与观察档豁免消化。

## 验证记录（真跑过的命令与红/绿形态）

- **S1**：红 = 先改 tests/harness 的 runtime-layout/orient/presets/foundation-links 期望树 → `pnpm test` 5 失败
  （全部指向 run/ 不存在）；绿 = `git mv dev run` + 引用更新后 `pnpm test` 36 文件 355 项全绿 +
  `pnpm verify` ALL PASS；`git grep -nE "dev/(env|company\.overlay|entry-probe|README|try-x)"`（排除冻结层）零命中；
  `bash -n run/env.sh` OK。
- **S2**：红 = repository-layout fixture + runtime-layout 排练 seam 期望新树 → 4 失败；绿 = 移动后
  `pnpm verify` ALL PASS（script-triggers ×43 / script-status ×52 递归发现新树零遗漏）+ `pnpm test` 355 项全绿 +
  `git grep -nE "scripts/(smoke|probes|audit|tools|lib|drivers)"`（排除冻结层）零活跃命中 +
  真实入口抽查 `source run/env.sh && node checks/smoke/client-load-smoke.mjs` → ALL PASS
  （真浏览器：插件挂载零失败 / console 零 loader 错误 / 品牌槽在场）。
- **S3**：`pnpm verify` ALL PASS（md-links/bare-path 查分域引用同步）+ `pnpm test` 355 项全绿。
  真实入口抽查**阻断**：分域探针均认证档（真模型 / 观察窗），本会话无 `DEEPSEEK_API_KEY`——不写绿。
- **S4**：红 = orient.spec ok 态期望含「run bundle 四件套」先红（1 失败）；绿 = 实现后 `pnpm orient`
  实跑输出四件套节（证据行 = snapshots/ 共 35 场景）+ `pnpm test` 355 项全绿 + `pnpm verify` ALL PASS。
- **S5**：`pnpm verify` ALL PASS + `pnpm test` 355 项全绿。entry-probe 真模型档**阻断**（同 S3 无 key）；
  其路径允许面已随 S2 扩为 checks|probes|tools。
- **收口**：最终 `pnpm verify` ALL PASS；`pnpm test` 36 文件 355 项全绿（3.85s）。冻结收据
  （notes 历史、snapshots、_backlog/_done、runtime/cold-storage JSONL）中的旧路径一律未改写。

## 延伸（2026-10-08）

驾驶座视图后续演进 = [driver-receipt-round](2026-10-08-driver-receipt-round.md)（orient 第七问「四脚踩刹车」+
轮次回执进 dev-loop §12；本页 S5 单页导航结构的延续，互链不合并）。
