---
状态：implemented（2026-10-27，R3 批次 B：授权边界单一家 + 收尾单一清单）
---

# R3-B：把自授权边界收进唯一家，把收尾次序收进唯一 skill

> 上游 = [第三轮六维度打扫卡](../../_backlog/issues/2026-10-27-repo-hygiene-round3.md)（R3-07 / R3-08）。

## 决定

1. **缺陷卡自授权的边界只有一个家** = [_backlog/README.md「缺陷的通道」](../../_backlog/README.md)。
   - 根 `AGENTS.md` 只指向它（原先同时点名「开发环 §0.5」与「_backlog 章程」两个 owner）；
   - `dev-loop §0.5` 只留一句指针，**删掉"限 P1/P2 修复型"这句缩写**——原文把章程里
     "P0，或触碰章程/常设指令/docs 合同/company-pack 公开行为/已记录决定 ⇒ 不自授权"的排除项漏掉了，
     一个按 AGENTS 路由过去的 agent 会以为改 docs 合同也能自助。
2. **收尾次序与六行回执形状的唯一家 = `close-out-definition` skill**（八步；`verify`/`test` 提到回执**之前**）。
   `dev-loop §12` 只留指南独有的去向规则（对照授权原文、整片 revert、`_backlog` 离场条件、Note 归属），
   并链接 skill；`orient.md` 的六行回执指针从 §12 改指 skill。
3. 两份清单不再"互指对方为 owner"：skill 自称次序与回执形状的 owner，§12 自称去向规则的 owner。

## 输掉的方案

- **两份清单都保留、只对齐顺序**：顺序能对齐，owner 仍是两个；下一次一边加一步又会分叉——这正是本轮的病因。
- **把清单搬进 `dev-loop §12` 作为唯一家**：`docs/AGENTS.md:16` 明确"完成定义不属于指南层"（→ `.agents/skills/`
  或该面 owner），搬回去等于让指南层违规。
- **新建一份政策层文档（docs/ 下，批次 D 再落）把授权规则升上去**：方向对（R3-19），但那是批次 D 的结构动作，会一次动 4–6 份文档；
  本批先把"错答案"消灭，政策层另批做。
- **保留 dev-loop 里的缩写并补全排除项**：边界复述的每一次转写都是漏项风险；pointer-only 是唯一稳的形状。

## 后果

- `AGENTS.md` 80/84 行；`dev-loop` 349/367（本批净减 2 行）；`orient` 77/80 不变。
- 收尾从"两份可选择"变成"一份次序 + 一份去向"；`verify/test` 的回执位置纠正为之前。
- 语义上不再存在"按 A 文档做、被 B 文档判违规"的自授权路径。

## 验证（真跑）

```text
node checks/run-gates.mjs   → verify: ALL PASS（doc-budget：AGENTS 80/84、dev-loop 349/367、orient 77/80）
npx vitest run              → 97 files / 915 tests（本批未改测试）

# 边界唯一性（grep 证据）：
rg -n "限 P1/P2" AGENTS.md docs/          → 无命中（缩写已删）
rg -n "不自授权" _backlog/README.md      → 命中（唯一家仍带排除项）
rg -n "六行" docs/ .agents/skills/        → §12 与 orient 只留指针；正文形状只在 skill
```

未验：无真模型/浏览器面改动；本批是文档与指针重构。
