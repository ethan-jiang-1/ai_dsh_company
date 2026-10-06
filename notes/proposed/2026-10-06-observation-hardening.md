# 2026-10-06 · 观测硬化包：seam 集中化 + orient preset 字段 + 白话层扩展

状态：proposed（批准：2026-10-06 用户令「建议的下一步都想弄」+ 追加确认「三条全要」（白话层扩展入包）+ 次序 A→B→C + ongoing goal 推进；实施逐条进入，D32）

## 问题

前包（[driver-surface-package](../implemented/2026-10-06-driver-surface-package.md)）review 收口登记的三笔债：

1. **探针 seam 债**：24 个消费脚本（smoke 4 + probes 20）各自硬编码 `runtime/rehearsal-workspace` 字面量；seam（`scripts/lib/rehearsal.mjs` 的 REHEARSAL_REL）已存在但只有 2 个消费者。10-05 职责分区轮的教训「发现和根路径集中在共享模块，逐个改硬编码无法防止新增分区再次漏扫」在 scripts 侧只完成了一半——下次排练盘再搬家（或改语义）就是一轮全量 grep。
2. **orient 会话清单缺 preset 字段**：RFC 方案文本承诺「slug/时间/preset」，交付为 slug/时间/会话数——preset 在多帧 zstd 会话日志内，当时以 keyless 秒级面为由未实现（已登记边界）。现在有明确路子：dev-loop §3.7 教义 = `zstd -d -c` 读全量（Node 内置只解第一帧）。
3. **白话层口径缺口**（待定项）：条目 E 的白话首屏只覆盖合同层八份；design/guides 层开篇仍是索引行或合同措辞（如 architecture.md 首行 = 「总入口与决策台账：index.md」）。

## 方案（三条目）

### 条目 A：探针 seam 集中化

- 24 个消费脚本（smoke 4 + probes 20）统一改为 `import { REHEARSAL_REL } from '../lib/rehearsal.mjs'`（按各自深度调相对路径），路径常量 = `join(ROOT, REHEARSAL_REL)`。
- **不动**：`scripts/run-gates.mjs` 的 RUNTIME_PREFIXES（前缀清单，非路径常量）、`scripts/archive/*` 两处（已耗仪器，移动不恢复资格的冻结原则）、lib/rehearsal.mjs 自身。
- 机械守卫：tests/harness/runtime-layout.spec.ts 新增断言——scripts/smoke 与 scripts/probes 的 .mjs 代码行（非注释行）不含 `runtime/rehearsal-workspace` 字面量；反证 = 临时加回一处硬编码见红。
- 改动补偿：`node --check` + 相对 import 目标检查全过（同前包 A 条目补偿口径）；实跑触发条件仍在各脚本头注，不整批实跑。

### 条目 B：orient 补 preset 字段

- **lib 侧（纯）**：新增 `parseSessionPreset(text)` 纯函数——从会话日志明文头部解析 agentPreset；`orientState` 接受注入的 `sessionPresets`（与 gitStatus 同款注入模式，lib 不碰 child_process，keyless 图守卫不破）。
- **CLI 侧（真实进程效果住这里）**：tools/orient.mjs 对最近 slug 的最新会话执行 `zstd -d -c`（dev-loop §3.7 教义）取头部明文 → 调 lib 解析 → 注入；zstd 二进制缺失/解码失败 → 该字段如实显示「不可用」，不伪造。
- 渲染：会话行变 `slug · N 会话 · 最新 <时间> · preset <值或（不可用）>`。
- 复跑成本：每 slug 只解最新一个会话文件的头部（前 64KB 截断），限最近 5 slug。

### 条目 C（待定项）：白话层扩展到 design/guides 层

- design 4 篇 + guides 3 篇首屏补一行「什么时候读 + 路线」（与条目 E 八份合同同款格式，≤2 行）；architecture.md 首行索引行保留、白话行补在其后。
- dev-loop.md 顶预算 374/395 有余量；design 侧无预算文件。合同语义零变更。

## 非目标

- run-gates 前缀清单与 archive 已耗仪器不动；不做完整 YAML 解析；不动 notes/_backlog 制度；不整批实跑真实入口（触发条件归脚本头注）。

## 输掉的方案（留尸）

- **把 run-gates 的 RUNTIME_PREFIXES 也 seam 化**：它是「前缀类清单」不是「路径常量」，为对齐而耦合 gate 文件到 lib，收益不抵耦合。
- **archive 两处一并转换**：已耗仪器「移动不恢复资格」的冻结原则——改它们就是给死代码续命。
- **lib 内直接解 zstd（node:zlib）**：Node 内置 zstdDecompressSync 只解第一帧（dev-loop §3.7 R1 实证），多帧会话日志解不全；且解码器进 lib 会把「观测呈现」变成「日志解析实现」，keyless 图守卫面扩大。
- **orient 每会话全量解码**：只为一个 preset 字段解整份日志，观测命令失去秒级性格；截头部即可。
- **白话层一次铺满全部 docs**：design 之下还有子文档，全铺是漂移面失控；先到 design/guides 层顶。

## 验收（先行点名怎么测；每条目独立红绿）

- **A**：①新 spec 断言先红（现状 20+ 硬编码 → 多处违规报红）；②转换后同 spec 绿 + `node --check`/import 目标全过；③verify + vitest 全绿；④反证 = 临时在任一 probe 加回硬编码 → spec 红 → 还原绿。
- **B**：①先写 parseSessionPreset + 注入字段的 spec（fixture 明文头）实跑见红；②实现后同 spec 绿；③走查——真实会话（runtime/harness-home/sessions）解出 preset 且与创建时一致；zstd 缺失路径（PATH 无 zstd 模拟）显示「不可用」不误报；④keyless 图守卫（layering）仍绿——lib 未引入 child_process。
- **C**（若入包）：①走查——design/guides 每篇首屏一句话可懂何时读；②md-links 绿；③行预算不升（dev-loop ≤395）。

每条目同 diff 更新毕业 Note（并入 driver-surface-package 后续轮或独立 Note，按实施时事实定）；实施次序由用户给，建议默认 A → B → C（先清债，再加字段，最后铺文档）。
