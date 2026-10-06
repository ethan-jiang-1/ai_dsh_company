# BUG-006：CEO 产出 meta.md 词表外值（类型/结果两字段越表）

> 严重级别：P2（次要——审计面误报源，不阻断交付）｜发现：2026-10-07｜状态：活跃

## 症状

r7 动议（2026-10-07-recon-pack，真模型完整终局）归档快照上跑
`deliverables-check --only recon-pack` 报 1 条违规 `meta-shape-bad`：

- 类型「立项评估」∉ 词表 `["决策","生产","诊断","口径问答"]`
- 结果「通过（有条件）」∉ 词表 `["进行中","已采纳","已否决","已搁置","已废弃","判不了","已完成"]`

CEO 实际语义清楚（类型 = 决策/生产的混合立项评估；结果 = 条件放行 = 「已采纳」的限定版），
但字面越表 ⇒ 每场这样的动议都会让审计带一条永久违规。

## 根因（假设）

meta.md 词表只活在审计器（`lib/deliverables.mjs` validateMeta）与手册某处——**CEO 的写稿面
（preset skills / templates / 手册 meta.md 模板）没有把词表钉成可照抄的枚举**，真模型自由文本
填表就越表。r6 之前未暴露：此前归档场的 meta 恰好落在词表内（或未审到）。

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

不当场修：归档快照 = 录制拷贝，证据不重写（snapshots/README）；修的是生成侧。
候选路径 = company-pack 的 meta.md 模板/skill 钉词表枚举（红绿：构造越表 meta 的 spec 先红）。
落地后本卡 `git mv` 进 `_done/_fixed_bugs/`。
