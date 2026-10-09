# BUG-006：CEO 产出 meta.md 词表外值（类型/结果两字段越表）

> 严重级别：P2（次要——审计面误报源，不阻断交付）｜发现：2026-10-07｜状态：活跃 — 已修复 2026-10-07：根因修正 = 词表模板早就在 `company-workspace/templates/meta.md`（初判"生成侧无词表"被证伪），真缺口 = 录制临时工作区只镜像 AGENTS.md、角色看不到 templates/ ⇒ 修法 = `mirrorCompanyReference`（scripts/lib/rehearsal.mjs）统一录制/排练镜像语义，replay-smoke 录制分支接线（AGENTS 实拷贝——oracle 拒符号链接）；红绿收据 = foundation-safety.spec 新用例（红：函数不存在 → 绿：镜像断言含 templates/meta.md）+ vitest 355 项；真录制侧确认触发条件 = 下次 --record（出生场 r7 README 已记）；证据 Note = notes/implemented/2026-10-06-r7-motion-final.md

## 症状

r7 动议（2026-10-07-recon-pack，真模型完整终局）归档快照上跑
`deliverables-check --only recon-pack` 报 1 条违规 `meta-shape-bad`：

- 类型「立项评估」∉ 词表 `["决策","生产","诊断","口径问答"]`
- 结果「通过（有条件）」∉ 词表 `["进行中","已采纳","已否决","已搁置","已废弃","判不了","已完成"]`

CEO 实际语义清楚（类型 = 决策/生产的混合立项评估；结果 = 条件放行 = 「已采纳」的限定版），
但字面越表 ⇒ 每场这样的动议都会让审计带一条永久违规。

## 根因（假设）

~~meta.md 词表只活在审计器一侧，生成侧没有词表~~ **初判被证伪**：`company-workspace/templates/meta.md`
早就钉了两张词表（2026-10-07 修复时核）。真根因 = **录制临时工作区只镜像 AGENTS.md 一个文件**
（replay-smoke driveScenario 非 oracle 分支），角色看不到 templates/ 与 kb 事实家 ⇒ 无模板可抄、
凭 AGENTS.md 记忆写 meta ⇒ 自由文本越表。r6 同形状（其 snapshot.yml 同样记录"盘上无 templates/"）。

## 暴露的失败类

「词表只长在检查器一侧」类失败——检查器枚举 vs 生成侧提示的合同缺口。横切排查面：
所有 validate* 类检查（meta 形状 / 交付物三态 / journal 形状）的枚举是否在其**生成侧模板**
里有同源镜像（一处事实一个家的生成侧落点 = templates/ 或 preset skills）。

## 复现

```sh
node scripts/audit/deliverables-check.mjs \
  --workspace snapshots/replay/r7-motion-final/workspace.expected \
  --sessions snapshots/replay/r7-motion-final --only recon-pack
# ⇒ 违规 1 条：meta-shape-bad deliverables/2026-10-07-recon-pack/meta.md
```

## 修复关联

已落地（2026-10-07）：`mirrorCompanyReference`（scripts/lib/rehearsal.mjs，参考镜像纯逻辑，
AGENTS 语义二分 symlink/copy）+ replay-smoke 录制分支接线——录制工作区自此与排练场同源吃
templates/ 与 kb 事实家。keyless 验证 = foundation-safety.spec 新用例（红→绿）+ vitest 355 项
+ verify ALL PASS；真录制侧确认 = 下次 `--record`（触发条件已登记）。
