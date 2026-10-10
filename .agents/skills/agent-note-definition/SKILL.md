---
name: agent-note-definition
description: Use when writing or updating a file under notes/ and before claiming a non-trivial change is done, to run the Agent Note definition of done — pick the right lifecycle and class, record the alternatives that lost, capture real red/green evidence from commands you actually ran, wire the supersession check, and keep factual realization current in the same diff.
---

# 写 Note 的完成定义

适用：在 `notes/` 下新增或修改任何文件；以及任何非平凡变更宣布完成之前（同 diff 义务）。
规则唯一家 = [notes/README.md](../../../notes/README.md)——**本 skill 只管「按什么次序做、做到什么算完」，不复述规则**。

## 步骤

1. **先搜，再写。** 按主题在活跃树（`notes/`、`docs/`、`_backlog/`）搜同决定或同机制的既有 owner。
   - 完整取代 → 吸收它独有的理由/备选/后果/验证后**同 diff 删除旧的**（历史归 git）。
   - 部分取代 → 双方保留互链，更新仍有效的事实。
   - 都没搜就写 = 大概率造出第二本账（D34/D36 两次实地案例）。
2. **定生命周期与位置。** 决定**已随本次变更落地** → 直接 `implemented/`（不必从 `proposed/` 起）；
   提案**尚未实施** → `proposed/`，且状态行必须带「批准：」标记 + 有「## 验收」节（两道门禁查）；
   被否 → `rejected/`。未成熟的思考不进 `notes/`，住 `_backlog/issues/` 推敲卡。
3. **写四件**：决定 / **输掉的方案**（必载——没写击败了什么的决定会重新开讼）/ 后果 / **验证**。
   备选只记录真实考虑过的，不编造。
4. **验证必须来自真跑过的命令**，写明命令、断言什么、**红长什么样**——让实施者不看对话就能复现。
   被阻断的检查如实写「阻断 + 原因」。**未验的不得写 implemented**。
   这里的 temptations 是「跑了 verify 就写全绿」：只跑过 verify 就只写 verify，别把没跑的那几道写成绿。
5. **事实落点保持现行。** 决定的**正文冻结**（翻案要新 Note + 交叉链接），但**路径/符号/默认值随改动就地改新**。
   不要追加变更史——Note 写现在时，历史归 git。
6. **状态行**：首部「状态：」行以 `implemented` / `已交付` / `已消化` 开头（词表 = notes/README §一）。

## 完成判据

- [ ] 第 1 步搜过，且结论（取代 / 部分取代 / 无冲突）在 Note 里说得出。
- [ ] 位置与状态行符合生命周期；`proposed/` 侧带「批准：」+ 「## 验收」。
- [ ] 「输掉的方案」非空，且每条是真考虑过的（不是凑数的稻草人）。
- [ ] 验证节里的每条命令**真跑过**，且写了红/绿形态；未验项显式列为未验。
- [ ] Note 里的仓库路径指向现行家（`bare-path` 门禁查新写侧）。
- [ ] `pnpm verify` 全绿。

## 指针（别复述）

规则与词表 = [notes/README.md](../../../notes/README.md)；收尾动作清单 = [dev-loop §12](../../../docs/guides/dev-loop.md)；
范式样板 = [journal-presence-mechanism](../../../notes/archived/2026-09-26-journal-presence-mechanism.md)；
RFC 执行合同（TDD 红绿环）= [proposed/README](../../../notes/proposed/README.md)。
